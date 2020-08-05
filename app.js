import express from 'express';
import mongoose from 'mongoose';
import config from './utils/config';
// Routers
import heatPumpRouter from './controllers/heatPump';

const app = express();

// Connect to MongoDB database
mongoose
  .connect(config.MONGODB_URI)
  .catch((e) => {
    console.error(e.message);
  });

// Middleware
app.use(express.json());

// Routes
app.use('/api/heat-pump', heatPumpRouter);

export default app;
