import * as moment from 'moment';
import HeatPump from '../../models/heatPump';
import CompressorStatus from '../../models/compressorStatus';
import { signValue } from './helpers';
import { HeatPumpEntry, TankLimits, VariableHeatingSchedule } from '../../utils/types';

/**
 * Contains parsers for both mutating data received from heat-pump,
 * and preparing data to be written to the heat-pump.
 */

/**
 * Parses current compressor usage and determines,
 * whether the current update is either a start point or end point for a compressor cycle.
 * Cycle definition is: running time -> not running time || not running time -> running time
 * Cycles overlap to produce more data points.
 * @param compressorRunning Boolean
 * @param currentQueryTime time of the current query
 */
export const parseCompressorUsage = async (
  compressorRunning: boolean, currentQueryTime: moment.Moment,
): Promise<number | null> => {
  const latestHeatPumpEntry = await HeatPump.findOne({}, {}, { sort: { _id: -1 } });
  const lastStartEntry = await CompressorStatus.findOne({ type: 'start' }, {}, { sort: { _id: -1 } });
  const lastStopEntry = await CompressorStatus.findOne({ type: 'end' }, {}, { sort: { _id: -1 } });

  if (!latestHeatPumpEntry) {
    // There are no heat-pump entries to compare to yet
    return null;
  }

  // Extract timestamps from previous start and stop entries
  // const startEntryTime = lastStartEntry ? moment(lastStartEntry.time) : null;
  // const stopEntryTime = lastStopEntry ? moment(lastStopEntry.time) : null;

  let compressorUsage = null;
  let runningDuration;
  let cycleDuration;

  if (compressorRunning && !latestHeatPumpEntry.compressorRunning) {
    /*
    Current query represents the edge between 'not running' -> 'running'.
    Calculate the usage of compressor during the last cycle.
    Example: RRRRRRNNNN = 60 %
     */
    if (lastStartEntry && lastStopEntry) {
      const startEntryTime = moment(lastStartEntry.time);
      const stopEntryTime = moment(lastStopEntry.time);
      cycleDuration = moment.duration(currentQueryTime.diff(startEntryTime));
      runningDuration = moment.duration(stopEntryTime.diff(startEntryTime));
    }
    // Add cycle start entry
    const cycleStartEntry = new CompressorStatus({
      type: 'start',
      time: currentQueryTime,
    });
    await cycleStartEntry.save();
  } else if (!compressorRunning && latestHeatPumpEntry.compressorRunning) {
    /*
    Current query represents the edge between 'running' -> 'not running'.
    Calculate the usage of compressor during the last cycle.
    Calculation will be done only if the database has at least one startEntry and stopEntry.
    Example: NNNNRRRRRR = 60 %
     */
    if (lastStartEntry && lastStopEntry) {
      // Calculate running duration and the whole cycle duration
      const startEntryTime = moment(lastStartEntry.time);
      const stopEntryTime = moment(lastStopEntry.time);
      runningDuration = moment.duration(currentQueryTime.diff(startEntryTime));
      cycleDuration = moment.duration(currentQueryTime.diff(stopEntryTime));
    }
    // Add cycle end entry
    const compressorStatusEntry = new CompressorStatus({
      type: 'end',
      time: currentQueryTime,
    });
    await compressorStatusEntry.save();
  }

  // Usage of the compressor during last cycle.
  if (runningDuration && cycleDuration) {
    compressorUsage = Math.round(
      (runningDuration.asMinutes() / cycleDuration.asMinutes() + Number.EPSILON) * 100,
    ) / 100;
  }
  return compressorUsage;
};

/**
 * Parser for lowerTank and upperTank limits.
 * Returns new limits every ten minutes or if any of the limits have changed.
 * Otherwise returned limits will be null.
 * @param lowerTankLowerLimit current value of lowerTankLowerLimit
 * @param lowerTankUpperLimit current value of lowerTankUpperLimit
 * @param upperTankLowerLimit current value of upperTankLowerLimit
 * @param upperTankUpperLimit current value of upperTankUpperLimit
 * @param timeStamp time of the current query
 * @return Object containing new limits
 */
