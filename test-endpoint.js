
import handler from './api/send-notification.js';

async function runTest() {
  console.log('Testing /api/send-notification endpoint...');
  
  // Mock Request
  const req = {
    method: 'POST',
    body: {
      subscription: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/fake-endpoint',
        keys: {
          p256dh: 'fake-p256dh',
          auth: 'fake-auth'
        }
      },
      title: 'Test Title',
      body: 'Test Body'
    }
  };

  // Mock Response
  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log(`\nResponse Status: ${this.statusCode}`);
      console.log('Response Body:', JSON.stringify(data, null, 2));
    }
  };

  try {
    await handler(req, res);
  } catch (err) {
    console.error('Unhandled Error during execution:', err);
  }
}

runTest();
