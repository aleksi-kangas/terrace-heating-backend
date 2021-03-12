import * as mongoose from 'mongoose';

/* eslint-disable no-underscore-dangle,no-param-reassign */

/**
 * Mongoose Schema for compressor start and stop timestamps.
 */
const compressorSchema = new mongoose.Schema({
  time: { type: Date, required: true },
  type: { type: String, required: true },
});

/**
 * Custom toJSON function to transform objects of the schema.
 *
 * Changes the name of the id property (from _id to id).
 * Deletes unnecessary properties _id and __v (version) provided by MongoDB.
 */
// compressorSchema.set('toJSON', {
//   transform: (doc: never, obj: { id: string; _id: { toString: () => string; }; __v: string; }) => {
//     obj.id = obj._id.toString(); // Rename id property
//     delete obj._id;
//     delete obj.__v; // Delete version property
//   },
// });

const CompressorStatus = mongoose.model('CompressorStatus', compressorSchema);

export default CompressorStatus;
