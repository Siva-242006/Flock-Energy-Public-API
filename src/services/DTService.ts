import { LegacyAdapter } from '../legacy/client';
import { DTTransformer } from '../transformers/DTTransformer';
import { PublicDTDTO } from '../dto/public';
import { logger } from '../utils/logger';

export class DTService {
  private legacyAdapter: LegacyAdapter;

  constructor(legacyAdapter?: LegacyAdapter) {
    this.legacyAdapter = legacyAdapter || new LegacyAdapter();
  }

  public async getDts(
    page: number = 1
  ): Promise<{ items: PublicDTDTO[]; page: number; pageSize: number; total: number }> {
    logger.info({ page }, 'DTService fetching Distribution Transformers');
    const legacyResult = await this.legacyAdapter.getDts(page);

    const items = (legacyResult.data || []).map((item) => DTTransformer.toPublicDTO(item));

    return {
      items,
      page: legacyResult.page || page,
      pageSize: legacyResult.pageSize || 20,
      total: legacyResult.total || items.length,
    };
  }
}
