const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../config/db');
const InventoryItem = require('../models/InventoryItem');
const { createInventoryItem, updateInventoryItem, getInventoryItemById } = require('../controllers/inventoryController');

function buildTestApp() {
  const app = express();
  app.use(express.json());

  app.post('/api/inventory', createInventoryItem);
  app.put('/api/inventory/:id', updateInventoryItem);
  app.get('/api/inventory/:id', getInventoryItemById);

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
  await InventoryItem.deleteMany({ name: { $in: ['API Package Size Item'] } });
});

test('inventory create and update preserve packageSize and unit', async (t) => {
  if (!dbReady) {
    t.skip('Skipping: database is not available');
    return;
  }

  const createResponse = await request(app)
    .post('/api/inventory')
    .send({
      name: 'API Package Size Item',
      category: 'Dry Food',
      packageSize: '1 kg',
      unit: 'pack',
      stock: 25,
      min: 5,
      warehouse: 'Warehouse 1',
      performedBy: 'Inventory Test Officer',
    });

  if (createResponse.status !== 201) {
    console.error('Create inventory response body:', JSON.stringify(createResponse.body, null, 2));
  }

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.packageSize, '1 kg');
  assert.equal(createResponse.body.unit, 'pack');

  const itemId = createResponse.body.id;

  const updateResponse = await request(app)
    .put(`/api/inventory/${itemId}`)
    .send({
      packageSize: '2 kg',
      unit: 'bag',
      note: 'Updated in test',
      performedBy: 'Inventory Test Officer',
    });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.packageSize, '2 kg');
  assert.equal(updateResponse.body.unit, 'bag');

  const fetchedResponse = await request(app).get(`/api/inventory/${itemId}`);
  assert.equal(fetchedResponse.status, 200);
  assert.equal(fetchedResponse.body.packageSize, '2 kg');
  assert.equal(fetchedResponse.body.unit, 'bag');
});
