import mongoose, { Document, Schema } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

export interface UserDocument extends Document {
  username: string,
  name?: string,
  passwordHash: string
}

/**
 * Mongoose Schema for user.
 *
 * @property username - user's username
 * @property name - user's name
 * @property passwordHash - hashed password by bcryptjs-library
 */
const userSchema: Schema = new Schema({
  username: {
    type: String,
    minlength: 3,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    minlength: 3,
    required: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
});

userSchema.plugin(uniqueValidator);

const User = mongoose.model<UserDocument>('User', userSchema);

export default User;
