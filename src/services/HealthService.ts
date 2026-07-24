import { LegacyAdapter } from '../legacy/client';
import { PublicHealthDTO } from '../dto/public';
import { logger } from '../utils/logger';

export class HealthService {
  private legacyAdapter: LegacyAdapter;

  constructor(legacyAdapter?: LegacyAdapter) {
    this.legacyAdapter = legacyAdapter || new LegacyAdapter();
  }

  public async getHealth(): Promise<PublicHealthDTO> {
    logger.debug('HealthService performing lightweight probe check');
    const isLegacyHealthy = await this.legacyAdapter.pingHealth();

    return {
      status: 'UP',
      legacy: isLegacyHealthy ? 'CONNECTED' : 'DISCONNECTED',
      version: '1.0.0',
      uptime: `${process.uptime().toFixed(2)}s`,
      timestamp: new Date().toISOString(),
    };
  }
}
