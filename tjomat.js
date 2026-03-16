const axios = require("axios");

const MASTER = "http://localhost:3000";

async function submitJob(){

    try{

        const res = await axios.post(`${MASTER}/submit`,{

            image:"node:latest",

            command:[
                "node",
                "-e",
                "console.log('Hello from distributed cluster')"
            ],

            priority:"normal",

            gpu:false

        });

        console.log("Job submitted:");
        console.log(res.data);

    }catch(err){

        console.log("Submission failed:",err.message);

    }

}

submitJob();