import { Request, Response } from 'express';
import { getPersonalizedArticleFeed } from '../services/articleFeed.service';
import { catchAsync } from '../utils/catchAsync';
import { GetArticleFeedQuery } from '../validators/article.validator';
import { User } from '../models/User';

const currentUserId = (req: Request): number => (req.user as User).id;

export const getArticleFeed = catchAsync(async (req: Request, res: Response) => {
  const { cursor, limit } = req.query as unknown as GetArticleFeedQuery;
  const result = await getPersonalizedArticleFeed({ userId: currentUserId(req), limit, cursor });
  res.status(200).json(result);
});
