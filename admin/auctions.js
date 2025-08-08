/**
 * =================================================================
 * الدوال المساعدة ودوال الواجهة الرئيسية
 * =================================================================
 */

// دالة مساعدة مركزية للتعامل مع جميع طلبات API بأمان
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/admin/login-admin.html';
        throw new Error('التوكن غير موجود.');
    }
    const config = { ...options, headers: { 'Authorization': `Bearer ${token}`, ...options.headers } };
    const response = await fetch(url, config);
    if (response.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '/admin/login-admin.html';
        throw new Error('الجلسة غير صالحة.');
    }
    return response;
}

// جلب معلومات المدير وعرضها
async function fetchAdminInfo() {
    try {
        const response = await fetchWithAuth('/get-user-info');
        const userInfo = await response.json();
        document.getElementById('username').textContent = userInfo.username;
        if (userInfo.profilePicture && userInfo.profilePicture.startsWith('http')) {
            document.getElementById('profilePic').src = userInfo.profilePicture;
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
 * دوال عرض ومعالجة المزادات
 * =================================================================
 */

// ✅ [التصحيح] تم إعادة كتابة هذه الدالة لاستخدام addEventListener بدلاً من onclick
function displayAuctions(auctions) {
    const container = document.getElementById('auctionsContainer');
    if (!container) return;
    container.innerHTML = '';
    const now = new Date();

    auctions.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

    auctions.forEach(auction => {
        const card = document.createElement('div');
        card.className = 'auction-card';
        card.dataset.id = auction.auction_id;

        const startTime = new Date(auction.start_time);
        const endTime = new Date(auction.end_time);
        let statusText, statusClass;

        if (now < startTime) {
            statusText = 'لم يبدأ';
            statusClass = 'status-not-started';
        } else if (now > endTime) {
            statusText = 'منتهي';
            statusClass = 'status-ended';
        } else {
            statusText = 'جار الآن';
            statusClass = 'status-ongoing';
        }
        
        const firstImage = (auction.images && auction.images.length > 0) ? auction.images[0] : '/images/default.png';
        const description = auction.description || 'لا يوجد وصف.';
        const formattedStartTime = startTime.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
        const formattedEndTime = endTime.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

        const editButtonHTML = (statusClass !== 'status-ended') ?
            `<button class="action-btn edit-btn"><i class="fas fa-edit"></i> تعديل</button>` : '';
        const deleteButtonHTML = (statusClass !== 'status-ongoing') ?
            `<button class="action-btn delete-btn"><i class="fas fa-trash"></i> حذف</button>` : '';

        card.innerHTML = `
            <div class="auction-image-container">
                <img src="${firstImage}" alt="${auction.title}" class="auction-image">
                <span class="auction-status ${statusClass}">${statusText}</span>
            </div>
            <div class="auction-content">
                <h3>${auction.title}</h3>
                <div class="auction-meta">
                    <span class="meta-item"><i class="fas fa-hashtag"></i> ${auction.auction_number}</span>
                    <span class="meta-item"><i class="fas fa-tag"></i> ${auction.type_name}</span>
                </div>
                <div class="extra-details">
                    <p class="auction-description">${description}</p>
                    <div class="details-grid">
                        <div class="detail-item">
                            <i class="fas fa-money-bill-wave"></i>
                            <div><strong>السعر الابتدائي:</strong><span>${auction.start_price} دج</span></div>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <div><strong>الموقع:</strong><span>${auction.wilaya}, ${auction.commune}</span></div>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-play-circle"></i>
                            <div><strong>وقت البدء:</strong><span>${formattedStartTime}</span></div>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-stop-circle"></i>
                            <div><strong>وقت الانتهاء:</strong><span>${formattedEndTime}</span></div>
                        </div>
                    </div>
                </div>
                <button class="toggle-details-btn">
                    <span>عرض المزيد من التفاصيل</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="auction-actions">
                    ${editButtonHTML}
                    ${deleteButtonHTML}
                </div>
            </div>
        `;
        container.appendChild(card);

        // إضافة مستمعي الأحداث بشكل برمجي
        card.querySelector('.auction-image')?.addEventListener('click', (event) => openModal(event, auction.auction_id));
        card.querySelector('.toggle-details-btn')?.addEventListener('click', (e) => toggleDetails(e.currentTarget));
        card.querySelector('.edit-btn')?.addEventListener('click', () => editAuction(auction.auction_id));
        card.querySelector('.delete-btn')?.addEventListener('click', () => deleteAuction(auction.auction_id));
    });
}

function filterAuctions() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase().trim();
    const typeFilter = document.getElementById('auctionTypeFilter').value.toLowerCase().trim();
    const statusFilter = document.getElementById('auctionStatusFilter').value;
    const cards = document.querySelectorAll('.auction-card');

    cards.forEach(card => {
        // Using .textContent.trim() to remove unwanted whitespace
        const title = card.querySelector('h3').textContent.toLowerCase().trim();
        const numberText = card.querySelector('.meta-item:first-child').textContent.toLowerCase().trim();
        const typeText = card.querySelector('.meta-item:last-child').textContent.toLowerCase().trim();
        const status = card.querySelector('.auction-status').textContent.trim();

        const matchesSearch = title.includes(searchInput) || numberText.includes(searchInput);
        const matchesType = typeFilter === 'all' || typeText.includes(typeFilter);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;

        if (matchesSearch && matchesType && matchesStatus) {
            card.style.display = 'flex'; // Use 'flex' to match the card's display property
        } else {
            card.style.display = 'none';
        }
    });
}
function toggleDetails(button) {
    const content = button.previousElementSibling; // The .extra-details div
    const icon = button.querySelector('i');
    const text = button.querySelector('span');

    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
        text.textContent = 'عرض المزيد من التفاصيل';
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
        text.textContent = 'إخفاء التفاصيل';
    }
}

/**
 * =================================================================
 * دوال التعديل والحذف والنوافذ المنبثقة (بدون تغيير)
 * =================================================================
 */
let currentEditingAuctionId = null;
let allAuctionTypes = [];

async function editAuction(auctionId) {
    currentEditingAuctionId = auctionId;
    try {
        const response = await fetchWithAuth(`/get-auction/${auctionId}`);
        const auction = await response.json();

        document.getElementById('editTitle').value = auction.title;
        document.getElementById('editDescription').value = auction.description;
        document.getElementById('editStartPrice').value = auction.start_price;
        document.getElementById('editWilaya').value = auction.wilaya;
        document.getElementById('editCommune').value = auction.commune;
        
        const formatForInput = (dateStr) => new Date(new Date(dateStr).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        document.getElementById('editStartTime').value = formatForInput(auction.start_time);
        document.getElementById('editEndTime').value = formatForInput(auction.end_time);

        const typeSelect = document.getElementById('editType');
        typeSelect.innerHTML = '';
        allAuctionTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.type_name;
            option.textContent = type.type_name;
            typeSelect.appendChild(option);
        });
        typeSelect.value = auction.type_name;

        const imagesContainer = document.getElementById('currentImages');
        imagesContainer.innerHTML = '';
        (auction.images || []).forEach(img => {
            imagesContainer.innerHTML += `<img src="${img}" alt="صورة حالية">`;
        });

        document.getElementById('editModal').style.display = 'flex';
    } catch (error) {
        Swal.fire('خطأ', 'فشل تحميل بيانات المزاد للتعديل.', 'error');
    }
}

