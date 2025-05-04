// Configuração inicial
const SERVER_URL = 'http://localhost:3001';

// Verificação imediata de autenticação
(function checkAuth() {
    // Verifica se está na página inicial (qualquer URL que não seja login.html)
    const isLoginPage = window.location.pathname.includes('login.html');
    if (isLoginPage) return;

    // Verifica autenticação
    const isGuest = localStorage.getItem('guestMode') === 'true';
    const hasToken = localStorage.getItem('authToken');

    console.log('Verificação inicial de autenticação:', { isGuest, hasToken });

    // Se não tiver autenticação, redireciona para login
    if (!isGuest && !hasToken) {
        console.log('Redirecionando para login...');
        window.location.replace('login.html');
    }
})();

// Mensagem inicial padrão
const WELCOME_MESSAGE = {
    text: 'Olá! Como posso ajudar você hoje com questões de saúde? Se estiver enfrentando algum sintoma ou preocupação, fique à vontade para compartilhar comigo. Estou aqui para ajudar.',
    type: 'bot'
};

let conversationHistory = [];

// Elementos do DOM
const chatMessages = document.querySelector('.chat-messages');
const userInput = document.querySelector('.chat-input');
const sendButton = document.querySelector('.send-button');
const connectionStatus = document.querySelector('.connection-status');
const clearButton = document.querySelector('.clear-button');
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = themeToggle?.querySelector('i');
const voiceButton = document.querySelector('.voice-button');
const accessibilityToggle = document.querySelector('.accessibility-toggle');
const historyToggle = document.querySelector('.history-toggle');
const newButton = document.querySelector('.new-button');
const emergencyButton = document.querySelector('.emergency-menu-button');
const logoutButton = document.querySelector('.logout-button');

// Lista de sintomas comuns com ícones
const commonSymptoms = [
    { text: 'Dor de cabeça', icon: 'fa-head-side-virus', severity: 'medium' },
    { text: 'Febre', icon: 'fa-temperature-high', severity: 'medium' },
    { text: 'Gripe', icon: 'fa-head-side-cough', severity: 'medium' },
    { text: 'Dor no corpo', icon: 'fa-person-dots-from-line', severity: 'medium' }
];

// Emojis para diferentes contextos
const SYMPTOM_EMOJIS = {
    high: '🚨',
    medium: '⚠️',
    low: 'ℹ️',
    fever: '🌡️',
    pain: '🤕',
    respiratory: '🫁',
    digestive: '🤢',
    mental: '🧠',
    general: '👨‍⚕️'
};

// Variáveis para controle de inatividade
let inactivityTimeout;
const INACTIVITY_TIMEOUT = 300000; // 5 minutos em milissegundos

// Função para resetar o timer de inatividade
function resetTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => {
        addMessage({
            text: 'Você está aí? Se precisar de ajuda, estou à disposição.',
            type: 'bot'
        }, true);
    }, INACTIVITY_TIMEOUT);
}

// Função para verificar inatividade
function startInactivityCheck() {
    // Eventos que resetam o timer
    document.addEventListener('mousemove', resetTimer);
    document.addEventListener('keypress', resetTimer);
    document.addEventListener('click', resetTimer);
    
    // Inicia o timer
    resetTimer();
}

// Variáveis globais para controle da triagem
let triageProgress = 0;
let currentSeverity = 'low';
const TRIAGE_STEPS = 5; // Número total de etapas da triagem

// Palavras-chave para determinar a gravidade
const SEVERITY_KEYWORDS = {
    high: ['intensa', 'grave', 'severa', 'emergência', 'desmaio', 'convulsão', 'hemorragia'],
    medium: ['moderada', 'febre', 'vômito', 'diarreia', 'tontura'],
    low: ['leve', 'pequena', 'suave', 'discreta']
};

// Elementos de acessibilidade
const accessibilityPanel = document.getElementById('accessibilityPanel');
const accessibilityOverlay = document.getElementById('accessibilityOverlay');
const closeAccessibility = document.getElementById('closeAccessibility');
const fontButtons = document.querySelectorAll('.font-buttons-container .font-button');
const spacingButtons = document.querySelectorAll('.spacing-buttons-container .spacing-button');
const dyslexicToggle = document.getElementById('dyslexicToggle');
const voiceToggle = document.getElementById('voiceToggle');

// Elementos de voz
let recognition = null;
let isListening = false;

// Elementos de emergência
const emergencyPanel = document.getElementById('emergencyPanel');
const closeEmergency = document.querySelector('#emergencyPanel .close-button');
const menuOverlay = document.querySelector('.menu-overlay');
const emergencyContacts = document.querySelectorAll('.emergency-contact');

// Elementos do Modal de Confirmação
const confirmationOverlay = document.getElementById('confirmationOverlay');
const confirmationModal = document.getElementById('confirmationModal');
const confirmButton = document.getElementById('confirmNewSession');
const cancelButton = document.getElementById('cancelNewSession');
const newSessionButton = document.getElementById('newSessionButton');

// Elementos do DOM para o menu mobile
const menuMobile = document.querySelector('.menu-mobile');
const menuOverlayMobile = document.getElementById('menuOverlay');
const headerButtonsMobile = document.getElementById('headerButtons');

// Inicialização do menu mobile
function initializeMobileMenu() {
    console.log('Inicializando menu mobile...');
    
    if (menuMobile && menuOverlayMobile && headerButtonsMobile) {
// Evento de clique no botão do menu mobile
menuMobile.addEventListener('click', () => {
            console.log('Menu mobile clicado');
    headerButtonsMobile.classList.toggle('active');
    menuOverlayMobile.classList.toggle('active');
});

// Fecha o menu ao clicar no overlay
menuOverlayMobile.addEventListener('click', () => {
            console.log('Overlay clicado');
    headerButtonsMobile.classList.remove('active');
    menuOverlayMobile.classList.remove('active');
});

        // Fecha o menu ao clicar em qualquer botão
        headerButtonsMobile.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
        headerButtonsMobile.classList.remove('active');
        menuOverlayMobile.classList.remove('active');
    });
});
    } else {
        console.error('Elementos do menu mobile não encontrados:', {
            menuMobile: !!menuMobile,
            menuOverlayMobile: !!menuOverlayMobile,
            headerButtonsMobile: !!headerButtonsMobile
        });
    }
}

// Função para verificar se é dispositivo móvel
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Toggle do painel de emergência
emergencyButton.addEventListener('click', (e) => {
    e.stopPropagation();
    emergencyPanel.classList.toggle('active');
    menuOverlay.classList.toggle('active');
    
    // Se estiver no menu mobile, fecha o menu
    const headerButtons = document.getElementById('headerButtons');
    if (headerButtons.classList.contains('active')) {
        headerButtons.classList.remove('active');
        menuOverlayMobile.classList.remove('active');
    }
});

// Fecha o painel quando clicar no botão de fechar
closeEmergency.addEventListener('click', (e) => {
    e.stopPropagation();
    emergencyPanel.classList.remove('active');
    menuOverlay.classList.remove('active');
});

// Fecha o painel quando clicar no overlay
menuOverlay.addEventListener('click', () => {
    emergencyPanel.classList.remove('active');
    menuOverlay.classList.remove('active');
});

// Comportamento dos links de emergência
emergencyContacts.forEach(contact => {
    contact.addEventListener('click', (e) => {
        if (!isMobileDevice()) {
            e.preventDefault();
            const number = contact.querySelector('.contact-number').textContent;
            const name = contact.querySelector('.contact-name').textContent;
            
            // Copia o número para a área de transferência
            navigator.clipboard.writeText(number).then(() => {
                showToast(`Número ${number} (${name}) copiado para a área de transferência`, 'success');
            });
        }
        // Em dispositivos móveis, o comportamento padrão do href="tel:" será mantido
    });
});

