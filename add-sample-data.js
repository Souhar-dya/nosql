const http = require('http');

function addSampleData() {
  const postData = JSON.stringify({});
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/items/import-sample',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Response: ${data}`);
    });
  });

  req.on('error', (e) => {
    console.error(`Error: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

addSampleData();