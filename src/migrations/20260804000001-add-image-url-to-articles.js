'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('articles', 'image_url', {
      type: Sequelize.STRING(1024),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('articles', 'image_url');
  },
};
