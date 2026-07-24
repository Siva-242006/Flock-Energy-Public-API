import { Request, Response } from 'express';
import { HealthService } from '../services/HealthService';
import { ErrorMapper } from '../utils/ErrorMapper';
import { RequestWithId } from '../middleware/requestId';

export class HealthController {
  private healthService: HealthService;

  constructor(healthService?: HealthService) {
    this.healthService = healthService || new HealthService();
  }

  public getHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const healthData = await this.healthService.getHealth();
      res.status(200).json(healthData);
    } catch (err: unknown) {
      ErrorMapper.handle(err, res, (req as RequestWithId).requestId);
    }
  };
}
