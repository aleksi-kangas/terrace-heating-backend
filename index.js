import cron from 'node-cron';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import mongoose from 'mongoose';
import User from './models/user';
import config from './utils/config';
import app from './app';
import ModBusService from './utils/modBus';

const httpServer = createServer(app);

// Connect to MongoDB database
mongoose
  .connect(config.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .catch((e) => {
    console.error(e.message);
  });

const io = new Server(httpServer);

let clients = [];

io.on('connection', (socket) => {
  const cookieToken = socket.request.headers.cookie;
  if (cookieToken) {
    const token = cookieToken.substr(6);
    jwt.verify(token, process.env.JWT, async (error, decodedToken) => {
      if (error) {
        return new Error('Authentication error');
      }
      const user = await User.findById(decodedToken.id);
      if (!user) {
        return new Error('Authentication error');
      }
      console.log(`New client connected ${socket.client.id}`);
      socket.emit('auth', {
        id: user.id,
        username: user.username,
        name: user.name,
      });
      return clients.push(socket);
    });
  }
  socket.on('disconnect', () => {
    clients = clients.filter((client) => client.client.id !== socket.client.id);
    console.log(`Client disconnected ${socket.client.id}`);
  });
});

/**
 * A cron-job for querying the data from the heat pump each minute.
 */

cron.schedule('* * * * *', async () => {
  try {
    const queriedData = await ModBusService.queryHeatPumpValues();
    clients.forEach((client) => client.emit('heatPumpData', queriedData));
    console.log(`Query complete. ${queriedData.time}`);
  } catch (exception) {
    console.error('Query could not be completed:', exception.message);
  }
}, {});

httpServer.listen(config.PORT);
