const hotels = [
  { 
    id: "h1", 
    name: "The Ritz-Carlton, Tokyo", 
    city: "Tokyo", 
    country: "Japan", 
    price: 1250, 
    rating: 4.9, 
    image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80", 
    commissionRate: 12.5, 
    category: "Skyline Luxury" 
  },
  { 
    id: "h2", 
    name: "Aman Tokyo", 
    city: "Tokyo", 
    country: "Japan", 
    price: 1650, 
    rating: 5.0, 
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&q=80", 
    commissionRate: 15.0, 
    category: "Minimalist Masterpiece" 
  },
  { 
    id: "h3", 
    name: "Four Seasons Hotel George V", 
    city: "Paris", 
    country: "France", 
    price: 1950, 
    rating: 5.0, 
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80", 
    commissionRate: 14.5, 
    category: "Classic Palace" 
  },
  { 
    id: "h4", 
    name: "Mandarin Oriental, Paris", 
    city: "Paris", 
    country: "France", 
    price: 1400, 
    rating: 4.8, 
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80", 
    commissionRate: 11.5, 
    category: "Chic Avenue" 
  },
  { 
    id: "h5", 
    name: "Belmond Hotel Caruso", 
    city: "Ravello", 
    country: "Italy", 
    price: 1100, 
    rating: 4.9, 
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80", 
    commissionRate: 13.0, 
    category: "Cliffside Elegance" 
  },
  { 
    id: "h6", 
    name: "Soneva Jani", 
    city: "Noonu Atoll", 
    country: "Maldives", 
    price: 2450, 
    rating: 5.0, 
    image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1200&q=80", 
    commissionRate: 16.5, 
    category: "Overwater Paradise" 
  },
  { 
    id: "h7", 
    name: "Amanpuri", 
    city: "Phuket", 
    country: "Thailand", 
    price: 950, 
    rating: 4.8, 
    image: "https://images.unsplash.com/photo-1549388604-817d15aa0110?w=1200&q=80", 
    commissionRate: 10.5, 
    category: "Zen Sanctuary" 
  },
  { 
    id: "h8", 
    name: "Four Seasons Maldives", 
    city: "Landaa Giraavaru", 
    country: "Maldives", 
    price: 1800, 
    rating: 4.9, 
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80", 
    commissionRate: 14.0, 
    category: "Marine Splendor" 
  }
];

const defaultState = {
  user: { 
    name: "Alex Morgan", 
    email: "alex@windsorgrove.test", 
    balance: 184.50, 
    commissionTotal: 1247.30, 
    funded: true, 
    bankLinked: true 
  },
  search: "",
  country: "All",
  selectedHotel: null,
  tasks: [],
  txs: [
    { id: "t1", type: "bonus", amount: 100, status: "completed", ts: Date.now() - 86400000 * 3, note: "Welcome bonus" },
  ],
  chat: [
    { from: "agent", text: "Welcome to Windsor Grove Concierge. How may we assist your intelligence gathering today?", ts: Date.now() - 60000 }
  ],
  adminNotifications: [],
  adminAlert: false
};
