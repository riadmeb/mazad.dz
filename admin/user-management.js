// المشغل الرئيسي عند تحميل الصفحة
// =================================================================
document.addEventListener('DOMContentLoaded', function() {
    // --- الكود الجديد الذي تمت إضافته ---
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
          if (profilePicEl) profilePicEl.src = userInfo.profilePicture || 'https://res.cloudinary.com/your-cloud/image/upload/v123/default_user.jpg';
        })
        .catch(error => console.error('Error fetching user info for header:', error));
    // --- نهاية الكود المضاف ---

    // الكود الأصلي الخاص بك يبدأ من هنا
    fetchUsers();

    // إغلاق أي نافذة منبثقة عند النقر خارجها
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.user-list-item')) {
            const userDetailsPopups = document.querySelectorAll('.user-details-popup');
            userDetailsPopups.forEach(popup => {
                popup.style.display = 'none';
            });
        }
    });
});

// =================================================================
// باقي الدوال تبقى كما هي
// =================================================================

function fetchUsers() {
    fetch('/get-all-users')
        .then(response => response.json())
        .then(users => {
            const pendingList = document.getElementById('pendingList').querySelector('ul');
            const approvedList = document.getElementById('approvedList').querySelector('ul');
            const rejectedList = document.getElementById('rejectedList').querySelector('ul');
            pendingList.innerHTML = '';
            approvedList.innerHTML = '';
            rejectedList.innerHTML = '';
            
            users.forEach(user => {
                const li = document.createElement('li');
                li.classList.add('user-list-item');
                li.innerHTML = `<span class="user-label">المستخدم</span> <span class="user-name">${user.username}</span>`;
                li.addEventListener('click', (event) => {
                    event.stopPropagation();
                    showUserDetails(li);
                });
                
                const userDetailsPopup = document.createElement('div');
                userDetailsPopup.classList.add('user-details-popup');

                const birthDate = new Date(user.birth_date).toLocaleDateString('ar-EG');
                const profilePicturePath = user.profile_picture || 'placeholder.png'; 

                userDetailsPopup.innerHTML = `
                    <p><strong>اسم المستخدم:</strong> ${user.username}</p>
                    <p><strong>الاسم:</strong> ${user.first_name}</p>
                    <p><strong>اللقب:</strong> ${user.last_name}</p>
                    <p><strong>تاريخ الميلاد:</strong> ${birthDate}</p>
                    <p><strong>رقم الهاتف:</strong> ${user.phone_number || 'غير متوفر'}</p>
                    <p><strong>الحالة:</strong> ${user.status}</p>
                    <div class="profile-picture-container">
                        <img src="${profilePicturePath}" alt="الصورة الشخصية" class="popup-profile-pic">
                    </div>
                    <div class="button-container">
                        ${user.status === 'pending' ? `<button class="approve-button" onclick="approveUser('${user.username}', event)">موافقة</button>` : ''}
                        ${user.status === 'pending' ? `<button class="reject-button" onclick="rejectUser('${user.username}', event)">رفض</button>` : ''}
                        <button class="delete-button" onclick="deleteUser('${user.username}', event)">حذف</button>
                    </div>
                `;
                li.appendChild(userDetailsPopup);
                
                if (user.status === 'pending') {
                    pendingList.appendChild(li);
                } else if (user.status === 'approved') {
                    approvedList.appendChild(li);
                } else if (user.status === 'rejected') {
                    rejectedList.appendChild(li);
                }
            });
        })
        .catch(error => console.error('Error fetching users:', error));
}

function showUserDetails(listItem) {
    document.querySelectorAll('.user-details-popup').forEach(p => p.style.display = 'none');
    const userDetailsPopup = listItem.querySelector('.user-details-popup');
    if (userDetailsPopup) {
        userDetailsPopup.style.display = 'block';
    }
}

function approveUser(username, event) {
    event.stopPropagation();
    fetch('/approve-user', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('تمت الموافقة على المستخدم بنجاح');
            fetchUsers();
        } else {
            alert('حدث خطأ أثناء الموافقة على المستخدم');
        }
    });
}

function rejectUser(username, event) {
    event.stopPropagation();
    fetch('/reject-user', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('تم رفض المستخدم بنجاح');
            fetchUsers();
        } else {
            alert('حدث خطأ أثناء رفض المستخدم');
        }
    });
}

function deleteUser(username, event) {
    event.stopPropagation();
    if (!confirm(`هل أنت متأكد من حذف المستخدم ${username}؟`)) return;
    
    fetch('/delete-user', { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('تم حذف المستخدم بنجاح');
            fetchUsers();
        } else {
            alert('حدث خطأ أثناء حذف المستخدم');
        }
    });
}

function toggleDropdown() {
    const dropdownContent = document.getElementById('dropdownContent');
    if (dropdownContent) {
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    }
}

function logout() {
    window.location.href = '/admin/login-admin.html';
}
