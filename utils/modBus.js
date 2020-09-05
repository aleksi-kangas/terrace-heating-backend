import ModBus from 'jsmodbus';
import net from 'net';
import config from './config.js';
import HeatPump from '../models/heatPump.js';

/**
 * Helper function for signing an unsigned number.
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

/**
 * Exports a class representing ModBusService,
 * that enables communication to the heat pump via ModBus protocol.
 *
 * @constructor
 * @param io - reference to a socket.io object
 */
export default (io) => class ModBusService {
  constructor() {
    this.io = io;
    this.socket = new net.Socket();
    this.client = new ModBus.client.TCP(this.socket);
    this.socket.on('connect', async () => {
      try {
        const res = await this.client.readHoldingRegisters(1, 120);
        // eslint-disable-next-line no-underscore-dangle
        const data = res.response._body._valuesAsArray;
        // Parse queried data and save it to MongoDB
        const parsedData = parseModBusQuery(data);
        const heatPumpData = new HeatPump(parsedData);
        const savedData = await heatPumpData.save();
        this.io.emit('heatPumpData', savedData);
        console.log(`Query complete. ${savedData.time}`);
        this.socket.end();
      } catch (exception) {
        const timeStampData = { time: new Date() };
        const heatPumpData = new HeatPump(timeStampData);
        const savedData = await heatPumpData.save();
        this.io.emit('heatPumpData', savedData);
        console.log(`Query could not be finished. Empty timestamp saved. ${savedData.time}`);
        this.socket.end();
      }
    });
    this.socket.on('error', console.error);
  }

  /**
   * Responsible for establishing a connection to the heat pump via ModBus protocol.
   * Queries predetermined registers and signs the numerical data.
   * @method queryModBus
   */
  queryModBus() {
    this.socket.connect({
      host: config.MODBUS_HOST,
      port: config.MODBUS_PORT,
    });
  }
};
