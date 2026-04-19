const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.zpidgxtmdbljcsjxbfjm:ftlskn6gG7Fxllsk@aws-1-eu-west-2.pooler.supabase.com:5432/postgres' });

async function seed() {
  const hotels = [
    ['h15', 'Azura Retreat', 'Marrakech', 'Morocco', 780, 4.9, 'https://images.unsplash.com/photo-1539437829697-1b4ed5aebd19?w=1200&q=80', 11.0, 'Desert Palace'],
    ['h16', 'Cape Grace', 'Cape Town', 'South Africa', 650, 4.8, 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1200&q=80', 10.5, 'Waterfront Gem'],
    ['h17', 'Palacio Duhau', 'Buenos Aires', 'Argentina', 520, 4.7, 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=1200&q=80', 9.0, 'Grand Heritage'],
    ['h18', 'Nayara Tented Camp', 'La Fortuna', 'Costa Rica', 1350, 5.0, 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=1200&q=80', 14.5, 'Jungle Luxury'],
    ['h19', 'Raffles Istanbul', 'Istanbul', 'Turkey', 890, 4.8, 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200&q=80', 11.5, 'Bosphorus View'],
    ['h20', 'One&Only Reethi Rah', 'North Malé Atoll', 'Maldives', 2200, 5.0, 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1200&q=80', 16.0, 'Island Eden'],
    ['h21', 'Singita Kruger', 'Kruger Park', 'South Africa', 1900, 5.0, 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=80', 15.5, 'Safari Lodge'],
    ['h22', 'Park Hyatt Vienna', 'Vienna', 'Austria', 720, 4.9, 'https://images.unsplash.com/photo-1609968693498-e310c0150c16?w=1200&q=80', 10.0, 'Imperial Grandeur'],
    ['h23', 'Aman Venice', 'Venice', 'Italy', 1550, 4.9, 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1200&q=80', 14.0, 'Canal Palazzo'],
    ['h24', 'Burj Al Arab', 'Dubai', 'UAE', 2800, 5.0, 'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=1200&q=80', 18.0, 'Iconic Sail'],
    ['h25', 'Oberoi Udaivilas', 'Udaipur', 'India', 680, 4.9, 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200&q=80', 10.5, 'Lake Palace'],
    ['h26', 'Tierra Patagonia', 'Torres del Paine', 'Chile', 950, 4.8, 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80', 12.0, 'Wilderness Lodge'],
    ['h27', 'Hoshinoya Kyoto', 'Kyoto', 'Japan', 1100, 4.9, 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1200&q=80', 13.0, 'Zen Riverside'],
    ['h28', 'Saxon Hotel', 'Johannesburg', 'South Africa', 580, 4.8, 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200&q=80', 9.5, 'Urban Sanctuary'],
  ];

  for (const h of hotels) {
    try {
      await pool.query(
        'INSERT INTO hotels (id, name, city, country, price, rating, image, commission_rate, category) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING',
        h
      );
      console.log(`✓ ${h[1]}`);
    } catch(e) {
      console.error(`✗ ${h[1]}: ${e.message}`);
    }
  }

  const count = await pool.query('SELECT COUNT(*) FROM hotels');
  console.log(`\nTotal hotels in DB: ${count.rows[0].count}`);
  await pool.end();
}

seed();
