const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'neorp_db',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT) || 5432,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close clients after 30 seconds of inactivity
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Use DATABASE_URL for production (Heroku, Railway, etc.)
const pool = process.env.DATABASE_URL 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : new Pool(dbConfig);

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL:', err.message);
    console.error('🔧 Check your database configuration in .env file');
    process.exit(1);
  } else {
    console.log('✅ Connected to PostgreSQL database successfully');
    console.log(`📋 Database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
    release();
  }
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('🔥 Unexpected error on idle client', err);
  process.exit(-1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  pool.end(() => {
    console.log('💤 Database pool has ended');
    process.exit(0);
  });
});

module.exports = pool;