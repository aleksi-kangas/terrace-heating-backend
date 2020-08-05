import mongoose from 'mongoose';

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
  groundLoopTempOutput: { type: Number, required: true }
});

export const HeatPump = mongoose.model('HeatPump', heatPumpSchema);