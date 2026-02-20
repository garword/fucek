/**
 * Turso LibSQL Client Fix Script
 * 
 * This script patches @libsql/client to disable the schema/migration check
 * that causes "Unexpected status code while fetching migration jobs: 400"
 * when using regular (non-schema) Turso databases.
 * 
 * Root cause: HttpClient calls getIsSchemaDatabase() on every query, which
 * hits Turso's migration API endpoint that returns 400 for regular databases.
 * 
 * Fix: Set #isSchemaDatabase = false in the constructor so the check is never performed.
 */

const fs = require('fs');
const path = require('path');

const filesToPatch = [
    path.join(__dirname, '../node_modules/@libsql/client/lib-cjs/http.js'),
    path.join(__dirname, '../node_modules/@libsql/client/lib-esm/http.js'),
];

const MARKER = '// PATCHED: isSchemaDatabase disabled';
const SEARCH = `this.#authToken = authToken;`;
const REPLACE = `this.#authToken = authToken;\n        this.#isSchemaDatabase = false; ${MARKER}`;

let patchedCount = 0;
let skippedCount = 0;
let errorCount = 0;

for (const filePath of filesToPatch) {
    if (!fs.existsSync(filePath)) {
        console.log(`⚠ File not found (skipping): ${filePath}`);
        skippedCount++;
        continue;
    }

    const original = fs.readFileSync(filePath, 'utf-8');

    // Already patched?
    if (original.includes(MARKER)) {
        console.log(`✓ Already patched: ${path.relative(process.cwd(), filePath)}`);
        skippedCount++;
        continue;
    }

    // Apply patch
    if (!original.includes(SEARCH)) {
        console.error(`✗ Could not find patch target in: ${path.relative(process.cwd(), filePath)}`);
        errorCount++;
        continue;
    }

    // Only replace the FIRST occurrence (in the constructor)
    const patched = original.replace(SEARCH, REPLACE);
    fs.writeFileSync(filePath, patched, 'utf-8');
    console.log(`✔ Patched: ${path.relative(process.cwd(), filePath)}`);
    patchedCount++;
}

console.log(`\nSummary: ${patchedCount} patched, ${skippedCount} skipped, ${errorCount} errors`);
if (errorCount > 0) {
    process.exit(1);
}
