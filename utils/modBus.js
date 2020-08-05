import ModBus from 'jsmodbus';
import net from 'net';
import lodash from 'lodash';
import config from './config';
import HeatPump from '../models/heatPump';

const socket = new net.Socket();
const client = new ModBus.client.TCP(socket);

/**
 * Helper function for signing an unsigned number.
 * @param value number to be signed
 * @return {number} signed value
 */
const signUnsignedValues = (value) => {
  let signed = value;
  // Sign 256 bit values
  if (value > 65535 / 2) {
    signed = value - 65536;
  }
  // Place decimal separator to the correct place
  signed /= 10;
  return signed;
};

/**
 *
 */
const parseModBusQuery = (data) => {
  const signedData = lodash.map(data, signUnsignedValues);
  return {
    time: new Date(),
    outsideTemp: signedData[0],
    hotGasTemp: signedData[1],
    heatDistCircuitTemp1: signedData[4],
    heatDistCircuitTemp2: signedData[5],
    lowerTankTemp: signedData[16],
    upperTankTemp: signedData[17],
    insideTemp: signedData[73],
    groundLoopTempOutput: signedData[97],
    groundLoopTempInput: signedData[98],
    heatDistCircuitTemp3: signedData[116],
  };
};

socket.on('connect', async () => {
  const res = await client.readHoldingRegisters(1, 120);
  // eslint-disable-next-line no-underscore-dangle
  const data = res.response._body.valuesArray;
  socket.end();
  /* Parse queried data and save it to MongoDB */
  const parsedData = parseModBusQuery(data);
  const heatPumpData = new HeatPump(parsedData);
  await heatPumpData.save();
});

const queryModBus = async () => {
  await socket.connect({
    host: config.MODBUS_HOST,
    port: config.MODBUS_PORT,
  });
};

export default queryModBus;
