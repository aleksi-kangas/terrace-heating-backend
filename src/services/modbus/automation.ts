import moment from 'moment';
import HeatPump from '../../models/heatPump';
import ModBusApi from './api';
import { signValue } from './helpers';
import Logger from '../../utils/logger';

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
    const lowerTankTempDelta = Math.round((
      thisEntry.lowerTankTemp - previousEntry.lowerTankTemp + Number.EPSILON) * 100) / 100;
    const upperTankTempDelta = Math.round((
      thisEntry.upperTankTemp - previousEntry.upperTankTemp + Number.EPSILON) * 100) / 100;

    // Adjusting is not needed when temperature change is negative
    if (lowerTankTempDelta < 0 || upperTankTempDelta < 0) {
      // Clear the buffer
      buffer = [];
      return;
    }

    // Estimated minutes left until temperature reaches upper limit
    const estMinutesTillUpperLimit = {
      lowerTank: Math.round(
        ((thisEntry.lowerTankUpperLimit - thisEntry.lowerTankTemp) / lowerTankTempDelta + Number.EPSILON) * 100,
      ) / 100,
      upperTank: Math.round(
        ((thisEntry.upperTankUpperLimit - thisEntry.upperTankTemp) / upperTankTempDelta + Number.EPSILON) * 100,
      ) / 100,
    };

    // Keep the buffer at max size 5
    if (buffer.length === 5) {
      buffer.shift();
    }
    buffer.push(estMinutesTillUpperLimit.lowerTank - estMinutesTillUpperLimit.upperTank);

    // Check if adjusting threshold is exceeded
    const average = calculateAverage();

    if (buffer.length === 5 && Math.abs(average) >= adjustmentThreshold) {
      const heatExchangerRatio = signValue(await ModBusApi.queryHeatExchangerRatio());
      if (average < 0) {
        const newHeatExchangerRatio = Math.min(heatExchangerRatio + 5, 50);
        if (heatExchangerRatio !== newHeatExchangerRatio) {
          Logger.info(`Heat exchanger ratio increased to ${newHeatExchangerRatio} at ${moment.now()}`);
          await ModBusApi.setHeatExchangerRatio(newHeatExchangerRatio);
        }
      }
      if (average > 0) {
        const newHeatExchangerRatio = Math.max(heatExchangerRatio - 5, 10);
        if (heatExchangerRatio !== newHeatExchangerRatio) {
          Logger.info(`Heat exchanger ratio decreased to ${newHeatExchangerRatio} at ${moment.now()}`);
          await ModBusApi.setHeatExchangerRatio(newHeatExchangerRatio);
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
