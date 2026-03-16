const axios = require("axios");
const si = require("systeminformation");

const MASTER="http://localhost:3000";
const WORKER="http://localhost:4000";
const KEY="cluster-secret";

/* -----------------------
REGISTER
------------------------*/

async function register(){

    await axios.post(`${MASTER}/register`,{

        url:WORKER,
        key:KEY

    });

    console.log("Worker registered");

}

/* -----------------------
SEND METRICS
------------------------*/

async function sendMetrics(){

    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const g = await si.graphics();

    const gpuAvailable = g.controllers.length>0;

    await axios.post(`${MASTER}/metrics`,{

        url:WORKER,
        cpu:cpu.currentLoad,
        memory:mem.used/mem.total,
        gpu:gpuAvailable

    });

}

/* -----------------------
REQUEST JOB
------------------------*/

async function requestJob(){

    const res = await axios.post(`${MASTER}/request-job`,{

        url:WORKER

    });

    const job=res.data.job;

    if(job){

        console.log("Job received:",job.id);

        await axios.post(`${WORKER}/run`,job);

    }

}

register();

setInterval(sendMetrics,5000);
setInterval(requestJob,3000);