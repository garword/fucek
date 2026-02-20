const fs = require('fs');

const content = fs.readFileSync('apigames.json', 'utf8');
const collection = JSON.parse(content);

function printItems(items, parentName = '') {
    items.forEach(item => {
        const name = parentName ? `${parentName} > ${item.name}` : item.name;
        if (item.item) {
            printItems(item.item, name);
        } else {
            console.log(`[${name}]`);
            console.log(`  URL: ${item.request.url.raw || item.request.url}`);
            console.log(`  Method: ${item.request.method}`);
            if (item.request.description) {
                console.log(`  Desc: ${item.request.description}`);
            }
            console.log('---');
        }
    });
}

printItems(collection.item);
