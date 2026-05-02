const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const InventoryItem = require('../models/InventoryItem');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

(async function(){
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the latest candidates file
    const tmpDir = path.resolve(__dirname, '../tmp');
    const files = fs.readdirSync(tmpDir).filter(f => f.startsWith('backfill_candidates_')).sort().reverse();
    if (!files.length) {
      console.error('No candidate files found in server/tmp/');
      process.exit(1);
    }
    const candidateFile = path.join(tmpDir, files[0]);
    const candidates = JSON.parse(fs.readFileSync(candidateFile, 'utf8'));
    console.log(`Loaded ${candidates.length} candidate(s) from ${files[0]}`);

    let updatedCount = 0;
    for (const candidate of candidates) {
      const updated = await InventoryItem.findByIdAndUpdate(
        candidate._id,
        { packageSize: candidate.toPackageSize, unit: candidate.toUnit },
        { new: true }
      );
      if (updated) updatedCount++;
    }

    console.log(`Applied backfill to ${updatedCount} inventory record(s).`);
    await mongoose.disconnect();
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
