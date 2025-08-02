document.addEventListener('DOMContentLoaded', function () {
    let isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const firstName = localStorage.getItem('firstName') || 'اسم';
    const lastName = localStorage.getItem('lastName') || 'اللقب';
    const profilePicture = localStorage.getItem('profilePicture');

    function updateHeader() {
        if (isLoggedIn) {
            document.getElementById('user-header').classList.remove('hidden');
            document.getElementById('guest-header').classList.add('hidden');
            document.getElementById('user-name').textContent = `${firstName} ${lastName}`;
            
            // ✅ التصحيح الوحيد هنا: إزالة المسار الخاطئ لعرض صورة المستخدم
            document.getElementById('user-profile-picture').src = profilePicture && profilePicture !== 'null' ? profilePicture : 'placeholder.png';
        } else {
            document.getElementById('guest-header').classList.remove('hidden');
            document.getElementById('user-header').classList.add('hidden');
        }
    }

    updateHeader();

    const userProfilePicture = document.getElementById('user-profile-picture');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (userProfilePicture) {
        userProfilePicture.addEventListener('click', function (event) {
            event.stopPropagation();
            dropdownMenu.classList.toggle('hidden');
        });
    }

    const notificationsIcon = document.getElementById('notifications-icon');
    const notificationsMenu = document.getElementById('notificationsMenu');
    
    if (notificationsIcon) {
        notificationsIcon.addEventListener('click', function (event) {
            event.stopPropagation();
            notificationsMenu.classList.toggle('hidden');
        });
    }

    document.addEventListener('click', function (event) {
        if (userProfilePicture && dropdownMenu && !userProfilePicture.contains(event.target) && !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.add('hidden');
        }
        if (notificationsIcon && notificationsMenu && !notificationsIcon.contains(event.target) && !notificationsMenu.contains(event.target)) {
            notificationsMenu.classList.add('hidden');
        }
    });

    const logoutButton = document.querySelector('.logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function (event) {
            event.preventDefault();
            localStorage.setItem('isLoggedIn', 'false');
            localStorage.removeItem('authToken');
            updateHeader();
            window.location.href = 'index.html';
        });
    }

    function loadAuctionTypes() {
        fetch('/api/auction-types')
            .then(response => response.json())
            .then(types => {
                const auctionTypeFilter = document.getElementById('auctionTypeFilter');
                types.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.auction_type_id;
                    option.textContent = type.type_name;
                    auctionTypeFilter.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error fetching auction types:', error);
            });
    }

    loadAuctionTypes();

    let slideIndex = 0;
    const slides = document.getElementsByClassName('ad-slide');
    if (slides.length > 0) {
        function showSlides() {
            for (let i = 0; i < slides.length; i++) {
                slides[i].style.display = 'none';
            }
            slideIndex++;
            if (slideIndex > slides.length) { slideIndex = 1 }
            slides[slideIndex - 1].style.display = 'block';
            setTimeout(showSlides, 10000);
        }
        showSlides();
    }
    
    window.plusSlides = function (n) {
        slideIndex += n;
        if (slideIndex >= slides.length) {
            slideIndex = 0;
        } else if (slideIndex < 0) {
            slideIndex = slides.length - 1;
        }
        for (let i = 0; i < slides.length; i++) {
            slides[i].style.display = 'none';
        }
        slides[slideIndex].style.display = 'block';
    }

   function fetchAuctions(searchQuery = '', auctionType = '') {
        const params = new URLSearchParams({ searchQuery, auctionType });
        const token = localStorage.getItem('authToken');

        fetch(`/active-auctions?${params.toString()}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(auctions => {
            const auctionsList = document.getElementById('auctions-list');
            auctionsList.innerHTML = '';
            auctions.forEach(auction => {
                const auctionCard = document.createElement('div');
                auctionCard.className = 'auction-card';
                auctionCard.setAttribute('data-id', auction.auction_id);

                let lastBidPrice = auction.last_bid_price && auction.last_bid_price > auction.start_price
                    ? `${auction.last_bid_price} دج`
                    : 'لم يتم المزايدة حتى الآن';

                let imagesHtml = '';
                if (auction.images && Array.isArray(auction.images) && auction.images.length > 0) {
                    auction.images.forEach((image, index) => {
imagesHtml += `<div class="auction-slide" style="display: ${index === 0 ? 'block' : 'none'};"><img src="${image}" alt="صورة المزاد" onclick="openImageModal('${image}')" style="cursor:pointer;"></div>`;                    });
                } else {
                    imagesHtml = `<div class="auction-slide" style="display: block;"><img src="placeholder.png" alt="لا توجد صور"></div>`;
                }
         const startTime = new Date(auction.start_time + 'Z').toLocaleString('fr-FR');
            const endTime = new Date(auction.end_time + 'Z').toLocaleString('fr-FR');

                auctionCard.innerHTML = `
                    <h3>${auction.title}</h3>
                    <div class="auction-images">
                        ${imagesHtml}
                        <a class="prev-slide" onclick="changeSlide(-1, ${auction.auction_id})">&#10094;</a>
                        <a class="next-slide" onclick="changeSlide(1, ${auction.auction_id})">&#10095;</a>
                    </div>
                    <p>رقم المزاد: ${auction.auction_number}</p>
                    <p>نوع المزاد: ${auction.type_name}</p>
                    <p>الولاية: ${auction.wilaya}</p>
                    <p>البلدية: ${auction.commune}</p>
                    <p>تاريخ البدء: ${new Date(auction.start_time).toLocaleString()}</p>
                    <p>تاريخ الانتهاء: ${new Date(auction.end_time).toLocaleString()}</p>
                    <p>السعر الابتدائي: ${auction.start_price} دج</p>
                    <p>آخر سعر تم المزايدة به: ${lastBidPrice}</p>
                    <p>الحالة: جاري الآن</p>
                    <button class="bid-button" onclick="bidNow(${auction.auction_id})">مزايدة الآن</button>
                `;

                auctionsList.appendChild(auctionCard);
            });
        })
        .catch(error => {
            console.error('Error fetching auctions:', error);
        });
    }

    let selectedAuctionId = null;

    window.bidNow = function (auctionId) {
        if (localStorage.getItem('isLoggedIn') === 'true') {
            selectedAuctionId = auctionId;
            window.showTermsModal();
        } else {
            window.showAlertModal();
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
            btn.parentElement.parentElement.style.display = 'none';
            btn.parentElement.parentElement.classList.add('hidden');
        });
    });

    window.searchAuctions = function () {
        const searchQuery = document.getElementById('searchQuery').value;
        const auctionType = document.getElementById('auctionTypeFilter').value;
        fetchAuctions(searchQuery, auctionType);
    };

    fetchAuctions();
});


/**
 * ✅ دالة مفقودة تم إضافتها لجعل أزرار التنقل بين الصور تعمل
 */
function changeSlide(n, auctionId) {
    const auctionCard = document.querySelector(`.auction-card[data-id='${auctionId}']`);
    if (!auctionCard) return;

    const slides = auctionCard.querySelectorAll('.auction-slide');
    if (slides.length <= 1) return;

    let currentIndex = Array.from(slides).findIndex(slide => slide.style.display === 'block');

    slides[currentIndex].style.display = 'none';
    let nextIndex = (currentIndex + n + slides.length) % slides.length;
    slides[nextIndex].style.display = 'block';
}
/**
 * دالة جديدة لفتح نافذة تكبير الصورة
 * @param {string} src - رابط الصورة المراد تكبيرها
 */
function openImageModal(src) {
    const modal = document.getElementById('enlargedImageModal');
    const modalImg = document.getElementById('enlargedImg');
    if (modal && modalImg) {
        modal.style.display = "flex"; // استخدام flex للتوسيط
        modal.classList.remove('hidden');
        modalImg.src = src;
    }
}

/**
 * دالة جديدة لإغلاق نافذة تكبير الصورة
 */
function closeImageModal() {
    const modal = document.getElementById('enlargedImageModal');
    if (modal) {
        modal.style.display = "none";
        modal.classList.add('hidden');
    }
}
