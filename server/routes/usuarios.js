const express = require("express");
const pool = require("../db");
const bcrypt = require('bcrypt');

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

    const senhaCriptografada = await bcrypt.hash(senha, 10);
    // usa senhaCriptografada no lugar de senha no INSERT
    const query = `
      INSERT INTO usuarios (nome, email, login, senha, perfil) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `;

    const result = await pool.query(query, [nome, email, login, senhaCriptografada, perfil]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao inserir usuário", detalhes: err.message });
  }
});

// ATUALIZAR USUÁRIO
router.put("/:id", async (req, res) => {
  const { nome, email, login, senha, perfil } = req.body;
  
  let query, params;

  if (senha && senha.trim() !== "") {
    // Admin digitou nova senha — encripta e salva
    const hash = await bcrypt.hash(senha, 10);
    query = `UPDATE usuarios SET nome=$1, email=$2, login=$3, senha=$4, perfil=$5 WHERE id=$6 RETURNING *`;
    params = [nome, email, login, hash, perfil, req.params.id];
  } else {
    // Campo vazio — mantém a senha atual
    query = `UPDATE usuarios SET nome=$1, email=$2, login=$3, perfil=$4 WHERE id=$5 RETURNING *`;
    params = [nome, email, login, perfil, req.params.id];
  }

  const result = await pool.query(query, params);
  res.json(result.rows[0]);
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

    // Busca o usuário só pelo login
    const result = await pool.query(
      "SELECT id, nome, perfil, senha FROM usuarios WHERE login = $1",
      [login]
    );

    // Se não encontrou o login
    if (result.rows.length === 0) {
      return res.status(401).json({ sucesso: false });
    }

    const usuario = result.rows[0];

    // Compara a senha digitada com o hash salvo no banco
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return res.status(401).json({ sucesso: false });
    }

    // Sucesso — não retorna a senha!
    res.json({ sucesso: true, nome: usuario.nome, perfil: usuario.perfil });

  } catch (err) {
    console.error("ERRO NA ROTA LOGIN:", err.message);
    res.status(500).json({ sucesso: false, error: err.message });
  }
});

module.exports = router;