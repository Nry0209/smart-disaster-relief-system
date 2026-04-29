const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
require('dotenv').config();

// Mock inventory data with realistic stock counts
const MOCK_INVENTORY_DATA = [
  // FOOD GROUP
  {
    name: "rice",
    category: "Dry Food",
    stock: 50000,
    min: 1000,
    warehouse: "Colombo Central Warehouse"
  },
  {
    name: "flour",
    category: "Dry Food", 
    stock: 30000,
    min: 800,
    warehouse: "Kandy Regional Warehouse"
  },
  {
    name: "canned food",
    category: "Dry Food",
    stock: 20000,
    min: 500,
    warehouse: "Colombo Central Warehouse"
  },
  {
    name: "biscuits",
    category: "Ready-to-Eat Meals",
    stock: 15000,
    min: 400,
    warehouse: "Kandy Regional Warehouse"
  },
  {
    name: "instant noodles",
    category: "Ready-to-Eat Meals",
    stock: 25000,
    min: 600,
    warehouse: "Colombo Central Warehouse"
  },
  {
    name: "ration packs",
    category: "Ready-to-Eat Meals",
    stock: 80000,
    min: 200,
    warehouse: "Kandy Regional Warehouse"
  },
  {
    name: "infant formula",
    category: "Baby Food",
    stock: 60000,
    min: 150,
    warehouse: "Colombo Central Warehouse"
  },
  {
    name: "baby cereal",
    category: "Baby Food",
    stock: 40000,
    min: 100,
    warehouse: "Kandy Regional Warehouse"
  },
  {
    name: "protein bars",
    category: "Nutritional Supplements",
    stock: 120000,
    min: 300,
    warehouse: "Colombo Central Warehouse"
  },
  {
    name: "energy drinks",
    category: "Nutritional Supplements",
    stock: 18000,
    min: 450,
    warehouse: "Kandy Regional Warehouse"
  },

  // WATER GROUP
  {
    name: "bottled water",
    category: "Drinking Water",
    stock: 100000,
    min: 2000,
    warehouse: "Colombo Central Warehouse"
  },
  {
    name: "water cans",
    category: "Drinking Water",
    stock: 800000,
    min: 1500,
    warehouse: "Kandy Regional Warehouse"
  },
  {
    name: "water filters",
    category: "Water Purification",
    stock: 30000,
    min: 75,
    warehouse: "Colombo Central Warehouse"
  },
  {
    name: "purification tablets",
    category: "Water Purification",
    stock: 500000,
    min: 1000,
    warehouse: "Kandy Regional Warehouse"
  },

  // MEDICAL GROUP
  {
    name: "paracetamol",
    category: "Basic Medicine",
    stock: 80000,
    min: 1500,
    warehouse: "Colombo Central Warehouse"
  },
  {
    name: "antibiotics",
    category: "Basic Medicine",
    stock: 30000,
    min: 600,
    warehouse: "Kandy Regional Warehouse"
  },
  {
    name: "bandages",
    category: "First Aid Supplies",
    stock: 20000,
    min: 400,
    warehouse: "Colombo Central Warehouse"
  },
  {
    name: "antiseptic",
    category: "First Aid Supplies",
    stock: 150000,
    min: 300,
    warehouse: "Kandy Regional Warehouse"
  },
  {
    name: "medical kits",
    category: "Emergency Medical Kits",
    stock: 40000,
    min: 80,
    warehouse: "Colombo Central Warehouse"
  },
  {
    name: "trauma kits",
    category: "Emergency Medical Kits",
    stock: 20000,
    min: 40,
    warehouse: "Kandy Regional Warehouse"
  },

  // SUPPORT GROUP
  {
    name: "tents",
    category: "Shelter Materials",
    stock: 30000,
    min: 60,
    warehouse: "Colombo Central Warehouse"
  },
  {
    name: "blankets",
    category: "Shelter Materials",
    stock: 120000,
    min: 240,
    warehouse: "Kandy Regional Warehouse"
  },
  {
    name: "tarpaulin",
    category: "Shelter Materials",
    stock: 80000,
    min: 160,
    warehouse: "Colombo Central Warehouse"
  },
  {
    name: "jackets",
    category: "Clothing",
    stock: 100000,
    min: 200,
    warehouse: "Kandy Regional Warehouse"
  },
  {
    name: "clothes",
    category: "Clothing",
    stock: 200000,
    min: 400,
    warehouse: "Colombo Central Warehouse"
  },
  {
    name: "soap",
    category: "Hygiene Kits",
    stock: 30000,
    min: 600,
    warehouse: "Colombo Central Warehouse"
  },
  {
    name: "sanitary kits",
    category: "Hygiene Kits",
    stock: 15000,
    min: 300,
    warehouse: "Kandy Regional Warehouse"
  }
];

async function populateMockInventory() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/disaster-relief');
    console.log('Connected to MongoDB');

    // Clear existing inventory (optional - remove if you want to keep existing data)
    console.log('Clearing existing inventory...');
    await InventoryItem.deleteMany({});
    console.log('Existing inventory cleared');

    // Insert mock data
    console.log('Inserting mock inventory data...');
    const insertedItems = await InventoryItem.insertMany(MOCK_INVENTORY_DATA);
    console.log(`Successfully inserted ${insertedItems.length} inventory items`);

    // Display summary
    console.log('\n=== MOCK INVENTORY SUMMARY ===');
    const categories = {};
    insertedItems.forEach(item => {
      if (!categories[item.category]) {
        categories[item.category] = { items: [], totalStock: 0, totalMin: 0 };
      }
      categories[item.category].items.push(item.name);
      categories[item.category].totalStock += item.stock;
      categories[item.category].totalMin += item.min;
    });

    Object.entries(categories).forEach(([category, data]) => {
      console.log(`\n${category}:`);
      console.log(`  Items: ${data.items.join(', ')}`);
      console.log(`  Total Stock: ${data.totalStock.toLocaleString()}`);
      console.log(`  Minimum Required: ${data.totalMin.toLocaleString()}`);
      console.log(`  Status: ${data.totalStock >= data.totalMin ? '✅ Sufficient' : '⚠️ Low Stock'}`);
    });

    console.log('\n✅ Mock inventory population completed successfully!');
    
  } catch (error) {
    console.error('Error populating mock inventory:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the population script
if (require.main === module) {
  populateMockInventory();
}

module.exports = { populateMockInventory, MOCK_INVENTORY_DATA };
