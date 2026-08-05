import { Sequelize } from 'sequelize';
import { env } from './env';
import { logger } from './logger';

export const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'mysql',
  logging: env.isDevelopment ? (sql) => logger.debug(sql) : false,
  define: {
    underscored: false,
    timestamps: true,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});
