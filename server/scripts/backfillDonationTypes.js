const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Donation = require("../models/Donation");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

function inferDonationType(donation) {
  const hasAmount = Number(donation.amount || 0) > 0;
  const hasInventorySignals =
    Number(donation.quantity || 0) > 0 ||
    String(donation.itemType || "").trim().length > 0;

  if (hasAmount && !hasInventorySignals) {
    return "monetary";
  }

  return "inventory";
}

function inferDonorType(donation) {
  const hasOrganizationName = String(donation.organizationName || "").trim().length > 0;
  return hasOrganizationName ? "organization" : "individual";
}

async function runBackfill() {
  const connected = await connectDB();

  if (!connected) {
    console.error("Unable to connect to database. Backfill aborted.");
    process.exit(1);
  }

  let scanned = 0;
  let updated = 0;

  try {
    const cursor = Donation.find({}).cursor();

    for (let donation = await cursor.next(); donation != null; donation = await cursor.next()) {
      scanned += 1;

      const nextDonationType = donation.donationType || inferDonationType(donation);
      const nextDonorType = donation.donorType || inferDonorType(donation);

      const normalized = {
        donationType: nextDonationType,
        donorType: nextDonorType,
        organizationName:
          nextDonorType === "organization"
            ? String(donation.organizationName || "").trim()
            : "",
      };

      if (normalized.donationType === "monetary") {
        normalized.itemType = "";
        normalized.category = donation.category || "monetary";
        normalized.quantity = 0;
        normalized.amount = Number(donation.amount || 0);
        normalized.expectedDeliveryDate = null;
      } else {
        normalized.itemType = String(donation.itemType || "").trim();
        normalized.category = String(donation.category || "").trim();
        normalized.quantity = Number(donation.quantity || 0);
        normalized.amount = 0;
      }

      const hasChanges =
        donation.donationType !== normalized.donationType ||
        donation.donorType !== normalized.donorType ||
        String(donation.organizationName || "") !== normalized.organizationName ||
        String(donation.itemType || "") !== normalized.itemType ||
        String(donation.category || "") !== normalized.category ||
        Number(donation.quantity || 0) !== normalized.quantity ||
        Number(donation.amount || 0) !== normalized.amount ||
        (normalized.donationType === "monetary" && donation.expectedDeliveryDate != null);

      if (hasChanges) {
        donation.donationType = normalized.donationType;
        donation.donorType = normalized.donorType;
        donation.organizationName = normalized.organizationName;
        donation.itemType = normalized.itemType;
        donation.category = normalized.category;
        donation.quantity = normalized.quantity;
        donation.amount = normalized.amount;

        if (normalized.donationType === "monetary") {
          donation.expectedDeliveryDate = null;
        }

        await donation.save();
        updated += 1;
      }
    }

    console.log("Donation backfill complete.");
    console.log(`Scanned: ${scanned}`);
    console.log(`Updated: ${updated}`);
  } catch (error) {
    console.error("Backfill failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

runBackfill();
