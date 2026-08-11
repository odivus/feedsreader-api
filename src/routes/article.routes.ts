import { Router } from 'express';
import { getArticleFeed } from '../controllers/article.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { getArticleFeedSchema } from '../validators/article.validator';

const router = Router();

router.use(requireAuth);

router.get('/', validate(getArticleFeedSchema), getArticleFeed);

export default router;
