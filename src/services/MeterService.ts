import { LegacyAdapter } from '../legacy/client';
import { MeterTransformer } from '../transformers/MeterTransformer';
import { SvelteHydrationParser } from '../transformers/SvelteHydrationParser';
import { EnergyTransformer } from '../transformers/EnergyTransformer';
import { PublicMeterSummaryDTO, PublicMeterDetailDTO, PublicEnergyResponseDTO } from '../dto/public';
import { NotFoundError } from '../utils/ErrorMapper';
import { logger } from '../utils/logger';

export class MeterService {
  private legacyAdapter: LegacyAdapter;

  constructor(legacyAdapter?: LegacyAdapter) {
    this.legacyAdapter = legacyAdapter || new LegacyAdapter();
  }

  public async searchMeters(
    query: string = '',
    page: number = 1
  ): Promise<{ items: PublicMeterSummaryDTO[]; page: number; pageSize: number; total: number }> {
    logger.info({ query, page }, 'MeterService searching meters');
    const legacyResult = await this.legacyAdapter.searchMeters(query, page);

    const items = (legacyResult?.data || []).map((item) => MeterTransformer.toSummaryDTO(item));

    return {
      items,
      page: legacyResult?.page || page,
      pageSize: legacyResult?.pageSize || 20,
      total: legacyResult?.total || items.length,
    };
  }

  public async getMeterDetails(meterId: string): Promise<PublicMeterDetailDTO> {
    logger.info({ meterId }, 'MeterService fetching meter details via parallel Promise.all');

    // Execute parallel independent requests for SvelteKit hydration payload, Geo location, and Search master record
    const [rawHydration, rawGeo, searchResult] = await Promise.all([
      this.legacyAdapter.getMeterDataJson(meterId).catch((err) => {
        logger.warn({ meterId, error: (err as Error).message }, 'Failed to fetch hydration payload');
        return null;
      }),
      this.legacyAdapter.getMeterGeo(meterId).catch((err) => {
        logger.warn({ meterId, error: (err as Error).message }, 'Failed to fetch geo coordinates');
        return undefined;
      }),
      this.legacyAdapter.searchMeters(meterId, 1).catch((err) => {
        logger.warn({ meterId, error: (err as Error).message }, 'Failed to search meter catalog');
        return null;
      }),
    ]);

    // Find exact match from master search catalog
    const searchMatch = searchResult?.data?.find(
      (item) => item.meterId?.toLowerCase() === meterId.toLowerCase()
    );

    // If meter does not exist in hydration, geo, and search catalog, throw 404 METER_NOT_FOUND
    if (!rawHydration && !rawGeo?.data && !searchMatch) {
      logger.info({ meterId }, 'Meter not found in legacy system');
      throw new NotFoundError(`Meter with ID '${meterId}' not found`, 'METER_NOT_FOUND');
    }

    const extractedHydration = SvelteHydrationParser.parse(rawHydration, meterId);

    // Synthesize master meter catalog attributes if present
    if (searchMatch) {
      if (searchMatch.serialNo) extractedHydration.serialNumber = searchMatch.serialNo;
      if (searchMatch.make) extractedHydration.make = searchMatch.make;
      if (searchMatch.phaseType) extractedHydration.phase = searchMatch.phaseType;
      if (searchMatch.installStatus) extractedHydration.installationStatus = searchMatch.installStatus;
    }

    return MeterTransformer.toDetailDTO(extractedHydration, rawGeo?.data);
  }

  public async getMeterEnergy(meterId: string): Promise<PublicEnergyResponseDTO> {
    logger.info({ meterId }, 'MeterService fetching meter energy telemetry');
    const legacyResult = await this.legacyAdapter.getMeterEnergy(meterId);

    const records = (legacyResult?.data || []).map((item) => EnergyTransformer.toRecordDTO(item));

    if (records.length === 0) {
      // Check if meter exists at all
      const searchResult = await this.legacyAdapter.searchMeters(meterId, 1).catch(() => null);
      const searchMatch = searchResult?.data?.find(
        (item) => item.meterId?.toLowerCase() === meterId.toLowerCase()
      );
      if (!searchMatch) {
        throw new NotFoundError(`Meter with ID '${meterId}' not found`, 'METER_NOT_FOUND');
      }
    }

    return {
      meterId,
      records,
    };
  }
}
