document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando script de login...');

    // Verifica se está na página de login
    if (!window.location.pathname.includes('login.html')) {
        console.log('Não está na página de login, retornando...');
        return;
    }

    // Verifica se já está autenticado ou em modo convidado
    const authToken = localStorage.getItem('authToken');
    const isGuest = localStorage.getItem('guestMode') === 'true';
    
    console.log('Verificando autenticação:', { authToken: !!authToken, isGuest });

    // Se já estiver autenticado ou em modo convidado, redireciona
    if (authToken || isGuest) {
        const userName = localStorage.getItem('userName') || 'Usuário';
        console.log('Usuário já autenticado, redirecionando...', { userName });
        
        // Força a criação do toast antes do redirecionamento
        const toast = showToast(`Bem-vindo(a) de volta, ${userName}!`, 'success');
        document.body.appendChild(toast);
        
        // Aguarda um momento para garantir que o toast seja exibido
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }

    const SERVER_URL = 'https://tcc-chatbot-triagem-medica.onrender.com';
    
    // Elementos do DOM
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const registerLink = document.getElementById('registerLink');
    const modal = document.getElementById('registerModal');
    const closeModal = document.querySelector('.close');
    const cancelButton = document.querySelector('.cancel-button');
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    const showRegisterBtn = document.getElementById('showRegister');
    const registerModal = document.getElementById('registerModal');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const guestAccessBtn = document.getElementById('guestAccess');

    // Log para debug dos elementos encontrados
    console.log('Elementos encontrados:', {
        loginForm: !!loginForm,
        guestAccessBtn: !!guestAccessBtn,
        registerForm: !!registerForm
    });

    // Funções auxiliares
    const showToast = (message, type, isLoading = false) => {
        console.log('Criando toast:', { message, type, isLoading });
        
        // Remove qualquer toast existente
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        // Adiciona o ícone apropriado
        const icon = document.createElement('i');
        if (isLoading) {
            icon.className = 'fas fa-spinner fa-spin';
        } else if (type === 'success') {
            icon.className = 'fas fa-check-circle';
        } else if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
        } else if (type === 'info') {
            icon.className = 'fas fa-info-circle';
        }
        toast.insertBefore(icon, toast.firstChild);

        // Força a renderização do toast
        document.body.appendChild(toast);
        toast.offsetHeight; // Força um reflow
        
        // Adiciona a classe show após um pequeno delay
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        if (!isLoading) {
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        console.log('Toast criado:', toast);
        return toast;
    };

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const validatePassword = (password) => {
        return password.length >= 6;
    };

    // Toggle de visibilidade da senha
    togglePasswordButtons.forEach(button => {
        button.addEventListener('click', () => {
            const input = button.parentElement.querySelector('input');
            const icon = button.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Mostrar modal de registro
    showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        registerModal.classList.add('active');
    });

    // Fechar modal de registro
    closeModal.addEventListener('click', () => {
        registerModal.classList.remove('active');
        registerForm.reset();
    });

    // Fechar modal ao clicar no botão cancelar
    cancelButton.addEventListener('click', () => {
        registerModal.classList.remove('active');
        registerForm.reset();
    });

    // Fechar modal ao clicar fora
    registerModal.addEventListener('click', (e) => {
        if (e.target === registerModal) {
            registerModal.classList.remove('active');
            registerForm.reset();
        }
    });

    // Login Form Submit
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Form de login submetido');
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe').checked;

            if (!validateEmail(email)) {
                showToast('Por favor, insira um email válido', 'error');
                return;
            }

            if (!validatePassword(password)) {
                showToast('A senha deve ter pelo menos 6 caracteres', 'error');
                return;
            }

            try {
                // Desabilita o botão de login
                const submitButton = loginForm.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                
                // Mostra mensagem de carregamento
                const loadingToast = showToast('Verificando credenciais...', 'info', true);

                const response = await fetch(`${SERVER_URL}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                console.log('Resposta do servidor:', data);

                // Remove o toast de carregamento
                loadingToast.remove();

                if (response.ok) {
                    // Salva o token
                    localStorage.setItem('authToken', data.token);
                    
                    // Salva o nome do usuário
                    if (data.user && data.user.fullName) {
                        localStorage.setItem('userName', data.user.fullName);
                    }
                    
                    // Se marcou "lembrar-me", salva o email
                    if (rememberMe) {
                        localStorage.setItem('userEmail', email);
                    } else {
                        localStorage.removeItem('userEmail');
                    }

                    // Remove modo convidado se estiver ativo
                    localStorage.removeItem('guestMode');

                    // Mostra mensagem de sucesso com o nome do usuário
                    const userName = data.user.fullName.split(' ')[0];
                    const successToast = showToast(`Bem-vindo(a), ${userName}!`, 'success');
                    
                    // Aguarda o toast ser exibido antes de redirecionar
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                } else {
                    showToast(data.error || 'Email ou senha incorretos', 'error');
                    submitButton.disabled = false;
                }
            } catch (error) {
                console.error('Erro:', error);
                showToast('Erro ao conectar ao servidor. Verifique sua conexão.', 'error');
                submitButton.disabled = false;
            }
        });
    }

    // Register Form Submit
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('registerEmail').value,
            password: document.getElementById('registerPassword').value,
            birthDate: document.getElementById('birthDate').value,
            gender: document.getElementById('gender').value,
            medicalConditions: document.getElementById('medicalConditions').value,
            allergies: document.getElementById('allergies').value
        };

        if (!validateEmail(formData.email)) {
            showToast('Por favor, insira um email válido', 'error');
            return;
        }

        if (!validatePassword(formData.password)) {
            showToast('A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        if (!formData.fullName || !formData.birthDate || !formData.gender) {
            showToast('Por favor, preencha todos os campos obrigatórios', 'error');
            return;
        }

        try {
            const response = await fetch(`${SERVER_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                showToast('Registro realizado com sucesso!', 'success');
                
                // Salvar o token
                localStorage.setItem('authToken', data.token);
                
                // Fechar o modal e limpar o formulário
                registerModal.classList.remove('active');
                registerForm.reset();

                // Redirecionar para a página principal
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                showToast(data.message || 'Erro ao realizar registro', 'error');
            }
        } catch (error) {
            showToast('Erro ao conectar com o servidor', 'error');
            console.error('Erro:', error);
        }
    });

    // Validação da data de nascimento
    const birthDateInput = document.getElementById('birthDate');
    birthDateInput.addEventListener('change', (e) => {
        const selectedDate = new Date(e.target.value);
        const today = new Date();
        
        if (selectedDate > today) {
            showToast('Data de nascimento não pode ser no futuro', 'error');
            e.target.value = '';
        }
    });

    // Acesso como convidado
    if (guestAccessBtn) {
        guestAccessBtn.addEventListener('click', async () => {
            console.log('Botão de acesso como convidado clicado');
            try {
                // Desabilita o botão de convidado
                guestAccessBtn.disabled = true;
                
                // Mostra mensagem de carregamento
                const loadingToast = showToast('Iniciando modo convidado...', 'info', true);

                const response = await fetch(`${SERVER_URL}/api/guest`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                console.log('Resposta do servidor (modo convidado):', data);

                // Remove o toast de carregamento
                loadingToast.remove();

                if (response.ok) {
                    // Configura o modo convidado
                    localStorage.setItem('guestMode', 'true');
                    localStorage.removeItem('authToken');
                    localStorage.setItem('userName', 'Convidado');

                    showToast('Entrando como convidado...', 'success');
                    
                    // Redireciona após um delay
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                } else {
                    showToast(data.message || 'Erro ao acessar como convidado', 'error');
                    guestAccessBtn.disabled = false;
                }
            } catch (error) {
                console.error('Erro:', error);
                showToast('Erro ao conectar ao servidor. Verifique sua conexão.', 'error');
                guestAccessBtn.disabled = false;
            }
        });
    }

    // Verificar se há email salvo
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail && loginForm) {
        const emailInput = document.getElementById('loginEmail');
        if (emailInput) {
            emailInput.value = savedEmail;
            if (rememberMeCheckbox) {
                rememberMeCheckbox.checked = true;
            }
        }
    }
}); 