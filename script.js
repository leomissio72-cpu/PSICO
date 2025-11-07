// 🚨 SUBSTITUA 'COLE_A_SUA_NOVA_URL_AQUI/exec' PELA URL COPIADA DO APPS SCRIPT
const scriptURL = 'COLE_A_SUA_NOVA_URL_AQUI/exec';

// =======================================================
// VARIÁVEIS DE ESTADO
// =======================================================
let pacientesCache = []; // Para armazenar a lista de pacientes
let clienteAtual = null; // Para armazenar os dados do cliente em exibição
let currentPage = 'clientes'; // Controla qual view está ativa ('clientes', 'relatorios', 'agenda')

// =======================================================
// UTILS
// =======================================================

function showMessage(message, isError = false) {
    // Implemente esta função para mostrar mensagens no seu site, substituindo o alert()
    console.log(isError ? `ERRO: ${message}` : `SUCESSO: ${message}`);
    // EX: Aqui você pode criar um modal ou div na tela para mostrar a mensagem.
    alert(message); // Use alert temporariamente, mas é altamente recomendado usar um modal customizado
}

// =======================================================
// NAVEGAÇÃO E VIEWS
// =======================================================

function navigate(view) {
    currentPage = view;
    // Oculta todas as telas principais e mostra apenas a selecionada
    document.querySelectorAll('.main-content-area').forEach(el => el.style.display = 'none');
    
    const targetElement = document.getElementById(view + 'View');
    if (targetElement) {
        targetElement.style.display = 'block';
    }

    // Ações específicas ao carregar a view
    if (view === 'clientes') {
        renderBuscarClienteView();
    } else if (view === 'relatorios') {
        renderRelatoriosView();
    } else if (view === 'agenda') {
        // Inicializa o FullCalendar aqui (você precisará adicionar a biblioteca FullCalendar no index.html)
        loadAgenda();
    }
}

// Inicializa o app na tela de clientes ao carregar
document.addEventListener('DOMContentLoaded', () => {
    // 🚨 AQUI REMOVEMOS A TELA DE LOGIN. O APP INICIA DIRETO NO CONTEÚDO PRINCIPAL.
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.remove(); // Remove completamente a tela de login
    }
    
    // Mostra o conteúdo principal e navega para a tela inicial
    const mainWrapper = document.getElementById('mainContentWrapper');
    if (mainWrapper) {
        mainWrapper.style.display = 'flex'; // ou 'block', dependendo do seu CSS
    }
    
    // Configura a navegação
    document.getElementById('clientesLink').addEventListener('click', (e) => { e.preventDefault(); navigate('clientes'); });
    document.getElementById('relatoriosLink').addEventListener('click', (e) => { e.preventDefault(); navigate('relatorios'); });
    // Adicione um link para a Agenda se houver um no seu HTML
    
    navigate('clientes'); // Inicia na tela de clientes
});

// =======================================================
// COMUNICAÇÃO COM O APPS SCRIPT (FUNÇÕES DE FETCH)
// =======================================================

async function executeAction(action, params = {}, method = 'GET') {
    const url = new URL(scriptURL);
    let fetchOptions = {
        method: method,
        redirect: 'follow', // Essencial para Apps Script
    };

    if (method === 'GET') {
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    } else if (method === 'POST') {
        // Para POST, o Apps Script espera os parâmetros como FormData, não JSON
        const formData = new FormData();
        Object.keys(params).forEach(key => formData.append(key, params[key]));
        formData.append('action', action); // Adiciona a ação ao body para POST
        fetchOptions.body = formData;
    }
    
    // Adiciona a ação para GET também
    if (method === 'GET') {
        url.searchParams.append('action', action);
    }

    try {
        const response = await fetch(url, fetchOptions);
        if (!response.ok) {
            throw new Error(`Erro de rede (${response.status} ${response.statusText}). Verifique a URL do App Script.`);
        }
        
        // O Apps Script retorna um ContentService.createTextOutput(JSON)
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            // Isso acontece se o Apps Script retornar HTML (ex: Tela de Permissão/Erro)
            console.error("Erro ao fazer parse do JSON. Resposta do Apps Script (não JSON):", text);
            throw new Error("Resposta inválida do servidor. A URL do Apps Script pode estar incorreta ou a implantação precisa ser reautorizada.");
        }
    } catch (error) {
        showMessage(`Erro de comunicação: ${error.message}`, true);
        return { erro: error.message };
    }
}

