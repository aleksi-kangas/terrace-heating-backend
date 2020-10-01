import Alert from '../models/alert.js';

/**
 * Fetches all alerts for the specified user from MongoDB.
 * @return {Array<Object>} alerts
 */
const getAll = async (user) => {
  const alerts = await Alert.find({ user }).populate({ path: 'user', select: ['id'] });
  return alerts.map((alert) => alert.toJSON());
};

/**
 * Used to create a new alert.
 * @param variable - which the alert is for
 * @param lowerLimit - minimum value of the variable below which an alert will be created
 * @param upperLimit - maximum value of the variable above which an alert will be created
 * @param user - user's id
 * @return {Object} saved alert
 */
const create = async (variable, lowerLimit, upperLimit, user) => {
  const alert = new Alert({
    variable, lowerLimit, upperLimit, user,
  });
  return alert.save();
};

export default {
  getAll,
  create,
};
