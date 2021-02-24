# Terrace Heating Backend
> An Express.js backend which enables monitoring and controlling of a terrace heating system.

A personal project for gaining a deeper understanding of Full Stack development
by building a meaningful application for real world use.

In a nutshell, this project enables monitoring and controlling the heating system for an enclosed terrace at my parents' home.

#### Background Motivation
At my parents' home, there is an enclosed terrace for which the heating (ground & air) is provided by a *Lämpöässä Vmi 9* ground source heat-pump.

As I found that monitoring and controlling the heat-pump was a bit cumbersome through the provided cloud platform,
I visioned about a simple and responsive web application which would provide my family members an easy way of using the terrace heating system.

This repository contains the implementation of the backend portion of the application.

### Table of Contents
[Features](#features)  
[Implementation](#implementation)  
[Requirements](#requirements)

## Features
The features of the Express.js backend include:
- Periodical querying of *Lämpöässä* (Vmi 9) heat-pump values via ModBus TCP connection.
- Data is securely stored in MongoDB Cloud.
- Offering semi real-time data for clients via Socket.io.
- Simplified REST API providing a frontend means for displaying the heat-pump data.
  - Secure session authorization with HTTP-only cookies implemented.
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
 * Cronjob for querying heat-pump values each minute.
 * Queried values are saved to the database and sent to connected clients via WebSocket connection.
 */
cron.schedule('* * * * *', async () => {
  try {
    const queriedData = await ModBusService.queryHeatPumpValues();
    clients.forEach((client) => client.emit('heatPumpData', queriedData));
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
 * @return {Array.<Object>} - contains heat pump data from the given date onwards
 */
heatPumpRouter.get('/', authorize, async (req, res) => {
  // Optional query strings
  const date = {
    year: req.query.year,
    month: req.query.month,
    day: req.query.day,
  };
  const data = await HeatPumpService.getData(date);
  return res.json(data);
});
```

- Controlling of selected terrace heating related features is implemented by writing to specific registers in the heat-pump using ModBus.
  - The most important register is the one which controls the amount of active heat distribution circuits.
  - Example:

```JavaScript
/**
 * Sets the number of active heat distribution circuits to three, i.e. enables circuit three.
 */
const startCircuitThree = async () => {
  await client.writeRegister(5100, 3);
};
```

## Requirements
- Requires the following environment variables:
  ```
  MONGODB_URI=  <URI for MongoDB>
  PORT=3003
  MODBUS_HOST=  <IP for ModBus connection>
  MODBUS_PORT=  <Port for ModBus connection>
  SESSIONS=  <Key for session authentication>
  ```
- [modbus-serial](https://github.com/yaacov/node-modbus-serial#readme) installation requires some extra steps:
  - Install Windows Build Tools with ```npm install --global windows-build-tools```
  - Install modbus-serial with ```npm install modbus-serial```
    - If the installation fails, try the following command ```npm install modbus-serial --unsafe-perm --build-from-source```
- Run ```npm install``` as usual