// =======================================================
// LÓGICA DE CLIENTES (Substituindo a Lógica de Login)
// =======================================================

// 1. Renderiza a tela de busca inicial
function renderBuscarClienteView() {
    const clientesView = document.getElementById('clientesView');
    if (!clientesView) return;

    clientesView.innerHTML = `
        <div class="p-6 bg-white rounded-lg shadow-xl">
            <h2 class="text-xl font-bold mb-4">Gerenciamento de Clientes e Sessões</h2>
            <div id="buscarClienteArea" class="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                <input type="text" id="cpfInput" placeholder="Digite o CPF (somente números)" class="p-2 border rounded flex-grow">
                <button id="buscarClienteBtn" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
                    Buscar Cliente
                </button>
            </div>
            <button id="verTodosBtn" class="mt-4 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
                Ver Todos os Clientes
            </button>
            <div id="clienteDetalhes" class="mt-6">
                <!-- Detalhes do cliente ou formulário de cadastro serão renderizados aqui -->
            </div>
        </div>
    `;

    document.getElementById('buscarClienteBtn').addEventListener('click', handleBuscarCliente);
    document.getElementById('verTodosBtn').addEventListener('click', handleVerTodosClientes);
}


// 2. Busca o cliente no Apps Script
async function handleBuscarCliente() {
    const cpf = document.getElementById('cpfInput').value.replace(/\D/g, ''); // Remove não-dígitos
    if (!cpf) {
        showMessage("Por favor, digite o CPF.", true);
        return;
    }
    
    const loadingMessage = document.getElementById('clienteDetalhes');
    loadingMessage.innerHTML = '<p class="text-blue-500">Buscando...</p>';

    const result = await executeAction('buscarClienteCompleto', { cpf: cpf }, 'GET');

    if (result.sucesso && result.paciente) {
        clienteAtual = result.paciente;
        renderDetalhesCliente(result);
    } else if (result.erro === "Paciente não encontrado") {
        renderCadastrarClienteForm(cpf);
    } else {
        // Erro geral de comunicação ou planilha
        showMessage(result.erro || "Falha desconhecida ao buscar cliente.", true);
    }
}


// 3. Renderiza o formulário de Cadastro se não for encontrado
function renderCadastrarClienteForm(cpfPreenchido) {
    const detalhesDiv = document.getElementById('clienteDetalhes');
    detalhesDiv.innerHTML = `
        <h3 class="text-lg font-semibold mb-3 text-red-600">Cliente não encontrado. Cadastrar novo:</h3>
        <form id="cadastroForm" class="space-y-4 p-4 border rounded-lg">
            <div>
                <label class="block text-sm font-medium text-gray-700">CPF:</label>
                <input type="text" id="cadastroCpf" value="${cpfPreenchido}" readonly class="p-2 border rounded w-full bg-gray-100">
            </div>
            <div>
                <label for="cadastroNome" class="block text-sm font-medium text-gray-700">Nome Completo:</label>
                <input type="text" id="cadastroNome" required class="p-2 border rounded w-full">
            </div>
            <div>
                <label for="cadastroDataNasc" class="block text-sm font-medium text-gray-700">Data de Nascimento:</label>
                <input type="date" id="cadastroDataNasc" required class="p-2 border rounded w-full">
            </div>
            <div>
                <label for="cadastroTratamento" class="block text-sm font-medium text-gray-700">Tratamento:</label>
                <input type="text" id="cadastroTratamento" class="p-2 border rounded w-full">
            </div>
            <div>
                <label for="cadastroPreco" class="block text-sm font-medium text-gray-700">Preço da Sessão (R$):</label>
                <input type="number" step="0.01" id="cadastroPreco" required class="p-2 border rounded w-full">
            </div>
            <button type="submit" class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded w-full">
                Salvar Novo Cliente
            </button>
        </form>
    `;

    document.getElementById('cadastroForm').addEventListener('submit', handleCadastrarCliente);
}

