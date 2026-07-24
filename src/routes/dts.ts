import { Router } from 'express';
import { DTController } from '../controllers/DTController';
import { validate } from '../middleware/validate';
import { getDtsQuerySchema } from '../validators';

const router = Router();
const controller = new DTController();

router.get('/', validate({ query: getDtsQuerySchema }), controller.getDts);

export default router;
