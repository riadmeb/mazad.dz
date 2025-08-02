// =================================================================
// 1. استدعاء المكتبات (تم تنظيفها وترتيبها)
// =================================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors'); // استدعاء cors
const path = require('path');
const mysql = require('mysql2/promise');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const http = require('http');

// =================================================================
// 2. إعداد التطبيق والـ Middleware (بالترتيب الصحيح)
// =================================================================
const app = express();
const server = http.createServer(app);

// ✅✅✅ هذا هو الترتيب الصحيح والمهم ✅✅✅

// 1. السماح بالطلبات من نطاقات أخرى (يجب أن يكون أولاً)
app.use(cors());

const PORT = process.env.PORT || 4000;
// 2. إعداد الخدمات الخارجية (Cloudinary, Database)
// -----------------------------------------------------------------
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'mazad_project_uploads',
        format: async (req, file) => 'jpg',
        public_id: (req, file) => Date.now() + '-' + path.parse(file.originalname).name,
    },
});

const upload = multer({ storage: storage });

// ✅✅✅ هذا هو التصحيح الأهم: استخدم createPool ✅✅✅
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0 ,
    timezone: '+00:00' 

});

// الآن هذا الكود سيعمل بشكل صحيح لاختبار الاتصال
db.getConnection()
    .then(connection => {
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
        connection.release(); // حرر الاتصال لإعادته إلى الـ pool
    })
    .catch(err => {
        console.error('❌ فشل الاتصال بقاعدة البيانات:', err);
    });

// 3. الوسيط (Middleware)
// -----------------------------------------------------------------
function verifyToken(req, res, next) {
    // استخراج التوكن من الهيدر
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ success: false, message: "التوكن مطلوب للمصادقة" });
    }
    try {
        // التحقق من صحة التوكن
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // إضافة بيانات المستخدم (مثل userId) إلى كائن الطلب (req)
        req.user = decoded;
    } catch (err) {
        return res.status(401).json({ success: false, message: "توكن غير صالح" });
    }
    // الانتقال إلى الدالة التالية (المسار الرئيسي)
    return next();
}

app.use(express.static('public'));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, 
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 
    }
}));


// 4. خدمة ملفات الواجهات الثابتة
// -----------------------------------------------------------------

