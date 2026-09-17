'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('articles', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      feed_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'feeds', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      // SHA-256 hex digest of the item's <guid> (falling back to <link> if
      // the feed doesn't provide one). Fixed-length and indexable, unlike
      // the raw guid/link which can be arbitrarily long in the wild.
      guid_hash: {
        type: Sequelize.CHAR(64),
        allowNull: false,
      },
      // Kept for debugging/display - not indexed, so no length constraint
      // driven by MySQL's key-length limit.
      guid: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(512),
        allowNull: true,
      },
      link: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // The worker relies on this unique index for dedup: re-parsing a feed
    // and re-inserting the same items is a no-op (INSERT IGNORE via
    // Sequelize's bulkCreate({ ignoreDuplicates: true })).
    await queryInterface.addIndex('articles', ['feed_id', 'guid_hash'], {
      unique: true,
      name: 'articles_feed_id_guid_hash_unique',
    });

    // Supports the typical "latest articles for this feed" listing query.
    await queryInterface.addIndex('articles', ['feed_id', 'published_at'], {
      name: 'articles_feed_id_published_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('articles');
  },
};
