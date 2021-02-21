import mongoose from 'mongoose';

/* eslint-disable no-underscore-dangle,no-param-reassign */

/**
 * Mongoose Schema for tank limits.
 */
const tankLimitSchema = new mongoose.Schema({
  time: { type: Date, required: true },
  lowerTankLowerLimit: { type: Number },
  lowerTankUpperLimit: { type: Number },
  upperTankLowerLimit: { type: Number },
  upperTankUpperLimit: { type: Number },
});

/**
 * Custom toJSON function to transform objects of the schema.
 *
 * Changes the name of the id property (from _id to id).
 * Deletes unnecessary properties _id and __v (version) provided by MongoDB.
 */
tankLimitSchema.set('toJSON', {
  transform: (doc, obj) => {
    obj.id = obj._id.toString(); // Rename id property
    delete obj._id;
    delete obj.__v; // Delete version property
  },
});

const TankLimit = mongoose.model('TankLimit', tankLimitSchema);

export default TankLimit;
