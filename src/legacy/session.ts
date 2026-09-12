import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class UpstreamAuthenticationError extends Error {
  constructor(message: string = 'Authentication with legacy system failed') {
    super(message);
    this.name = 'UpstreamAuthenticationError';
  }
}

export class SessionManager {
  private static instance: SessionManager;
  private cookieJar: CookieJar;
  public client: AxiosInstance;
  private isAuthenticating: boolean = false;
  private authPromise: Promise<void> | null = null;

  private constructor() {
    this.cookieJar = new CookieJar();
    this.client = wrapper(
      axios.create({
        baseURL: env.LEGACY_BASE_URL,
        timeout: env.REQUEST_TIMEOUT,
        jar: this.cookieJar,
        withCredentials: true,
        maxRedirects: 0, // Intercept 303 redirects manually
        validateStatus: (status: number) => status >= 200 && status < 400,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*',
        },
      } as AxiosRequestConfig & { jar: CookieJar }),
    );
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public isAuthenticationExpired(response: AxiosResponse | undefined, error?: AxiosError): boolean {
    const res = response || error?.response;
    if (!res) return false;

    // Do NOT treat signature_invalid or application business 401s as session expiration
    if (
      res.data &&
      typeof res.data === 'object' &&
      (res.data as Record<string, unknown>).error === 'signature_invalid'
    ) {
      return false;
    }

    // Check status 401 Unauthorized or 403 Forbidden
    if (res.status === 401 || res.status === 403) {
      // If HTML body is Sophos/firewall block page, it's a network block, not auth expiration
      if (
        typeof res.data === 'string' &&
        (res.data.includes('Blocked site') || res.data.includes('Sophos'))
      ) {
        return false;
      }
      return true;
    }

    // Check 303 Redirect to /login
    if (res.status === 303) {
      const location = res.headers['location'] || '';
      if (typeof location === 'string' && location.includes('/login')) {
        return true;
      }
    }

    // Check HTML body for login form or JSON redirect indicator
    if (res.data) {
      if (
        typeof res.data === 'string' &&
        (res.data.includes('action="/login"') || res.data.includes('id="login-form"'))
      ) {
        return true;
      }
      if (
        typeof res.data === 'object' &&
        res.data !== null &&
        (res.data as Record<string, unknown>).type === 'redirect'
      ) {
        const loc = (res.data as Record<string, unknown>).location;
        if (typeof loc === 'string' && loc.includes('/login')) {
          return true;
        }
      }
    }

    return false;
  }

  public async login(): Promise<void> {
    if (this.isAuthenticating && this.authPromise) {
      return this.authPromise;
    }

    this.isAuthenticating = true;
    this.authPromise = (async () => {
      try {
        logger.info({ legacyEndpoint: '/login' }, 'Executing legacy authentication login request');

        const params = new URLSearchParams();
        params.append('email', env.LEGACY_EMAIL);
        params.append('password', env.LEGACY_PASSWORD);

        const response = await this.client.post('/login', params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Origin: env.LEGACY_BASE_URL,
            Referer: `${env.LEGACY_BASE_URL}/login`,
          },
          validateStatus: (status) => status >= 200 && status < 400,
        });

        logger.info({ status: response.status }, 'Legacy login request executed successfully');
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        const resStatus = axiosErr.response?.status;
        const loc = axiosErr.response?.headers['location'];

        if (resStatus === 303 || (loc && typeof loc === 'string' && !loc.includes('/login'))) {
          logger.info(
            { status: resStatus, location: loc },
            'Legacy login succeeded with 303 redirect',
          );
          return;
        }

        logger.error({ error: axiosErr.message, status: resStatus }, 'Legacy login request failed');
        throw new UpstreamAuthenticationError(
          `Failed to authenticate with legacy portal: ${axiosErr.message}`,
        );
      } finally {
        this.isAuthenticating = false;
        this.authPromise = null;
      }
    })();

    return this.authPromise;
  }

  public async executeWithAuth<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    retryCount: number = 0,
  ): Promise<AxiosResponse<T>> {
    try {
      return await requestFn();
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<T>;
      const isExpired = this.isAuthenticationExpired(axiosErr.response, axiosErr);

      if (isExpired && retryCount < env.MAX_RETRY) {
        logger.warn(
          { retryCount: retryCount + 1 },
          'Detected authentication expiration. Re-authenticating and retrying request ONCE...',
        );
        await this.login();
        return this.executeWithAuth(requestFn, retryCount + 1);
      }

      if (isExpired && retryCount >= env.MAX_RETRY) {
        logger.error('Authentication failed again after retry limit. Aborting.');
        throw new UpstreamAuthenticationError(
          'Session expired and re-authentication retry failed.',
        );
      }

      throw err;
    }
  }
}
