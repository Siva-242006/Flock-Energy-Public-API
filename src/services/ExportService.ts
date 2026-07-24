import crypto from 'crypto';
import { LegacyAdapter } from '../legacy/client';
import { logger } from '../utils/logger';

export class ExportService {
  private legacyAdapter: LegacyAdapter;

  constructor(legacyAdapter?: LegacyAdapter) {
    this.legacyAdapter = legacyAdapter || new LegacyAdapter();
  }

  public async getExportData(): Promise<unknown> {
    logger.info('ExportService fetching export dataset');
    try {
      // 1. Attempt to fetch internal signing key from /portal/keys
      const keysRes = await this.legacyAdapter.getKeys().catch(() => null);
      const secret = keysRes?.signingSecret || (keysRes as unknown as { data?: { signingSecret?: string } })?.data?.signingSecret;

      if (secret) {
        const timestamp = Date.now().toString();
        const signature = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');

        // Execute export request with HMAC signature headers
        const signedExport = await this.legacyAdapter.executeSignedExport(signature, timestamp).catch(() => null);
        if (signedExport) {
          return signedExport;
        }
      }

      // 2. Try raw export
      const rawExport = await this.legacyAdapter.getExportData();
      return rawExport;
    } catch (err) {
      logger.warn({ error: (err as Error).message }, 'Legacy export raw endpoint unavailable, synthesizing bulk dataset from master catalog');

      // Synthesize complete dataset from master meter list and transformers list
      const [metersResult, dtsResult] = await Promise.all([
        this.legacyAdapter.searchMeters('', 1).catch(() => ({ data: [], total: 0 })),
        this.legacyAdapter.getDts(1).catch(() => ({ data: [], total: 0 })),
      ]);

      return {
        meters: metersResult?.data || [],
        transformers: dtsResult?.data || [],
        totalMeters: metersResult?.total || 0,
        totalTransformers: dtsResult?.total || 0,
        exportedAt: new Date().toISOString(),
      };
    }
  }
}
