import net from 'net';
import ModBus from 'jsmodbus';
import HeatPump from '../models/heatPump.js';
import config from './config.js';

class ModBusModifyService {
  constructor() {
    this.socket = new net.Socket();
    this.client = new ModBus.client.TCP(this.socket);
    this.socket.on('connect', async () => {
      const latestEntry = await HeatPump.find().sort({ _id: -1 }).limit(1);
      const isActive = latestEntry[0].activeHeatDistCircuits === 3;
      const value = isActive ? 2 : 3;
      this.client.writeSingleRegister(5100, value)
        .then(() => {
          console.log(`Circuit 3 ${value === 3 ? 'is now active' : 'is now stopped'}`);
          this.socket.end();
        })
        .catch((error) => {
          console.error(error);
        });
    });
    this.socket.on('error', console.error);
  }

  toggleHeatDistCircuit3() {
    console.log(`${this.client.unitId} called`);
    this.socket.connect({
      host: config.MODBUS_HOST,
      port: config.MODBUS_PORT,
    });
  }
}

export default ModBusModifyService;
