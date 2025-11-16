// Базовая система хранения данных
const DB = {
    usersKey: 'abank_users',
    passportsKey: 'abank_passports', 
    opsKey: 'abank_ops',
    sessionKey: 'abank_session'
};

// Инициализация данных
function initializeData() {
    if (!localStorage.getItem(DB.usersKey)) {
        const admin = {
            id: 'u_admin',
            name: 'Администратор',
            email: 'admin@abank.ru',
            pass: 'Admin123!',
            balance: 50000,
            role: 'admin',
            cards: [],
            createdAt: new Date().toISOString()
        };
        const demoUser = {
            id: 'u_1', 
            name: 'Иван Петров',
            email: 'ivan@example.com',
            pass: '123456',
            balance: 1500,
            role: 'user',
            cards: [],
            createdAt: new Date().toISOString()
        };
        localStorage.setItem(DB.usersKey, JSON.stringify([admin, demoUser]));
    }
    
    if (!localStorage.getItem(DB.passportsKey)) {
        localStorage.setItem(DB.passportsKey, JSON.stringify(['4500123456', '4500987654']));
    }
    
    if (!localStorage.getItem(DB.opsKey)) {
        localStorage.setItem(DB.opsKey, JSON.stringify([]));
    }
}

// Утилиты
function read(key) { 
    return JSON.parse(localStorage.getItem(key) || 'null'); 
}

function write(key, val) { 
    localStorage.setItem(key, JSON.stringify(val)); 
}

// API
const api = {
    async listUsers() { return read(DB.usersKey) || []; },
    async saveUsers(users) { write(DB.usersKey, users); return true; },

    async listPassports() { return read(DB.passportsKey) || []; },
    async savePassports(passports) { write(DB.passportsKey, passports); return true; },

    async listOps() { return read(DB.opsKey) || []; },
    async saveOps(ops) { write(DB.opsKey, ops); return true; },

    async login(email, pass) {
        const users = await api.listUsers();
        const user = users.find(u => u.email === email && u.pass === pass);
        if (!user) throw new Error('Неверный email или пароль');
        
        write(DB.sessionKey, { userId: user.id, loggedInAt: new Date().toISOString() });
        return user;
    },

    async logout() {
        localStorage.removeItem(DB.sessionKey);
        return true;
    },

    async currentUser() {
        const session = read(DB.sessionKey);
        if (!session) return null;
        
        const users = await api.listUsers();
        return users.find(u => u.id === session.userId) || null;
    },

    async registerUser({ name, email, pass }) {
        if (pass.length < 6) throw new Error('Пароль должен быть не менее 6 символов');
        
        const users = await api.listUsers();
        if (users.find(u => u.email === email)) throw new Error('Email уже занят');
        
        const id = 'u_' + Date.now();
        const user = { 
            id, 
            name, 
            email, 
            pass, 
            balance: 0, 
            role: 'user', 
            cards: [],
            createdAt: new Date().toISOString()
        };
        
        users.push(user);
        await api.saveUsers(users);
        return user;
    },

    async applyCard(userId, passportNumber) {
        const passports = await api.listPassports();
        if (!passports.includes(passportNumber)) {
            throw new Error('Паспорт не верифицирован');
        }
        
        const users = await api.listUsers();
        const user = users.find(u => u.id === userId);
        if (!user) throw new Error('Пользователь не найден');
        
        const cardNumber = '4276 ' + 
            Math.floor(1000 + Math.random() * 9000) + ' ' + 
            Math.floor(1000 + Math.random() * 9000) + ' ' + 
            Math.floor(1000 + Math.random() * 9000);
        
        const card = {
            id: 'card_' + Date.now(),
            number: cardNumber,
            type: 'Visa Classic',
            balance: user.balance,
            currency: 'RUB',
            issuedAt: new Date().toISOString()
        };
        
        user.cards.push(card);
        await api.saveUsers(users);
        
        await api.recordOp({
            type: 'card_issued',
            userId: user.id,
            details: card,
            at: new Date().toISOString()
        });
        
        return card;
    },

    async transfer(fromId, toEmail, amount, description) {
        amount = Number(amount);
        if (!amount || amount <= 0) throw new Error('Неверная сумма перевода');
        
        const users = await api.listUsers();
        const fromUser = users.find(u => u.id === fromId);
        const toUser = users.find(u => u.email === toEmail);
        
        if (!fromUser) throw new Error('Отправитель не найден');
        if (!toUser) throw new Error('Получатель не найден');
        if (fromUser.balance < amount) throw new Error('Недостаточно средств');
        if (fromUser.id === toUser.id) throw new Error('Нельзя переводить самому себе');
        
        fromUser.balance -= amount;
        toUser.balance += amount;
        
        await api.saveUsers(users);
        
        await api.recordOp({
            type: 'transfer',
            fromId: fromUser.id,
            toId: toUser.id,
            amount: amount,
            description: description || 'Без описания',
            at: new Date().toISOString()
        });
        
        return true;
    },

    async recordOp(operation) {
        const ops = await api.listOps();
        operation.id = 'op_' + Date.now();
        ops.unshift(operation);
        if (ops.length > 500) ops.pop();
        await api.saveOps(ops);
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

// Обработчики событий
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
        if (e.target.getAttribute('data-action')) {
            navigate(e.target.getAttribute('data-action'));
        }
    });
});

