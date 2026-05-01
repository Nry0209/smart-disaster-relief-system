require('dotenv').config({ path: __dirname + '/../.env' });
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const Partner = require('../models/Partner');
const User = require('../models/User');

function normalizeEmail(e) {
  if (!e) return null;
  return String(e).toLowerCase().trim();
}

async function findUserForPartner(p) {
  // Try exact email match
  if (p.email) {
    const e = normalizeEmail(p.email);
    const byEmail = await User.findOne({ email: e });
    if (byEmail) return byEmail;
  }

  // Try matching contactPerson to fullName
  if (p.contactPerson) {
    const name = String(p.contactPerson).trim();
    if (name.length > 2) {
      const byName = await User.findOne({ fullName: new RegExp(`^${name}$`, 'i') });
      if (byName) return byName;
    }
  }

  // Try matching email local-part to user email local-part
  if (p.email) {
    const local = String(p.email).split('@')[0];
    if (local) {
      const users = await User.find();
      for (const u of users) {
        const ulocal = (u.email || '').split('@')[0];
        if (ulocal && ulocal.toLowerCase() === local.toLowerCase()) return u;
      }
    }
  }

  return null;
}

async function run() {
  const ok = await connectDB();
  if (!ok) process.exit(1);

  try {
    const partners = await Partner.find({ $or: [{ userId: null }, { userId: { $exists: false } }] });
    console.log(`Found ${partners.length} partner(s) without userId`);

    let updated = 0;
    for (const p of partners) {
      const user = await findUserForPartner(p);
      if (user) {
        p.userId = user._id;
        await p.save();
        updated++;
        console.log(`Linked partner ${p._id} -> user ${user._id} (${user.email})`);
      } else {
        console.log(`No user match for partner ${p._id} (${p.email || p.contactPerson || p.organizationName})`);
        // Provide suggested candidates: match by email domain or name contains
        const suggestions = [];
        const allUsers = await User.find();
        const pEmail = p.email || '';
        const pDomain = pEmail.split('@')[1] || '';
        for (const u of allUsers) {
          const uEmail = (u.email || '').toLowerCase();
          const uDomain = uEmail.split('@')[1] || '';
          const fullname = (u.fullName || '').toLowerCase();
          const contact = (p.contactPerson || '').toLowerCase();
          if (pDomain && uDomain && pDomain === uDomain) {
            suggestions.push({ reason: 'email domain match', userId: u._id, email: u.email, fullName: u.fullName });
            continue;
          }
          if (contact && fullname && (fullname.includes(contact) || contact.includes(fullname))) {
            suggestions.push({ reason: 'name contains match', userId: u._id, email: u.email, fullName: u.fullName });
            continue;
          }
        }
        if (suggestions.length) {
          console.log('  Suggested matches:');
          for (const s of suggestions.slice(0,5)) {
            console.log(`    - ${s.fullName} <${s.email}> (${s.reason})`);
          }
        } else {
          console.log('  No close suggestions found.');
        }
      }
    }

    console.log(`Completed. Updated ${updated} partner(s).`);
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

run();
