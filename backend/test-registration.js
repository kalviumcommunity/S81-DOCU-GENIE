import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3001/api';

// Test cases for registration
const testCases = [
  {
    name: 'Valid registration data',
    data: {
      username: 'testuser123',
      email: 'test@example.com',
      password: 'TestPass123'
    },
    expectedStatus: 201
  },
  {
    name: 'Invalid password (no uppercase)',
    data: {
      username: 'testuser123',
      email: 'test2@example.com',
      password: 'testpass123'
    },
    expectedStatus: 400
  },
  {
    name: 'Invalid password (no number)',
    data: {
      username: 'testuser123',
      email: 'test3@example.com',
      password: 'TestPass'
    },
    expectedStatus: 400
  },
  {
    name: 'Invalid username (too short)',
    data: {
      username: 'ab',
      email: 'test4@example.com',
      password: 'TestPass123'
    },
    expectedStatus: 400
  },
  {
    name: 'Invalid username (special characters)',
    data: {
      username: 'test-user@123',
      email: 'test5@example.com',
      password: 'TestPass123'
    },
    expectedStatus: 400
  }
];

async function testRegistration() {
  console.log('🧪 Testing registration endpoint...\n');
  
  for (const testCase of testCases) {
    try {
      console.log(`📝 Testing: ${testCase.name}`);
      console.log(`📤 Sending data:`, testCase.data);
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data),
      });
      
      const responseData = await response.json();
      
      console.log(`📥 Status: ${response.status}`);
      console.log(`📥 Response:`, responseData);
      
      if (response.status === testCase.expectedStatus) {
        console.log(`✅ PASS: Expected ${testCase.expectedStatus}, got ${response.status}\n`);
      } else {
        console.log(`❌ FAIL: Expected ${testCase.expectedStatus}, got ${response.status}\n`);
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}\n`);
    }
  }
}

// Wait for server to start, then run tests
setTimeout(() => {
  testRegistration();
}, 3000);
