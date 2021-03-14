import moment from 'moment';
import HeatPump from '../../models/heatPump';

/**
 * Helper function for signing an unsigned 16 bit number.
 * @param value to be signed
 * @return signed number
 */
export const signValue = (value: number): number => {
  let signed = value;
  // Sign 16 bit values
  if (value > 65535 / 2) {
    signed = value - 65536;
  }
  // Place decimal separator to the correct place
  signed /= 10;
  return signed;
};

/**
 * Helper function for cleaning up the database of old entries.
 * Old entries are defined to be entries which exceed the age of 30 days.
 */
export const recordsCleanup = async (): Promise<void> => {
  const now = moment();
  const threshold = now.subtract(30, 'days');
  await HeatPump.deleteMany({ time: { $lt: threshold } });
};

const Helpers = { signValue, recordsCleanup };

export default Helpers;
