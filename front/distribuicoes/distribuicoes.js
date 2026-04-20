// ================================================
// TRAVA DE SEGURANÇA
// ================================================
if (localStorage.getItem('usuarioLogado') !== 'true') {
    window.location.href = '../auth/login.html';
    throw new Error("Acesso não autorizado");
}

const API = 'http://localhost:3000';
const limit = 12;
let offset = 0;

// Estado do painel
let clienteSelecionado = null;   // { id, nome }
let medSelecionado = null;       // { id, nome, saldo, concentracao, unidade_concentracao }
let carrinho = [];               // [{ medicamento_id, nome, quantidade }]

// ================================================
// INICIALIZAÇÃO
// ================================================
document.addEventListener("DOMContentLoaded", () => {
    // User chip
    const nomeUsuario = localStorage.getItem('nomeUsuario') || 'Usuário';
    document.getElementById('user-nome').textContent = nomeUsuario;
    const iniciais = nomeUsuario.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    document.getElementById('user-initials').textContent = iniciais;

    // Botões gerais
    document.getElementById('btn-sair').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '../auth/login.html';
    });

    document.getElementById('btn-nova-distribuicao').addEventListener('click', abrirPainel);
    document.getElementById('btn-fechar-painel').addEventListener('click', fecharPainel);
    document.getElementById('painel-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('painel-overlay')) fecharPainel();
    });

    // Paginação e busca na tabela
    document.getElementById('btnPaginacao').addEventListener('click', () => atualizarTabela("mais"));
    document.getElementById('btnPaginacaoMenos').addEventListener('click', () => atualizarTabela("menos"));
    document.getElementById('campo-pesquisa').addEventListener('input', filtrarTabela);

    // Busca de cliente no painel
    document.getElementById('busca-cliente').addEventListener('input', debounce(buscarClientes, 300));
    document.getElementById('btn-limpar-cliente').addEventListener('click', limparCliente);

    // Busca de medicamento no painel
    document.getElementById('busca-medicamento').addEventListener('input', debounce(buscarMedicamentos, 300));
    document.getElementById('btn-limpar-med').addEventListener('click', limparMedicamento);

    // Controles de quantidade
    document.getElementById('btn-menos').addEventListener('click', () => ajustarQuantidade(-1));
    document.getElementById('btn-mais').addEventListener('click', () => ajustarQuantidade(1));

    // Adicionar ao carrinho
    document.getElementById('btn-adicionar-item').addEventListener('click', adicionarAoCarrinho);

    // Confirmar distribuição
    document.getElementById('btn-confirmar').addEventListener('click', confirmarDistribuicao);

    // Carregar tabela inicial
    atualizarTabela("inicio");

    lucide.createIcons();
});

// ================================================
// TABELA DE HISTÓRICO
// ================================================
async function atualizarTabela(acao = "") {
    if (acao === "inicio") offset = 0;
    if (acao === "mais") offset += limit;
    if (acao === "menos") offset = Math.max(0, offset - limit);

    try {
        const res = await fetch(`${API}/distribuicoes?limit=${limit}&offset=${offset}`);
        const dados = await res.json();

        if (dados.length === 0 && acao === "mais") { offset -= limit; return; }

        renderizarTabela(dados);
        document.getElementById('btnPaginacaoMenos').disabled = offset === 0;
        document.getElementById('btnPaginacao').disabled = dados.length < limit;
    } catch (err) {
        console.error("Erro ao carregar distribuições:", err);
    }
}

