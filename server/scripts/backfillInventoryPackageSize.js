const dotenv = require('dotenv');
const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function inferPackageSize(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return { packageSize: '', unit: '' };
  }

  const knownUnits = [
    'kg','g','mg','l','ml','litre','liter','bottle','bottles','pack','packs','packet','packets','can','cans','box','boxes','pcs','piece','pieces','tablet','tablets','sachet','sachets','jar','jars','bag','bags','roll','set','bundle','case','pk','unit','units','each','ea'
  ];

  // 1) Try explicit number + unit like "5 kg" or "1.5L"
  const numUnitRegex = /^(\d+(?:[.,]\d+)?)(?:\s*)([a-zA-Z]+)$/i;
  const m1 = normalized.match(numUnitRegex);
  if (m1) {
    const num = m1[1].replace(',', '.');
    const u = m1[2].toLowerCase();
    return { packageSize: `${num} ${u}`, unit: u };
  }

  // 2) If trailing token is a known unit, split on last token
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].toLowerCase();
    if (knownUnits.includes(last)) {
      return { packageSize: parts.slice(0, -1).join(' '), unit: last };
    }
  }

  // 2b) If the whole value is a known unit (e.g. "units"), assume packageSize 1
  if (parts.length === 1) {
    const only = parts[0].toLowerCase();
    if (knownUnits.includes(only)) {
      return { packageSize: '1', unit: only };
    }
  }

  // 3) Try to extract number + unit anywhere (e.g. "box of 12 pcs")
  const anywhereRegex = /(\d+(?:[.,]\d+)?)(?:\s*)(kg|g|mg|l|ml|bottle|pack|pcs|piece|tablet|sachet|jar|box|case|pk)s?/i;
  const m2 = normalized.match(anywhereRegex);
  if (m2) {
    const num = m2[1].replace(',', '.');
    const u = m2[2].toLowerCase();
    return { packageSize: `${num} ${u}`, unit: u };
  }

  // 4) Fallback: no packageSize inferred, keep whole string as unit
  return { packageSize: '', unit: normalized };
}

async function run() {
  const rawArgs = process.argv.slice(2);
  const argv = {};
  for (const a of rawArgs) {
    if (a === '--dry-run' || a === '--dryrun' || a === '--dry') argv.dry = true;
    if (a.startsWith('--limit=')) {
      const v = parseInt(a.split('=')[1], 10);
      if (!Number.isNaN(v)) argv.limit = v;
    }
  }
  const dryRun = !!argv.dry;
  const limit = argv.limit ? parseInt(argv.limit, 10) : 0;

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const query = {
    $or: [
      { packageSize: { $exists: false } },
      { packageSize: '' },
      { packageSize: null },
    ],
  };

  let q = InventoryItem.find(query).select('name category unit packageSize');
  if (limit && limit > 0) q = q.limit(limit);
  const items = await q.exec();

  let updatedCount = 0;
  const candidates = [];

  for (const item of items) {
    const legacyUnit = String(item.unit || '').trim();
    if (!legacyUnit) {
      continue;
    }

    const inferred = inferPackageSize(legacyUnit);
    if (!inferred.packageSize) {
      // nothing to do
      continue;
    }

    candidates.push({
      _id: item._id,
      name: item.name,
      category: item.category,
      fromUnit: legacyUnit,
      toPackageSize: inferred.packageSize,
      toUnit: inferred.unit,
    });

    if (!dryRun) {
      item.packageSize = inferred.packageSize;
      item.unit = inferred.unit || legacyUnit;
      await item.save();
      updatedCount += 1;
    }
  }

  if (dryRun) {
    console.log(`Dry-run: ${candidates.length} candidate(s) found (limit=${limit || 'none'}).`);
    const sample = candidates.slice(0, 50);
    for (const c of sample) {
      console.log(JSON.stringify(c));
    }
  } else {
    console.log(`Backfilled packageSize for ${updatedCount} inventory record(s).`);
  }

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
