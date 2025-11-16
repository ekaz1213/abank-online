// database.js - Библиотека для работы с данными
class BankDatabase {
    constructor() {
        this.version = '2.0';
        this.init();
    }

    init() {
        if (!localStorage.getItem('abank_initialized_v2')) {
            this.resetToDemoData();
            localStorage.setItem('abank_initialized_v2', 'true');
        }
    }

    keys = {
        USERS: 'abank_users_v2',
        PASSPORTS: 'abank_passports_v2', 
        OPERATIONS: 'abank_operations_v2',
        SESSION: 'abank_session_v2',
        SETTINGS: 'abank_settings_v2'
    }

    resetToDemoData() {
        const demoUsers = [
            {
                id: 'admin_001',
                name: 'Администратор',
                lastName: 'Системы',
                email: 'admin@abank.ru',
                phone: '+7 (999) 000-00-00',
                password: 'Admin123!',
                balance: 100000,
                role: 'admin',
                cards: [],
                createdAt: new Date().toISOString(),
                status: 'active'
            },
            {
                id: 'user_001', 
                name: 'Иван',
                lastName: 'Петров',
                email: 'ivan@example.com',
                phone: '+7 (999) 123-45-67',
                password: '12345678',
                balance: 15000,
                role: 'user',
                cards: [
                    {
                        id: 'card_001',
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
                status: 'active'
            }
        ];

        const demoPassports = [
            { number: '4500123456', userId: 'user_001', verified: true },
            { number: '4500987654', userId: null, verified: true }
        ];

        const demoSettings = {
            transferLimit: 50000,
            welcomeBonus: 500
        };

        this.save(this.keys.USERS, demoUsers);
        this.save(this.keys.PASSPORTS, demoPassports);
        this.save(this.keys.OPERATIONS, []);
        this.save(this.keys.SETTINGS, demoSettings);
    }

    save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    }

    load(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    // Пользователи
    users = {
        getAll: () => bankDB.load(bankDB.keys.USERS) || [],
        
        saveAll: (users) => bankDB.save(bankDB.keys.USERS, users),
        
        findByEmail: (email) => {
            const users = bankDB.users.getAll();
            return users.find(user => user.email === email);
        },
        
        findById: (id) => {
            const users = bankDB.users.getAll();
            return users.find(user => user.id === id);
        },
        
        create: (userData) => {
            const users = bankDB.users.getAll();
            const settings = bankDB.settings.get();
            
            const newUser = {
                id: 'user_' + Date.now(),
                ...userData,
                balance: settings.welcomeBonus || 0,
                cards: [],
                role: 'user',
                createdAt: new Date().toISOString(),
                status: 'active'
            };
            
            users.push(newUser);
            bankDB.users.saveAll(users);
            
            // Добавляем бонусную операцию
            if (settings.welcomeBonus > 0) {
                bankDB.operations.add({
                    type: 'welcome_bonus',
                    userId: newUser.id,
                    amount: settings.welcomeBonus,
                    description: 'Приветственный бонус'
                });
            }
            
            return newUser;
        },
        
        update: (userId, updates) => {
            const users = bankDB.users.getAll();
            const userIndex = users.findIndex(user => user.id === userId);
            
            if (userIndex !== -1) {
                users[userIndex] = { ...users[userIndex], ...updates };
                bankDB.users.saveAll(users);
                return users[userIndex];
            }
            return null;
        }
    }

    // Паспорта
    passports = {
        getAll: () => bankDB.load(bankDB.keys.PASSPORTS) || [],
        
        saveAll: (passports) => bankDB.save(bankDB.keys.PASSPORTS, passports),
        
        findByNumber: (number) => {
            const passports = bankDB.passports.getAll();
            return passports.find(p => p.number === number);
        },
        
        add: (passportData) => {
            const passports = bankDB.passports.getAll();
            passports.push(passportData);
            return bankDB.passports.saveAll(passports);
        }
    }

    // Операции
    operations = {
        getAll: () => bankDB.load(bankDB.keys.OPERATIONS) || [],
        
        saveAll: (operations) => {
            if (operations.length > 1000) {
                operations = operations.slice(0, 1000);
            }
            return bankDB.save(bankDB.keys.OPERATIONS, operations);
        },
        
        add: (operation) => {
            const operations = bankDB.operations.getAll();
            operation.id = 'op_' + Date.now();
            operation.at = new Date().toISOString();
            operations.unshift(operation);
            return bankDB.operations.saveAll(operations);
        }
    }

    // Сессия
    session = {
        get: () => bankDB.load(bankDB.keys.SESSION),
        
        set: (sessionData) => bankDB.save(bankDB.keys.SESSION, sessionData),
        
        clear: () => localStorage.removeItem(bankDB.keys.SESSION)
    }

    // Настройки
    settings = {
        get: () => bankDB.load(bankDB.keys.SETTINGS) || {},
        
        update: (newSettings) => {
            const current = bankDB.settings.get();
            return bankDB.save(bankDB.keys.SETTINGS, { ...current, ...newSettings });
        }
    }

    // Утилиты
    utils = {
        formatMoney: (amount) => {
            return new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB'
            }).format(amount || 0);
        },
        
        generateCardNumber: () => {
            const bin = '4276';
            let numbers = '';
            
            for (let i = 0; i < 11; i++) {
                numbers += Math.floor(Math.random() * 10);
            }
            
            const withoutCheck = bin + numbers;
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
            const fullNumber = withoutCheck + checkDigit;
            
            return fullNumber.replace(/(\d{4})/g, '$1 ').trim();
        }
    }
}

// Создаем глобальный экземпляр
const bankDB = new BankDatabase();
