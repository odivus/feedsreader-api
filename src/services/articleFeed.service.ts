import { Op } from 'sequelize';
import { Article } from '../models/Article';
import { Feed } from '../models/Feed';
import { ApiError } from '../utils/ApiError';
import { decodeCursor, encodeCursor, FeedCursor } from '../utils/cursor';

export interface GetArticleFeedInput {
  userId: number;
  limit: number;
  cursor?: string;
  feedId?: number;
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
  feedId,
}: GetArticleFeedInput): Promise<GetArticleFeedResult> => {
  const boundedLimit = Math.min(limit, MAX_LIMIT);

  let cursorValue: FeedCursor | null = null;
  if (cursor) {
    cursorValue = decodeCursor(cursor);
    if (!cursorValue) {
      throw ApiError.badRequest('Invalid cursor');
    }
  }

  if (feedId !== undefined) {
    const feed = await Feed.findOne({ where: { id: feedId, userId } });
    if (!feed) {
      throw ApiError.notFound('Feed not found');
    }
  }

  // Fetch one extra row beyond what we return ("peek ahead") so we can
  // tell "exactly boundedLimit items exist, and that's the end" apart from
  // "there's at least one more after this page" - without that peek, a
  // page landing exactly on boundedLimit remaining items would wrongly get
  // a nextCursor pointing at nothing, costing the client one wasted empty
  // request before it learns the feed actually ended.
  const fetched = await Article.findAll({
    attributes: ['id', 'feedId', 'title', 'link', 'description', 'imageUrl', 'publishedAt'],
    include: [{ association: 'feed', attributes: ['title', 'url'], where: { userId } }],
    where: {
      [Op.and]: [
        // Articles with no known publish date don't fit a "sorted by
        // freshness" feed - deliberately excluded here.
        { publishedAt: { [Op.ne]: null } },
        feedId !== undefined ? { feedId } : {},
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
    limit: boundedLimit + 1,
  });

  const hasMore = fetched.length > boundedLimit;
  const rawItems = hasMore ? fetched.slice(0, boundedLimit) : fetched;

  // nextCursor is derived from the last (oldest) item of the page we
  // actually return - since articles are returned in this same raw order
  // (no reordering), the cursor boundary matches exactly what the client
  // saw, regardless of the extra peeked-at row above.
  const nextCursor = hasMore
    ? encodeCursor({
      publishedAt: (rawItems[rawItems.length - 1].publishedAt as Date).toISOString(),
      id: rawItems[rawItems.length - 1].id,
    })
    : null;

  return { articles: rawItems, nextCursor };
};