// 4. Envia o cadastro para o Apps Script
async function handleCadastrarCliente(event) {
    event.preventDefault();
    const form = event.target;
    
    const dados = {
        cpf: form.cadastroCpf.value,
        nome: form.cadastroNome.value,
        data_nascimen: form.cadastroDataNasc.value,
        tratamento: form.cadastroTratamento.value,
        preco: form.cadastroPreco.value,
    };

    const result = await executeAction('cadastrarPaciente', dados, 'POST');

    if (result.sucesso) {
        showMessage("Cliente cadastrado com sucesso! Buscando detalhes...");
        // Busca os detalhes recém-cadastrados
        handleBuscarCliente(); 
    } else {
        showMessage(result.erro, true);
    }
}


// 5. Renderiza os detalhes e histórico do cliente
function renderDetalhesCliente(result) {
    const paciente = result.paciente;
    const historico = result.historico;
    const sessoesNoMes = result.sessoesNoMes;
    const detalhesDiv = document.getElementById('clienteDetalhes');
    
    // Formatação do histórico
    const historicoHTML = historico.map(sessao => `
        <li class="p-2 border-b flex justify-between items-center text-sm">
            <span>${sessao.data_sessao} | ${sessao.anotacao || 'Sem anotação'}</span>
            <span class="${sessao.status_pagamento === 'PAGO' ? 'text-green-600' : 'text-red-600'} font-semibold">${sessao.status_pagamento}</span>
        </li>
    `).join('');

    detalhesDiv.innerHTML = `
        <h3 class="text-2xl font-bold text-gray-800 mb-4">${paciente.nome} (${paciente.cpf})</h3>
        
        <!-- Estatísticas e Preço -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-blue-100 p-4 rounded-lg shadow-md">
                <p class="text-sm font-medium">Sessões no Mês:</p>
                <p class="text-2xl font-bold">${sessoesNoMes}</p>
            </div>
            <div class="bg-purple-100 p-4 rounded-lg shadow-md">
                <p class="text-sm font-medium">Preço da Sessão:</p>
                <p class="text-2xl font-bold">R$ ${parseFloat(paciente.preco_sessao).toFixed(2).replace('.', ',')}</p>
            </div>
             <div class="bg-gray-100 p-4 rounded-lg shadow-md">
                <p class="text-sm font-medium">Tratamento:</p>
                <p class="text-lg font-bold">${paciente.tratamento}</p>
            </div>
        </div>

        <!-- Ações do Cliente -->
        <div class="flex space-x-4 mb-6">
            <button id="registrarSessaoBtn" class="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded transition duration-150">
                Registrar Nova Sessão
            </button>
            <button id="marcarPagamentoBtn" class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded transition duration-150">
                Marcar Pagamento
            </button>
        </div>

        <!-- Histórico de Sessões -->
        <div class="mt-6 border rounded-lg p-4">
            <h4 class="text-xl font-semibold mb-3">Histórico de Sessões (${historico.length})</h4>
            <ul class="max-h-80 overflow-y-auto">
                ${historicoHTML.length > 0 ? historicoHTML : '<li class="text-gray-500">Nenhuma sessão registrada.</li>'}
            </ul>
        </div>
    `;
    
    // Adicionar Listeners
    document.getElementById('registrarSessaoBtn').addEventListener('click', () => renderRegistrarSessaoForm(paciente.cpf));
    document.getElementById('marcarPagamentoBtn').addEventListener('click', renderMarcarPagamentoForm);
}

