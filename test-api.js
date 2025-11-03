const http = require('http');

function testAPI(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`\n=== Testing ${path} ===`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (e) => {
      console.error(`Error testing ${path}:`, e.message);
      reject(e);
    });

    req.end();
  });
}

async function runTests() {
  try {
    await testAPI('/api/items');
    await testAPI('/api/items/meta/count');
    await testAPI('/api/items/aggregate/category-count');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();