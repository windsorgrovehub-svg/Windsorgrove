const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const prefixes = ['The', 'Grand', 'Royal', 'Le', 'La', 'El', 'Villa', 'Château', 'Palazzo', 'Casa', 'Maison', 'Hotel', 'Resort', 'Lodge', 'Inn', 'Retreat', 'Sanctuary', 'Haven', 'Oasis', 'Eden'];
const midNames = ['Azure', 'Golden', 'Silver', 'Crystal', 'Diamond', 'Emerald', 'Sapphire', 'Ivory', 'Coral', 'Pearl', 'Amber', 'Platinum', 'Jade', 'Ruby', 'Onyx', 'Velvet', 'Silk', 'Sterling', 'Celestial', 'Serene', 'Twilight', 'Dawn', 'Dusk', 'Horizon', 'Summit', 'Crest', 'Harbor', 'Bay', 'Cove', 'Shore', 'Cliff', 'Ridge', 'Valley', 'Meadow', 'Grove', 'Palm', 'Orchid', 'Lotus', 'Zen', 'Aria'];
const suffixes = ['Hotel', 'Resort', 'Suites', 'Palace', 'Lodge', 'Villas', 'Residence', 'Collection', 'Retreat', 'Spa', 'Estate', 'Manor', 'House', 'Place', 'Tower', 'Club', 'Boutique', 'Grand', 'Premier', '& Spa'];

const cities = [
  {city:'Paris',country:'France'},{city:'London',country:'United Kingdom'},{city:'New York',country:'USA'},
  {city:'Tokyo',country:'Japan'},{city:'Dubai',country:'UAE'},{city:'Singapore',country:'Singapore'},
  {city:'Hong Kong',country:'China'},{city:'Sydney',country:'Australia'},{city:'Rome',country:'Italy'},
  {city:'Barcelona',country:'Spain'},{city:'Amsterdam',country:'Netherlands'},{city:'Berlin',country:'Germany'},
  {city:'Vienna',country:'Austria'},{city:'Zurich',country:'Switzerland'},{city:'Stockholm',country:'Sweden'},
  {city:'Copenhagen',country:'Denmark'},{city:'Oslo',country:'Norway'},{city:'Helsinki',country:'Finland'},
  {city:'Prague',country:'Czech Republic'},{city:'Budapest',country:'Hungary'},{city:'Lisbon',country:'Portugal'},
  {city:'Athens',country:'Greece'},{city:'Istanbul',country:'Turkey'},{city:'Cairo',country:'Egypt'},
  {city:'Marrakech',country:'Morocco'},{city:'Cape Town',country:'South Africa'},{city:'Nairobi',country:'Kenya'},
  {city:'Mumbai',country:'India'},{city:'Delhi',country:'India'},{city:'Bangkok',country:'Thailand'},
  {city:'Kuala Lumpur',country:'Malaysia'},{city:'Seoul',country:'South Korea'},{city:'Taipei',country:'Taiwan'},
  {city:'Shanghai',country:'China'},{city:'Beijing',country:'China'},{city:'Hanoi',country:'Vietnam'},
  {city:'Bali',country:'Indonesia'},{city:'Manila',country:'Philippines'},{city:'Auckland',country:'New Zealand'},
  {city:'Melbourne',country:'Australia'},{city:'Vancouver',country:'Canada'},{city:'Toronto',country:'Canada'},
  {city:'Mexico City',country:'Mexico'},{city:'Lima',country:'Peru'},{city:'Buenos Aires',country:'Argentina'},
  {city:'São Paulo',country:'Brazil'},{city:'Rio de Janeiro',country:'Brazil'},{city:'Bogotá',country:'Colombia'},
  {city:'Santiago',country:'Chile'},{city:'Cartagena',country:'Colombia'},{city:'Cancún',country:'Mexico'},
  {city:'Havana',country:'Cuba'},{city:'San Juan',country:'Puerto Rico'},{city:'Doha',country:'Qatar'},
  {city:'Abu Dhabi',country:'UAE'},{city:'Muscat',country:'Oman'},{city:'Amman',country:'Jordan'},
  {city:'Beirut',country:'Lebanon'},{city:'Tbilisi',country:'Georgia'},{city:'Baku',country:'Azerbaijan'},
  {city:'Kyoto',country:'Japan'},{city:'Osaka',country:'Japan'},{city:'Florence',country:'Italy'},
  {city:'Milan',country:'Italy'},{city:'Venice',country:'Italy'},{city:'Monaco',country:'Monaco'},
  {city:'Nice',country:'France'},{city:'Cannes',country:'France'},{city:'Edinburgh',country:'United Kingdom'},
  {city:'Dublin',country:'Ireland'},{city:'Reykjavik',country:'Iceland'},{city:'Santorini',country:'Greece'},
  {city:'Mykonos',country:'Greece'},{city:'Dubrovnik',country:'Croatia'},{city:'Zanzibar',country:'Tanzania'},
  {city:'Mombasa',country:'Kenya'},{city:'Accra',country:'Ghana'},{city:'Lagos',country:'Nigeria'},
  {city:'Casablanca',country:'Morocco'},{city:'Tunis',country:'Tunisia'},{city:'Luanda',country:'Angola'},
  {city:'Addis Ababa',country:'Ethiopia'},{city:'Kigali',country:'Rwanda'},{city:'Windhoek',country:'Namibia'},
  {city:'Colombo',country:'Sri Lanka'},{city:'Kathmandu',country:'Nepal'},{city:'Phnom Penh',country:'Cambodia'},
  {city:'Yangon',country:'Myanmar'},{city:'Vientiane',country:'Laos'},{city:'Brunei',country:'Brunei'},
  {city:'Male',country:'Maldives'},{city:'Fiji',country:'Fiji'},{city:'Phuket',country:'Thailand'},
  {city:'Chiang Mai',country:'Thailand'},{city:'Siem Reap',country:'Cambodia'},{city:'Luang Prabang',country:'Laos'},
  {city:'Jaipur',country:'India'},{city:'Udaipur',country:'India'},{city:'Goa',country:'India'},
  {city:'Petra',country:'Jordan'},{city:'Luxor',country:'Egypt'},{city:'Fez',country:'Morocco'},
];

