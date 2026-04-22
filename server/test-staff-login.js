/**
 * Test script for staff login functionality
 * Run: node test-staff-login.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testStaffLogin() {
  try {
    console.log('🧪 Starting Staff Login Test\n');

    // Step 1: Admin login
    console.log('Step 1: Admin Login');
    const adminResponse = await axios.post(`${BASE_URL}/auth/admin/login`, {
      email: 'admin@disasterrelief.org',
      password: 'Admin@123456'
    });
    
    const adminToken = adminResponse.data.data.token;
    console.log('✅ Admin login successful');
    console.log(`Token: ${adminToken}\n`);

    // Step 2: Create a staff member
    console.log('Step 2: Creating Staff Member');
    const staffTestEmail = `staff-test-${Date.now()}@disasterrelief.org`;
    const staffPassword = 'TestStaff@123';
    
    const createStaffResponse = await axios.post(
      `${BASE_URL}/auth/create-staff`,
      {
        fullName: 'Test Staff Member',
        email: staffTestEmail,
        role: 'dmc_officer',
        phone: '1234567890',
        department: 'Emergency Response',
        status: 'active'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    console.log('✅ Staff created successfully');
    console.log(`Email: ${staffTestEmail}`);
    console.log(`Response:`, createStaffResponse.data);
    
    // Extract OTP from response (if available in dev mode)
    const devOtp = createStaffResponse.data?.data?.devOtp;
    if (devOtp) {
      console.log(`📧 Dev Mode OTP: ${devOtp}`);
    }
    console.log();

    // Step 3: Try staff login with email and password
    console.log('Step 3: Staff Login with Email & Password');
    try {
      const staffLoginResponse = await axios.post(`${BASE_URL}/auth/staff/login`, {
        email: staffTestEmail,
        password: staffPassword
      });
      
      console.log('✅ Staff login successful!');
      console.log(`Token: ${staffLoginResponse.data.data.token}`);
      console.log(`User:`, staffLoginResponse.data.data.user);
    } catch (loginError) {
      console.log('❌ Staff login failed');
      if (loginError.response) {
        console.log(`Status: ${loginError.response.status}`);
        console.log(`Error: ${loginError.response.data.message}`);
      } else {
        console.error(loginError.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testStaffLogin();
