import cron from 'node-cron';
import { createServer } from 'http';
import { Server } from 'socket.io';
import config from './utils/config.js';
import app from './app.js';
import ModBusService from './utils/modBus.js';

const httpServer = createServer(app);
const io = new Server(httpServer);

io.on('connection', (socket) => {
  console.log(`New client connected ${socket.client.id}`);
  socket.on('disconnect', () => console.log(`Client disconnected ${socket.client.id}`));
});

/**
 * A cron-job for querying the data from the heat pump each minute.
 */
cron.schedule('* * * * *', async () => {
  try {
    const queriedData = await ModBusService.queryHeatPumpValues();
    io.emit('heatPumpData', queriedData);
    console.log(`Query complete. ${queriedData.time}`);
  } catch (exception) {
    console.error('Query could not be completed:', exception.message);
  }
}, {});

httpServer.listen(config.PORT);
