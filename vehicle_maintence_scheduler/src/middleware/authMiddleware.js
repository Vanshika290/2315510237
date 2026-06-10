const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

class AuthMiddleware {
  verifyToken(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        logger.warn('Missing authorization token', { ip: req.ip });
        return res.status(401).json({
          success: false,
          message: 'Missing authorization token'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
      req.user = decoded;
      logger.info('Token verified', { userId: decoded.userId });
      next();
    } catch (error) {
      logger.error('Token verification failed', { error: error.message });
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  }

  authorizeDepot(req, res, next) {
    try {
      const { depotId } = req.params;
      const user = req.user;

      if (!user.allowedDepots || !user.allowedDepots.includes(depotId)) {
        logger.warn('Unauthorized access attempt', { userId: user.userId, depotId });
        return res.status(403).json({
          success: false,
          message: 'Access denied to this depot'
        });
      }

      next();
    } catch (error) {
      logger.error('Authorization check failed', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  }
}

module.exports = new AuthMiddleware();
