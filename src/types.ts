import moment from 'moment';

/**
 * Heat-pump related enums and types.
 */

export enum HeatingStatus {
  Running = 'RUNNING',
  Boosting = 'BOOSTING',
  SoftStart = 'SOFT_START',
  Stopped = 'STOPPED',
}

export type TankLimits = {
  lowerTankLowerLimit: number,
  lowerTankUpperLimit: number,
  upperTankLowerLimit: number,
  upperTankUpperLimit: number,
}

export type HeatPumpEntry = {
  time: moment.Moment,
  outsideTemp: number,
  insideTemp: number,
  hotGasTemp: number,
  heatDistCircuit1Temp: number,
  heatDistCircuit2Temp: number,
  heatDistCircuit3Temp: number,
  lowerTankTemp: number,
  upperTankTemp: number,
  groundLoopTempInput: number,
  groundLoopTempOutput: number,
  compressorRunning: boolean,
  compressorUsage: number | null,
  lowerTankLowerLimit: number,
  lowerTankUpperLimit: number,
  upperTankLowerLimit: number,
  upperTankUpperLimit: number,
}

/**
 * Scheduling related enums and types.
 */

export enum WeekDays {
  Monday = 'monday',
  Tuesday = 'tuesday',
  Wednesday = 'wednesday',
  Thursday = 'thursday',
  Friday = 'friday',
  Saturday = 'saturday',
  Sunday = 'sunday',
}

export enum WeekDayScheduleKeys {
  Start = 'start',
  End = 'end',
  Delta = 'delta',
}

export enum ScheduleVariable {
  LowerTank = 'lowerTank',
  HeatDistCircuit3 = 'heatDistCircuit3'
}
export type WeekDaySchedule = {
  [key in WeekDayScheduleKeys]: number
}

export type VariableHeatingSchedule = {
  [weekDay in WeekDays]: WeekDaySchedule
}

/**
 * Miscellaneous enums and types.
 */

export type Credentials = {
  username: string,
  password: string
}

export type UserType = {
  username: string,
  name: string,
  passwordHash: string,
}
