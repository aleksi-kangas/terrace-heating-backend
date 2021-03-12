import * as mongoose from 'mongoose';

/* eslint-disable no-underscore-dangle,no-param-reassign */

/**
 * Mongoose Schema for heat pump data.
 *
 * Contains predetermined fields for storing heat pump data gathered with ModBus.
 */
const heatPumpSchema = new mongoose.Schema({
  time: { type: Date, required: true },
  outsideTemp: { type: Number },
  insideTemp: { type: Number },
  hotGasTemp: { type: Number },
  heatDistCircuitTemp1: { type: Number },
  heatDistCircuitTemp2: { type: Number },
  heatDistCircuitTemp3: { type: Number },
  lowerTankTemp: { type: Number },
  upperTankTemp: { type: Number },
  groundLoopTempInput: { type: Number },
  groundLoopTempOutput: { type: Number },
  compressorRunning: { type: Boolean },
  compressorUsage: { type: Number },
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
// heatPumpSchema.set('toJSON', {
//   transform: (doc, obj) => {
//     obj.id = obj._id.toString(); // Rename id property
//     delete obj._id;
//     delete obj.__v; // Delete version property
//   },
// });

const HeatPump = mongoose.model('HeatPump', heatPumpSchema);

export default HeatPump;
