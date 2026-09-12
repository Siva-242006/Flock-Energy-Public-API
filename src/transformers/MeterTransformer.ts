import { LegacyMeterSearchItemDTO, LegacyGeoDataDTO } from '../dto/legacy';
import { PublicMeterSummaryDTO, PublicMeterDetailDTO } from '../dto/public';
import { ExtractedHydrationData } from './SvelteHydrationParser';

export class MeterTransformer {
  public static toSummaryDTO(item: LegacyMeterSearchItemDTO): PublicMeterSummaryDTO {
    return {
      meterId: item.meterId,
      serialNumber: item.serialNo,
      make: item.make,
      phase: item.phaseType,
      installationStatus: item.installStatus,
      dtCode: item.dtCode,
    };
  }

  public static toDetailDTO(
    hydrationData: ExtractedHydrationData,
    geoData?: LegacyGeoDataDTO,
  ): PublicMeterDetailDTO {
    const lat = geoData?.latitude ? parseFloat(geoData.latitude) : 0;
    const lng = geoData?.longitude ? parseFloat(geoData.longitude) : 0;

    return {
      meterId: hydrationData.meterId,
      serialNumber: hydrationData.serialNumber,
      make: hydrationData.make,
      phase: hydrationData.phase,
      installationStatus: hydrationData.installationStatus,
      installationType: hydrationData.installationType,
      location: {
        latitude: isNaN(lat) ? 0 : lat,
        longitude: isNaN(lng) ? 0 : lng,
      },
      hierarchy: hydrationData.hierarchy,
    };
  }
}
