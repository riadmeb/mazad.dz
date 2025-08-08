// في ملف login-admin.js
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('error-message');

            errorMessage.style.display = 'none';

            fetch('/admin/login', { // ⚠️ المسار الصحيح لتسجيل الدخول
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.message || 'فشل تسجيل الدخول') });
                }
                return response.json();
            })
            .then(data => {
                // ✅ الجزء الأهم: حفظ التوكن في الذاكرة
                if (data.token) {
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('isLoggedIn', 'true');
                    window.location.href = 'admin-dashboard.html';
                } else {
                    throw new Error('لم يتم استلام التوكن من الخادم.');
                }
            })
            .catch(error => {
                errorMessage.textContent = error.message;
                errorMessage.style.display = 'block';
            });
        });
    }
});