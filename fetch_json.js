const fs = require('fs');
const https = require('https');

const url = 'https://documenter.gw.postman.com/api/collections/20401599/UVyvvZjR?versionTag=latest';
const file = fs.createWriteStream("apigames.json");

https.get(url, function (response) {
    response.pipe(file);
    file.on('finish', function () {
        file.close(() => console.log('Download JSON Completed'));
    });
}).on('error', function (err) {
    fs.unlink("apigames.json");
    console.error('Error downloading:', err.message);
});
