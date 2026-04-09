(async () => {
  try {
    const res = await fetch('http://127.0.0.1:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@windorgrove.com', password: 'mUSTPAY@54' })
    });
    const data = await res.json();
    console.log('Login OK:', res.ok);
    if (!res.ok) { console.log(data); return; }
    
    const stats = await fetch('http://127.0.0.1:3000/api/admin/stats', {
      headers: { 'Authorization': 'Bearer ' + data.token }
    });
    console.log('Stats status:', stats.status);
    if (!stats.ok) {
       const t = await stats.text();
       console.log('Stats body:', t);
    } else {
       console.log('Stats successful');
    }
  } catch (e) { console.error(e); }
})();
