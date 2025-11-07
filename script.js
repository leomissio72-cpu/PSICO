// VARIÁVEL ESSENCIAL: COLE A URL LONGA DA SUA IMPLANTAÇÃO DO GOOGLE APPS SCRIPT AQUI.
const scriptURL = 'https://script.google.com/macros/s/AKfycbwWNt5E4y8cG2DpQLXe8ef7lBdkY4pGl2d8XDraeUPMk3hR6P4on9Ml9CLZOZNUSWQo/exec'; 

// --- ELEMENTOS DOM (HTML) ---
const mainContent = document.getElementById('mainContent');
const navLinks = document.querySelectorAll('.nav-link');
const viewClientes = document.getElementById('viewClientes');
const viewRelatorios = document.getElementById('viewRelatorios');
const mainTitle = document.getElementById('mainTitle');
const statusMensagem = document.getElementById('statusMensagem');
const btnVerPacientes = document.getElementById('btnVerPacientes');

// Elementos da Busca/Cadastro
const buscaForm = document.getElementById('buscaForm');
const buscaCpfInput = document.getElementById('buscaCpf');
const blocoCadastro = document.getElementById('blocoCadastro');
const cpfNaoEncontradoSpan = document.getElementById('cpfNaoEncontrado');
const cCPFInput = document.getElementById('cCPF');
const cIdadeInput = document.getElementById('cIdade'); // Campo para idade

// Elementos do Prontuário
const dadosPacienteDiv = document.getElementById('dadosPaciente');
const pNome = document.getElementById('pNome');
const pCPF = document.getElementById('pCPF');
const pTratamento = document.getElementById('pTratamento');
const pPreco = document.getElementById('pPreco');
const pSessoesMes = document.getElementById('pSessoesMes');
const pTotalMes = document.getElementById('pTotalMes');
const pHistorico = document.getElementById('pHistorico');
const novaSessaoForm = document.getElementById('novaSessao');
const nCPFInput = document.getElementById('nCPF');

// Elementos da Lista de Pacientes
const listaPacientesContainer = document.getElementById('listaPacientesContainer');
const listaPacientesUl = document.getElementById('listaPacientes');

// Elementos do Relatório
const filtroRelatorioForm = document.getElementById('filtroRelatorioForm');
const dataInicioInput = document.getElementById('dataInicio');
const dataFimInput = document.getElementById('dataFim');
const rSessoesFiltradas = document.getElementById('rSessoesFiltradas');
const rTotalFiltrado = document.getElementById('rTotalFiltrado');
const tabelaRelatorioMensalBody = document.querySelector('#tabelaRelatorioMensal tbody');
const statusMensagemRelatorio = document.getElementById('statusMensagemRelatorio');

// --- FUNÇÕES DE UTILIDADE ---

/** Mostra uma mensagem de status temporária. */
function showStatus(element, message, isError = false) {
    element.textContent = message;
    element.className = isError ? 'alert alert-danger' : 'alert alert-success';
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
        element.className = 'alert';
    }, 4000);
}

/** Função de requisição genérica para o Apps Script. */
async function fetchAppsScript(params, method = 'GET') {
    const url = new URL(scriptURL);
    
    if (method === 'GET') {
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        return fetch(url.toString(), { method: 'GET' });
    } else if (method === 'POST') {
        const formData = new FormData();
        Object.keys(params).forEach(key => formData.append(key, params[key]));
        return fetch(scriptURL, { method: 'POST', body: formData });
    }
}

// --- FUNÇÕES DE VISUALIZAÇÃO ---

/** Troca a visualização principal (Clientes/Relatórios). */
function showView(viewId) {
    const views = [viewClientes, viewRelatorios];
    const titles = {
        clientes: 'Gerenciamento de Clientes e Sessões',
        relatorios: 'Relatórios Financeiros'
    };
    
    views.forEach(view => view.style.display = 'none');
    
    if (viewId === 'clientes') {
        viewClientes.style.display = 'block';
        mainTitle.textContent = titles.clientes;
        btnVerPacientes.style.display = 'inline-block';
        resetClientViews();
    } else if (viewId === 'relatorios') {
        viewRelatorios.style.display = 'block';
        mainTitle.textContent = titles.relatorios;
        btnVerPacientes.style.display = 'none';
    }
    
    navLinks.forEach(link => link.classList.remove('active'));
    document.querySelector(`[data-view="${viewId}"]`).classList.add('active');
}

