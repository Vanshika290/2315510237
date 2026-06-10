const cron = require('node-cron');
const notificationRepository = require('../repository/notificationRepository');
const logger = require('../config/logger');

class CleanupJob {
  // Run daily at 2 AM to clean up old notifications
  startDailyCleanup() {
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Starting daily cleanup job');
        
        // Delete notifications older than 90 days
        const deletedCount = await notificationRepository.deleteOlderThan(90);
        
        logger.info('Cleanup job completed', { deletedCount });
      } catch (error) {
        logger.error('Cleanup job failed', { error: error.message });
      }
    });

    logger.info('Cleanup job scheduled to run daily at 2 AM');
  }

  // Manual trigger for cleanup
  async runCleanup(daysOld = 90) {
    try {
      logger.info('Manual cleanup triggered', { daysOld });
      const deletedCount = await notificationRepository.deleteOlderThan(daysOld);
      logger.info('Manual cleanup completed', { deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('Manual cleanup failed', { error: error.message });
      throw error;
    }
  }
}

module.exports = new CleanupJob();
