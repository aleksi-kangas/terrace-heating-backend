import moment from 'moment';
import HeatPump from '../../models/heatPump';

/**
 * Helper function for signing an unsigned 16 bit number.
 * @param value to be signed
 * @return signed number
 */
// eslint-disable-next-line no-bitwise
export const signValue = (value: number): number => ((value << 16) >> 16) / 10;

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
