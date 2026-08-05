import { Request, Response } from 'express';
import { User } from '../models/User';
import { createFeed, deleteFeed, getFeedByIdOrThrow, listFeeds, updateFeed } from '../services/feed.service';
import { catchAsync } from '../utils/catchAsync';
import { CreateFeedDto, UpdateFeedDto } from '../validators/feed.validator';

const currentUserId = (req: Request): number => (req.user as User).id;

export const getFeeds = catchAsync(async (req: Request, res: Response) => {
  const feeds = await listFeeds(currentUserId(req));
  res.status(200).json({ feeds });
});

export const getFeed = catchAsync(async (req: Request, res: Response) => {
  const feedId = Number(req.params.id);
  const feed = await getFeedByIdOrThrow(currentUserId(req), feedId);
  res.status(200).json({ feed });
});

export const postFeed = catchAsync(async (req: Request, res: Response) => {
  const dto = req.body as CreateFeedDto;
  const feed = await createFeed(currentUserId(req), dto);
  res.status(201).json({ feed });
});

export const patchFeed = catchAsync(async (req: Request, res: Response) => {
  const feedId = Number(req.params.id);
  const dto = req.body as UpdateFeedDto;
  const feed = await updateFeed(currentUserId(req), feedId, dto);
  res.status(200).json({ feed });
});

export const removeFeed = catchAsync(async (req: Request, res: Response) => {
  const feedId = Number(req.params.id);
  await deleteFeed(currentUserId(req), feedId);
  res.status(204).send();
});
