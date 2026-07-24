import axios from 'axios';
import https from 'https';
import { SessionManager } from './session';
import { env } from '../config/env';
import {
  LegacyMeterSearchResponseDTO,
  LegacyDTResponseDTO,
  LegacyGeoResponseDTO,
  LegacyEnergyResponseDTO,
  LegacyKeysResponseDTO,
} from '../dto/legacy';
import { logger } from '../utils/logger';

export class LegacyAdapter {
  private sessionManager: SessionManager;

  constructor() {
    this.sessionManager = SessionManager.getInstance();
  }

  public async searchMeters(query: string = '', page: number = 1): Promise<LegacyMeterSearchResponseDTO> {
    logger.debug({ query, page, legacyEndpoint: '/portal/meters/search' }, 'LegacyAdapter searching meters');
    const response = await this.sessionManager.executeWithAuth(() =>
      this.sessionManager.client.get<LegacyMeterSearchResponseDTO>('/portal/meters/search', {
        params: { q: query, page },
      })
    );
    return response.data;
  }

  public async getDts(page: number = 1): Promise<LegacyDTResponseDTO> {
    logger.debug({ page, legacyEndpoint: '/portal/dts' }, 'LegacyAdapter fetching distribution transformers');
    const response = await this.sessionManager.executeWithAuth(() =>
      this.sessionManager.client.get<LegacyDTResponseDTO>('/portal/dts', {
        params: { page },
      })
    );
    return response.data;
  }

  public async getMeterDataJson(meterId: string): Promise<unknown> {
    const endpoint = `/meters/${meterId}/__data.json`;
    logger.debug({ meterId, legacyEndpoint: endpoint }, 'LegacyAdapter fetching meter SvelteKit hydration payload');
    const response = await this.sessionManager.executeWithAuth(() =>
      this.sessionManager.client.get<unknown>(endpoint)
    );
    return response.data;
  }

  public async getMeterGeo(meterId: string): Promise<LegacyGeoResponseDTO> {
    const endpoint = `/portal/meters/${meterId}/geo`;
    logger.debug({ meterId, legacyEndpoint: endpoint }, 'LegacyAdapter fetching meter geo coordinates');
    const response = await this.sessionManager.executeWithAuth(() =>
      this.sessionManager.client.get<LegacyGeoResponseDTO>(endpoint)
    );
    return response.data;
  }

  public async getMeterEnergy(meterId: string): Promise<LegacyEnergyResponseDTO> {
    const endpoint = `/portal/meters/${meterId}/energy`;
    logger.debug({ meterId, legacyEndpoint: endpoint }, 'LegacyAdapter fetching meter energy records');
    const response = await this.sessionManager.executeWithAuth(() =>
      this.sessionManager.client.get<LegacyEnergyResponseDTO>(endpoint)
    );
    return response.data;
  }

  public async getExportData(): Promise<unknown> {
    logger.debug({ legacyEndpoint: '/portal/export' }, 'LegacyAdapter fetching export dataset');
    const response = await this.sessionManager.executeWithAuth(() =>
      this.sessionManager.client.get<unknown>('/portal/export')
    );
    return response.data;
  }

  public async executeSignedExport(signature: string, timestamp: string): Promise<unknown> {
    logger.debug({ legacyEndpoint: '/portal/export' }, 'LegacyAdapter executing signed export request');
    const response = await this.sessionManager.executeWithAuth(() =>
      this.sessionManager.client.get<unknown>('/portal/export', {
        headers: {
          'x-signature': signature,
          'x-timestamp': timestamp,
        },
      })
    );
    return response.data;
  }

  public async getKeys(): Promise<LegacyKeysResponseDTO> {
    logger.debug({ legacyEndpoint: '/portal/keys' }, 'LegacyAdapter fetching internal signing keys');
    const response = await this.sessionManager.executeWithAuth(() =>
      this.sessionManager.client.get<LegacyKeysResponseDTO>('/portal/keys')
    );
    return response.data;
  }

  public async pingHealth(): Promise<boolean> {
    try {
      logger.debug('LegacyAdapter probing health connectivity via standalone HTTPS request');
      const response = await axios.get(`${env.LEGACY_BASE_URL}/login`, {
        timeout: 10000,
        maxRedirects: 5,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        validateStatus: (status) => status >= 200 && status < 400,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        },
      });

      // Check if response is a network firewall block page (e.g. Sophos / Cyberoam)
      if (typeof response.data === 'string' && (response.data.includes('Blocked site') || response.data.includes('Sophos'))) {
        logger.warn('Legacy health probe detected network firewall block page');
        return false;
      }

      return response.status >= 200 && response.status < 400;
    } catch (err) {
      logger.warn({ error: (err as Error).message }, 'Legacy health probe check failed');
      return false;
    }
  }
}
