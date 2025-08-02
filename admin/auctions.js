// =================================================================
// المتغيرات العامة
// =================================================================
let currentEditingAuctionId = null;
let currentAuctionImages = [];
let currentImageIndex = 0;


// =================================================================
// المشغل الرئيسي عند تحميل الصفحة
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    // إخفاء نوافذ التعديل والصور عند التحميل
    const editModal = document.getElementById('editModal');
    if(editModal) {
        editModal.style.display = 'none';
        // ربط أزرار نموذج التعديل بوظائفها
        document.getElementById('saveButton').onclick = saveAuctionChanges;
        document.getElementById('cancelButton').onclick = closeEditModal;
        document.getElementById('closeEditModal').onclick = closeEditModal;
    }

    const imageModal = document.getElementById('imageModal');
    if(imageModal) {
        imageModal.style.display = 'none';
    }

    // --- جلب البيانات الأولية من الخادم ---

    // 1. جلب أنواع المزادات
    // ✅ تم تصحيح الرابط هنا
    fetch('/api/auction-types')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(types => {
            const typeSelect = document.getElementById('auctionTypeFilter');
            if (!typeSelect) return;
            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type.type_name;
                option.textContent = type.type_name;
                typeSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching auction types:', error));

    // 2. جلب معلومات المستخدم
    // ✅ الكود المصحح مع إضافة التوكن
fetch('/get-user-info', {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    }
})
.then(response => {
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
})
.then(userInfo => {
    document.getElementById('username').textContent = userInfo.username;
    document.getElementById('profilePic').src = userInfo.profilePicture || 'default-profile.png';
})
.catch(error => console.error('Error fetching user info:', error));
    // 3. جلب كل المزادات وعرضها
    fetch('/get-auctions')
        .then(response => {
             if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(auctions => {
            displayAuctions(auctions);
        })
        .catch(error => console.error('Error fetching auctions:', error));
});


// =================================================================
// دوال عرض ومعالجة المزادات
// =================================================================
function displayAuctions(auctions) {
        console.log('البيانات المستلمة من الخادم:', auctions);

    const auctionsContainer = document.getElementById('auctions-container');
    if (!auctionsContainer) return;
    auctionsContainer.innerHTML = '';
    const now = new Date();

    // ✅ التصحيح: تمت إزالة '+ 'Z'' من هنا لأن الخادم يرسل التوقيت كاملاً
    auctions.sort((a, b) => {
        const startA = new Date(a.start_time);
        const endA = new Date(a.end_time);
        const startB = new Date(b.start_time);
        const endB = new Date(b.end_time);

        const isAOngoing = startA <= now && endA >= now;
        const isAUpcoming = startA > now;
        
        const isBOngoing = startB <= now && endB >= now;
        const isBUpcoming = startB > now;

        if (isAOngoing && !isBOngoing) return -1;
        if (!isAOngoing && isBOngoing) return 1;
        if (isAUpcoming && !isBUpcoming) return -1;
        if (!isAUpcoming && isBUpcoming) return 1;

        return endA - endB;
    });

    auctions.forEach(auction => {
        const auctionFrame = document.createElement('div');
        auctionFrame.classList.add('auction-frame');
        auctionFrame.dataset.id = auction.auction_id;

        let statusText = '';
        let statusClass = '';
        
        // ✅ التصحيح: تمت إزالة '+ 'Z'' من هنا أيضًا
        const startTime = new Date(auction.start_time);
        const endTime = new Date(auction.end_time);

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

        const imagesHtml = (auction.images || []).map((image, index) =>
            `<img src="${image}" alt="صورة المزاد" class="${index === 0 ? 'active' : ''}" onclick="openModal('${image}', ${auction.auction_id})">`
        ).join('');

        const editButton = (statusText === 'لم يبدأ' || statusText === 'جار الآن') ?
            `<button class="edit-button" onclick="editAuction(${auction.auction_id})">تعديل</button>` : '';

        const deleteButton = (statusText === 'لم يبدأ' || statusText === 'منتهي') ?
            `<button class="delete-button" onclick="deleteAuction(${auction.auction_id})">حذف المزاد</button>` : '';

        auctionFrame.innerHTML = `
            <div class="auction-header">
                <h3>${auction.title}</h3>
                <div class="auction-images">
                    ${imagesHtml.length > 0 ? imagesHtml : '<img src="/images/placeholder.png" alt="لا توجد صور">'}
                    <div class="navigation-buttons">
                        <button class="prev-button" onclick="showPrevImage(${auction.auction_id})">&#10094;</button>
                        <button class="next-button" onclick="showNextImage(${auction.auction_id})">&#10095;</button>
                    </div>
                </div>
                <p>رقم المزاد: ${auction.auction_number}</p>
                <p class="auction-type">نوع المزاد: ${auction.type_name}</p>
                <p class="${statusClass}">${statusText}</p>
                ${editButton}
                ${deleteButton}
            </div>
        `;
        auctionsContainer.appendChild(auctionFrame);
    });
}

function filterAuctions() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const auctionTypeFilter = document.getElementById('auctionTypeFilter').value.toLowerCase();
    const auctionStatusFilter = document.getElementById('auctionStatusFilter').value;
    const auctionFrames = document.querySelectorAll('.auction-frame');

    auctionFrames.forEach(frame => {
        const title = frame.querySelector('h3').textContent.toLowerCase();
        const numberText = frame.querySelector('p:nth-of-type(1)').textContent;
        const number = numberText.split(':')[1]?.trim().toLowerCase() || '';
        const type = frame.querySelector('.auction-type').textContent.split(':')[1]?.trim().toLowerCase() || '';
        const status = frame.querySelector('p[class^="status-"]').textContent.trim();

        const matchesSearch = title.includes(searchInput) || number.includes(searchInput);
        const matchesType = !auctionTypeFilter || auctionTypeFilter === 'all' || type.includes(auctionTypeFilter);
        const matchesStatus = !auctionStatusFilter || auctionStatusFilter === 'all' || status === auctionStatusFilter;

        if (matchesSearch && matchesType && matchesStatus) {
            frame.style.display = '';
        } else {
            frame.style.display = 'none';
        }
    });
}


