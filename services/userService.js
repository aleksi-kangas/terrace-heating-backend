import bcryptjs from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/user.js';

/**
 * Fetches all Users from MongoDB.
 * @return {Array<Object>} users
 */
const getAll = async () => {
  const users = await User.find({});
  return users.map((user) => user.toJSON());
};

/**
 * Used to create a new user and save it to the database.
 * @param username string
 * @param password string
 * @return {Promise<void|Promise|*>} saved user
 */
const create = async (username, password) => {
  if (!password || password.length < 3) {
    // Throw validation error
    const validationError = new mongoose.Error.ValidationError(null);
    validationError
      .addError(
        'password',
        new mongoose.Error.ValidatorError({ message: 'Password must be at least 3 characters long' }),
      );
    throw validationError;
  }
  const passwordHash = await bcryptjs.hash(password, 10);
  const user = new User({
    username,
    passwordHash,
  });
  return user.save();
};

export default {
  getAll,
  create,
};
