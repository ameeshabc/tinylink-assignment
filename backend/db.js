const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});


const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS links (
      code VARCHAR(8) PRIMARY KEY,
      target_url TEXT NOT NULL,
      clicks INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_clicked TIMESTAMP
    );
  `;
  
  try {
    await pool.query(query);
    console.log('✓ Database table ready');
  } catch (err) {
    console.error('Database table creation error:', err);
  }
};

createTable();

module.exports = pool;