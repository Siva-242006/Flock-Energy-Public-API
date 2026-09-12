import { LegacyDTItemDTO } from '../dto/legacy';
import { PublicDTDTO } from '../dto/public';

export class DTTransformer {
  public static toPublicDTO(item: LegacyDTItemDTO): PublicDTDTO {
    return {
      code: item.code,
      name: item.name,
      feederCode: item.feederCode,
      capacityKva:
        typeof item.capacityKva === 'number'
          ? item.capacityKva
          : parseFloat(String(item.capacityKva)),
    };
  }
}
