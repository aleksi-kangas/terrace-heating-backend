import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const login = async (credentials) => {
  const user = await User.findOne({ username: credentials.username });
  // Compare password
  const correctPassword = (user === null)
    ? false
    : bcrypt.compareSync(credentials.password, user.passwordHash);

  // Password is wrong
  if (!correctPassword) {
    return null;
  }

  // Password is correct -> Generate JWT
  const token = jwt.sign({
    username: user.username,
    id: user.id,
  }, process.env.JWT);

  return {
    token,
    username: user.username,
    name: user.name,
    id: user.id,
  };
};

export default { login };
