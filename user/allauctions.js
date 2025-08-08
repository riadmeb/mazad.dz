document.addEventListener('DOMContentLoaded', function () {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const firstName = localStorage.getItem('firstName') || 'اسم';
    const lastName = localStorage.getItem('lastName') || 'اللقب';
    const profilePicture = localStorage.getItem('profilePicture');
    const PLACEHOLDER_URL = 'https://placehold.co/600x400/EFEFEF/AAAAAA?text=No+Image';

    // ✅ تم تحديث هذه الدالة لتشمل منطق القائمة المنسدلة
    function setupHeader() {
        if (isLoggedIn) {
            document.getElementById('user-header').classList.remove('hidden');
            document.getElementById('guest-header').classList.add('hidden');
            document.getElementById('user-name').textContent = `${firstName} ${lastName}`;
            document.getElementById('user-profile-picture').src = profilePicture && profilePicture !== 'null' ? profilePicture : PLACEHOLDER_URL;

            // --- الكود الجديد الخاص بالقائمة المنسدلة (من ملف index.js) ---
            const userProfilePicture = document.getElementById('user-profile-picture');
            const dropdownMenu = document.getElementById('dropdownMenu');

            userProfilePicture?.addEventListener('click', (event) => {
                event.stopPropagation(); // لمنع إغلاق القائمة فور فتحها
                dropdownMenu?.classList.toggle('hidden');
            });

            document.querySelector('.logout')?.addEventListener('click', (event) => {
                event.preventDefault();
                localStorage.clear();
                window.location.href = 'index.html';
            });
            // -----------------------------------------

        } else {
            document.getElementById('guest-header').classList.remove('hidden');
            document.getElementById('user-header').classList.add('hidden');
        }
    }
    
    // --- مستمع للنقر لإغلاق القائمة المنسدلة ---
    document.addEventListener('click', () => {
        const dropdownMenu = document.getElementById('dropdownMenu');
        if (dropdownMenu && !dropdownMenu.classList.contains('hidden')) {
            dropdownMenu.classList.add('hidden');
        }
    });
    // -----------------------------------------

    setupHeader();
    loadAuctionTypes();

    function loadAuctionTypes() {
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

    function fetchAuctions(searchQuery = '', auctionType = '', status = '') {
        const params = new URLSearchParams({ searchQuery, auctionType, status });
        const token = localStorage.getItem('authToken');

        fetch(`/not-ended-auctions?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(auctions => {
            const list = document.getElementById('auctions-list');
            list.innerHTML = '';

            if (!auctions || !auctions.length) {
                list.innerHTML = '<p style="text-align:center;">لا توجد مزادات لعرضها.</p>';
                return;
            }

            auctions.forEach(auction => {
                const card = document.createElement('div');
                card.className = 'auction-card';
                card.setAttribute('data-id', auction.auction_id);
                
                const endTime = new Date(auction.end_time);
                const statusText = auction.auction_status || 'غير معروف';
                const startTime = new Date(auction.start_time);

                let imagesHtml = '';
                if (auction.images && auction.images.length > 0) {
                    auction.images.forEach((img, i) => {
                        imagesHtml += `<div class="auction-slide ${i === 0 ? 'active' : ''}" data-auction="${auction.auction_id}"><img src="${img}" alt="صورة المزاد" onerror="this.onerror=null; this.src='${PLACEHOLDER_URL}';" /></div>`;
                    });
                } else {
                    imagesHtml = `<div class="auction-slide active"><img src="${PLACEHOLDER_URL}" alt="لا توجد صور"></div>`;
                }

                const buttonHtml = statusText === 'جاري الآن'
                    ? `<button class="bid-button" onclick="bidNow(${auction.auction_id})">مزايدة الآن</button>`
                    : `<button class="bid-button not-started" disabled>لم يبدأ بعد</button>`;

                const lastBid = auction.last_bid_price && auction.last_bid_price > 0
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
                    <p>تاريخ البدء: ${startTime.toLocaleString('fr-FR')}</p>

                    <p>آخر سعر: ${lastBid}</p>
                    <p>الحالة: ${statusText}</p>
                    ${buttonHtml}
                `;
                list.appendChild(card);
            });
        })
        .catch(error => {
            console.error('خطأ في جلب المزادات:', error);
            document.getElementById('auctions-list').innerHTML = '<p style="text-align:center; color:red;">حدث خطأ أثناء تحميل المزادات.</p>';
        });
    }

    window.changeSlide = function (n, auctionId) {
        const slides = document.querySelectorAll(`.auction-slide[data-auction="${auctionId}"]`);
        if (slides.length <= 1) return;
        let current = [...slides].findIndex(slide => slide.classList.contains('active'));
        slides[current].classList.remove('active');
        current = (current + n + slides.length) % slides.length;
        slides[current].classList.add('active');
    };

    window.searchAuctions = function () {
        const search = document.getElementById('searchQuery').value;
        const type = document.getElementById('auctionTypeFilter').value;
        const status = document.getElementById('statusFilter').value;
        fetchAuctions(search, type, status);
    };

    let selectedAuctionId = null;
    window.bidNow = function (id) {
        if (isLoggedIn) {
            selectedAuctionId = id;
            if(window.showTermsModal) window.showTermsModal();
        } else {
            if(window.showAlertModal) window.showAlertModal();
        }
    };

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

    document.querySelectorAll('.close-button').forEach(btn => {
        btn.addEventListener('click', function () {
            const modal = btn.closest('.modal');
            modal.classList.add('hidden');
            modal.style.display = 'none';
        });
    });

    fetchAuctions();
});