export const parseTankLimits = async (
  lowerTankLowerLimit: number, lowerTankUpperLimit: number,
  upperTankLowerLimit: number, upperTankUpperLimit: number,
  timeStamp: moment.Moment,
): Promise<TankLimits> => {
  const latestHeatPumpEntry = await HeatPump.findOne().sort({ field: 'asc', _id: -1 }).limit(1);

  // Updating limits every ten minutes
  if (!latestHeatPumpEntry || timeStamp.minutes() % 10 === 0) {
    return {
      lowerTankLowerLimit,
      lowerTankUpperLimit,
      upperTankLowerLimit,
      upperTankUpperLimit,
    };
  }

  const result = {
    lowerTankLowerLimit: latestHeatPumpEntry.lowerTankLowerLimit,
    lowerTankUpperLimit: latestHeatPumpEntry.lowerTankUpperLimit,
    upperTankLowerLimit: latestHeatPumpEntry.upperTankLowerLimit,
    upperTankUpperLimit: latestHeatPumpEntry.upperTankUpperLimit,
  };

  // Limits have changed
  if (latestHeatPumpEntry.lowerTankLowerLimit
    && latestHeatPumpEntry.lowerTankLowerLimit !== lowerTankLowerLimit) {
    result.lowerTankLowerLimit = lowerTankLowerLimit;
  }
  if (latestHeatPumpEntry.lowerTankUpperLimit
    && latestHeatPumpEntry.lowerTankUpperLimit !== lowerTankUpperLimit) {
    result.lowerTankUpperLimit = lowerTankUpperLimit;
  }
  if (latestHeatPumpEntry.upperTankLowerLimit
    && latestHeatPumpEntry.upperTankLowerLimit !== upperTankLowerLimit) {
    result.upperTankLowerLimit = upperTankLowerLimit;
  }
  if (latestHeatPumpEntry.upperTankUpperLimit
    && latestHeatPumpEntry.upperTankUpperLimit !== upperTankUpperLimit) {
    result.upperTankUpperLimit = upperTankUpperLimit;
  }
  return result;
};

/**
 * Parses and signs predetermined heat pump data from a ModBus query result.
 * @return {Object} - contains predetermined signed heat pump data
 */
export const parseHeatPumpData = async (
  data: number[], compressorStatus: number,
): Promise<HeatPumpEntry> => {
  const compressorRunning = compressorStatus === 1;
  const timeStamp = new Date();
  const compressorUsage = await parseCompressorUsage(compressorRunning, moment(timeStamp));
  const limits = await parseTankLimits(data[74], data[75], data[78], data[79], moment(timeStamp));

  return ({
    time: timeStamp,
    outsideTemp: signValue(data[0]),
    hotGasTemp: signValue(data[1]),
    heatDistCircuitTemp1: signValue(data[4]),
    heatDistCircuitTemp2: signValue(data[5]),
    lowerTankTemp: signValue(data[16]),
    upperTankTemp: signValue(data[17]),
    insideTemp: signValue(data[73]),
    groundLoopTempOutput: signValue(data[97]),
    groundLoopTempInput: signValue(data[98]),
    heatDistCircuitTemp3: signValue(data[116]),
    compressorRunning,
    compressorUsage,
    ...limits,
  });
};

export const parseLowerTankSchedule = (
  times: number[], deltas: number[],
): VariableHeatingSchedule => ({
  monday: {
    start: times[0],
    end: times[7],
    delta: deltas[0],
  },
  tuesday: {
    start: times[1],
    end: times[8],
    delta: deltas[1],
  },
  wednesday: {
    start: times[2],
    end: times[9],
    delta: deltas[2],
  },
  thursday: {
    start: times[3],
    end: times[10],
    delta: deltas[3],
  },
  friday: {
    start: times[4],
    end: times[11],
    delta: deltas[5],
  },
  saturday: {
    start: times[5],
    end: times[12],
    delta: deltas[6],
  },
  sunday: {
    start: times[6],
    end: times[13],
    delta: deltas[7],
  },
});

export const parseCircuitThreeSchedule = (
  times: number[], deltas: number[],
): VariableHeatingSchedule => ({
  monday: {
    start: times[3],
    end: times[2],
    delta: deltas[1],
  },
  tuesday: {
    start: times[0],
    end: times[1],
    delta: deltas[0],
  },
  wednesday: {
    start: times[9],
    end: times[10],
    delta: deltas[4],
  },
  thursday: {
    start: times[11],
    end: times[4],
    delta: deltas[5],
  },
  friday: {
    start: times[12],
    end: times[13],
    delta: deltas[6],
  },
  saturday: {
    start: times[5],
    end: times[6],
    delta: deltas[2],
  },
  sunday: {
    start: times[7],
    end: times[8],
    delta: deltas[3],
  },
});

const Parsers = {
  parseCircuitThreeSchedule,
  parseCompressorUsage,
  parseHeatPumpData,
  parseLowerTankSchedule,
  parseTankLimits,
};

export default Parsers;
