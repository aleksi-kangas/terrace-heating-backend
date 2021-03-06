import dotenv from 'dotenv';

// Load .env file contents to process.env
dotenv.config();

let { MONGODB_URI } = process.env;

if (process.env.NODE_ENV === 'development') {
  MONGODB_URI = process.env.DEV_MONGODB_URI;
}

if (process.env.NODE_ENV === 'test') {
  MONGODB_URI = process.env.TEST_MONGODB_URI;
}

const config = {
  MONGODB_URI,
  PORT: process.env.PORT,
  MODBUS_HOST: process.env.MODBUS_HOST,
  MODBUS_PORT: process.env.MODBUS_PORT,
  SESSIONS: process.env.SESSIONS,
};

export default config;
