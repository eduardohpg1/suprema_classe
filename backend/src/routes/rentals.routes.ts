import { Router } from 'express';
import {
  listRentals,
  getRental,
  createRental,
  updateRental,
  returnRental,
  cancelRental,
  deleteRental,
} from '../controllers/rentals.controller';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/', asyncHandler(listRentals));
router.get('/:id', asyncHandler(getRental));
router.post('/', asyncHandler(createRental));
router.put('/:id', asyncHandler(updateRental));
router.post('/:id/return', asyncHandler(returnRental));
router.post('/:id/cancel', asyncHandler(cancelRental));
router.delete('/:id', asyncHandler(deleteRental));

export default router;
