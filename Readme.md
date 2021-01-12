# Terrace Heating Backend
> An Express.js backend which enables monitoring and controlling of a terrace heating system.

There is a *Lämpöässä* (TODO MODEL) ground source heat pump at my parents' place which enables heating for an enclosed terrace.

TODO BACKGROUND

TODO MOTIVATION

This repository contains the implementation of the backend portion of the application.




### Table of Contents
[Features](#features)  
[Implementation](#implementation)  

## Features
The features of the Express.js backend include:
- Periodical querying of *Lämpöässä* (TODO MODEL) heat-pump values via ModBus TCP connection.
- Data is securely stored in MongoDB Cloud.
- Offering semi real-time data for clients via Socket.io.
- Simplified REST API providing a frontend means for displaying the heat-pump data.
  - Secure authentication and authorization implemented.
- Providing the possibility to control selected heat-pump features related to terrace heating via ModBus protocol.

## Implementation
- Querying values each minute to avoid stressing the internal controller of the heat-pump unnecessarily.
    - After each query of the heat-pump, the latest values are transmitted to clients via WebSocket.
    - A WebSocket connection is used to reduce unnecessary HTTP polling by the frontend.
```
/**
 * A cron-job for querying the data from the heat pump each minute.
 */
cron.schedule('* * * * *', async () => {
  try {
    const queriedData = await ModBusService.queryHeatPumpValues();
    io.emit('heatPumpData', queriedData);
    console.log(`Query complete. ${queriedData.time}`);
  } catch (exception) {
    console.error('Query could not be completed:', exception.message);
  }
}, {});
```

- Simplified REST API requires user authentication and provides endpoints for fetching data and controlling the heat-pump.
    - Example:
```
/**
 * Endpoint for fetching heat pump data.
 *
 * Optional query strings year, month and day determine a date,
 * that is used for filtering and including heat pump data entries from that date onwards.
 *
 * @return {Array.<Object>} - contains heat pump entries from the given date onwards
 */
heatPumpRouter.get('/', async (req, res, next) => {
  try {
    const user = await authorize(req);
    if (user) {
      // Optional query strings
      const date = {
        year: req.query.year,
        month: req.query.month,
        day: req.query.day,
      };
      const data = await HeatPumpService.getData(date);
      return res.json(data);
    }
  } catch (exception) {
    next(exception);
  }
  return res.status(401);
});
```


## 
