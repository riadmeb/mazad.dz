document.addEventListener('DOMContentLoaded', function () {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const firstName = localStorage.getItem('firstName') || 'اسم';
    const lastName = localStorage.getItem('lastName') || 'اللقب';
    const profilePicture = localStorage.getItem('profilePicture');
    // ✅ تعريف رابط الصورة الاحتياطية
    const CLOUDINARY_PLACEHOLDER_URL = 'https://res.cloudinary.com/your_cloud_name/image/upload/v12345/placeholder.png'; // ⚠️ استبدل هذا بالرابط الصحيح

    // تحديث رأس الصفحة حسب حالة تسجيل الدخول
    function updateHeader() {
        if (isLoggedIn) {
            document.getElementById('user-header').classList.remove('hidden');
            document.getElementById('guest-header').classList.add('hidden');
            document.getElementById('user-name').textContent = `${firstName} ${lastName}`;
            
            // ✅ التصحيح 3: استخدام رابط صورة المستخدم مباشرةً
            document.getElementById('user-profile-picture').src = profilePicture && profilePicture !== 'null' ? profilePicture : CLOUDINARY_PLACEHOLDER_URL;
        } else {
            document.getElementById('guest-header').classList.remove('hidden');
            document.getElementById('user-header').classList.add('hidden');
        }
    }
    updateHeader();

    // ... (منطق القائمة المنسدلة وتسجيل الخروج يبقى كما هو)

    // تحميل أنواع المزادات في القائمة المنسدلة
    function loadAuctionTypes() {
        // ✅ التصحيح 2: استخدام المسار الصحيح
        fetch('/api/auction-types')
            .then(res => res.json())
            .then(types => {
                const select = document.getElementById('auctionTypeFilter');
                types.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.auction_type_id;
                    option.textContent = type.type_name;
                    select.appendChild(option);
                });
            })
            .catch(err => console.error('خطأ في جلب أنواع المزادات:', err));
    }
    loadAuctionTypes();

    // جلب وعرض المزادات غير المنتهية
    function fetchAuctions(searchQuery = '', auctionType = '') {
        const params = new URLSearchParams({ searchQuery, auctionType });
        const token = localStorage.getItem('authToken');

        // ✅ التصحيح 1: استخدام المسار الصحيح لجلب المزادات
        fetch(`/active-auctions?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(auctions => {
            const list = document.getElementById('auctions-list');
            list.innerHTML = '';

            if (!auctions.length) {
                list.innerHTML = '<p style="text-align:center;">لا توجد مزادات لعرضها.</p>';
                return;
            }

            auctions.forEach(auction => {
                const card = document.createElement('div');
                card.className = 'auction-card';
                card.setAttribute('data-id', auction.auction_id);
                
                const now = new Date();
                const startTime = new Date(auction.start_time + 'Z');
                const endTime = new Date(auction.end_time + 'Z');
                let statusText = '';
                if (now < startTime) {
                    statusText = 'لم يبدأ بعد';
                } else if (now > endTime) {
                    statusText = 'منتهي'; // (هذا القسم لن يعرض مزادات منتهية بسبب نقطة النهاية)
                } else {
                    statusText = 'جاري الآن';
                }

                let imagesHtml = '';
                if (auction.images && auction.images.length > 0) {
                    auction.images.forEach((img, i) => {
                        imagesHtml += `<div class="auction-slide ${i === 0 ? 'active' : ''}" data-auction="${auction.auction_id}"><img src="${img}" alt="صورة المزاد" /></div>`;
                    });
                } else {
                    imagesHtml = `<div class="auction-slide active"><img src="${CLOUDINARY_PLACEHOLDER_URL}" alt="لا توجد صور"></div>`;
                }

                const buttonHtml = statusText === 'جاري الآن'
                    ? `<button class="bid-button" onclick="bidNow(${auction.auction_id})">مزايدة الآن</button>`
                    : `<button class="bid-button not-started" disabled>لم يبدأ بعد</button>`;

                const lastBid = auction.last_bid_price && auction.last_bid_price > auction.start_price
                    ? `${auction.last_bid_price} دج`
                    : 'لم تتم المزايدة بعد';

                card.innerHTML = `
                    <h3>${auction.title}</h3>
                    <div class="auction-images">
                        ${imagesHtml}
                        <a class="prev-slide" onclick="changeSlide(-1, ${auction.auction_id})">&#10094;</a>
                        <a class="next-slide" onclick="changeSlide(1, ${auction.auction_id})">&#10095;</a>
                    </div>
                    <p>رقم المزاد: ${auction.auction_number}</p>
                    <p>نوع المزاد: ${auction.type_name}</p>
                    <p>تاريخ الانتهاء: ${endTime.toLocaleString('fr-FR')}</p>
                    <p>آخر سعر: ${lastBid}</p>
                    <p>الحالة: ${statusText}</p>
                    ${buttonHtml}
                `;

                list.appendChild(card);
            });
        })
        .catch(error => {
            console.error('خطأ في جلب المزادات:', error);
            list.innerHTML = '<p style="text-align:center; color:red;">حدث خطأ أثناء تحميل المزادات.</p>';
        });
    }

    // دالة التنقل بين صور المزاد (السلايدر) تستخدم كلاس active
    window.changeSlide = function (n, auctionId) {
        const slides = document.querySelectorAll(`.auction-slide[data-auction="${auctionId}"]`);
        if (slides.length === 0) return;  // لا يوجد صور أصلاً

        let current = [...slides].findIndex(slide => slide.classList.contains('active'));

        if (current === -1) {
            current = 0;  // لو ما فيه active، نعتبر الشريحة الأولى هي الحالية
            slides[current].classList.add('active');
        } else {
            slides[current].classList.remove('active');
            current = (current + n + slides.length) % slides.length;
            slides[current].classList.add('active');
        }
    };

    // دالة البحث
    window.searchAuctions = function () {
        const search = document.getElementById('searchQuery').value;
        const type = document.getElementById('auctionTypeFilter').value;
        fetchAuctions(search, type);
    };

    // الانتقال لصفحة المزايدة مع تحقق تسجيل الدخول والشروط
    let selectedAuctionId = null;

    window.bidNow = function (auctionId) {
        if (isLoggedIn) {
            selectedAuctionId = auctionId;
            window.showTermsModal();
        } else {
            window.showAlertModal();
        }
    };

    // الشروط والنوافذ المنبثقة
    window.showTermsModal = function () {
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

    window.showAlertModal = function () {
        const modal = document.getElementById('alertModal');
        modal.classList.remove('hidden');
        modal.style.display = 'block';
    };

    // إغلاق النوافذ عند الضغط على زر ×
    document.querySelectorAll('.close-button').forEach(btn => {
        btn.addEventListener('click', function () {
            const modal = btn.closest('.modal');
            modal.classList.add('hidden');
            modal.style.display = 'none';
        });
    });

    // استدعاء أولي لجلب وعرض المزادات عند تحميل الصفحة
    fetchAuctions();
});
