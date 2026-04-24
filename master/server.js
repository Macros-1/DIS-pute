const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const localtunnel = require("localtunnel");
const Docker = require("dockerode");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(cors());

// --- FOLDER PATHING ---
const UI_PATH = path.join(__dirname, "..", "ui");
app.use(express.static(UI_PATH));

// Docker configuration with platform check
const isWin = process.platform === "win32";
const docker = new Docker(isWin ? { socketPath: '//./pipe/docker_engine' } : { socketPath: '/var/run/docker.sock' });

// --- UI ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(UI_PATH, 'index.html')));
app.get('/start/master', (req, res) => res.sendFile(path.join(UI_PATH, 'master.html')));
app.get('/start/slave', (req, res) => res.sendFile(path.join(UI_PATH, 'slave.html')));

// --- DOCKER CHECK ROUTE ---
app.get('/docker-check', async (req, res) => {
    try {
        await Promise.race([
            docker.ping(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
        ]);
        res.json({ docker: true });
    } catch (e) {
        res.json({ docker: false });
    }
});

let nodes = [];
let publicUrl = "";
const CLUSTER_KEY = "nexus_v5_pro";

// --- TUNNEL SETUP ---
async function startTunnel(port) {
    try {
        const tunnel = await localtunnel({ 
            port: port, 
            subdomain: "nexus-master-" + Math.floor(Math.random() * 1000) 
        });
        publicUrl = tunnel.url;
        console.log(`\n🌍 EXTERNAL ACCESS ENABLED`);
        console.log(`🔗 PUBLIC URL: ${publicUrl}`);
        console.log(`------------------------------------\n`);
        
        tunnel.on('close', () => { 
            console.log("⚠️ Tunnel closed. Re-opening...");
            startTunnel(port); // Basic auto-restart for tunnel
        });
    } catch (err) {
        console.error("Tunnel error:", err);
    }
}

// --- API ENDPOINTS ---
app.get("/generate-token", (req, res) => {
    const target = publicUrl || `http://localhost:${PORT}`;
    const token = Buffer.from(`${target}:${CLUSTER_KEY}`).toString('base64');
    res.json({ token, publicUrl: target });
});

app.post("/register", (req, res) => {
    const { key, id, name, dockerStatus } = req.body;

    if (key !== CLUSTER_KEY) {
        console.log(`❌ Unauthorized connection attempt from ${name}`);
        return res.status(403).json({ success: false, message: "Invalid Cluster Key" });
    }

    const node = { 
        id,
        name,
        dockerStatus,
        status: "free", 
        lastSeen: Date.now(),
        cpu: "0", 
        mem: "0%", 
        gpu: "N/A" 
    };

    // Replace node if ID exists, otherwise push new
    const index = nodes.findIndex(n => n.id === id);
    if (index !== -1) {
        nodes[index] = node;
    } else {
        nodes.push(node);
    }
    
    io.emit('node_list_updated', nodes);
    res.json({ success: true, message: "Registered successfully" });
});

app.post("/metrics", (req, res) => {
    const node = nodes.find(n => n.id === req.body.id);
    if (node) {
        // Update data and refresh lastSeen timestamp
        Object.assign(node, req.body, { lastSeen: Date.now() });
        io.emit('node_list_updated', nodes);
    }
    res.send("ok");
});

// --- SOCKET CONNECTION ---
io.on('connection', (socket) => {
    socket.emit('node_list_updated', nodes);
});

// --- NODE CLEANUP ---
setInterval(() => {
    const now = Date.now();
    const activeNodes = nodes.filter(n => (now - n.lastSeen) < 10000);
    
    if (activeNodes.length !== nodes.length) {
        nodes = activeNodes;
        io.emit('node_list_updated', nodes);
    }
}, 5000);

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Master running at http://localhost:${PORT}`);
    startTunnel(PORT);
});