import autocannon from "autocannon";

export async function cannon() {
  const result = await autocannon({
    url: "http://localhost:8024",
    connections: 100, //default
    pipelining: 10, // default
    duration: 40, // default
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: `{"jsonrpc":"2.0","id":"[<id>]","method":"eth_blockNumber","params":[]}`,
    idReplacement: true,
  });

  console.log(result);
  console.log("TPS: ", result.requests.average);
  console.log("----------");
}