/** Reseta os blocos de cadastro/prontuário. */
function resetClientViews() {
    blocoCadastro.style.display = 'none';
    dadosPacienteDiv.style.display = 'none';
    listaPacientesContainer.style.display = 'none';
    statusMensagem.style.display = 'none';
}

// --- LÓGICA DE BUSCA E PRONTUÁRIO ---

/** Busca o cliente pelo CPF e exibe a tela correta. */
async function handleBuscaCliente(cpf) {
    resetClientViews();
    showStatus(statusMensagem, 'Buscando cliente...', false);

    try {
        const response = await fetchAppsScript({ action: 'buscarClienteCompleto', cpf: cpf });
        const data = await response.json();
        
        statusMensagem.style.display = 'none';

        if (data.erro && data.erro === 'Paciente não encontrado') {
            showCadastroBloco(cpf);
        } else if (data.sucesso) {
            displayProntuario(data.paciente, data.historico, data.sessoesNoMes);
        } else {
            showStatus(statusMensagem, data.erro || 'Erro ao buscar cliente.', true);
        }
    } catch (error) {
        console.error('Erro na busca:', error);
        showStatus(statusMensagem, 'Erro de rede ou Apps Script. Verifique a URL e a Implantação.', true);
    }
}

/** Exibe o bloco de cadastro. */
function showCadastroBloco(cpf) {
    cpfNaoEncontradoSpan.textContent = cpf;
    cCPFInput.value = cpf; // Preenche o CPF no formulário de cadastro
    blocoCadastro.style.display = 'block';
}

/** Exibe o prontuário do cliente. */
function displayProntuario(paciente, historico, sessoesNoMes) {
    // 1. Atualizar informações de resumo
    pNome.textContent = paciente.nome;
    pCPF.textContent = paciente.cpf;
    pTratamento.textContent = paciente.tratamento;
    pPreco.textContent = parseFloat(paciente.preco_sessao).toFixed(2);
    
    // 2. Calcular e exibir estatísticas
    const preco = parseFloat(paciente.preco_sessao);
    const totalMes = (sessoesNoMes * preco).toFixed(2);
    
    pSessoesMes.textContent = sessoesNoMes;
    pTotalMes.textContent = totalMes;

    // Calcular total geral (somente do histórico, pois o Apps Script não calculou o total geral)
    // Para simplificar, o Apps Script está retornando o histórico e a contagem do mês.
    // Para o total geral e sessões totais, usaremos o histórico.
    const sessoesTotal = historico.length;
    const totalGeral = (sessoesTotal * preco).toFixed(2);
    
    document.getElementById('pSessoesTotal').textContent = sessoesTotal;
    document.getElementById('pTotalGeral').textContent = totalGeral;

    // 3. Registrar CPF para nova sessão
    nCPFInput.value = paciente.cpf;

    // 4. Exibir Histórico
    pHistorico.innerHTML = '';
    if (historico.length === 0) {
        pHistorico.textContent = 'Nenhuma sessão registrada para este cliente.';
    } else {
        historico.forEach(sessao => {
            const statusClass = sessao.status_pagamento === 'PAGO' ? 'paid' : 'pending';
            const statusText = sessao.status_pagamento === 'PAGO' ? 'Pago' : 'Pendente';
            
            const item = document.createElement('div');
            item.className = 'historico-item';
            item.innerHTML = `
                <div class="data-sessao">Data: <strong>${sessao.data_sessao}</strong></div>
                <div class="status ${statusClass}">Status: <strong>${statusText}</strong></div>
                <div class="anotacao">Anotação: ${sessao.anotacao || '(sem anotação)'}</div>
            `;
            pHistorico.appendChild(item);
        });
    }

    // 5. Mostrar o prontuário
    dadosPacienteDiv.style.display = 'block';
}

// --- LÓGICA DE CADASTRO E SESSÃO ---

