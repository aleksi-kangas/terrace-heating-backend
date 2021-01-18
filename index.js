import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import WebSocket from 'ws';
import { createServer } from 'http';
import config from './utils/config.js';
import app from './app.js';
import ModBusService from './utils/modBus.js';

const httpServer = createServer(app);

const webSocketServer = new WebSocket.Server({ server: httpServer });

let clients = [];

webSocketServer.on('connection', (webSocket) => {
  // eslint-disable-next-line no-param-reassign
  webSocket.id = uuidv4();
  console.log(`New client ${webSocket.id} connected`);
  clients.push(webSocket);

  // TODO Fix client disconnecting
  webSocket.on('disconnect', () => {
    console.log(`Client ${webSocket.id} disconnected`);
    clients = clients.filter((client) => client.id !== webSocket.id);
  });
});

/**
 * A cron-job for querying the data from the heat pump each minute.
 */

cron.schedule('* * * * *', async () => {
  try {
    const queriedData = await ModBusService.queryHeatPumpValues();
    clients.forEach((client) => client.send(JSON.stringify(queriedData)));
    console.log(`Query complete. ${queriedData.time}`);
  } catch (exception) {
    console.error('Query could not be completed:', exception.message);
  }
}, {});

httpServer.listen(config.PORT);
