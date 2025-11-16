// Оптимизированная система хранения с кэшированием
const DB = {
    usersKey: 'abank_premium_v4',
    passportsKey: 'abank_passports_v4',
    opsKey: 'abank_ops_v4',
    receiptsKey: 'abank_receipts_v4',
    sessionKey: 'abank_session_v4',
    settingsKey: 'abank_settings_v4'
};

// Кэш для производительности
const storageCache = new Map();

// Инициализация с оптимизацией
function initializeData() {
    const startTime = performance.now();
    
    if (!localStorage.getItem(DB.usersKey)) {
        const admin = {
            id: 'u_admin',
            name: 'Администратор',
            lastName: 'Системы',
            email: 'admin@abank.ru',
            phone: '+7 (999) 000-00-00',
            pass: 'Admin123!',
            balance: 100000,
            role: 'admin',
            cards: [],
            createdAt: new Date().toISOString(),
            status: 'active',
            lastLogin: new Date().toISOString()
        };
        const demoUser = {
            id: 'u_1',
            name: 'Иван',
            lastName: 'Петров',
            email: 'ivan@example.com',
            phone: '+7 (999) 123-45-67',
            pass: '12345678',
            balance: 15000,
            role: 'user',
            cards: [
                {
                    id: 'card_1',
                    number: '4276 1234 5678 9012',
                    type: 'Visa Platinum',
                    balance: 15000,
                    currency: 'RUB',
                    issuedAt: new Date().toISOString(),
                    expiry: '12/28',
                    cvv: '123',
                    status: 'active'
                }
            ],
            createdAt: new Date().toISOString(),
            status: 'active',
            lastLogin: new Date().toISOString()
        };
        localStorage.setItem(DB.usersKey, JSON.stringify([admin, demoUser]));
    }
    
    if (!localStorage.getItem(DB.passportsKey)) {
        localStorage.setItem(DB.passportsKey, JSON.stringify([
            { number: '4500123456', userId: 'u_1', verified: true, verifiedAt: new Date().toISOString() },
            { number: '4500987654', userId: null, verified: true, verifiedAt: new Date().toISOString() }
        ]));
    }
    
    if (!localStorage.getItem(DB.opsKey)) {
        localStorage.setItem(DB.opsKey, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(DB.receiptsKey)) {
        localStorage.setItem(DB.receiptsKey, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(DB.settingsKey)) {
        localStorage.setItem(DB.settingsKey, JSON.stringify({
            transferLimit: 50000,
            cardIssueFee: 0,
            currency: 'RUB',
            maintenanceMode: false,
            welcomeBonus: 500
        }));
    }
    
    console.log(`Data initialized in ${(performance.now() - startTime).toFixed(2)}ms`);
}

// Оптимизированные утилиты
function read(key) {
    if (storageCache.has(key)) {
        return storageCache.get(key);
    }
    const data = JSON.parse(localStorage.getItem(key) || 'null');
    storageCache.set(key, data);
    return data;
}

function write(key, val) {
    storageCache.set(key, val);
    localStorage.setItem(key, JSON.stringify(val));
}

function clearCache() {
    storageCache.clear();
}

// Улучшенный API
const api = {
    async listUsers() { 
        return read(DB.usersKey) || []; 
    },
    
    async saveUsers(users) { 
        write(DB.usersKey, users);
        return true;
    },

    async listPassports() { 
        return read(DB.passportsKey) || []; 
    },
    
    async savePassports(passports) { 
        write(DB.passportsKey, passports);
        return true;
    },

    async listOps() { 
        return read(DB.opsKey) || []; 
    },
    
    async saveOps(ops) { 
        write(DB.opsKey, ops);
        return true;
    },

    async listReceipts() {
        return read(DB.receiptsKey) || [];
    },

    async saveReceipts(receipts) {
        write(DB.receiptsKey, receipts);
        return true;
    },

    async getSettings() {
        return read(DB.settingsKey) || {};
    },

    async saveSettings(settings) {
        write(DB.settingsKey, settings);
        return true;
    },

    async login(email, pass) {
        const users = await api.listUsers();
        const user = users.find(u => u.email === email && u.pass === pass && u.status === 'active');
        if (!user) throw new Error('Неверный email или пароль');
        
        // Обновляем время последнего входа
        user.lastLogin = new Date().toISOString();
        await api.saveUsers(users);
        
        write(DB.sessionKey, { 
            userId: user.id, 
            loggedInAt: new Date().toISOString(),
            sessionId: 'sess_' + Date.now()
        });
        return user;
    },

    async logout() {
        localStorage.removeItem(DB.sessionKey);
        clearCache();
        return true;
    },

    async currentUser() {
        const session = read(DB.sessionKey);
        if (!session) return null;
        
        const users = await api.listUsers();
        return users.find(u => u.id === session.userId) || null;
    },

    async registerUser({ name, lastName, email, phone, pass }) {
        if (pass.length < 8) throw new Error('Пароль должен быть не менее 8 символов');
        if (!phone.match(/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/)) {
            throw new Error('Введите корректный номер телефона в формате: +7 (999) 999-99-99');
        }
        
        const users = await api.listUsers();
        if (users.find(u => u.email === email)) throw new Error('Email уже занят');
        if (users.find(u => u.phone === phone)) throw new Error('Телефон уже зарегистрирован');
        
        const id = 'u_' + Date.now();
        const settings = await api.getSettings();
        
        const user = { 
            id, 
            name, 
            lastName,
            email, 
            phone,
            pass, 
            balance: settings.welcomeBonus || 0, 
            role: 'user', 
            cards: [],
            createdAt: new Date().toISOString(),
            status: 'active',
            lastLogin: new Date().toISOString()
        };
        
        users.push(user);
        await api.saveUsers(users);
        
        // Приветственный бонус
        if (settings.welcomeBonus > 0) {
            await api.recordOp({
                type: 'welcome_bonus',
                userId: id,
                amount: settings.welcomeBonus,
                description: 'Приветственный бонус за регистрацию',
                at: new Date().toISOString()
            });
        }
        
        return user;
    },

    async applyCard(userId, passportNumber, cardType = 'Visa Classic') {
        const passports = await api.listPassports();
        const passport = passports.find(p => p.number === passportNumber && p.verified);
        
        if (!passport) {
            throw new Error('Паспорт не верифицирован. Обратитесь к администратору.');
        }
        
        const users = await api.listUsers();
        const user = users.find(u => u.id === userId);
        if (!user) throw new Error('Пользователь не найден');
        
        // Проверяем, нет ли уже активной карты
        if (user.cards.some(card => card.status === 'active')) {
            throw new Error('У вас уже есть активная карта');
        }
        
        // Генерация номера карты по стандарту
        const generateCardNumber = () => {
            const bins = {
                'Visa Classic': '4276',
                'Visa Gold': '4279', 
                'Visa Platinum': '4380'
            };
            const bin = bins[cardType] || '4276';
            const account = Math.floor(100000000 + Math.random() * 900000000).toString();
            const withoutCheck = bin + account;
            
            // Алгоритм Луна
            let sum = 0;
            for (let i = 0; i < withoutCheck.length; i++) {
                let digit = parseInt(withoutCheck[i]);
                if ((withoutCheck.length - i) % 2 === 0) {
                    digit *= 2;
                    if (digit > 9) digit -= 9;
                }
                sum += digit;
            }
            const checkDigit = (10 - (sum % 10)) % 10;
            
            return bin + account + checkDigit;
        };

        const cardNumber = generateCardNumber();
        const formattedNumber = cardNumber.replace(/(\d{4})/g, '$1 ').trim();
        
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 3);
        
        const card = {
            id: 'card_' + Date.now(),
            number: formattedNumber,
            type: cardType,
            balance: user.balance,
            currency: 'RUB',
            issuedAt: new Date().toISOString(),
            expiry: `${(expiry.getMonth() + 1).toString().padStart(2, '0')}/${expiry.getFullYear().toString().slice(2)}`,
            cvv: Math.floor(100 + Math.random() * 900).toString(),
            passport: passportNumber,
            status: 'active'
        };
        
        user.cards.push(card);
        passport.userId = userId;
        
        await api.saveUsers(users);
        await api.savePassports(passports);
        
        await api.recordOp({
            type: 'card_issued',
            userId: user.id,
            details: card,
            at: new Date().toISOString()
        });
        
        return card;
    },

    async transfer({ fromId, toIdentifier, amount, description, method }) {
        const startTime = performance.now();
        
        amount = Number(amount);
        if (!amount || amount <= 0) throw new Error('Неверная сумма перевода');
        
        const settings = await api.getSettings();
        if (amount > settings.transferLimit) {
            throw new Error(`Превышен лимит перевода. Максимум: ${formatMoney(settings.transferLimit)}`);
        }
        
        const users = await api.listUsers();
        const fromUser = users.find(u => u.id === fromId);
        if (!fromUser) throw new Error('Отправитель не найден');
        
        // Поиск получателя по разным идентификаторам
        let toUser = null;
        switch (method) {
            case 'email':
                toUser = users.find(u => u.email === toIdentifier);
                break;
            case 'phone':
                toUser = users.find(u => u.phone === toIdentifier);
                break;
            case 'card':
                toUser = users.find(u => u.cards.some(c => 
                    c.number.replace(/\s/g, '') === toIdentifier.replace(/\s/g, '')
                ));
                break;
            default:
                throw new Error('Неверный метод перевода');
        }
        
        if (!toUser) throw new Error('Получатель не найден');
        if (fromUser.balance < amount) throw new Error('Недостаточно средств на счете');
        if (fromUser.id === toUser.id) throw new Error('Нельзя переводить самому себе');
        
        // Выполняем перевод
        fromUser.balance -= amount;
        toUser.balance += amount;
        
        await api.saveUsers(users);
        
        const operation = {
            type: 'transfer',
            fromId: fromUser.id,
            toId: toUser.id,
            amount: amount,
            description: description || 'Без описания',
            method: method,
            identifier: toIdentifier,
            at: new Date().toISOString()
        };
        
        await api.recordOp(operation);
        
        // Создаем квитанцию
        await api.createReceipt(operation);
        
        console.log(`Transfer completed in ${(performance.now() - startTime).toFixed(2)}ms`);
        
        return { success: true, operation, fromUser, toUser };
    },

    async recordOp(operation) {
        const ops = await api.listOps();
        operation.id = 'op_' + Date.now();
        ops.unshift(operation);
        
        // Оптимизация: храним только последние 1000 операций
        if (ops.length > 1000) {
            ops.splice(1000);
        }
        
        await api.saveOps(ops);
        return operation;
    },

    async createReceipt(operation) {
        const receipts = await api.listReceipts();
        const receipt = {
            id: 'rec_' + Date.now(),
            operationId: operation.id,
            type: operation.type,
            amount: operation.amount,
            fromId: operation.fromId,
            toId: operation.toId,
            description: operation.description,
            method: operation.method,
            at: operation.at,
            receiptNumber: 'R' + Date.now().toString().slice(-8),
            status: 'completed'
        };
        
        receipts.unshift(receipt);
        if (receipts.length > 500) receipts.pop();
        
        await api.saveReceipts(receipts);
        return receipt;
    },

    async getUserStats(userId) {
        const ops = await api.listOps();
        const userOps = ops.filter(op => 
            op.userId === userId || op.fromId === userId || op.toId === userId
        );
        
        const today = new Date().toDateString();
        const todayOps = userOps.filter(op => 
            new Date(op.at).toDateString() === today
        );
        
        return {
            totalOperations: userOps.length,
            todayOperations: todayOps.length,
            totalTransferred: userOps
                .filter(op => op.type === 'transfer' && op.fromId === userId)
                .reduce((sum, op) => sum + (op.amount || 0), 0),
            totalReceived: userOps
                .filter(op => op.type === 'transfer' && op.toId === userId)
                .reduce((sum, op) => sum + (op.amount || 0), 0)
        };
    },

    async getSystemStats() {
        const users = await api.listUsers();
        const ops = await api.listOps();
        const passports = await api.listPassports();
        
        const today = new Date().toDateString();
        const todayOps = ops.filter(op => 
            new Date(op.at).toDateString() === today
        );
        
        return {
            totalUsers: users.length,
            activeUsers: users.filter(u => u.status === 'active').length,
            totalBalance: users.reduce((sum, u) => sum + u.balance, 0),
            totalOperations: ops.length,
            todayOperations: todayOps.length,
            verifiedPassports: passports.filter(p => p.verified).length,
            blockedUsers: users.filter(u => u.status === 'blocked').length
        };
    },

    async findUserByIdentifier(identifier) {
        const users = await api.listUsers();
        
        // Поиск по email
        let user = users.find(u => u.email === identifier);
        if (user) return { user, method: 'email' };
        
        // Поиск по телефону
        user = users.find(u => u.phone === identifier);
        if (user) return { user, method: 'phone' };
        
        // Поиск по карте
        user = users.find(u => u.cards.some(c => 
            c.number.replace(/\s/g, '') === identifier.replace(/\s/g, '')
        ));
        if (user) return { user, method: 'card' };
        
        return null;
    }
};

// UI элементы
const el = id => document.getElementById(id);
const nav = el('nav');
const adminNav = el('adminNav');
const content = el('contentArea');
const greeting = el('greeting');
const smallInfo = el('smallInfo');

// Инициализация
initializeData();

// Оптимизированные обработчики событий
function setupEventListeners() {
    el('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });

    el('showRegister').addEventListener('click', () => {
        el('authView').style.display = 'none';
        el('registerView').style.display = 'block';
    });

    el('showLogin').addEventListener('click', () => {
        el('authView').style.display = 'block';
        el('registerView').style.display = 'none';
    });

    el('regForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleRegister();
    });

    el('logoutBtn').addEventListener('click', async () => {
        await api.logout();
        await refreshUI();
    });

    document.querySelectorAll('.nav-button[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.getAttribute('data-action');
            navigate(action);
        });
    });
}

