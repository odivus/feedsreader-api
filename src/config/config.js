require('dotenv').config();

/**
 * This file is consumed exclusively by sequelize-cli (see .sequelizerc)
 * to run migrations/seeders from the command line. The running
 * application itself builds its own Sequelize instance in
 * src/config/database.ts from the same environment variables.
 */
const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  dialect: 'mysql',
};

module.exports = {
  development: base,
  test: { ...base, database: `${process.env.DB_NAME}_test` },
  production: base,
};
