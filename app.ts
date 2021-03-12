import * as express from 'express';
import * as mongoose from 'mongoose';
import * as cron from 'node-cron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as session from 'express-session';
import * as ConnectMongo from 'connect-mongo';
import { Server, Socket } from 'socket.io';
import * as SharedSession from 'express-socket.io-session';
import { createServer } from 'http';
import * as cors from 'cors';
import * as cookieParser from 'cookie-parser';
import 'express-async-errors';
import { errorHandler, unknownEndpoint } from './utils/middleware';
import config from './utils/config';
import ModBusApi from './services/modbus/api';
import User from './models/user';
import { recordsCleanup } from './services/modbus/helpers';

// Routers
import heatPumpRouter from './routes/heatPump';
import authRouter from './routes/auth';
// import userRouter from './routes/users';

// Connect to MongoDB database
mongoose
  .connect(config.MONGODB_URI as string, {
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
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser(config.SESSIONS));

// Store for sessions
const MongoStore = ConnectMongo(session);
const sessionStore = new MongoStore({
  mongooseConnection: connection,
  collection: 'sessions',
});

declare module 'express-session' {
  export interface SessionData {
    user: { [key: string]: never };
  }
}

// Middleware for sessions
const sessionMiddleware = session({
  secret: config.SESSIONS as string,
  resave: false,
  saveUninitialized: true,
  store: sessionStore,
  cookie: {
    maxAge: 1000 * 60 * 60,
    httpOnly: true,
  },
});

app.use(sessionMiddleware);

// Routes
app.use('/api/heat-pump', heatPumpRouter);
app.use('/api/auth', authRouter);
// app.use('/api/users', userRouter);

// eslint-disable-next-line no-underscore-dangle
// const __dirname = fileURLToPath(import.meta.url);
// TODO
// app.use(express.static(path.join(__dirname, '../build')));
app.use(express.static('./build'));
app.get('*', (_request, response) => {
  response.sendFile(path.join(__dirname, '../build/index.html'));
});

// Middleware
app.use(unknownEndpoint);
app.use(errorHandler);

const httpServer = createServer(app);

/*
The following contains logic for WebSocket communication via Socket.io.
WebSockets allow server to send clients the queried heat-pump data in semi-real-time.
 */

const io: Server = new Server(httpServer, { cors: { origin: '*' } });
// Use session authentication for WebSocket connection
io.use(SharedSession(sessionMiddleware, { autoSave: true }));

// Types for handshakes and sessions

let clients: Socket[] = [];

io.on('connection', (socket) => {
  // Authorize client connection
  socket.on('login', async () => {
    if (socket.handshake.session.user) {
      clients.push(socket);
      console.log(`New client ${socket.id} connected`);
      const userObject = await User.findById(socket.handshake.session.user);
      socket.emit('authenticated', {
        id: userObject.id,
        username: userObject.username,
        name: userObject.name,
      });
    }
  });
  // Remove client connection upon disconnect
  socket.on('disconnect', () => {
    clients = clients.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client) => (<any>client.client).id !== socket.client.id,
    );
    console.log(`Client ${socket.client.id} disconnected`);
  });
});

/**
 * Cronjob for querying heat-pump values each minute.
 * Queried values are saved to the database and sent to connected clients via WebSocket connection.
 */
cron.schedule('* * * * *', async () => {
  try {
    const queriedData = await ModBusApi.queryHeatPumpValues();
    clients.forEach((client) => client.emit('heatPumpData', queriedData));
    console.log(`Query complete. ${queriedData.time}`);
    await recordsCleanup();
  } catch (exception) {
    console.error('Query could not be completed:', exception.message);
  }
}, {});

httpServer.listen(config.PORT);
