import cron from 'node-cron';
import config from './utils/config.js';
import app from './app.js';
import queryModBus from './utils/modBus.js';

cron.schedule('* * * * *', async () => {
  await queryModBus();
}, {});

app.listen(config.PORT);
