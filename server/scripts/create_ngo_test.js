const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function run() {
  try {
    console.log('Logging in as admin...');
    const adminResp = await axios.post(`${BASE_URL}/auth/admin/login`, {
      email: 'admin@disasterrelief.org',
      password: 'Admin@123456'
    });

    const token = adminResp.data.data.token;
    console.log('Admin token acquired');

    const testEmail = `ngo-test-${Date.now()}@example.org`;
    console.log('Creating NGO user with email:', testEmail);

    const createResp = await axios.post(
      `${BASE_URL}/auth/staff/create`,
      {
        fullName: 'Test Staff Contact',
        email: testEmail,
        role: 'dmc_officer',
        phone: '0700000000',
        department: 'Test Dept'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log('Create response status:', createResp.status);
    console.log('Response data:', JSON.stringify(createResp.data, null, 2));
  } catch (err) {
    console.error('Error during test:', err.message);
    if (err.response) {
      console.error('Response:', err.response.status, err.response.data);
    }
  }
}

run();