function renderizarTabela(lista) {
    const corpo = document.getElementById('corpo-tabela');
    corpo.innerHTML = "";

    if (lista.length === 0) {
        corpo.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#6b849e; padding:24px;">Nenhuma distribuição encontrada.</td></tr>`;
        return;
    }

    lista.forEach(d => {
        // Garante que itens é sempre um array
        const itens = typeof d.itens === 'string' ? JSON.parse(d.itens) : (d.itens || []);
        const itensTexto = itens.map(i => `${i.medicamento} (${i.quantidade}un)`).join(', ');

        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td style="color:#6b849e; font-size:13px;">#${d.distribuicao_id}</td>
        <td>${d.cliente_nome}</td>
        <td style="font-size:13px; color:#3a5272;">${itensTexto}</td>
        <td>${d.data_saida}</td>
        <td>${d.usuario_nome}</td>
        <td style="text-align:center;">
            <button class="btn-deletar" title="Excluir">
                <i data-lucide="trash-2"></i>
            </button>
        </td>`;
        tr.querySelector('.btn-deletar').addEventListener('click', () => deletarDistribuicao(d.distribuicao_id));
        corpo.appendChild(tr);
    });

    lucide.createIcons();
}

async function filtrarTabela() {
    // Recarrega do início quando busca muda
    offset = 0;
    atualizarTabela("inicio");
}

async function deletarDistribuicao(distribuicao_id) {
    const confirma = await exibirDialogo("Confirmar", "Excluir toda essa distribuição?", "confirm");
    if (!confirma) return;

    try {
        const res = await fetch(`${API}/distribuicoes/${distribuicao_id}`, { method: 'DELETE' });
        if (res.ok) {
            atualizarTabela("inicio");
            exibirDialogo("Sucesso", "Distribuição excluída.");
        } else {
            exibirDialogo("Erro", "Não foi possível excluir.");
        }
    } catch (err) {
        exibirDialogo("Erro", "Erro de conexão.");
    }
}

// ================================================
// PAINEL LATERAL
// ================================================
function abrirPainel() {
    resetarPainel();
    document.getElementById('painel-overlay').style.display = 'flex';
    lucide.createIcons();
}

function fecharPainel() {
    document.getElementById('painel-overlay').style.display = 'none';
}

function resetarPainel() {
    clienteSelecionado = null;
    medSelecionado = null;
    carrinho = [];

    document.getElementById('busca-cliente').value = '';
    document.getElementById('lista-clientes').className = 'dropdown-lista';
    document.getElementById('cliente-selecionado').style.display = 'none';

    document.getElementById('busca-medicamento').value = '';
    document.getElementById('lista-medicamentos').className = 'dropdown-lista';
    document.getElementById('med-selecionado-wrap').style.display = 'none';
    document.getElementById('input-quantidade').value = 1;

    renderizarCarrinho();
    atualizarBtnConfirmar();
}

// ================================================
// BUSCA DE CLIENTE
// ================================================
async function buscarClientes() {
    const termo = document.getElementById('busca-cliente').value.trim();
    if (termo.length < 2) {
        document.getElementById('lista-clientes').className = 'dropdown-lista';
        return;
    }

    // Detecta se é CPF (só números e traços)
    const eCPF = /^[\d.\-]+$/.test(termo);
    const param = eCPF ? `cpf=${encodeURIComponent(termo)}` : `nome=${encodeURIComponent(termo)}`;

    try {
        const res = await fetch(`${API}/clientes?${param}&limit=8`);
        const clientes = await res.json();
        renderizarDropdownClientes(clientes);
    } catch (err) {
        console.error(err);
    }
}

function renderizarDropdownClientes(clientes) {
    const lista = document.getElementById('lista-clientes');
    lista.innerHTML = '';

    if (clientes.length === 0) {
        lista.innerHTML = `<div class="dropdown-item"><small>Nenhum cliente encontrado</small></div>`;
    } else {
        clientes.forEach(c => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.innerHTML = `<strong>${c.nome}</strong><small>CPF: ${c.cpf || '—'}</small>`;
            item.addEventListener('click', () => selecionarCliente(c));
            lista.appendChild(item);
        });
    }

    lista.className = 'dropdown-lista aberta';
}

function selecionarCliente(cliente) {
    clienteSelecionado = cliente;
    document.getElementById('busca-cliente').value = '';
    document.getElementById('lista-clientes').className = 'dropdown-lista';
    document.getElementById('cliente-nome-display').textContent = cliente.nome;
    document.getElementById('cliente-selecionado').style.display = 'flex';
    atualizarBtnConfirmar();
    lucide.createIcons();
}

function limparCliente() {
    clienteSelecionado = null;
    document.getElementById('busca-cliente').value = '';
    document.getElementById('cliente-selecionado').style.display = 'none';
    atualizarBtnConfirmar();
}

// ================================================
// BUSCA DE MEDICAMENTO
// ================================================
async function buscarMedicamentos() {
    const termo = document.getElementById('busca-medicamento').value.trim();
    if (termo.length < 2) {
        document.getElementById('lista-medicamentos').className = 'dropdown-lista';
        return;
    }

    try {
        const res = await fetch(`${API}/medicamentos?nome=${encodeURIComponent(termo)}&limit=6`);
        const meds = await res.json();
        renderizarDropdownMeds(meds);
    } catch (err) {
        console.error(err);
    }
}

function renderizarDropdownMeds(meds) {
    const lista = document.getElementById('lista-medicamentos');
    lista.innerHTML = '';

    if (meds.length === 0) {
        lista.innerHTML = `<div class="dropdown-item"><small>Nenhum medicamento encontrado</small></div>`;
    } else {
        meds.forEach(m => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.innerHTML = `
                <strong>${m.nome}</strong>
                <small>${m.concentracao}${m.unidade_concentracao} · Saldo: ${m.saldo} un.</small>`;
            item.addEventListener('click', () => selecionarMedicamento(m));
            lista.appendChild(item);
        });
    }

    lista.className = 'dropdown-lista aberta';
}

function selecionarMedicamento(med) {
    medSelecionado = med;
    document.getElementById('busca-medicamento').value = '';
    document.getElementById('lista-medicamentos').className = 'dropdown-lista';
    document.getElementById('med-nome-display').textContent = `${med.nome} ${med.concentracao}${med.unidade_concentracao}`;
    document.getElementById('saldo-info').textContent = `Saldo disponível: ${med.saldo} unidades`;
    document.getElementById('input-quantidade').value = 1;
    document.getElementById('input-quantidade').max = med.saldo;
    document.getElementById('med-selecionado-wrap').style.display = 'block';
    lucide.createIcons();
}

function limparMedicamento() {
    medSelecionado = null;
    document.getElementById('busca-medicamento').value = '';
    document.getElementById('med-selecionado-wrap').style.display = 'none';
}

function ajustarQuantidade(delta) {
    const input = document.getElementById('input-quantidade');
    const atual = parseInt(input.value) || 1;
    const max = medSelecionado ? medSelecionado.saldo : 9999;
    const novo = Math.min(max, Math.max(1, atual + delta));
    input.value = novo;
}

// ================================================
// CARRINHO
// ================================================
function adicionarAoCarrinho() {
    if (!medSelecionado) return;

    const quantidade = parseInt(document.getElementById('input-quantidade').value);
    if (!quantidade || quantidade < 1) {
        exibirDialogo("Atenção", "Quantidade inválida.");
        return;
    }

    // Verifica saldo considerando itens já no carrinho
    const jaNoCarrinho = carrinho.filter(i => i.medicamento_id === medSelecionado.id)
        .reduce((sum, i) => sum + i.quantidade, 0);
    if (jaNoCarrinho + quantidade > medSelecionado.saldo) {
        exibirDialogo("Saldo insuficiente", `Saldo disponível: ${medSelecionado.saldo} un. Já no carrinho: ${jaNoCarrinho} un.`);
        return;
    }

    // Se o mesmo medicamento já está no carrinho, soma a quantidade
    const existente = carrinho.find(i => i.medicamento_id === medSelecionado.id);
    if (existente) {
        existente.quantidade += quantidade;
    } else {
        carrinho.push({
            medicamento_id: medSelecionado.id,
            nome: `${medSelecionado.nome} ${medSelecionado.concentracao}${medSelecionado.unidade_concentracao}`,
            quantidade
        });
    }

    limparMedicamento();
    renderizarCarrinho();
    atualizarBtnConfirmar();
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    renderizarCarrinho();
    atualizarBtnConfirmar();
}

function renderizarCarrinho() {
    const lista = document.getElementById('carrinho-lista');
    document.getElementById('carrinho-count').textContent = carrinho.length;

    // Limpa tudo e reconstrói
    lista.innerHTML = '';

    if (carrinho.length === 0) {
        lista.innerHTML = `
            <div class="carrinho-vazio">
                <i data-lucide="shopping-cart"></i>
                <p>Nenhum item adicionado</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    carrinho.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'carrinho-item';
        div.innerHTML = `
            <div class="carrinho-item-info">
                <div class="carrinho-item-nome">${item.nome}</div>
                <div class="carrinho-item-qtd">${item.quantidade} unidade${item.quantidade > 1 ? 's' : ''}</div>
            </div>
            <button class="btn-remover-item" title="Remover">
                <i data-lucide="trash-2"></i>
            </button>`;
        div.querySelector('.btn-remover-item').addEventListener('click', () => removerDoCarrinho(index));
        lista.appendChild(div);
    });

    lucide.createIcons();
}

