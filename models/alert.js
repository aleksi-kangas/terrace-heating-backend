import mongoose from 'mongoose';

/* eslint-disable no-underscore-dangle,no-param-reassign */

/**
 * Mongoose Schema for alerts.
 *
 * @property variable - which variable the alert is related to
 * @property lowerLimit - minimum value of the variable below which an alert will be created
 * @property upperLimit - maximum value of the variable above which an alert will be created
 * @property user - a reference to a user object whose alert this is
 */
const alertSchema = new mongoose.Schema({
  variable: {
    type: String,
    required: true,
  },
  lowerLimit: {
    type: Number,
  },
  upperLimit: {
    type: Number,
  },
  user: {
    type: mongoose.Schema.Types.ObjectID,
    ref: 'User',
    required: true,
  },
  triggered: {
    type: Boolean,
    default: false,
    required: true,
  },
  timeStamp: {
    type: Date,
    default: null,
  },
});

/**
 * Custom toJSON function to transform objects of the schema.
 *
 * Changes the name of the id property (from _id to id).
 * Deletes unnecessary properties _id and __v (version) provided by MongoDB.
 */
alertSchema.set('toJSON', {
  transform: (doc, obj) => {
    obj.id = obj._id.toString(); // Rename id property
    delete obj._id;
    delete obj.__v; // Delete version property
  },
});

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;