// Функции UI
async function handleLogin() {
    const email = el('loginEmail').value.trim();
    const pass = el('loginPass').value;
    
    try {
        const user = await api.login(email, pass);
        await refreshUI();
        showNotification('Вход выполнен успешно!', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function handleRegister() {
    const name = el('regName').value.trim();
    const email = el('regEmail').value.trim();
    const pass = el('regPass').value;
    
    try {
        const user = await api.registerUser({ name, email, pass });
        showNotification('Аккаунт создан! Теперь войдите.', 'success');
        el('showLogin').click();
        el('loginEmail').value = email;
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 20px;
        border-radius: 12px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        background: ${type === 'error' ? '#ff5a5a' : '#4CAF50'};
        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 4000);
}

async function navigate(view) {
    const user = await api.currentUser();
    if (!user) {
        showNotification('Пожалуйста, войдите в систему', 'error');
        return;
    }
    
    switch (view) {
        case 'dashboard': await showDashboard(user); break;
        case 'transfer': await showTransfer(user); break;
        case 'card': await showCardApplication(user); break;
        case 'history': await showHistory(user); break;
        case 'admin_users': await showAdminUsers(user); break;
        case 'admin_passports': await showAdminPassports(user); break;
        case 'admin_ops': await showAdminOps(user); break;
    }
}

// Views
async function showDashboard(user) {
    content.innerHTML = `
        <div class="card">
            <h3>Привет, ${escapeHtml(user.name)} ${user.role === 'admin' ? '<span class="admin-badge">ADMIN</span>' : ''}</h3>
            <div class="balance">${formatMoney(user.balance)}</div>
            <p class="muted">Ваш текущий баланс</p>
            
            ${user.cards.length > 0 ? `
                <div style="margin-top: 20px;">
                    <h4>Ваши карты</h4>
                    ${user.cards.map(card => `
                        <div style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 16px; border-radius: 12px; margin-top: 12px;">
                            <div style="font-weight: 600; font-size: 18px;">${card.number}</div>
                            <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                                <span>${card.type}</span>
                                <span>${formatMoney(card.balance)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

async function showTransfer(user) {
    content.innerHTML = `
        <div class="card">
            <h3>Перевод средств</h3>
            <form id="transferForm">
                <label>
                    <div>Email получателя</div>
                    <input type="email" id="t_to" required placeholder="recipient@example.com" />
                </label>
                <label>
                    <div>Сумма перевода (₽)</div>
                    <input type="number" id="t_amount" required min="1" placeholder="1000" />
                </label>
                <label>
                    <div>Назначение платежа</div>
                    <input type="text" id="t_desc" placeholder="Назначение платежа" />
                </label>
                <div class="actions">
                    <button type="submit">Отправить перевод</button>
                </div>
            </form>
        </div>
    `;
    
    el('transferForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const toEmail = el('t_to').value.trim();
        const amount = el('t_amount').value;
        const description = el('t_desc').value;
        
        try {
            await api.transfer(user.id, toEmail, amount, description);
            showNotification('Перевод выполнен успешно!', 'success');
            await refreshUI();
            showDashboard(await api.currentUser());
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
}

async function showCardApplication(user) {
    content.innerHTML = `
        <div class="card">
            <h3>Заявка на банковскую карту</h3>
            <p class="muted">Для оформления карты требуется подтверждение паспортных данных</p>
            
            <form id="cardApply">
                <label>
                    <div>Номер паспорта</div>
                    <input type="text" id="passportNumber" required placeholder="4500123456" />
                    <div class="muted">10 цифр без пробелов</div>
                </label>
                <div class="actions">
                    <button type="submit">Подать заявку</button>
                </div>
            </form>
        </div>
    `;
    
    el('cardApply').addEventListener('submit', async (e) => {
        e.preventDefault();
        const passportNumber = el('passportNumber').value.trim();
        
        try {
            const card = await api.applyCard(user.id, passportNumber);
            showNotification(`Карта выпущена: ${card.number}`, 'success');
            await refreshUI();
            showDashboard(await api.currentUser());
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
}

async function showHistory(user) {
    const ops = await api.listOps();
    const userOps = ops.filter(op => 
        op.userId === user.id || op.fromId === user.id || op.toId === user.id
    );
    
    content.innerHTML = `
        <div class="card">
            <h3>История операций</h3>
            ${userOps.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Тип</th>
                            <th>Описание</th>
                            <th>Сумма</th>
                            <th>Дата</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${userOps.map(op => `
                            <tr>
                                <td>${escapeHtml(op.type)}</td>
                                <td>${escapeHtml(op.description || '—')}</td>
                                <td style="font-weight: 700; color: ${op.fromId === user.id ? '#ff5a5a' : '#4CAF50'}">
                                    ${op.fromId === user.id ? '-' : '+'}${formatMoney(op.amount || 0)}
                                </td>
                                <td>${new Date(op.at).toLocaleDateString('ru-RU')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p class="muted">Операций пока нет</p>'}
        </div>
    `;
}

// Админ views
async function showAdminUsers(user) {
    if (user.role !== 'admin') {
        showNotification('Доступ запрещен', 'error');
        return;
    }
    
    const users = await api.listUsers();
    content.innerHTML = `
        <div class="card">
            <h3>Управление пользователями</h3>
            <table>
                <thead>
                    <tr>
                        <th>Имя</th>
                        <th>Email</th>
                        <th>Баланс</th>
                        <th>Роль</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td>${escapeHtml(u.name)}</td>
                            <td>${escapeHtml(u.email)}</td>
                            <td>${formatMoney(u.balance)}</td>
                            <td>${u.role}</td>
                            <td>
                                <button data-id="${u.id}" class="creditBtn" style="padding: 8px 12px; font-size: 12px;">+1000 ₽</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    content.querySelectorAll('.creditBtn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.getAttribute('data-id');
            const users = await api.listUsers();
            const targetUser = users.find(u => u.id === userId);
            
            if (targetUser) {
                targetUser.balance += 1000;
                await api.saveUsers(users);
                await api.recordOp({
                    type: 'admin_credit',
                    adminId: user.id,
                    userId: targetUser.id,
                    amount: 1000,
                    at: new Date().toISOString()
                });
                showNotification(`Начислено 1000 ₽ пользователю ${targetUser.name}`, 'success');
                showAdminUsers(user);
            }
        });
    });
}

async function showAdminPassports(user) {
    if (user.role !== 'admin') {
        showNotification('Доступ запрещен', 'error');
        return;
    }
    
    let passports = await api.listPassports();
    content.innerHTML = `
        <div class="card">
            <h3>Управление паспортами</h3>
            
            <form id="addPassport" style="margin-bottom: 20px;">
                <label>
                    <div>Номер паспорта</div>
                    <input type="text" id="newPassport" required placeholder="4500123456" />
                </label>
                <div class="actions">
                    <button type="submit">Добавить паспорт</button>
                </div>
            </form>
            
            <h4>Список паспортов (${passports.length})</h4>
            ${passports.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Паспорт</th>
                            <th>Действие</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${passports.map(p => `
                            <tr>
                                <td>${escapeHtml(p)}</td>
                                <td>
                                    <button data-pass="${escapeHtml(p)}" class="delPass" style="padding: 6px 10px; font-size: 12px; background: #ff5a5a;">Удалить</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p class="muted">Паспорта не добавлены</p>'}
        </div>
    `;
    
    el('addPassport').addEventListener('submit', async (e) => {
        e.preventDefault();
        const passportNumber = el('newPassport').value.trim();
        
        passports = await api.listPassports();
        if (passports.includes(passportNumber)) {
            showNotification('Этот паспорт уже добавлен', 'error');
            return;
        }
        
        passports.push(passportNumber);
        await api.savePassports(passports);
        await api.recordOp({
            type: 'admin_add_passport',
            adminId: user.id,
            passport: passportNumber,
            at: new Date().toISOString()
        });
        
        showNotification('Паспорт добавлен', 'success');
        showAdminPassports(user);
    });
    
    content.querySelectorAll('.delPass').forEach(btn => {
        btn.addEventListener('click', async () => {
            const passport = btn.getAttribute('data-pass');
            let passports = await api.listPassports();
            passports = passports.filter(p => p !== passport);
            await api.savePassports(passports);
            await api.recordOp({
                type: 'admin_remove_passport',
                adminId: user.id,
                passport: passport,
                at: new Date().toISOString()
            });
            showNotification('Паспорт удален', 'success');
            showAdminPassports(user);
        });
    });
}

async function showAdminOps(user) {
    if (user.role !== 'admin') {
        showNotification('Доступ запрещен', 'error');
        return;
    }
    
    const ops = await api.listOps();
    content.innerHTML = `
        <div class="card">
            <h3>Журнал операций</h3>
            ${ops.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Тип</th>
                            <th>Детали</th>
                            <th>Дата</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ops.map(op => `
                            <tr>
                                <td>${escapeHtml(op.type)}</td>
                                <td>${escapeHtml(JSON.stringify(op))}</td>
                                <td>${new Date(op.at).toLocaleString('ru-RU')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p class="muted">Операций нет</p>'}
        </div>
    `;
}

// Вспомогательные функции
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMoney(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB'
    }).format(amount || 0);
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
        smallInfo.textContent = 'Онлайн банкинг 24/7';
        content.innerHTML = `
            <div class="card">
                <h3>Добро пожаловать в А БАНК</h3>
                <p class="muted">Войдите или зарегистрируйтесь для доступа к онлайн банкингу</p>
            </div>
        `;
    } else {
        nav.style.display = 'block';
        el('authView').style.display = 'none';
        el('registerView').style.display = 'none';
        greeting.innerHTML = `
            ${escapeHtml(user.name)}
            <div class="muted" style="margin-top: 8px;">Баланс: <strong>${formatMoney(user.balance)}</strong></div>
        `;
        smallInfo.textContent = user.email;
        
        if (user.role === 'admin') {
            adminNav.style.display = 'block';
        } else {
            adminNav.style.display = 'none';
        }
        
        showDashboard(user);
    }
}

// Запуск при загрузке
refreshUI();
