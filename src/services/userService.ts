import bcryptjs from 'bcryptjs';
import mongoose from 'mongoose';
import User, { UserDocument } from '../models/user';

/**
 * Fetches all Users from MongoDB.
 * @return UserType[] users
 */
const getAll = async (): Promise<UserDocument[]> => User.find({});

/**
 * Used to create a new user and save it to the database.
 * @param username string
 * @param name string
 * @param password string
 * @return UserType created user
 */
const create = async (username: string, name: string, password: string): Promise<UserDocument> => {
  if (!password || password.length < 3) {
    // Throw validation error
    const validationError = new mongoose.Error.ValidationError('');
    validationError.errors.properties = new mongoose.Error.ValidatorError(
      'Password must be at least 3 characters long',
    );
    throw validationError;
  }
  const passwordHash = await bcryptjs.hash(password, 10);
  const user: UserDocument = new User({
    username,
    name,
    passwordHash,
  });
  return user.save();
};

export default {
  getAll,
  create,
};
