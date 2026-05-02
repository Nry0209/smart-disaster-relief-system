const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const InventoryItem = require('../models/InventoryItem');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

(async function(){
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const items = await InventoryItem.find({
      $or: [
        { packageSize: { $exists: false } },
        { packageSize: '' },
        { packageSize: null }
      ],
      unit: { $exists: true, $ne: '' }
    }).select('name unit packageSize').limit(20).lean();

    console.log(JSON.stringify(items, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
