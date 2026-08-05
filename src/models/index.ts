import { Article, initArticleModel } from './Article';
import { sequelize } from '../config/database';
import { Feed, initFeedModel } from './Feed';
import { initRefreshTokenModel, RefreshToken } from './RefreshToken';
import { initUserModel, User } from './User';

initUserModel(sequelize);
initRefreshTokenModel(sequelize);
initFeedModel(sequelize);
initArticleModel(sequelize);

// ---- Associations ----
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Feed, { foreignKey: 'userId', as: 'feeds', onDelete: 'CASCADE' });
Feed.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Feed.hasMany(Article, { foreignKey: 'feedId', as: 'articles', onDelete: 'CASCADE' });
Article.belongsTo(Feed, { foreignKey: 'feedId', as: 'feed' });

export { sequelize, User, RefreshToken, Feed, Article };