// Função para verificar conexão com o servidor
async function checkServerConnection() {
    try {
        console.log('Verificando conexão com o servidor...');
        const response = await fetch(`${SERVER_URL}/api/health`);
        const data = await response.json();
        
        connectionStatus.textContent = 'Conectado';
        connectionStatus.className = 'connection-status online';
        console.log('Servidor respondeu:', data);
        return true;
    } catch (error) {
        console.error('Erro ao conectar ao servidor:', error);
        connectionStatus.textContent = 'Desconectado';
        connectionStatus.className = 'connection-status offline';
        addMessage('⚠️ Erro de conexão: Não foi possível conectar ao servidor. Por favor, execute o arquivo iniciar.bat para iniciar o servidor.');
        return false;
    }
}

// Formata a data para exibição
function formatTime(date) {
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Função para adicionar mensagem ao chat
function addMessage(content, isBot = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isBot ? 'bot-message' : 'user-message'}`;
    
    // Adiciona o avatar
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    if (isBot) {
        avatarDiv.innerHTML = '<i class="fas fa-user-md"></i>';
        avatarDiv.style.backgroundColor = '#4CAF50';
    } else {
        avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
        avatarDiv.style.backgroundColor = '#2196F3';
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Se o conteúdo for um objeto com text e type, usa apenas o text
    if (typeof content === 'object' && content.text) {
        contentDiv.textContent = content.text;
    } else {
    contentDiv.textContent = content;
    }
    
    if (isBot) {
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
    } else {
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(avatarDiv);
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Adiciona ao histórico
    conversationHistory.push({
        role: isBot ? 'assistant' : 'user',
        content: typeof content === 'object' ? content.text : content,
        timestamp: new Date()
    });
    
    // Salva o histórico
    saveConversationHistory();
}

// Função para verificar se deve mostrar os botões de ação
function shouldShowActionButtons(content) {
    // Verifica se já houve interação suficiente (pelo menos 3 mensagens trocadas)
    if (conversationHistory.length < 3) {
        return false;
    }

    // Verifica se o bot está fazendo uma recomendação médica
    const hasRecommendation = content.toLowerCase().includes('recomendo') || 
                             content.toLowerCase().includes('procure um médico') ||
                             content.toLowerCase().includes('busque atendimento');

    // Verifica se o bot está perguntando se pode ajudar mais
    const isAskingToHelp = content.toLowerCase().includes('posso ajudar') || 
                          content.toLowerCase().includes('mais alguma coisa') ||
                          content.toLowerCase().includes('mais algum sintoma') ||
                          content.toLowerCase().includes('algo mais');

    // Verifica se é uma resposta conclusiva
    const isConclusive = content.toLowerCase().includes('importante buscar atendimento') ||
                        content.toLowerCase().includes('necessário consultar um médico') ||
                        content.toLowerCase().includes('recomendo que você procure');

    // Se alguma das condições for verdadeira, mostra os botões de ação
    if (hasRecommendation || isAskingToHelp || isConclusive) {
        const actionButtons = document.createElement('div');
        actionButtons.className = 'message-actions';
        actionButtons.innerHTML = `
            <button class="action-button" onclick="finishAttendance()">
                <i class="fas fa-check-circle"></i>
                Finalizar Atendimento
            </button>
            <button class="action-button" onclick="continueAttendance()">
                <i class="fas fa-plus-circle"></i>
                Continuar Atendimento
            </button>
        `;
        return actionButtons;
    }

    return false;
}

// Adiciona indicador de digitação
function showTypingIndicator() {
    const messagesContainer = document.querySelector('.chat-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-indicator';
    
    // Adiciona o avatar do bot
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.innerHTML = '<i class="fas fa-robot"></i>';
    typingDiv.appendChild(avatarDiv);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = '<span></span><span></span><span></span>';
    typingDiv.appendChild(contentDiv);
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
    });
    
    return typingDiv;
}

// Remove o indicador de digitação
function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
    }
}

// Envia mensagem para o servidor
async function sendMessageToServer(message) {
    try {
        const isGuest = localStorage.getItem('guestMode') === 'true';
        const authToken = localStorage.getItem('authToken');
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };
        
        const response = await fetch(`${SERVER_URL}/api/chat`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ 
                message,
                isGuest: isGuest
            })
        });

        if (response.status === 401) {
            // Se for convidado, não redireciona para login
            if (!isGuest) {
                localStorage.clear();
                window.location.href = 'login.html';
            }
            return null;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        return null;
    }
}

// Variável para controlar o ID da conversa atual
let currentConversationId = null;

// Salva o histórico da conversa
async function saveConversationHistory() {
    try {
        const isGuest = localStorage.getItem('guestMode') === 'true';
        const authToken = localStorage.getItem('authToken');

        if (!conversationHistory.length) return;

    const symptoms = extractSymptoms(conversationHistory);
        const duration = calculateDuration(conversationHistory);
        const severity = getMaxSeverity(conversationHistory);

        const headers = {
            'Content-Type': 'application/json'
        };

        // Adiciona o token de autenticação se não for convidado
        if (!isGuest && authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${SERVER_URL}/api/history`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                symptoms,
                severity,
                duration,
                conversation: conversationHistory,
                isGuest
            })
        });

        if (!response.ok) {
            // Se for erro de autenticação e não for convidado, apenas loga o erro
            if (response.status === 401 && !isGuest) {
                console.log('Erro de autenticação ao salvar histórico');
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.details || 'Erro ao salvar histórico');
        }

        const data = await response.json();
        console.log('Histórico salvo com sucesso:', data);
    } catch (error) {
        console.error('Erro ao salvar histórico:', error);
    }
}

// Extrai os sintomas da conversa
function extractSymptoms(messages) {
    try {
        // Pega a primeira mensagem do usuário que geralmente contém os sintomas principais
        const userMessages = messages.filter(msg => msg.role === 'user');
        if (userMessages.length === 0) return 'Sem sintomas registrados';
        
        // Usa a primeira mensagem do usuário como sintomas principais
        const mainSymptoms = userMessages[0].content;
        
        // Garante que o retorno seja uma string
        return typeof mainSymptoms === 'string' ? mainSymptoms : 'Sem sintomas registrados';
    } catch (error) {
        console.error('Erro ao extrair sintomas:', error);
        return 'Erro ao extrair sintomas';
    }
}

// Função para calcular duração do atendimento
function calculateDuration(messages) {
    if (messages.length < 2) return '< 1 min';
    
    const start = new Date(messages[0].timestamp);
    const end = new Date(messages[messages.length - 1].timestamp);
    const diff = Math.floor((end - start) / 1000 / 60); // em minutos
    
    if (diff < 1) return '< 1 min';
    if (diff < 60) return `${diff} min`;
    return `${Math.floor(diff/60)}h ${diff%60}min`;
}

// Função para obter a maior gravidade do atendimento
function getMaxSeverity(messages) {
    let maxSeverity = 'low';
    
    messages.forEach(msg => {
        if (msg.role === 'assistant') {
            if (determineSeverity(msg.content) === 'high') maxSeverity = 'high';
            else if (determineSeverity(msg.content) === 'medium' && maxSeverity !== 'high') maxSeverity = 'medium';
        }
    });
    
    return maxSeverity;
}

