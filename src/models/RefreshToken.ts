import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

export class RefreshToken extends Model<InferAttributes<RefreshToken>, InferCreationAttributes<RefreshToken>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  // SHA-256 hash of the raw token; the raw value is only ever sent to the client
  declare tokenHash: string;
  declare expiresAt: Date;
  declare revokedAt: CreationOptional<Date | null>;
  declare userAgent: CreationOptional<string | null>;
  declare ipAddress: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initRefreshTokenModel(sequelize: Sequelize): typeof RefreshToken {
  RefreshToken.init(
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
      tokenHash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        field: 'token_hash',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at',
      },
      revokedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'revoked_at',
      },
      userAgent: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'user_agent',
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        field: 'ip_address',
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
      tableName: 'refresh_tokens',
      modelName: 'RefreshToken',
    },
  );

  return RefreshToken;
}
