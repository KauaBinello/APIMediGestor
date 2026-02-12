const express = require("express");
require("dotenv").config();

const cors = require('cors');

const medicamentosRouter = require("./routes/medicamentos");

const app = express();
app.use(cors());
app.use(express.json());


// =====================
// Rotas principais
// =====================
app.use("/medicamentos", medicamentosRouter);

// Rota raiz
app.get("/", (req, res) => {
  res.send("🌎 API de Medicamentos rodando! Acesse a documentação em /api-docs");
});

// =====================
// Servidor
// =====================
const PORT = process.env.PORT || 3000;


app.listen(PORT, "127.0.0.1", () => {
  console.log("✅ Servidor rodando em http://127.0.0.1:3000");
});