// Função para carregar um atendimento específico
function loadAttendance(attendance) {
    console.log('Carregando atendimento:', attendance);
    chatMessages.innerHTML = '';
    conversationHistory = attendance.messages || [];
    
    // Se não houver mensagens, adiciona a mensagem inicial
    if (!attendance.messages || attendance.messages.length === 0) {
        addMessage(WELCOME_MESSAGE, true);
        return;
    }
    
    // Adiciona as mensagens do histórico
    attendance.messages.forEach(msg => {
        addMessage(msg.content, msg.role === 'assistant');
    });
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Variável global para controlar o ID do atendimento atual sendo visualizado
let currentViewingId = null;

// Função para visualizar uma conversa específica
async function viewConversation(chatId) {
    try {
        // Se já estiver visualizando este atendimento, não faz nada
        if (currentViewingId === chatId) {
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            showToast('Faça login para acessar seu histórico', 'info');
            return;
        }

        // Atualiza o ID do atendimento sendo visualizado
        currentViewingId = chatId;

        // Limpa o chat atual
        chatMessages.innerHTML = '';
        
        // Procura o atendimento no histórico exibido
        const attendanceItem = document.querySelector(`[data-id="${chatId}"]`);
        if (attendanceItem) {
            const symptoms = attendanceItem.querySelector('.attendance-symptoms').textContent;
            const severity = attendanceItem.querySelector('.attendance-severity').textContent;
            const date = attendanceItem.querySelector('.attendance-date').textContent;
            
            // Adiciona cabeçalho do atendimento antigo
            const headerDiv = document.createElement('div');
            headerDiv.className = 'message bot-message';
            headerDiv.innerHTML = `
                <div class="message-content">
                    <h3><i class="fas fa-history"></i> Atendimento Anterior</h3>
                    <p><strong>Data:</strong> ${date}</p>
                    <p>${symptoms}</p>
                    <p><strong>Gravidade:</strong> ${severity}</p>
                </div>
            `;
            chatMessages.appendChild(headerDiv);
        }

        // Carrega as mensagens do atendimento
        const response = await fetch(`${SERVER_URL}/api/history/${chatId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar conversa');
        }

        const chat = await response.json();
        
        // Exibe cada mensagem da conversa
        if (chat && chat.conversation) {
            chat.conversation.forEach(message => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${message.role === 'assistant' ? 'bot-message' : 'user-message'}`;
                
                // Adiciona o avatar
                const avatarDiv = document.createElement('div');
                avatarDiv.className = 'message-avatar';
                if (message.role === 'assistant') {
                    avatarDiv.innerHTML = '<i class="fas fa-user-md"></i>';
                    avatarDiv.style.backgroundColor = '#4CAF50';
                } else {
                    avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
                    avatarDiv.style.backgroundColor = '#2196F3';
                }
                
                const contentDiv = document.createElement('div');
                contentDiv.className = 'message-content';
                contentDiv.innerHTML = message.content;
                
                if (message.role === 'assistant') {
                    messageDiv.appendChild(avatarDiv);
                    messageDiv.appendChild(contentDiv);
                } else {
                    messageDiv.appendChild(contentDiv);
                    messageDiv.appendChild(avatarDiv);
                }
                
                chatMessages.appendChild(messageDiv);
            });
        }

        // Adiciona botão para voltar ao histórico
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message bot-message';
        actionsDiv.innerHTML = `
            <div class="message-content">
                <div class="attendance-actions">
                    <button class="attendance-button continue" onclick="returnToCurrentAttendance()">
                        <i class="fas fa-arrow-left"></i>
                        Voltar ao Atendimento Atual
                    </button>
                </div>
            </div>
        `;
        chatMessages.appendChild(actionsDiv);

        // Rola para o topo da conversa
        chatMessages.scrollTop = 0;

    } catch (error) {
        console.error('Erro ao carregar conversa:', error);
        showToast('Erro ao carregar conversa. Tente novamente.', 'error');
        currentViewingId = null;
    }
}

