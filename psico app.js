 // app.js

// ⚠️ URL do seu App Script:
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw3NE4A49kGH62hpsoCi8D8ne5r_89t_dWgf2CSExGJ9ue6yyCOg2dXY3Bc1gjhG812/exec"; 

// A partir daqui, o código assume que você também precisa de funções para a navegação básica
document.addEventListener('DOMContentLoaded', function() {
    // Inicializa a view padrão (você pode mudar esta função)
    mostrarBemVindo(); 
    
    // Configura os listeners de clique para o menu
    document.querySelectorAll('#menu-principal a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const view = this.getAttribute('data-view');
            
            // Aqui você define qual função chamar para cada view
            if (view === 'pacientes') {
                // Por enquanto, apenas abre o formulário de cadastro, mas deve listar!
                abrirFormularioNovoPaciente(); 
            }
            // Adicione chamadas para as outras views (prontuarios, financeiro) aqui
            // else if (view === 'prontuarios') mostrarProntuarios();
        });
    });

    // Configura o listener para o botão rápido de novo paciente
    const btnNovoPaciente = document.querySelector('button[onclick="abrirFormularioNovoPaciente()"]');
    if(btnNovoPaciente) {
        btnNovoPaciente.onclick = abrirFormularioNovoPaciente;
    }
});


// 1. Função para abrir o formulário de cadastro de paciente
function abrirFormularioNovoPaciente() {
    const viewContainer = document.getElementById('view-dinamica');
    viewContainer.innerHTML = `
        <h2>Cadastro de Novo Paciente</h2>
        <form id="form-cadastro-paciente">
            <label>Nome:</label><input type="text" name="nome" required><br>
            <label>CPF:</label><input type="text" name="cpf" required><br>
            <label>Idade:</label><input type="number" name="idade"><br>
            <label>Tratamento:</label><input type="text" name="tratamento"><br>
            <button type="submit">Cadastrar no Google Sheets</button>
        </form>
    `;

    // 2. Lógica para submissão do formulário e envio para o Google Sheets
    document.getElementById('form-cadastro-paciente').addEventListener('submit', function(event) {
        event.preventDefault();
        const dados = new FormData(event.target);
        
        const pacienteParaSheet = {
            nome: dados.get('nome'),
            cpf: dados.get('cpf'),
            idade: dados.get('idade'),
            tratamento: dados.get('tratamento')
        };
        
        // Envia os dados para o Google Apps Script
        fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors', 
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pacienteParaSheet) // Envia o objeto como JSON
        })
        .then(response => response.json())
        .then(data => {
            if (data.resultado === "sucesso") {
                alert('✅ Paciente cadastrado no Google Sheets com sucesso! ID: ' + data.novoID);
                // O novo ID é útil para vincular sessões e financeiro!
                // Limpa o formulário após o sucesso
                document.getElementById('form-cadastro-paciente').reset(); 
            } else {
                alert('❌ Erro ao cadastrar: ' + (data.mensagem || 'Verifique o Apps Script.'));
            }
        })
        .catch(error => {
            console.error('Erro de rede/servidor:', error);
            alert('❌ Erro de conexão. Verifique se o seu Apps Script está ativo.');
        });
    });
}

function mostrarBemVindo() {
     const viewContainer = document.getElementById('view-dinamica');
     viewContainer.innerHTML = '<h2>Bem-vindo!</h2><p>Use os botões de ação ou o menu principal para gerenciar os dados dos pacientes.</p>';
}

// **Próxima Etapa Crítica:** Implementar a função para LER os dados da planilha!
// Você precisará de uma nova função no Apps Script (doGet) para buscar os dados.
