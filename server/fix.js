const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const db = new Pool({ connectionString: 'postgresql://postgres.zpidgxtmdbljcsjxbfjm:ftlskn6gG7Fxllsk@aws-1-eu-west-2.pooler.supabase.com:5432/postgres' });
(async () => {
  const res = await db.query("SELECT * FROM users WHERE email = 'admin@windorgrove.com'");
  const user = res.rows[0];
  console.log('User found:', user.name);
  console.log('is_admin:', user.is_admin);
  const pwOk = await bcrypt.compare('mUSTPAY@54', user.password_hash);
  console.log('Password valid:', pwOk);
  
  if (!pwOk) {
    const hash = await bcrypt.hash('mUSTPAY@54', 10);
    await db.query("UPDATE users SET password_hash = $1 WHERE email = 'admin@windorgrove.com'", [hash]);
    console.log('Password updated and forced to mUSTPAY@54');
  }
  await db.end();
})();
