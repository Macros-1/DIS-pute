const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3000;

const CLUSTER_KEY = "cluster-secret";

let nodes = [];
let jobs = [];
let jobLogs = {};

/* ---------------------------
NODE REGISTRATION
----------------------------*/

app.post("/register",(req,res)=>{

    if(req.body.key !== CLUSTER_KEY){
        return res.status(403).json({error:"Invalid key"});
    }

    const node={
        id:Date.now(),
        url:req.body.url,
        status:"idle",
        cpu:0,
        memory:0,
        gpu:false,
        lastHeartbeat:Date.now()
    };

    nodes.push(node);

    console.log("Node joined:",node.url);

    res.json({message:"registered"});
});

/* ---------------------------
METRICS
----------------------------*/

app.post("/metrics",(req,res)=>{

    const node = nodes.find(n=>n.url===req.body.url);

    if(node){

        node.cpu=req.body.cpu;
        node.memory=req.body.memory;
        node.gpu=req.body.gpu;
        node.lastHeartbeat=Date.now();

    }

    res.json({status:"ok"});
});

/* ---------------------------
JOB SUBMIT
----------------------------*/

app.post("/submit",(req,res)=>{

    const job={
        id:Date.now(),
        image:req.body.image,
        command:req.body.command,
        gpu:req.body.gpu||false,
        priority:req.body.priority||"normal",
        status:"queued"
    };

    jobs.push(job);

    console.log("Job added:",job.id);

    res.json({job});
});

/* ---------------------------
JOB REQUEST (PULL MODEL)
----------------------------*/

app.post("/request-job",(req,res)=>{

    const node = nodes.find(n=>n.url===req.body.url);

    if(!node) return res.json({job:null});

    if(jobs.length===0) return res.json({job:null});

    jobs.sort((a,b)=>{
        const p={high:3,normal:2,low:1};
        return p[b.priority]-p[a.priority];
    });

    const job = jobs.shift();

    if(job.gpu && !node.gpu){
        jobs.push(job);
        return res.json({job:null});
    }

    node.status="busy";

    res.json({job});
});

/* ---------------------------
JOB LOGS
----------------------------*/

app.post("/logs",(req,res)=>{

    const {jobId,log}=req.body;

    if(!jobLogs[jobId]) jobLogs[jobId]=[];

    jobLogs[jobId].push(log);

    res.json({status:"stored"});
});

/* ---------------------------
DASHBOARD APIs
----------------------------*/

app.get("/nodes",(req,res)=>res.json(nodes));

app.get("/jobs",(req,res)=>res.json(jobs));

app.get("/logs/:id",(req,res)=>{

    res.json(jobLogs[req.params.id]||[]);

});

app.get("/cluster",(req,res)=>{

    res.json({
        nodes:nodes.length,
        queuedJobs:jobs.length
    });

});

/* ---------------------------
NODE HEALTH CHECK
----------------------------*/

function checkNodes(){

    const now = Date.now();

    nodes.forEach(node=>{

        if(now-node.lastHeartbeat>15000){

            node.status="dead";

            console.log("Node offline:",node.url);

        }

    });

}

setInterval(checkNodes,5000);

/* ---------------------------
START
----------------------------*/

app.listen(PORT,()=>{

    console.log("Master running on port",PORT);

});