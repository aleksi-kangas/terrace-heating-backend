import ModBus from 'modbus-serial';
import config from '../../utils/config';

// Connect to the heat pump via ModBus-protocol
const client = new ModBus();
if (process.env.NODE_ENV !== 'test') {
  client.connectTCP(config.MODBUS_HOST as string, { port: Number(config.MODBUS_PORT) })
    .then();
}

export default client;
