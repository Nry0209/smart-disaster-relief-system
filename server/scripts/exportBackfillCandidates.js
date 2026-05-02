const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const InventoryItem = require('../models/InventoryItem');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function inferPackageSize(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return { packageSize: '', unit: '' };
  }

  const knownUnits = [
    'kg','g','mg','l','ml','litre','liter','bottle','bottles','pack','packs','packet','packets','can','cans','box','boxes','pcs','piece','pieces','tablet','tablets','sachet','sachets','jar','jars','bag','bags','roll','set','bundle','case','pk','unit','units','each','ea'
  ];

  const numUnitRegex = /^(\d+(?:[.,]\d+)?)(?:\s*)([a-zA-Z]+)$/i;
  const m1 = normalized.match(numUnitRegex);
  if (m1) {
    const num = m1[1].replace(',', '.');
    const u = m1[2].toLowerCase();
    return { packageSize: `${num} ${u}`, unit: u };
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].toLowerCase();
    if (knownUnits.includes(last)) {
      return { packageSize: parts.slice(0, -1).join(' '), unit: last };
    }
  }

  if (parts.length === 1) {
    const only = parts[0].toLowerCase();
    if (knownUnits.includes(only)) {
      return { packageSize: '1', unit: only };
    }
  }

  const anywhereRegex = /(\d+(?:[.,]\d+)?)(?:\s*)(kg|g|mg|l|ml|bottle|pack|pcs|piece|tablet|sachet|jar|box|case|pk)s?/i;
  const m2 = normalized.match(anywhereRegex);
  if (m2) {
    const num = m2[1].replace(',', '.');
    const u = m2[2].toLowerCase();
    return { packageSize: `${num} ${u}`, unit: u };
  }

  return { packageSize: '', unit: normalized };
}

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
    }).select('name unit category').lean();

    const candidates = items.map(item => {
      const inferred = inferPackageSize(String(item.unit || ''));
      if (!inferred.packageSize) return null;
      return {
        _id: item._id,
        name: item.name,
        category: item.category,
        fromUnit: item.unit,
        toPackageSize: inferred.packageSize,
        toUnit: inferred.unit,
      };
    }).filter(Boolean);

    const outDir = path.resolve(__dirname, '../tmp');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `backfill_candidates_${Date.now()}.json`);
    fs.writeFileSync(outPath, JSON.stringify(candidates, null, 2), 'utf8');

    console.log(`Exported ${candidates.length} candidate(s) to ${outPath}`);
    await mongoose.disconnect();
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
