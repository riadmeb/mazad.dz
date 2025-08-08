// دالة مساعدة مركزية للتعامل مع جميع طلبات API بأمان
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/admin/login-admin.html';
        throw new Error('التوكن غير موجود.');
    }

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    };

    const response = await fetch(url, config);
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('authToken');
        window.location.href = '/admin/login-admin.html';
        throw new Error('الجلسة غير صالحة.');
    }
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'حدث خطأ في الخادم.');
    }
    return data;
}

// جلب معلومات المدير وعرضها في الهيدر
async function fetchAdminInfo() {
    try {
        const userInfo = await fetchWithAuth('/get-user-info');
        const usernameEl = document.getElementById('username');
        const profilePicEl = document.getElementById('profilePic');
        
        if (usernameEl && userInfo.username) {
            usernameEl.textContent = userInfo.username;
        }
        if (profilePicEl && userInfo.profilePicture && userInfo.profilePicture.startsWith('http')) {
            profilePicEl.src = userInfo.profilePicture;
        }
    } catch (error) {
        console.error('Error fetching admin info:', error.message);
    }
}

// دالة تسجيل الخروج
function logout() {
    localStorage.removeItem('authToken');
    window.location.href = '/admin/login-admin.html';
}


/**
 * =================================================================
 * الدوال الخاصة بصفحة الفائزين
 * =================================================================
 */

// جلب وعرض قائمة الفائزين
async function fetchWinners() {
    try {
        const data = await fetchWithAuth('/auction-winners');
        if (!data.success) {
            throw new Error(data.error || 'فشل تحميل بيانات الفائزين.');
        }

        const container = document.getElementById('winnersContainer');
        if (!container) return;

        container.innerHTML = '';

        if (!Array.isArray(data.data) || data.data.length === 0) {
            container.innerHTML = '<p class="no-winners">لا توجد مزادات مكتملة لعرض الفائزين حاليًا.</p>';
            return;
        }

        data.data.forEach(auction => {
            const card = document.createElement('div');
            card.className = 'auction-card';

            let winnersHtml = '';
            if (auction.winners && auction.winners.length > 0) {
                auction.winners.forEach(winner => {
                    winnersHtml += `
                        <div class="winner-details ${winner.ranking === 1 ? 'rank-1' : ''}">
                            <div class="winner-rank">
                                ${winner.ranking === 1 ? '<i class="fas fa-trophy"></i>' : ''}
                                المرتبة ${winner.ranking}
                            </div>
                            <div class="winner-info">
                                <p><i class="fas fa-user"></i><strong>${winner.first_name} ${winner.last_name || ''}</strong> (${winner.username})</p>
                                <p><i class="fas fa-envelope"></i>${winner.email || 'غير متوفر'}</p>
                                <p><i class="fas fa-phone"></i>${winner.phone || 'غير متوفر'}</p>
                            </div>
                        </div>
                    `;
                });
            } else {
                winnersHtml = '<p class="no-winners">لا يوجد فائزون مسجلون لهذا المزاد.</p>';
            }

            card.innerHTML = `
                <div class="auction-details">
                    <h3>${auction.auction_name}</h3>
                    <div class="auction-meta">
                        <div class="meta-item"><i class="fas fa-hashtag"></i><span>رقم: ${auction.auction_number}</span></div>
                        <div class="meta-item"><i class="fas fa-tag"></i><span>${auction.auction_type}</span></div>
                        <div class="meta-item"><i class="fas fa-money-bill-wave"></i><span>السعر: ${auction.last_bid_amount || 'N/A'} دج</span></div>
                        <div class="meta-item"><i class="fas fa-calendar-check"></i><span>انتهى في: ${new Date(auction.end_time).toLocaleDateString('ar-EG')}</span></div>
                    </div>
                </div>
                <div class="winners-list">
                    <h4>قائمة الفائزين</h4>
                    ${winnersHtml}
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error fetching winners:', error.message);
        Swal.fire('خطأ!', `فشل تحميل البيانات: ${error.message}`, 'error');
    }
}

/**
 * =================================================================
 * المشغل الرئيسي عند تحميل الصفحة
 * =================================================================
 */

document.addEventListener('DOMContentLoaded', function() {
    fetchAdminInfo();
    fetchWinners();
});
