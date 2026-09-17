import { Router } from 'express';
import articleRoutes from './article.routes';
import authRoutes from './auth.routes';
import feedRoutes from './feed.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/feeds', feedRoutes);
router.use('/articles', articleRoutes);

export default router;
