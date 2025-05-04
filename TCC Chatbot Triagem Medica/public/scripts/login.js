document.addEventListener('DOMContentLoaded', () => {
    // Verifica se está na página de login
    if (!window.location.pathname.includes('login.html')) {
        return;
    }

    // Verifica se já está autenticado ou em modo convidado
    const authToken = localStorage.getItem('authToken');
    const isGuest = localStorage.getItem('guestMode') === 'true';
    
    // Se já estiver autenticado ou em modo convidado, redireciona
    if (authToken || isGuest) {
        window.location.replace('index.html');
        return;
    }

    const SERVER_URL = 'http://localhost:3001';
    
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

    // Funções auxiliares
    const showToast = (message, type) => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Força um reflow para garantir que a animação funcione
        toast.offsetHeight;
        
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
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
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
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
            const response = await fetch(`${SERVER_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

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

                showToast('Login realizado com sucesso!', 'success');
                
                // Redireciona após um breve delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                showToast(data.error || 'Erro ao fazer login', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            showToast('Erro ao conectar ao servidor', 'error');
        }
    });

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
            const response = await fetch('/api/register', {
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
    guestAccessBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`${SERVER_URL}/api/guest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                // Configura o modo convidado
                localStorage.setItem('guestMode', 'true');
                localStorage.removeItem('authToken'); // Remove token se existir
                localStorage.setItem('userName', 'Convidado');

                showToast('Entrando como convidado...', 'success');
                
                // Redireciona após um breve delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                showToast(data.message || 'Erro ao acessar como convidado', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            showToast('Erro ao conectar ao servidor', 'error');
        }
    });

    // Verificar se há email salvo
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) {
        document.getElementById('loginEmail').value = savedEmail;
        rememberMeCheckbox.checked = true;
    }
}); 