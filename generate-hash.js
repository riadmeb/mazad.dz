const bcrypt = require('bcrypt');

const plainPassword = 'riad123';
bcrypt.hash(plainPassword, 10, (err, hash) => {
    if (err) {
        return console.error('❌ Error hashing:', err);
    }
    console.log('🔑 كلمة المرور المشفّرة:', hash);
});
