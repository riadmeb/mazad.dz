document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(loginForm);
        const data = {
            identifier: formData.get('identifier'), // يمكن أن يكون اسم المستخدم أو البريد الإلكتروني
            password: formData.get('password')
        };
        loginUser(data);
    });
});

function loginUser(data) {
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        const messageBox = document.getElementById('messageBox');
        if (result.success) {
            // عند نجاح تسجيل الدخول، قم بتعيين القيم في التخزين المحلي
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('firstName', result.firstName);
            localStorage.setItem('lastName', result.lastName);
            localStorage.setItem('profilePicture', result.profilePicture);
            localStorage.setItem('authToken', result.token); // تخزين رمز JWT في التخزين المحلي

            // إعادة توجيه المستخدم إلى الصفحة الرئيسية بعد تسجيل الدخول الناجح
            window.location.href = 'index.html';
        } else {
            messageBox.textContent = result.message;
            messageBox.style.display = 'block';
            messageBox.classList.add('error'); // إضافة فئة تنسيق الخطأ
            setTimeout(() => {
                messageBox.style.display = 'none';
            }, 5000); // إخفاء الرسالة بعد 5 ثوانٍ
        }
    })
    .catch(error => {
        console.error('خطأ أثناء تسجيل الدخول:', error);
    });
}
