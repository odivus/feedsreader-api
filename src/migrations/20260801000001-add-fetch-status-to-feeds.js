'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('feeds', 'last_fetched_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('feeds', 'last_fetch_status', {
      // null = never fetched yet
      type: Sequelize.ENUM('success', 'error'),
      allowNull: true,
    });

    await queryInterface.addColumn('feeds', 'last_fetch_error', {
      type: Sequelize.STRING(1024),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('feeds', 'last_fetched_at');
    await queryInterface.removeColumn('feeds', 'last_fetch_status');
    await queryInterface.removeColumn('feeds', 'last_fetch_error');
    // MySQL keeps the ENUM type attached to the column; dropping the column
    // above already removes it, nothing further to clean up.
  },
};
