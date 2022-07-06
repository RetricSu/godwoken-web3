import cluster from "cluster";
import { cpus } from "os";

export function enableCluster(startServer: any) {
  const numCPUs = cpus().length;
  const numOfCluster = numCPUs;

  if (cluster.isMaster) {
    // Fork workers.
    for (let i = 0; i < numOfCluster; i++) {
      cluster.fork();
    }

    cluster.on("exit", (worker, _code, _signal) => {
      console.info(`worker ${worker.process.pid} died`);
    });
  } else {
    startServer();
    console.info(`Worker ${process.pid} started`);
  }
}
