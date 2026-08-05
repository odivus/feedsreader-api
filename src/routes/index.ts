import { Router } from 'express';
import authRoutes from './auth.routes';
import feedRoutes from './feed.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/feeds', feedRoutes);

export default router;
