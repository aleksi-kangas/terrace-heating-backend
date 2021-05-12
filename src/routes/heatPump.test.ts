/* eslint-disable  @typescript-eslint/no-explicit-any, import/no-extraneous-dependencies */
import supertest from 'supertest';
// @ts-ignore
import session from 'supertest-session';
import moment from 'moment';
import app from '../app';
import TestSetup from '../test/testSetup';
import TestConstants from '../test/testConstants';
import HeatPumpService from '../services/heatPumpService';
import ModBusApi from '../services/modbus/api';
import { HeatingStatus } from '../types';
import DoneCallback = jest.DoneCallback;

const api = supertest(app);
const testSession = session(app);
let authenticatedAPI: any;

beforeAll(async () => {
  await TestSetup.initTestDatabase();
  await TestSetup.insertTestUser();

  testSession
    .post('/api/auth/login/')
    .send({
      username: TestConstants.initialUser.username,
      password: TestConstants.initialUser.password,
    })
    .then(() => {
      authenticatedAPI = testSession;
    });
});

beforeEach(async () => {
  await TestSetup.insertTestHeatPumpData();
});

afterAll(async (done: DoneCallback) => {
  await TestSetup.closeTestDatabase(done);
});

describe('Unauthorized access', () => {
  it('/ GET request should fail', async () => {
    await api
      .get('/api/heat-pump/')
      .expect(401);
  });
});

