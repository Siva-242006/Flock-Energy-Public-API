export interface LegacyMeterSearchItemDTO {
  meterId: string;
  serialNo: string;
  make: string;
  phaseType: string;
  installStatus: string;
  dtCode: string;
}

export interface LegacyMeterSearchResponseDTO {
  data: LegacyMeterSearchItemDTO[];
  page: number;
  pageSize: number;
  total: number;
}

export interface LegacyDTItemDTO {
  code: string;
  name: string;
  feederCode: string;
  capacityKva: number;
}

export interface LegacyDTResponseDTO {
  data: LegacyDTItemDTO[];
  page: number;
  pageSize: number;
  total: number;
}

export interface LegacyGeoDataDTO {
  latitude: string;
  longitude: string;
}

export interface LegacyGeoResponseDTO {
  data: LegacyGeoDataDTO;
}

export interface LegacyEnergyItemDTO {
  timestamp: string;
  kwh: string;
  kvah: string;
  voltR: string;
}

export interface LegacyEnergyResponseDTO {
  data: LegacyEnergyItemDTO[];
}

export interface LegacyKeysResponseDTO {
  signingSecret: string;
}
