const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    let { nome, ordem, offset, limit } = req.query;

    nome = nome ? '%' + nome + '%' : '%';
    // Mudei para ASC por padrão para a paginação não inverter a lógica visual
    ordem = ordem && ordem.toLowerCase() === "desc" ? "DESC" : "ASC"; 
    offset = parseInt(offset) || 0;
    limit = parseInt(limit) || 16; // Deixe 16 aqui também para alinhar com o front

    const query = `
      SELECT * FROM medicamentos
      WHERE nome ILIKE $1
      ORDER BY id ${ordem}
      LIMIT $2
      OFFSET $3
    `;

    const result = await pool.query(query, [nome, limit, offset]);
    res.json(result.rows);

  } catch (err) {
    res.status(500).json({
      error: "Erro ao listar medicamentos",
      detalhes: err.message
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(`SELECT 
  id, 
  nome, 
  embalagem, 
  saldo, 
  TO_CHAR(validade, 'YYYY-MM-DD') AS validade
FROM public.medicamentos WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Medicamento não encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar medicamento" })
  }
});


router.post("/", async (req, res) => {
  try {
    const { nome, embalagem, saldo, validade } = req.body;
    if (!nome || !embalagem || !saldo || !validade) return res.status(400).json({ error: "Campos obrigatórios: nome, embalagem, saldo, validade" });

    const result = await pool.query(
      "INSERT INTO medicamentos (nome, embalagem, saldo, validade) VALUES ($1, $2, $3, $4) RETURNING *",
      [nome, embalagem, saldo, validade]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao inserir medicamento", detalhes: err.message })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nome, embalagem, saldo, validade } = req.body;

    const result = await pool.query(
      `UPDATE public.medicamentos
       SET nome = $1,
           embalagem = $2,
           saldo = $3,
           validade = $4
       WHERE id = $5
       RETURNING *`,
      [nome, embalagem, saldo, validade, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Medicamento não encontrado" });

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar medicamento" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const result = await pool.query(
      "DELETE FROM public.medicamentos WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Medicamento não encontrado" });

    res.status(204).send(); // sucesso sem conteúdo

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar medicamento" });
  }
});


module.exports = router;