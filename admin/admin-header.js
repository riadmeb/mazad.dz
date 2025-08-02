// هذا الملف مسؤول عن وظائف الهيدر في كل صفحات لوحة التحكم

document.addEventListener('DOMContentLoaded', () => {
    // جلب معلومات المستخدم لعرضها في الهيدر
    fetch('/get-user-info')
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch user info');
            return response.json();
        })
        .then(userInfo => {
            const usernameEl = document.getElementById('username');
            const profilePicEl = document.getElementById('profilePic');

            if (usernameEl) usernameEl.textContent = userInfo.username;
            
            // استخدام رابط الصورة المباشر من Cloudinary أو صورة افتراضية
            // ❌ الكود القديم
if (profilePicEl) profilePicEl.src = userInfo.profilePicture || 'placeholder.png';

// ✅ الكود الجديد
if (profilePicEl) profilePicEl.src = userInfo.profilePicture || 'https://res.cloudinary.com/your-cloud/image/upload/v123/default_user.jpg';
        })
        .catch(error => console.error('Error fetching user info for header:', error));
});

// دالة لعرض القائمة المنسدلة
function toggleDropdown() {
    const dropdownContent = document.getElementById('dropdownContent');
    if (dropdownContent) {
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    }
}

// دالة لتسجيل الخروج
function logout() {
    window.location.href = '/admin/login-admin.html';
}
