document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addAuctionForm');
    if (!form) {
        console.error('Add auction form not found!');
        return;
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent the default form submission

        const formData = new FormData(this);
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        
        // Convert local datetime to ISO string for server compatibility
        const startTimeInput = formData.get('start_time');
        const endTimeInput = formData.get('end_time');

        if (startTimeInput) {
            formData.set('start_time', new Date(startTimeInput).toISOString());
        }
        if (endTimeInput) {
            formData.set('end_time', new Date(endTimeInput).toISOString());
        }

        // Disable button and show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <span>جاري الإضافة...</span>
        `;

        // Updated fetch request with correct endpoint and Authorization header
        fetch('/admin/add-auction', {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        })
        .then(async response => {
            if (!response.ok) {
                // ✅ [FIX] Try to get a more specific error message from the server's response body
                const errorText = await response.text(); // Get the raw response text
                try {
                    // Try to parse it as JSON
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.message || `حدث خطأ في الخادم: ${response.statusText} (${response.status})`);
                } catch (e) {
                    // If it's not JSON, it might be a plain text error message or HTML
                    // In this case, we show the raw text.
                    throw new Error(errorText || `حدث خطأ في الخادم: ${response.statusText} (${response.status})`);
                }
            }
            return response.json(); 
        })
        .then(data => {
            Swal.fire({
                toast: true,
                position: 'top-start',
                icon: 'success',
                title: data.message || 'تمت إضافة المزاد بنجاح!',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
            form.reset(); 
        })
        .catch(error => {
            console.error('❌ Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'فشل إضافة المزاد',
                // Display the detailed error message we extracted
                text: error.message,
                confirmButtonText: 'حسناً'
            });
        })
        .finally(() => {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        });
    });
});
