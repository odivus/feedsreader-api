import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

export enum FeedFetchStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export class Feed extends Model<InferAttributes<Feed>, InferCreationAttributes<Feed>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare url: string;
  declare title: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  // Populated by the background worker (src/worker.ts) - null until the
  // first fetch attempt.
  declare lastFetchedAt: CreationOptional<Date | null>;
  declare lastFetchStatus: CreationOptional<FeedFetchStatus | null>;
  declare lastFetchError: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initFeedModel(sequelize: Sequelize): typeof Feed {
  Feed.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'user_id',
      },
      // Kept at 512 chars (not the theoretical max URL length) so that the
      // unique (user_id, url) index below stays within MySQL's InnoDB index
      // key-length limit for utf8mb4 columns.
      url: {
        type: DataTypes.STRING(512),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      lastFetchedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_fetched_at',
      },
      lastFetchStatus: {
        type: DataTypes.ENUM(...Object.values(FeedFetchStatus)),
        allowNull: true,
        field: 'last_fetch_status',
      },
      lastFetchError: {
        type: DataTypes.STRING(1024),
        allowNull: true,
        field: 'last_fetch_error',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    },
    {
      sequelize,
      tableName: 'feeds',
      modelName: 'Feed',
      indexes: [
        // a user shouldn't be able to add the exact same feed url twice
        { unique: true, fields: ['user_id', 'url'], name: 'feeds_user_id_url_unique' },
      ],
    },
  );

  return Feed;
}
