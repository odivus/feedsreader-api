import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  GITHUB = 'github',
}

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare username: string;
  declare email: string;
  // null for accounts created exclusively via OAuth (no local password set)
  declare password: CreationOptional<string | null>;
  declare provider: CreationOptional<AuthProvider>;
  declare providerId: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Safe representation for API responses - never leak the password hash. */
  toPublicJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      provider: this.provider,
      createdAt: this.createdAt,
    };
  }
}

export function initUserModel(sequelize: Sequelize): typeof User {
  User.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      provider: {
        type: DataTypes.ENUM(...Object.values(AuthProvider)),
        allowNull: false,
        defaultValue: AuthProvider.LOCAL,
      },
      providerId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'provider_id',
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
      tableName: 'users',
      modelName: 'User',
    },
  );

  return User;
}
