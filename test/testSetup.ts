import bcryptjs from 'bcryptjs';
import mongoose from 'mongoose';
import { server } from '../src/app';
import User, { UserDocument } from '../src/models/user';
import config from '../src/utils/config';
import Logger from '../src/utils/logger';
import HeatPump from '../src/models/heatPump';
// @ts-ignore
import TestConstants from './testConstants';
import DoneCallback = jest.DoneCallback;

const initTestDatabase = async (): Promise<void> => {
  await mongoose
    .connect(config.MONGODB_URI as string, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .catch((error) => {
      Logger.error(error.message);
    });

  const collectionNames = await Object.keys(mongoose.connection.collections);
  collectionNames.forEach((collectionName: string) => {
    const collection = mongoose.connection.collections[collectionName];
    collection.deleteMany({});
  });
};

const insertTestUser = async (): Promise<UserDocument> => {
  const user: UserDocument = new User({
    username: 'username',
    name: 'User Name',
    passwordHash: await bcryptjs.hash('password', 10),
  });
  return user.save();
};

const insertTestHeatPumpData = async (): Promise<void> => {
  await HeatPump.deleteMany({});
  await HeatPump.insertMany(TestConstants.initialHeatPumpData);
};

const closeTestDatabase = async (done: DoneCallback): Promise<void> => {
  await mongoose.disconnect();
  // Timeout needed
  // https://github.com/facebook/jest/issues/8554
  await server.close(() => {
    setTimeout(done, 100);
  });
};

export default {
  closeTestDatabase, initTestDatabase, insertTestUser, insertTestHeatPumpData,
};
