import mongoose from 'mongoose';

/* eslint-disable no-underscore-dangle,no-param-reassign */

/**
 * Mongoose Schema for heat pump data.
 *
 * Contains predetermined fields for storing heat pump data gathered with ModBus.
 */
const heatPumpSchema = new mongoose.Schema({
  time: { type: Date, required: true },
  outsideTemp: { type: Number, required: true },
  insideTemp: { type: Number, required: true },
  hotGasTemp: { type: Number, required: true },
  heatDistCircuitTemp1: { type: Number, required: true },
  heatDistCircuitTemp2: { type: Number, required: true },
  heatDistCircuitTemp3: { type: Number, required: true },
  lowerTankTemp: { type: Number, required: true },
  upperTankTemp: { type: Number, required: true },
  groundLoopTempInput: { type: Number, required: true },
  groundLoopTempOutput: { type: Number, required: true },
});

/**
 * Custom toJSON function to transform objects of the schema.
 *
 * Changes the name of the id property (from _id to id).
 * Deletes unnecessary properties _id and __v (version) provided by MongoDB.
 */
heatPumpSchema.set('toJSON', {
  transform: (doc, obj) => {
    obj.id = obj._id.toString(); // Rename id property
    delete obj._id;
    delete obj.__v; // Delete version property
  },
});

const HeatPump = mongoose.model('HeatPump', heatPumpSchema);

export default HeatPump;
