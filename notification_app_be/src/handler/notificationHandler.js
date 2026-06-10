const logger = require('../config/logger');

class NotificationHandler {
  handleSuccess(res, statusCode, data, message = 'Success') {
    logger.info(message, { data });
    res.status(statusCode).json({
      success: true,
      message: message,
      data: data,
      timestamp: new Date().toISOString()
    });
  }

  handleError(res, statusCode, error, context = {}) {
    logger.error(error.message, { error: error.stack, ...context });
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message,
      timestamp: new Date().toISOString()
    });
  }

  handleValidationError(res, errors) {
    logger.warn('Validation error', { errors });
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors,
      timestamp: new Date().toISOString()
    });
  }

  handleNotFound(res, resource) {
    const error = new Error(`${resource} not found`);
    this.handleError(res, 404, error, { resource });
  }

  handleUnauthorized(res) {
    const error = new Error('Unauthorized access');
    this.handleError(res, 401, error);
  }
}

module.exports = new NotificationHandler();