async function saveAuctionChanges() {
    const form = document.getElementById('editAuctionForm');
    const formData = new FormData(form);
    
    try {
        const response = await fetchWithAuth(`/update-auction/${currentEditingAuctionId}`, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
            Swal.fire('نجاح!', 'تم تحديث المزاد بنجاح.', 'success');
            closeEditModal();
            fetchAndDisplayAuctions();
        } else {
            throw new Error(data.message || 'فشل تحديث المزاد.');
        }
    } catch (error) {
        Swal.fire('خطأ', error.message, 'error');
    }
}

async function deleteAuction(auctionId) {
    const result = await Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "لا يمكن التراجع عن حذف هذا المزاد!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'نعم، قم بالحذف!',
        cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetchWithAuth(`/delete-auction/${auctionId}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) {
                Swal.fire('تم الحذف!', 'تم حذف المزاد بنجاح.', 'success');
                fetchAndDisplayAuctions();
            } else {
                throw new Error(data.message || 'فشل حذف المزاد.');
            }
        } catch (error) {
            Swal.fire('خطأ', error.message, 'error');
        }
    }
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

let currentAuctionImages = [];
let currentImageIndex = 0;

async function openModal(event, auctionId) {
    event.stopPropagation();
    try {
        const response = await fetchWithAuth(`/get-auction/${auctionId}`);
        const auction = await response.json();
        currentAuctionImages = auction.images || [];
        if (currentAuctionImages.length === 0) return;

        currentImageIndex = 0;
        document.getElementById('expandedImg').src = currentAuctionImages[currentImageIndex];
        document.getElementById('imageModal').style.display = 'flex';
    } catch (error) {
        console.error('Error fetching images for modal:', error);
    }
}

function closeModal() {
    document.getElementById('imageModal').style.display = 'none';
}

function showPrevModalImage(event) {
    event.stopPropagation();
    if (currentAuctionImages.length === 0) return;
    currentImageIndex = (currentImageIndex - 1 + currentAuctionImages.length) % currentAuctionImages.length;
    document.getElementById('expandedImg').src = currentAuctionImages[currentImageIndex];
}

function showNextModalImage(event) {
    event.stopPropagation();
    if (currentAuctionImages.length === 0) return;
    currentImageIndex = (currentImageIndex + 1) % currentAuctionImages.length;
    document.getElementById('expandedImg').src = currentAuctionImages[currentImageIndex];
}


/**
 * =================================================================
 * المشغل الرئيسي عند تحميل الصفحة (بدون تغيير)
 * =================================================================
 */

async function fetchAndDisplayAuctions() {
    try {
        const response = await fetchWithAuth('/get-auctions');
        const auctions = await response.json();
        displayAuctions(auctions);
    } catch (error) {
        console.error('Error fetching auctions:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    fetchAdminInfo();
    
    try {
        const response = await fetchWithAuth('/api/auction-types');
        allAuctionTypes = await response.json();
        const typeFilter = document.getElementById('auctionTypeFilter');
        allAuctionTypes.forEach(type => {
            typeFilter.innerHTML += `<option value="${type.type_name.toLowerCase()}">${type.type_name}</option>`;
        });
    } catch (error) {
        console.error('Error fetching auction types:', error);
    }

    fetchAndDisplayAuctions();

    document.getElementById('closeEditModal').onclick = closeEditModal;
    document.getElementById('cancelButton').onclick = closeEditModal;
    document.getElementById('saveButton').onclick = saveAuctionChanges;
});
