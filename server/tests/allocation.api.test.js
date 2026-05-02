const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../config/db');
const DisasterReport = require('../models/DisasterReport');
const { allocateResources, getDisasterReportById } = require('../controllers/disasterReportController');

function buildTestApp() {
  const app = express();
  app.use(express.json());

  // Simulate authenticated internal staff for allocation
  app.post('/api/disaster-reports/:id/allocate', (req, res, next) => {
    req.user = { id: new mongoose.Types.ObjectId().toString(), fullName: 'API Test Allocator' };
    next();
  }, allocateResources);

  app.get('/api/disaster-reports/:id', getDisasterReportById);

  return app;
}

let app;
let dbReady = false;

test.before(async () => {
  const connected = await connectDB();
  dbReady = Boolean(connected);
  if (dbReady) {
    app = buildTestApp();
  }
});

test.after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

test.beforeEach(async () => {
  if (!dbReady) return;
  await DisasterReport.deleteMany({ location: { $in: ['API Test Location'] } });
});

test('allocate resources: incidentDate and allocatedDays persist', async (t) => {
  if (!dbReady) {
    t.skip('Skipping: database is not available');
    return;
  }

  // Create a fresh report directly using the model (bypass auth requirement)
  const created = await DisasterReport.create({
    disasterType: 'Flood',
    location: 'API Test Location',
    severityLevel: 'medium',
    severity: 'medium',
    affectedPeople: 10,
    affectedPopulation: 10,
    eventDate: new Date(),
    priority: 'medium',
    requiredItems: [],
    createdBy: new mongoose.Types.ObjectId(),
  });

  const payload = {
    allocatedBy: 'API Test Allocator',
    message: 'Test allocation via automated test',
    allocatedResources: {
      quantities: { test_item: 1 },
      lineItems: [{ itemId: 'test_item', itemName: 'test_item', category: 'Other', quantity: 1 }],
      incidentDate: new Date().toISOString(),
      allocatedDays: 5,
    },
  };

  const res = await request(app)
    .post(`/api/disaster-reports/${created._id}/allocate`)
    .send(payload)
    .set('Accept', 'application/json');

  if (res.status !== 200) {
    console.error('Allocate response status != 200, body:', JSON.stringify(res.body, null, 2));
  }

  assert.equal(res.status, 200);
  const reported = res.body.report || res.body;
  assert.ok(reported.allocatedResources, 'allocatedResources should be present in API response');
  assert.ok(reported.allocatedResources.incidentDate, 'incidentDate should be present in API response');
  assert.equal(Number(new Date(reported.allocatedResources.incidentDate)), Number(new Date(payload.allocatedResources.incidentDate)));
  assert.equal(reported.allocatedResources.allocatedDays, 5);

  // Fetch fresh via GET and assert persist
  const fetched = await request(app).get(`/api/disaster-reports/${created._id}`);
  assert.equal(fetched.status, 200);
  const fetchedReport = fetched.body;
  assert.ok(fetchedReport.allocatedResources.incidentDate, 'incidentDate should persist in DB');
  assert.equal(fetchedReport.allocatedResources.allocatedDays, 5);
});
