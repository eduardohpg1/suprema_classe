import { Router } from 'express';
import { login, register, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.post('/login', asyncHandler(login));
router.post('/register', authenticate, asyncHandler(register));
router.get('/me', authenticate, asyncHandler(me));

export default router;
