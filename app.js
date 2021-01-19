import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'express-async-errors';
import { errorHandler, unknownEndpoint } from './utils/middleware.js';

// Routers
import heatPumpRouter from './controllers/heatPump.js';
import loginRouter from './controllers/login.js';
import logoutRouter from './controllers/logout.js';
// import userRouter from './controllers/users.js';

const app = express();

// Middleware
app.use(cors({
  origin: [`${process.env.FRONTEND_URL}`],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Routes
app.use(express.static('build'));
app.use('/api/heat-pump', heatPumpRouter);
app.use('/api/login', loginRouter);
app.use('/api/logout', logoutRouter);
// app.use('/api/users', userRouter);

// Middleware
app.use(unknownEndpoint);
app.use(errorHandler);

export default app;
