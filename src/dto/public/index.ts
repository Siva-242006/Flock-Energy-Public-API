export interface StandardSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface StandardErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
}

export interface PublicMeterSummaryDTO {
  meterId: string;
  serialNumber: string;
  make: string;
  phase: string;
  installationStatus: string;
  dtCode: string;
}

export interface PublicMeterDetailDTO {
  meterId: string;
  serialNumber: string;
  make: string;
  phase: string;
  installationStatus: string;
  installationType: string;
  location: {
    latitude: number;
    longitude: number;
  };
  hierarchy: {
    zone: string;
    circle: string;
    division: string;
    subdivision: string;
    subStation: string;
    feeder: string;
    dt: string;
  };
}

export interface PublicEnergyRecordDTO {
  timestamp: string;
  kWh: number;
  kVAh: number;
  voltage: number;
}

export interface PublicEnergyResponseDTO {
  meterId: string;
  records: PublicEnergyRecordDTO[];
}

export interface PublicDTDTO {
  code: string;
  name: string;
  feederCode: string;
  capacityKva: number;
}

export interface PublicHealthDTO {
  status: string;
  legacy: string;
  version: string;
  uptime: string;
  timestamp: string;
}
