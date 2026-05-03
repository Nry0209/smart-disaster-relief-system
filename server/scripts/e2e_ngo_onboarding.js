const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const NEW_PASSWORD = 'NewPass123';

async function main() {
  try {
    console.log('Logging in as admin...');
    const adminResp = await axios.post(`${BASE_URL}/auth/admin/login`, {
      email: 'admin@disasterrelief.org',
      password: 'Admin@123456'
    });

    const adminToken = adminResp.data.data.token;
    console.log('Admin login successful');

    const email = `ngo-e2e-${Date.now()}@example.org`;
    console.log('Creating NGO/staff user:', email);
    const createResp = await axios.post(
      `${BASE_URL}/auth/staff/create`,
      {
        fullName: 'E2E NGO User',
        email,
        role: 'ngo_partner',
        phone: '0700000000',
        department: 'Operations',
        organizationName: 'E2E Relief Org'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    const created = createResp.data.data;
    console.log('Create status:', createResp.status);
    console.log('OTP received:', created.otp);
    console.log('Setup link:', created.setupLink);

    console.log('Verifying OTP...');
    const otpResp = await axios.post(`${BASE_URL}/auth/staff/otp-login`, {
      email,
      otp: created.otp
    });

    const tempToken = otpResp.data.data.tempToken;
    console.log('OTP verified');

    console.log('Setting password...');
    const setPasswordResp = await axios.post(
      `${BASE_URL}/auth/staff/set-password`,
      {
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD
      },
      {
        headers: { Authorization: `Bearer ${tempToken}` }
      }
    );

    console.log('Password set response:', setPasswordResp.data.message);

    console.log('Testing normal login...');
    const loginResp = await axios.post(`${BASE_URL}/auth/staff/login`, {
      email,
      password: NEW_PASSWORD
    });

    console.log('Normal login successful');
    console.log(JSON.stringify(loginResp.data, null, 2));
  } catch (error) {
    console.error('E2E flow failed:', error.response ? error.response.data : error.message);
    process.exitCode = 1;
  }
}

main();
