import moment from 'moment';
import HeatPumpService from './heatPumpService';
import TestSetup from '../test/testSetup';
import TestConstants from '../test/testConstants';
import HeatPump, { HeatPumpEntryDocument } from '../models/heatPump';
import ModBusApi from './modbus/api';
import { HeatingStatus, ScheduleVariable } from '../types';
import DoneCallback = jest.DoneCallback;

beforeAll(async () => {
  await TestSetup.initTestDatabase();
});

let heatPumpEntries: HeatPumpEntryDocument[];

beforeEach(async () => {
  await TestSetup.insertTestHeatPumpData();
  heatPumpEntries = await HeatPump.find({});
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(async (done: DoneCallback) => {
  await TestSetup.closeTestDatabase(done);
});

describe('getData', () => {
  it('returns all entries if date threshold is not given', async () => {
    const result = await HeatPumpService.getData({
      year: null,
      month: null,
      day: null,
    });
    expect(result)
      .toEqual(heatPumpEntries);
  });

  it('returns entries after the given date threshold', async () => {
    const now = moment();
    now.subtract(2, 'days');

    const result = await HeatPumpService.getData({
      year: `${now.year()}`,
      month: `0${now.month() + 1}`,
      day: `${now.date()}`,
    });

    expect(result).toHaveLength(2);
  });
});

describe('getSchedule', () => {
  it('passes a heating schedule of a variable correctly from ModBusApi', async () => {
    ModBusApi.querySchedule = jest.fn()
      .mockResolvedValue(TestConstants.lowerTankHeatingSchedule);

    const expectedResult = TestConstants.lowerTankHeatingSchedule;

    const result = await HeatPumpService.getSchedule(ScheduleVariable.LowerTank);

    expect(result)
      .toEqual(expectedResult);
  });
});

describe('setSchedule', () => {
  it('passes heating schedule of a variable correctly to ModBusApi', async () => {
    ModBusApi.setSchedule = jest.fn();

    await HeatPumpService.setSchedule(ScheduleVariable.LowerTank, TestConstants.lowerTankHeatingSchedule);

    expect(ModBusApi.setSchedule)
      .toHaveBeenCalledWith(ScheduleVariable.LowerTank, TestConstants.lowerTankHeatingSchedule);
  });
});

describe('getSchedulingEnabled', () => {
  it('passes scheduling status correctly from ModBusApi', async () => {
    ModBusApi.querySchedulingStatus = jest.fn()
      .mockResolvedValue(true);

    const result = await HeatPumpService.getSchedulingEnabled();

    expect(result)
      .toBe(true);
  });
});

describe('getStatus', () => {
  it('returns status correctly when circuit 3 is active and scheduling is enabled', async () => {
    ModBusApi.queryActiveCircuits = jest.fn()
      .mockResolvedValue(3);
    ModBusApi.querySchedulingStatus = jest.fn()
      .mockResolvedValue(true);
    ModBusApi.querySchedule = jest.fn()
      .mockResolvedValue(TestConstants.heatDistCircuit3Schedule);

    // Mock time
    const day = moment('2020-02-13 13:45:00');
    jest
      .useFakeTimers('modern')
      .setSystemTime(day.toDate());

    const dayResult = await HeatPumpService.getStatus();
    expect(dayResult)
      .toEqual(HeatingStatus.Boosting);

    // Mock time
    const night = moment('2020-02-13 01:45:00');
    jest
      .useFakeTimers('modern')
      .setSystemTime(night.toDate());

    const nightResult = await HeatPumpService.getStatus();
    expect(nightResult)
      .toEqual(HeatingStatus.Running);
  });
});

describe('startCircuitThree', () => {
  it('calls startCircuitThree() and enableScheduling() of ModBusApi correctly', async () => {
    ModBusApi.startCircuitThree = jest.fn();
    ModBusApi.enableScheduling = jest.fn();

    await HeatPumpService.startCircuitThree();

    expect(ModBusApi.startCircuitThree)
      .toHaveBeenCalled();
    expect(ModBusApi.enableScheduling)
      .toHaveBeenCalled();
  });
});

describe('softStartCircuitThree', () => {
  it('calls startCircuitThree() of ModBusApi correctly', async () => {
    ModBusApi.startCircuitThree = jest.fn();

    await HeatPumpService.startCircuitThree();

    expect(ModBusApi.startCircuitThree)
      .toHaveBeenCalled();
  });
});

describe('stopCircuitThree', () => {
  it('calls disableScheduling() and stopCircuitThree() of ModBusApi correctly', async () => {
    ModBusApi.disableScheduling = jest.fn();
    ModBusApi.stopCircuitThree = jest.fn();

    await HeatPumpService.stopCircuitThree();

    expect(ModBusApi.disableScheduling)
      .toHaveBeenCalled();
    expect(ModBusApi.stopCircuitThree)
      .toHaveBeenCalled();
  });
});

describe('setSchedulingEnabled', () => {
  it('enables scheduling correctly during day', async () => {
    ModBusApi.enableScheduling = jest.fn();
    ModBusApi.queryActiveCircuits = jest.fn()
      .mockResolvedValue(3);
    ModBusApi.querySchedulingStatus = jest.fn()
      .mockResolvedValue(true);
    ModBusApi.querySchedule = jest.fn()
      .mockResolvedValue(TestConstants.heatDistCircuit3Schedule);

    // Mock time
    const day = moment('2020-02-13 13:45:00');
    jest
      .useFakeTimers('modern')
      .setSystemTime(day.toDate());

    const result = await HeatPumpService.setSchedulingEnabled(true);

    expect(result)
      .toEqual(HeatingStatus.Boosting);
    expect(ModBusApi.enableScheduling)
      .toHaveBeenCalled();
    expect(ModBusApi.queryActiveCircuits)
      .toHaveBeenCalled();
    expect(ModBusApi.querySchedulingStatus)
      .toHaveBeenCalled();
    expect(ModBusApi.querySchedule)
      .toHaveBeenCalled();
  });

  it('enables scheduling correctly during night', async () => {
    ModBusApi.enableScheduling = jest.fn();
    ModBusApi.queryActiveCircuits = jest.fn()
      .mockResolvedValue(3);
    ModBusApi.querySchedulingStatus = jest.fn()
      .mockResolvedValue(true);
    ModBusApi.querySchedule = jest.fn()
      .mockResolvedValue(TestConstants.heatDistCircuit3Schedule);

    // Mock time
    const night = moment('2020-02-13 01:45:00');
    jest
      .useFakeTimers('modern')
      .setSystemTime(night.toDate());

    const result = await HeatPumpService.setSchedulingEnabled(true);

    expect(result)
      .toEqual(HeatingStatus.Running);
    expect(ModBusApi.enableScheduling)
      .toHaveBeenCalled();
    expect(ModBusApi.queryActiveCircuits)
      .toHaveBeenCalled();
    expect(ModBusApi.querySchedulingStatus)
      .toHaveBeenCalled();
    expect(ModBusApi.querySchedule)
      .toHaveBeenCalled();
  });

  it('disables scheduling correctly', async () => {
    ModBusApi.disableScheduling = jest.fn();
    ModBusApi.queryActiveCircuits = jest.fn()
      .mockResolvedValue(3);
    ModBusApi.querySchedulingStatus = jest.fn()
      .mockResolvedValue(false);

    const result = await HeatPumpService.setSchedulingEnabled(false);

    expect(result)
      .toEqual(HeatingStatus.Running);
    expect(ModBusApi.disableScheduling)
      .toHaveBeenCalled();
    expect(ModBusApi.queryActiveCircuits)
      .toHaveBeenCalled();
    expect(ModBusApi.querySchedulingStatus)
      .toHaveBeenCalled();
  });
});
