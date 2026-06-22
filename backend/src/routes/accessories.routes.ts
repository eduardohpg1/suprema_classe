import { Router } from 'express';
import {
  listAccessories,
  createAccessory,
  deleteAccessory,
} from '../controllers/accessories.controller';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/', asyncHandler(listAccessories));
router.post('/', asyncHandler(createAccessory));
router.delete('/:id', asyncHandler(deleteAccessory));

export default router;