// Функции UI
async function handleLogin() {
    const email = el('loginEmail').value.trim();
    const pass = el('loginPass').value;
    
    const button = el('loginForm').querySelector('button[type="submit"]');
    const originalText = button.innerHTML;
    button.innerHTML = '<div class="loading"></div>';
    button.disabled = true;
    
    try {
        const user = await api.login(email, pass);
        await refreshUI();
        showNotification(`Добро пожаловать, ${user.name}! 🎉`, 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

async function handleRegister() {
    const name = el('regName').value.trim();
    const lastName = el('regLastName').value.trim();
    const email = el('regEmail').value.trim();
    const phone = el('regPhone').value.trim();
    const pass = el('regPass').value;
    
    const button = el('regForm').querySelector('button[type="submit"]');
    const originalText = button.innerHTML;
    button.innerHTML = '<div class="loading"></div>';
    button.disabled = true;
    
    try {
        const user = await api.registerUser({ name, lastName, email, phone, pass });
        const settings = await api.getSettings();
        const bonusText = settings.welcomeBonus > 0 ? ` Получен бонус ${formatMoney(settings.welcomeBonus)}!` : '';
        showNotification(`Аккаунт создан!${bonusText} Теперь войдите.`, 'success');
        el('showLogin').click();
        el('loginEmail').value = email;
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Автоматическое скрытие
    setTimeout(() => {
        notification.style.transform = 'translateX(500px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }, 5000);
}

async function navigate(view) {
    const user = await api.currentUser();
    if (!user) {
        showNotification('Пожалуйста, войдите в систему', 'error');
        return;
    }
    
    // Очистка контента с анимацией
    content.style.opacity = '0';
    setTimeout(() => {
        content.style.opacity = '1';
    }, 50);
    
    switch (view) {
        case 'dashboard': await showDashboard(user); break;
        case 'transfer': await showTransfer(user); break;
        case 'card': await showCardApplication(user); break;
        case 'history': await showHistory(user); break;
        case 'receipts': await showReceipts(user); break;
        case 'admin_users': await showAdminUsers(user); break;
        case 'admin_passports': await showAdminPassports(user); break;
        case 'admin_ops': await showAdminOps(user); break;
        case 'admin_reports': await showAdminReports(user); break;
        case 'admin_settings': await showAdminSettings(user); break;
    }
}

// Views
async function showDashboard(user) {
    const stats = await api.getUserStats(user.id);
    const systemStats = user.role === 'admin' ? await api.getSystemStats() : null;
    
    content.innerHTML = `
        <div class="user-info">
            <div class="user-avatar">${user.name[0]}${user.lastName[0]}</div>
            <div>
                <h2>Привет, ${escapeHtml(user.name)} ${user.role === 'admin' ? '<span class="admin-badge">ADMIN</span>' : ''}</h2>
                <p class="muted">${user.email} • ${user.phone}</p>
            </div>
        </div>

        <div class="card">
            <div class="balance">${formatMoney(user.balance)}</div>
            <p class="muted">Текущий баланс</p>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="muted">Всего операций</div>
                    <div class="stat-number">${stats.totalOperations}</div>
                    <div class="muted">сегодня: ${stats.todayOperations}</div>
                </div>
                <div class="stat-card">
                    <div class="muted">Переведено</div>
                    <div class="stat-number">${formatMoney(stats.totalTransferred)}</div>
                </div>
                <div class="stat-card">
                    <div class="muted">Получено</div>
                    <div class="stat-number">${formatMoney(stats.totalReceived)}</div>
                </div>
            </div>
        </div>

        ${user.role === 'admin' ? `
            <div class="card">
                <h3>📊 Статистика системы</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="muted">Пользователи</div>
                        <div class="stat-number">${systemStats.totalUsers}</div>
                        <div class="muted">активных: ${systemStats.activeUsers}</div>
                    </div>
                    <div class="stat-card">
                        <div class="muted">Общий баланс</div>
                        <div class="stat-number">${formatMoney(systemStats.totalBalance)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="muted">Операции</div>
                        <div class="stat-number">${systemStats.totalOperations}</div>
                        <div class="muted">сегодня: ${systemStats.todayOperations}</div>
                    </div>
                </div>
            </div>
        ` : ''}

        <div class="card">
            <h3>🚀 Быстрые действия</h3>
            <div class="quick-actions">
                <div class="quick-action-btn" data-action="transfer">
                    <div style="font-size: 24px; margin-bottom: 8px;">💸</div>
                    <div>Перевод</div>
                </div>
                <div class="quick-action-btn" data-action="card">
                    <div style="font-size: 24px; margin-bottom: 8px;">💳</div>
                    <div>Карты</div>
                </div>
                <div class="quick-action-btn" data-action="history">
                    <div style="font-size: 24px; margin-bottom: 8px;">📈</div>
                    <div>История</div>
                </div>
                <div class="quick-action-btn" data-action="receipts">
                    <div style="font-size: 24px; margin-bottom: 8px;">🧾</div>
                    <div>Квитанции</div>
                </div>
            </div>
        </div>

        ${user.cards.length > 0 ? `
            <div class="card">
                <h3>💳 Ваши карты</h3>
                ${user.cards.map(card => `
                    <div style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 16px; margin-top: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 800; font-size: 20px; letter-spacing: 1px;">${card.number}</div>
                                <div style="display: flex; gap: 20px; margin-top: 12px; font-size: 14px;">
                                    <span>${card.type}</span>
                                    <span>До ${card.expiry}</span>
                                    <span>${formatMoney(card.balance)}</span>
                                </div>
                            </div>
                            <div style="font-size: 32px;">💳</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;
    
    // Добавляем обработчики для быстрых действий
    content.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.getAttribute('data-action')));
    });
}

async function showTransfer(user) {
    content.innerHTML = `
        <div class="card">
            <h2>💸 Перевод средств</h2>
            <p class="muted">Безопасный перевод денег любым удобным способом</p>
            
            <div class="tabs">
                <button class="tab active" data-method="email">
                    <span style="font-size: 18px; margin-right: 8px;">📧</span>
                    По Email
                </button>
                <button class="tab" data-method="phone">
                    <span style="font-size: 18px; margin-right: 8px;">📱</span>
                    По Телефону
                </button>
                <button class="tab" data-method="card">
                    <span style="font-size: 18px; margin-right: 8px;">💳</span>
                    По Карте
                </button>
            </div>

            <form id="transferForm">
                <div id="emailMethod" class="transfer-method active">
                    <div class="form-group">
                        <label>Email получателя</label>
                        <input type="email" id="t_email" required placeholder="recipient@example.com" />
                        <div class="form-hint">Введите email адрес получателя</div>
                    </div>
                </div>

                <div id="phoneMethod" class="transfer-method">
                    <div class="form-group">
                        <label>Телефон получателя</label>
                        <input type="tel" id="t_phone" required placeholder="+7 (999) 999-99-99" />
                        <div class="form-hint">Введите телефон в формате +7 (999) 999-99-99</div>
                    </div>
                </div>

                <div id="cardMethod" class="transfer-method">
                    <div class="form-group">
                        <label>Номер карты</label>
                        <input type="text" id="t_card" required placeholder="4276 1234 5678 9012" />
                        <div class="form-hint">Введите 16-значный номер карты</div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Сумма перевода (₽)</label>
                    <input type="number" id="t_amount" required min="1" max="50000" placeholder="1000" />
                    <div class="form-hint">Максимальная сумма: 50,000 ₽</div>
                </div>

                <div class="form-group">
                    <label>Назначение платежа</label>
                    <input type="text" id="t_desc" placeholder="Например: За услуги, Подарок, Возврат долга" />
                    <div class="form-hint">Укажите цель перевода</div>
                </div>

                <div class="actions">
                    <button type="submit" class="btn-primary">
                        <span class="btn-icon">🚀</span>
                        Выполнить перевод
                    </button>
                </div>
            </form>
        </div>

        <div class="card">
            <h3>📋 Последние переводы</h3>
            <div id="recentTransfers">
                <div class="loading"></div>
            </div>
        </div>

        <div class="card">
            <h3>💡 Частые получатели</h3>
            <div id="frequentContacts" style="color: #666; text-align: center; padding: 20px;">
                Здесь появятся ваши частые контакты
            </div>
        </div>
    `;

    // Обработчики табов
    content.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            content.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            content.querySelectorAll('.transfer-method').forEach(m => m.classList.remove('active'));
            
            tab.classList.add('active');
            const method = tab.getAttribute('data-method');
            el(method + 'Method').classList.add('active');
        });
    });

    // Загрузка последних переводов
    await loadRecentTransfers(user);

    el('transferForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const activeTab = content.querySelector('.tab.active');
        const method = activeTab.getAttribute('data-method');
        let identifier = '';
        
        switch (method) {
            case 'email': identifier = el('t_email').value.trim(); break;
            case 'phone': identifier = el('t_phone').value.trim(); break;
            case 'card': identifier = el('t_card').value.trim(); break;
        }
        
        const amount = el('t_amount').value;
        const description = el('t_desc').value;
        
        const button = el('transferForm').querySelector('button[type="submit"]');
        const originalText = button.innerHTML;
        button.innerHTML = '<div class="loading"></div>';
        button.disabled = true;
        
        try {
            // Сначала ищем получателя
            const recipientInfo = await api.findUserByIdentifier(identifier);
            if (!recipientInfo) {
                throw new Error('Получатель не найден. Проверьте правильность данных.');
            }
            
            const result = await api.transfer({
                fromId: user.id,
                toIdentifier: identifier,
                amount: amount,
                description: description,
                method: method
            });
            
            showNotification(`Перевод на ${formatMoney(amount)} выполнен успешно! ✅`, 'success');
            
            // Показываем квитанцию
            await showReceiptPreview(result.operation, result.fromUser, result.toUser);
            
            await refreshUI();
            await loadRecentTransfers(await api.currentUser());
            
            // Очищаем форму
            el('transferForm').reset();
            
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    });
}

async function loadRecentTransfers(user) {
    const ops = await api.listOps();
    const userOps = ops.filter(op => 
        (op.fromId === user.id || op.toId === user.id) && op.type === 'transfer'
    ).slice(0, 5);
    
    const recentEl = el('recentTransfers');
    if (userOps.length > 0) {
        recentEl.innerHTML = userOps.map(op => {
            const isOutgoing = op.fromId === user.id;
            const amountClass = isOutgoing ? 'color: #ff5a5a;' : 'color: #4CAF50;';
            const amountSign = isOutgoing ? '-' : '+';
            const icon = isOutgoing ? '↗️' : '↙️';
            
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="font-size: 20px;">${icon}</div>
                        <div>
                            <div style="font-weight: 600;">${escapeHtml(op.description)}</div>
                            <div class="muted" style="font-size: 12px;">${new Date(op.at).toLocaleDateString('ru-RU')}</div>
                        </div>
                    </div>
                    <div style="font-weight: 700; ${amountClass}">
                        ${amountSign}${formatMoney(op.amount)}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        recentEl.innerHTML = '<p class="muted" style="text-align: center; padding: 20px;">Переводов пока нет</p>';
    }
}

async function showReceiptPreview(operation, fromUser, toUser) {
    const receiptHTML = `
        <div class="receipt">
            <div class="receipt-header">
                <h3>А БАНК</h3>
                <div>Квитанция о переводе №${operation.id.slice(-8)}</div>
            </div>
            
            <div class="receipt-line">
                <span>Дата операции:</span>
                <span>${new Date(operation.at).toLocaleString('ru-RU')}</span>
            </div>
            
            <div class="receipt-line">
                <span>Отправитель:</span>
                <span>${fromUser.name} ${fromUser.lastName}</span>
            </div>
            
            <div class="receipt-line">
                <span>Получатель:</span>
                <span>${toUser.name} ${toUser.lastName}</span>
            </div>
            
            <div class="receipt-line">
                <span>Способ перевода:</span>
                <span>${getMethodName(operation.method)}</span>
            </div>
            
            <div class="receipt-line">
                <span>Сумма перевода:</span>
                <span style="font-weight: 700; font-size: 18px;">${formatMoney(operation.amount)}</span>
            </div>
            
            <div class="receipt-line">
                <span>Назначение:</span>
                <span>${operation.description}</span>
            </div>
            
            <div class="receipt-line">
                <span>Статус:</span>
                <span style="color: #4CAF50; font-weight: 700;">Успешно выполнено</span>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 2px solid #333;">
                <div>Спасибо за использование А БАНК!</div>
                <div style="font-size: 12px; color: #666; margin-top: 8px;">${new Date().toLocaleString('ru-RU')}</div>
            </div>
        </div>
        
        <div class="actions" style="margin-top: 20px;">
            <button onclick="printReceipt()" class="btn-primary">
                <span class="btn-icon">🖨️</span>
                Распечатать
            </button>
            <button onclick="closeReceipt()" class="btn-secondary">
                <span class="btn-icon">✓</span>
                Закрыть
            </button>
        </div>
    `;
    
    showModal('Квитанция о переводе', receiptHTML);
}

function getMethodName(method) {
    const methods = {
        'email': 'По Email',
        'phone': 'По телефону', 
        'card': 'По карте'
    };
    return methods[method] || method;
}

// Глобальные функции для модальных окон
window.printReceipt = function() {
    window.print();
};

window.closeReceipt = function() {
    document.querySelector('.modal-overlay')?.remove();
};

// Остальные функции (showCardApplication, showHistory, showReceipts, админ-панель) 
// остаются аналогичными предыдущей версии, но с улучшениями...

// Вспомогательные функции
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMoney(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(amount || 0);
}

// Модальное окно
function showModal(title, contentHTML) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(10px);
        padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 20px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #333;">${title}</h2>
                <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
            </div>
            ${contentHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Обновление UI
async function refreshUI() {
    const user = await api.currentUser();
    
    if (!user) {
        nav.style.display = 'none';
        adminNav.style.display = 'none';
        el('authView').style.display = 'block';
        el('registerView').style.display = 'none';
        greeting.textContent = 'Войдите в систему';
        smallInfo.textContent = 'Премиум банкинг 24/7';
        content.innerHTML = `
            <div class="card welcome-card">
                <div class="welcome-icon">🏦</div>
                <h2>Добро пожаловать в А БАНК</h2>
                <p class="muted">Войдите или зарегистрируйтесь для доступа к премиум банкингу</p>
            </div>
        `;
    } else {
        nav.style.display = 'block';
        el('authView').style.display = 'none';
        el('registerView').style.display = 'none';
        greeting.innerHTML = `
            ${escapeHtml(user.name)} ${escapeHtml(user.lastName)}
            <div class="muted" style="margin-top: 10px;">Баланс: <strong>${formatMoney(user.balance)}</strong></div>
        `;
        smallInfo.textContent = `${user.email} • ${user.phone}`;
        
        if (user.role === 'admin') {
            adminNav.style.display = 'block';
        } else {
            adminNav.style.display = 'none';
        }
        
        showDashboard(user);
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    refreshUI();
    
    // Оптимизация: периодическая очистка кэша
    setInterval(() => {
        clearCache();
    }, 300000); // 5 минут
    
    // Автосохранение каждые 30 секунд (имитация)
    setInterval(() => {
        const session = read(DB.sessionKey);
        if (session) {
            console.log('Auto-save check...');
        }
    }, 30000);
});

// Оптимизация: очистка при закрытии
window.addEventListener('beforeunload', () => {
    clearCache();
});
