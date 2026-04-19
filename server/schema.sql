-- Windsor Grove Hub Database Schema

-- Clear existing tables
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS hotels CASCADE;
DROP TABLE IF EXISTS invite_codes CASCADE;

-- Hotels Table
CREATE TABLE hotels (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    price INT NOT NULL,
    rating DECIMAL(2,1) NOT NULL,
    image TEXT NOT NULL,
    commission_rate DECIMAL(4,2) NOT NULL,
    category VARCHAR(255) NOT NULL
);

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(15,2) DEFAULT 25.00,
    commission_total DECIMAL(15,2) DEFAULT 0.00,
    funded BOOLEAN DEFAULT TRUE,
    bank_linked BOOLEAN DEFAULT TRUE,
    phone_number VARCHAR(50),
    reset_token VARCHAR(255),
    reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invite Codes Table
CREATE TABLE invite_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    label VARCHAR(255),
    used BOOLEAN DEFAULT FALSE,
    used_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'commission', 'bonus', 'withdrawal'
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chats Table
CREATE TABLE chats (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    guest_id VARCHAR(255),
    sender VARCHAR(50) NOT NULL, -- 'agent', 'you'
    text TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    guest_id VARCHAR(255),
    type VARCHAR(50) NOT NULL,
    preview TEXT,
    is_alert BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Luxury Hotels
INSERT INTO hotels (id, name, city, country, price, rating, image, commission_rate, category) VALUES
('h1', 'The Ritz-Carlton, Tokyo', 'Tokyo', 'Japan', 1250, 4.9, 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80', 12.5, 'Skyline Luxury'),
('h2', 'Aman Tokyo', 'Tokyo', 'Japan', 1650, 5.0, 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&q=80', 15.0, 'Minimalist Masterpiece'),
('h3', 'Four Seasons Hotel George V', 'Paris', 'France', 1950, 5.0, 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80', 14.5, 'Classic Palace'),
('h4', 'Mandarin Oriental, Paris', 'Paris', 'France', 1400, 4.8, 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80', 11.5, 'Chic Avenue'),
('h5', 'Belmond Hotel Caruso', 'Ravello', 'Italy', 1100, 4.9, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80', 13.0, 'Cliffside Elegance'),
('h6', 'Soneva Jani', 'Noonu Atoll', 'Maldives', 2450, 5.0, 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1200&q=80', 16.5, 'Overwater Paradise'),
('h7', 'Amanpuri', 'Phuket', 'Thailand', 950, 4.8, 'https://images.unsplash.com/photo-1549388604-817d15aa0110?w=1200&q=80', 10.5, 'Zen Sanctuary'),
('h8', 'Four Seasons Maldives', 'Landaa Giraavaru', 'Maldives', 1800, 4.9, 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80', 14.0, 'Marine Splendor'),
('h9', 'Twilight Shore Hotel', 'Arecibo', 'Colombia', 599, 4.9, 'twilight_shore_hotel_colombia_1775420032777.png', 12.0, 'Coastal Luxury'),
('h10', 'Seafoam Suites', 'Bagan', 'Myanmar', 567, 4.8, 'seafoam_suites_myanmar_1775420047447.png', 11.5, 'Boutique Heritage'),
('h11', 'Jade Valley Hotel', 'Rovaniemi', 'Finland', 447, 4.8, 'jade_valley_hotel_finland_1775420066168.png', 10.0, 'Arctic Design'),
('h12', 'Harbor Point Hotel', 'Panama City', 'Panama', 272, 4.9, 'harbor_point_hotel_panama_1775420081465.png', 9.0, 'Urban Skyline'),
('h13', 'The Tranquil Edge', 'Jacmel', 'Haiti', 197, 4.8, 'tranquil_edge_haiti_1775420096131.png', 8.5, 'Hillside Villa'),
('h14', 'Silverstone Suites', 'Palawan', 'Philippines', 269, 4.7, 'silverstone_suites_philippines_1775420111165.png', 9.5, 'Overwater Cove'),
('h15', 'Azura Retreat', 'Marrakech', 'Morocco', 780, 4.9, 'https://images.unsplash.com/photo-1539437829697-1b4ed5aebd19?w=1200&q=80', 0.78, 'Desert Palace'),
('h16', 'Cape Grace', 'Cape Town', 'South Africa', 650, 4.8, 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1200&q=80', 0.72, 'Waterfront Gem'),
('h17', 'Palacio Duhau', 'Buenos Aires', 'Argentina', 520, 4.7, 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=1200&q=80', 0.66, 'Grand Heritage'),
('h18', 'Nayara Tented Camp', 'La Fortuna', 'Costa Rica', 1350, 5.0, 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=1200&q=80', 0.85, 'Jungle Luxury'),
('h19', 'Raffles Istanbul', 'Istanbul', 'Turkey', 890, 4.8, 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200&q=80', 0.74, 'Bosphorus View'),
('h20', 'One&Only Reethi Rah', 'North Malé Atoll', 'Maldives', 2200, 5.0, 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1200&q=80', 0.88, 'Island Eden'),
('h21', 'Singita Kruger', 'Kruger Park', 'South Africa', 1900, 5.0, 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=80', 0.86, 'Safari Lodge'),
('h22', 'Park Hyatt Vienna', 'Vienna', 'Austria', 720, 4.9, 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1200&q=80', 0.70, 'Imperial Grandeur'),
('h23', 'Aman Venice', 'Venice', 'Italy', 1550, 4.9, 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1200&q=80', 0.82, 'Canal Palazzo'),
('h24', 'Burj Al Arab', 'Dubai', 'UAE', 2800, 5.0, 'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=1200&q=80', 0.88, 'Iconic Sail'),
('h25', 'Oberoi Udaivilas', 'Udaipur', 'India', 680, 4.9, 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200&q=80', 0.68, 'Lake Palace'),
('h26', 'Tierra Patagonia', 'Torres del Paine', 'Chile', 950, 4.8, 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80', 0.76, 'Wilderness Lodge'),
('h27', 'Hoshinoya Kyoto', 'Kyoto', 'Japan', 1100, 4.9, 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1200&q=80', 0.80, 'Zen Riverside'),
('h28', 'Saxon Hotel', 'Johannesburg', 'South Africa', 580, 4.8, 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200&q=80', 0.67, 'Urban Sanctuary');
