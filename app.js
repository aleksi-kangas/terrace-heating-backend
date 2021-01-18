import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'express-async-errors';
import config from './utils/config.js';
import { errorHandler, unknownEndpoint } from './utils/middleware.js';

// Routers
import heatPumpRouter from './controllers/heatPump.js';
import loginRouter from './controllers/login.js';
// import userRouter from './controllers/users.js';

const app = express();

// Connect to MongoDB database
mongoose
  .connect(config.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .catch((e) => {
    console.error(e.message);
  });

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
// app.use('/api/users', userRouter);

// Middleware
app.use(unknownEndpoint);
app.use(errorHandler);

export default app;
