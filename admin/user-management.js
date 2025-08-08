/**
 * =================================================================
 * الدوال المساعدة (Helpers)
 * =================================================================
 */

// دالة مساعدة مركزية للتعامل مع جميع طلبات API بأمان
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('authToken'); 

    if (!token) {
        console.error("Authentication token not found. Redirecting to login.");
        window.location.href = '/admin/login-admin.html';
        throw new Error('لا يوجد توكن مصادقة، تم إعادة التوجيه.');
    }

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const config = { ...options, headers: { ...defaultHeaders, ...options.headers } };
    const response = await fetch(url, config);

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('authToken');
        window.location.href = '/admin/login-admin.html';
        throw new Error('جلسة غير صالحة، تم إعادة التوجيه.');
    }

    // Check if the response has content before trying to parse it as JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'حدث خطأ في الخادم.');
        }
        return data;
    } else {
        if (!response.ok) {
            throw new Error(await response.text() || 'حدث خطأ في الخادم.');
        }
        return null; // Return null if no JSON content
    }
}


/**
 * =================================================================
 * الدوال الرئيسية (عرض البيانات والتفاعل)
 * =================================================================
 */

// جلب معلومات المدير وعرضها في الهيدر
async function fetchAdminInfo() {
    try {
        const userInfo = await fetchWithAuth('/get-user-info');
        if (!userInfo) return;

        const usernameEl = document.getElementById('username');
        const profilePicEl = document.getElementById('profilePic');
        
        if (usernameEl) usernameEl.textContent = userInfo.username;
        if (profilePicEl) {
            if (userInfo.profilePicture && userInfo.profilePicture.startsWith('http')) {
                profilePicEl.src = userInfo.profilePicture;
            } else {
                profilePicEl.src = '/images/default.png';
            }
        }
    } catch (error) {
        console.error('Error fetching admin info:', error.message);
    }
}


// جلب كل المستخدمين وعرضهم في القوائم
async function fetchUsers() {
    try {
        const users = await fetchWithAuth('/get-all-users');
        const pendingList = document.getElementById('pendingList').querySelector('ul');
        const approvedList = document.getElementById('approvedList').querySelector('ul');
        const rejectedList = document.getElementById('rejectedList').querySelector('ul');

        pendingList.innerHTML = '';
        approvedList.innerHTML = '';
        rejectedList.innerHTML = '';
        
        const defaultUserPic = '/images/default.png';

        users.forEach(user => {
            const li = document.createElement('li');
            const profilePicturePath = user.profile_picture && user.profile_picture.startsWith('http') ? user.profile_picture : defaultUserPic;
            
            li.innerHTML = `
                <img src="${profilePicturePath}" alt="صورة المستخدم" class="user-item-pic" onerror="this.src='${defaultUserPic}'">
                <span class="user-item-name">${user.username}</span>
            `;

            li.addEventListener('click', () => showUserDetails(user));
            
            if (user.status === 'pending') pendingList.appendChild(li);
            else if (user.status === 'approved') approvedList.appendChild(li);
            else if (user.status === 'rejected') rejectedList.appendChild(li);
        });
    } catch (error) {
        console.error('Error fetching users:', error.message);
        Swal.fire('خطأ', 'فشل تحميل قائمة المستخدمين.', 'error');
    }
}


// إظهار تفاصيل المستخدم في نافذة SweetAlert2
function showUserDetails(user) {
    const birthDate = new Date(user.birth_date).toLocaleDateString('ar-EG');
    const defaultUserPic = '/images/default.png';
    const profilePicturePath = user.profile_picture && user.profile_picture.startsWith('http') ? user.profile_picture : defaultUserPic;

    let actionButtons = '';
    if (user.status === 'pending') {
        actionButtons = `
            <button id="approveBtn" class="swal2-confirm swal2-styled approve-button">موافقة</button>
            <button id="rejectBtn" class="swal2-confirm swal2-styled reject-button">رفض</button>
        `;
    }

    Swal.fire({
        title: `تفاصيل المستخدم: ${user.username}`,
        html: `
            <div style="text-align: right; direction: rtl;">
                <img src="${profilePicturePath}" alt="الصورة الشخصية" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 15px;" onerror="this.src='${defaultUserPic}'">
                <p><strong>الاسم:</strong> ${user.first_name} ${user.last_name}</p>
                <p><strong>البريد الإلكتروني:</strong> ${user.email}</p>
                <p><strong>تاريخ الميلاد:</strong> ${birthDate}</p>
                <p><strong>رقم الهاتف:</strong> ${user.phone_number || 'غير متوفر'}</p>
                <p><strong>الحالة:</strong> ${user.status}</p>
            </div>
        `,
        showCancelButton: true,
        showConfirmButton: false, // We use custom buttons in the footer
        cancelButtonText: 'إغلاق',
        footer: `
            <div class="button-container">
                ${actionButtons}
                <button id="deleteBtn" class="swal2-confirm swal2-styled delete-button">حذف</button>
            </div>
        `
    });

    // Add event listeners for the custom buttons
    if (user.status === 'pending') {
        document.getElementById('approveBtn').addEventListener('click', () => approveUser(user.username));
        document.getElementById('rejectBtn').addEventListener('click', () => rejectUser(user.username));
    }
    document.getElementById('deleteBtn').addEventListener('click', () => deleteUser(user.username));
}


/**
 * =================================================================
 * دوال الأزرار (Approve, Reject, Delete)
 * =================================================================
 */

async function approveUser(username) {
    try {
        await fetchWithAuth('/approve-user', { method: 'POST', body: JSON.stringify({ username }) });
        Swal.fire('نجاح!', 'تمت الموافقة على المستخدم بنجاح.', 'success');
        fetchUsers(); // تحديث القائمة
    } catch (error) {
        Swal.fire('خطأ!', `فشلت العملية: ${error.message}`, 'error');
    }
}

async function rejectUser(username) {
    try {
        await fetchWithAuth('/reject-user', { method: 'POST', body: JSON.stringify({ username }) });
        Swal.fire('نجاح!', 'تم رفض المستخدم بنجاح.', 'success');
        fetchUsers(); // تحديث القائمة
    } catch (error) {
        Swal.fire('خطأ!', `فشلت العملية: ${error.message}`, 'error');
    }
}

async function deleteUser(username) {
    const result = await Swal.fire({
        title: `هل أنت متأكد من حذف المستخدم ${username}؟`,
        text: "لا يمكن التراجع عن هذا الإجراء!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'نعم، قم بالحذف!',
        cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
        try {
            await fetchWithAuth('/delete-user', { method: 'DELETE', body: JSON.stringify({ username }) });
            Swal.fire('تم الحذف!', 'تم حذف المستخدم بنجاح.', 'success');
            fetchUsers(); // تحديث القائمة
        } catch (error) {
            Swal.fire('خطأ!', `فشلت العملية: ${error.message}`, 'error');
        }
    }
}

// دالة تسجيل الخروج
function logout() {
    localStorage.removeItem('authToken');
    window.location.href = '/admin/login-admin.html';
}

/**
 * =================================================================
 * المشغل الرئيسي عند تحميل الصفحة
 * =================================================================
 */

document.addEventListener('DOMContentLoaded', function() {
    fetchAdminInfo();
    fetchUsers();
});
