import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import 'express-async-errors';
import config from './utils/config.js';
import middleware from './utils/middleware.js';

// Routers
import heatPumpRouter from './controllers/heatPump.js';
import loginRouter from './controllers/login.js';

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
app.use(cors());
app.use(express.json());
app.use(middleware.authTokenExtractor);

// Routes
app.use(express.static('build'));
app.use('/api/heat-pump', heatPumpRouter);
app.use('/api/login', loginRouter);

// Middleware
app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

export default app;
