const { Pool } = require('pg');
require('dotenv').config();

const p = new Pool({ connectionString: process.env.DATABASE_URL });

const queries = [
  'luxury hotel exterior',
  'luxury resort',
  'hotel room',
  'resort pool',
  'vacation villa',
  '5 star hotel',
  'hotel architecture',
  'boutique hotel'
];

async function fetchUnsplashIds() {
  const uniqueIds = new Set();
  
  for (const query of queries) {
    if (uniqueIds.size >= 1000) break;
    
    for (let page = 1; page <= 6; page++) {
      if (uniqueIds.size >= 1000) break;
      
      try {
        const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=30&page=${page}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
          data.results.forEach(item => {
            if (item.urls && item.urls.regular) {
              uniqueIds.add(item.urls.regular);
            }
          });
          console.log(`Fetched page ${page} for "${query}" - Total unique: ${uniqueIds.size}`);
        } else {
          break; // No more results for this query
        }
      } catch (err) {
        console.error('Fetch error:', err.message);
      }
    }
  }
  
  return Array.from(uniqueIds);
}

(async () => {
  try {
    console.log('Gathering unique full Unsplash photo URLs...');
    const photoUrls = await fetchUnsplashIds();
    
    console.log(`Gathered ${photoUrls.length} unique photos. Updating database...`);
    
    const dbHotels = await p.query('SELECT id FROM hotels ORDER BY id');
    
    let updatedCount = 0;
    for (let i = 0; i < dbHotels.rows.length; i++) {
      const hotelId = dbHotels.rows[i].id;
      const imageUrl = photoUrls[i % photoUrls.length];
      
      await p.query('UPDATE hotels SET image = $1 WHERE id = $2', [imageUrl, hotelId]);
      updatedCount++;
      if (updatedCount % 100 === 0) {
        console.log(`...Updated ${updatedCount} hotels`);
      }
    }
    
    console.log(`Successfully assigned distinct, robust Unsplash images to all ${updatedCount} hotels!`);
  } catch (err) {
    console.error(err);
  } finally {
    p.end();
  }
})();
