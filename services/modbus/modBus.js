import ModBus from 'modbus-serial';
import config from '../../utils/config';

// Connect to the heat pump via ModBus-protocol
const client = new ModBus();
client.connectTCP(config.MODBUS_HOST, { port: config.MODBUS_PORT })
  .then();

export default client;
