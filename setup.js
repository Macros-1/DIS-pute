const { execSync } = require('child_process');
const os = require('os');

console.log("🚀 Nexus Cluster: Dependency Installer");
console.log("---------------------------------------");

const libraries = [
    "express",
    "axios",
    "cors",
    "dockerode",
    "systeminformation",
    "multer",
    "open",
    "localtunnel"
];

try {
    console.log(`System Detected: ${os.type()} (${os.platform()})`);
    console.log("Installing core libraries... This may take a minute.");

    // Runs npm install for all listed libraries
    execSync(`npm install ${libraries.join(' ')}`, { stdio: 'inherit' });

    console.log("\n✅ SUCCESS: All libraries installed.");
    console.log("You can now run 'node launcher.js' on this machine.");
} catch (error) {
    console.error("\n❌ ERROR: Installation failed.");
    console.error("Make sure you have Node.js and NPM installed and try again.");
}