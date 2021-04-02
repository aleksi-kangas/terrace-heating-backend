import HeatPump from '../../models/heatPump';

export const automatedTankLimitAdjust = async (): Promise<void> => {
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

    // Adjusting is not needed when temperature change is not positive
    if (lowerTankTempDelta <= 0 || upperTankTempDelta <= 0) return;

    // Estimated minutes left until temperature reaches upper limit
    const estMinutesTillUpperLimit = {
      lowerTank: Math.round(
        ((thisEntry.lowerTankUpperLimit - thisEntry.lowerTankTemp) / lowerTankTempDelta + Number.EPSILON) * 100,
      ) / 100,
      upperTank: Math.round(
        ((thisEntry.upperTankUpperLimit - thisEntry.upperTankTemp) / upperTankTempDelta + Number.EPSILON) * 100,
      ) / 100,
    };

    console.log('Estimated time remaining for Lower: ', estMinutesTillUpperLimit.lowerTank);
    console.log('Estimated time remaining for Upper: ', estMinutesTillUpperLimit.upperTank);

    // TODO Adjustment and thresholds
    if (estMinutesTillUpperLimit.lowerTank < estMinutesTillUpperLimit.upperTank) {
      console.log('Lower Tank line should be lowered');
    }
    if (estMinutesTillUpperLimit.upperTank < estMinutesTillUpperLimit.lowerTank) {
      console.log('Upper Tank line should be lowered');
    }
  }
};

export default {
  automatedTankLimitAdjust,
};
