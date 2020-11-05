import cron from 'node-cron';
import http from 'http';
import socketIO from 'socket.io';
import config from './utils/config.js';
import app from './app.js';
import ModBusService from './utils/modBusService.js';

const server = http.createServer(app);
const io = socketIO(server);

ModBusService.setSocketIo(io);

io.origins('*:*');

io.on('connection', (socket) => {
  console.log(`New client connected ${socket.client.id}`);
  socket.on('disconnect', () => console.log(`Client disconnected ${socket.client.id}`));
});

cron.schedule('* * * * *', async () => {
  try {
    await ModBusService.queryData();
  } catch (exception) {
    console.error('Query could not be completed:', exception.message);
  }
}, {});

server.listen(config.PORT);
