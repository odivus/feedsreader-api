import { Feed } from '../models/Feed';
import { ApiError } from '../utils/ApiError';

export interface CreateFeedInput {
  url: string;
  title?: string;
  description?: string;
}

export interface UpdateFeedInput {
  url?: string;
  title?: string | null;
  description?: string | null;
}

export const listFeeds = async (userId: number): Promise<Feed[]> => {
  return Feed.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
};

export const getFeedByIdOrThrow = async (userId: number, feedId: number): Promise<Feed> => {
  const feed = await Feed.findOne({ where: { id: feedId, userId } });
  if (!feed) {
    throw ApiError.notFound('Feed not found');
  }
  return feed;
};

export const createFeed = async (userId: number, input: CreateFeedInput): Promise<Feed> => {
  const existing = await Feed.findOne({ where: { userId, url: input.url } });
  if (existing) {
    throw ApiError.conflict('This feed URL has already been added');
  }

  return Feed.create({
    userId,
    url: input.url,
    title: input.title ?? null,
    description: input.description ?? null,
  });
};

export const updateFeed = async (userId: number, feedId: number, input: UpdateFeedInput): Promise<Feed> => {
  const feed = await getFeedByIdOrThrow(userId, feedId);

  if (input.url && input.url !== feed.url) {
    const duplicate = await Feed.findOne({ where: { userId, url: input.url } });
    if (duplicate) {
      throw ApiError.conflict('This feed URL has already been added');
    }
    feed.url = input.url;
  }

  if (input.title !== undefined) feed.title = input.title;
  if (input.description !== undefined) feed.description = input.description;

  await feed.save();
  return feed;
};

export const deleteFeed = async (userId: number, feedId: number): Promise<void> => {
  const feed = await getFeedByIdOrThrow(userId, feedId);
  await feed.destroy();
};
