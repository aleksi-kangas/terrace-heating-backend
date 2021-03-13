type ScheduleLimits = {
  start: number,
  end: number,
  delta: number
}

export enum Weekday {
  Monday = 'Monday',
  Tuesday = 'Tuesday',
  Wednesday = 'Wednesday',
  Thursday = 'Thursday',
  Friday = 'Friday',
  Saturday = 'Saturday',
  Sunday = 'Sunday',
}

export type VariableHeatingSchedule = {
  [key: string]: ScheduleLimits
}

export type RegisterAddresses = {
  [key: string]: ScheduleLimits
}

export type TankLimits = {
  lowerTankLowerLimit: number,
  lowerTankUpperLimit: number,
  upperTankLowerLimit: number,
  upperTankUpperLimit: number,
}

export type HeatPumpEntry = {
  time: Date,
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

export enum ScheduleVariable {
  LowerTank = 'lowerTank',
  HeatDistCircuit3 = 'heatDistCircuit3'
}

export enum HeatingStatus {
  Running = 'RUNNING',
  Boosting = 'BOOSTING',
  SoftStart = 'SOFT_START',
  Stopped = 'STOPPED',
}
