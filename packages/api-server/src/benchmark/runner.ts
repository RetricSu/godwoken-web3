import { startServer as express } from "./express";
//import { startServer as fastify } from "./fastify";
import { Middleware } from "../app/app";
import { main } from "../app/cluster";
//import { cannon } from "./cannon";
import { enableCluster } from "./cluster";

export async function run() {
  // console.log("raw express -->");
  // enableCluster(express);
  // await asyncSleep(10000);
  // await cannon();

  // console.log("raw express -->");
  // enableCluster(fastify);
  // await cannon();

  const enableCluster = true;
  const features = [
    //Middleware.logger,
    Middleware.json,
    Middleware.cors,
    Middleware.errorHandler,
    Middleware.rateLimit,
    Middleware.urlEncode,
    Middleware.ws,
  ];
  console.log(`${enableCluster ? "Multi" : "Single"} Thread Web3 Server`);
  main(enableCluster, features);
  // await asyncSleep();
  // console.log("start serve ok...");
  // await cannon();

  //process.exit(0);
}

// const asyncSleep = async (ms = 30000) => {
//   return new Promise((r) => setTimeout(() => r("ok"), ms));
// };
