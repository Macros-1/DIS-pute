const express = require('express');
const { execSync } = require('child_process');
const path = require('path');
const si = require('systeminformation');
const open = (...args) => import('open').then(({default: open}) => open(...args));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'ui')));

// Docker Engine Verification
app.get('/docker-check', (req, res) => {
    try {
        execSync('docker info', { stdio: 'ignore' });
        res.json({ docker: true });
    } catch (e) {
        res.json({ docker: false });
    }
});

app.get('/start/:role', (req, res) => {
    if (req.params.role === 'master') {
        require('./master/server.js');
        res.sendFile(path.join(__dirname, 'ui/master.html'));
    } else {
        res.sendFile(path.join(__dirname, 'ui/slave.html'));
    }
});

app.post('/connect-master', async (req, res) => {
    const agent = require('./agent/agent.js');
    const result = await agent.connectToMaster(req.body.token);
    res.json(result);
});

app.listen(4999, '0.0.0.0', () => {
    console.log(`Nexus Gateway active on http://localhost:4999`);
    open(`http://localhost:4999`);
});