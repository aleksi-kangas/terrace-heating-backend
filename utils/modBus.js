import ModBus from 'modbus-serial';
import config from './config.js';
import HeatPump from '../models/heatPump.js';

/**
 * Contains logic for communicating with the heat pump via ModBus-protocol.
 * Defined functions can be modified to achieve desired functionality.
 */

/**
 * Helper function for signing an unsigned 16 bit number.
 * @param value - number to be signed
 * @return {number} - the signed representation of the input value
 */
const signUnsignedValues = (value) => {
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
 * Parses and signs predetermined heat pump data from a ModBus query result.
 * @return {Object} - contains predetermined signed heat pump data
 */
const parseModBusQuery = (data) => ({
  time: new Date(),
  outsideTemp: signUnsignedValues(data[0]),
  hotGasTemp: signUnsignedValues(data[1]),
  heatDistCircuitTemp1: signUnsignedValues(data[4]),
  heatDistCircuitTemp2: signUnsignedValues(data[5]),
  lowerTankTemp: signUnsignedValues(data[16]),
  upperTankTemp: signUnsignedValues(data[17]),
  insideTemp: signUnsignedValues(data[73]),
  groundLoopTempOutput: signUnsignedValues(data[97]),
  groundLoopTempInput: signUnsignedValues(data[98]),
  heatDistCircuitTemp3: signUnsignedValues(data[116]),
});

// Connect to the heat pump via ModBus-protocol
const client = new ModBus();
client.connectTCP(config.MODBUS_HOST, { port: config.MODBUS_PORT })
  .then();

/**
 * Queries predetermined registers from the heat pump and saves the queried data to MongoDB.
 * @return {Object} - contains saved data
 */
const queryHeatPumpValues = async () => {
  const values = await client.readHoldingRegisters(1, 120);
  const parsedData = parseModBusQuery(values.data);
  const heatPumpData = new HeatPump(parsedData);
  return heatPumpData.save();
};

/**
 * Queries the number of active heat distribution circuits from the heat pump.
 * Reasonable return values are 2 and 3.
 * @return {Object} - number of active heat distribution circuits (usually 2 or 3)
 */
const queryNumberOfActiveCircuits = async () => {
  const activeCircuits = await client.readHoldingRegisters(5100, 1);
  return activeCircuits.data[0];
};

/**
 * Activates/de-activates the third heat distribution circuit of the heat pump.
 * Activation/de-activation is determined by the current state of the heat distribution circuits.
 * Either from 2 -> 3 or 3 -> 2.
 */
const toggleCircuitThree = async () => {
  const activeCircuits = await queryNumberOfActiveCircuits();
  const value = activeCircuits === 3 ? 2 : 3;
  await client.writeRegister(5100, value);
};

export default {
  queryHeatPumpValues, queryNumberOfActiveCircuits, toggleCircuitThree,
};