function atualizarBtnConfirmar() {
    const btn = document.getElementById('btn-confirmar');
    btn.disabled = !clienteSelecionado || carrinho.length === 0;
}

// ================================================
// CONFIRMAR DISTRIBUIÇÃO
// ================================================
async function confirmarDistribuicao() {
    if (!clienteSelecionado || carrinho.length === 0) return;

    const usuarioId = await getUsuarioId();
    if (!usuarioId) {
        exibirDialogo("Erro", "Não foi possível identificar o usuário logado.");
        return;
    }

    const confirma = await exibirDialogo(
        "Confirmar Distribuição",
        `Distribuir ${carrinho.length} medicamento(s) para ${clienteSelecionado.nome}?`,
        "confirm"
    );
    if (!confirma) return;

    const btn = document.getElementById('btn-confirmar');
    btn.disabled = true;

    try {
        const res = await fetch(`${API}/distribuicoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                itens: carrinho.map(i => ({
                    medicamento_id: i.medicamento_id,
                    quantidade: i.quantidade
                })),
                usuario_id: usuarioId,
                cliente_id: clienteSelecionado.id
            })
        });

        if (res.ok) {
            fecharPainel();
            atualizarTabela("inicio");
            exibirDialogo("Sucesso", `Distribuição realizada para ${clienteSelecionado.nome}!`);
        } else {
            const err = await res.json();
            exibirDialogo("Erro", err.detalhes || err.error);
            btn.disabled = false;
        }
    } catch (err) {
        exibirDialogo("Erro", "Erro de conexão.");
        btn.disabled = false;
    }
}

async function getUsuarioId() {
    const nomeUsuario = localStorage.getItem('nomeUsuario');
    if (!nomeUsuario) return null;
    try {
        const res = await fetch(`${API}/usuarios?nome=${encodeURIComponent(nomeUsuario)}&limit=1`);
        const dados = await res.json();
        return dados.length > 0 ? dados[0].id : null;
    } catch {
        return null;
    }
}

// ================================================
// MODAL DE AVISO
// ================================================
function exibirDialogo(titulo, mensagem, tipo = "alert") {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-aviso-container');
        document.getElementById('aviso-titulo').innerText = titulo;
        document.getElementById('aviso-texto').innerText = mensagem;
        document.getElementById('btn-aviso-cancelar').style.display = tipo === "alert" ? "none" : "block";
        modal.style.display = "flex";
        document.getElementById('btn-aviso-ok').onclick = () => { modal.style.display = "none"; resolve(true); };
        document.getElementById('btn-aviso-cancelar').onclick = () => { modal.style.display = "none"; resolve(false); };
    });
}

// ================================================
// UTILITÁRIO: DEBOUNCE
// ================================================
function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}