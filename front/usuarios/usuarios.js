const API = 'http://localhost:3000/usuarios'; // Ajustado para a tabela usuários
const limit = 12;
let offset = 0;
let idEmEdicao = null;

const corpoTabela = document.getElementById('corpo-tabela');
const campoBusca = document.getElementById('campo-pesquisa');
const modal = document.getElementById('modal-container');

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btnPaginacao").addEventListener("click", () => atualizarUsuarios("mais"));
    document.getElementById("btnPaginacaoMenos").addEventListener("click", () => atualizarUsuarios("menos"));
    document.getElementById("cadastrar-novo").addEventListener("click", novoUsuario);
    document.getElementById("btn-salvar").addEventListener("click", salvarEdicao);
    document.getElementById("btn-limpar").addEventListener("click", limparCampos);
    document.getElementById("btn-fechar-modal").addEventListener("click", fecharModal);

    campoBusca.addEventListener("input", filtrarUsuarios);
    
    atualizarUsuarios("inicio");
});

async function atualizarUsuarios(acao = "") {
    if (acao === "inicio") offset = 0;
    if (acao === "mais") offset += limit;
    if (acao === "menos") offset = Math.max(0, offset - limit);

    try {
        const resposta = await fetch(`${API}?limit=${limit}&offset=${offset}&_sort=id&_order=asc`);
        const dados = await resposta.json();
        
        if (dados.length === 0 && acao === "mais") { 
            offset -= limit; 
            return; 
        }

        renderizarTabela(dados);
        
        document.getElementById("btnPaginacaoMenos").disabled = offset === 0;
        document.getElementById("btnPaginacao").disabled = dados.length < limit;
    } catch (erro) { 
        console.error("Erro ao buscar usuários:", erro); 
    }
}

function renderizarTabela(lista) {
    corpoTabela.innerHTML = "";
    lista.forEach(u => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${u.id}</td>
            <td><strong>${u.nome}</strong></td>
            <td>${u.email}</td>
            <td>${u.login}</td>
            <td>${u.perfil}</td>
            <td style="text-align: center;">
                <button class="btn-editar" style="background:none; color:var(--color-primary); border:none; cursor:pointer;">
                    <i data-lucide="edit-3"></i>
                </button>
                <button class="btn-deletar" style="background:none; color:#d9534f; border:none; cursor:pointer;">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>`;

        tr.querySelector('.btn-editar').addEventListener('click', () => modalEdicao(u.id));
        tr.querySelector('.btn-deletar').addEventListener('click', () => deletar(u.id));

        corpoTabela.appendChild(tr);
    });
    
    if (window.lucide) lucide.createIcons();
}

function filtrarUsuarios() {
    const termo = campoBusca.value;
    offset = 0;
    fetch(`${API}?nome=${termo}&limit=${limit}&offset=${offset}`)
        .then(res => res.json())
        .then(dados => renderizarTabela(dados));
}

function novoUsuario() {
    idEmEdicao = null;
    document.getElementById("tituloModal").innerText = "Novo Usuário";
    limparCampos();
    modal.style.display = "flex";
}

async function modalEdicao(id) {
    idEmEdicao = id;
    document.getElementById("tituloModal").innerText = "Editar Usuário";
    
    try {
        const res = await fetch(`${API}/${id}`);
        const u = await res.json();

        document.getElementById("editNome").value = u.nome || "";
        document.getElementById("editEmail").value = u.email || "";
        document.getElementById("editLogin").value = u.login || "";
        document.getElementById("editSenha").value = u.senha || "";
        document.getElementById("editPerfil").value = u.perfil || "Usuário";

        modal.style.display = "flex";
    } catch {
        exibirDialogo("Erro", "Erro ao carregar dados do usuário.");
    }
}

async function salvarEdicao() {
    const usuario = {
        nome: document.getElementById("editNome").value.trim(),
        email: document.getElementById("editEmail").value.trim(),
        login: document.getElementById("editLogin").value.trim(),
        senha: document.getElementById("editSenha").value.trim(),
        perfil: document.getElementById("editPerfil").value
    };

    if (!usuario.nome || !usuario.login) {
        return exibirDialogo("Atenção", "Nome e Login são obrigatórios.");
    }

    const metodo = idEmEdicao ? "PUT" : "POST";
    const url = idEmEdicao ? `${API}/${idEmEdicao}` : API;

    try {
        const res = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(usuario)
        });

        if (res.ok) {
            fecharModal();
            atualizarUsuarios();
            exibirDialogo("Sucesso", "Usuário salvo com sucesso!");
        }
    } catch {
        exibirDialogo("Erro", "Erro ao conectar com o servidor.");
    }
}

async function deletar(id) {
    const confirma = await exibirDialogo("Confirmar", "Excluir este usuário?", "confirm");
    if (confirma) {
        try {
            const res = await fetch(`${API}/${id}`, { method: "DELETE" });
            if (res.ok) {
                atualizarUsuarios();
                exibirDialogo("Sucesso", "Usuário removido.");
            }
        } catch (erro) {
            console.error(erro);
        }
    }
}

function fecharModal() { modal.style.display = "none"; }

function limparCampos() {
    ["editNome", "editEmail", "editLogin", "editSenha", "editPerfil"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = (id === "editPerfil") ? "Usuário" : "";
    });
}

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