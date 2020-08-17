import ModBus from 'jsmodbus';
import net from 'net';
import config from './config.js';
import HeatPump from '../models/heatPump.js';

const socket = new net.Socket();
const client = new ModBus.client.TCP(socket);

/**
 * Helper function for signing an unsigned number.
 * @param value number to be signed
 * @return {number} signed value
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
 * @return {Object} contains predetermined signed heat pump data
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

socket.on('connect', async () => {
  const res = await client.readHoldingRegisters(1, 120);
  // eslint-disable-next-line no-underscore-dangle
  const data = res.response._body._valuesAsArray;
  socket.end();
  // Parse queried data and save it to MongoDB
  const parsedData = parseModBusQuery(data);
  const heatPumpData = new HeatPump(parsedData);
  await heatPumpData.save();
  return data;
});

const queryModBus = async () => {
  await socket.connect({
    host: config.MODBUS_HOST,
    port: config.MODBUS_PORT,
  });
};

export default queryModBus;
