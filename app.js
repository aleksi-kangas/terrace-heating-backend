import express from 'express';
import mongoose from 'mongoose';
import config from './utils/config.js';
import middleware from './utils/middleware.js';
// Routers
import heatPumpRouter from './controllers/heatPump.js';

const app = express();

// Connect to MongoDB database
mongoose
  .connect(config.MONGODB_URI, {
    useNewUrlParser: true,
  })
  .catch((e) => {
    console.error(e.message);
  });

// Middleware
app.use(express.json());
app.use(middleware.errorHandler());

// Routes
app.use('/api/heat-pump', heatPumpRouter);

export default app;