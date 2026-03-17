const express = require("express");
const pool = require("../db");

const router = express.Router();

// LISTAR CLIENTES (Com busca e paginação)
router.get("/", async (req, res) => {
  try {
    let { nome, offset, limit } = req.query;

    nome = nome ? '%' + nome + '%' : '%';
    offset = parseInt(offset) || 0;
    limit = parseInt(limit) || 16;

    const query = `
      SELECT 
        id, nome, cpf, telefone, 
        TO_CHAR(nascimento, 'YYYY-MM-DD') AS nascimento, 
        endereco, numero_residencial, bairro, cidade, uf
      FROM clientes
      WHERE nome ILIKE $1
      ORDER BY id ASC
      LIMIT $2
      OFFSET $3
    `;

    const result = await pool.query(query, [nome, limit, offset]);
    res.json(result.rows);

  } catch (err) {
    res.status(500).json({
      error: "Erro ao listar clientes",
      detalhes: err.message
    });
  }
});

// BUSCAR UM CLIENTE PELO ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const query = `
      SELECT 
        id, nome, cpf, telefone, 
        TO_CHAR(nascimento, 'YYYY-MM-DD') AS nascimento, 
        endereco, numero_residencial, bairro, cidade, uf
      FROM clientes 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
        return res.status(404).json({ error: "Cliente não encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar cliente" });
  }
});

// INSERIR NOVO CLIENTE
router.post("/", async (req, res) => {
  try {
    const { 
        nome, cpf, telefone, nascimento, 
        endereco, numero_residencial, bairro, cidade, uf 
    } = req.body;

    // Validação básica
    if (!nome || !cpf) {
        return res.status(400).json({ error: "Nome e CPF são obrigatórios" });
    }

    const query = `
      INSERT INTO clientes 
      (nome, cpf, telefone, nascimento, endereco, numero_residencial, bairro, cidade, uf) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *
    `;

    const result = await pool.query(query, [
        nome, cpf, telefone, nascimento, 
        endereco, numero_residencial, bairro, cidade, uf
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao inserir cliente", detalhes: err.message });
  }
});

// ATUALIZAR CLIENTE
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { 
        nome, cpf, telefone, nascimento, 
        endereco, numero_residencial, bairro, cidade, uf 
    } = req.body;

    const query = `
      UPDATE clientes
      SET nome = $1, cpf = $2, telefone = $3, nascimento = $4, 
          endereco = $5, numero_residencial = $6, bairro = $7, 
          cidade = $8, uf = $9
      WHERE id = $10
      RETURNING *
    `;

    const result = await pool.query(query, [
        nome, cpf, telefone, nascimento, 
        endereco, numero_residencial, bairro, cidade, uf, 
        id
    ]);

    if (result.rows.length === 0) {
        return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar cliente" });
  }
});

// DELETAR CLIENTE
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(
      "DELETE FROM public.clientes WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Cliente não encontrado" });

    res.status(204).send(); // sucesso sem conteúdo

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar cliente" });
  }
});
module.exports = router;