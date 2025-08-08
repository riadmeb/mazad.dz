document.addEventListener('DOMContentLoaded', function () {
    let isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const firstName = localStorage.getItem('firstName') || 'اسم';
    const lastName = localStorage.getItem('lastName') || 'اللقب';
    const profilePicture = localStorage.getItem('profilePicture');
      const agreeCheckbox = document.getElementById('agreeTermsCheckbox');
    const confirmButton = document.getElementById('confirmBidButton');

    if (agreeCheckbox && confirmButton) {
        // تعيين الحالة الأولية للزر عند تحميل الصفحة
        confirmButton.disabled = !agreeCheckbox.checked;

        // إضافة مستمع لحدث التغيير في مربع الاختيار
        agreeCheckbox.addEventListener('change', function() {
            // تفعيل الزر إذا تم تحديد المربع، وتعطيله إذا لم يتم
            confirmButton.disabled = !this.checked;
        });
    }


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

function formatTimeRemaining(endTime) {
    const totalMilliseconds = Date.parse(endTime) - Date.now();

    if (totalMilliseconds <= 0) {
        return "انتهى المزاد";
    }

    const days = Math.floor(totalMilliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((totalMilliseconds / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((totalMilliseconds / 1000 / 60) % 60);
    const seconds = Math.floor((totalMilliseconds / 1000) % 60);

    if (days > 0) return `باقي: ${days} يوم و ${hours} ساعة`;
    if (hours > 0) return `باقي: ${hours} ساعة و ${minutes} دقيقة`;
    return `باقي: ${minutes} دقيقة و ${seconds} ثانية`;
}

function fetchAuctions(searchQuery = '', auctionType = '') {
    const params = new URLSearchParams({ searchQuery, auctionType });
    const token = localStorage.getItem('authToken');
    const PLACEHOLDER_URL = 'https://placehold.co/600x400/2D3748/E2E8F0?text=MAZAD';

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

            const images = (auction.images && Array.isArray(auction.images) && auction.images.length > 0)
                ? auction.images
                : [PLACEHOLDER_URL];

            const timeRemaining = formatTimeRemaining(auction.end_time);
            const currentPrice = auction.last_bid_price || auction.start_price;
            const formattedPrice = new Intl.NumberFormat('ar-DZ').format(currentPrice);

            // ✅ بناء HTML جديد لمعرض الصور
            const imageGalleryHTML = `
                <div class="auction-card-gallery">
                    <div class="auction-card-main-image">
                        <img src="${images[0]}" alt="صورة المزاد الرئيسية" onerror="this.src='${PLACEHOLDER_URL}'">
                    </div>
                    ${images.length > 1 ? `
                    <div class="auction-card-thumbnails">
                        ${images.map((img, index) => `
                            <img src="${img}" alt="صورة مصغرة ${index + 1}" data-index="${index}" class="${index === 0 ? 'active' : ''}">
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
            `;

            auctionCard.innerHTML = `
                <div class="auction-card-top">
                    ${imageGalleryHTML}
                    <div class="countdown-timer">${timeRemaining}</div>
                </div>
                <div class="auction-card-bottom">
                    <div class="auction-card-header">
                        <div class="auction-card-tags">
                            <span class="auction-card-tag primary">${auction.type_name}</span>
                            <span class="auction-card-tag secondary">${auction.title}</span>
                        </div>
                        <div class="auction-card-number">
                            <i class="fas fa-gavel"></i>
                            <span>${auction.auction_number}</span>
                        </div>
                    </div>
                    <div class="auction-card-price-spotlight">
                        <p class="auction-card-price-label">السعر الحالي</p>
                        <div class="auction-card-price-value">
                            <p class="auction-card-price">${formattedPrice}</p>
                            <span class="auction-card-currency">د.ج</span>
                        </div>
                    </div>
                    <div class="auction-card-details">
                        <span><i class="fas fa-map-marker-alt"></i> ${auction.wilaya}</span>
                    </div>
                    <button class="bid-button" onclick="bidNow(${auction.auction_id})">زايد الآن</button>
                </div>
            `;

            auctionsList.appendChild(auctionCard);

            // ✅ تشغيل السكريبت الخاص بالمعرض لهذه البطاقة تحديدًا
            const galleryElement = auctionCard.querySelector('.auction-card-gallery');
            if (galleryElement) {
                setupImageGallery(galleryElement, images);
            }
        });
    })
    .catch(error => {
        console.error('Error fetching auctions:', error);
        const auctionsList = document.getElementById('auctions-list');
        auctionsList.innerHTML = '<p style="color: var(--text-secondary);">حدث خطأ في تحميل المزادات.</p>';
    });
}

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

  function confirmBid() {
    // استخدام المعرف الصحيح لمربع الاختيار
    const agreeCheckbox = document.getElementById('agreeTermsCheckbox');
    
    // إضافة تحقق للتأكد من أن العنصر موجود قبل قراءة حالته
    if (agreeCheckbox && agreeCheckbox.checked && selectedAuctionId) {
        window.location.href = `bid.html?auctionId=${selectedAuctionId}`;
    } else {
        closeModal('termsModal');
        showModal('termsAlertModal');
    }
}


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
// =================================================================
// 1. الدوال العامة (Global Functions)
// =================================================================

// --- دوال التحكم في النوافذ المنبثقة (Modals) ---
let selectedAuctionId = null;

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function bidNow(auctionId) {
    if (localStorage.getItem('isLoggedIn') === 'true') {
        selectedAuctionId = auctionId;
        showModal('termsModal');
    } else {
        showModal('alertModal');
    }
}

// ✅✅✅ تم تحديث هذه الدالة بالكامل ✅✅✅
function confirmBid() {
    // استخدام المعرف الصحيح لمربع الاختيار
    const agreeCheckbox = document.getElementById('agreeTermsCheckbox');
    
    // إضافة تحقق للتأكد من أن العنصر موجود قبل قراءة حالته
    if (agreeCheckbox && agreeCheckbox.checked && selectedAuctionId) {
        window.location.href = `bid.html?auctionId=${selectedAuctionId}`;
    } else {
        closeModal('termsModal');
        showModal('termsAlertModal');
    }
}
// --- دوال التحكم في معرض الصور ---
let currentModalImages = [];
let currentModalIndex = 0;

function setupImageGallery(galleryElement, images) {
    const mainImage = galleryElement.querySelector('.auction-card-main-image img');
    const thumbnailsContainer = galleryElement.querySelector('.auction-card-thumbnails');
    
    if (!mainImage) return;

    mainImage.addEventListener('click', function() {
        const index = parseInt(this.dataset.index || '0');
        openImageModal(images, index);
    });

    if (thumbnailsContainer) {
        const thumbnails = thumbnailsContainer.querySelectorAll('img');
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', function(event) {
                event.stopPropagation();
                const index = parseInt(this.dataset.index);
                if (images[index]) {
                    mainImage.src = images[index];
                    mainImage.dataset.index = index;
                    thumbnails.forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                }
            });
        });
    }
}

