import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/', asyncHandler(getDashboard));

export default router;
