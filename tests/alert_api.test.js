/* eslint no-underscore-dangle: 0 */
import supertest from 'supertest';
import mongoose from 'mongoose';
import {
  afterAll, beforeEach, describe, test,
} from '@jest/globals';
import app from '../app.js';
import Alert from '../models/alert.js';
import User from '../models/user.js';

const api = supertest(app);
const apiUrl = '/api/alerts';

const initialAlerts = [
  {
    variable: 'outsideTemp',
    lowerLimit: 0,
    upperLimit: 100.0,
    triggered: false,
    timeStamp: null,
  },
  {
    variable: 'insideTemp',
    lowerLimit: 20,
    upperLimit: 30.0,
    triggered: true,
    timeStamp: new Date(),
  },
];

const initialUser = {
  username: 'username',
  name: 'User Name',
  passwordHash: 'hash123456789',
};

let user;

beforeEach(async () => {
  await Alert.deleteMany({});
  await User.deleteMany({});

  // Save user to DB
  user = await new User(initialUser).save();

  // Save initial alerts to DB
  const alerts = initialAlerts.map((alert) => new Alert({ user: user.id, ...alert }));
  await Promise.all(alerts.map((entry) => entry.save()));
});

describe('fetching all alerts of the user', () => {
  test('alerts are returned as JSON', async () => {
    await api
      .get(`${apiUrl}/${user.id}`)
      .expect(200)
      .expect('Content-Type', /application\/json/);
  });
  test('correct amount of alerts are returned', async () => {
    const result = await api.get(`${apiUrl}/${user.id}`);
    expect(result.body.length).toBe(initialAlerts.length);
  });
  test('one alert is triggered', async () => {
    const result = await api.get(`${apiUrl}/${user.id}`);
    let amountTriggered = 0;
    result.body.forEach((alert) => {
      if (alert.triggered) amountTriggered += 1;
    });
    expect(amountTriggered).toBe(1);
  });
  describe('alert\'s toJSON function', () => {
    test('alert does not include __v field of MongoDB', async () => {
      const result = await api.get(`${apiUrl}/${user.id}`);
      result.body.forEach((alert) => {
        expect(alert.__v).not.toBeDefined();
      });
    });
    test('alert includes id field and not _id field', async () => {
      const result = await api.get(`${apiUrl}/${user.id}`);
      result.body.forEach((alert) => {
        expect(alert.id).toBeDefined();
        expect(alert._id).not.toBeDefined();
      });
    });
  });
});

afterAll(() => {
  mongoose.connection.close();
});
