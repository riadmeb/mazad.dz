document.addEventListener('DOMContentLoaded', function () {
    // تعريف رابط الصورة الاحتياطية
    const CLOUDINARY_PLACEHOLDER_URL = 'https://res.cloudinary.com/your_cloud_name/image/upload/v12345/placeholder.png'; // ⚠️ استبدل هذا بالرابط الصحيح

    const token = localStorage.getItem('authToken');

    // التحقق من وجود التوكن أولاً
    if (!token) {
        alert('يرجى تسجيل الدخول لعرض هذه الصفحة.');
        window.location.href = 'login.html';
        return;
    }

    // جلب بيانات المستخدم عند تحميل الصفحة
    fetch('/get-user-data', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (response.status === 401) {
            alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجددًا.');
            localStorage.clear();
            window.location.href = 'login.html';
            return Promise.reject('Unauthorized');
        }
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // ✅✅✅ هذا هو الجزء الذي تم تعديله وتكميله ✅✅✅
        document.getElementById('username').value = data.username || '';
        document.getElementById('first-name').value = data.first_name || '';
        document.getElementById('last-name').value = data.last_name || '';
        document.getElementById('email').value = data.email || '';
        document.getElementById('phone-number').value = data.phone_number || '';
        
        // تعبئة الحقول التي كانت فارغة
        document.getElementById('birth-place').value = data.birth_place || '';
        document.getElementById('wilaya').value = data.wilaya_id || '';
        document.getElementById('commune').value = data.commune_id || '';
        
        // معالجة خاصة لتاريخ الميلاد ليتوافق مع حقل الإدخال
        if (data.birth_date) {
            // تحويل التاريخ إلى صيغة yyyy-MM-dd
            const date = new Date(data.birth_date);
            const formattedDate = date.toISOString().split('T')[0];
            document.getElementById('birth-date').value = formattedDate;
        }
        
        document.getElementById('profile-picture').src = data.profile_picture || CLOUDINARY_PLACEHOLDER_URL;
    })
    .catch(error => {
        if (error !== 'Unauthorized') {
            console.error('Error fetching user data:', error);
        }
    });

    // إرسال التحديثات إلى الخادم
    const form = document.getElementById('settings-form');
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        
        const formData = new FormData(form);

        fetch('/update-user-data', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('تم حفظ التغييرات بنجاح!');
                // تحديث البيانات في localStorage إذا لزم الأمر
                localStorage.setItem('firstName', formData.get('first_name'));
                localStorage.setItem('lastName', formData.get('last_name'));
            } else {
                alert('حدث خطأ أثناء حفظ التغييرات: ' + data.message);
            }
        })
        .catch(error => console.error('Error updating user data:', error));
    });

    // التعامل مع زر تسجيل الخروج
    const logoutButton = document.querySelector('.logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function (event) {
            event.preventDefault();
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }
});
