/**
 * ModBus register addresses.
 */
const registers = {
  compressorStatus: 5158,
  schedulingActive: 134,
  lowerTank: {
    monday: { start: 5014, end: 5021, delta: 36 },
    tuesday: { start: 5015, end: 5022, delta: 37 },
    wednesday: { start: 5016, end: 5023, delta: 38 },
    thursday: { start: 5017, end: 5024, delta: 39 },
    friday: { start: 5018, end: 5025, delta: 41 },
    saturday: { start: 5019, end: 5026, delta: 42 },
    sunday: { start: 5020, end: 5027, delta: 43 },
  },
  heatDistCircuitThree: {
    monday: { start: 5214, end: 5213, delta: 107 },
    tuesday: { start: 5211, end: 5212, delta: 106 },
    wednesday: { start: 5220, end: 5221, delta: 110 },
    thursday: { start: 5222, end: 5215, delta: 111 },
    friday: { start: 5223, end: 5224, delta: 112 },
    saturday: { start: 5216, end: 5217, delta: 108 },
    sunday: { start: 5218, end: 5219, delta: 109 },
  },
};

export default registers;
