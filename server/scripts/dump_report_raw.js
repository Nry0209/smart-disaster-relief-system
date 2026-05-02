const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DisasterReport = require('../models/DisasterReport');

const MONGODB_URI = process.env.MONGODB_URI;
const REPORT_ID = process.argv[2];

async function run() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing');
  }

  await mongoose.connect(MONGODB_URI);
  const query = REPORT_ID ? { _id: REPORT_ID } : {};
  const report = await DisasterReport.findOne(query).lean();
  console.log('Raw report from DB:');
  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
