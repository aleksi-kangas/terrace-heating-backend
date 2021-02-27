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

const Helpers = { signValue };

export default Helpers;
