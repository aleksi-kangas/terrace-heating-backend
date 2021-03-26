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

const CompressorStatus = mongoose.model<CompressorStatusDocument>('CompressorStatus', compressorSchema);

export default CompressorStatus;
