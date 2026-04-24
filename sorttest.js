/**
 * Nexus Cluster Test: Node.js Heavy Sort
 * This script generates 20,000 random numbers and sorts them.
 */

console.log("🚀 Initializing Nexus Node.js Worker...");
const dataSize = 20000;
const data = [];

// 1. Generate Data
console.log(`🎲 Generating ${dataSize.toLocaleString()} random points...`);
for (let i = 0; i < dataSize; i++) {
    data.push(Math.floor(Math.random() * 100000));
}

const startTime = Date.now();
console.log("⚡ Starting Bubble Sort (O(n^2)). This will stress the CPU...");

// 2. Perform Sort
// We use a nested loop to ensure the CPU stays "Busy" long enough for you to see it.
for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data.length - i - 1; j++) {
        if (data[j] > data[j + 1]) {
            [data[j], data[j + 1]] = [data[j + 1], data[j]];
        }
    }

    // Log progress every 10% to keep the Master Dashboard updated
    if (i % (dataSize / 10) === 0 && i !== 0) {
        const percent = ((i / dataSize) * 100).toFixed(0);
        console.log(`⏳ Progress: ${percent}% complete...`);
    }
}

const duration = ((Date.now() - startTime) / 1000).toFixed(2);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`✅ SUCCESS: Sort completed in ${duration} seconds.`);
console.log(`📊 First 5 results: ${data.slice(0, 5).join(", ")}`);