// =================================================================
// دوال التعديل والحذف
// =================================================================

async function editAuction(auctionId) {
    currentEditingAuctionId = auctionId;
    try {
        const auctionResponse = await fetch(`/get-auction/${auctionId}`);
        if (!auctionResponse.ok) throw new Error('Failed to fetch auction data');
        const auction = await auctionResponse.json();
        
        document.getElementById('editTitle').value = auction.title;
        document.getElementById('editDescription').value = auction.description;
        document.getElementById('editStartPrice').value = auction.start_price;
        document.getElementById('editWilaya').value = auction.wilaya;
        document.getElementById('editCommune').value = auction.commune;
        
        const formatForInput = (dateString) => new Date(dateString).toISOString().slice(0, 16);
        document.getElementById('editStartTime').value = formatForInput(auction.start_time);
        document.getElementById('editEndTime').value = formatForInput(auction.end_time);

        // ✅ تم تصحيح الرابط هنا
        const typesResponse = await fetch('/api/auction-types');
        if (!typesResponse.ok) throw new Error('Failed to fetch auction types');
        const types = await typesResponse.json();
        
        const typeSelect = document.getElementById('editType');
        typeSelect.innerHTML = '';
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type.type_name;
            option.textContent = type.type_name;
            typeSelect.appendChild(option);
        });
        typeSelect.value = auction.type_name;

        const currentImagesContainer = document.getElementById('currentImages');
        currentImagesContainer.innerHTML = '';
        (auction.images || []).forEach(img => {
            const imageWrapper = document.createElement('div');
            imageWrapper.classList.add('current-image');
            const imgElement = document.createElement('img');
            imgElement.src = img; // ✅ تم تصحيح مسار الصورة هنا
            imgElement.alt = 'صورة المزاد';
            imageWrapper.appendChild(imgElement);
            currentImagesContainer.appendChild(imageWrapper);
        });

        document.getElementById('editModal').style.display = 'block';

    } catch (error) {
        console.error('Error in editAuction:', error);
        alert('حدث خطأ أثناء تحميل بيانات التعديل.');
    }
}

