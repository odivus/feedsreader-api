import { Router } from 'express';
import { getFeed, getFeeds, patchFeed, postFeed, removeFeed } from '../controllers/feed.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createFeedSchema, feedIdParamSchema, updateFeedSchema } from '../validators/feed.validator';

const router = Router();

// Every feed route requires a valid access token; feeds are always scoped
// to the authenticated user (enforced in the service layer).
router.use(requireAuth);

router.get('/', getFeeds);
router.post('/', validate(createFeedSchema), postFeed);
router.get('/:id', validate(feedIdParamSchema), getFeed);
router.patch('/:id', validate(updateFeedSchema), patchFeed);
router.delete('/:id', validate(feedIdParamSchema), removeFeed);

export default router;
