const express = require("express");
const Docker = require("dockerode");
const axios = require("axios");

const docker = new Docker();
const app = express();

app.use(express.json());

const MASTER="http://localhost:3000";
const WORKER="http://localhost:4000";

/* -------------------------
RUN JOB
--------------------------*/

app.post("/run",async(req,res)=>{

    const job=req.body;

    try{

        const container = await docker.createContainer({

            Image:job.image,
            Cmd:job.command,
            Tty:false

        });

        await container.start();

        const stream = await container.logs({

            stdout:true,
            stderr:true,
            follow:true

        });

        stream.on("data",async(chunk)=>{

            const log=chunk.toString();

            console.log(log);

            await axios.post(`${MASTER}/logs`,{

                jobId:job.id,
                log:log

            });

        });

        container.wait().then(async()=>{

            console.log("Job finished");

            await axios.post(`${MASTER}/metrics`,{

                url:WORKER,
                cpu:0,
                memory:0

            });

        });

        res.json({status:"started"});

    }catch(err){

        console.log(err);

        res.status(500).json({error:"failed"});

    }

});

app.listen(4000,()=>{

    console.log("Worker executor running on 4000");

});