const db = require('../config/db');

class HealthController {
  /**
   * Endpoint: GET /api/health
   * Health check para monitorización en Cloud Run y orquestadores.
   * Responde exactamente igual que el handler inline original en routes/index.js.
   */
  async check(req, res) {
    try {
      const dbInfo = await db.testConnection();
      res.status(200).json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          name: dbInfo.db_name,
          serverTime: dbInfo.current_time,
        }
      });
    } catch (err) {
      res.status(503).json({
        status: 'degraded',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: err.message,
        }
      });
    }
  }
}

module.exports = new HealthController();
