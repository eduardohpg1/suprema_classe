import { Router } from 'express';
import { search } from '../controllers/search.controller';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/', asyncHandler(search));

export default router;
