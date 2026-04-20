const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        max: 20,                    // max simultaneous DB connections
        idleTimeoutMillis: 30000,   // close idle connections after 30s
        connectionTimeoutMillis: 3000, // fail fast if no connection in 3s
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
      }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'windsorgrove',
        password: process.env.DB_PASSWORD || 'postgres',
        port: process.env.DB_PORT || 5432,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 3000,
      }
);

// Log pool errors so they don't crash the process silently
pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
