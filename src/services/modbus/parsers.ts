import moment from 'moment';
import HeatPump from '../../models/heatPump';
import CompressorStatus from '../../models/compressorStatus';
import { signValue } from './helpers';
import { HeatPumpEntry, TankLimits, VariableHeatingSchedule } from '../../types';

/**
 * Contains parsers for both mutating data received from heat-pump,
 * and preparing data to be written to the heat-pump.
 */

/**
 * Helper function for calculating the percentage of compressor usage during a cycle.
 * @param compressorStartTime time when the compressor started
 * @param compressorStopTime time when the compressor stopped
 * @param cycleEndTime end time of the given cycle
 */
const calculateCompressorUsage = (
  compressorStartTime: moment.Moment, compressorStopTime: moment.Moment, cycleEndTime: moment.Moment,
): number => {
  let cycleDuration;
  let runningDuration;

  if (compressorStartTime.isBefore(compressorStopTime)) {
    cycleDuration = moment.duration(cycleEndTime.diff(compressorStartTime));
    runningDuration = moment.duration(compressorStopTime.diff(compressorStartTime));
  } else {
    cycleDuration = moment.duration(cycleEndTime.diff(compressorStopTime));
    runningDuration = moment.duration(cycleEndTime.diff(compressorStartTime));
  }

  // Calculate compressor usage percentage
  return Math.round(
    (runningDuration.asMinutes() / cycleDuration.asMinutes() + Number.EPSILON) * 100,
  ) / 100;
};

/**
 * Parses current compressor usage and determines,
 * whether the current update is either a start point or end point for a compressor cycle.
 * Cycle definition is: running time -> not running time || not running time -> running time
 * Cycles overlap to produce more data points.
 * @param compressorRunning is the compressor running (boolean)
 * @param currentQueryTime time of the current query (Moment object)
 */
export const parseCompressorUsage = async (
  compressorRunning: boolean, currentQueryTime: moment.Moment,
): Promise<number | null> => {
  const latestHeatPumpEntry = await HeatPump.findOne({}, {}, { sort: { time: -1 } });

  if (!latestHeatPumpEntry) {
    // There are no heat-pump entries to compare to yet
    return null;
  }

  const lastStartEntry = await CompressorStatus.findOne({ type: 'start' }, {}, { sort: { time: -1 } });
  const lastStopEntry = await CompressorStatus.findOne({ type: 'end' }, {}, { sort: { time: -1 } });

  let compressorUsage = null;
  if (compressorRunning && !latestHeatPumpEntry.compressorRunning) {
    // Current query represents the end of a cycle (running -> not running): e.g. RRRRRRNNNN = 60 %

    // Calculate compressor usage during the last cycle
    if (lastStartEntry && lastStopEntry) {
      compressorUsage = calculateCompressorUsage(
        moment(lastStartEntry.time), moment(lastStopEntry.time), currentQueryTime,
      );
    }

    // Add an entry indicating that compressor started at this moment
    const cycleStartEntry = new CompressorStatus({
      type: 'start',
      time: currentQueryTime,
    });
    await cycleStartEntry.save();
  } else if (!compressorRunning && latestHeatPumpEntry.compressorRunning) {
    // Current query represents the end of a cycle (not running -> running): e.g. NNNNRRRRRR = 60 %

    // Calculate compressor usage during the last cycle
    if (lastStartEntry && lastStopEntry) {
      compressorUsage = calculateCompressorUsage(
        moment(lastStartEntry.time), moment(lastStopEntry.time), currentQueryTime,
      );
    }

    // Add an entry indicating that compressor stopped at this moment
    const compressorStatusEntry = new CompressorStatus({
      type: 'end',
      time: currentQueryTime,
    });
    await compressorStatusEntry.save();
  }

  return compressorUsage;
};

/**
 * Parser for lowerTank and upperTank limits.
 * Returns new limits every ten minutes or if any of the limits have changed.
 * Otherwise returned limits will be null.
 * @param lowerTankLowerLimit current value of lowerTankLowerLimit (number)
 * @param lowerTankUpperLimit current value of lowerTankUpperLimit (number)
 * @param upperTankLowerLimit current value of upperTankLowerLimit (number)
 * @param upperTankUpperLimit current value of upperTankUpperLimit (number)
 * @param timeStamp time of the current query (Moment object)
 * @return TankLimits the new tank limits
 */
export const parseTankLimits = async (
  lowerTankLowerLimit: number, lowerTankUpperLimit: number,
  upperTankLowerLimit: number, upperTankUpperLimit: number,
  timeStamp: moment.Moment,
): Promise<TankLimits> => {
  const latestHeatPumpEntry = await HeatPump.findOne()
    .sort({
      field: 'asc',
      _id: -1,
    })
    .limit(1);

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
 * @return HeatPumpEntry parsed heat-pump data
 */
export const parseHeatPumpData = async (
  data: number[], compressorStatus: number,
): Promise<HeatPumpEntry> => {
  const compressorRunning = compressorStatus === 1;
  const timeStamp = moment();
  const compressorUsage = await parseCompressorUsage(compressorRunning, timeStamp);
  const limits = await parseTankLimits(data[74], data[75], data[78], data[79], timeStamp);

  return ({
    time: timeStamp,
    outsideTemp: signValue(data[0]),
    hotGasTemp: signValue(data[1]),
    heatDistCircuit1Temp: signValue(data[4]),
    heatDistCircuit2Temp: signValue(data[5]),
    lowerTankTemp: signValue(data[16]),
    upperTankTemp: signValue(data[17]),
    insideTemp: signValue(data[73]),
    groundLoopOutputTemp: signValue(data[97]),
    groundLoopInputTemp: signValue(data[98]),
    heatDistCircuit3Temp: signValue(data[116]),
    compressorRunning,
    compressorUsage,
    ...limits,
  });
};

/**
 * Parses lower tank schedule from the queried values.
 * @param times number[]
 * @param deltas number[]
 * @return VariableHeatingSchedule
 */
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

/**
 * Parses heat distribution circuit three schedule from the queried values.
 * @param times number[]
 * @param deltas number[]
 * @return VariableHeatingSchedule
 */
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
