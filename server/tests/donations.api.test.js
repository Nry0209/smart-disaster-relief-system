const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const connectDB = require("../config/db");
const Donation = require("../models/Donation");
const InventoryItem = require("../models/InventoryItem");
const {
  createDonation,
  verifyDonation,
} = require("../controllers/donationController");

function buildTestApp() {
  const app = express();
  app.use(express.json());

  app.post("/api/donations", createDonation);
  app.patch("/api/donations/:id/verify", (req, res, next) => {
    req.user = {
      id: new mongoose.Types.ObjectId().toString(),
      fullName: "Inventory Test Officer",
    };
    next();
  }, verifyDonation);

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
  if (!dbReady) {
    return;
  }

  await Donation.deleteMany({
    donorName: { $in: ["API Monetary Donor", "API Org Contact", "API Invalid Donor"] },
  });

  await InventoryItem.deleteMany({
    name: { $in: ["API Relief Water"] },
  });
});

test("create donation: individual + monetary", async (t) => {
  if (!dbReady) {
    t.skip("Skipping: database is not available");
    return;
  }

  const response = await request(app)
    .post("/api/donations")
    .send({
      donorType: "individual",
      donationType: "monetary",
      donorName: "API Monetary Donor",
      email: "monetary.donor@example.com",
      amount: 25000,
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.donation.donorType, "individual");
  assert.equal(response.body.donation.donationType, "monetary");
  assert.equal(response.body.donation.amount, 25000);
  assert.equal(response.body.donation.status, "pending_verification");
});

test("create donation: organization + inventory", async (t) => {
  if (!dbReady) {
    t.skip("Skipping: database is not available");
    return;
  }

  const response = await request(app)
    .post("/api/donations")
    .send({
      donorType: "organization",
      donationType: "inventory",
      donorName: "API Org Contact",
      organizationName: "API Relief Foundation",
      itemType: "Water Bottles",
      category: "Water",
      quantity: 120,
      expectedDeliveryDate: new Date().toISOString().slice(0, 10),
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.donation.donorType, "organization");
  assert.equal(response.body.donation.donationType, "inventory");
  assert.equal(response.body.donation.quantity, 120);
  assert.equal(response.body.donation.status, "pending_verification");
});

test("create donation: invalid monetary payload rejected", async (t) => {
  if (!dbReady) {
    t.skip("Skipping: database is not available");
    return;
  }

  const response = await request(app)
    .post("/api/donations")
    .send({
      donorType: "individual",
      donationType: "monetary",
      donorName: "API Invalid Donor",
      amount: 0,
    });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /valid amount/i);
});

test("verify donation: inventory donation updates stock", async (t) => {
  if (!dbReady) {
    t.skip("Skipping: database is not available");
    return;
  }

  const inventoryItem = await InventoryItem.create({
    name: "API Relief Water",
    category: "Water",
    stock: 10,
    min: 5,
    warehouse: "Warehouse 1",
    unit: "units",
    quantityAvailable: 10,
  });

  const created = await request(app)
    .post("/api/donations")
    .send({
      donorType: "organization",
      donationType: "inventory",
      donorName: "API Org Contact",
      organizationName: "API Relief Foundation",
      itemType: "API Relief Water",
      quantity: 25,
    });

  assert.equal(created.status, 201);

  const verify = await request(app)
    .patch(`/api/donations/${created.body.donation._id}/verify`)
    .send({
      status: "verified",
      verificationNotes: "Verified for API test",
      inventoryItemId: inventoryItem._id.toString(),
    });

  assert.equal(verify.status, 200);
  assert.equal(verify.body.donation.status, "verified");

  const refreshedInventory = await InventoryItem.findById(inventoryItem._id);
  assert.equal(refreshedInventory.stock, 35);
});

test("verify donation: monetary donation does not require inventory item", async (t) => {
  if (!dbReady) {
    t.skip("Skipping: database is not available");
    return;
  }

  const created = await request(app)
    .post("/api/donations")
    .send({
      donorType: "individual",
      donationType: "monetary",
      donorName: "API Monetary Donor",
      amount: 6000,
    });

  assert.equal(created.status, 201);

  const verify = await request(app)
    .patch(`/api/donations/${created.body.donation._id}/verify`)
    .send({
      status: "verified",
      verificationNotes: "Monetary donation verified",
    });

  assert.equal(verify.status, 200);
  assert.equal(verify.body.donation.status, "verified");
});
