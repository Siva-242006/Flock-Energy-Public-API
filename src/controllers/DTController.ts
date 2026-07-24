import { Request, Response } from 'express';
import { DTService } from '../services/DTService';
import { ErrorMapper } from '../utils/ErrorMapper';
import { StandardSuccessResponse, PublicDTDTO } from '../dto/public';
import { RequestWithId } from '../middleware/requestId';

export class DTController {
  private dtService: DTService;

  constructor(dtService?: DTService) {
    this.dtService = dtService || new DTService();
  }

  public getDts = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = Number(req.query.page || 1);
      const result = await this.dtService.getDts(page);

      const responseEnvelope: StandardSuccessResponse<{ items: PublicDTDTO[] }> = {
        success: true,
        message: 'Distribution Transformers retrieved successfully',
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
}
