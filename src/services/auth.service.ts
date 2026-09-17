import { Op } from 'sequelize';
import { AuthProvider, User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { hashPassword } from '../utils/password';

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

/** Registers a new local (username/email + password) user account. */
export const registerUser = async (input: RegisterInput): Promise<User> => {
  const existing = await User.findOne({
    where: { [Op.or]: [{ username: input.username }, { email: input.email }] },
  });

  if (existing) {
    if (existing.email === input.email) {
      throw ApiError.conflict('An account with this email already exists');
    }
    throw ApiError.conflict('This username is already taken');
  }

  const passwordHash = await hashPassword(input.password);

  return User.create({
    username: input.username,
    email: input.email,
    password: passwordHash,
    provider: AuthProvider.LOCAL,
    providerId: null,
  });
};
