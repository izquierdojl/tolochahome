import express from "express";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.get("/api/v1/health", (_req, res) => {
  res.json({ ok: true, servicio: "tolochahome" });
});

app.listen(PORT, () => {
  console.log(`TolochaHome API en puerto ${PORT}`);
});
