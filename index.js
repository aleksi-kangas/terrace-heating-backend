import cron from 'node-cron';
import http from 'http';
import socketIO from 'socket.io';
import config from './utils/config.js';
import app from './app.js';
import ModBusQueryService from './utils/modBusQueryService.js';

const server = http.createServer(app);
const io = socketIO(server);

const modBusQueryService = new ModBusQueryService(io);

io.origins('*:*');

io.on('connection', (socket) => {
  console.log(`New client connected ${socket.client.id}`);
  socket.on('disconnect', () => console.log(`Client disconnected ${socket.client.id}`));
});

cron.schedule('* * * * *', async () => {
  try {
    await modBusQueryService.queryData();
  } catch (exception) {
    console.error('Query could not be completed:', exception.message);
  }
}, {});

server.listen(config.PORT);