// 6. Formulário para Registrar Sessão
function renderRegistrarSessaoForm(cpf) {
    const detalhesDiv = document.getElementById('clienteDetalhes');
    detalhesDiv.innerHTML += `
        <div id="sessaoModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
            <div class="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md">
                <h3 class="text-xl font-bold mb-4">Registrar Sessão para ${clienteAtual.nome}</h3>
                <form id="sessaoForm" class="space-y-4">
                    <div>
                        <label for="sessaoData" class="block text-sm font-medium text-gray-700">Data da Sessão:</label>
                        <input type="date" id="sessaoData" required class="p-2 border rounded w-full">
                    </div>
                    <div>
                        <label for="sessaoAnotacao" class="block text-sm font-medium text-gray-700">Anotação/Evolução:</label>
                        <textarea id="sessaoAnotacao" rows="3" class="p-2 border rounded w-full"></textarea>
                    </div>
                    <div class="flex justify-end space-x-3">
                        <button type="button" id="cancelarSessaoBtn" class="px-4 py-2 text-gray-700 border rounded hover:bg-gray-100">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600">Salvar Sessão</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('cancelarSessaoBtn').addEventListener('click', () => document.getElementById('sessaoModal').remove());
    document.getElementById('sessaoForm').addEventListener('submit', handleRegistrarSessao);
}

// 7. Envia o Registro de Sessão
async function handleRegistrarSessao(event) {
    event.preventDefault();
    const form = event.target;

    const dados = {
        cpf: clienteAtual.cpf,
        data_sessao: form.sessaoData.value,
        anotacao: form.sessaoAnotacao.value,
    };

    const result = await executeAction('registrarSessao', dados, 'POST');

    if (result.sucesso) {
        showMessage("Sessão registrada com sucesso!");
        document.getElementById('sessaoModal').remove();
        // Recarrega os detalhes para atualizar o histórico
        handleBuscarCliente(clienteAtual.cpf); 
    } else {
        showMessage(result.erro, true);
    }
}

// 8. Formulário para Marcar Pagamento
function renderMarcarPagamentoForm() {
    const detalhesDiv = document.getElementById('clienteDetalhes');
    detalhesDiv.innerHTML += `
        <div id="pagamentoModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
            <div class="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md">
                <h3 class="text-xl font-bold mb-4">Marcar Pagamento para ${clienteAtual.nome}</h3>
                <form id="pagamentoForm" class="space-y-4">
                    <p class="text-sm text-gray-600">Marque como pago todas as sessões PENDENTES no período selecionado.</p>
                    <div>
                        <label for="dataInicio" class="block text-sm font-medium text-gray-700">Data de Início do Período:</label>
                        <input type="date" id="dataInicio" required class="p-2 border rounded w-full">
                    </div>
                    <div>
                        <label for="dataFim" class="block text-sm font-medium text-gray-700">Data Final do Período:</label>
                        <input type="date" id="dataFim" required class="p-2 border rounded w-full">
                    </div>
                    <div class="flex justify-end space-x-3">
                        <button type="button" id="cancelarPagamentoBtn" class="px-4 py-2 text-gray-700 border rounded hover:bg-gray-100">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">Marcar como Pago</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('cancelarPagamentoBtn').addEventListener('click', () => document.getElementById('pagamentoModal').remove());
    document.getElementById('pagamentoForm').addEventListener('submit', handleMarcarPagamento);
}

// 9. Envia a Marcação de Pagamento
async function handleMarcarPagamento(event) {
    event.preventDefault();
    const form = event.target;
    
    const dados = {
        cpf: clienteAtual.cpf,
        dataInicio: form.dataInicio.value,
        dataFim: form.dataFim.value,
    };

    const result = await executeAction('marcarPagamento', dados, 'POST');

    if (result.sucesso) {
        showMessage(result.mensagem);
        document.getElementById('pagamentoModal').remove();
        // Recarrega os detalhes para atualizar o status do histórico
        handleBuscarCliente(clienteAtual.cpf); 
    } else {
        showMessage(result.erro || result.mensagem, true);
    }
}

// 10. Listar Todos os Clientes (View simplificada)
async function handleVerTodosClientes() {
    const clientesView = document.getElementById('clientesView');
    clientesView.innerHTML = '<p class="text-blue-500">Carregando lista de clientes...</p>';
    
    const result = await executeAction('listarPacientes', {}, 'GET');

    if (result.sucesso) {
        pacientesCache = result.pacientes;
        const listaHTML = pacientesCache.map(p => `
            <li class="p-3 border-b hover:bg-gray-50 cursor-pointer flex justify-between items-center" data-cpf="${p.cpf}">
                <span>${p.nome}</span>
                <span class="text-gray-500 text-sm">${p.cpf}</span>
            </li>
        `).join('');

        clientesView.innerHTML = `
            <div class="p-6 bg-white rounded-lg shadow-xl">
                <h2 class="text-xl font-bold mb-4">Lista Completa de Clientes (${pacientesCache.length})</h2>
                <button id="voltarBuscaBtn" class="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition duration-150">
                    Voltar para Busca
                </button>
                <ul class="border rounded-lg max-h-96 overflow-y-auto">
                    ${listaHTML.length > 0 ? listaHTML : '<li class="p-4 text-gray-500">Nenhum cliente cadastrado.</li>'}
                </ul>
            </div>
        `;
        
        document.getElementById('voltarBuscaBtn').addEventListener('click', renderBuscarClienteView);
        document.querySelectorAll('#clientesView ul li').forEach(item => {
            item.addEventListener('click', (e) => {
                const cpf = e.currentTarget.dataset.cpf;
                document.getElementById('cpfInput').value = cpf; // Preenche o input
                renderBuscarClienteView(); // Volta para a tela de busca
                setTimeout(() => handleBuscarCliente(), 50); // Simula a busca imediatamente
            });
        });

    } else {
        renderBuscarClienteView(); // Volta para a view de busca em caso de erro
        showMessage(result.erro, true);
    }
}


