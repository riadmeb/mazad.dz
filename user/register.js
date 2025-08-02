document.getElementById('profilePicture').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const img = document.getElementById('profilePicturePreview');
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
            img.style.display = 'block';
        }
        reader.readAsDataURL(file);
    } else {
        img.style.display = 'none';
    }
});

document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const formData = new FormData(this);

    // تحقق من تطابق كلمتي المرور
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (password !== confirmPassword) {
        showAlert('كلمات المرور غير متطابقة. يرجى المحاولة مرة أخرى.', 'error');
        return;
    }

    fetch('/register', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 4000);
        } else {
            showAlert(data.message, 'error');
        }
    })
    .catch(error => console.error('Error:', error));
});

function showAlert(message, type) {
    const alertBox = document.createElement('div');
    alertBox.className = `alert ${type}`;
    alertBox.textContent = message;
    document.body.appendChild(alertBox);
    setTimeout(() => {
        alertBox.remove();
    }, 4000);
}
