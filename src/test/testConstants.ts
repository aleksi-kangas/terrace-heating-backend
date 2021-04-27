import moment from 'moment';

const initialHeatPumpData = [
  {
    time: moment().subtract(3, 'minutes'),
    outsideTemp: 25.5,
    hotGasTemp: 67.5,
    heatDistCircuit1Temp: 28.5,
    heatDistCircuit2Temp: 24.5,
    lowerTankTemp: 37.5,
    upperTankTemp: 48.5,
    insideTemp: 22.5,
    groundLoopOutputTemp: 4.5,
    groundLoopInputTemp: 0.5,
    heatDistCircuit3Temp: 25.5,
    compressorRunning: true,
    compressorUsage: 50.5,
    lowerTankLowerLimit: 34,
    lowerTankUpperLimit: 44,
    upperTankLowerLimit: 48,
    upperTankUpperLimit: 58,
  },
  {
    time: moment().subtract(2, 'minutes'),
    outsideTemp: 25.6,
    hotGasTemp: 67.6,
    heatDistCircuit1Temp: 28.6,
    heatDistCircuit2Temp: 24.6,
    lowerTankTemp: 37.6,
    upperTankTemp: 48.6,
    insideTemp: 22.6,
    groundLoopOutputTemp: 4.6,
    groundLoopInputTemp: 0.6,
    heatDistCircuit3Temp: 25.6,
    compressorRunning: true,
    compressorUsage: 50.6,
    lowerTankLowerLimit: 34,
    lowerTankUpperLimit: 44,
    upperTankLowerLimit: 48,
    upperTankUpperLimit: 58,
  },
  {
    time: moment().subtract(1, 'minutes'),
    outsideTemp: 25.7,
    hotGasTemp: 67.7,
    heatDistCircuit1Temp: 28.7,
    heatDistCircuit2Temp: 24.7,
    lowerTankTemp: 37.7,
    upperTankTemp: 48.7,
    insideTemp: 22.7,
    groundLoopOutputTemp: 4.7,
    groundLoopInputTemp: 0.7,
    heatDistCircuit3Temp: 25.7,
    compressorRunning: true,
    compressorUsage: 50.7,
    lowerTankLowerLimit: 34,
    lowerTankUpperLimit: 44,
    upperTankLowerLimit: 48,
    upperTankUpperLimit: 58,
  },
];

const initialUser = {
  username: 'username',
  name: 'User Name',
  password: 'password',
};

const lowerTankHeatingSchedule = {
  monday: { start: 8, end: 22, delta: 2 },
  tuesday: { start: 8, end: 22, delta: 2 },
  wednesday: { start: 8, end: 22, delta: 2 },
  thursday: { start: 8, end: 22, delta: 2 },
  friday: { start: 8, end: 22, delta: 2 },
  saturday: { start: 8, end: 22, delta: 2 },
  sunday: { start: 8, end: 22, delta: 2 },
};

export default { initialHeatPumpData, initialUser, lowerTankHeatingSchedule };
