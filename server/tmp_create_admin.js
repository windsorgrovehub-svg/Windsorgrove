const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '/Users/vandijk/Downloads/PRES/server/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createAdmin() {
  try {
    const passwordHash = await bcrypt.hash('Mustpay@54', 10);
    const emails = ['admin@windorgrove.com', 'admin@windsorgrove.com'];
    
    for (const email of emails) {
      const res = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (res.rows.length > 0) {
        await pool.query('UPDATE users SET password_hash = $1, is_admin = $2 WHERE email = $3', [passwordHash, true, email]);
        console.log('Updated existing user:', email);
      } else {
        await pool.query(
          'INSERT INTO users (name, email, phone_number, password_hash, is_admin) VALUES ($1, $2, $3, $4, $5)',
          ['Admin', email, '+10000000000', passwordHash, true]
        );
        console.log('Created new admin user:', email);
      }
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    pool.end();
  }
}
createAdmin();
