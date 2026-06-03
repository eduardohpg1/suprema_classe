import { Router } from 'express';
import {
  getProductAvailability,
  checkAvailability,
} from '../controllers/availability.controller';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/check', asyncHandler(checkAvailability));
router.get('/products/:productId', asyncHandler(getProductAvailability));

export default router;
