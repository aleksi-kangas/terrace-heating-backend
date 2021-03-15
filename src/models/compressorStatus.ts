import mongoose, { Document, Schema } from 'mongoose';
import moment from 'moment';

export interface CompressorStatusDocument extends Document {
  time: moment.Moment,
  type: string,
}

/**
 * Mongoose Schema for compressor start and stop timestamps.
 */
const compressorSchema: Schema = new Schema({
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

const CompressorStatus = mongoose.model<CompressorStatusDocument>('CompressorStatus', compressorSchema);

export default CompressorStatus;
