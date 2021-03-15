import mongoose, { Document, Schema } from 'mongoose';
import moment from 'moment';

export interface HeatPumpEntryDocument extends Document {
  time: moment.Moment,
  outsideTemp: number,
  insideTemp: number,
  hotGasTemp: number,
  heatDistCircuit1Temp: number,
  heatDistCircuit2Temp: number,
  heatDistCircuit3Temp: number,
  lowerTankTemp: number,
  upperTankTemp: number,
  groundLoopTempInput: number,
  groundLoopTempOutput: number,
  compressorRunning: boolean,
  compressorUsage: number | null,
  lowerTankLowerLimit: number,
  lowerTankUpperLimit: number,
  upperTankLowerLimit: number,
  upperTankUpperLimit: number,
}
/**
 * Mongoose Schema for heat pump data.
 *
 * Contains predetermined fields for storing heat pump data gathered with ModBus.
 */
const heatPumpSchema: Schema = new Schema({
  time: { type: Date, required: true },
  outsideTemp: Number,
  insideTemp: Number,
  hotGasTemp: Number,
  heatDistCircuit1Temp: Number,
  heatDistCircuit2Temp: Number,
  heatDistCircuit3Temp: Number,
  lowerTankTemp: Number,
  upperTankTemp: Number,
  groundLoopTempInput: Number,
  groundLoopTempOutput: Number,
  compressorRunning: Number,
  compressorUsage: Boolean,
  lowerTankLowerLimit: Number,
  lowerTankUpperLimit: Number,
  upperTankLowerLimit: Number,
  upperTankUpperLimit: Number,
});

/**
 * Custom toJSON function to transform objects of the schema.
 *
 * Changes the name of the id property (from _id to id).
 * Deletes unnecessary properties _id and __v (version) provided by MongoDB.
 */
// heatPumpSchema.set('toJSON', {
//   transform: (doc, obj) => {
//     obj.id = obj._id.toString(); // Rename id property
//     delete obj._id;
//     delete obj.__v; // Delete version property
//   },
// });

const HeatPump = mongoose.model<HeatPumpEntryDocument>('HeatPump', heatPumpSchema);

export default HeatPump;
