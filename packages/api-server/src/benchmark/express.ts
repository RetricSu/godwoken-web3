import express from "express";

const app = express();
const port = 8024;

app.use(express.json());

app.post("/", (req, res) => {
  res.send({ id: req.body.id, jsonrpc: req.body.jsonrpc, result: "0x1" });
  //res.send("ok");
});

export const startServer = async () => {
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}..`);
  });
};
