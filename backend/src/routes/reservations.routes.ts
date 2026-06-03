import { Router } from 'express';
import {
  listReservations,
  getReservation,
  createReservation,
  updateReservation,
  cancelReservation,
  deleteReservation,
} from '../controllers/reservations.controller';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/', asyncHandler(listReservations));
router.get('/:id', asyncHandler(getReservation));
router.post('/', asyncHandler(createReservation));
router.put('/:id', asyncHandler(updateReservation));
router.post('/:id/cancel', asyncHandler(cancelReservation));
router.delete('/:id', asyncHandler(deleteReservation));

export default router;
