import { Router } from 'express';
import {
  rentalsByPeriod,
  mostRentedProducts,
  monthlyRevenue,
  recurringCustomers,
  availableProducts,
} from '../controllers/reports.controller';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/rentals', asyncHandler(rentalsByPeriod));
router.get('/most-rented', asyncHandler(mostRentedProducts));
router.get('/monthly-revenue', asyncHandler(monthlyRevenue));
router.get('/recurring-customers', asyncHandler(recurringCustomers));
router.get('/available-products', asyncHandler(availableProducts));

export default router;
