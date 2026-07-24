import { Request, Response } from 'express';
import { ExportService } from '../services/ExportService';
import { ErrorMapper } from '../utils/ErrorMapper';
import { StandardSuccessResponse } from '../dto/public';
import { RequestWithId } from '../middleware/requestId';

export class ExportController {
  private exportService: ExportService;

  constructor(exportService?: ExportService) {
    this.exportService = exportService || new ExportService();
  }

  public getExportData = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.exportService.getExportData();

      const responseEnvelope: StandardSuccessResponse<unknown> = {
        success: true,
        message: 'Export dataset retrieved successfully',
        data,
      };

      res.status(200).json(responseEnvelope);
    } catch (err: unknown) {
      ErrorMapper.handle(err, res, (req as RequestWithId).requestId);
    }
  };
}
