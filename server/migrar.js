const bcrypt = require('bcrypt');
const pool = require('./db');

async function migrar() {
    const usuarios = await pool.query('SELECT id, senha FROM usuarios');
    for (const u of usuarios.rows) {
        const hash = await bcrypt.hash(u.senha, 10);
        await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [hash, u.id]);
        console.log(`Usuário ${u.id} migrado`);
    }
    console.log('Concluído');
    process.exit();
}
migrar();