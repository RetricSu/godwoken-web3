import Fastify from "fastify";

export function startServer(port: number = 8024) {
  const fastify = Fastify({
    logger: false,
  });

  fastify.post("/", (req: any, res: any) => {
    res.send({ id: req.body.id, jsonrpc: req.body.jsonrpc, result: "0x1" });
  });

  // Run the server!
  fastify.listen({ port }, (err, address) => {
    if (err) throw err;
    console.log(`Server is now listening on ${address}`);
  });
}
