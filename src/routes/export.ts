import { Router } from 'express';
import { ExportController } from '../controllers/ExportController';

const router = Router();
const controller = new ExportController();

router.get('/', controller.getExportData);

export default router;
