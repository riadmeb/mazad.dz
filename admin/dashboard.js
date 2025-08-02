// استيراد بيانات المستخدم عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/get-user-info', true);
    xhr.onload = function () {
        if (xhr.status === 200) {
            const userInfo = JSON.parse(xhr.responseText);
            document.getElementById('username').textContent = userInfo.username;
const profilePic = document.getElementById('profilePic');
if (userInfo.profilePicture && userInfo.profilePicture.trim() !== '') {
    profilePic.src = `/images/${userInfo.profilePicture}`;
} else {
    profilePic.src = '/images/default.png'; // ← صورة افتراضية
}
        }
    };
    xhr.send();

    // جلب أنواع المزادات وملء القائمة المنسدلة
fetch("/api/auction-types")
        .then(response => response.json())
        .then(data => {
            const auctionTypeSelect = document.getElementById('auction_type_id');
            data.forEach(type => {
                const option = document.createElement('option');
                option.value = type.auction_type_id;
                option.textContent = type.type_name;
                auctionTypeSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error fetching auction types:', error);
        });

    // جلب الإحصائيات وعرضها
    fetch('/get-statistics')
        .then(response => response.json())
        .then(data => {
            document.getElementById('totalUsers').textContent = data.total_users;
            document.getElementById('activeAuctions').textContent = data.active_auctions;
            document.getElementById('completedAuctions').textContent = data.completed_auctions;
            document.getElementById('pendingAuctions').textContent = data.pending_auctions;
            document.getElementById('totalAuctions').textContent = data.total_auctions;
            document.getElementById('totalBidders').textContent = data.total_bidders;
        })
        .catch(error => {
            console.error('Error fetching statistics:', error);
        });
});

// وظيفة عرض وإخفاء القائمة المنسدلة
function toggleDropdown() {
    const dropdownContent = document.getElementById('dropdownContent');
    dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
}

// وظيفة تسجيل الخروج
function logout() {
    window.location.href = '/admin/login-admin.html';
}
