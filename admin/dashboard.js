document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            window.location.href = '/admin/login-admin.html';
            return;
        }

        // --- جلب معلومات المستخدم ---
        const userInfoResponse = await fetch(`/get-user-info?t=${new Date().getTime()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!userInfoResponse.ok) {
            const errorData = await userInfoResponse.json().catch(() => ({}));
            throw new Error(errorData.message || `فشل جلب بيانات المستخدم`);
        }

        const userInfo = await userInfoResponse.json();
        if (!userInfo) throw new Error("بيانات المستخدم فارغة.");

        // --- عرض معلومات المستخدم ---
        const usernameEl = document.getElementById('username');
        const profilePicEl = document.getElementById('profilePic');

        if (usernameEl && userInfo.username) {
            usernameEl.textContent = userInfo.username;
        }

        if (profilePicEl && userInfo.profilePicture) {
            // ✅ [الحل النهائي] هذا الكود سيعمل بشكل صحيح بمجرد
            // أن تحتوي قاعدة البيانات على رابط URL الكامل من Cloudinary.
            if (userInfo.profilePicture.startsWith('http')) {
                profilePicEl.src = userInfo.profilePicture;
            } else {
                // في حالة عدم وجود رابط كامل، يتم استخدام الصورة الافتراضية
                profilePicEl.src = '/images/default.png';
            }
        }

        // --- جلب البيانات الأخرى (بدون تغيير) ---
        const [typesData, statsData] = await Promise.all([
            fetch("/api/auction-types", { headers: { 'Authorization': `Bearer ${authToken}` } }).then(res => res.json()),
            fetch('/get-statistics', { headers: { 'Authorization': `Bearer ${authToken}` } }).then(res => res.json())
        ]);

        // عرض أنواع المزادات
        const auctionTypeSelect = document.getElementById('auction_type_id');
        if (auctionTypeSelect) {
            typesData.forEach(type => {
                const option = document.createElement('option');
                option.value = type.auction_type_id;
                option.textContent = type.type_name;
                auctionTypeSelect.appendChild(option);
            });
        }

        // عرض الإحصائيات
        document.getElementById('totalUsers').textContent = statsData.total_users || 0;
        document.getElementById('activeAuctions').textContent = statsData.active_auctions || 0;
        document.getElementById('completedAuctions').textContent = statsData.completed_auctions || 0;
        document.getElementById('pendingAuctions').textContent = statsData.pending_auctions || 0;
        document.getElementById('totalAuctions').textContent = statsData.total_auctions || 0;
        document.getElementById('totalBidders').textContent = statsData.total_bidders || 0;

    } catch (error) {
        console.error('❌ حدث خطأ:', error.message);
        const usernameEl = document.getElementById('username');
        if (usernameEl) {
            usernameEl.textContent = "خطأ";
        }
        Swal.fire({
            icon: 'error',
            title: 'فشل تحميل البيانات',
            text: error.message,
            confirmButtonText: 'حسناً'
        });
    }
});

function logout() {
    localStorage.removeItem('authToken');
    window.location.href = '/admin/login-admin.html';
}