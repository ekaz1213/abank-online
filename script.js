// Базовые функции для начала
function showSection(sectionName) {
    // Скрыть все секции
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Показать нужную секцию
    const targetSection = document.getElementById(sectionName + 'Screen');
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    // Обработчик формы входа
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        showNotification('Вход выполнен успешно!', 'success');
        showSection('dashboard');
    });
    
    // Обработчик формы регистрации
    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();
        showNotification('Аккаунт создан успешно!', 'success');
        showSection('login');
    });
    
    // Обработчик табов перевода
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const method = this.getAttribute('data-method');
            
            // Убрать активный класс у всех кнопок
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            // Добавить активный класс текущей кнопке
            this.classList.add('active');
            
            // Скрыть все поля
            document.querySelectorAll('.transfer-fields').forEach(fields => {
                fields.classList.remove('active');
            });
            
            // Показать нужные поля
            document.getElementById(method + 'Fields').classList.add('active');
        });
    });
    
    // Обработчик формы перевода
    document.getElementById('transferForm').addEventListener('submit', function(e) {
        e.preventDefault();
        showNotification('Перевод выполнен успешно!', 'success');
    });
});

function logout() {
    showSection('login');
    showNotification('Вы вышли из системы');
}
