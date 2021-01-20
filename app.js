import express from 'express';
import mongoose from 'mongoose';
import cron from 'node-cron';
import session from 'express-session';
import ConnectMongo from 'connect-mongo';
import SharedSession from 'express-socket.io-session';
import { Server } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'express-async-errors';
import { errorHandler, unknownEndpoint } from './utils/middleware';
import config from './utils/config';
import ModBusService from './utils/modBus';
import User from './models/user';

// Routers
import heatPumpRouter from './controllers/heatPump';
import loginRouter from './controllers/login';
import logoutRouter from './controllers/logout';
import sessionRouter from './controllers/session';
// import userRouter from './controllers/users.js';

const MongoStore = new ConnectMongo(session);

// Connect to MongoDB database
mongoose
  .connect(config.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .catch((error) => {
    console.error(error.message);
  });
const { connection } = mongoose;

const app = express();

// Middleware
app.use(cors({
  origin: [`${process.env.FRONTEND_URL}`],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const sessionStore = new MongoStore({
  mongooseConnection: connection,
  collection: 'sessions',
});

const sessionMiddleware = session({
  secret: process.env.SESSIONS,
  resave: false,
  saveUninitialized: true,
  store: sessionStore,
  cookie: {
    maxAge: 1000 * 60 * 60,
  },
});

app.use(sessionMiddleware);

// Routes
app.use(express.static('build'));
app.use('/api/heat-pump', heatPumpRouter);
app.use('/api/login', loginRouter);
app.use('/api/logout', logoutRouter);
app.use('/api/session', sessionRouter);
// app.use('/api/users', userRouter);

// Middleware
app.use(unknownEndpoint);
app.use(errorHandler);

const httpServer = createServer(app);

const io = new Server(httpServer);
/*
const cookieParse = cookieParser();

io.use((socket, next) => {
  cookieParse(socket.client.request, socket.request.res, next);
})

 */

/*
io.use((socket, next) => {
  socket.client.request.originalUrl = socket.client.request.url;
  sessionMiddleware(socket.client.request, socket.client.request.res, next);
});

 */
io.use(SharedSession(sessionMiddleware));

let clients = [];

io.on('connection', (socket) => {
  socket.on('login', async () => {
    if (socket.handshake.session.loggedIn) {
      clients.push(socket);
      console.log(`New client ${socket.client.id} connected`);
      const user = await User.findById(socket.handshake.session.userId);
      socket.emit('authenticated', {
        id: user.id,
        username: user.username,
        name: user.name,
      });
    }
  });

  socket.on('logout', () => {
    console.log('logout');
    clients = clients.filter(
      (client) => client.handshake.session.userId !== socket.handshake.session.userId,
    );
    console.log(`Client ${socket.client.id} disconnected`);
  });

  socket.on('disconnect', () => {
    clients = clients.filter(
      (client) => client.handshake.session.userId !== socket.handshake.session.userId,
    );
    console.log(`Client ${socket.client.id} disconnected`);
  });
});

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
