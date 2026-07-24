import { Request, Response } from 'express';
import { MeterService } from '../services/MeterService';
import { ErrorMapper } from '../utils/ErrorMapper';
import { StandardSuccessResponse, PublicMeterSummaryDTO, PublicMeterDetailDTO, PublicEnergyResponseDTO } from '../dto/public';
import { RequestWithId } from '../middleware/requestId';

export class MeterController {
  private meterService: MeterService;

  constructor(meterService?: MeterService) {
    this.meterService = meterService || new MeterService();
  }

  public searchMeters = async (req: Request, res: Response): Promise<void> => {
    try {
      const q = String(req.query.q || '');
      const page = Number(req.query.page || 1);

      const result = await this.meterService.searchMeters(q, page);

      const responseEnvelope: StandardSuccessResponse<{ items: PublicMeterSummaryDTO[] }> = {
        success: true,
        message: 'Meters retrieved successfully',
        data: {
          items: result.items,
        },
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
        },
      };

      res.status(200).json(responseEnvelope);
    } catch (err: unknown) {
      ErrorMapper.handle(err, res, (req as RequestWithId).requestId);
    }
  };

  public getMeterById = async (req: Request, res: Response): Promise<void> => {
    try {
      const meterId = String(req.params.meterId);
      const meterDetails = await this.meterService.getMeterDetails(meterId);

      const responseEnvelope: StandardSuccessResponse<PublicMeterDetailDTO> = {
        success: true,
        message: 'Meter details retrieved successfully',
        data: meterDetails,
      };

      res.status(200).json(responseEnvelope);
    } catch (err: unknown) {
      ErrorMapper.handle(err, res, (req as RequestWithId).requestId);
    }
  };

  public getMeterEnergy = async (req: Request, res: Response): Promise<void> => {
    try {
      const meterId = String(req.params.meterId);
      const energyData = await this.meterService.getMeterEnergy(meterId);

      const responseEnvelope: StandardSuccessResponse<PublicEnergyResponseDTO> = {
        success: true,
        message: 'Meter energy records retrieved successfully',
        data: energyData,
      };

      res.status(200).json(responseEnvelope);
    } catch (err: unknown) {
      ErrorMapper.handle(err, res, (req as RequestWithId).requestId);
    }
  };
}
