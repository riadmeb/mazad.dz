document.getElementById('addAuctionForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const form = this;
    const formData = new FormData(form);

    const startTimeInput = form.querySelector('input[name="start_time"]').value;
    const endTimeInput = form.querySelector('input[name="end_time"]').value;

    // ✅ التصحيح: تحويل الوقت المحلي إلى تنسيق ISO 8601 (UTC) الكامل
    // هذا هو التنسيق القياسي والموصى به دوليًا لإرسال التواريخ
    if (startTimeInput) {
        formData.set('start_time', new Date(startTimeInput).toISOString());
    }
    if (endTimeInput) {
        formData.set('end_time', new Date(endTimeInput).toISOString());
    }

    // إرسال البيانات إلى الخادم
    fetch('/admin/add-auction', {
        method: 'POST',
        body: formData,
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.message || 'فشل إضافة المزاد') });
        }
        return response.text();
    })
    .then(data => {
        // عرض رسالة النجاح
        showAlert('✅ لقد تم إضافة المزاد بنجاح!', 'success');
        form.reset();
    })
    .catch(error => {
        console.error('❌ Error:', error);
        showAlert(`❌ ${error.message}`, 'error');
    });
});

// دالة مساعدة لعرض التنبيهات
function showAlert(message, type) {
    const alertBox = document.createElement('div');
    alertBox.textContent = message;
    alertBox.style.color = type === 'success' ? 'green' : 'red';
    alertBox.style.marginTop = '10px';
    document.querySelector('.add-auction-container').appendChild(alertBox);
    setTimeout(() => alertBox.remove(), 5000);
}