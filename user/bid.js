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
        document.getElementById('auction-title').textContent = data.title || 'غير متوفر';
        document.getElementById('last-bid-price').textContent = data.last_bid_price ? `${data.last_bid_price} دج` : 'لا توجد مزايدات';
        document.getElementById('end-time').textContent = new Date(data.end_time).toLocaleString('fr-FR');
        document.getElementById('auction-id').textContent = data.auction_id;
        document.getElementById('auction-number').textContent = data.auction_number;
        document.getElementById('auction-type').textContent = data.type_name;
        document.getElementById('start-price').textContent = data.start_price;
        document.getElementById('start-time').textContent = new Date(data.start_time).toLocaleString('fr-FR');
        document.getElementById('wilaya').textContent = data.wilaya;
        document.getElementById('commune').textContent = data.commune;
        document.getElementById('auction-description').textContent = data.description;
    }

   // ✅ ضع هذه الدالة المصححة في ملف bid.js
// ✅ ضع هذه الدالة المصححة في ملف bid.js
// ✅ ضع هذه الدالة المصححة في ملف bid.js
function renderAuctionImages(images) {
    const container = document.getElementById('auction-images');
    if (!container) return;

    container.innerHTML = ''; // إفراغ الحاوية

    // الرابط الكامل لصورتك الاحتياطية من Cloudinary
    const placeholderUrl = 'https://res.cloudinary.com/your_cloud_name/image/upload/v12345/placeholder.png'; // ⚠️ استبدل هذا بالرابط الصحيح

    if (Array.isArray(images) && images.length > 0) {
        images.forEach(imageUrl => {
            const img = document.createElement('img');
            
            // التصحيح: نستخدم رابط الصورة الكامل مباشرةً
            img.src = imageUrl; 
            
            img.alt = 'صورة المزاد';
            img.className = 'image-slide';
            
            img.onerror = function() {
                this.onerror = null; 
                this.src = placeholderUrl; 
            };
            
            img.addEventListener('click', () => openModal(imageUrl));
            container.appendChild(img);
        });
        showSlide(0);
    } else {
        // في حالة عدم وجود صور من الخادم
        container.innerHTML = `<img class="image-slide" src="${placeholderUrl}" alt="لا توجد صور">`;
    }
}
    
    // ✅ ============== دالة جدول المزايدين المعدّلة ==============
 function updateBidsList(bids) {
    // لاحظ أننا نستهدف الحاوية الجديدة
    const container = document.getElementById('bids-table-container'); 
    if (!container) return;

    // نبدأ ببناء هيكل الجدول
    let tableHtml = `
        <table class="bids-table">
            <thead>
                <tr>
                    <th>المستخدم</th>
                    <th>المبلغ</th>
                    <th>الوقت</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (Array.isArray(bids) && bids.length > 0) {
        // بناء صفوف المزايدات
        bids.forEach((bid, index) => {
            // إضافة كلاس خاص للصف الأول (أعلى مزايدة)
            const rowClass = index === 0 ? 'top-bid' : '';
            tableHtml += `
                <tr class="${rowClass}">
                    <td>${bid.user_name || bid.username}</td>
                    <td>${bid.bid_amount} دج</td>
                    <td>${new Date(bid.bid_time).toLocaleString('fr-FR')}</td>
                </tr>
            `;
        });
    } else {
        // رسالة في حالة عدم وجود مزايدات
        tableHtml += '<tr><td colspan="3" class="no-bids-message">كن أول من يزايد!</td></tr>';
    }

    tableHtml += '</tbody></table>';

    // تحديث المحتوى مرة واحدة
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

    // جلب عناصر الواجهة
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const timerContainer = document.getElementById('countdown-timer');

    // التأكد من وجود جميع العناصر الضرورية
    if (!daysEl || !hoursEl || !minutesEl || !secondsEl || !timerContainer) {
        console.error("أحد عناصر عداد الوقت مفقود في HTML.");
        return;
    }

    let prevValues = {}; // لتتبع الأرقام السابقة

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = endDate.getTime() - now;

        // عند انتهاء الوقت
        if (distance < 0) {
            clearInterval(countdownInterval);
            timerContainer.innerHTML = "<div class='timer-box ended'>انتهى المزاد</div>";
            document.getElementById('bid-section').style.display = 'none';
            return;
        }

        // حساب الوقت
        const values = {
            days: Math.floor(distance / (1000 * 60 * 60 * 24)),
            hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((distance % (1000 * 60)) / 1000)
        };

        // تحديث الأرقام وتطبيق حركة "الورقة" فقط عند التغيير
        if (values.days !== prevValues.days) animateFlip(daysEl, values.days);
        if (values.hours !== prevValues.hours) animateFlip(hoursEl, values.hours);
        if (values.minutes !== prevValues.minutes) animateFlip(minutesEl, values.minutes);
        if (values.seconds !== prevValues.seconds) animateFlip(secondsEl, values.seconds);
        
        prevValues = values; // حفظ القيم الحالية للمقارنة في الثانية التالية

        // تغيير اللون في آخر 5 دقائق
        if (distance <= 300000) { // 300000ms = 5 minutes
            timerContainer.classList.add('countdown-ending');
        } else {
            timerContainer.classList.remove('countdown-ending');
        }
    }

    // دالة مساعدة لتطبيق الحركة
    function animateFlip(element, value) {
        const numberEl = element.querySelector('.number');
        numberEl.classList.add('flip');
        setTimeout(() => {
            numberEl.textContent = value;
            numberEl.classList.remove('flip');
        }, 500); // مدة الحركة يجب أن تتوافق مع CSS
    }

    updateCountdown(); // التشغيل الفوري
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