function saveAuctionChanges() {
    if (currentEditingAuctionId === null) return;

    const form = document.getElementById('editAuctionForm');
    const formData = new FormData(form);
    
    fetch(`/update-auction/${currentEditingAuctionId}`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    })
    .then(data => {
        alert('تم تحديث المزاد بنجاح!');
        closeEditModal();
        fetch('/get-auctions').then(res => res.json()).then(displayAuctions);
    })
    .catch(error => {
        console.error('Error updating auction:', error);
        alert('هناك مشكلة في تحديث المزاد.');
    });
}

function deleteAuction(auctionId) {
    if (!confirm("هل أنت متأكد أنك تريد حذف هذا المزاد؟")) {
        return;
    }

    fetch(`/delete-auction/${auctionId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    })
    .then(data => {
        alert('تم حذف المزاد بنجاح');
        document.querySelector(`.auction-frame[data-id='${auctionId}']`).remove();
    })
    .catch(error => {
        console.error('Error deleting auction:', error);
        alert('هناك مشكلة في حذف المزاد.');
    });
}

function closeEditModal() {
    const editModal = document.getElementById('editModal');
    if(editModal) editModal.style.display = 'none';
    currentEditingAuctionId = null;
}


// =================================================================
// دوال عرض الصور والتنقل بينها
// =================================================================

function showPrevImage(auctionId) {
    const auctionFrame = document.querySelector(`.auction-frame[data-id='${auctionId}']`);
    if(!auctionFrame) return;
    const images = auctionFrame.querySelectorAll('.auction-images img');
    if (images.length <= 1) return;
    let currentIndex = Array.from(images).findIndex(image => image.classList.contains('active'));
    
    images[currentIndex].classList.remove('active');
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    images[currentIndex].classList.add('active');
}

function showNextImage(auctionId) {
    const auctionFrame = document.querySelector(`.auction-frame[data-id='${auctionId}']`);
    if(!auctionFrame) return;
    const images = auctionFrame.querySelectorAll('.auction-images img');
    if (images.length <= 1) return;
    let currentIndex = Array.from(images).findIndex(image => image.classList.contains('active'));

    images[currentIndex].classList.remove('active');
    currentIndex = (currentIndex + 1) % images.length;
    images[currentIndex].classList.add('active');
}

function openModal(imageSrc, auctionId) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('expandedImg');
    if (!modal || !modalImage) return;

    modal.style.display = 'block';
    modalImage.src = imageSrc;

    const auctionFrame = document.querySelector(`.auction-frame[data-id='${auctionId}']`);
    currentAuctionImages = Array.from(auctionFrame.querySelectorAll('.auction-images img')).map(img => img.src);
    currentImageIndex = currentAuctionImages.indexOf(imageSrc);
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    if(modal) modal.style.display = 'none';
}

function showPrevModalImage() {
    if (currentAuctionImages.length === 0) return;
    currentImageIndex = (currentImageIndex - 1 + currentAuctionImages.length) % currentAuctionImages.length;
    document.getElementById('expandedImg').src = currentAuctionImages[currentImageIndex];
}

function showNextModalImage() {
    if (currentAuctionImages.length === 0) return;
    currentImageIndex = (currentImageIndex + 1) % currentAuctionImages.length;
    document.getElementById('expandedImg').src = currentAuctionImages[currentImageIndex];
}


// =================================================================
// دوال مساعدة (الهيدر)
// =================================================================

function toggleDropdown() {
    const dropdownContent = document.getElementById('dropdownContent');
    if(dropdownContent) {
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    }
}

function logout() {
    window.location.href = '/admin/login-admin.html';
}