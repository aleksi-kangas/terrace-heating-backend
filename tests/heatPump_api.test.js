import supertest from 'supertest';
import mongoose from 'mongoose';
import {
  afterAll, beforeEach, describe, test,
} from '@jest/globals';
import app from '../app.js';
import HeatPump from '../models/heatPump.js';

const api = supertest(app);
const apiUrl = '/api/heat-pump';

const initialEntries = [
  {
    time: new Date('2010-01-13'),
    outsideTemp: 12.1,
    insideTemp: 23.0,
    hotGasTemp: 30.4,
    heatDistCircuitTemp1: 29.2,
    heatDistCircuitTemp2: 23.3,
    heatDistCircuitTemp3: 30.8,
    lowerTankTemp: 44.1,
    upperTankTemp: 51.2,
    groundLoopTempInput: 12.2,
    groundLoopTempOutput: 9.0,
  },
  {
    time: new Date('2010-01-14'),
    outsideTemp: 12.2,
    insideTemp: 23.0,
    hotGasTemp: 30.3,
    heatDistCircuitTemp1: 29.1,
    heatDistCircuitTemp2: 23.4,
    heatDistCircuitTemp3: 30.5,
    lowerTankTemp: 44.1,
    upperTankTemp: 51.1,
    groundLoopTempInput: 12.1,
    groundLoopTempOutput: 9.0,
  },
  {
    time: new Date('2010-01-15'),
    outsideTemp: 6.0,
    insideTemp: 24.0,
    hotGasTemp: 30.0,
    heatDistCircuitTemp1: 31.0,
    heatDistCircuitTemp2: 32.0,
    heatDistCircuitTemp3: 33.0,
    lowerTankTemp: 60.0,
    upperTankTemp: 70.0,
    groundLoopTempInput: 5.0,
    groundLoopTempOutput: 25.0,
  },
];

beforeEach(async () => {
  await HeatPump.deleteMany({});

  // Save initial entries to DB
  const entries = initialEntries.map((entry) => new HeatPump(entry));
  await Promise.all(entries.map((entry) => entry.save()));
});

describe('fetching all heat pump data', () => {
  test('data is returned as JSON', async () => {
    await api
      .get(apiUrl)
      .expect(200)
      .expect('Content-Type', /application\/json/);
  });
  test('correct amount of entries are returned', async () => {
    const result = await api.get(apiUrl);
    expect(result.body.length).toBe(initialEntries.length);
  });
  describe('HeatPump model\'s toJSON function', () => {
    test('data does not include __v field of MongoDB', async () => {
      const result = await api.get(apiUrl);
      result.body.forEach((entry) => {
        // eslint-disable-next-line no-underscore-dangle
        expect(entry.__v).not.toBeDefined();
      });
    });
    test('data includes id field and not _id field', async () => {
      const result = await api.get(apiUrl);
      result.body.forEach((entry) => {
        // eslint-disable-next-line no-underscore-dangle
        expect(entry.id).toBeDefined();
        // eslint-disable-next-line no-underscore-dangle
        expect(entry._id).not.toBeDefined();
      });
    });
  });
});

afterAll(() => {
  mongoose.connection.close();
});
