import express, { Request, Response } from 'express';
import HeatPumpService from '../services/heatPumpService';
import { authorize } from '../utils/middleware';
import { ScheduleVariable } from '../types';

const heatPumpRouter = express.Router();

/**
 * Endpoint for fetching heat pump data.
 * Optional query strings year, month and day determine a date,
 * that is used for filtering and including heat pump data entries from that date onwards.
 * @return HeatPumpEntry[]
 */
heatPumpRouter.get('/', authorize, async (request: Request, response: Response) => {
  // Optional query strings
  const date = {
    year: String(request.query.year),
    month: String(request.query.month),
    day: String(request.query.day),
  };
  const heatPumpData = await HeatPumpService.getData(date);
  return response.json(heatPumpData);
});

/**
 * Endpoint for fetching status of the heating system.
 * Heating status is one of 'BOOSTING', 'RUNNING', 'SOFT_START' or 'STOPPED' (HeatingStatus).
 * @return HeatingStatus.Boosting || HeatingStatus.Running || HeatingStatus.SoftStart || HeatingStatus.Stopped
 */
heatPumpRouter.get('/status', authorize, async (_request: Request, response: Response) => {
  const heatingStatus = await HeatPumpService.getStatus();
  return response.json(heatingStatus);
});

/**
 * Endpoint for starting the heating system.
 * Startup procedure can either be normal or 'soft-start'.
 * Soft-start means that heat distribution circuit is switched on immediately,
 * and 12 hours later boosting schedule is enabled.
 * Returns the new status after the startup.
 * @return HeatingStatus.Boosting || HeatingStatus.Running || HeatingStatus.SoftStart
 */
heatPumpRouter.post('/start', authorize, async (request: Request, response: Response) => {
  const { softStart } = request.body;
  let heatingStatus;

  if (softStart) {
    await HeatPumpService.softStartCircuitThree();
    heatingStatus = await HeatPumpService.getStatus();
  } else {
    await HeatPumpService.startCircuitThree();
    heatingStatus = await HeatPumpService.getStatus();
  }
  return response.status(200).json(heatingStatus);
});

/**
 * Endpoint for stopping the heating system.
 * Heat distribution circuit three and boosting schedules are turned off.
 * Returns the new status after stopping the heating.
 * @return HeatingStatus.Stopped
 */
heatPumpRouter.post('/stop', authorize, async (_request: Request, response: Response) => {
  await HeatPumpService.stopCircuitThree();
  const heatingStatus = await HeatPumpService.getStatus();
  return response.status(200).json(heatingStatus);
});

/**
 * Endpoint for fetching a boosting schedule of a variable.
 * Allowed variables are
 * ScheduleVariable.LowerTank ('lowerTank') and ScheduleVariable.HeatDistCircuit3 ('heatDistCircuit3').
 * Returns the heating schedule of the variable (VariableHeatingSchedule),
 * containing start hour, end hour and temperature delta for each weekday.
 * @return VariableHeatingSchedule
 */
heatPumpRouter.get('/schedules/:variable', authorize, async (request: Request, response: Response) => {
  const { variable } = request.params;
  if (variable !== ScheduleVariable.HeatDistCircuit3 && variable !== ScheduleVariable.LowerTank) {
    return response.json({
      error: 'Unknown variable',
    }).status(400).end();
  }
  const heatingSchedule = await HeatPumpService.getSchedule(variable);
  return response.json(heatingSchedule);
});

/**
 * Endpoint for setting a boosting schedule of a variable.
 * Allowed variables are
 * ScheduleVariable.LowerTank ('lowerTank') and ScheduleVariable.HeatDistCircuit3 ('heatDistCircuit3').
 * Requires the heating schedule of the variable (VariableHeatingSchedule),
 * containing start hour, end hour and temperature delta for each weekday.
 */
heatPumpRouter.post('/schedules/:variable', authorize, async (request: Request, response: Response) => {
  const { variable } = request.params;
  if (variable !== ScheduleVariable.HeatDistCircuit3 && variable !== ScheduleVariable.LowerTank) {
    return response.status(400).json({
      error: 'Unknown variable',
    }).end();
  }
  const { schedule } = request.body;
  await HeatPumpService.setSchedule(variable, schedule);
  return response.status(200).end();
});

/**
 * Endpoint for fetching scheduling status, i.e. is it enabled or disabled.
 * @return boolean
 */
heatPumpRouter.get('/scheduling', authorize, async (_request: Request, response: Response) => {
  const data = await HeatPumpService.getSchedulingEnabled();
  return response.json(data);
});

/**
 * Endpoint for enabling or disabling scheduling of heating.
 * Requires a request parameter schedulingEnabled which is a string representing a boolean value.
 * Returns the new status of heating (HeatingStatus).
 * @return HeatingStatus
 */
heatPumpRouter.post('/scheduling/:schedulingEnabled', authorize, async (request: Request, response: Response) => {
  const { schedulingEnabled } = request.params;
  if (!schedulingEnabled) {
    return response.status(400).json({ error: 'Request parameter schedulingEnabled is missing' });
  }
  const newStatus = await HeatPumpService.setSchedulingEnabled(Boolean(schedulingEnabled));
  return response.status(200).json(newStatus);
});

export default heatPumpRouter;
