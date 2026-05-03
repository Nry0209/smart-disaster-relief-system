require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const axios = require('axios');

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/sdrs';
const BASE_URL = 'http://localhost:5000/api';

async function main() {
  await mongoose.connect(MONGO);
  console.log('Connected to DB');

  const testEmail = `manual-ngo-${Date.now()}@example.org`;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

  const user = new User({
    fullName: 'Manual NGO Tester',
    email: testEmail,
    password: 'temp-pass-1234',
    role: 'ngo_partner',
    status: 'active',
    isFirstLogin: true,
    otp,
    otpExpires
  });

  await user.save();
  console.log('Created user:', user.email, 'otp:', otp);

  try {
    console.log('Calling OTP login...');
    const otpResp = await axios.post(`${BASE_URL}/auth/staff/otp-login`, { email: testEmail, otp });
    console.log('OTP response:', otpResp.data);
    const tempToken = otpResp.data.data.tempToken;

    console.log('Setting password using temp token...');
    const setResp = await axios.post(`${BASE_URL}/auth/staff/set-password`, { newPassword: 'NewPass123', confirmPassword: 'NewPass123' }, { headers: { Authorization: `Bearer ${tempToken}` } });
    console.log('Set password response:', setResp.data);

    console.log('Now attempting normal login...');
    const loginResp = await axios.post(`${BASE_URL}/auth/staff/login`, { email: testEmail, password: 'NewPass123' });
    console.log('Login response:', loginResp.data);
  } catch (err) {
    console.error('Error during onboarding flow:', err.response ? err.response.data : err.message);
  } finally {
    await mongoose.disconnect();
  }
}

main();
