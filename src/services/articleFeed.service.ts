import { Op } from 'sequelize';
import { Article } from '../models/Article';
import { ApiError } from '../utils/ApiError';
import { decodeCursor, encodeCursor, FeedCursor } from '../utils/cursor';

export interface GetArticleFeedInput {
  userId: number;
  limit: number;
  cursor?: string;
}

export interface GetArticleFeedResult {
  articles: Article[];
  nextCursor: string | null;
}

const MAX_LIMIT = 50;

export const getPersonalizedArticleFeed = async ({
  userId,
  limit,
  cursor,
}: GetArticleFeedInput): Promise<GetArticleFeedResult> => {
  const boundedLimit = Math.min(limit, MAX_LIMIT);

  let cursorValue: FeedCursor | null = null;
  if (cursor) {
    cursorValue = decodeCursor(cursor);
    if (!cursorValue) {
      throw ApiError.badRequest('Invalid cursor');
    }
  }

  const rawItems = await Article.findAll({
    include: [{ association: 'feed', attributes: ['id', 'title', 'url'], where: { userId } }],
    where: {
      [Op.and]: [
        // Articles with no known publish date don't fit a "sorted by
        // freshness" feed - deliberately excluded here.
        { publishedAt: { [Op.ne]: null } },
        cursorValue
          ? {
              [Op.or]: [
                { publishedAt: { [Op.lt]: cursorValue.publishedAt } },
                { publishedAt: cursorValue.publishedAt, id: { [Op.lt]: cursorValue.id } },
              ],
            }
          : {},
      ],
    },
    order: [
      ['publishedAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: boundedLimit,
  });

  // nextCursor is derived from the last (oldest) item of the window we
  // fetched - since articles are returned in this same raw order (no
  // reordering), the cursor boundary matches exactly what the client saw.
  const nextCursor =
    rawItems.length < boundedLimit
      ? null
      : encodeCursor({
          publishedAt: (rawItems[rawItems.length - 1].publishedAt as Date).toISOString(),
          id: rawItems[rawItems.length - 1].id,
        });

  return { articles: rawItems, nextCursor };
};
