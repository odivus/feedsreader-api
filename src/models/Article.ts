import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

export class Article extends Model<InferAttributes<Article>, InferCreationAttributes<Article>> {
  declare id: CreationOptional<number>;
  declare feedId: number;
  // SHA-256 hex digest of guid (or link, if the feed item has no guid) -
  // see src/utils/crypto.ts#sha256Hex. Used for de-duplication on re-fetch.
  declare guidHash: string;
  declare guid: string;
  declare title: CreationOptional<string | null>;
  declare link: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare imageUrl: CreationOptional<string | null>;
  declare publishedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initArticleModel(sequelize: Sequelize): typeof Article {
  Article.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      feedId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'feed_id',
      },
      guidHash: {
        type: DataTypes.CHAR(64),
        allowNull: false,
        field: 'guid_hash',
      },
      guid: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
      link: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      imageUrl: {
        type: DataTypes.STRING(1024),
        allowNull: true,
        field: 'image_url',
      },
      publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'published_at',
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
      tableName: 'articles',
      modelName: 'Article',
      indexes: [{ unique: true, fields: ['feed_id', 'guid_hash'], name: 'articles_feed_id_guid_hash_unique' }],
    },
  );

  return Article;
}