// =======================================================
// LÓGICA DA AGENDA (FullCalendar - Exemplo Básico)
// =======================================================

let calendar = null;

function loadAgenda() {
    const calendarEl = document.getElementById('calendar');
    
    if (!calendarEl) {
        const agendaView = document.getElementById('agendaView');
        if(agendaView) {
            agendaView.innerHTML = '<div id="calendar" class="p-4"></div>';
        } else {
            return; // Garante que o elemento existe
        }
    }
    
    // 🚨 NOTA: Para este código funcionar, você precisa adicionar as bibliotecas FullCalendar no seu index.html
    // <script src='https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.js'></script>
    if (typeof FullCalendar === 'undefined') {
        showMessage("A biblioteca FullCalendar não foi carregada. Adicione os scripts no seu index.html.", true);
        return;
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        locale: 'pt-br',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        editable: true,
        selectable: true,
        slotMinTime: '08:00:00',
        slotMaxTime: '22:00:00',
        businessHours: {
            daysOfWeek: [1, 2, 3, 4, 5], // Seg - Sex
            startTime: '08:00',
            endTime: '18:00'
        },
        
        // Função que o FullCalendar usa para carregar eventos
        events: async function(fetchInfo, successCallback, failureCallback) {
            const result = await executeAction('getAgenda', {
                start: fetchInfo.startStr,
                end: fetchInfo.endStr
            }, 'GET');

            if (result.sucesso === false || result.erro) {
                failureCallback(result.erro);
                return;
            }

            // O Apps Script já retorna no formato FullCalendar
            successCallback(result);
        },

        // Handler para quando o usuário clicar em um espaço vazio (criação)
        select: (info) => {
            const title = prompt('Título do Evento (ex: Nome do Cliente ou BLOQUEIO):');
            if (title) {
                handleSaveEvent(null, title, info.startStr, info.endStr);
            }
            calendar.unselect();
        },

        // Handler para arrastar/redimensionar um evento (modificação)
        eventDrop: (info) => {
             handleSaveEvent(info.event.id, info.event.title, info.event.startStr, info.event.endStr);
        },
        eventResize: (info) => {
             handleSaveEvent(info.event.id, info.event.title, info.event.startStr, info.event.endStr);
        },
        
        // Handler para clicar em um evento (edição/exclusão)
        eventClick: (info) => {
            const action = confirm(`Evento: ${info.event.title}\n\nO que deseja fazer?`);
            if (action) {
                const newTitle = prompt('Novo Título:', info.event.title);
                if (newTitle) {
                    handleSaveEvent(info.event.id, newTitle, info.event.startStr, info.event.endStr);
                }
            } else if (confirm('Deseja excluir este evento?')) {
                handleDeleteEvent(info.event.id);
            }
        },

        // Cores customizadas
        eventDidMount: (info) => {
            // Se o seu Apps Script retornar o campo 'type', você pode colorir aqui.
            if (info.event.extendedProps.type === 'BLOQUEIO') {
                info.el.style.backgroundColor = '#EF4444'; // Red-500
                info.el.style.borderColor = '#B91C1C'; // Red-700
            } else {
                info.el.style.backgroundColor = '#3B82F6'; // Blue-500 (Default)
            }
        }
    });

    calendar.render();
}

