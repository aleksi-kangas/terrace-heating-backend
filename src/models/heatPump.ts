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
  groundLoopInputTemp: Number,
  groundLoopOutputTemp: Number,
  compressorRunning: Boolean,
  compressorUsage: Number,
  lowerTankLowerLimit: Number,
  lowerTankUpperLimit: Number,
  upperTankLowerLimit: Number,
  upperTankUpperLimit: Number,
});

const HeatPump = mongoose.model<HeatPumpEntryDocument>('HeatPump', heatPumpSchema);

export default HeatPump;
