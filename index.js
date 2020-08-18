import cron from 'node-cron';
import config from './utils/config.js';
import app from './app.js';
import queryModBus from './utils/modBus.js';

cron.schedule('* * * * *', async () => {
  try {
    await queryModBus();
    console.log('Query complete.');
  } catch (exception) {
    console.error('Query could not be completed:', exception.message);
  }
}, {});

app.listen(config.PORT);