/** Cadastra um novo paciente. */
cadastroForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    showStatus(statusMensagem, 'Cadastrando paciente...', false);

    // Ajuste: O Código.gs espera Data_Nascimen. Vamos calcular uma data fictícia
    // com base na Idade (cIdade) para manter a compatibilidade com o Apps Script.
    const idade = parseInt(cIdadeInput.value) || 0;
    const dataNascimen = new Date();
    dataNascimen.setFullYear(dataNascimen.getFullYear() - idade);

    const formData = new FormData(this);
    formData.append('data_nascimen', dataNascimen.toISOString().split('T')[0]); // Formato YYYY-MM-DD
    
    const params = {};
    formData.forEach((value, key) => { params[key] = value; });

    try {
        const response = await fetchAppsScript(params, 'POST');
        const data = await response.json();

        if (data.sucesso) {
            showStatus(statusMensagem, data.mensagem, false);
            blocoCadastro.style.display = 'none';
            // Automaticamente busca o cliente cadastrado para exibir o prontuário
            await handleBuscaCliente(params.cpf);
        } else {
            showStatus(statusMensagem, data.erro || 'Erro no cadastro. Verifique a planilha.', true);
        }
    } catch (error) {
        console.error('Erro de rede no cadastro:', error);
        showStatus(statusMensagem, 'Erro de rede. Tente novamente.', true);
    }
});

/** Registra uma nova sessão. */
novaSessaoForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    showStatus(statusMensagem, 'Registrando sessão...', false);

    const formData = new FormData(this);
    const params = {};
    formData.forEach((value, key) => { params[key] = value; });

    try {
        const response = await fetchAppsScript(params, 'POST');
        const data = await response.json();

        if (data.sucesso) {
            showStatus(statusMensagem, data.mensagem, false);
            // Recarrega o prontuário para atualizar o histórico e os totais
            await handleBuscaCliente(params.cpf);
        } else {
            showStatus(statusMensagem, data.erro || 'Erro ao registrar sessão.', true);
        }
    } catch (error) {
        console.error('Erro de rede no registro de sessão:', error);
        showStatus(statusMensagem, 'Erro de rede. Tente novamente.', true);
    }
});

// --- LÓGICA DE LISTAGEM DE PACIENTES ---

