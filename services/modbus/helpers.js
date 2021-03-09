import moment from 'moment';
import HeatPump from '../../models/heatPump';

/**
 * Helper function for signing an unsigned 16 bit number.
 * @param value - number to be signed
 * @return {number} - the signed representation of the input value
 */
export const signValue = (value) => {
  let signed = value;
  // Sign 16 bit values
  if (value > 65535 / 2) {
    signed = value - 65536;
  }
  // Place decimal separator to the correct place
  signed /= 10;
  return signed;
};

export const recordsCleanup = async () => {
  const now = moment();
  const threshold = now.subtract(30, 'days');
  await HeatPump.deleteMany({ time: { $lt: threshold } });
};

const Helpers = { signValue, recordsCleanup };

export default Helpers;
