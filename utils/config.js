import dotenv from 'dotenv';

// Load .env file contents to process.env
dotenv.config();

const config = {
  MONGODB_URI: process.env.MONGODB_URI,
  PORT: process.env.PORT,
};

export default config;
