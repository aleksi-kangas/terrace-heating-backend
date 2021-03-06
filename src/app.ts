import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cron from 'node-cron';
import path from 'path';
import session, { Session, SessionData } from 'express-session';
import MongoStore from 'connect-mongo';
import { Server, Socket } from 'socket.io';
import SharedSession from 'express-socket.io-session';
import { createServer } from 'http';
import cors from 'cors';
import 'express-async-errors';
import { errorHandler, unknownEndpoint } from './utils/middleware';
import config from './utils/config';
import ModBusApi from './services/modbus/api';
import User from './models/user';
import { recordsCleanup } from './services/modbus/helpers';
import { automatedHeatExchangerRatio } from './services/modbus/automation';
import Logger from './utils/logger';

/*
Routers
 */
import heatPumpRouter from './routes/heatPump';
import authRouter from './routes/auth';
// import userRouter from './routes/users';

/*
MongoDB
 */
mongoose.set('useCreateIndex', true);

mongoose
  .connect(config.MONGODB_URI as string, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .catch((error) => {
    Logger.error(error.message);
  });

const app = express();

/*
Middleware
 */
app.use(cors({
  credentials: true,
}));
app.use(express.json());

let sessionMiddleware;

if (process.env.NODE_ENV === 'test') {
  sessionMiddleware = session({
    secret: config.SESSIONS as string,
    resave: false,
    saveUninitialized: false,
  });
} else {
  sessionMiddleware = session({
    secret: config.SESSIONS as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60,
      httpOnly: true,
    },
    store: MongoStore.create({
      mongoUrl: config.MONGODB_URI,
      dbName: 'sessions',
      stringify: false,
    }),
  });
}

app.use(sessionMiddleware);

/*
Routes
 */
app.use('/api/heat-pump', heatPumpRouter);
app.use('/api/auth', authRouter);
// app.use('/api/users', userRouter);

// Serve static files of the frontend
app.use(express.static('./build'));
app.get('*', (_request: Request, response: Response) => {
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
declare module 'express-session' {
  export interface SessionData {
    user: { [key: string]: never };
  }
}

declare module 'socket.io/dist/socket' {
  export interface Handshake {
    session?: Session & Partial<SessionData>,
  }
}

let clients: Socket[] = [];

io.on('connection', (socket: Socket) => {
  // Authorize client connection
  socket.on('login', async () => {
    if (socket.handshake.session?.user) {
      clients.push(socket);
      const userObject = await User.findById(socket.handshake.session.user);
      socket.emit('authenticated', {
        id: userObject?.id,
        username: userObject?.username,
        name: userObject?.name,
      });
    }
  });
  // Remove client connection upon disconnect
  socket.on('disconnect', () => {
    clients = clients.filter(
      // Using bracket notation to access private property of client
      // Other option would be (<any>client.client).id but that's not type safe
      // eslint-disable-next-line dot-notation
      (client: Socket) => client.client['id'] !== socket.client['id'],
    );
  });
});

/*
 * Cronjob for querying heat-pump values each minute.
 * Queried values are saved to the database and sent to connected clients via WebSocket connection.
 */
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('* * * * *', async () => {
    try {
      // Query heat-pump data
      const queriedData = await ModBusApi.queryHeatPumpValues();
      clients.forEach((client: Socket) => client.emit('heatPumpData', queriedData));
      // Adjust heat exchanger ratio automatically
      if (queriedData.compressorRunning) await automatedHeatExchangerRatio();
      // Clean-up
      await recordsCleanup();
    } catch (exception) {
      Logger.error(exception.message);
    }
  },
  {});
}

export const server = httpServer.listen(config.PORT);

export default app;
