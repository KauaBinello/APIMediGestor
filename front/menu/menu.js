// --- TRAVA DE SEGURANÇA REFORÇADA ---
if (localStorage.getItem('usuarioLogado') !== 'true') {
    window.location.href = '../auth/login.html';
    // Para a execução de todo o resto do script
    throw new Error("Acesso não autorizado");
}

document.addEventListener('DOMContentLoaded', () => {
    const nome = localStorage.getItem('nomeUsuario');
    const perfil = localStorage.getItem('perfilUsuario');
    const displayNome = document.getElementById('nome-usuario-display');
    const displayPerfil = document.getElementById('perfil-exibicao'); // Crie esse ID no HTML

    // Atualiza os textos do card
    if (displayNome) displayNome.innerText = nome;
    if (displayPerfil) displayPerfil.innerText = perfil === 'Administrador' ? 'Administrador' : 'Operador';

    // LÓGICA DE PERMISSÃO
    if (perfil === 'Administrador') {
        const btnUsuarios = document.getElementById('btn-usuarios');
        if (btnUsuarios) btnUsuarios.style.display = 'block'; // Mostra só pro ADM
    }

    // Lógica de Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.clear(); // Limpa tudo
            window.location.href = '../auth/login.html';
        });
    }
});