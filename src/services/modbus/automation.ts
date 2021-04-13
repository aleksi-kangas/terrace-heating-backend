import moment from 'moment';
import HeatPump from '../../models/heatPump';
import ModBusApi from './api';
import { signValue } from './helpers';
import Logger from '../../utils/logger';
import { HeatPumpEntry } from '../../types';

// Holds at maximum 5 values of difference in estimated minutes left till upper limit is reached
let buffer: number[] = [];

const adjustmentThreshold = 25;

/**
 * Helper function for calculating the average of the buffer,
 * that contains entries of differences in minutes before upper limits are reached.
 * @return number average difference in minutes before upper limits are reached
 */
const calculateAverage = () => {
  const sum = buffer.reduce((s: number, estMinutesLeftDiff: number) => s + estMinutesLeftDiff, 0);
  return sum / buffer.length;
};

// Calculate temperature deltas for lower and upper tank
/**
 * Helper function for calculating temperature deltas of the tanks between the last two entries.
 * @param thisEntry the most recent entry of heat-pump data
 * @param previousEntry the second most recent entry of heat-pump data
 */
const temperatureDeltas = (thisEntry: HeatPumpEntry, previousEntry: HeatPumpEntry) => ({
  lowerTankTempDelta: Math.round((
    thisEntry.lowerTankTemp - previousEntry.lowerTankTemp + Number.EPSILON) * 100) / 100,
  upperTankTempDelta: Math.round((
    thisEntry.upperTankTemp - previousEntry.upperTankTemp + Number.EPSILON) * 100) / 100,
});

/**
 * Helper function for calculating the estimated amount of minutes for each tank to reach its upper limit.
 * @param thisEntry the most recent entry of heat-pump data
 * @param tempDeltas object containing current temperature deltas for the tanks created by temperatureDeltas()-function
 */
const estimatedTimesLeftUntilUpperLimits = (
  thisEntry: HeatPumpEntry, tempDeltas: { lowerTankTempDelta: number, upperTankTempDelta: number },
) => ({
  lowerTank: Math.round(
    ((thisEntry.lowerTankUpperLimit - thisEntry.lowerTankTemp) / tempDeltas.lowerTankTempDelta + Number.EPSILON) * 100,
  ) / 100,
  upperTank: Math.round(
    ((thisEntry.upperTankUpperLimit - thisEntry.upperTankTemp) / tempDeltas.upperTankTempDelta + Number.EPSILON) * 100,
  ) / 100,
});

/**
 * Automatically changes the heat exchanger ratio of the heat-pump,
 * to better keep lowerTank and upperTank temperatures within their limits.
 * Changes are based on calculating the estimated times until the tank temperatures reach their upper limits.
 * Estimate differences are kept in a buffer, and if a threshold is exceeded,
 * the heat exchanger ratio (Fin. tulistin) is adjusted accordingly.
 */
export const automatedHeatExchangerRatio = async (): Promise<void> => {
  const lastTwoEntries = await HeatPump.find().sort({ field: 'asc', _id: -1 }).limit(2);
  if (lastTwoEntries.length >= 2) {
    const thisEntry = lastTwoEntries[0];
    const previousEntry = lastTwoEntries[1];

    // If both lower and upper tank already breached the upper limit -> do nothing
    if (thisEntry.lowerTankTemp > thisEntry.lowerTankUpperLimit
      && thisEntry.upperTankTemp > thisEntry.upperTankUpperLimit) return;

    // Calculate temperature deltas for lower and upper tank
    const tempDeltas = temperatureDeltas(thisEntry, previousEntry);

    // Adjusting is not needed when temperature change is negative
    if (tempDeltas.lowerTankTempDelta < 0 || tempDeltas.upperTankTempDelta < 0) {
      // Clear the buffer
      buffer = [];
      return;
    }

    // Estimated minutes left until temperature reaches upper limit
    const estMinutesUntilUpperLimit = estimatedTimesLeftUntilUpperLimits(thisEntry, tempDeltas);

    // Keep the buffer at max size 5
    if (buffer.length === 5) {
      buffer.shift();
    }
    buffer.push(estMinutesUntilUpperLimit.lowerTank - estMinutesUntilUpperLimit.upperTank);

    // Average of (max 5) differences in estimated minutes until tanks reach their limits
    const average = calculateAverage();

    // Adjust only when there are 5 consecutive positive temperature deltas and the adjusting threshold is exceeded
    if (buffer.length === 5 && Math.abs(average) >= adjustmentThreshold) {
      const heatExchangerRatio = signValue(await ModBusApi.queryHeatExchangerRatio());
      if (average < 0) {
        const newHeatExchangerRatio = Math.min(heatExchangerRatio + 5, 50);
        if (heatExchangerRatio !== newHeatExchangerRatio) {
          Logger.info(`Heat exchanger ratio increased to ${newHeatExchangerRatio} at ${moment.now()}`);
          await ModBusApi.setHeatExchangerRatio(newHeatExchangerRatio);
        } else {
          Logger.info(`Heat exchanger ratio is already at the upper bound (50) - ${moment.now()}`);
        }
      }
      if (average > 0) {
        const newHeatExchangerRatio = Math.max(heatExchangerRatio - 5, 10);
        if (heatExchangerRatio !== newHeatExchangerRatio) {
          Logger.info(`Heat exchanger ratio decreased to ${newHeatExchangerRatio} at ${moment.now()}`);
          await ModBusApi.setHeatExchangerRatio(newHeatExchangerRatio);
        } else {
          Logger.info(`Heat exchanger ratio is already at the lower bound (10) - ${moment.now()}`);
        }
      }
      // Clear buffer
      buffer = [];
    }
  }
};

export default {
  automatedHeatExchangerRatio,
};
