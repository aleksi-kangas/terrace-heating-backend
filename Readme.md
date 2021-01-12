# Terrace Heating Backend
> An Express.js backend which enables monitoring and controlling of a terrace heating system.

A personal project for gaining a deeper understanding of Full Stack development
by building a meaningful application for real world use.

In a nutshell, this project enables monitoring and controlling the heating system for an enclosed terrace at my parents' home.

#### Background Motivation
At my parents' home, there is an enclosed terrace for which the heating (ground & air) is provided by a *Lämpöässä* ground source heat-pump.

As I found that monitoring and controlling the heat-pump was a bit cumbersome through the provided cloud platform,
I visioned about a simple and responsive web application which would provide my family members an easy way of using the terrace heating system.

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
- Communication with the heat-pump is established with ModBus TCP protocol using [modbus-serial](https://github.com/yaacov/node-modbus-serial#readme) library.

```JavaScript
// Connect to the heat pump via ModBus-protocol
const client = new ModBus();
client.connectTCP(config.MODBUS_HOST, { port: config.MODBUS_PORT }).then();
```

- Querying values only each minute to avoid stressing the internal controller of the heat-pump unnecessarily.
    - After each query of the heat-pump, the latest values are transmitted to clients with [Socket.io](https://github.com/socketio/socket.io).
    - A WebSocket connection is used to reduce unnecessary HTTP polling by the frontend.

```JavaScript
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

- A Simplified REST API requires user authentication and provides endpoints for fetching data and controlling the heat-pump.
    - Example:

```JavaScript
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

- Controlling of selected terrace heating related features is implemented by writing to specific registers in the heat-pump using ModBus.
  - The most important feature to have access to is Heat Distribution Circuit 3,
    which controls the critical part of the terrace floor heating.
  - Example:

```JavaScript
const startCircuitThree = async () => {
  await client.writeRegister(5100, 3);
};
```