const categories = ['Luxury Suite', 'Boutique Gem', 'Urban Retreat', 'Beachfront Villa', 'Mountain Lodge', 'City Center', 'Heritage Grand', 'Modern Classic', 'Eco Resort', 'Skyline Tower', 'Waterfront', 'Garden Oasis', 'Art Deco', 'Zen Spa', 'Colonial Heritage', 'Desert Palace', 'Island Paradise', 'Cliffside', 'Riverside', 'Penthouse Collection'];

const images = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80',
  'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
  'https://images.unsplash.com/photo-1549388604-817d15aa0110?w=800&q=80',
  'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80',
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
  'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800&q=80',
  'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80',
  'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800&q=80',
  'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80',
  'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80',
  'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80',
  'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80',
  'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80',
  'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
  'https://images.unsplash.com/photo-1499793983394-12259de16af0?w=800&q=80',
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
  'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=800&q=80',
  'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&q=80',
  'https://images.unsplash.com/photo-1469796466635-455ede028aca?w=800&q=80',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
  'https://images.unsplash.com/photo-1504626835342-6b01071d182e?w=800&q=80',
  'https://images.unsplash.com/photo-1559827291-bab4ae957ad5?w=800&q=80',
  'https://images.unsplash.com/photo-1602002418816-5c0aeef426aa?w=800&q=80',
  'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randPrice() { return Math.floor(200 + Math.random() * 2800); }
function randRating() { return (4.5 + Math.random() * 0.5).toFixed(1); }

// Commission rates: vary between $0.40-$0.50 so 66 tasks ≈ $30
function randCommission() {
  const rates = [0.40, 0.42, 0.44, 0.45, 0.46, 0.48, 0.50];
  return pick(rates);
}

(async () => {
  try {
    const existing = await pool.query('SELECT COUNT(*) FROM hotels');
    const count = parseInt(existing.rows[0].count);
    console.log(`Currently ${count} hotels in database`);
    
    const needed = 1000 - count;
    if (needed <= 0) {
      console.log('Already have 1000+ hotels');
      return pool.end();
    }

    console.log(`Adding ${needed} new hotels...`);
    const usedNames = new Set();
    
    // Get existing names to avoid duplicates
    const existingNames = await pool.query('SELECT name FROM hotels');
    existingNames.rows.forEach(r => usedNames.add(r.name));

    let added = 0;
    let attempts = 0;
    
    while (added < needed && attempts < 5000) {
      attempts++;
      const prefix = pick(prefixes);
      const mid = pick(midNames);
      const suffix = pick(suffixes);
      const name = `${prefix} ${mid} ${suffix}`;
      
      if (usedNames.has(name)) continue;
      usedNames.add(name);
      
      const loc = pick(cities);
      const id = `h${count + added + 1}`;
      
      await pool.query(
        'INSERT INTO hotels (id, name, city, country, price, rating, image, commission_rate, category) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [id, name, loc.city, loc.country, randPrice(), randRating(), pick(images), randCommission(), pick(categories)]
      );
      
      added++;
      if (added % 100 === 0) console.log(`  ...${added}/${needed} inserted`);
    }

    console.log(`Done! Inserted ${added} hotels.`);
    
    const final = await pool.query('SELECT COUNT(*) as cnt, AVG(commission_rate) as avg FROM hotels');
    console.log(`Total hotels: ${final.rows[0].cnt}`);
    console.log(`Avg commission rate: $${parseFloat(final.rows[0].avg).toFixed(4)}`);
    console.log(`Estimated 66-task payout: $${(parseFloat(final.rows[0].avg) * 66).toFixed(2)}`);
    
    pool.end();
  } catch(err) {
    console.error(err);
    pool.end();
  }
})();
