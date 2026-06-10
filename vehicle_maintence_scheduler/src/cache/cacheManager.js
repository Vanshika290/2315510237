const redis = require('../config/redis');
const logger = require('../config/logger');

class CacheManager {
  async get(key) {
    try {
      const value = await redis.get(key);
      if (value) {
        logger.debug('Cache hit', { key });
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  async set(key, value, expirySeconds = 300) {
    try {
      await redis.setex(key, expirySeconds, JSON.stringify(value));
      logger.debug('Cache set', { key, expirySeconds });
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
    }
  }

  async delete(key) {
    try {
      await redis.del(key);
      logger.debug('Cache deleted', { key });
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
    }
  }

  async invalidateDepotCache(depotId) {
    try {
      const pattern = `depot:${depotId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info('Depot cache invalidated', { depotId, keysDeleted: keys.length });
      }
    } catch (error) {
      logger.error('Cache invalidation error', { depotId, error: error.message });
    }
  }

  generateKey(prefix, ...params) {
    return `${prefix}:${params.join(':')}`;
  }
}

module.exports = new CacheManager();
