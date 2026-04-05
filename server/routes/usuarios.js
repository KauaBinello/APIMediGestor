const express = require("express");
const pool = require("../db");

const router = express.Router();

// LISTAR USUÁRIOS (Com busca por nome e paginação)
router.get("/", async (req, res) => {
  try {
    let { nome, offset, limit } = req.query;

    nome = nome ? '%' + nome + '%' : '%';
    offset = parseInt(offset) || 0;
    limit = parseInt(limit) || 16;

    const query = `
      SELECT id, nome, email, login, senha, perfil
      FROM usuarios
      WHERE nome ILIKE $1
      ORDER BY id ASC
      LIMIT $2
      OFFSET $3
    `;

    const result = await pool.query(query, [nome, limit, offset]);
    res.json(result.rows);

  } catch (err) {
    res.status(500).json({
      error: "Erro ao listar usuários",
      detalhes: err.message
    });
  }
});

// BUSCAR UM USUÁRIO ESPECÍFICO PELO ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const query = "SELECT id, nome, email, login, senha, perfil FROM usuarios WHERE id = $1";

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

// INSERIR NOVO USUÁRIO
router.post("/", async (req, res) => {
  try {
    const { nome, email, login, senha, perfil } = req.body;

    // Validação de campos obrigatórios conforme a tabela
    if (!nome || !login || !senha || !perfil) {
      return res.status(400).json({ error: "Campos nome, login, senha e perfil são obrigatórios" });
    }

    const query = `
      INSERT INTO usuarios (nome, email, login, senha, perfil) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `;

    const result = await pool.query(query, [nome, email, login, senha, perfil]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao inserir usuário", detalhes: err.message });
  }
});

// ATUALIZAR USUÁRIO
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nome, email, login, senha, perfil } = req.body;

    const query = `
      UPDATE usuarios
      SET nome = $1, email = $2, login = $3, senha = $4, perfil = $5
      WHERE id = $6
      RETURNING *
    `;

    const result = await pool.query(query, [nome, email, login, senha, perfil, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
});

// DELETAR USUÁRIO
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query("DELETE FROM usuarios WHERE id = $1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar usuário" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { login, senha } = req.body;
    console.log("Recebido:", { login, senha });
    const result = await pool.query(
      "SELECT id, nome, perfil FROM usuarios WHERE login = $1 AND senha = $2",
      [login, senha]
    );
    console.log("Resultado:", result.rows);
    if (result.rows.length === 0) {
      return res.status(401).json({ sucesso: false });
    }
    res.json({ sucesso: true, nome: result.rows[0].nome, perfil: result.rows[0].perfil });
  } catch (err) {
    console.error("ERRO NA ROTA LOGIN:", err.message); // <- adiciona isso
    res.status(500).json({ sucesso: false, error: err.message });
  }
});

module.exports = router;