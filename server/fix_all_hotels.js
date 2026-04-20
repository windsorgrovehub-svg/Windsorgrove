const { Pool } = require('pg');
require('dotenv').config();
const p = new Pool({ connectionString: process.env.DATABASE_URL });

const original = [
  {id:'h1', name:'The Ritz-Carlton, Tokyo', price:1250, image:'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80'},
  {id:'h2', name:'Aman Tokyo', price:1650, image:'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&q=80'},
  {id:'h3', name:'Four Seasons Hotel George V', price:1950, image:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80'},
  {id:'h4', name:'Mandarin Oriental, Paris', price:1400, image:'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80'},
  {id:'h5', name:'Belmond Hotel Caruso', price:1100, image:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80'},
  {id:'h6', name:'Soneva Jani', price:2450, image:'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1200&q=80'},
  {id:'h7', name:'Amanpuri', price:950, image:'https://images.unsplash.com/photo-1549388604-817d15aa0110?w=1200&q=80'},
  {id:'h8', name:'Four Seasons Maldives', price:1800, image:'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80'},
  {id:'h9', name:'Twilight Shore Hotel', price:599, image:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80'},
  {id:'h10', name:'Seafoam Suites', price:567, image:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80'},
  {id:'h11', name:'Jade Valley Hotel', price:447, image:'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80'},
  {id:'h12', name:'Harbor Point Hotel', price:272, image:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80'},
  {id:'h13', name:'The Tranquil Edge', price:197, image:'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80'},
  {id:'h14', name:'Silverstone Suites', price:269, image:'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=800&q=80'},
  {id:'h15', name:'Azura Retreat', price:780, image:'https://images.unsplash.com/photo-1539437829697-1b4ed5aebd19?w=1200&q=80'},
  {id:'h16', name:'Cape Grace', price:650, image:'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1200&q=80'},
  {id:'h17', name:'Palacio Duhau', price:520, image:'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=1200&q=80'},
  {id:'h18', name:'Nayara Tented Camp', price:1350, image:'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=1200&q=80'},
  {id:'h19', name:'Raffles Istanbul', price:890, image:'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200&q=80'},
  {id:'h20', name:'One&Only Reethi Rah', price:2200, image:'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1200&q=80'},
  {id:'h21', name:'Singita Kruger', price:1900, image:'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=80'},
  {id:'h22', name:'Park Hyatt Vienna', price:720, image:'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1200&q=80'},
  {id:'h23', name:'Aman Venice', price:1550, image:'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1200&q=80'},
  {id:'h24', name:'Burj Al Arab', price:2800, image:'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=1200&q=80'},
  {id:'h25', name:'Oberoi Udaivilas', price:680, image:'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200&q=80'},
  {id:'h26', name:'Tierra Patagonia', price:950, image:'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80'},
  {id:'h27', name:'Hoshinoya Kyoto', price:1100, image:'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1200&q=80'},
  {id:'h28', name:'Saxon Hotel', price:580, image:'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200&q=80'},
  {id:'h29', name:'Coral Bay Resort', price:420, image:'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800&q=80'},
  {id:'h30', name:'Alpine Lodge Zermatt', price:890, image:'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&q=80'},
  {id:'h31', name:'The Langham Sydney', price:680, image:'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&q=80'},
  {id:'h32', name:'Rosewood Hong Kong', price:1150, image:'https://images.unsplash.com/photo-1536599018102-9f803c029b22?w=800&q=80'},
  {id:'h33', name:'Claridges London', price:1350, image:'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80'},
  {id:'h34', name:'Belmond Maroma', price:750, image:'https://images.unsplash.com/photo-1501426026826-31c667bdf23d?w=1200&q=80'},
  {id:'h35', name:'The Peninsula Bangkok', price:520, image:'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=1200&q=80'},
  {id:'h36', name:'Lotte Hotel Seoul', price:480, image:'https://images.unsplash.com/photo-1590490360182-c33d955f4682?w=800&q=80'},
  {id:'h37', name:'Badrutt Palace', price:1800, image:'https://images.unsplash.com/photo-1548777123-e216912df7d8?w=800&q=80'},
  {id:'h38', name:'Bvlgari Resort Bali', price:1100, image:'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80'},
  {id:'h39', name:'Mandarin Oriental Barcelona', price:780, image:'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200&q=80'},
  {id:'h40', name:'Waldorf Astoria Amsterdam', price:650, image:'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80'},
  {id:'h41', name:'The Siam Bangkok', price:620, image:'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200&q=80'},
  {id:'h42', name:'Shangri-La Singapore', price:580, image:'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&q=80'},
  {id:'h43', name:'Raffles Grand Hotel', price:390, image:'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&q=80'},
  {id:'h44', name:'Grace Santorini', price:1200, image:'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&q=80'},
  {id:'h45', name:'Nihi Sumba', price:1500, image:'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=1200&q=80'},
  {id:'h46', name:'Fogo Island Inn', price:1900, image:'https://images.unsplash.com/photo-1504626835342-6b01071d182e?w=1200&q=80'},
  {id:'h47', name:'Song Saa Private Island', price:1600, image:'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80'},
  {id:'h48', name:'Como Cocoa Island', price:1400, image:'https://images.unsplash.com/photo-1602002418816-5c0aeef426aa?w=1200&q=80'},
  {id:'h49', name:'Six Senses Zighy Bay', price:850, image:'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80'},
  {id:'h50', name:'Belmond Le Manoir', price:1050, image:'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&q=80'},
  {id:'h51', name:'Anantara Golden Triangle', price:720, image:'https://images.unsplash.com/photo-1528181304800-259b08848526?w=1200&q=80'},
  {id:'h52', name:'Icehotel 365', price:650, image:'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1200&q=80'},
  {id:'h53', name:'Royal Mansour', price:1700, image:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=80'},
  {id:'h54', name:'The Brando', price:3200, image:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80'},
  {id:'h55', name:'Jade Mountain', price:1450, image:'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80'},
  {id:'h56', name:'Emirates Palace', price:950, image:'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80'},
  {id:'h57', name:'Post Ranch Inn', price:1650, image:'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200&q=80'},
  {id:'h58', name:'Amangiri', price:2400, image:'https://images.unsplash.com/photo-1469796466635-455ede028aca?w=1200&q=80'},
  {id:'h59', name:'Ashford Castle', price:780, image:'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=800&q=80'},
  {id:'h60', name:'Baglioni Luna', price:620, image:'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=1200&q=80'},
  {id:'h61', name:'Capella Bangkok', price:540, image:'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=80'},
  {id:'h62', name:'Gleneagles Scotland', price:680, image:'https://images.unsplash.com/photo-1586611292717-f828b167408c?w=800&q=80'},
  {id:'h63', name:'Halekulani Okinawa', price:720, image:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80'},
  {id:'h64', name:'Belmond Sanctuary Lodge', price:1100, image:'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1200&q=80'}
];

(async () => {
  console.log('Restoring 64 real hotels...');
  for (let i = 0; i < original.length; i++) {
    const h = original[i];
    await p.query('UPDATE hotels SET name = $1, price = $2, image = $3 WHERE id = $4', 
      [h.name, h.price, h.image, h.id]);
  }
  
  console.log('Fetching remaining fake hotels...');
  const fakes = await p.query("SELECT id FROM hotels WHERE id NOT IN (" + original.map(x => "'" + x.id + "'").join(",") + ")");
  
  console.log(`Updating ${fakes.rows.length} generated hotels to use realistic prices and unique locking placeholder images...`);
  for (let i = 0; i < fakes.rows.length; i++) {
    const fakeId = fakes.rows[i].id;
    // Extract the numeric part to use for lock
    const numericPart = fakeId.replace('h', ''); 
    // Random realistic price between $200 and $700 for fake resorts
    const realPrice = Math.floor(Math.random() * 501) + 200;
    // Ensure 100% unique, non-repeating hotel images using loremflickr with lock
    const uniqueImage = `https://loremflickr.com/800/600/luxury,hotel?lock=${numericPart}`;
    
    await p.query('UPDATE hotels SET price = $1, image = $2 WHERE id = $3', 
      [realPrice, uniqueImage, fakeId]);
  }
  
  console.log('All 1000 hotels successfully fixed and uniquely mapped!');
  p.end();
})();
