import { Logger } from 'tslog';

const logger: Logger = new Logger({
  dateTimeTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  displayFilePath: 'hidden',
});

export default logger;