app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/', express.static(path.join(__dirname, 'user')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
// [MODIFIED] تعديل نقطة النهاية للتسجيل لاستخدام bcrypt
// ✅ Corrected Register Route using async/await
app.post('/register', upload.single('profilePicture'), async (req, res) => {
    // Use a try...catch block for error handling
    try {
        const { username, email, phoneNumber, firstName, lastName, birthDate, password, birthPlace, wilaya, commune } = req.body;

        if (!password || !username || !email) {
            return res.status(400).json({ success: false, message: 'اسم المستخدم والبريد الإلكتروني وكلمة المرور حقول إلزامية.' });
        }

        // 1. Check if the user already exists
        const checkQuery = `SELECT * FROM Users WHERE username = ? OR email = ?`;
        const [existingUsers] = await db.query(checkQuery, [username, email]);

        if (existingUsers.length > 0) {
            return res.status(409).json({ success: false, message: 'اسم المستخدم أو البريد الإلكتروني موجود بالفعل.' }); // 409 Conflict
        }

        // 2. Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 3. Get the image path from Cloudinary
        const profilePicture = req.file ? req.file.path : null;

        // 4. Insert the new user into the database
        const insertQuery = `
            INSERT INTO Users 
                (username, first_name, last_name, email, birth_date, password, phone_number, birth_place, wilaya_id, commune_id, profile_picture) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await db.query(insertQuery, [username, firstName, lastName, email, birthDate, hashedPassword, phoneNumber, birthPlace, wilaya, commune, profilePicture]);

        // 5. Send a success response
        res.status(201).json({ success: true, message: 'تم التسجيل بنجاح، يرجى انتظار تفعيل الحساب.' });

    } catch (error) {
        // Any error in the process will be caught here
        console.error('❌ Error during registration:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم أثناء التسجيل.' });
    }
});

// ✅ Corrected User Login Route using async/await
app.post('/login', async (req, res) => {
    // Use a try...catch block for unified error handling
    try {
        const { identifier, password } = req.body;

        // 1. Find the user by their username or email
        const query = `SELECT * FROM Users WHERE (username = ? OR email = ?)`;
        const [results] = await db.query(query, [identifier, identifier]);

        if (results.length === 0) {
            // User not found
            return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة.' });
        }

        const user = results[0];

        // 2. Compare the provided password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Passwords do not match
            return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة.' });
        }

        // 3. Check the user's account status
        if (user.status === 'approved') {
            // If approved, create a JWT token and send user data
            const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({
                success: true,
                message: 'تسجيل الدخول ناجح',
                token: token,
                firstName: user.first_name,
                lastName: user.last_name,
                profilePicture: user.profile_picture,
            });
        } else if (user.status === 'pending') {
            res.status(403).json({ success: false, message: 'يرجى انتظار الموافقة على حسابك من الإدارة.' }); // 403 Forbidden
        } else { // 'rejected'
            res.status(403).json({ success: false, message: 'تم رفض حسابك. يرجى التواصل مع الدعم.' }); // 403 Forbidden
        }

    } catch (error) {
        // Any other error will be caught here
        console.error('❌ Error during login:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم.' });
    }
});


// [MODIFIED] تعديل نقطة النهاية لتحديث البيانات لاستخدام bcrypt
app.post('/update-user-data', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'رمز مصادقة مفقود' });

    let userId;
    try {
        userId = jwt.verify(token, process.env.JWT_SECRET).userId;
    } catch (err) {
        return res.status(401).json({ success: false, message: 'رمز مصادقة غير صالح' });
    }

    const { email, phone_number, wilaya, commune, password } = req.body;
    
    const executeUpdate = (queryParams) => {
        db.query(queryParams.query, queryParams.params, (err, result) => {
            if (err) return res.status(500).json({ success: false, message: 'حدث خطأ. حاول مرة أخرى.' });
            res.json({ success: true, message: 'تم تحديث البيانات بنجاح' });
        });
    };

    if (password && password.trim() !== '') {
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) return res.status(500).json({ success: false, message: 'خطأ في تشفير كلمة المرور.' });
            const queryParams = {
                query: `UPDATE Users SET email = ?, phone_number = ?, wilaya_id = ?, commune_id = ?, password = ? WHERE user_id = ?`,
                params: [email, phone_number, wilaya, commune, hashedPassword, userId]
            };
            executeUpdate(queryParams);
        });
    } else {
        const queryParams = {
            query: `UPDATE Users SET email = ?, phone_number = ?, wilaya_id = ?, commune_id = ? WHERE user_id = ?`,
            params: [email, phone_number, wilaya, commune, userId]
        };
        executeUpdate(queryParams);
    }
});

// =================================================================
// =================================================================
// مسار إضافة مزايدة جديدة (النسخة المصححة مع المعاملات)
// =================================================================
// =================================================================
// مسار إضافة مزايدة جديدة (النسخة المصححة مع المعاملات والتحقق من التوكن)
// =================================================================
// =================================================================
app.post('/place-bid', verifyToken, async (req, res) => {
    const { auctionId, bidAmount } = req.body;
    const userId = req.user.userId;
    let connection;

    try {
        // 1. بدء معاملة لضمان سلامة البيانات
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 2. التحقق من الشروط (السعر، الوقت، إلخ)
        const [results] = await connection.query(
            'SELECT end_time, start_price, (SELECT MAX(bid_amount) FROM Bids WHERE auction_id = Auctions.auction_id) as last_bid_amount FROM Auctions WHERE auction_id = ? FOR UPDATE',
            [auctionId]
        );

        if (results.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'المزاد غير موجود' });
        }

        const auction = results[0];
        const currentPrice = auction.last_bid_amount || auction.start_price;
        const endTime = new Date(auction.end_time);

        if (new Date() > endTime) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'لقد انتهى هذا المزاد' });
        }
        if (bidAmount <= currentPrice) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'مبلغ المزايدة يجب أن يكون أعلى من السعر الحالي' });
        }

        // 3. حفظ المزايدة الجديدة وتمديد الوقت إذا لزم الأمر
        await connection.query('INSERT INTO Bids (auction_id, user_id, bid_amount, bid_time) VALUES (?, ?, ?, NOW())', [auctionId, userId, bidAmount]);
        
        let newEndTime = endTime;
        if (newEndTime.getTime() - new Date().getTime() < 300000) { // 5 دقائق
            newEndTime = new Date(new Date().getTime() + 300000);
            await connection.query('UPDATE Auctions SET end_time = ? WHERE auction_id = ?', [newEndTime, auctionId]);
        }

        await connection.commit();
        
        // ✅ 4. بعد نجاح المزايدة، قم بجلب أحدث قائمة للمزايدين
        const recentBidsQuery = `
            SELECT u.username, b.bid_amount, b.bid_time 
            FROM Bids b JOIN Users u ON b.user_id = u.user_id
            WHERE b.auction_id = ? 
            ORDER BY b.bid_time DESC 
            LIMIT 15
        `;
        const [recentBids] = await db.query(recentBidsQuery, [auctionId]);

        // ✅ 5. أرسل القائمة المحدثة (recentBids) ضمن رسالة التحديث
        sendEventsToAll({
            auctionId: auctionId,
            lastBidAmount: bidAmount,
            endTime: newEndTime.toISOString(),
            bids: recentBids // <--- هذا هو الجزء الأهم
        });

        res.json({ success: true, message: 'تمت المزايدة بنجاح' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Error placing bid:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم أثناء المزايدة' });
    } finally {
        if (connection) connection.release();
    }
});


// بقية نقاط النهاية (Endpoints) - تم التأكد من أنها تستخدم المتغيرات الصحيحة
// ... يمكنك نسخ ولصق جميع نقاط النهاية الأخرى هنا كما هي من ملفك ...
// مثال:

// ✅✅✅ المسار المصحح لجلب بيانات المستخدم ✅✅✅
app.get('/get-user-data', verifyToken, async (req, res) => {
    try {
        // userId متاح الآن من req.user بعد أن تم التحقق منه
        const userId = req.user.userId;

        const query = `SELECT user_id, username, first_name, last_name, email, phone_number, birth_date, birth_place, wilaya_id, commune_id, profile_picture FROM Users WHERE user_id = ?`;
        const [results] = await db.query(query, [userId]);

        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ success: false, message: 'المستخدم غير موجود.' });
        }
    } catch (error) {
        console.error('❌ Error in /get-user-data:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم.' });
    }
});

// ✅✅✅ المسار المصحح لتحديث بيانات المستخدم ✅✅✅
// ✅✅✅ المسار المصحح لتحديث بيانات المستخدم ✅✅✅
// ✅ الحل السريع: مسار لا يقوم بتحديث الإيميل
app.post('/update-user-data', verifyToken, upload.single('profile_picture'), async (req, res) => {
    try {
        const userId = req.user.userId;
        // لاحظ أننا لم نعد نأخذ الإيميل من النموذج
        const { first_name, last_name, phone_number, password /*...باقي الحقول غير الإلزامية*/ } = req.body;

        // بناء الاستعلام بدون الإيميل
        let fieldsToUpdate = [];
        let queryParams = [];

        if (first_name) { fieldsToUpdate.push('first_name = ?'); queryParams.push(first_name); }
        if (last_name) { fieldsToUpdate.push('last_name = ?'); queryParams.push(last_name); }
        if (phone_number) { fieldsToUpdate.push('phone_number = ?'); queryParams.push(phone_number); }
        // ... أضف باقي الحقول هنا

        if (req.file) {
            fieldsToUpdate.push('profile_picture = ?');
            queryParams.push(req.file.path);
        }
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            fieldsToUpdate.push('password = ?');
            queryParams.push(hashedPassword);
        }

        if (fieldsToUpdate.length === 0) {
            return res.json({ success: true, message: 'لا توجد بيانات لتحديثها.' });
        }

        queryParams.push(userId);
        const query = `UPDATE Users SET ${fieldsToUpdate.join(', ')} WHERE user_id = ?`;
        
        await db.query(query, queryParams);
        res.json({ success: true, message: 'تم تحديث البيانات بنجاح' });

    } catch (error) {
        console.error('❌ Error in /update-user-data:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث البيانات.' });
    }
});


// =================================================================
// مسار جلب المزادات النشطة مع دعم البحث والفلترة (النسخة المصححة)
// =================================================================
app.get('/active-auctions', async (req, res) => {
    try {
        const { searchQuery, auctionType } = req.query;

        let query = `
            SELECT 
                a.auction_id, a.auction_number, a.title, a.description, a.start_price, 
                a.start_time, a.end_time, a.wilaya, a.commune, at.type_name,
                (SELECT JSON_ARRAYAGG(i.image_url) FROM Images i WHERE i.auction_id = a.auction_id) AS images,
                (SELECT MAX(b.bid_amount) FROM Bids b WHERE b.auction_id = a.auction_id) AS last_bid_price
            FROM Auctions a
            JOIN AuctionTypes at ON a.auction_type_id = at.auction_type_id
            WHERE NOW() BETWEEN a.start_time AND a.end_time
        `;
        const queryParams = [];

        if (searchQuery) {
            query += ' AND (a.auction_number = ? OR a.title LIKE ?)';
            queryParams.push(searchQuery, `%${searchQuery}%`);
        }
        if (auctionType) {
            query += ' AND a.auction_type_id = ?';
            queryParams.push(auctionType);
        }
        query += ' ORDER BY a.end_time ASC';

        const [results] = await db.query(query, queryParams);

        // ✅✅✅ هذا هو الجزء الذي تم تعديله ✅✅✅
        // هذا الكود سيتعامل مع كل حالات الصور بذكاء
        results.forEach(auction => {
            const imagesData = auction.images;
            
            if (typeof imagesData === 'string') {
                if (imagesData.startsWith('[')) {
                    // الحالة 1: البيانات نص JSON (من JSON_ARRAYAGG)
                    try {
                        auction.images = JSON.parse(imagesData);
                    } catch (e) {
                        auction.images = [];
                    }
                } else {
                    // الحالة 2: البيانات رابط واحد فقط
                    auction.images = [imagesData];
                }
            } else if (!imagesData) {
                // الحالة 3: لا توجد صور (القيمة NULL)
                auction.images = [];
            }
        });

        res.json(results);

    } catch (err) {
        console.error('❌ Error fetching active auctions:', err);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم. حاول مرة أخرى.' });
    }
});
// Endpoint لجلب أنواع المزادات
app.get('/api/auction-types', async (req, res) => {
    try {
        const [results] = await db.query('SELECT auction_type_id, type_name FROM AuctionTypes');
        res.json(results);
        
    } catch (err) {
        console.error('❌ خطأ في /api/auction-types ->', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});
// ✅ Route to fetch details for a single auction (Corrected with async/await)
app.get('/auction-details', async (req, res) => {
    try {
        const { auctionId } = req.query;
        if (!auctionId) {
            return res.status(400).json({ success: false, message: 'Auction ID is required' });
        }
        
        const query = `
            SELECT 
                a.auction_id, a.auction_number, a.title, a.description, a.start_price, 
                a.start_time, a.end_time, a.wilaya, a.commune, at.type_name,
                (SELECT JSON_ARRAYAGG(i.image_url) FROM Images i WHERE i.auction_id = a.auction_id) AS images,
                (SELECT MAX(bid_amount) FROM Bids WHERE auction_id = a.auction_id) AS last_bid_price
            FROM Auctions a
            JOIN AuctionTypes at ON a.auction_type_id = at.auction_type_id
            WHERE a.auction_id = ?
        `;
        
        const [results] = await db.query(query, [auctionId]);

        if (results.length > 0) {
            const auction = results[0];
            
            // ✅✅✅ تم نسخ منطق معالجة الصور الذكي من نقطة النهاية الصحيحة ✅✅✅
            const imagesData = auction.images;
            if (typeof imagesData === 'string') {
                if (imagesData.startsWith('[')) {
                    // الحالة 1: البيانات نص JSON
                    try {
                        auction.images = JSON.parse(imagesData);
                    } catch (e) {
                        auction.images = [];
                    }
                } else {
                    // الحالة 2: البيانات رابط واحد فقط
                    auction.images = [imagesData];
                }
            } else if (!imagesData) {
                // الحالة 3: لا توجد صور (القيمة NULL)
                auction.images = [];
            }
            // =======================================================================
            
            // Set a default value for last_bid_price if no bids have been placed
            auction.last_bid_price = auction.last_bid_price || null;
            
            res.json(auction);
        } else {
            res.status(404).json({ success: false, message: 'Auction not found.' });
        }
    } catch (err) {
        console.error('❌ Error fetching auction details:', err);
        res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
    }
});
// جلب المزادات التي لم تنتهِ بعد (تشمل المزادات الجارية والتي لم تبدأ)
app.get('/not-ended-auctions', (req, res) => {
    const { searchQuery, auctionType } = req.query;

    let query = `
        SELECT a.auction_id, a.auction_number, a.title, a.description, a.start_price, a.start_time, a.end_time,
               a.wilaya, a.commune, at.type_name,
               (SELECT JSON_ARRAYAGG(i.image_url) FROM Images i WHERE i.auction_id = a.auction_id) AS images,
               (SELECT MAX(b.bid_amount) FROM Bids b WHERE b.auction_id = a.auction_id) AS last_bid_price,
               CASE 
                 WHEN NOW() < a.start_time THEN 'لم يبدأ بعد'
                 WHEN NOW() BETWEEN a.start_time AND a.end_time THEN 'جاري الآن'
                 ELSE 'منتهي'
               END AS auction_status
        FROM Auctions a
        JOIN AuctionTypes at ON a.auction_type_id = at.auction_type_id
        WHERE a.end_time > NOW()
    `;

    const queryParams = [];

    if (searchQuery) {
        query += ' AND (a.auction_number = ? OR a.title LIKE ?)';
        queryParams.push(searchQuery, `%${searchQuery}%`);
    }

    if (auctionType) {
        query += ' AND a.auction_type_id = ?';
        queryParams.push(auctionType);
    }

    query += ' ORDER BY a.start_time ASC';

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching not-ended auctions:', err);
            return res.status(500).json({ success: false, message: 'حدث خطأ. حاول مرة أخرى.' });
        }

        results.forEach(auction => {
            try {
                if (typeof auction.images === 'string' && auction.images.trim() !== "") {
                    auction.images = JSON.parse(auction.images).map(image => `/images-auctions/${image}`);
                } else if (Array.isArray(auction.images) && auction.images.length > 0) {
                    auction.images = auction.images.map(image => `/images-auctions/${image}`);
                } else {
                    auction.images = [];
                }
            } catch (e) {
                console.error('Error parsing images JSON:', e);
                auction.images = [];
            }
        });

        res.json(results);
    });
});

// في ملف server.js

// تأكد من وجود verifyToken Middleware التي أنشأناها سابقًا
// إذا لم تكن موجودة، يمكنك استخدام الكود أدناه

// Middleware للتحقق من التوكن (يمكنك وضعها في أعلى الملف)
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: "التوكن مفقود" });
    }
    try {
        // ✅ استخدام المفتاح السري الصحيح من .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // إضافة بيانات المستخدم للطلب
        next(); // الانتقال إلى الدالة التالية
    } catch (err) {
        return res.status(401).json({ message: "توكن غير صالح أو منتهي الصلاحية" });
    }
}


// ✅✅✅ هذا هو المسار المصحح بالكامل ✅✅✅

app.get('/auctions-status', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // ✅ تم تعديل استعلام SQL هنا
        const sql = `
            SELECT 
                a.auction_id, a.title, a.start_time, a.end_time,
                (SELECT MAX(bid_amount) FROM Bids WHERE auction_id = a.auction_id AND user_id = ?) AS user_max_bid,
                (SELECT MAX(bid_amount) FROM Bids WHERE auction_id = a.auction_id) AS current_price,
                (SELECT user_id FROM Bids WHERE auction_id = a.auction_id ORDER BY bid_amount DESC, bid_time DESC LIMIT 1) AS highest_bidder_id,
                (SELECT JSON_ARRAYAGG(i.image_url) FROM Images i WHERE i.auction_id = a.auction_id) AS images
            FROM Bids b
            JOIN Auctions a ON b.auction_id = a.auction_id
            WHERE b.user_id = ?
            GROUP BY a.auction_id
            ORDER BY a.end_time DESC
        `;

        const [results] = await db.query(sql, [userId, userId]);
        const now = new Date();

        const data = results.map(r => {
            const endTime = new Date(r.end_time);
            const ended = endTime < now;
            
            let status = 'جاري الآن';
            if (ended) {
                status = (r.highest_bidder_id === userId) ? 'فزت بالمزاد' : 'خسرت المزاد';
            }
 let images = [];
            const imagesData = r.images;
            if (typeof imagesData === 'string') {
                if (imagesData.startsWith('[')) { // إذا كانت نص JSON
                    try { images = JSON.parse(imagesData); } catch (e) { images = []; }
                } else if (imagesData) { // إذا كانت رابط واحد
                    images = [imagesData];
                }
            } else if (Array.isArray(imagesData)) {
                images = imagesData;
            }

            return {
                ...r,
                images: images,
                status: status,
                winning_amount: r.current_price // إعادة تسمية للتوافق مع الواجهة الأمامية
            };
        });

        res.json(data);

    } catch (error) {
        console.error('❌ Error in /auctions-status:', error);
        res.status(500).json({ message: 'خطأ في الخادم' });
    }
});



let clients = [];

function sendEventsToAll(data) {
  console.log('📢 Sending SSE event to all clients:', data);
  clients.forEach(client => client.res.write(`data: ${JSON.stringify(data)}\n\n`));
}

app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);
    console.log(`✅ Client ${clientId} connected to SSE`);

    res.write(`data: ${JSON.stringify({ message: 'Connected to live updates' })}\n\n`);

    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
        console.log(`❌ Client ${clientId} disconnected from SSE`);
    });
});


// =================================================================
// مسار إضافة مزايدة جديدة
// =================================================================
// في ملف server.js

// تأكد من وجود verifyToken, db, sendEventsToAll في نطاق هذا الكود
app.post('/place-bid', verifyToken, async (req, res) => {
    const { auctionId, bidAmount } = req.body;
    const userId = req.user.userId;
    let connection;

    try {
        // 1. بدء معاملة لضمان سلامة البيانات
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 2. التحقق من الشروط (السعر، الوقت، إلخ)
        const [results] = await connection.query(
            'SELECT end_time, start_price, (SELECT MAX(bid_amount) FROM Bids WHERE auction_id = Auctions.auction_id) as last_bid_amount FROM Auctions WHERE auction_id = ? FOR UPDATE',
            [auctionId]
        );

        if (results.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'المزاد غير موجود' });
        }

        const auction = results[0];
        const currentPrice = auction.last_bid_amount || auction.start_price;
        const endTime = new Date(auction.end_time);

        if (new Date() > endTime) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'لقد انتهى هذا المزاد' });
        }
        if (bidAmount <= currentPrice) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'مبلغ المزايدة يجب أن يكون أعلى من السعر الحالي' });
        }

        // 3. حفظ المزايدة الجديدة وتمديد الوقت إذا لزم الأمر
        await connection.query('INSERT INTO Bids (auction_id, user_id, bid_amount, bid_time) VALUES (?, ?, ?, NOW())', [auctionId, userId, bidAmount]);
        
        let newEndTime = endTime;
        if (newEndTime.getTime() - new Date().getTime() < 300000) { // 5 دقائق
            newEndTime = new Date(new Date().getTime() + 300000);
            await connection.query('UPDATE Auctions SET end_time = ? WHERE auction_id = ?', [newEndTime, auctionId]);
        }

        await connection.commit();
        
        // ✅ 4. بعد نجاح المزايدة، قم بجلب أحدث قائمة للمزايدين
        const recentBidsQuery = `
            SELECT u.username, b.bid_amount, b.bid_time 
            FROM Bids b JOIN Users u ON b.user_id = u.user_id
            WHERE b.auction_id = ? 
            ORDER BY b.bid_time DESC 
            LIMIT 15
        `;
        const [recentBids] = await db.query(recentBidsQuery, [auctionId]);

        // ✅ 5. أرسل القائمة المحدثة (recentBids) ضمن رسالة التحديث
        sendEventsToAll({
            auctionId: auctionId,
            lastBidAmount: bidAmount,
            endTime: newEndTime.toISOString(),
            bids: recentBids // <--- هذا هو الجزء الأهم
        });

        res.json({ success: true, message: 'تمت المزايدة بنجاح' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Error placing bid:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم أثناء المزايدة' });
    } finally {
        if (connection) connection.release();
    }
});


// =================================================================
// مسار تحديث وقت انتهاء المزاد
// =================================================================
app.post('/update-end-time', async (req, res) => {
    try {
        const { auctionId, newEndTime } = req.body;
        // (يمكن إضافة تحقق من التوكن هنا أيضاً إذا لزم الأمر)

        const sql = 'UPDATE Auctions SET end_time = ? WHERE auction_id = ?';
        const [result] = await db.query(sql, [newEndTime, auctionId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'المزاد غير موجود.' });
        }

        sendEventsToAll({ auctionId: auctionId, endTime: newEndTime });
        res.json({ success: true, message: 'تم تحديث وقت الانتهاء' });

    } catch (error) {
        console.error('❌ Error updating end time:', error);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});


// =================================================================
// مسار جلب ترتيب المستخدم في مزاد معين
// =================================================================
app.get('/auction-rank', async (req, res) => {
    try {
        const { auctionId } = req.query;
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'رمز مفقود' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        const sql = `
            SELECT user_id, MAX(bid_amount) as max_bid
            FROM Bids
            WHERE auction_id = ?
            GROUP BY user_id
            ORDER BY max_bid DESC
        `;
        const [results] = await db.query(sql, [auctionId]);
        const rank = results.findIndex(b => b.user_id === userId) + 1;

        res.json({ rank: rank > 0 ? rank : null });

    } catch (error) {
        console.error('❌ Error getting auction rank:', error);
        res.status(500).json({ message: 'خطأ في الخادم' });
    }
});


// =================================================================
// مسار جلب آخر 15 مزايدة
// =================================================================
app.get('/recent-bids', async (req, res) => {
    try {
        const { auctionId } = req.query;
        if (!auctionId) {
            return res.status(400).json({ success: false, message: 'auctionId مفقود' });
        }

        const sql = `
            SELECT u.username, b.bid_amount, b.bid_time
            FROM Bids b
            JOIN Users u ON b.user_id = u.user_id
            WHERE b.auction_id = ?
            ORDER BY b.bid_time DESC
            LIMIT 15
        `;
        const [results] = await db.query(sql, [auctionId]);
        res.json({ success: true, bids: results });

    } catch (error) {
        console.error('❌ Error fetching recent bids:', error);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});


// ❌ لا حاجة لهذا المسار الآن لأننا نرسل التحديثات من مسار /place-bid مباشرة
// app.get('/recent-bids-events', ...);
app.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // ✅ التصحيح: تغيير اسم الجدول من 'Admins' إلى 'SiteOwner'
        const [rows] = await db.query('SELECT * FROM SiteOwner WHERE username = ?', [username]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }

        const admin = rows[0];
        const isPasswordMatch = await bcrypt.compare(password, admin.password);

        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }

        // إنشاء التوكن
        const token = jwt.sign(
            // ✅ تأكد من أن اسم العمود 'site_owner_id' صحيح
            { adminId: admin.site_owner_id, username: admin.username, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // إرسال التوكن كاستجابة ناجحة
        res.status(200).json({ success: true, token: token });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'حدث خطأ في الخادم' });
    }
});

// مسار الحصول على معلومات المستخدم
app.get('/get-user-info', (req, res) => {
    try {
        // 1. استخراج التوكن من الـ headers
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'التوكن مفقود' });
        }

        // 2. التحقق من صحة التوكن
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. استخراج اسم المستخدم من التوكن الذي تم التحقق منه
        const username = decodedToken.username;

        // 4. جلب بيانات المدير من قاعدة البيانات
        const query = 'SELECT username, profile_picture FROM SiteOwner WHERE username = ?';
        db.query(query, [username], (err, results) => {
            if (err) {
                console.error('Error fetching user info:', err);
                return res.status(500).json({ message: 'خطأ في الخادم' });
            }

            if (results.length > 0) {
                res.json({
                    username: results[0].username,
                    // تأكد من أن اسم العمود profile_picture صحيح
                    profilePicture: results[0].profile_picture || 'default.png' 
                });
            } else {
                res.status(404).json({ message: 'المستخدم غير موجود' });
            }
        });

    } catch (error) {
        // إذا كان التوكن غير صالح أو منتهي الصلاحية
        return res.status(401).json({ message: 'جلسة غير صالحة أو منتهية' });
    }
});

// مسار الحصول على أنواع المزادات

// مسار إضافة مزاد جديد (تمت إعادة كتابته باستخدام Async/Await)
app.post('/admin/add-auction', upload.array('images', 10), async (req, res) => {
    
    // تم إعادة تفعيل upload.array middleware
    
    console.log('--- بدء عملية إضافة مزاد (مع الصور) ---');
    console.log('📄 البيانات المستلمة من النموذج:', req.body);
    console.log('🖼️ الملفات المرفوعة:', req.files);

    try {
        const { auction_type_id, title, description, start_price, start_time, end_time, wilaya, commune } = req.body;

        // التحقق من صحة البيانات
        if (!auction_type_id || !title || !start_price || !start_time || !end_time || !wilaya || !commune) {
            return res.status(400).send('الرجاء التأكد من تعبئة جميع الحقول الإلزامية.');
        }

        const formattedStartTime = new Date(start_time).toISOString().slice(0, 19).replace('T', ' ');
        const formattedEndTime = new Date(end_time).toISOString().slice(0, 19).replace('T', ' ');
        
        // معالجة الصور المرفوعة (إذا وجدت)
        const imageUrls = req.files ? req.files.map(file => file.path) : [];

        // إدخال المزاد في قاعدة البيانات
        const [maxNumResults] = await db.query('SELECT MAX(auction_number) AS max_num FROM Auctions');
        const newAuctionNumber = (maxNumResults[0].max_num || 0) + 1;

        const auctionQuery = 'INSERT INTO Auctions (auction_number, auction_type_id, title, description, start_price, start_time, end_time, wilaya, commune) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const [auctionResult] = await db.query(auctionQuery, [newAuctionNumber, auction_type_id, title, description, start_price, formattedStartTime, formattedEndTime, wilaya, commune]);

        const auctionId = auctionResult.insertId;

        // إدخال الصور في قاعدة البيانات (إذا وجدت)
        if (imageUrls.length > 0) {
            const imageValues = imageUrls.map(url => [auctionId, url]);
            const imageQuery = 'INSERT INTO Images (auction_id, image_url) VALUES ?';
            await db.query(imageQuery, [imageValues]);
        }
        
        console.log(`✅ تمت إضافة المزاد رقم ${newAuctionNumber} بنجاح`);
        
        res.status(201).send({
            message: 'تمت إضافة المزاد بنجاح',
            auctionId: auctionId,
            auctionNumber: newAuctionNumber
        });

    } catch (error) {
        // إذا حدث خطأ الآن، فسيكون بسبب Cloudinary أو قاعدة البيانات وسيظهر هنا
        console.error('❌ حدث خطأ فادح أثناء إضافة المزاد!');
        console.error('--- رسالة الخطأ ---');
        console.error(error.message); 
        console.error('--- تتبع الخطأ (Stack Trace) ---');
        console.error(error.stack); 
        
        res.status(500).send('حدث خطأ داخلي في الخادم، يرجى مراجعة سجلات الخادم.');
    }
});


// مسار الحصول على المزادات
app.get('/get-auctions', async (req, res) => {
    try {
        const query = `
            SELECT 
                a.auction_id, a.auction_number, a.title, a.description, a.start_price,
                a.start_time, a.end_time, a.wilaya, a.commune, 
                t.type_name, 
                i.image_url
            FROM 
                Auctions a
            LEFT JOIN 
                Images i ON a.auction_id = i.auction_id
            LEFT JOIN 
                AuctionTypes t ON a.auction_type_id = t.auction_type_id
            ORDER BY 
                a.start_time DESC;
        `;

        // 1. استخدم await لجلب كل النتائج من قاعدة البيانات
        const [results] = await db.query(query);

        // 2. نفس منطق تجميع الصور يبقى كما هو
        const auctions = results.reduce((acc, row) => {
            let auction = acc.find(a => a.auction_id === row.auction_id);
            
            if (!auction) {
                auction = {
                    auction_id: row.auction_id,
                    auction_number: row.auction_number,
                    title: row.title,
                    description: row.description,
                    start_price: row.start_price,
                    start_time: row.start_time,
                    end_time: row.end_time,
                    wilaya: row.wilaya,
                    commune: row.commune,
                    type_name: row.type_name,
                    images: [] // ابدأ بمصفوفة صور فارغة
                };
                acc.push(auction);
            }

            // أضف رابط الصورة فقط إذا كان موجوداً
            if (row.image_url) {
                auction.images.push(row.image_url);
            }
            
            return acc;
        }, []);

        // 3. أرسل النتائج المجمّعة كـ JSON
        res.json(auctions);

    } catch (error) {
        // 4. أي خطأ يحدث سيتم التقاطه هنا
        console.error('❌ Error fetching auctions:', error);
        res.status(500).send('Internal Server Error');
    }
});

// ✅ مسار تحديث المزاد (تمت إعادة كتابته بالكامل باستخدام async/await)
app.post('/update-auction/:id', upload.array('images', 30), async (req, res) => {
    
    // Use try...catch for unified error handling
    try {
        const auctionId = req.params.id;
        
        // ✅ Correction 1: Changed 'type_name' to 'type' to match the HTML form
        const { title, type, start_time, end_time, description, start_price, wilaya, commune } = req.body;
        
        // Get the full image URL from Cloudinary using file.path
        const newImageUrls = req.files ? req.files.map(file => file.path) : [];

        console.log('Updating auction with ID:', auctionId);
        console.log('Received body:', req.body);
        console.log('Received new image URLs:', newImageUrls);

        // 1. Update the main auction data in the Auctions table
        const updateAuctionQuery = `
            UPDATE Auctions 
            SET 
                title = ?, 
                description = ?, 
                start_price = ?, 
                auction_type_id = (SELECT auction_type_id FROM AuctionTypes WHERE type_name = ?), 
                start_time = ?, 
                end_time = ?, 
                wilaya = ?, 
                commune = ? 
            WHERE 
                auction_id = ?
        `;
        
        // ✅ Correction 2: Passed the correct 'type' variable to the query
        await db.query(updateAuctionQuery, [title, description, start_price, type, start_time, end_time, wilaya, commune, auctionId]);

        // 2. If new images are uploaded, delete the old ones and add the new ones
        if (newImageUrls.length > 0) {
            console.log('New images uploaded, replacing old ones...');
            
            // First, delete all old images for this auction
            await db.query('DELETE FROM Images WHERE auction_id = ?', [auctionId]);
            
            // Second, add all new images in a single, efficient query
            const imageValues = newImageUrls.map(url => [auctionId, url]);
            const imageQuery = 'INSERT INTO Images (auction_id, image_url) VALUES ?';
            await db.query(imageQuery, [imageValues]);
        }

        // 3. Send a success response
        res.json({ success: true, message: 'Auction updated successfully!' });

    } catch (error) {
        // Any error in the process will be caught here
        console.error('❌ Error updating auction:', error);
        res.status(500).json({ success: false, message: 'An error occurred on the server while updating the auction.' });
    }
});

// مسار الحصول على تفاصيل المزاد الواحد
// ✅ Route to fetch a single auction's data (Corrected with async/await)
app.get('/get-auction/:id', async (req, res) => {
    try {
        const auctionId = req.params.id;
        
        const query = `
            SELECT 
                a.auction_id, a.auction_number, a.title, a.description, a.start_price,
                a.start_time, a.end_time, a.wilaya, a.commune, 
                t.type_name, 
                i.image_url
            FROM 
                Auctions a
            LEFT JOIN 
                Images i ON a.auction_id = i.auction_id
            LEFT JOIN 
                AuctionTypes t ON a.auction_type_id = t.auction_type_id
            WHERE 
                a.auction_id = ?;
        `;

        // 1. Use await to fetch results from the database
        const [results] = await db.query(query, [auctionId]);

        // 2. Check if the auction was found
        if (results.length === 0) {
            return res.status(404).json({ message: 'Auction not found' });
        }

        // 3. The logic to group images into a single auction object remains the same
        const auctionDetails = results.reduce((acc, row) => {
            if (!acc.auction_id) {
                // If this is the first row, create the base auction object
                acc.auction_id = row.auction_id;
                acc.auction_number = row.auction_number;
                acc.title = row.title;
                acc.description = row.description;
                acc.start_price = row.start_price;
                acc.start_time = row.start_time;
                acc.end_time = row.end_time;
                acc.wilaya = row.wilaya;
                acc.commune = row.commune;
                acc.type_name = row.type_name;
                acc.images = []; // Start with an empty images array
            }
            
            // Add the image URL if it exists (to avoid adding null)
            if (row.image_url) {
                acc.images.push(row.image_url);
            }
            
            return acc;
        }, {});
        
        // 4. Send the grouped object as a JSON response
        res.json(auctionDetails);

    } catch (error) {
        // 5. Any error that occurs will be caught here
        console.error('❌ Error fetching single auction:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/get-statistics', async (req, res) => {
    try {
        const [totalUsers] = await db.query('SELECT COUNT(*) as count FROM Users');
        const [activeAuctions] = await db.query('SELECT COUNT(*) as count FROM Auctions WHERE NOW() BETWEEN start_time AND end_time');
        const [completedAuctions] = await db.query('SELECT COUNT(*) as count FROM Auctions WHERE end_time < NOW()');
        const [pendingAuctions] = await db.query('SELECT COUNT(*) as count FROM Auctions WHERE start_time > NOW()');
        const [totalAuctions] = await db.query('SELECT COUNT(*) as count FROM Auctions');
        const [totalBidders] = await db.query('SELECT COUNT(DISTINCT user_id) as count FROM Bids');

        res.json({
            total_users: totalUsers[0].count,
            active_auctions: activeAuctions[0].count,
            completed_auctions: completedAuctions[0].count,
            pending_auctions: pendingAuctions[0].count,
            total_auctions: totalAuctions[0].count,
            total_bidders: totalBidders[0].count,
        });

    } catch (error) {
        console.error('❌ خطأ في جلب الإحصائيات:', error);
        res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
    }
});

// مسار لحذف المزاد
// =================================================================
// مسار لحذف مزاد محدد (النسخة المصححة والنهائية)
// =================================================================
app.delete('/delete-auction/:id', async (req, res) => {
    try {
        const auctionId = req.params.id;

        // ملاحظة: أنت تحتاج فقط للحذف من جدول "Auctions".
        // خاصية "ON DELETE CASCADE" في قاعدة بياناتك ستقوم بحذف
        // الصور والمزايدات المرتبطة تلقائياً.
        
        const deleteQuery = 'DELETE FROM Auctions WHERE auction_id = ?';
        
        const [result] = await db.query(deleteQuery, [auctionId]);

        // التحقق مما إذا تم حذف أي صف
        if (result.affectedRows === 0) {
            // هذا يعني أنه لم يتم العثور على مزاد بهذا الرقم
            return res.status(404).json({ success: false, message: 'Auction not found' });
        }
        
        console.log(`✅ تم حذف المزاد رقم ${auctionId} بنجاح.`);
        res.json({ success: true, message: 'تم حذف المزاد بنجاح' });

    } catch (error) {
        console.error('❌ خطأ أثناء حذف المزاد:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// نقطة توقف لجلب بيانات المستخدمين
app.get('/get-users', (req, res) => {
    const sql = 'SELECT * FROM Users';
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});
app.get('/get-image', (req, res) => {
    const imageId = req.query.id.split('.').slice(0, -1).join('.'); // إزالة الامتداد من الاسم
    const possibleExtensions = ['.jpg', '.png', '.jpeg']; // قائمة الامتدادات الممكنة

    let imagePath;
    for (const ext of possibleExtensions) {
        const tempPath = path.join('D:/project-mazad/images-user/', imageId + ext);
        console.log(`Checking for file: ${tempPath}`); // تسجيل مسار الصورة المحاول التحقق منه
        if (fs.existsSync(tempPath)) {
            imagePath = tempPath;
            break;
        }
    }

    if (imagePath) {
        console.log(`Requesting image: ${imagePath}`);
        res.sendFile(imagePath, err => {
            if (err) {
                console.error(`Failed to send image: ${imagePath}`, err);
                res.status(404).send('Image not found');
            }
        });
    } else {
        console.error(`Image not found: ${imageId}`);
        res.status(404).send('Image not found');
    }
});
// =================================================================
// مسارات إدارة المستخدمين (النسخة المصححة بالكامل)
// =================================================================

// 1. مسار لجلب جميع المستخدمين
app.get('/get-all-users', async (req, res) => {
    try {
        // ✅ التصحيح: تمت إضافة `profile_picture` و `birth_date` إلى الاستعلام
        const query = `
            SELECT 
                user_id, username, first_name, last_name, email, 
                phone_number, status, profile_picture, birth_date 
            FROM Users 
            ORDER BY user_id DESC
        `;
        
        const [users] = await db.query(query);
        
        res.json(users);

    } catch (error) {
        console.error('❌ خطأ في جلب قائمة المستخدمين:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// 2. مسار لقبول مستخدم
// 💡 تم التغيير لاستخدام req.body بدلاً من req.query
app.post('/approve-user', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ success: false, message: 'اسم المستخدم مطلوب' });
        }
        const query = 'UPDATE Users SET status = "approved" WHERE username = ?';
        await db.query(query, [username]);
        res.json({ success: true, message: 'تم قبول المستخدم' });
    } catch (error) {
        console.error('❌ خطأ في قبول المستخدم:', error);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

// 3. مسار لرفض مستخدم
// 💡 تم التغيير لاستخدام req.body بدلاً من req.query
app.post('/reject-user', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ success: false, message: 'اسم المستخدم مطلوب' });
        }
        const query = 'UPDATE Users SET status = "rejected" WHERE username = ?';
        await db.query(query, [username]);
        res.json({ success: true, message: 'تم رفض المستخدم' });
    } catch (error) {
        console.error('❌ خطأ في رفض المستخدم:', error);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

// 4. مسار لحذف مستخدم
// 💡 تم تغيير app.post إلى app.delete وهو الإجراء الصحيح للحذف
// 💡 تم التغيير لاستخدام req.body بدلاً من req.query
app.delete('/delete-user', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ success: false, message: 'اسم المستخدم مطلوب' });
        }
        const query = 'DELETE FROM Users WHERE username = ?';
        await db.query(query, [username]);
        res.json({ success: true, message: 'تم حذف المستخدم' });
    } catch (error) {
        console.error('❌ خطأ في حذف المستخدم:', error);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

// فائزين مزادات
app.get('/auction-winners', (req, res) => {
  const query = `
    SELECT
      a.auction_id,
      a.title AS auction_name,
      at.type_name AS auction_type,
      a.wilaya AS state,
      a.commune AS city,
      a.start_time,
      a.end_time,
      w.winner_id AS user_id,
      u.first_name,
      u.last_name,
      u.username,
      u.email,
      u.phone_number AS phone,
      w.winning_amount AS last_bid_amount,
      w.ranking
    FROM WinnersRecords w
    JOIN Auctions a ON w.auction_id = a.auction_id
    JOIN Users u ON w.winner_id = u.user_id
    JOIN AuctionTypes at ON a.auction_type_id = at.auction_type_id
    ORDER BY a.auction_id, w.ranking
  `;

  db.query(query, (err, rows) => {
    if (err) {
      console.error('خطأ في جلب قائمة الفائزين:', err);
      return res.json({ success: false, error: 'خطأ في السيرفر' });
    }

    // نستخدم خريطة (Map) لتجميع الفائزين حسب المزاد
    const auctionsMap = new Map();

    rows.forEach(row => {
      if (!auctionsMap.has(row.auction_id)) {
        auctionsMap.set(row.auction_id, {
          auction_id: row.auction_id,
          auction_name: row.auction_name,
          auction_type: row.auction_type,
          state: row.state,
          city: row.city,
          start_time: row.start_time,
          end_time: row.end_time,
          last_bid_amount: row.last_bid_amount,
          winners: []
        });
      }
      auctionsMap.get(row.auction_id).winners.push({
        user_id: row.user_id,
        first_name: row.first_name,
        last_name: row.last_name,
        username: row.username,
        email: row.email,
        phone: row.phone,
        ranking: row.ranking
      });
    });

    // نحول الـ Map إلى مصفوفة ثم نرسلها
    const result = Array.from(auctionsMap.values());

    res.json({ success: true, data: result });
  });
});

server.listen(PORT, () => {
    console.log(`الخادم يعمل على المنفذ ${PORT}`);
});













