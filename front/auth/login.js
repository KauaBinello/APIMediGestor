document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('form-login');

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usuario = document.getElementById('usuario').value;
        const senha = document.getElementById('senha').value;
        const btn = document.getElementById('btn-entrar');

        // Feedback visual de carregamento
        btn.disabled = true;
        btn.innerHTML = 'Autenticando...';

        try {
            // 1. Buscamos todos os usuários (sem filtros na URL para evitar erro do servidor)
            const response = await fetch(`http://localhost:3000/usuarios`);
            const listaUsuarios = await response.json();

            // 2. Fazemos a conferência MANUALMENTE aqui no JS
            // Isso garante que se o login/senha estiverem errados, ele NÃO entra
            const usuarioValido = listaUsuarios.find(u =>
                u.login === usuario && u.senha === senha
            );

            if (usuarioValido) {
                // SUCESSO
                localStorage.setItem('usuarioLogado', 'true');
                localStorage.setItem('nomeUsuario', usuarioValido.nome);
                localStorage.setItem('perfilUsuario', usuarioValido.perfil);

                window.location.href = '../menu/menu.html';
            } else {
                // ERRO: Aqui ele vai cair se o login/senha não existirem ou estiverem errados
                alert('Usuário ou senha incorretos!');
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="log-in"></i> Entrar no Sistema';
                lucide.createIcons();
            }

        } catch (error) {
            console.error('Erro no login:', error);
            alert('Servidor offline ou erro de conexão.');
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="log-in"></i> Entrar no Sistema';
            lucide.createIcons();
        }
    });
});