/** Lista todos os pacientes cadastrados. */
async function handleListarPacientes() {
    resetClientViews();
    showStatus(statusMensagem, 'Listando todos os clientes...', false);
    
    try {
        const response = await fetchAppsScript({ action: 'listarPacientes' });
        const data = await response.json();

        statusMensagem.style.display = 'none';

        if (data.sucesso) {
            listaPacientesUl.innerHTML = '';
            if (data.pacientes.length === 0) {
                listaPacientesUl.innerHTML = '<li>Nenhum cliente cadastrado.</li>';
            } else {
                data.pacientes.forEach(paciente => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <strong>${paciente.nome}</strong> (CPF: ${paciente.cpf}) 
                        <button class="btn-secondary btn-small" onclick="handleBuscaCliente('${paciente.cpf}')">Ver Prontuário</button>
                    `;
                    listaPacientesUl.appendChild(li);
                });
            }
            listaPacientesContainer.style.display = 'block';
        } else {
            showStatus(statusMensagem, data.erro || 'Erro ao listar clientes.', true);
        }
    } catch (error) {
        console.error('Erro de rede na listagem:', error);
        showStatus(statusMensagem, 'Erro de rede na listagem. Verifique a URL e a Implantação.', true);
    }
}


// --- LÓGICA DE RELATÓRIOS ---

/** Gera e exibe o relatório financeiro. */
async function handleGerarRelatorio(dataInicio, dataFim) {
    statusMensagemRelatorio.style.display = 'none';
    showStatus(statusMensagemRelatorio, 'Gerando relatório...', false);

    try {
        const response = await fetchAppsScript({ 
            action: 'gerarRelatorioFinanceiro', 
            dataInicio: dataInicio, 
            dataFim: dataFim 
        });
        const data = await response.json();

        statusMensagemRelatorio.style.display = 'none';

        if (data.sucesso) {
            // Atualizar totais
            rSessoesFiltradas.textContent = data.totalSessoes;
            rTotalFiltrado.textContent = parseFloat(data.faturamentoTotal).toFixed(2);
            
            // Atualizar tabela de detalhes
            tabelaRelatorioMensalBody.innerHTML = '';
            if (data.detalhesClientes.length === 0) {
                tabelaRelatorioMensalBody.innerHTML = '<tr><td colspan="5">Nenhuma sessão encontrada no período.</td></tr>';
                return;
            }

            data.detalhesClientes.forEach(cliente => {
                const tr = document.createElement('tr');
                const statusClass = cliente.status === 'PAGO' ? 'status-paid' : 'status-pending';
                const statusButton = cliente.status === 'PENDENTE' 
                    ? `<button class="btn-primary btn-small" onclick="marcarPagamentoHandler('${cliente.cpf}', '${dataInicio}', '${dataFim}')">Marcar Pago</button>`
                    : '';
                
                tr.innerHTML = `
                    <td>${cliente.nome}</td>
                    <td>${cliente.numSessoes}</td>
                    <td>${parseFloat(cliente.totalPagar).toFixed(2)}</td>
                    <td><span class="${statusClass}">${cliente.status}</span></td>
                    <td>${statusButton}</td>
                `;
                tabelaRelatorioMensalBody.appendChild(tr);
            });

        } else {
            showStatus(statusMensagemRelatorio, data.erro || 'Erro ao gerar relatório.', true);
        }
    } catch (error) {
        console.error('Erro de rede no relatório:', error);
        showStatus(statusMensagemRelatorio, 'Erro de rede. Verifique a URL e a Implantação.', true);
    }
}

/** Handler para marcar pagamento de um cliente no período do relatório. */
async function marcarPagamentoHandler(cpf, dataInicio, dataFim) {
    if (!confirm(`Tem certeza que deseja marcar TODAS as sessões PENDENTES do cliente ${cpf} no período como PAGAS?`)) {
        return;
    }
    
    showStatus(statusMensagemRelatorio, 'Marcando pagamento...', false);

    try {
        const response = await fetchAppsScript({ 
            action: 'marcarPagamento', 
            cpf: cpf,
            dataInicio: dataInicio, 
            dataFim: dataFim 
        }, 'POST');
        const data = await response.json();
        
        if (data.sucesso) {
            showStatus(statusMensagemRelatorio, data.mensagem, false);
            // Recarrega o relatório após o pagamento
            await handleGerarRelatorio(dataInicio, dataFim);
        } else {
            showStatus(statusMensagemRelatorio, data.erro || 'Falha ao marcar pagamento.', true);
        }
    } catch (error) {
        console.error('Erro de rede ao marcar pagamento:', error);
        showStatus(statusMensagemRelatorio, 'Erro de rede. Tente novamente.', true);
    }
}

// --- CONFIGURAÇÃO INICIAL E EVENT LISTENERS ---

window.onload = () => {
    // 1. Inicia o sistema diretamente na view Clientes (sem login)
    showView('clientes'); 
    
    // 2. Define a data atual como padrão no formulário de sessão
    document.getElementById('data_sessao').valueAsDate = new Date();
    
    // 3. Define o período padrão para o relatório (mês atual)
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDia = hoje.toISOString().split('T')[0];

    dataInicioInput.value = primeiroDia;
    dataFimInput.value = ultimoDia;
};

// Evento de Navegação
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const viewId = e.target.getAttribute('data-view');
        if (viewId) {
            showView(viewId);
            // Se for Relatório, gera o relatório inicial do mês
            if (viewId === 'relatorios') {
                handleGerarRelatorio(dataInicioInput.value, dataFimInput.value);
            }
        }
    });
});

// Evento de Busca
buscaForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const cpf = buscaCpfInput.value.replace(/\D/g, ''); // Remove não-dígitos
    if (cpf) {
        handleBuscaCliente(cpf);
    }
});

// Evento de Ver Todos os Pacientes
btnVerPacientes.addEventListener('click', handleListarPacientes);

// Evento de Filtro de Relatório
filtroRelatorioForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const dataInicio = dataInicioInput.value;
    const dataFim = dataFimInput.value;
    handleGerarRelatorio(dataInicio, dataFim);
});

// Função de Logout (apenas informativa, pois o sistema não tem senha)
function logout() {
    alert("Você saiu do sistema de Gerenciamento. Recarregue a página para acessar novamente.");
    window.location.reload();
}
