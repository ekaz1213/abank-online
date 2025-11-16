// script.js - Основная логика приложения
class BankApp {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
    }

    setupEventListeners() {
        // Навигация
        document.getElementById('showRegisterBtn').addEventListener('click', () => {
            this.showSection('register');
        });

        document.getElementById('showLoginBtn').addEventListener('click', () => {
            this.showSection('login');
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Формы
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        document.getElementById('transferForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTransfer();
        });

        // Навигационные кнопки
        document.querySelectorAll('.nav-btn[data-section]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Быстрые действия
        document.querySelectorAll('.action-card[data-section]').forEach(card => {
            card.addEventListener('click', (e) => {
                const section = e.currentTarget.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Табы перевода
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const method = e.currentTarget.getAttribute('data-method');
                this.switchTransferMethod(method);
            });
        });

        // Форматирование телефона
        document.getElementById('regPhone').addEventListener('input', (e) => {
            this.formatPhoneInput(e.target);
        });
    }

    checkAuth() {
        const session = bankDB.session.get();
        if (session && session.userId) {
            const user = bankDB.users.findById(session.userId);
            if (user && user.status === 'active') {
                this.currentUser = user;
                this.showApp();
            } else {
                this.showAuth();
            }
        } else {
            this.showAuth();
        }
    }

    showAuth() {
        this.showSection('login');
        document.getElementById('userNav').style.display = 'none';
        document.getElementById('adminNav').style.display = 'none';
        document.getElementById('userGreeting').textContent = 'Войдите в систему';
        document.getElementById('userDetails').textContent = 'Для доступа к банкингу';
    }

    showApp() {
        this.updateUserInfo();
        this.showSection('dashboard');
        
        document.getElementById('userNav').style.display = 'block';
        
        if (this.currentUser.role === 'admin') {
            document.getElementById('adminNav').style.display = 'block';
        } else {
            document.getElementById('adminNav').style.display = 'none';
        }
    }

    showSection(sectionName) {
        // Скрыть все секции
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Показать нужную секцию
        const targetSection = document.getElementById(sectionName + 'Section');
        if (targetSection) {
            targetSection.classList.add('active');
            
            // Загрузить данные для секции
            this.loadSectionData(sectionName);
        }
    }

    loadSectionData(sectionName) {
        switch(sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'transfer':
                this.loadTransfer();
                break;
            case 'cards':
                this.loadCards();
                break;
            case 'history':
                this.loadHistory();
                break;
            case 'adminUsers':
                this.loadAdminUsers();
                break;
            case 'adminPassports':
                this.loadAdminPassports();
                break;
            case 'adminOperations':
                this.loadAdminOperations();
                break;
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const user = bankDB.users.findByEmail(email);
            
            if (!user || user.password !== password) {
                throw new Error('Неверный email или пароль');
            }

            if (user.status !== 'active') {
                throw new Error('Аккаунт заблокирован');
            }

            this.currentUser = user;
            bankDB.session.set({ userId: user.id, loggedInAt: new Date().toISOString() });
            
            this.showApp();
            this.showNotification('Вход выполнен успешно!', 'success');
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async handleRegister() {
        const formData = {
            name: document.getElementById('regName').value,
            lastName: document.getElementById('regLastName').value,
            email: document.getElementById('regEmail').value,
            phone: document.getElementById('regPhone').value,
            password: document.getElementById('regPassword').value
        };

        try {
            // Проверка пароля
            if (formData.password.length < 8) {
                throw new Error('Пароль должен быть не менее 8 символов');
            }

            // Проверка email
            if (bankDB.users.findByEmail(formData.email)) {
                throw new Error('Email уже занят');
            }

            // Создание пользователя
            const newUser = bankDB.users.create(formData);
            
            this.showSection('login');
            this.showNotification('Аккаунт создан! Получен приветственный бонус 500 ₽', 'success');
            
            // Заполняем email для входа
            document.getElementById('loginEmail').value = formData.email;
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async handleTransfer() {
        if (!this.currentUser) return;

        const amount = parseFloat(document.getElementById('transferAmount').value);
        const description = document.getElementById('transferDescription').value;
        
        // Определяем метод и получателя
        const activeMethod = document.querySelector('.tab-btn.active').getAttribute('data-method');
        let recipientIdentifier = '';
        
        switch(activeMethod) {
            case 'email':
                recipientIdentifier = document.getElementById('transferEmail').value;
                break;
            case 'phone':
                recipientIdentifier = document.getElementById('transferPhone').value;
                break;
            case 'card':
                recipientIdentifier = document.getElementById('transferCard').value;
                break;
        }

        try {
            // Поиск получателя
            let recipient = null;
            if (activeMethod === 'email') {
                recipient = bankDB.users.findByEmail(recipientIdentifier);
            } else if (activeMethod === 'phone') {
                // Здесь можно добавить поиск по телефону
                recipient = bankDB.users.getAll().find(user => 
                    user.phone === recipientIdentifier
                );
            }

            if (!recipient) {
                throw new Error('Получатель не найден');
            }

            if (this.currentUser.balance < amount) {
                throw new Error('Недостаточно средств');
            }

            if (amount <= 0) {
                throw new Error('Неверная сумма');
            }

            // Выполняем перевод
            bankDB.users.update(this.currentUser.id, {
                balance: this.currentUser.balance - amount
            });
            
            bankDB.users.update(recipient.id, {
                balance: recipient.balance + amount
            });

            // Записываем операцию
            bankDB.operations.add({
                type: 'transfer',
                fromId: this.currentUser.id,
                toId: recipient.id,
                amount: amount,
                description: description,
                method: activeMethod
            });

            // Обновляем текущего пользователя
            this.currentUser = bankDB.users.findById(this.currentUser.id);
            
            this.showNotification(`Перевод на ${bankDB.utils.formatMoney(amount)} выполнен!`, 'success');
            this.showSection('dashboard');
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    loadDashboard() {
        if (!this.currentUser) return;

        // Обновляем информацию пользователя
        this.updateUserInfo();

        // Статистика
        const userOps = bankDB.operations.getAll().filter(op => 
            op.userId === this.currentUser.id || op.fromId === this.currentUser.id || op.toId === this.currentUser.id
        );

        const transfers = userOps.filter(op => op.type === 'transfer' && op.fromId === this.currentUser.id);
        
        document.getElementById('transfersCount').textContent = transfers.length;
        document.getElementById('cardsCount').textContent = this.currentUser.cards.length;
        document.getElementById('operationsCount').textContent = userOps.length;

        // Карты
        this.loadCards();
    }

    loadTransfer() {
        this.loadRecentTransfers();
    }

    loadCards() {
        const cardsContainer = document.getElementById('userCards') || document.getElementById('cardsList');
        if (!cardsContainer) return;

        if (!this.currentUser || this.currentUser.cards.length === 0) {
            cardsContainer.innerHTML = '<p class="no-data">У вас пока нет карт</p>';
            return;
        }

        cardsContainer.innerHTML = this.currentUser.cards.map(card => `
            <div class="card-item">
                <div class="card-header">
                    <div class="card-number">${card.number}</div>
                    <div class="card-type">${card.type}</div>
                </div>
                <div class="card-details">
                    <div>Действует до: ${card.expiry}</div>
                    <div>Баланс: ${bankDB.utils.formatMoney(card.balance)}</div>
                </div>
            </div>
        `).join('');
    }

    loadHistory() {
        const container = document.getElementById('operationsList');
        if (!container) return;

        const userOps = bankDB.operations.getAll().filter(op => 
            op.userId === this.currentUser.id || op.fromId === this.currentUser.id || op.toId === this.currentUser.id
        );

        if (userOps.length === 0) {
            container.innerHTML = '<p class="no-data">Операций пока нет</p>';
            return;
        }

        container.innerHTML = userOps.map(op => `
            <div class="operation-item">
                <div class="operation-type">${this.getOperationIcon(op.type)} ${op.type}</div>
                <div class="operation-amount ${op.fromId === this.currentUser.id ? 'negative' : 'positive'}">
                    ${op.fromId === this.currentUser.id ? '-' : '+'}${bankDB.utils.formatMoney(op.amount)}
                </div>
                <div class="operation-description">${op.description}</div>
                <div class="operation-date">${new Date(op.at).toLocaleDateString('ru-RU')}</div>
            </div>
        `).join('');
    }

    loadRecentTransfers() {
        const container = document.getElementById('recentTransfersList');
        if (!container) return;

        const transfers = bankDB.operations.getAll()
            .filter(op => op.type === 'transfer' && (op.fromId === this.currentUser.id || op.toId === this.currentUser.id))
            .slice(0, 5);

        if (transfers.length === 0) {
            container.innerHTML = '<p class="no-data">Переводов пока нет</p>';
            return;
        }

        container.innerHTML = transfers.map(transfer => {
            const isOutgoing = transfer.fromId === this.currentUser.id;
            const otherUser = bankDB.users.findById(isOutgoing ? transfer.toId : transfer.fromId);
            
            return `
                <div class="transfer-item">
                    <div class="transfer-direction">${isOutgoing ? '↗️ Исходящий' : '↙️ Входящий'}</div>
                    <div class="transfer-user">${otherUser ? otherUser.name + ' ' + otherUser.lastName : 'Пользователь'}</div>
                    <div class="transfer-amount ${isOutgoing ? 'negative' : 'positive'}">
                        ${isOutgoing ? '-' : '+'}${bankDB.utils.formatMoney(transfer.amount)}
                    </div>
                </div>
            `;
        }).join('');
    }

    loadAdminUsers() {
        const container = document.getElementById('usersList');
        if (!container || this.currentUser.role !== 'admin') return;

        const users = bankDB.users.getAll();

        container.innerHTML = users.map(user => `
            <div class="admin-user-item">
                <div class="user-main">
                    <div class="user-name">${user.name} ${user.lastName}</div>
                    <div class="user-email">${user.email}</div>
                </div>
                <div class="user-balance">${bankDB.utils.formatMoney(user.balance)}</div>
                <div class="user-role">${user.role}</div>
                <button class="admin-btn" onclick="bankApp.addBalance('${user.id}', 1000)">+1000 ₽</button>
            </div>
        `).join('');
    }

    loadAdminPassports() {
        const container = document.getElementById('passportsList');
        if (!container || this.currentUser.role !== 'admin') return;

        const passports = bankDB.passports.getAll();

        container.innerHTML = passports.map(passport => {
            const user = passport.userId ? bankDB.users.findById(passport.userId) : null;
            return `
                <div class="passport-item">
                    <div class="passport-number">${passport.number}</div>
                    <div class="passport-user">${user ? user.name + ' ' + user.lastName : 'Не привязан'}</div>
                    <div class="passport-status ${passport.verified ? 'verified' : 'pending'}">
                        ${passport.verified ? '✅ Верифицирован' : '⏳ Ожидание'}
                    </div>
                </div>
            `;
        }).join('');
    }

    loadAdminOperations() {
        const container = document.getElementById('allOperationsList');
        if (!container || this.currentUser.role !== 'admin') return;

        const operations = bankDB.operations.getAll();

        container.innerHTML = operations.map(op => `
            <div class="admin-operation-item">
                <div class="op-type">${op.type}</div>
                <div class="op-amount">${bankDB.utils.formatMoney(op.amount)}</div>
                <div class="op-date">${new Date(op.at).toLocaleString('ru-RU')}</div>
            </div>
        `).join('');
    }

    addBalance(userId, amount) {
        const user = bankDB.users.findById(userId);
        if (user) {
            bankDB.users.update(userId, { balance: user.balance + amount });
            bankDB.operations.add({
                type: 'admin_credit',
                userId: userId,
                amount: amount,
                description: 'Начисление администратором'
            });
            this.showNotification(`Начислено ${bankDB.utils.formatMoney(amount)} пользователю ${user.name}`, 'success');
            this.loadAdminUsers();
        }
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        document.getElementById('userGreeting').textContent = `Привет, ${this.currentUser.name}`;
        document.getElementById('userDetails').textContent = this.currentUser.email;
        
        document.getElementById('userName').textContent = `${this.currentUser.name} ${this.currentUser.lastName}`;
        document.getElementById('userContact').textContent = `${this.currentUser.email} • ${this.currentUser.phone}`;
        document.getElementById('userBalance').textContent = bankDB.utils.formatMoney(this.currentUser.balance);
        
        // Аватар
        const avatar = document.getElementById('userAvatar');
        avatar.textContent = this.currentUser.name[0] + this.currentUser.lastName[0];
    }

    switchTransferMethod(method) {
        // Обновляем активную кнопку
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-method="${method}"]`).classList.add('active');

        // Показываем нужные поля
        document.querySelectorAll('.transfer-fields').forEach(fields => {
            fields.classList.remove('active');
        });
        document.getElementById(method + 'Fields').classList.add('active');
    }

    formatPhoneInput(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value.length > 0) {
            if (value[0] === '8') value = '7' + value.slice(1);
            
            let formatted = '+7';
            if (value.length > 1) formatted += ` (${value.slice(1, 4)}`;
            if (value.length > 4) formatted += `) ${value.slice(4, 7)}`;
            if (value.length > 7) formatted += `-${value.slice(7, 9)}`;
            if (value.length > 9) formatted += `-${value.slice(9, 11)}`;
            
            input.value = formatted;
        }
    }

    getOperationIcon(type) {
        const icons = {
            'transfer': '💸',
            'welcome_bonus': '🎁',
            'admin_credit': '💰',
            'card_issued': '💳'
        };
        return icons[type] || '📄';
    }

    showNotification(message, type = 'success') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    logout() {
        this.currentUser = null;
        bankDB.session.clear();
        this.showAuth();
        this.showNotification('Вы вышли из системы');
    }
}

// Инициализация приложения
const bankApp = new BankApp();
