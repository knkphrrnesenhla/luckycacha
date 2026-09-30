const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const db = require('./db/database');
const promptpayService = require('./services/promptpayService');
const gachaService = require('./services/gachaService');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage for payment slips
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.png';
        const unique = Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        cb(null, `slip_${unique}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'public')));

// Simple Auth Helper Middleware (Demo uses Token/Header or query for seamless experience)
function getAuthUser(req) {
    const userId = req.headers['x-user-id'] || req.query.userId;
    if (!userId) return null;
    return db.findUserById(userId);
}

// ==========================================
// 1. AUTH & PROFILE APIS
// ==========================================

// สมัครสมาชิก
app.post('/api/auth/register', (req, res) => {
    try {
        const { email, password, displayName, phone } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" });
        }
        const user = db.createUser({ email, password, displayName, phone });
        const userWithTier = db.findUserById(user.id);
        delete userWithTier.passwordHash;
        res.json({ success: true, user: userWithTier });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// เข้าสู่ระบบ
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" });
        }
        const user = db.findUserByEmail(email);
        if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
            return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        }
        const userWithTier = db.findUserById(user.id);
        delete userWithTier.passwordHash;
        res.json({ success: true, user: userWithTier });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ดึงข้อมูลโปรไฟล์ปัจจุบัน
app.get('/api/auth/me', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "ยังไม่ได้เข้าสู่ระบบ" });
    delete user.passwordHash;
    res.json({ user });
});

// อัปเดตข้อมูลโปรไฟล์เบื้องหลัง (ชื่อ, เบอร์, Avatar, ที่อยู่จัดส่ง)
app.put('/api/user/profile', (req, res) => {
    try {
        const user = getAuthUser(req);
        if (!user) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });

        const { displayName, phone, avatar, address } = req.body;
        const updated = db.updateUserProfile(user.id, { displayName, phone, avatar, address });
        delete updated.passwordHash;
        res.json({ success: true, user: updated, message: "อัปเดตโปรไฟล์เรียบร้อยแล้ว" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// เปลี่ยนรหัสผ่าน
app.put('/api/user/password', (req, res) => {
    try {
        const user = getAuthUser(req);
        if (!user) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });

        const { oldPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" });
        }
        db.changePassword(user.id, oldPassword, newPassword);
        res.json({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ดึงสมุดสะสมการ์ด (Card Inventory) ของผู้ใช้
app.get('/api/user/inventory', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });

    const cards = db.getUserInventory(user.id);
    res.json({ cards });
});

// ดึงประวัติคำสั่งซื้อของผู้ใช้
app.get('/api/user/orders', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });

    const orders = db.getUserOrders(user.id);
    res.json({ orders });
});

// ร้องขอจัดส่งการ์ดจริงไปที่บ้าน
app.post('/api/user/redeem-shipping', (req, res) => {
    try {
        const user = getAuthUser(req);
        if (!user) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });

        const { inventoryIds, shippingAddress } = req.body;
        if (!inventoryIds || !Array.isArray(inventoryIds) || inventoryIds.length === 0) {
            return res.status(400).json({ error: "กรุณาเลือกการ์ดที่ต้องการส่งพัสดุ" });
        }

        const addr = shippingAddress || user.address;
        if (!addr || !addr.recipientName || !addr.street || !addr.province || !addr.postalCode) {
            return res.status(400).json({ error: "กรุณากรอกข้อมูลที่อยู่จัดส่งให้ครบถ้วนในโปรไฟล์" });
        }

        const delivery = db.requestPhysicalShipping(user.id, inventoryIds, addr);
        res.json({
            success: true,
            message: `บันทึกคำขอจัดส่งพัสดุการ์ดจำนวน ${inventoryIds.length} ใบเรียบร้อยแล้ว! ทีมงานจะดำเนินการแพ็คการ์ดและแจ้งเลขแทร็กกิ้ง`,
            delivery
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==========================================
// 2. SHOP & GACHA PACKS
// ==========================================

// ดึงรายการซองการ์ดทั้งหมด
app.get('/api/packs', (req, res) => {
    const packs = db.getAllPacks();
    const tiers = db.getTiers();
    const settings = db.getSettings();
    res.json({ packs, tiers, settings });
});

// ดึงข้อมูลซองเดียวพร้อมรายละเอียดการ์ดในพูล
app.get('/api/packs/:id', (req, res) => {
    const pack = db.getPackById(req.params.id);
    if (!pack) return res.status(404).json({ error: "ไม่พบซองการ์ดนี้" });
    res.json({ pack });
});

// เปิดซองสุ่มทันทีด้วยเหรียญในกระเป๋า (Coins)
app.post('/api/packs/open-with-coins', (req, res) => {
    try {
        const user = getAuthUser(req);
        if (!user) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });

        const { packId, packCount = 1 } = req.body;
        const pack = db.getPackById(packId);
        if (!pack) return res.status(404).json({ error: "ไม่พบซองการ์ดที่ระบุ" });

        // คำนวณส่วนลดตาม Tier
        const tier = user.tierInfo || db.calculateUserTier(user.totalSpent || 0);
        const subtotal = pack.price * packCount;
        const discountAmount = Math.round(subtotal * (tier.discountPct / 100));
        const finalAmount = Math.max(0, subtotal - discountAmount);

        if ((user.coins || 0) < finalAmount) {
            return res.status(400).json({
                error: `เหรียญ Coins ไม่เพียงพอ (ต้องการ ${finalAmount} Coins, มีอยู่ ${user.coins || 0} Coins) สามารถเติมเงินผ่าน PromptPay ได้เลยครับ`
            });
        }

        // หักเงิน Coins และให้พ้อยท์
        const pointsEarned = Math.round(finalAmount * 0.1 * (tier.pointMultiplier || 1.0));
        const updatedUser = db.adjustUserBalance(user.id, {
            coinsDelta: -finalAmount,
            pointsDelta: pointsEarned,
            spentDelta: finalAmount
        });

        // สุ่มการ์ด
        const gachaResult = gachaService.rollPacks(pack, packCount, tier);

        // บันทึกลงคลังการ์ดของผู้ใช้
        const addedInventory = db.addCardsToInventory(user.id, gachaResult.cards, pack.id);

        // สร้างบันทึกคำสั่งซื้อ
        const order = db.createOrder({
            userId: user.id,
            userEmail: user.email,
            userName: user.displayName,
            type: "pack_purchase",
            packId: pack.id,
            packName: pack.name,
            quantity: packCount,
            subtotal,
            discountAmount,
            finalAmount,
            paymentMethod: "coins",
            status: "completed",
            cardsWon: gachaResult.cards.map(c => `${c.name} (${c.rarity})`)
        });

        delete updatedUser.passwordHash;

        res.json({
            success: true,
            gachaResult,
            addedInventory,
            order,
            user: updatedUser,
            pointsEarned,
            message: `เปิดซองสำเร็จ! ได้รับการ์ดใหม่ ${gachaResult.cards.length} ใบ และรับ ${pointsEarned} Points!`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 3. PROMPTPAY QR PAYMENT & SLIP UPLOAD
// ==========================================

// สร้าง QR Code พร้อมเพย์สำหรับชำระเงิน
app.post('/api/payment/create-qr', async (req, res) => {
    try {
        const user = getAuthUser(req);
        const { type, packId, packCount = 1, topupAmount } = req.body;
        const settings = db.getSettings();

        let subtotal = 0;
        let discountAmount = 0;
        let finalAmount = 0;
        let packName = "";
        let tier = user ? (user.tierInfo || db.calculateUserTier(user.totalSpent || 0)) : null;

        if (type === 'topup') {
            finalAmount = parseFloat(topupAmount);
            if (isNaN(finalAmount) || finalAmount < 20) {
                return res.status(400).json({ error: "ยอดเติมเงินขั้นต่ำ 20 บาท" });
            }
            subtotal = finalAmount;
        } else {
            // type === 'pack_purchase'
            const pack = db.getPackById(packId);
            if (!pack) return res.status(404).json({ error: "ไม่พบซองการ์ด" });
            packName = pack.name;
            subtotal = pack.price * parseInt(packCount || 1);

            const discountPct = tier ? tier.discountPct : 0;
            discountAmount = Math.round(subtotal * (discountPct / 100));
            finalAmount = Math.max(1, subtotal - discountAmount);
        }

        // สร้าง PromptPay Payload & Base64 QR Image
        const qrResult = await promptpayService.generateQRCodeDataURL(settings.promptpayId, finalAmount);

        // บันทึก Pending Order
        const order = db.createOrder({
            userId: user ? user.id : 'guest',
            userEmail: user ? user.email : (req.body.email || 'guest@luckycard.com'),
            userName: user ? user.displayName : (req.body.displayName || 'ลูกค้าทั่วไป'),
            type: type || 'pack_purchase',
            packId: packId || null,
            packName: packName || 'เติมเหรียญกระเป๋า',
            quantity: packCount,
            subtotal,
            discountAmount,
            finalAmount,
            paymentMethod: 'promptpay',
            status: 'pending',
            promptpayQrPayload: qrResult.payload
        });

        res.json({
            success: true,
            orderId: order.id,
            finalAmount,
            subtotal,
            discountAmount,
            promptpayId: settings.promptpayId,
            promptpayName: settings.promptpayName,
            qrDataUrl: qrResult.qrDataUrl,
            order
        });
    } catch (err) {
        console.error("Error creating QR:", err);
        res.status(500).json({ error: err.message });
    }
});

// อัปโหลดสลิปโอนเงินยืนยันการชำระเงิน
app.post('/api/payment/upload-slip', upload.single('slip'), async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!orderId) {
            return res.status(400).json({ error: "ไม่พบเลขอ้างอิงคำสั่งซื้อ (orderId)" });
        }

        const order = db.getOrderById(orderId);
        if (!order) {
            return res.status(404).json({ error: "ไม่พบคำสั่งซื้อนี้" });
        }

        if (order.status === 'completed') {
            return res.status(400).json({ error: "คำสั่งซื้อนี้ได้รับการยืนยันเรียบร้อยแล้ว" });
        }

        const slipUrl = req.file ? `/uploads/${req.file.filename}` : '/uploads/sample-slip.png';
        const settings = db.getSettings();

        // หากเปิดระบบ Auto Approve (หรือกดเทส)
        if (settings.autoApproveSlip) {
            const fulfillment = await fulfillOrder(order, slipUrl);
            return res.json({
                success: true,
                status: 'completed',
                message: "ระบบตรวจสอบสลิปเรียบร้อยแล้ว! การชำระเงินสำเร็จทันที",
                order: fulfillment.order,
                gachaResult: fulfillment.gachaResult,
                user: fulfillment.user
            });
        } else {
            // รอแอดมินอนุมัติ
            const updatedOrder = db.updateOrderStatus(order.id, 'slip_submitted', { slipUrl });
            return res.json({
                success: true,
                status: 'slip_submitted',
                message: "แนบสลิปเรียบร้อยแล้ว รอผู้ดูแลระบบตรวจสอบยอดเงิน",
                order: updatedOrder
            });
        }
    } catch (err) {
        console.error("Error handling slip upload:", err);
        res.status(500).json({ error: err.message });
    }
});

// ปุ่มจำลองยืนยันชำระเงินสำเร็จทันที (สำหรับทดสอบ Demo โดยไม่ต้องโอนจริง)
app.post('/api/payment/confirm-demo', async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = db.getOrderById(orderId);
        if (!order) return res.status(404).json({ error: "ไม่พบคำสั่งซื้อ" });

        if (order.status === 'completed') {
            return res.status(400).json({ error: "คำสั่งซื้อนี้เสร็จสมบูรณ์แล้ว" });
        }

        const fulfillment = await fulfillOrder(order, 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400');
        res.json({
            success: true,
            message: "จำลองการชำระเงินสำเร็จเรียบร้อย!",
            order: fulfillment.order,
            gachaResult: fulfillment.gachaResult,
            user: fulfillment.user
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ฟังก์ชันช่วยทำกระบวนการส่งมอบสินค้าหลังจากชำระเงินสำเร็จ
async function fulfillOrder(order, slipUrl) {
    let gachaResult = null;
    let user = order.userId !== 'guest' ? db.findUserById(order.userId) : null;
    const cardsWon = [];

    if (order.type === 'pack_purchase') {
        const pack = db.getPackById(order.packId);
        if (pack) {
            const tier = user ? (user.tierInfo || db.calculateUserTier(user.totalSpent || 0)) : null;
            gachaResult = gachaService.rollPacks(pack, order.quantity || 1, tier);

            if (user) {
                db.addCardsToInventory(user.id, gachaResult.cards, pack.id);
            }
            cardsWon.push(...gachaResult.cards.map(c => `${c.name} (${c.rarity})`));
        }
    }

    // ปรับยอดเงิน/พ้อยท์ของผู้ใช้
    if (user) {
        const coinsToAdd = (order.type === 'topup') ? order.finalAmount : 0;
        const pointsToAdd = Math.round(order.finalAmount * 0.1 * (user.tierInfo?.pointMultiplier || 1.0));

        user = db.adjustUserBalance(user.id, {
            coinsDelta: coinsToAdd,
            pointsDelta: pointsToAdd,
            spentDelta: order.finalAmount
        });
        delete user.passwordHash;
    }

    const updatedOrder = db.updateOrderStatus(order.id, 'completed', {
        slipUrl,
        cardsWon,
        completedAt: new Date().toISOString()
    });

    return { order: updatedOrder, gachaResult, user };
}

// ==========================================
// 4. ADMIN APIS (การตั้งค่าเบื้องหลังร้านค้า)
// ==========================================

// Middleware ตรวจสอบสิทธิ์ Admin
function requireAdmin(req, res, next) {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "ต้องใช้สิทธิ์ผู้ดูแลระบบ (Admin) เท่านั้น" });
    }
    next();
}

// สถิติภาพรวมร้านค้า
app.get('/api/admin/overview', requireAdmin, (req, res) => {
    const orders = db.getAllOrders();
    const users = db.getAllUsers();
    const packs = db.getAllPacks();

    const completedOrders = orders.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0);
    const totalPacksSold = completedOrders.filter(o => o.type === 'pack_purchase').reduce((sum, o) => sum + (o.quantity || 1), 0);
    const pendingSlips = orders.filter(o => o.status === 'slip_submitted').length;

    res.json({
        totalRevenue,
        totalOrders: orders.length,
        totalPacksSold,
        totalUsers: users.length,
        pendingSlips,
        recentOrders: orders.slice(0, 10),
        packsCount: packs.length
    });
});

// รายการคำสั่งซื้อทั้งหมดในระบบ
app.get('/api/admin/orders', requireAdmin, (req, res) => {
    res.json({ orders: db.getAllOrders() });
});

// อนุมัติสลิปโอนเงิน (Admin กดอนุมัติ)
app.post('/api/admin/orders/:id/approve', requireAdmin, async (req, res) => {
    try {
        const order = db.getOrderById(req.params.id);
        if (!order) return res.status(404).json({ error: "ไม่พบคำสั่งซื้อ" });
        if (order.status === 'completed') return res.status(400).json({ error: "อนุมัติไปแล้ว" });

        const fulfillment = await fulfillOrder(order, order.slipUrl || '/uploads/sample-slip.png');
        res.json({
            success: true,
            message: `อนุมัติคำสั่งซื้อ ${order.id} สำเร็จเรียบร้อย!`,
            order: fulfillment.order
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ปฏิเสธสลิป / ยกเลิกคำสั่งซื้อ
app.post('/api/admin/orders/:id/reject', requireAdmin, (req, res) => {
    try {
        const { reason } = req.body;
        const order = db.updateOrderStatus(req.params.id, 'rejected', { rejectReason: reason || 'สลิปไม่ถูกต้อง' });
        res.json({ success: true, message: "ปฏิเสธคำสั่งซื้อแล้ว", order });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ดึง/บันทึกการตั้งค่าร้านค้า (PromptPay, Auto Approve, ฯลฯ)
app.get('/api/admin/settings', requireAdmin, (req, res) => {
    res.json({ settings: db.getSettings(), tiers: db.getTiers() });
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const updated = db.updateSettings(req.body);
    res.json({ success: true, settings: updated, message: "บันทึกการตั้งค่าระบบเรียบร้อยแล้ว" });
});

// จัดการสมาชิก (Users)
app.get('/api/admin/users', requireAdmin, (req, res) => {
    res.json({ users: db.getAllUsers() });
});

app.put('/api/admin/users/:id/adjust', requireAdmin, (req, res) => {
    try {
        const { coinsDelta, pointsDelta, spentDelta } = req.body;
        const updated = db.adjustUserBalance(req.params.id, {
            coinsDelta: parseInt(coinsDelta || 0),
            pointsDelta: parseInt(pointsDelta || 0),
            spentDelta: parseInt(spentDelta || 0)
        });
        delete updated.passwordHash;
        res.json({ success: true, user: updated, message: "ปรับยอดบัญชีสมาชิกเรียบร้อยแล้ว" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// บันทึก/เพิ่มซองการ์ดใหม่
app.post('/api/admin/packs', requireAdmin, (req, res) => {
    try {
        const newPack = db.savePack(req.body);
        res.json({ success: true, pack: newPack, message: "บันทึกซองการ์ดเรียบร้อย" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Fallback to index.html for Single Page Application
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 LuckyCard Shop Server running at http://localhost:${PORT}`);
    console.log(`📦 Gacha Card System, Membership Tiers, PromptPay QR Ready!`);
    console.log(`=======================================================`);
});