// Função para exibir uma conversa específica
function displayConversation(chat) {
    clearChat();
    chat.conversation.forEach(message => {
        addMessage(message.content, message.role === 'assistant');
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    await initialize();
    addMessage(WELCOME_MESSAGE, true);
});

// Atualizar histórico após cada conversa
async function updateHistory() {
    await loadUserHistory();
}

function displayHistory(history) {
    // Limpa mensagens atuais
    chatMessages.innerHTML = '';
    
    // Cria o container principal do histórico
    const historyContainer = document.createElement('div');
    historyContainer.className = 'history-container';
    
    // Adiciona o cabeçalho
    const header = document.createElement('div');
    header.className = 'history-header';
    header.innerHTML = `
            <h3><i class="fas fa-history"></i> Histórico de Atendimentos</h3>
            <p>Selecione um atendimento para visualizar:</p>
    `;
    historyContainer.appendChild(header);
    
    // Cria a lista de atendimentos com rolagem própria
    const attendanceList = document.createElement('div');
    attendanceList.className = 'attendance-list';
    
    if (history.length === 0) {
        attendanceList.innerHTML = '<p class="text-center text-muted">Nenhum histórico encontrado</p>';
    } else {
        history.forEach(att => {
            const attendanceItem = document.createElement('div');
            attendanceItem.className = 'attendance-item';
            attendanceItem.setAttribute('data-id', att._id);
            attendanceItem.innerHTML = `
                            <div class="attendance-header">
                                <span class="attendance-date">
                                    <i class="far fa-calendar"></i>
                                    ${new Date(att.timestamp).toLocaleString()}
                                </span>
                                <span class="attendance-duration">
                                    <i class="far fa-clock"></i>
                                    ${att.duration || '< 1 min'}
                                </span>
                            </div>
                            <div class="attendance-details">
                                <div class="attendance-symptoms">
                                    <strong>Sintomas:</strong> ${att.symptoms || 'Não informado'}
                                </div>
                                <div class="attendance-severity ${att.severity ? att.severity.toLowerCase().replace(' ', '-') : 'não-informado'}">
                                    <i class="fas fa-exclamation-circle"></i>
                                    ${att.severity || 'Não informado'}
                                </div>
                            </div>
                            <button class="btn btn-primary btn-sm view-conversation" onclick="viewConversation('${att._id}')">
                                <i class="fas fa-eye"></i> Visualizar
                            </button>
            `;
            attendanceList.appendChild(attendanceItem);
        });
    }
    
    historyContainer.appendChild(attendanceList);
    
    // Adiciona o botão de voltar no final
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'attendance-actions';
    actionsDiv.innerHTML = `
                <button class="attendance-button continue" onclick="returnToCurrentAttendance()">
                    <i class="fas fa-arrow-left"></i>
                    Voltar ao Atendimento Atual
                </button>
    `;
    historyContainer.appendChild(actionsDiv);
    
    // Adiciona o container ao chat
    chatMessages.appendChild(historyContainer);
    
    // Adiciona estilos dinâmicos para o histórico
    const style = document.createElement('style');
    style.textContent = `
        .history-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            max-height: calc(100vh - 200px);
            padding: 20px;
            background: var(--bg-color);
            border-radius: 15px;
            box-shadow: 0 2px 15px rgba(0,0,0,0.05);
        }
        
        .history-header {
            margin-bottom: 15px;
        }
        
        .history-header h3 {
            font-size: 1.2em;
            color: var(--text-color);
            margin-bottom: 4px;
            font-weight: 500;
        }
        
        .history-header p {
            color: var(--text-color-secondary);
            font-size: 0.9em;
            opacity: 0.8;
        }
        
        .attendance-list {
            flex: 1;
            overflow-y: auto;
            padding-right: 12px;
            margin-bottom: 15px;
        }
        
        .attendance-item {
            background: var(--card-bg-color);
            border-radius: 10px;
            padding: 12px;
            margin-bottom: 8px;
            border: 1px solid rgba(0,0,0,0.05);
            transition: all 0.2s ease;
        }
        
        .attendance-item:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .attendance-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 0.85em;
            color: var(--text-color-secondary);
        }
        
        .attendance-date, .attendance-duration {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .attendance-details {
            margin: 8px 0;
        }
        
        .attendance-symptoms {
            margin-bottom: 6px;
            color: var(--text-color);
            font-size: 0.9em;
        }
        
        .attendance-severity {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.8em;
            padding: 3px 6px;
            border-radius: 4px;
            background: rgba(0,0,0,0.04);
            color: var(--text-color-secondary);
        }
        
        .btn.btn-primary.btn-sm.view-conversation {
            width: 100%;
            margin-top: 8px;
            padding: 6px;
            border-radius: 6px;
            background: var(--primary-color);
            border: none;
            color: white;
            font-size: 0.85em;
            opacity: 0.9;
            transition: opacity 0.2s;
        }
        
        .btn.btn-primary.btn-sm.view-conversation:hover {
            opacity: 1;
        }
        
        .attendance-actions {
            margin-top: auto;
            padding-top: 15px;
            border-top: 1px solid rgba(0,0,0,0.06);
        }
        
        .attendance-button.continue {
            width: 100%;
            padding: 10px;
            border-radius: 8px;
            background: var(--primary-color);
            color: white;
            border: none;
            font-size: 0.9em;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            opacity: 0.9;
            transition: all 0.2s;
        }
        
        .attendance-button.continue:hover {
            opacity: 1;
            transform: translateY(-1px);
        }
        
        /* Estilização da barra de rolagem */
        .attendance-list::-webkit-scrollbar {
            width: 4px;
        }
        
        .attendance-list::-webkit-scrollbar-track {
            background: transparent;
        }
        
        .attendance-list::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.1);
            border-radius: 2px;
        }
        
        .attendance-list::-webkit-scrollbar-thumb:hover {
            background: rgba(0,0,0,0.15);
        }
    `;
    document.head.appendChild(style);
}

// Função para retornar ao atendimento atual
function returnToCurrentAttendance() {
    currentViewingId = null;
    
    // Limpa o chat
    chatMessages.innerHTML = '';
    
    // Se houver mensagens no atendimento atual, exibe elas
    if (conversationHistory && conversationHistory.length > 0) {
        conversationHistory.forEach(message => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${message.role === 'assistant' ? 'bot-message' : 'user-message'}`;
            
            // Adiciona o avatar
            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'message-avatar';
            if (message.role === 'assistant') {
                avatarDiv.innerHTML = '<i class="fas fa-user-md"></i>';
                avatarDiv.style.backgroundColor = '#4CAF50';
            } else {
                avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
                avatarDiv.style.backgroundColor = '#2196F3';
            }
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = message.content;
            
            if (message.role === 'assistant') {
                messageDiv.appendChild(avatarDiv);
                messageDiv.appendChild(contentDiv);
            } else {
                messageDiv.appendChild(contentDiv);
                messageDiv.appendChild(avatarDiv);
            }
            
            chatMessages.appendChild(messageDiv);
        });
    } else {
        // Se não houver mensagens, inicia um novo atendimento
        startNewSession();
    }
    
    // Rola para o final da conversa
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Função para iniciar novo atendimento
function startNewSession() {
    console.log('Iniciando nova sessão');
    // Limpa o chat
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
    chatMessages.innerHTML = '';
    }
    // Adiciona a mensagem inicial
    addMessage(WELCOME_MESSAGE, true);
    // Reseta o progresso
    updateProgress(0);
}

// Função para mostrar histórico de atendimentos
function showAttendanceHistory() {
    const token = localStorage.getItem('authToken');
    const isGuest = localStorage.getItem('guestMode') === 'true';

    if (!token || isGuest) {
        showToast('Faça login para acessar seu histórico de atendimentos', 'info');
        return;
    }

    // Esconde o botão de histórico para convidados
    const historyButton = document.querySelector('.history-toggle');
    if (historyButton) {
        historyButton.style.display = isGuest ? 'none' : 'block';
    }

    loadUserHistory();
}

// Função para carregar histórico do usuário
async function loadUserHistory() {
    try {
        const token = localStorage.getItem('authToken');
        const isGuest = localStorage.getItem('guestMode') === 'true';
        console.log('Tentando carregar histórico com token:', token ? 'Presente' : 'Ausente', 'Convidado:', isGuest);

        // Se for convidado, não tenta carregar histórico
        if (isGuest) {
            console.log('Usuário é convidado, não carregando histórico');
            return;
        }

        if (!token) {
            console.log('Token não encontrado');
            return;
        }

        const response = await fetch(`${SERVER_URL}/api/history`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.log('Token inválido ou expirado');
                return;
            }
            throw new Error('Erro ao carregar histórico');
        }

        const data = await response.json();
        displayHistory(data);
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        showToast('Erro ao carregar histórico. Tente novamente mais tarde', 'error');
    }
}

// Função para atualizar a barra de progresso
function updateProgress(step = 1) {
    triageProgress = Math.min(100, triageProgress + (step * (100 / TRIAGE_STEPS)));
    const progressBar = document.getElementById('triageProgress');
    progressBar.style.width = `${triageProgress}%`;
}

// Função para determinar a gravidade baseada no texto
function determineSeverity(text) {
    text = text.toLowerCase();
    
    // Verifica palavras-chave de alta gravidade
    if (SEVERITY_KEYWORDS.high.some(keyword => text.includes(keyword))) {
        return 'high';
    }
    
    // Verifica palavras-chave de média gravidade
    if (SEVERITY_KEYWORDS.medium.some(keyword => text.includes(keyword))) {
        return 'medium';
    }
    
    // Verifica números na escala de dor
    const painLevel = text.match(/\b(?:dor|nível)\b.*?(\d+)/i);
    if (painLevel) {
        const level = parseInt(painLevel[1]);
        if (level >= 8) return 'high';
        if (level >= 5) return 'medium';
    }
    
    return 'low';
}

// Função para criar indicador de gravidade
function createSeverityIndicator(severity) {
    const severityIcons = {
        low: 'fa-info-circle',
        medium: 'fa-exclamation-circle',
        high: 'fa-exclamation-triangle'
    };
    
    const severityTexts = {
        low: 'Gravidade Baixa',
        medium: 'Gravidade Moderada',
        high: 'Gravidade Alta'
    };
    
    const div = document.createElement('div');
    div.className = `severity-indicator severity-${severity}`;
    div.innerHTML = `
        <i class="fas ${severityIcons[severity]}"></i>
        <span>${severityTexts[severity]}</span>
    `;
    
    return div;
}

// Função para criar botões de ação do atendimento
function createAttendanceActions() {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'attendance-actions';
    
    // Verifica se já houve uma recomendação médica clara
    const hasImportantRecommendation = conversationHistory.some(msg => 
        msg.role === 'assistant' && (
            msg.content.toLowerCase().includes('importante buscar atendimento') ||
            msg.content.toLowerCase().includes('necessário consultar um médico') ||
            msg.content.toLowerCase().includes('recomendo que você procure')
        )
    );
    
    actionsDiv.innerHTML = `
        <button class="attendance-button continue" onclick="continueAttendance()">
            <i class="fas fa-comments"></i>
            Continuar Atendimento
        </button>
        ${hasImportantRecommendation ? `
        <button class="attendance-button finish" onclick="finishAttendance()">
            <i class="fas fa-check-circle"></i>
            Finalizar Atendimento
        </button>
        ` : ''}
    `;
    
    return actionsDiv;
}

// Função para continuar o atendimento
function continueAttendance() {
    addMessage("Como posso ajudar mais?", true);
}

// Função para finalizar o atendimento
function finishAttendance() {
    const summary = createAttendanceSummary();
    addMessage(summary.outerHTML, true);
    
    const finalMessage = {
        role: 'system',
        content: `${SYMPTOM_EMOJIS.general} Atendimento finalizado!\n\nCaso seus sintomas se agravem ou surjam novos sintomas, não hesite em iniciar um novo atendimento ou procurar ajuda médica presencial.\n\nNúmeros de emergência:\n📞 SAMU: 192\n📞 Bombeiros: 193`
    };
    
    setTimeout(() => {
        addMessage(finalMessage.content, true);
        conversationHistory.push(finalMessage);
    }, 1000);
}

// Adiciona event listeners para resetar o timeout quando houver interação
userInput.addEventListener('keypress', startInactivityCheck);
userInput.addEventListener('input', startInactivityCheck);
document.querySelector('.chat-messages').addEventListener('click', startInactivityCheck);
document.querySelector('.chat-messages').addEventListener('touchstart', startInactivityCheck);

// Função para inicializar o painel de acessibilidade
function initializeAccessibilityPanel() {
    console.log('Inicializando painel de acessibilidade');
    
    // Configura o botão de acessibilidade
    const accessibilityToggle = document.getElementById('accessibilityToggle');
    const accessibilityPanel = document.getElementById('accessibilityPanel');
    const accessibilityOverlay = document.getElementById('accessibilityOverlay');
    const closeAccessibility = document.getElementById('closeAccessibility');
    
    console.log('Elementos encontrados:', {
        toggle: !!accessibilityToggle,
        panel: !!accessibilityPanel,
        overlay: !!accessibilityOverlay,
        closeButton: !!closeAccessibility
    });

    // Configura o botão de acessibilidade
    if (accessibilityToggle) {
        console.log('Configurando botão de acessibilidade');
        accessibilityToggle.addEventListener('click', function(e) {
            e.preventDefault();
        e.stopPropagation();
            console.log('Botão de acessibilidade clicado');
            if (accessibilityPanel && accessibilityOverlay) {
        accessibilityPanel.classList.toggle('active');
        accessibilityOverlay.classList.toggle('active');
                console.log('Estado do painel:', {
                    panelActive: accessibilityPanel.classList.contains('active'),
                    overlayActive: accessibilityOverlay.classList.contains('active')
                });
            } else {
                console.error('Painel ou overlay não encontrado');
            }
        });
    } else {
        console.error('Botão de acessibilidade não encontrado');
    }
    
    // Configura o botão de fechar
    if (closeAccessibility) {
        console.log('Configurando botão de fechar');
        closeAccessibility.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Botão de fechar clicado');
            if (accessibilityPanel && accessibilityOverlay) {
        accessibilityPanel.classList.remove('active');
        accessibilityOverlay.classList.remove('active');
                console.log('Painel fechado');
            }
        });
    }

    // Configura o overlay
    if (accessibilityOverlay) {
        console.log('Configurando overlay');
        accessibilityOverlay.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Overlay clicado');
            if (accessibilityPanel) {
        accessibilityPanel.classList.remove('active');
        accessibilityOverlay.classList.remove('active');
                console.log('Painel fechado pelo overlay');
            }
    });
    }
    
    // Configura os botões de fonte
    const fontButtons = document.querySelectorAll('.font-buttons-container .font-button');
    if (fontButtons.length > 0) {
        console.log('Configurando botões de fonte:', fontButtons.length);
    fontButtons.forEach(button => {
        button.addEventListener('click', () => {
            const size = button.dataset.size;
                console.log('Alterando tamanho da fonte para:', size);
            setFontSize(size);
            fontButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            saveAccessibilityPreferences();
        });
    });
    } else {
        console.warn('Nenhum botão de fonte encontrado');
    }
    
    // Configura os botões de espaçamento
    const spacingButtons = document.querySelectorAll('.spacing-buttons-container .spacing-button');
    if (spacingButtons.length > 0) {
        console.log('Configurando botões de espaçamento:', spacingButtons.length);
    spacingButtons.forEach(button => {
        button.addEventListener('click', () => {
            const spacing = button.dataset.spacing;
                console.log('Alterando espaçamento para:', spacing);
            setTextSpacing(spacing);
            spacingButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            saveAccessibilityPreferences();
        });
    });
    } else {
        console.warn('Nenhum botão de espaçamento encontrado');
    }
    
    // Configura o toggle de dislexia
    const dyslexicToggle = document.getElementById('dyslexicToggle');
    if (dyslexicToggle) {
        console.log('Configurando toggle de dislexia');
    dyslexicToggle.addEventListener('change', () => {
            console.log('Toggle de dislexia alterado:', dyslexicToggle.checked);
        document.body.classList.toggle('dyslexic-font', dyslexicToggle.checked);
        saveAccessibilityPreferences();
    });
    }

    // Configura o toggle de voz
    const voiceToggle = document.getElementById('voiceToggle');
    if (voiceToggle) {
        console.log('Configurando toggle de voz');
        voiceToggle.addEventListener('change', () => {
            console.log('Toggle de voz alterado:', voiceToggle.checked);
            if (voiceToggle.checked) {
                initializeVoiceRecognition();
        } else {
                stopVoiceRecognition();
            }
            updateVoiceButtonVisibility();
            saveAccessibilityPreferences();
        });
    }

    // Carrega as preferências salvas
    loadAccessibilityPreferences();
}

// Função para alternar o tema
function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    
    // Atualiza todos os ícones de tema
    document.querySelectorAll('.theme-toggle i').forEach(icon => {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    });
    
    // Salva a preferência do usuário
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// Função para carregar o tema preferido
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    
    // Atualiza todos os ícones de tema
    document.querySelectorAll('.theme-toggle i').forEach(icon => {
        icon.className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    });
}

// Carrega o tema ao iniciar
loadTheme();

// Função para criar sintomas rápidos
function createQuickSymptoms() {
    const container = document.createElement('div');
    container.className = 'quick-symptoms';
    
    // Remove qualquer container de sintomas existente
    const existingContainer = document.querySelector('.quick-symptoms');
    if (existingContainer) {
        existingContainer.remove();
    }
    
    commonSymptoms.forEach(symptom => {
        const button = document.createElement('button');
        button.className = 'symptom-button';
        button.innerHTML = `<i class="fas ${symptom.icon}"></i>${symptom.text}`;
        button.onclick = () => {
            userInput.value = `Estou com ${symptom.text.toLowerCase()}`;
            handleSendMessage();
        };
        container.appendChild(button);
    });
    
    return container;
}

// Função para criar escala de dor
function createPainScale() {
    const painScale = document.createElement('div');
    painScale.className = 'pain-scale';
    
    painScale.innerHTML = `
        <div class="pain-scale-title">Qual a intensidade da sua dor?</div>
        <div class="pain-buttons">
            ${Array.from({length: 11}, (_, i) => `
                <button class="pain-button" 
                        data-level="${i <= 3 ? '0-3' : i <= 7 ? '4-7' : '8-10'}" 
                        onclick="selectPainLevel(${i})">${i}</button>
            `).join('')}
        </div>
    `;
    
    return painScale;
}

// Função para selecionar nível de dor
function selectPainLevel(level) {
    userInput.value = `Minha dor está no nível ${level} de 10`;
    handleSendMessage();
}

// Função para criar o componente de feedback
function createFeedback() {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'feedback-container';
    
    feedbackDiv.innerHTML = `
        <div class="feedback-title">Como foi seu atendimento?</div>
        <div class="stars-container">
            ${Array.from({length: 5}, (_, i) => `
                <button class="star-button" onclick="rateFeedback(${i + 1})">
                    <i class="fas fa-star"></i>
                </button>
            `).join('')}
        </div>
        <textarea class="feedback-input" placeholder="Deixe seu comentário ou sugestão (opcional)"></textarea>
        <div class="action-buttons">
            <button class="action-button" onclick="submitFeedback()">
                <i class="fas fa-paper-plane"></i>
                Enviar Feedback
            </button>
            <button class="action-button secondary" onclick="exportToPDF()">
                <i class="fas fa-file-pdf"></i>
                Exportar PDF
            </button>
        </div>
    `;
    
    return feedbackDiv;
}

// Função para avaliar com estrelas
function rateFeedback(stars) {
    const starButtons = document.querySelectorAll('.star-button i');
    starButtons.forEach((star, index) => {
        star.style.color = index < stars ? '#FFC107' : '#ccc';
    });
    window.currentRating = stars;
}

// Função para enviar feedback
function submitFeedback() {
    const rating = window.currentRating || 0;
    const comment = document.querySelector('.feedback-input').value;
    
    // Aqui você pode implementar o envio do feedback para o servidor
    console.log('Feedback:', { rating, comment });
    
    // Mostra mensagem de sucesso
    showToast('Obrigado pelo seu feedback!');
    
    // Limpa o formulário
    document.querySelector('.feedback-input').value = '';
    rateFeedback(0);
}

// Função para limpar o texto de caracteres especiais e emojis
function cleanTextForPDF(text) {
    return text
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // Remove emojis
        .replace(/<br>/g, '\n') // Converte <br> em quebras de linha reais
        .replace(/\s*<br\/>\s*/g, '\n') // Converte <br/> em quebras de linha reais
        .replace(/\s*\n\s*/g, '\n') // Normaliza quebras de linha
        .replace(/\n+/g, '\n') // Remove quebras de linha duplicadas
        .replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, '') // Mantém caracteres básicos latinos, acentos e quebras de linha
        .replace(/\s+/g, ' ') // Normaliza espaços
        .trim();
}

// Função para exportar conversa para PDF
async function exportToPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configurações de fonte e margens
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const lineHeight = 7;
        let yPosition = 20;
        
        // Adiciona título
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("Relatório de Atendimento - Triagem Médica", margin, yPosition);
        yPosition += lineHeight * 2;
        
        // Adiciona data
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        const currentDate = new Date().toLocaleDateString('pt-BR');
        doc.text(`Data: ${currentDate}`, margin, yPosition);
        yPosition += lineHeight * 2;
        
        // Função auxiliar para adicionar texto com quebra de linha
        function addWrappedText(text, y) {
            const textWidth = pageWidth - 2 * margin;
            
            // Divide o texto em parágrafos
            const paragraphs = text.split('\n');
            let currentY = y;
            
            for (const paragraph of paragraphs) {
                if (paragraph.trim()) {
                    const splitText = doc.splitTextToSize(paragraph.trim(), textWidth);
                    doc.text(splitText, margin, currentY);
                    currentY += (splitText.length * lineHeight);
                }
                currentY += lineHeight; // Adiciona espaço entre parágrafos
            }
            
            return currentY;
        }
        
        // Adiciona mensagens
        doc.setFontSize(11);
        for (const message of conversationHistory) {
            // Pula mensagens vazias
            if (!message.content.trim()) continue;
            
            // Limpa o texto de caracteres especiais
            const cleanedContent = cleanTextForPDF(message.content);
            
            // Define o prefixo baseado no papel
            const prefix = message.role === 'assistant' ? 'Médico: ' : 'Paciente: ';
            
            // Adiciona a mensagem com quebra de linha
            const text = `${prefix}${cleanedContent}`;
            yPosition = addWrappedText(text, yPosition);
            
            // Adiciona espaço entre mensagens
            yPosition += lineHeight;
            
            // Verifica se precisa de nova página
            if (yPosition > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                yPosition = margin;
            }
        }
        
        // Salva o PDF
        doc.save('triagem-medica.pdf');
        
        // Mostra mensagem de sucesso
        showToast('PDF gerado com sucesso!');
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        showToast('Erro ao gerar PDF. Tente novamente.', 'error');
    }
}

// Função para mostrar toast
function showToast(message, type = 'success', persistent = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'error' ? 'fa-exclamation-circle' :
                type === 'info' ? 'fa-info-circle' : 'fa-check-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    if (!persistent) {
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    return toast;
}

// Função para inicializar o botão de emergência
function initializeEmergencyButton() {
    const emergencyButton = document.getElementById('emergencyButton');
    const emergencyPanel = document.getElementById('emergencyPanel');
    
    emergencyButton.addEventListener('click', () => {
        emergencyPanel.classList.toggle('active');
    });
    
    // Fecha o painel quando clicar fora dele
    document.addEventListener('click', (e) => {
        if (!emergencyButton.contains(e.target) && 
            !emergencyPanel.contains(e.target) && 
            emergencyPanel.classList.contains('active')) {
            emergencyPanel.classList.remove('active');
        }
    });
}

// Função para atualizar visibilidade do botão de voz
function updateVoiceButtonVisibility() {
    if (voiceButton && voiceToggle) {
        voiceButton.style.display = voiceToggle.checked ? 'block' : 'none';
    }
}

// Função para inicializar o reconhecimento de voz
function initializeVoiceRecognition() {
    try {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Reconhecimento de voz não suportado neste navegador');
            if (voiceButton) voiceButton.style.display = 'none';
            if (voiceToggle) voiceToggle.checked = false;
        return;
    }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            console.log('Reconhecimento de voz iniciado');
            isListening = true;
            if (voiceButton) {
            voiceButton.classList.add('recording');
                const icon = voiceButton.querySelector('i');
                if (icon) icon.className = 'fas fa-stop';
            }
            showTemporaryToast('Ouvindo...', 'info');
        };

        recognition.onend = () => {
            console.log('Reconhecimento de voz finalizado');
            isListening = false;
            if (voiceButton) {
            voiceButton.classList.remove('recording');
                const icon = voiceButton.querySelector('i');
                if (icon) icon.className = 'fas fa-microphone';
            }
            removeAllToasts();
        };

        recognition.onresult = (event) => {
            console.log('Resultado do reconhecimento recebido');
            const transcript = event.results[0][0].transcript;
            console.log('Texto reconhecido:', transcript);
            if (userInput) {
            userInput.value = transcript;
            handleSendMessage();
            }
            removeAllToasts();
        };

        recognition.onerror = (event) => {
            console.error('Erro no reconhecimento de voz:', event.error);
        isListening = false;
            if (voiceButton) {
        voiceButton.classList.remove('recording');
                const icon = voiceButton.querySelector('i');
                if (icon) icon.className = 'fas fa-microphone';
            }
            showTemporaryToast('Erro no reconhecimento de voz. Tente novamente.', 'error');
        };

        console.log('Reconhecimento de voz inicializado com sucesso');
        return true;

        } catch (error) {
        console.error('Erro ao inicializar reconhecimento de voz:', error);
        if (voiceButton) voiceButton.style.display = 'none';
        if (voiceToggle) voiceToggle.checked = false;
        return false;
    }
}

// Função para mostrar toast temporário
function showTemporaryToast(message, type = 'success', duration = 3000) {
    removeAllToasts(); // Remove toasts existentes
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 
                       type === 'info' ? 'fa-info-circle' : 'fa-check-circle'}"></i>
        ${message}
    `;
    document.body.appendChild(toast);
    
    if (duration > 0) {
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    return toast;
}

// Função para remover todos os toasts
function removeAllToasts() {
    const toasts = document.querySelectorAll('.toast');
    toasts.forEach(toast => {
        toast.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    });
}

// Função para fazer logout
function handleLogout() {
    // Limpa os dados de autenticação
    localStorage.removeItem('authToken');
    localStorage.removeItem('guestMode');
    localStorage.removeItem('userEmail');
    
    // Redireciona para a página de login
    window.location.href = 'login.html';
}

// Função para criar o resumo do atendimento
function createAttendanceSummary() {
    const summary = document.createElement('div');
    summary.className = 'attendance-summary';
    
    const maxSeverity = getMaxSeverity(conversationHistory);
    const symptoms = extractSymptoms(conversationHistory);
    const duration = Math.ceil((Date.now() - startTime) / 60000); // Duração em minutos
    
    summary.innerHTML = `
        <h3>${SYMPTOM_EMOJIS.general} Resumo do Atendimento</h3>
        <div class="attendance-summary-content">
            <div class="summary-item">
                <i class="fas fa-clipboard-list"></i>
                <div>
                    <strong>Sintomas Relatados:</strong><br>
                    ${symptoms}
                </div>
            </div>
            <div class="summary-item">
                <i class="fas fa-exclamation-circle"></i>
                <div>
                    <strong>Nível de Gravidade:</strong><br>
                    ${createSeverityIndicator(maxSeverity).outerHTML}
                </div>
            </div>
            <div class="summary-item">
                <i class="fas fa-clock"></i>
                <div>
                    <strong>Duração do Atendimento:</strong><br>
                    ${duration} minutos
                </div>
            </div>
        </div>
        <div class="summary-actions">
            <button class="summary-button" onclick="downloadHistory()">
                <i class="fas fa-download"></i>
                Baixar Histórico
            </button>
            <button class="summary-button" onclick="scheduleFollowUp()">
                <i class="fas fa-calendar-plus"></i>
                Agendar Retorno
            </button>
            <button class="summary-button secondary" onclick="rateAttendance()">
                <i class="fas fa-star"></i>
                Avaliar Atendimento
            </button>
        </div>
    `;
    
    return summary;
}

// Função para baixar o histórico
function downloadHistory() {
    const history = conversationHistory.map(msg => {
        return `${msg.role.toUpperCase()}: ${msg.content}\n`;
    }).join('\n');
    
    const blob = new Blob([history], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `triagem-medica-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Função para agendar retorno
function scheduleFollowUp() {
    const message = {
        role: 'system',
        content: 'Para agendar um retorno, por favor entre em contato com nossa central de agendamento pelos telefones:\n\n📞 SAMU: 192\n📞 Bombeiros: 193\n\nOu procure a unidade de saúde mais próxima.'
    };
    addMessage(message.content, true);
    conversationHistory.push(message);
}

// Função para avaliar o atendimento
function rateAttendance() {
    const ratingDiv = document.createElement('div');
    ratingDiv.className = 'rating-container';
    ratingDiv.innerHTML = `
        <h4>Como você avalia este atendimento?</h4>
        <div class="rating-stars">
            ${Array.from({length: 5}, (_, i) => `
                <button class="rating-star" onclick="submitRating(${i + 1})">
                    <i class="fas fa-star"></i>
                </button>
            `).join('')}
        </div>
    `;
    
    addMessage(ratingDiv.outerHTML, true);
}

// Função para enviar avaliação
function submitRating(rating) {
    const message = {
        role: 'system',
        content: `Obrigado por avaliar nosso atendimento com ${rating} estrelas! 🌟\nSua opinião é muito importante para melhorarmos nosso serviço.`
    };
    addMessage(message.content, true);
    conversationHistory.push(message);
}

// Função para enviar mensagem
async function handleSendMessage() {
    if (!userInput || !userInput.value.trim()) return;

    const message = userInput.value.trim();
    userInput.value = '';

    // Adiciona a mensagem do usuário ao chat
    addMessage(message, false);

    // Mostra o indicador de digitação
    const typingIndicator = showTypingIndicator();

    try {
        // Envia a mensagem para o servidor
        const response = await sendMessageToServer(message);
        
        // Remove o indicador de digitação
        removeTypingIndicator(typingIndicator);

        if (response) {
            // Adiciona a resposta do bot
            addMessage(response.message, true);

            // Atualiza o progresso da triagem
            updateProgress();

            // Verifica se deve mostrar botões de ação
            const actionButtons = shouldShowActionButtons(response.message);
            if (actionButtons) {
                const lastMessage = document.querySelector('.message:last-child .message-content');
                if (lastMessage) {
                    lastMessage.appendChild(actionButtons);
                }
            }

            // Atualiza a gravidade com base na resposta
            const severity = determineSeverity(response.message);
            if (severity !== currentSeverity) {
                currentSeverity = severity;
                const indicator = createSeverityIndicator(severity);
                chatMessages.appendChild(indicator);
            }
        }
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        removeTypingIndicator(typingIndicator);
        addMessage('Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.', true);
    }

    // Reseta o timer de inatividade
    resetTimer();
}

// Função para alternar o reconhecimento de voz
function toggleVoiceRecognition() {
    console.log('Alternando reconhecimento de voz');
    if (isListening) {
        stopVoiceRecognition();
    } else {
        startVoiceRecognition();
    }
}

// Função para parar o reconhecimento de voz
function stopVoiceRecognition() {
    console.log('Parando reconhecimento de voz');
    if (recognition) {
        recognition.stop();
        isListening = false;
        if (voiceButton) {
            voiceButton.classList.remove('recording');
            const icon = voiceButton.querySelector('i');
            if (icon) icon.className = 'fas fa-microphone';
        }
    }
}

// Função para iniciar o reconhecimento de voz
function startVoiceRecognition() {
    console.log('Iniciando reconhecimento de voz');
    if (recognition) {
        recognition.start();
        isListening = true;
        if (voiceButton) {
            voiceButton.classList.add('recording');
            const icon = voiceButton.querySelector('i');
            if (icon) icon.className = 'fas fa-stop';
        }
    }
}

// Função para inicializar a aplicação
async function initialize() {
    console.log('Inicializando aplicação...');
    
    // Verifica conexão com o servidor
    const isConnected = await checkServerConnection();
    if (!isConnected) {
        console.log('Não foi possível conectar ao servidor');
        return;
    }

    // Inicializa o menu mobile
    initializeMobileMenu();

    // Inicializa o botão de nova sessão
    initializeNewSessionButton();

    // Inicializa o botão de tema
    const themeButtons = document.querySelectorAll('.theme-toggle');
    themeButtons.forEach(button => {
        button.addEventListener('click', toggleTheme);
    });

    // Inicializa o painel de acessibilidade
    initializeAccessibilityPanel();

    // Configura botão de enviar
    if (sendButton) {
        console.log('Configurando botão de enviar');
        sendButton.addEventListener('click', handleSendMessage);
    }

    // Configura input de texto
    if (userInput) {
        console.log('Configurando input de texto');
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }

    // Configura botão de voz
    if (voiceButton) {
        console.log('Configurando botão de voz');
        voiceButton.addEventListener('click', () => {
            if (!recognition) {
                initializeVoiceRecognition();
            }
            toggleVoiceRecognition();
        });
    }

    // Configura botão de histórico
    if (historyToggle) {
        historyToggle.addEventListener('click', () => {
            showAttendanceHistory();
        });
    }

    // Carrega preferências de acessibilidade
    loadAccessibilityPreferences();
    
    // Inicializa o reconhecimento de voz se necessário
    if (voiceToggle?.checked) {
        initializeVoiceRecognition();
    }
    
    // Atualiza visibilidade do botão de voz
    updateVoiceButtonVisibility();
    
    // Adiciona sintomas rápidos
    const quickSymptomsContainer = createQuickSymptoms();
    chatMessages.appendChild(quickSymptomsContainer);
    
    // Inicia verificação de inatividade
    startInactivityCheck();
}

// Função para salvar preferências de acessibilidade
function saveAccessibilityPreferences() {
    const preferences = {
        fontSize: document.documentElement.style.getPropertyValue('--font-size-base'),
        lineHeight: document.documentElement.style.getPropertyValue('--line-height'),
        letterSpacing: document.documentElement.style.getPropertyValue('--letter-spacing'),
        dyslexicFont: document.body.classList.contains('dyslexic-font'),
        voiceEnabled: document.getElementById('voiceToggle')?.checked || false
    };
    console.log('Salvando preferências:', preferences);
    localStorage.setItem('accessibilityPreferences', JSON.stringify(preferences));
}

// Função para carregar preferências de acessibilidade
function loadAccessibilityPreferences() {
    const savedPreferences = localStorage.getItem('accessibilityPreferences');
    if (savedPreferences) {
        console.log('Carregando preferências:', savedPreferences);
        const preferences = JSON.parse(savedPreferences);
        
        // Aplica tamanho da fonte
        if (preferences.fontSize) {
            document.documentElement.style.setProperty('--font-size-base', preferences.fontSize);
            // Ativa o botão correspondente
            const size = getFontSizeClass(preferences.fontSize);
            const fontButton = document.querySelector(`.font-button[data-size="${size}"]`);
            if (fontButton) {
                document.querySelectorAll('.font-button').forEach(btn => btn.classList.remove('active'));
                fontButton.classList.add('active');
            }
        }
        
        // Aplica espaçamento
        if (preferences.lineHeight) {
            document.documentElement.style.setProperty('--line-height', preferences.lineHeight);
            // Ativa o botão correspondente
            const spacing = preferences.lineHeight === '2' ? 'large' : 'normal';
            const spacingButton = document.querySelector(`.spacing-button[data-spacing="${spacing}"]`);
            if (spacingButton) {
                document.querySelectorAll('.spacing-button').forEach(btn => btn.classList.remove('active'));
                spacingButton.classList.add('active');
            }
        }
        
        // Aplica fonte para dislexia
        const dyslexicToggle = document.getElementById('dyslexicToggle');
        if (preferences.dyslexicFont && dyslexicToggle) {
            document.body.classList.add('dyslexic-font');
            dyslexicToggle.checked = true;
        }
        
        // Aplica configuração de voz
        const voiceToggle = document.getElementById('voiceToggle');
        if (preferences.voiceEnabled && voiceToggle) {
            voiceToggle.checked = true;
            updateVoiceButtonVisibility();
        }
    }
}

// Função auxiliar para determinar a classe de tamanho da fonte
function getFontSizeClass(fontSize) {
    const size = parseInt(fontSize);
    if (size <= 12) return 'small';
    if (size <= 14) return 'medium';
    if (size <= 16) return 'large';
    return 'xlarge';
}

// Função para ajustar o tamanho da fonte
function setFontSize(size) {
    const root = document.documentElement;
    switch (size) {
        case 'small':
            root.style.setProperty('--font-size-base', '14px');
            document.body.style.fontSize = '14px';
            break;
        case 'medium':
            root.style.setProperty('--font-size-base', '16px');
            document.body.style.fontSize = '16px';
            break;
        case 'large':
            root.style.setProperty('--font-size-base', '18px');
            document.body.style.fontSize = '18px';
            break;
        case 'xlarge':
            root.style.setProperty('--font-size-base', '20px');
            document.body.style.fontSize = '20px';
            break;
    }
    saveAccessibilityPreferences();
}

// Função para ajustar o espaçamento do texto
function setTextSpacing(spacing) {
    const root = document.documentElement;
    switch (spacing) {
        case 'normal':
            root.style.setProperty('--line-height', '1.5');
            root.style.setProperty('--letter-spacing', 'normal');
            document.body.style.lineHeight = '1.5';
            document.body.style.letterSpacing = 'normal';
            document.body.setAttribute('data-spacing', 'normal');
            break;
        case 'large':
            root.style.setProperty('--line-height', '1.8');
            root.style.setProperty('--letter-spacing', '0.5px');
            document.body.style.lineHeight = '1.8';
            document.body.style.letterSpacing = '0.5px';
            document.body.setAttribute('data-spacing', 'large');
            break;
    }
    saveAccessibilityPreferences();
}

// Função para mostrar o modal de confirmação
function showConfirmationModal(message, onConfirm) {
    console.log('Mostrando modal de confirmação');
    const modalOverlay = document.getElementById('confirmationOverlay');
    const modalMessage = document.querySelector('#confirmationModal p');
    const confirmButton = document.getElementById('confirmNewSession');
    const cancelButton = document.getElementById('cancelNewSession');
    const modal = document.getElementById('confirmationModal');

    if (modalMessage) {
        const isGuest = localStorage.getItem('guestMode') === 'true';
        modalMessage.textContent = isGuest ? 
            'Tem certeza que deseja iniciar uma nova sessão? Como você não está logado, o histórico atual será perdido.' :
            'Tem certeza que deseja iniciar uma nova sessão?';
    }

    if (modalOverlay && modal) {
        modalOverlay.classList.add('active');
        modal.classList.add('active');
    }

    function handleConfirm() {
        console.log('Confirmação aceita');
        closeModal();
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    }

    function handleCancel() {
        console.log('Confirmação cancelada');
        closeModal();
    }

    function closeModal() {
        console.log('Fechando modal');
        if (modalOverlay && modal) {
            modalOverlay.classList.remove('active');
            modal.classList.remove('active');
        }
        // Remove os event listeners antigos
        if (confirmButton) {
            confirmButton.removeEventListener('click', handleConfirm);
        }
        if (cancelButton) {
            cancelButton.removeEventListener('click', handleCancel);
        }
        if (modalOverlay) {
            modalOverlay.removeEventListener('click', handleCancel);
        }
    }

    // Adiciona os novos event listeners
    if (confirmButton) {
        confirmButton.addEventListener('click', handleConfirm);
    }
    if (cancelButton) {
        cancelButton.addEventListener('click', handleCancel);
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', handleCancel);
    }
}

// Função para configurar o botão de nova sessão
function initializeNewSessionButton() {
    console.log('Inicializando botão de nova sessão');
    const newButton = document.getElementById('newSessionButton');
    if (newButton) {
        newButton.addEventListener('click', () => {
            console.log('Botão nova sessão clicado');
            showConfirmationModal(
                'Tem certeza que deseja iniciar uma nova sessão? Todo o progresso atual será perdido.',
                startNewSession
            );
        });
    } else {
        console.error('Botão de nova sessão não encontrado');
    }
} 