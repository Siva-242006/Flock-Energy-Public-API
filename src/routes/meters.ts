import { Router } from 'express';
import { MeterController } from '../controllers/MeterController';
import { validate } from '../middleware/validate';
import { searchMetersQuerySchema, getMeterParamsSchema } from '../validators';

const router = Router();
const controller = new MeterController();

router.get('/', validate({ query: searchMetersQuerySchema }), controller.searchMeters);
router.get('/:meterId', validate({ params: getMeterParamsSchema }), controller.getMeterById);
router.get('/:meterId/energy', validate({ params: getMeterParamsSchema }), controller.getMeterEnergy);

export default router;
