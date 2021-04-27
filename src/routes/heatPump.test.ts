/* eslint-disable  @typescript-eslint/no-explicit-any, import/no-extraneous-dependencies */
import supertest from 'supertest';
// @ts-ignore
import session from 'supertest-session';
import app from '../app';
import TestSetup from '../../test/testSetup';
import TestConstants from '../../test/testConstants';
import HeatPumpService from '../services/heatPumpService';
import ModBusApi from '../services/modbus/api';
import { HeatingStatus } from '../types';
import DoneCallback = jest.DoneCallback;

const api = supertest(app);
const testSession = session(app);
let authenticatedAPI: any;

beforeAll(async (done) => {
  await TestSetup.initTestDatabase();
  await TestSetup.insertTestUser();

  testSession
    .post('/api/auth/login/')
    .send({
      username: TestConstants.initialUser.username,
      password: TestConstants.initialUser.password,
    })
    .end((error: any) => {
      if (error) {
        return done();
      }
      authenticatedAPI = testSession;
      return done();
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
    it('GET / should return json', async () => {
      await authenticatedAPI
        .get('/api/heat-pump/')
        .expect('Content-Type', /application\/json/);
    });
  });

  describe('/status', () => {
    it('GET /status should return heat-pump status', async () => {
      const expectedResult = HeatingStatus.Running;

      const spy = jest.spyOn(HeatPumpService, 'getStatus');
      spy.mockResolvedValue(HeatingStatus.Running);

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

      const statusSpy = jest.spyOn(HeatPumpService, 'getStatus');
      statusSpy.mockResolvedValue(HeatingStatus.SoftStart);

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

      const statusSpy = jest.spyOn(HeatPumpService, 'getStatus');
      statusSpy.mockResolvedValue(HeatingStatus.Running);

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

      const statusSpy = jest.spyOn(HeatPumpService, 'getStatus');
      statusSpy.mockResolvedValue(HeatingStatus.Stopped);

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
      const querySpy = jest.spyOn(ModBusApi, 'querySchedulingStatus');
      querySpy.mockResolvedValue(true);

      const expectedResult = true;

      const result = await authenticatedAPI
        .get('/api/heat-pump/scheduling/')
        .expect(200);

      expect(result.body)
        .toEqual(expectedResult);
      expect(querySpy)
        .toHaveBeenCalled();
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
      const spy = jest.spyOn(HeatPumpService, 'setSchedulingEnabled');
      spy.mockResolvedValue(HeatingStatus.Boosting);

      const expectedResult = HeatingStatus.Boosting;

      const result = await authenticatedAPI
        .post('/api/heat-pump/scheduling/')
        .send({ schedulingEnabled: true })
        .expect(200);

      expect(spy)
        .toHaveBeenCalledWith(true);
      expect(result.body)
        .toEqual(expectedResult);
    });

    it('POST /scheduling with schedulingEnabled being false should call setSchedulingEnabled with false', async () => {
      const spy = jest.spyOn(HeatPumpService, 'setSchedulingEnabled');
      spy.mockResolvedValue(HeatingStatus.Boosting);

      const expectedResult = HeatingStatus.Boosting;

      const result = await authenticatedAPI
        .post('/api/heat-pump/scheduling/')
        .send({ schedulingEnabled: false })
        .expect(200);

      expect(spy)
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
      const scheduleSpy = jest.spyOn(HeatPumpService, 'getSchedule');
      scheduleSpy.mockResolvedValue(TestConstants.lowerTankHeatingSchedule);

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
