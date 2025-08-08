document.addEventListener('DOMContentLoaded', function () {
    // =================================================================
    // 1. المتغيرات العامة والإعدادات الأولية
    // =================================================================
    let countdownInterval;
    let currentSlideIndex = 0;

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const urlParams = new URLSearchParams(window.location.search);
    const auctionId = urlParams.get('auctionId');

    // =================================================================
    // 2. دوال تحديث واجهة المستخدم (Rendering Functions)
    // =================================================================

     function renderAuctionDetails(data) {
        document.title = data.title || "صفحة المزايدة"; // تحديث عنوان الصفحة
        document.getElementById('auction-title').textContent = data.title;
        document.getElementById('end-time').textContent = new Date(data.end_time).toLocaleString('fr-FR');               
        document.getElementById('last-bid-price').textContent = `${data.last_bid_price || data.start_price} د.ج`;
        document.getElementById('auction-number').textContent = data.auction_number;
        document.getElementById('auction-type').textContent = data.type_name;
        document.getElementById('wilaya').textContent = data.wilaya;
        document.getElementById('commune').textContent = data.commune;
        document.getElementById('start-price').textContent = `${data.start_price} د.ج`;
        document.getElementById('start-time').textContent = new Date(data.start_time).toLocaleString('fr-FR');
        document.getElementById('auction-description').textContent = data.description;

        renderAuctionImages(data.images || []);
        setupCountdownTimer(data.end_time);
    }

   // ✅ ضع هذه الدالة المصححة في ملف bid.js
// ✅ ضع هذه الدالة المصححة في ملف bid.js
// ✅ ضع هذه الدالة المصححة في ملف bid.js
   function renderAuctionImages(images) {
        const mainImage = document.getElementById('main-auction-image');
        const thumbnailsContainer = document.getElementById('thumbnail-container');
        thumbnailsContainer.innerHTML = '';

        const imageSources = (Array.isArray(images) && images.length > 0) ? images : [PLACEHOLDER_URL];

        mainImage.src = imageSources[0];
        mainImage.onerror = () => { mainImage.src = PLACEHOLDER_URL; };

        if (imageSources.length > 1) {
            imageSources.forEach((src, index) => {
                const thumb = document.createElement('img');
                thumb.src = src;
                thumb.alt = `صورة مصغرة ${index + 1}`;
                if (index === 0) thumb.classList.add('active');
                
                thumb.addEventListener('click', () => {
                    mainImage.src = src;
                    document.querySelectorAll('.thumbnail-wrapper img').forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                });
                thumbnailsContainer.appendChild(thumb);
            });
        }
    }
    // ✅ ============== دالة جدول المزايدين المعدّلة ==============
 
    function updateBidsList(bids) {
        const container = document.getElementById('bids-table-container');
        let tableHtml = `<table class="bids-table"><thead><tr><th>المستخدم</th><th>المبلغ</th><th>الوقت</th></tr></thead><tbody>`;

        if (Array.isArray(bids) && bids.length > 0) {
            bids.forEach((bid, index) => {
                const rowClass = index === 0 ? 'top-bid' : '';
                tableHtml += `<tr class="${rowClass}">
                                <td>${bid.username}</td>
                                <td>${bid.bid_amount} د.ج</td>
                                <td>${new Date(bid.bid_time).toLocaleString('fr-FR')}</td>
                              </tr>`;
            });
        } else {
            tableHtml += '<tr><td colspan="3" style="text-align:center;">كن أول من يزايد!</td></tr>';
        }
        tableHtml += '</tbody></table>';
        container.innerHTML = tableHtml;
    }
    // =============================================================

    // =================================================================
    // 3. دوال جلب البيانات من الخادم
    // =================================================================

    function fetchInitialData() {
        const token = localStorage.getItem('authToken');
        fetch(`/auction-details?auctionId=${auctionId}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(response => response.ok ? response.json() : Promise.reject('فشل تحميل تفاصيل المزاد'))
        .then(data => {
            renderAuctionDetails(data);
            renderAuctionImages(data.images || []);
            setupCountdownTimer(data.end_time);
            fetchInitialBids();
        })
        .catch(error => showAlertMessage('حدث خطأ أثناء تحميل بيانات المزاد.', 'error'));
    }
    
    function fetchInitialBids() {
        fetch(`/recent-bids?auctionId=${auctionId}`)
        .then(res => res.ok ? res.json() : Promise.reject('فشل تحميل المزايدات'))
        .then(data => { if (data.success) updateBidsList(data.bids || []); });
    }

    // =================================================================
    // 4. إعداد التفاعلات والتحديثات المباشرة
    // =================================================================

    function setupEventHandlers() {
        document.getElementById('place-bid-button').addEventListener('click', handlePlaceBid);
    }

    function handlePlaceBid() {
        const input = document.getElementById('bid-amount');
        const amount = parseFloat(input.value);
        if (isNaN(amount) || amount <= 0) {
            showAlertMessage('الرجاء إدخال مبلغ صحيح.', 'error');
            return;
        }
        const token = localStorage.getItem('authToken');
        fetch('/place-bid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ auctionId, bidAmount: amount })
        })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (ok) {
                showAlertMessage('تمت المزايدة بنجاح!', 'success');
                input.value = '';
            } else { throw new Error(data.message || 'فشلت المزايدة.'); }
        })
        .catch(error => showAlertMessage(error.message, 'error'));
    }

    // في ملف bid.js

function setupSSE() {
    const sse = new EventSource('/events');

    sse.onmessage = function(event) {
        const data = JSON.parse(event.data);
        // استخدام auctionId المعرّف في بداية الملف للمقارنة
        if (data.auctionId && data.auctionId.toString() === auctionId) {
            
            // ✅✅✅ هذا هو السطر الذي تم إضافته ✅✅✅
            // تحديث آخر سعر للمزايدة
            if (data.lastBidAmount) {
                document.getElementById('last-bid-price').textContent = `${data.lastBidAmount} دج`;
            }

            // تحديث وقت الانتهاء (يبقى كما هو)
            if (data.endTime) {
                const newEndTime = new Date(data.endTime);
                document.getElementById('end-time').textContent = newEndTime.toLocaleString('fr-FR');
                setupCountdownTimer(newEndTime.toISOString());
            }

            // تحديث جدول المزايدين (يبقى كما هو)
            if (data.bids) {
                updateBidsList(data.bids);
            }
        }
    };

    sse.onerror = () => {
        console.error('SSE connection failed.');
        sse.close();
    };
}

    // =================================================================
    // 5. الدوال المساعدة (المؤقت، التنبيهات، الصور)
    // =================================================================
    /**
 * دالة لإعداد وتشغيل عداد الوقت مع تأثير الحركة وتغيير اللون.
 * @param {string} endTime - وقت انتهاء المزاد (ISO format).
 */
function setupCountdownTimer(endTime) {
    clearInterval(countdownInterval);
    const endDate = new Date(endTime);
    const timerContainer = document.getElementById('countdown-timer');
    
    // التأكد من أن الحاوية فارغة قبل إضافة العناصر
    timerContainer.innerHTML = `
        <div class="timer-box" id="days"><span class="number">0</span><div class="label">أيام</div></div>
        <div class="timer-box" id="hours"><span class="number">0</span><div class="label">ساعات</div></div>
        <div class="timer-box" id="minutes"><span class="number">0</span><div class="label">دقائق</div></div>
        <div class="timer-box" id="seconds"><span class="number">0</span><div class="label">ثواني</div></div>
    `;

    function updateCountdown() {
        const distance = endDate.getTime() - Date.now();
        
        // ✅✅✅ --- الكود المضاف --- ✅✅✅
        // التحقق إذا كان الوقت المتبقي أقل من 3 دقائق
        // 3 دقائق = 180,000 مللي ثانية
        if (distance < 180000) { 
            timerContainer.classList.add('countdown-ending'); // إضافة كلاس لتغيير اللون
        } else {
            timerContainer.classList.remove('countdown-ending'); // إزالة الكلاس إذا تم تمديد الوقت
        }
        // --- نهاية الكود المضاف ---

        if (distance < 0) {
            clearInterval(countdownInterval);
            timerContainer.innerHTML = "<div class='timer-box ended'>انتهى المزاد</div>";
            document.getElementById('bid-section').style.display = 'none';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        document.querySelector('#days .number').textContent = days;
        document.querySelector('#hours .number').textContent = hours;
        document.querySelector('#minutes .number').textContent = minutes;
        document.querySelector('#seconds .number').textContent = seconds;
    }
    
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
}

    function showAlertMessage(message, type = 'error') {
        const alertBox = document.createElement('div');
        alertBox.className = `alert-message ${type}`;
        alertBox.textContent = message;
        document.body.appendChild(alertBox);
        setTimeout(() => document.body.removeChild(alertBox), 4000);
    }

    function showSlide(index) {
        const slides = document.querySelectorAll('#auction-images .image-slide');
        if (slides.length === 0) return;
        slides.forEach(slide => slide.style.display = 'none');
        currentSlideIndex = (index + slides.length) % slides.length;
        slides[currentSlideIndex].style.display = 'block';
    }

    function openModal(imageUrl) {
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImage');
        if (modal && modalImg) {
            modal.style.display = 'flex';
            modalImg.src = imageUrl;
        }
    }
    
    function setupModalCloseButtons() {
        const imageModal = document.getElementById('imageModal');
        if(imageModal) {
            const closeBtn = imageModal.querySelector('.close-button');
            if (closeBtn) closeBtn.onclick = () => imageModal.style.display = 'none';
            imageModal.onclick = (e) => {
                if (e.target === imageModal) imageModal.style.display = 'none';
            };
        }
    }

    function setupUserHeader() {
        const userHeader = document.getElementById('user-header');
        if (!userHeader) return;
        const profilePicture = localStorage.getItem('profilePicture');
        const firstName = localStorage.getItem('firstName') || '';
        const lastName = localStorage.getItem('lastName') || '';
        userHeader.classList.remove('hidden');
        document.getElementById('user-name').textContent = `${firstName} ${lastName}`;
        document.getElementById('user-profile-picture').src = profilePicture && profilePicture !== 'null' ? profilePicture : '/images/placeholder.png';
        const dropdownMenu = document.getElementById('dropdownMenu');
        document.getElementById('user-profile-picture').addEventListener('click', (event) => {
            event.stopPropagation();
            dropdownMenu.classList.toggle('hidden');
        });
        document.querySelector('.logout').addEventListener('click', (event) => {
            event.preventDefault();
            localStorage.clear();
            window.location.href = 'index.html';
        });
        document.addEventListener('click', () => {
            if (dropdownMenu && !dropdownMenu.classList.contains('hidden')) {
                dropdownMenu.classList.add('hidden');
            }
        });
    }

    // =================================================================
    // 6. نقطة انطلاق عمل السكريبت
    // =================================================================
    
    if (!isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }

    if (!auctionId) {
        document.body.innerHTML = '<div class="error-page"><h1>خطأ: المزاد غير محدد.</h1><p>يرجى العودة للصفحة الرئيسية واختيار مزاد.</p></div>';
        return;
    }
    
    setupUserHeader();
    fetchInitialData();
    setupSSE();
    setupEventHandlers();
    setupModalCloseButtons();
});

// هذه الدالة يجب أن تكون عامة لتصل إليها أزرار HTML
window.changeSlide = function(n) {
    let slides = document.querySelectorAll('#auction-images .image-slide');
    if (!slides || slides.length < 2) return;
    let currentSlideIndex = Array.from(slides).findIndex(slide => slide.style.display === 'block');
    slides[currentSlideIndex].style.display = 'none';
    let nextIndex = (currentSlideIndex + n + slides.length) % slides.length;
    slides[nextIndex].style.display = 'block';
}