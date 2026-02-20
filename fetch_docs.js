const fs = require('fs');
const https = require('https');

const url = 'https://documenter.getpostman.com/view/20401599/UVyvvZjR';
const file = fs.createWriteStream("docs.html");

https.get(url, function (response) {
    response.pipe(file);
    file.on('finish', function () {
        file.close(() => console.log('Download Completed'));
    });
});