describe('Authorized access', () => {
  describe('/', () => {
    it('GET / request should succeed', async () => {
      await authenticatedAPI
        .get('/api/heat-pump/')
        .expect(200);
    });

    it('GET / should returns json', async () => {
      await authenticatedAPI
        .get('/api/heat-pump/')
        .expect('Content-Type', /application\/json/);
    });

    it('GET / request returns all data if date is not given', async () => {
      const result = await authenticatedAPI
        .get('/api/heat-pump/')
        .expect(200);

      expect(result.body).toHaveLength(3);
    });

    it('GET / request returns data after the given date threshold', async () => {
      const now = moment();
      now.subtract(2, 'days');
      const result = await authenticatedAPI
        .get('/api/heat-pump/')
        .query({
          year: now.year(),
          month: `0${now.month() + 1}`,
          day: now.date(),
        })
        .expect(200);

      expect(result.body).toHaveLength(2);
    });
  });

  describe('/status', () => {
    it('GET /status should return heat-pump status', async () => {
      const expectedResult = HeatingStatus.Running;

      HeatPumpService.getStatus = jest.fn()
        .mockResolvedValue(HeatingStatus.Running);

      const result = await authenticatedAPI
        .get('/api/heat-pump/status/')
        .expect('Content-Type', /application\/json/);

      expect(result.body)
        .toEqual(expectedResult);
    });
  });

  describe('/start', () => {
    it('POST /start with soft-start should soft-start circuit three and return soft-start status', async () => {
      ModBusApi.startCircuitThree = jest.fn();
      HeatPumpService.getStatus = jest.fn()
        .mockResolvedValue(HeatingStatus.SoftStart);

      const softStartSpy = jest.spyOn(HeatPumpService, 'softStartCircuitThree');
      softStartSpy.mockImplementation(() => ModBusApi.startCircuitThree());

      const expectedResult = HeatingStatus.SoftStart;

      const result = await authenticatedAPI
        .post('/api/heat-pump/start/')
        .send({ softStart: true })
        .expect(200);

      expect(result.body)
        .toEqual(expectedResult);
      expect(ModBusApi.startCircuitThree)
        .toHaveBeenCalled();
    });

    it('POST /start without soft-start should start circuit three and return running status', async () => {
      ModBusApi.startCircuitThree = jest.fn();
      ModBusApi.enableScheduling = jest.fn();
      HeatPumpService.getStatus = jest.fn()
        .mockResolvedValue(HeatingStatus.Running);

      const expectedResult = HeatingStatus.Running;

      const result = await authenticatedAPI
        .post('/api/heat-pump/start/')
        .send({ softStart: false })
        .expect(200);

      expect(result.body)
        .toEqual(expectedResult);
      expect(ModBusApi.startCircuitThree)
        .toHaveBeenCalled();
      expect(ModBusApi.enableScheduling)
        .toHaveBeenCalled();
    });
  });

  describe('/stop', () => {
    it('POST /stop should stop circuit three and return stopped status', async () => {
      ModBusApi.stopCircuitThree = jest.fn();
      ModBusApi.disableScheduling = jest.fn();
      HeatPumpService.getStatus = jest.fn()
        .mockResolvedValue(HeatingStatus.Stopped);

      const expectedResult = HeatingStatus.Stopped;

      const result = await authenticatedAPI
        .post('/api/heat-pump/stop/')
        .expect(200);

      expect(result.body)
        .toEqual(expectedResult);
      expect(ModBusApi.stopCircuitThree)
        .toHaveBeenCalled();
      expect(ModBusApi.disableScheduling)
        .toHaveBeenCalled();
    });
  });

  describe('/scheduling', () => {
    it('GET /scheduling should return scheduling status', async () => {
      ModBusApi.querySchedulingStatus = jest.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const firstResult = await authenticatedAPI
        .get('/api/heat-pump/scheduling/')
        .expect(200);

      const secondResult = await authenticatedAPI
        .get('/api/heat-pump/scheduling/')
        .expect(200);

      expect(firstResult.body)
        .toEqual(true);
      expect(secondResult.body)
        .toEqual(false);
      expect(ModBusApi.querySchedulingStatus)
        .toHaveBeenCalledTimes(2);
    });

    it('POST /scheduling fails without schedulingEnabled in body', async () => {
      const expectedResult = JSON.parse(
        JSON.stringify({ error: 'Property schedulingEnabled is missing from the request body' }),
      );

      const result = await authenticatedAPI
        .post('/api/heat-pump/scheduling/')
        .expect(400);

      expect(result.body)
        .toEqual(expectedResult);
    });

    it('POST /scheduling with schedulingEnabled being true should call setSchedulingEnabled with true', async () => {
      HeatPumpService.setSchedulingEnabled = jest.fn()
        .mockResolvedValue(HeatingStatus.Boosting);

      const expectedResult = HeatingStatus.Boosting;

      const result = await authenticatedAPI
        .post('/api/heat-pump/scheduling/')
        .send({ schedulingEnabled: true })
        .expect(200);

      expect(HeatPumpService.setSchedulingEnabled)
        .toHaveBeenCalledWith(true);
      expect(result.body)
        .toEqual(expectedResult);
    });

    it('POST /scheduling with schedulingEnabled being false should call setSchedulingEnabled with false', async () => {
      HeatPumpService.setSchedulingEnabled = jest.fn()
        .mockResolvedValue(HeatingStatus.Running);

      const expectedResult = HeatingStatus.Running;

      const result = await authenticatedAPI
        .post('/api/heat-pump/scheduling/')
        .send({ schedulingEnabled: false })
        .expect(200);

      expect(HeatPumpService.setSchedulingEnabled)
        .toHaveBeenCalledWith(false);
      expect(result.body)
        .toEqual(expectedResult);
    });
  });

  describe('/schedules/:variable', () => {
    it('GET /schedules/:variable fails with invalid variable', async () => {
      const expectedResult = JSON.parse(JSON.stringify({
        error: 'Unknown variable',
      }));

      const result = await authenticatedAPI
        .get('/api/heat-pump/schedules/invalidVariable')
        .expect(400);

      expect(result.body)
        .toEqual(expectedResult);
    });

    it('GET /schedules/:variable returns boosting schedule of a variable', async () => {
      HeatPumpService.getSchedule = jest.fn()
        .mockResolvedValue(TestConstants.lowerTankHeatingSchedule);

      const result = await authenticatedAPI
        .get('/api/heat-pump/schedules/lowerTank')
        .expect(200);

      expect(result.body)
        .toEqual(TestConstants.lowerTankHeatingSchedule);
    });

    it('POST /schedules/:variable fails with invalid variable', async () => {
      const expectedResult = JSON.parse(JSON.stringify({
        error: 'Unknown variable',
      }));

      const result = await authenticatedAPI
        .post('/api/heat-pump/schedules/invalidVariable')
        .send({ schedule: TestConstants.lowerTankHeatingSchedule })
        .expect(400);

      expect(result.body)
        .toEqual(expectedResult);
    });

    it('POST /schedules/:variable sets boosting schedule of a variable', async () => {
      HeatPumpService.setSchedule = jest.fn();

      await authenticatedAPI
        .post('/api/heat-pump/schedules/lowerTank')
        .send({ schedule: TestConstants.lowerTankHeatingSchedule })
        .expect(200);

      expect(HeatPumpService.setSchedule)
        .toHaveBeenCalledWith('lowerTank', TestConstants.lowerTankHeatingSchedule);
    });
  });
});
