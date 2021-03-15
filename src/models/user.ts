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

/**
 * Custom toJSON function to transform objects of the schema.
 *
 * Changes the name of the id property (from _id to id).
 * Deletes unnecessary properties _id and __v (version) provided by MongoDB.
 */
// userSchema.set('toJSON', {
//   transform: (doc, obj) => {
//     obj.id = obj._id.toString(); // Rename id property
//     delete obj._id;
//     delete obj.__v; // Delete version property
//   },
// });

const User = mongoose.model<UserDocument>('User', userSchema);

export default User;
