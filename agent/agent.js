const axios = require("axios");
const si = require("systeminformation");
const os = require("os");
const { io } = require("socket.io-client");
const Docker = require("dockerode");
const express = require("express");
const cors = require("cors");

// --- INITIALIZATION ---
const isWin = process.platform === "win32";
const docker = new Docker(isWin ? { socketPath: '//./pipe/docker_engine' } : { socketPath: '/var/run/docker.sock' });

let MASTER_URL = "";
let CLUSTER_KEY = "";
let socket = null;
const NODE_ID = os.hostname() + "_" + Math.random().toString(36).substr(2, 5);

// --- DOCKER HARD-LOCK ---
async function verifyDocker() {
    return new Promise((resolve) => {
        const t = setTimeout(() => {
            console.log("⚠️ Docker Ping Timeout");
            resolve(false);
        }, 2000);

        docker.ping()
            .then(() => { 
                clearTimeout(t); 
                resolve(true); 
            })
            .catch(() => { 
                clearTimeout(t); 
                resolve(false); 
            });
    });
}

// --- MAIN CONNECTION LOGIC ---
async function connectToMaster(token) {
    const isDockerReady = await verifyDocker();
    if (!isDockerReady) return { success: false, message: "DOCKER_OFFLINE" };

    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [url, key] = decoded.split(/:(.+)/); 
        
        MASTER_URL = url;
        CLUSTER_KEY = key;

        socket = io(MASTER_URL, { 
            extraHeaders: { "Bypass-Tunnel-Reminder": "true" },
            reconnection: true,
            reconnectionAttempts: 10,
            timeout: 10000 
        });

        socket.on('connect', () => console.log("📡 Socket connected to Master"));
        socket.on('disconnect', () => console.log("🔌 Socket disconnected"));

        await axios.post(`${MASTER_URL}/register`, {
            id: NODE_ID,
            key: CLUSTER_KEY,
            name: os.hostname(),
            dockerStatus: true
        }, { 
            headers: { "Bypass-Tunnel-Reminder": "true" },
            timeout: 5000
        });

        setInterval(syncStats, 3000);
        
        console.log(`🚀 Node Linked: ${os.hostname()} -> ${MASTER_URL}`);
        return { success: true };
    } catch (e) {
        console.error("❌ Connection Failed:", e.message);
        return { success: false, message: "COULD_NOT_REACH_MASTER" };
    }
}

// --- HARDWARE METRICS SYNC ---
async function syncStats() {
    if (!MASTER_URL) return;

    try {
        const load = await si.currentLoad();
        const mem = await si.mem();
        const graphics = await si.graphics();
        const dockerOnline = await verifyDocker();
        
        let gpuInfo = "N/A";
        if (graphics.controllers && graphics.controllers.length > 0) {
            const gpu = graphics.controllers[0];
            const loadGpu = gpu.utilizationGpu || 0;
            gpuInfo = `${gpu.model} (${loadGpu}%)`;
        }

        await axios.post(`${MASTER_URL}/metrics`, {
            id: NODE_ID,
            cpu: load.currentLoad.toFixed(1),
            mem: ((mem.active / mem.total) * 100).toFixed(1) + "%",
            gpu: gpuInfo,
            dockerStatus: dockerOnline
        }, { 
            headers: { "Bypass-Tunnel-Reminder": "true" },
            timeout: 2000 
        });

    } catch (err) {}
}

// --- EXPRESS BRIDGE (Port 4000) ---
const app = express();
app.use(cors());
app.use(express.json());

app.post('/connect-master', async (req, res) => {
    console.log("📩 Received connection command from UI...");
    const result = await connectToMaster(req.body.token);
    res.json(result);
});

const AGENT_INTERFACE_PORT = 4000;
app.listen(AGENT_INTERFACE_PORT, () => {
    console.log(`\n🤖 NEXUS AGENT INTERFACE ONLINE`);
    console.log(`📡 Listening for UI commands on Port ${AGENT_INTERFACE_PORT}`);
    console.log(`----------------------------------------------`);
});

module.exports = { connectToMaster };