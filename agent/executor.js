const express = require("express");
const Docker = require("dockerode");
const axios = require("axios");

const isWin = process.platform === "win32";
const docker = new Docker(isWin ? { socketPath: '//./pipe/docker_engine' } : { socketPath: '/var/run/docker.sock' });
const app = express();
app.use(express.json());

let agentSocket = null; // To hold the socket passed from agent.js

// Function to allow agent.js to pass the socket connection
const setSocket = (socket) => {
    agentSocket = socket;
};

app.post("/run", async (req, res) => {
    const { job, masterUrl, slaveUrl } = req.body;
    const startTime = Date.now();
    const image = job.type === "node" ? "node:18-alpine" : "python:3.9-slim";

    try {
        global.NODE_STATUS = "busy";
        res.json({ status: "executing" });

        // 1. Pull Image (with progress updates)
        await new Promise((resolve, reject) => {
            docker.pull(image, (err, stream) => {
                if (err) return reject(err);
                docker.modem.followProgress(stream, (e) => e ? reject(e) : resolve());
            });
        });

        // 2. Create Container
        const container = await docker.createContainer({
            Image: image,
            Cmd: job.type === "node" 
                ? ["node", "-e", "console.log('Environment Ready...'); setTimeout(()=>console.log('Processing Job...'), 1000); setTimeout(()=>console.log('Done!'), 2000)"] 
                : ["python", "-c", "import time; print('Environment Ready...'); time.sleep(1); print('Processing Job...'); time.sleep(1); print('Done!')"],
            Tty: true // Makes output easier to read in the UI
        });

        
        const container = await docker.createContainer({
    Image: "linuxserver/blender:latest", // Use a Blender-ready image
    Cmd: ["python3", "/path/to/gpu_test.py"],
    Tty: true,
    HostConfig: {
        DeviceRequests: [
            {
                Driver: "nvidia", // This is the secret sauce for GPU access
                Count: -1, // Use all available GPUs
                Capabilities: [["gpu"]]
            }
        ]
    }
});

        // 3. ATTACH TO LOGS (The Output Tab Logic)
        const stream = await container.attach({
            stream: true,
            stdout: true,
            stderr: true
        });

        // Pipe stream data to the Master via Sockets
        stream.on('data', (chunk) => {
            const text = chunk.toString();
            if (agentSocket) {
                agentSocket.emit('job_stream', {
                    jobId: job.id,
                    text: text,
                    type: 'output'
                });
            }
        });

        // 4. Start and Wait
        await container.start();
        await container.wait();

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const logMsg = `DONE | Job:#${job.id} | File:${job.fileName} | Duration:${duration}s`;

        // Final summary to Master via HTTP (with tunnel bypass)
        await axios.post(`${masterUrl}/metrics`, {
            url: slaveUrl,
            logs: logMsg,
            logType: "summary",
            status: "free"
        }, {
            headers: { "Bypass-Tunnel-Reminder": "true" }
        });

        global.NODE_STATUS = "free";
        await container.remove();

    } catch (e) {
        console.error("Execution Error:", e.message);
        global.NODE_STATUS = "free";
        axios.post(`${masterUrl}/metrics`, { 
            url: slaveUrl, 
            logs: "Fail: " + e.message, 
            status: "free" 
        }, {
            headers: { "Bypass-Tunnel-Reminder": "true" }
        });
    }
});

app.listen(4000);

// Exporting so agent.js can inject the socket
module.exports = { setSocket };