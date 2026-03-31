const express = require("express");
const pool = require("../db");
const router = express.Router();

// LISTAR MEDICAMENTOS (Com busca e paginação)
router.get("/", async (req, res) => {
  try {
    let { nome, ordem, offset, limit } = req.query;
    nome = nome ? '%' + nome + '%' : '%';
    ordem = ordem && ordem.toLowerCase() === "desc" ? "DESC" : "ASC"; 
    offset = parseInt(offset) || 0;
    limit = parseInt(limit) || 12;

    const query = `
      SELECT id, nome, concentracao, unidade_concentracao, 
             quantidade_embalagem, tipo_unidade, saldo, 
             TO_CHAR(validade, 'YYYY-MM-DD') AS validade
      FROM medicamentos
      WHERE nome ILIKE $1
      ORDER BY nome ${ordem}
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [nome, limit, offset]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar", detalhes: err.message });
  }
});

// BUSCAR UM POR ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(`
      SELECT id, nome, concentracao, unidade_concentracao, 
             quantidade_embalagem, tipo_unidade, saldo, 
             TO_CHAR(validade, 'YYYY-MM-DD') AS validade 
      FROM medicamentos WHERE id = $1`, [id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: "Não encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar" });
  }
});

// INSERIR NOVO
router.post("/", async (req, res) => {
  try {
    const { nome, concentracao, unidade_concentracao, quantidade_embalagem, tipo_unidade, saldo, validade } = req.body;
    const result = await pool.query(
      `INSERT INTO medicamentos 
       (nome, concentracao, unidade_concentracao, quantidade_embalagem, tipo_unidade, saldo, validade) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nome, concentracao, unidade_concentracao, quantidade_embalagem, tipo_unidade, saldo, validade]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao inserir", detalhes: err.message });
  }
});

// ATUALIZAR
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nome, concentracao, unidade_concentracao, quantidade_embalagem, tipo_unidade, saldo, validade } = req.body;
    const result = await pool.query(
      `UPDATE medicamentos
       SET nome = $1, concentracao = $2, unidade_concentracao = $3, 
           quantidade_embalagem = $4, tipo_unidade = $5, saldo = $6, validade = $7
       WHERE id = $8 RETURNING *`,
      [nome, concentracao, unidade_concentracao, quantidade_embalagem, tipo_unidade, saldo, validade, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar" });
  }
});

// DELETAR
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await pool.query("DELETE FROM medicamentos WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar" });
  }
});

module.exports = router;