document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('form-login');
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usuario = document.getElementById('usuario').value;
        const senha = document.getElementById('senha').value;
        const btn = document.getElementById('btn-entrar');

        btn.disabled = true;
        btn.innerHTML = 'Autenticando...';

        try {
            const response = await fetch('http://localhost:3000/usuarios/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: usuario, senha })
            });

            const dados = await response.json();

            if (dados.sucesso) {
                localStorage.setItem('usuarioLogado', 'true');
                localStorage.setItem('nomeUsuario', dados.nome);
                localStorage.setItem('perfilUsuario', dados.perfil);

                window.location.href = '../menu/menu.html';
            } else {
                exibirDialogo("Falha no Login", "Login ou senha incorretos. Tente novamente.");
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="log-in"></i> Entrar no Sistema';
                lucide.createIcons();
            }
        } catch (error) {
            console.error('Erro no login:', error);
            exibirDialogo("Erro de Conexão", "Não foi possível conectar ao servidor. Tente novamente mais tarde.");
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="log-in"></i> Entrar no Sistema';
            lucide.createIcons();
        }
    });
});

function exibirDialogo(titulo, mensagem, tipo = "alert") {
    return new Promise((resolve) => {
        const modalAviso = document.getElementById('modal-aviso-container');
        document.getElementById('aviso-titulo').innerText = titulo;
        document.getElementById('aviso-texto').innerText = mensagem;
        document.getElementById('btn-aviso-cancelar').style.display = (tipo === "alert") ? "none" : "block";
        modalAviso.style.display = "flex";

        document.getElementById('btn-aviso-ok').onclick = () => { modalAviso.style.display = "none"; resolve(true); };
        document.getElementById('btn-aviso-cancelar').onclick = () => { modalAviso.style.display = "none"; resolve(false); };
    });
}