function openImageModal(images, index) {
    currentModalImages = images;
    currentModalIndex = index;
    
    const modal = document.getElementById('enlargedImageModal');
    const modalImg = document.getElementById('enlargedImg');
    const prevBtn = modal.querySelector('.image-modal-prev');
    const nextBtn = modal.querySelector('.image-modal-next');

    if (modal && modalImg) {
        modalImg.src = currentModalImages[currentModalIndex];
        
        if (currentModalImages.length > 1) {
            prevBtn.style.display = 'block';
            nextBtn.style.display = 'block';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        }
        showModal('enlargedImageModal');
    }
}

function changeModalImage(direction) {
    currentModalIndex += direction;
    const totalImages = currentModalImages.length;

    if (currentModalIndex >= totalImages) currentModalIndex = 0;
    else if (currentModalIndex < 0) currentModalIndex = totalImages - 1;

    document.getElementById('enlargedImg').src = currentModalImages[currentModalIndex];
}

// =================================================================
// 2. دوال إعداد الصفحة (Setup Functions)
// =================================================================

function setupGlobalEventListeners() {
    // مستمع عام لإغلاق جميع النوافذ المنبثقة
    document.addEventListener('click', function(event) {
        if (event.target.matches('.close-button') || event.target.matches('.image-modal-close')) {
            const modal = event.target.closest('.modal, .image-modal');
            if (modal) closeModal(modal.id);
        }
    });

    // ... (بقية المستمعين مثل القائمة المنسدلة وتسجيل الخروج)
}