async function handleSaveEvent(id, title, start, end) {
    const result = await executeAction('createEvent', { id, title, start, end }, 'POST');
    if (result.sucesso) {
        showMessage("Evento salvo com sucesso no Google Calendar!");
        if (calendar) calendar.refetchEvents(); // Recarrega os eventos na agenda
    } else {
        showMessage(result.erro, true);
    }
}

async function handleDeleteEvent(id) {
    const result = await executeAction('deleteEvent', { id }, 'POST');
    if (result.sucesso) {
        showMessage("Evento excluído com sucesso!");
        if (calendar) calendar.refetchEvents(); // Recarrega os eventos na agenda
    } else {
        showMessage(result.erro, true);
    }
}

// =======================================================
// LÓGICA DE RELATÓRIOS (EXEMPLO)
// =======================================================

function renderRelatoriosView() {
    const relatoriosView = document.getElementById('relatoriosView');
    if (!relatoriosView) return;

    relatoriosView.innerHTML = `
        <div class="p-6 bg-white rounded-lg shadow-xl w-full max-w-2xl mx-auto">
            <h2 class="text-2xl font-bold mb-4">Relatório Financeiro por Período</h2>
            <form id="relatorioForm" class="space-y-4">
                <div>
                    <label for="relatorioDataInicio" class="block text-sm font-medium text-gray-700">Data de Início:</label>
                    <input type="date" id="relatorioDataInicio" required class="p-2 border rounded w-full">
                </div>
                <div>
                    <label for="relatorioDataFim" class="block text-sm font-medium text-gray-700">Data Final:</label>
                    <input type="date" id="relatorioDataFim" required class="p-2 border rounded w-full">
                </div>
                <button type="submit" class="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded w-full">
                    Gerar Relatório
                </button>
            </form>
            <div id="relatorioResultados" class="mt-6">
                <!-- Resultados do relatório serão exibidos aqui -->
            </div>
        </div>
    `;

    document.getElementById('relatorioForm').addEventListener('submit', handleGerarRelatorio);
}

async function handleGerarRelatorio(event) {
    event.preventDefault();
    const form = event.target;
    const dataInicio = form.relatorioDataInicio.value;
    const dataFim = form.relatorioDataFim.value;

    const resultadosDiv = document.getElementById('relatorioResultados');
    resultadosDiv.innerHTML = '<p class="text-blue-500">Gerando relatório...</p>';

    const result = await executeAction('gerarRelatorioFinanceiro', { dataInicio, dataFim }, 'GET');

    if (result.sucesso) {
        const { totalSessoes, faturamentoTotal, detalhesClientes } = result;

        const detalhesHTML = detalhesClientes.map(c => `
            <li class="p-3 border-b flex justify-between items-center">
                <span>${c.nome}</span>
                <span class="text-sm">
                    Sessões: ${c.numSessoes} | 
                    Total Devido: R$ ${(c.numSessoes * c.preco).toFixed(2).replace('.', ',')} |
                    Status: <span class="${c.status === 'PENDENTE' ? 'text-red-600 font-bold' : 'text-green-600'}">${c.status}</span>
                </span>
            </li>
        `).join('');


        resultadosDiv.innerHTML = `
            <h3 class="text-xl font-bold mb-3 border-b pb-2">Resumo Financeiro</h3>
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="bg-gray-100 p-3 rounded-lg">
                    <p class="text-sm font-medium">Total de Sessões no Período:</p>
                    <p class="text-2xl font-bold">${totalSessoes}</p>
                </div>
                <div class="bg-green-100 p-3 rounded-lg">
                    <p class="text-sm font-medium">Faturamento Confirmado (PAGO):</p>
                    <p class="text-2xl font-bold text-green-700">R$ ${faturamentoTotal.toFixed(2).replace('.', ',')}</p>
                </div>
            </div>
            
            <h4 class="text-lg font-semibold mb-3">Detalhamento por Cliente</h4>
            <ul class="border rounded-lg max-h-80 overflow-y-auto">
                ${detalhesHTML.length > 0 ? detalhesHTML : '<li class="p-3 text-gray-500">Nenhuma sessão encontrada no período.</li>'}
            </ul>
        `;
    } else {
        showMessage(result.erro, true);
        resultadosDiv.innerHTML = `<p class="text-red-500">${result.erro}</p>`;
    }
}
