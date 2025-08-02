document.addEventListener('DOMContentLoaded', function () {
    // =================================================================
    // 1. المتغيرات العامة والإعدادات الأولية
    // =================================================================
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    // ✅ تعريف رابط الصورة الاحتياطية من Cloudinary
    const CLOUDINARY_PLACEHOLDER_URL = 'https://res.cloudinary.com/your_cloud_name/image/upload/v12345/placeholder.png'; // ⚠️ استبدل هذا بالرابط الصحيح

    // =================================================================
    // 2. إعداد واجهة المستخدم (Header)
    // =================================================================
    function setupUserHeader() {
        if (!isLoggedIn) {
            window.location.href = 'login.html';
            return;
        }

        const firstName = localStorage.getItem('firstName') || 'الاسم';
        const lastName = localStorage.getItem('lastName') || 'اللقب';
        const profilePicture = localStorage.getItem('profilePicture');

        document.getElementById('user-header')?.classList.remove('hidden');
        document.getElementById('guest-header')?.classList.add('hidden');
        document.getElementById('user-name').textContent = `${firstName} ${lastName}`;
        
        // ✅ التصحيح: استخدام رابط صورة المستخدم مباشرةً
        document.getElementById('user-profile-picture').src = profilePicture && profilePicture !== 'null' ? profilePicture : CLOUDINARY_PLACEHOLDER_URL;

        // منطق القائمة المنسدلة وتسجيل الخروج
        const userProfilePicture = document.getElementById('user-profile-picture');
        const dropdownMenu = document.getElementById('dropdownMenu');
        userProfilePicture?.addEventListener('click', e => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('hidden');
        });
        document.querySelector('.logout')?.addEventListener('click', e => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'index.html';
        });
        document.addEventListener('click', () => {
            dropdownMenu?.classList.add('hidden');
        });
    }
    // ✅ 3. دوال التحكم في نافذة الشروط (تمت إضافتها)
    // =================================================================
    window.bidNow = function (auctionId) {
        selectedAuctionId = auctionId;
        const modal = document.getElementById('termsModal');
        modal.classList.remove('hidden');
        modal.style.display = 'block';
    };

    window.closeTermsModal = function () {
        const modal = document.getElementById('termsModal');
        modal.classList.add('hidden');
        modal.style.display = 'none';
        selectedAuctionId = null;
    };

    window.showTermsAlertModal = function () {
        const modal = document.getElementById('termsAlertModal');
        modal.classList.remove('hidden');
        modal.style.display = 'block';
    };

    window.closeTermsAlertModal = function () {
        const modal = document.getElementById('termsAlertModal');
        modal.classList.add('hidden');
        modal.style.display = 'none';
    };

    window.confirmBid = function () {
        const agree = document.getElementById('agreeTerms').checked;
        if (agree && selectedAuctionId) {
            window.location.href = `bid.html?auctionId=${selectedAuctionId}`;
        } else {
            window.showTermsAlertModal();
        }
    };

    // =================================================================
    // 3. دوال جلب وعرض المزادات
    // =================================================================
    async function loadAuctionsStatus() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            alert('رمز المصادقة مفقود. يرجى تسجيل الدخول مجددًا.');
            window.location.href = 'login.html';
            return;
        }

        try {
            const response = await fetch('/auctions-status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجددًا.');
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
            if (!response.ok) throw new Error('فشل جلب بيانات المزادات');

            const auctions = await response.json();
            
            const wonAuctions = auctions.filter(a => a.status === 'فزت بالمزاد');
            const lostAuctions = auctions.filter(a => a.status === 'خسرت المزاد');
            const ongoingAuctions = auctions.filter(a => a.status === 'جاري الآن');

            renderWonAuctions(wonAuctions);
            await renderOngoingAuctions(ongoingAuctions, token);
            renderLostAuctions(lostAuctions);

        } catch (error) {
            console.error('حدث خطأ أثناء جلب بيانات المزادات:', error);
            document.getElementById('my-auctions-container').innerHTML = '<p>حدث خطأ في تحميل بيانات المزادات.</p>';
        }
    }

    function renderWonAuctions(auctions) {
        const section = document.getElementById('won-section');
        section.innerHTML = '';
        if (auctions.length === 0) {
            section.innerHTML = '<p class="empty-message">ليس لديك مزادات فائزة حاليًا.</p>';
            return;
        }
        auctions.forEach(a => {
            const div = document.createElement('div');
            div.className = 'auction-card won';
            div.innerHTML = `
              <div class="auction-images">${buildAuctionImagesHtml(a.images, a.auction_id)}</div>
              <h3 class="auction-title">${a.title}</h3>
              <div class="auction-details-grid">
                <p><strong>السعر النهائي:</strong> ${a.winning_amount} د.ج</p>
                <p><strong>انتهى في:</strong> ${new Date(a.end_time).toLocaleString('fr-FR')}</p>
              </div>
              <div class="note">لقد فزت بهذا المزاد 🎉</div>
              <div class="alert">يرجى دفع مبلغ المزاد خلال 8 أيام.</div>
            `;
            section.appendChild(div);
        });
    }

    // ✅ تم تعديل هذه الدالة
    async function renderOngoingAuctions(auctions, token) {
        const section = document.getElementById('ongoing-section');
        section.innerHTML = '';
        if (auctions.length === 0) {
            section.innerHTML = '<p class="empty-message">أنت لا تشارك في أي مزادات جارية حاليًا.</p>';
            return;
        }
        for (const a of auctions) {
            const rankRes = await fetch(`/auction-rank?auctionId=${a.auction_id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const rankData = rankRes.ok ? await rankRes.json() : { rank: 'غير متاح' };
            const minutesLeft = Math.floor((new Date(a.end_time) - new Date()) / 60000);
            const div = document.createElement('div');
            div.className = 'auction-card ongoing';
            div.innerHTML = `
              <div class="auction-images">${buildAuctionImagesHtml(a.images, a.auction_id)}</div>
              <h3 class="auction-title">${a.title}</h3>
              <div class="auction-details-grid">
                <p><strong>أعلى مزايدة لك:</strong> ${a.user_max_bid} د.ج</p>
                <p><strong>السعر الحالي:</strong> ${a.winning_amount} د.ج</p>
                <p><strong>ترتيبك الحالي:</strong> ${rankData.rank}</p>
                <p><strong>الوقت المتبقي:</strong> ~${minutesLeft > 0 ? minutesLeft : 0} دقيقة</p>
              </div>
              
              <button class="bid-button" onclick="bidNow(${a.auction_id})">اذهب للمزاد</button>
            `;
            section.appendChild(div);
        }
    }


    function renderLostAuctions(auctions) {
        const section = document.getElementById('lost-section');
        if (!section) return;
        section.innerHTML = '';
        if (auctions.length === 0) {
            section.innerHTML = '<p class="empty-message">ليس لديك مزادات خاسرة.</p>';
            return;
        }
        auctions.forEach(a => {
            const div = document.createElement('div');
            div.className = 'auction-card lost';
            div.innerHTML = `
              <div class="auction-images">${buildAuctionImagesHtml(a.images, a.auction_id)}</div>
              <h3 class="auction-title">${a.title}</h3>
              <div class="auction-details-grid">
                <p><strong>مزايدتك الأعلى:</strong> ${a.user_max_bid} د.ج</p>
                <p><strong>السعر الفائز:</strong> ${a.winning_amount} د.ج</p>
                <p><strong>انتهى في:</strong> ${new Date(a.end_time).toLocaleString('fr-FR')}</p>
              </div>
              <div class="alert lost">لم تفز بهذا المزاد</div>
            `;
            section.appendChild(div);
        });
    }

    // ✅ التصحيح: دالة بناء الصور تستخدم الروابط مباشرةً
    function buildAuctionImagesHtml(images, auctionId) {
        if (!Array.isArray(images) || images.length === 0) {
            return `<div class="auction-slide active"><img src="${CLOUDINARY_PLACEHOLDER_URL}" alt="لا توجد صور"></div>`;
        }
        let imagesHtml = images.map((img, i) => 
            `<div class="auction-slide ${i === 0 ? 'active' : ''}" data-auction="${auctionId}"><img src="${img}" alt="صورة المزاد" /></div>`
        ).join('');
        
        if (images.length > 1) {
            imagesHtml += `<a class="prev-slide" onclick="changeSlide(-1, ${auctionId})">&#10094;</a><a class="next-slide" onclick="changeSlide(1, ${auctionId})">&#10095;</a>`;
        }
        return imagesHtml;
    }
function renderLostAuctions(auctions) {
    const section = document.getElementById('lost-section');
    if (!section) return;

    section.innerHTML = '';
    if (auctions.length === 0) {
        section.innerHTML = '<p class="empty-message">ليس لديك مزادات خاسرة.</p>';
        return;
    }
    
    auctions.forEach(a => {
        const div = document.createElement('div');
        div.className = 'auction-card lost';
        div.innerHTML = `
          <div class="auction-images">${buildAuctionImagesHtml(a.images, a.auction_id)}</div>
          <h3 class="auction-title">${a.title}</h3>
          <div class="auction-details-grid">
            <p><strong>مزايدتك الأعلى:</strong> ${a.user_max_bid} د.ج</p>
            <p><strong>السعر الفائز:</strong> ${a.winning_amount} د.ج</p>
            <p><strong>انتهى في:</strong> ${new Date(a.end_time).toLocaleString('fr-FR')}</p>
          </div>
          <div class="alert lost">لم تفز بهذا المزاد</div>
        `;
        section.appendChild(div);
    });
}

    // =================================================================
    // 4. الدوال المساعدة الأخرى (التبويبات، التنقل بين الصور)
    // =================================================================
    const tabButtons = document.querySelectorAll('.tab-button');
    const auctionSections = document.querySelectorAll('.auction-section');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const tab = button.getAttribute('data-tab');
            auctionSections.forEach(section => section.classList.add('hidden'));
            document.getElementById(`${tab}-section`).classList.remove('hidden');
        });
    });

    window.changeSlide = function (n, auctionId) {
        const slides = document.querySelectorAll(`.auction-slide[data-auction="${auctionId}"]`);
        if (slides.length <= 1) return;
        let current = [...slides].findIndex(slide => slide.classList.contains('active'));
        slides[current].classList.remove('active');
        current = (current + n + slides.length) % slides.length;
        slides[current].classList.add('active');
    };

    // =================================================================
    // 5. بدء تشغيل الصفحة
    // =================================================================
    setupUserHeader();
    loadAuctionsStatus();
});