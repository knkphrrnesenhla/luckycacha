const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'data.json');

const INITIAL_DATA = {
    settings: {
        storeName: "LuckyCard Mystery Shop (ร้านสุ่มการ์ดออนไลน์)",
        promptpayId: "0812345678", // เบอร์พร้อมเพย์เริ่มต้น (เปลี่ยนได้ใน Admin)
        promptpayName: "ร้าน LuckyCard Trading & Gacha",
        autoApproveSlip: true, // ระบบอนุมัติสลิปอัตโนมัติเพื่อความสะดวกในการทดสอบ
        pointsPerBaht: 0.1, // ทุก 10 บาทได้ 1 พ้อยท์
        coinExchangeRate: 1 // 1 Coin = 1 THB
    },
    membershipTiers: [
        { id: 'bronze', name: 'Bronze Member', minSpend: 0, discountPct: 0, pointMultiplier: 1.0, badgeColor: '#94a3b8', icon: 'shield' },
        { id: 'silver', name: 'Silver Member', minSpend: 500, discountPct: 5, pointMultiplier: 1.2, badgeColor: '#38bdf8', icon: 'award' },
        { id: 'gold', name: 'Gold Member', minSpend: 2000, discountPct: 10, pointMultiplier: 1.5, badgeColor: '#fbbf24', icon: 'crown' },
        { id: 'diamond', name: 'Diamond VIP', minSpend: 5000, discountPct: 15, pointMultiplier: 2.0, badgeColor: '#a855f7', icon: 'gem' }
    ],
    packs: [
        {
            id: "pack_cyber",
            name: "Cyberpunk 2099 Legends",
            tagline: "การ์ดจักรกลไซเบอร์ มหาศึกโลกอนาคต ลุ้นรับการ์ดฟอยล์ทอง SSR!",
            price: 99,
            coverImage: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
            colorTheme: "from-cyan-500 to-blue-700",
            glowColor: "#06b6d4",
            cardsPerPack: 3,
            rates: { SSR: 5, SR: 15, R: 30, C: 50 },
            cardPool: [
                { id: "c_cyb_1", name: "Neon Dragon Overlord", rarity: "SSR", atk: 9999, def: 8800, element: "Cyber/Dragon", desc: "ราชามังกรนีออนแห่งชินจูกุ ผู้คุมกระแสพลังงานไซเบอร์ทั้งหมด", image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80" },
                { id: "c_cyb_2", name: "Cybernetic Valkyrie", rarity: "SSR", atk: 9500, def: 9200, element: "Light/Mecha", desc: "เทพธิดานักรบจักรกล ปีกแสงเลเซอร์ความร้อนสูงไร้เทียมทาน", image: "https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80" },
                { id: "c_cyb_3", name: "Phantom Hacker Zero", rarity: "SR", atk: 7800, def: 6500, element: "Dark/Hacker", desc: "แฮกเกอร์เงาผู้เจาะระบบสลายไฟร์วอลล์ได้ภายในพริบตา", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80" },
                { id: "c_cyb_4", name: "Mech Titan Aegis", rarity: "SR", atk: 6900, def: 8900, element: "Earth/Mecha", desc: "เกราะเหล็กไททัน ป้องกันการโจมตีระดับขีปนาวุธได้สบาย", image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80" },
                { id: "c_cyb_5", name: "Plasma Blade Ronin", rarity: "SR", atk: 7600, def: 6000, element: "Energy/Warrior", desc: "โรนินพเนจร ดาบพลาสมาตัดขาดทุกสสาร", image: "https://images.unsplash.com/photo-1569701814227-d40b4bc1ee0a?w=500&auto=format&fit=crop&q=80" },
                { id: "c_cyb_6", name: "Drone Recon Unit", rarity: "R", atk: 5200, def: 4800, element: "Wind/Machine", desc: "โดรนสอดแนมความเร็วเหนือเสียง ล็อคเป้าหมายอัตโนมัติ", image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=500&auto=format&fit=crop&q=80" },
                { id: "c_cyb_7", name: "Electric Fox Familiar", rarity: "R", atk: 4900, def: 5100, element: "Thunder/Beast", desc: "จิ้งจอกสายฟ้า ปล่อยกระแสไฟฟ้าแรงสูงปั่นป่วนคลื่นวิทยุ", image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&auto=format&fit=crop&q=80" },
                { id: "c_cyb_8", name: "Street Scavenger", rarity: "C", atk: 2800, def: 2500, element: "Neutral/Human", desc: "นักเก็บกู้เศษอะไหล่ไซเบอร์ในตรอกมืดของเมืองหลวง", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80" },
                { id: "c_cyb_9", name: "Security Bot Mk.II", rarity: "C", atk: 3100, def: 3400, element: "Machine/Guard", desc: "หุ่นยนต์ลาดตระเวนรักษาความปลอดภัยพื้นฐาน", image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&auto=format&fit=crop&q=80" },
                { id: "c_cyb_10", name: "Glitch Fragment", rarity: "C", atk: 2100, def: 2000, element: "Digital/Glitch", desc: "เศษเสี้ยวบั๊กข้อมูลที่ล่องลอยในเน็ตเวิร์ก", image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=80" }
            ]
        },
        {
            id: "pack_mythic",
            name: "Mythic Beasts & Gods",
            tagline: "มหาเทพเทวตำนานและสัตว์อสูรโบราณ การันตีความขลังทุกซอง!",
            price: 149,
            coverImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
            colorTheme: "from-amber-500 to-red-700",
            glowColor: "#f59e0b",
            cardsPerPack: 3,
            rates: { SSR: 6, SR: 18, R: 36, C: 40 },
            cardPool: [
                { id: "c_myt_1", name: "Celestial Phoenix Queen", rarity: "SSR", atk: 9800, def: 9400, element: "Fire/Divine", desc: "ราชินีนกฟีนิกซ์อมตะ คืนชีพจากเถ้าถ่านพร้อมเพลิงสุริยะ", image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80" },
                { id: "c_myt_2", name: "Abyssal Leviathan", rarity: "SSR", atk: 9600, def: 9700, element: "Water/Titan", desc: "อสูรกายยักษ์ใต้ทะเลลึก ก่อคลื่นยักษ์กลืนกินทั้งทวีป", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80" },
                { id: "c_myt_3", name: "Archangel of Dawn", rarity: "SR", atk: 8100, def: 7500, element: "Holy/Angel", desc: "อัครทูตสวรรค์แห่งรุ่งอรุณ ปัดเป่าความมืดด้วยหอกแสง", image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=80" },
                { id: "c_myt_4", name: "Thunder Griffin", rarity: "SR", atk: 7500, def: 7100, element: "Wind/Beast", desc: "กริฟฟอนสายฟ้า เจ้าแห่งยอดเขาสูง", image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80" },
                { id: "c_myt_5", name: "Forest Dryad Priestess", rarity: "R", atk: 4800, def: 6200, element: "Nature/Elf", desc: "ภูติพิทักษ์พงไพร ฟื้นฟูบาดแผลด้วยหยาดน้ำค้างศักดิ์สิทธิ์", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80" },
                { id: "c_myt_6", name: "Rune Guardian", rarity: "R", atk: 5400, def: 5800, element: "Rock/Golem", desc: "โกเลมหินสลักอักขระโบราณ แข็งแกร่งดั่งขุนเขา", image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&auto=format&fit=crop&q=80" },
                { id: "c_myt_7", name: "Goblin Raider", rarity: "C", atk: 2600, def: 2100, element: "Dark/Goblin", desc: "ก็อบลินจอมป่วน ออกล่าของวิเศษตามชายป่า", image: "https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80" },
                { id: "c_myt_8", name: "Emerald Slime", rarity: "C", atk: 1900, def: 3200, element: "Nature/Slime", desc: "สไลม์มรกต มีความยืดหยุ่นสูงทนแรงกระแทก", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80" }
            ]
        },
        {
            id: "pack_anime",
            name: "Magical Academy Chronicles",
            tagline: "การ์ดสาวน้อยเวทมนตร์และจอมเวทผู้พิทักษ์ ลิมิเต็ดอิดิชั่น!",
            price: 120,
            coverImage: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
            colorTheme: "from-pink-500 to-purple-800",
            glowColor: "#ec4899",
            cardsPerPack: 3,
            rates: { SSR: 5, SR: 20, R: 35, C: 40 },
            cardPool: [
                { id: "c_ani_1", name: "Chrono Sorceress Luna", rarity: "SSR", atk: 9950, def: 9100, element: "Time/Mage", desc: "แม่มดแห่งกาลเวลา ควบคุมอนาคตและย้อนอดีตได้ดั่งใจนึก", image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=80" },
                { id: "c_ani_2", name: "Flame Alchemist Ren", rarity: "SR", atk: 7900, def: 6400, element: "Fire/Alchemist", desc: "นักเล่นแร่แปรธาตุเพลิง รังสรรค์เปลวไฟสีฟ้าบริสุทธิ์", image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80" },
                { id: "c_ani_3", name: "Star Reader Mia", rarity: "R", atk: 5100, def: 5500, element: "Cosmic/Astrologer", desc: "ผู้ทำนายดวงดาว พยากรณ์ชะตาชีวิตแม่นยำ", image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80" },
                { id: "c_ani_4", name: "Academy Novice Cat", rarity: "C", atk: 2500, def: 2300, element: "Magic/Familiar", desc: "แมวน้อยฝึกหัด มักจะทำขวดยาเวทมนตร์ตกแตกเสมอ", image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&auto=format&fit=crop&q=80" }
            ]
        }
    ],
    users: [
        {
            id: "u_admin",
            email: "admin@luckycard.com",
            passwordHash: bcrypt.hashSync("admin123", 10),
            displayName: "Card Master (ผู้ดูแลระบบ)",
            role: "admin",
            phone: "0812345678",
            avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=AdminMaster",
            coins: 9999,
            points: 5000,
            totalSpent: 15000,
            tier: "diamond",
            address: {
                recipientName: "สมชาย การ์ดมาสเตอร์",
                phone: "0812345678",
                street: "88/9 อาคารการ์ดพลาซ่า ชั้น 5 ถนนสุขุมวิท",
                subdistrict: "คลองเตย",
                district: "คลองเตย",
                province: "กรุงเทพมหานคร",
                postalCode: "10110",
                note: "ส่งการ์ดใส่ซองบับเบิ้ลกันกระแทกอย่างดี"
            },
            createdAt: new Date().toISOString()
        },
        {
            id: "u_demo",
            email: "demo@user.com",
            passwordHash: bcrypt.hashSync("user123", 10),
            displayName: "น้องการ์ด มือสุ่มไว",
            role: "user",
            phone: "0899887766",
            avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=LuckyUser",
            coins: 500,
            points: 250,
            totalSpent: 650,
            tier: "silver",
            address: {
                recipientName: "คุณสมหญิง สายสุ่ม",
                phone: "0899887766",
                street: "123/45 หมู่บ้านสุขใจ ซอย 8",
                subdistrict: "บางหว้า",
                district: "ภาษีเจริญ",
                province: "กรุงเทพมหานคร",
                postalCode: "10160",
                note: "ฝากไว้ที่ป้อมยามหน้าหมู่บ้านได้เลยค่ะ"
            },
            createdAt: new Date().toISOString()
        }
    ],
    inventory: [
        {
            id: "inv_1",
            userId: "u_demo",
            cardId: "c_cyb_3",
            cardName: "Phantom Hacker Zero",
            rarity: "SR",
            element: "Dark/Hacker",
            atk: 7800,
            def: 6500,
            image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80",
            packId: "pack_cyber",
            obtainedAt: new Date(Date.now() - 86400000).toISOString(),
            physicalRedeemed: false
        },
        {
            id: "inv_2",
            userId: "u_demo",
            cardId: "c_cyb_6",
            cardName: "Drone Recon Unit",
            rarity: "R",
            element: "Wind/Machine",
            atk: 5200,
            def: 4800,
            image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=500&auto=format&fit=crop&q=80",
            packId: "pack_cyber",
            obtainedAt: new Date(Date.now() - 86400000).toISOString(),
            physicalRedeemed: false
        }
    ],
    orders: [
        {
            id: "ORD-DEMO-001",
            userId: "u_demo",
            userEmail: "demo@user.com",
            userName: "น้องการ์ด มือสุ่มไว",
            type: "pack_purchase",
            packId: "pack_cyber",
            packName: "Cyberpunk 2099 Legends",
            quantity: 1,
            subtotal: 99,
            discountAmount: 0,
            finalAmount: 99,
            paymentMethod: "promptpay",
            status: "completed", // pending, completed, rejected
            promptpayQrPayload: "00020101021129370016A000000677010111011300668123456785802TH5303764540599.006304ABCD",
            slipUrl: "/uploads/sample-slip.png",
            cardsWon: ["Phantom Hacker Zero (SR)", "Drone Recon Unit (R)", "Security Bot Mk.II (C)"],
            createdAt: new Date(Date.now() - 86400000).toISOString()
        }
    ]
};

class Database {
    constructor() {
        this.init();
    }

    init() {
        const dir = path.dirname(DB_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(DB_FILE)) {
            this.saveData(INITIAL_DATA);
        }
    }

    loadData() {
        try {
            const content = fs.readFileSync(DB_FILE, 'utf8');
            return JSON.parse(content);
        } catch (e) {
            console.error("Error reading database file, returning default data:", e);
            return INITIAL_DATA;
        }
    }

    saveData(data) {
        const tempFile = DB_FILE + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
        fs.renameSync(tempFile, DB_FILE);
    }

    // --- SETTINGS & TIERS ---
    getSettings() {
        return this.loadData().settings;
    }

    updateSettings(newSettings) {
        const data = this.loadData();
        data.settings = { ...data.settings, ...newSettings };
        this.saveData(data);
        return data.settings;
    }

    getTiers() {
        return this.loadData().membershipTiers;
    }

    calculateUserTier(totalSpent) {
        const tiers = this.getTiers();
        // Sort descending by minSpend
        const sorted = [...tiers].sort((a, b) => b.minSpend - a.minSpend);
        for (const t of sorted) {
            if (totalSpent >= t.minSpend) {
                return t;
            }
        }
        return tiers[0];
    }

    // --- USERS ---
    findUserByEmail(email) {
        const data = this.loadData();
        return data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    findUserById(id) {
        const data = this.loadData();
        const user = data.users.find(u => u.id === id);
        if (!user) return null;
        const tierInfo = this.calculateUserTier(user.totalSpent || 0);
        return { ...user, tierInfo };
    }

    createUser({ email, password, displayName, phone }) {
        const data = this.loadData();
        if (data.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            throw new Error("อีเมลนี้ถูกลงทะเบียนไว้แล้ว");
        }

        const newUser = {
            id: "u_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
            email: email.trim(),
            passwordHash: bcrypt.hashSync(password, 10),
            displayName: displayName ? displayName.trim() : email.split('@')[0],
            role: "user",
            phone: phone ? phone.trim() : "",
            avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName || email)}`,
            coins: 0,
            points: 0,
            totalSpent: 0,
            tier: "bronze",
            address: {
                recipientName: displayName || "",
                phone: phone || "",
                street: "",
                subdistrict: "",
                district: "",
                province: "",
                postalCode: "",
                note: ""
            },
            createdAt: new Date().toISOString()
        };

        data.users.push(newUser);
        this.saveData(data);
        return newUser;
    }

    updateUserProfile(userId, { displayName, phone, avatar, address }) {
        const data = this.loadData();
        const userIndex = data.users.findIndex(u => u.id === userId);
        if (userIndex === -1) throw new Error("ไม่พบบัญชีผู้ใช้");

        if (displayName) data.users[userIndex].displayName = displayName.trim();
        if (phone !== undefined) data.users[userIndex].phone = phone.trim();
        if (avatar) data.users[userIndex].avatar = avatar;
        if (address) {
            data.users[userIndex].address = {
                ...data.users[userIndex].address,
                ...address
            };
        }

        this.saveData(data);
        const updated = data.users[userIndex];
        return { ...updated, tierInfo: this.calculateUserTier(updated.totalSpent || 0) };
    }

    changePassword(userId, oldPassword, newPassword) {
        const data = this.loadData();
        const user = data.users.find(u => u.id === userId);
        if (!user) throw new Error("ไม่พบบัญชีผู้ใช้");

        if (!bcrypt.compareSync(oldPassword, user.passwordHash)) {
            throw new Error("รหัสผ่านเดิมไม่ถูกต้อง");
        }

        user.passwordHash = bcrypt.hashSync(newPassword, 10);
        this.saveData(data);
        return true;
    }

    adjustUserBalance(userId, { coinsDelta = 0, pointsDelta = 0, spentDelta = 0 }) {
        const data = this.loadData();
        const user = data.users.find(u => u.id === userId);
        if (!user) throw new Error("ไม่พบบัญชีผู้ใช้");

        user.coins = Math.max(0, (user.coins || 0) + coinsDelta);
        user.points = Math.max(0, (user.points || 0) + pointsDelta);
        user.totalSpent = Math.max(0, (user.totalSpent || 0) + spentDelta);

        const newTier = this.calculateUserTier(user.totalSpent);
        user.tier = newTier.id;

        this.saveData(data);
        return { ...user, tierInfo: newTier };
    }

    getAllUsers() {
        const data = this.loadData();
        return data.users.map(u => ({
            id: u.id,
            email: u.email,
            displayName: u.displayName,
            role: u.role,
            phone: u.phone,
            coins: u.coins,
            points: u.points,
            totalSpent: u.totalSpent,
            tier: u.tier,
            tierInfo: this.calculateUserTier(u.totalSpent || 0),
            createdAt: u.createdAt
        }));
    }

    // --- CARD PACKS ---
    getAllPacks() {
        return this.loadData().packs;
    }

    getPackById(packId) {
        return this.loadData().packs.find(p => p.id === packId);
    }

    savePack(pack) {
        const data = this.loadData();
        const idx = data.packs.findIndex(p => p.id === pack.id);
        if (idx >= 0) {
            data.packs[idx] = pack;
        } else {
            data.packs.push(pack);
        }
        this.saveData(data);
        return pack;
    }

    // --- INVENTORY ---
    getUserInventory(userId) {
        const data = this.loadData();
        return data.inventory.filter(item => item.userId === userId);
    }

    addCardsToInventory(userId, cards, packId) {
        const data = this.loadData();
        const newItems = cards.map(c => ({
            id: "inv_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
            userId,
            cardId: c.id,
            cardName: c.name,
            rarity: c.rarity,
            element: c.element,
            atk: c.atk,
            def: c.def,
            desc: c.desc,
            image: c.image,
            packId,
            obtainedAt: new Date().toISOString(),
            physicalRedeemed: false
        }));

        data.inventory.push(...newItems);
        this.saveData(data);
        return newItems;
    }

    requestPhysicalShipping(userId, inventoryIds, shippingAddress) {
        const data = this.loadData();
        const items = data.inventory.filter(i => i.userId === userId && inventoryIds.includes(i.id));
        if (items.length === 0) throw new Error("ไม่พบการ์ดที่ต้องการจัดส่ง");

        items.forEach(i => i.physicalRedeemed = true);

        // Create a delivery order record
        const deliveryOrder = {
            id: "DEL-" + Date.now().toString(36).toUpperCase(),
            userId,
            type: "physical_delivery",
            cardCount: items.length,
            cards: items.map(i => `${i.cardName} (${i.rarity})`),
            shippingAddress,
            status: "pending_shipment",
            trackingNumber: "",
            createdAt: new Date().toISOString()
        };

        if (!data.deliveryOrders) data.deliveryOrders = [];
        data.deliveryOrders.push(deliveryOrder);

        this.saveData(data);
        return deliveryOrder;
    }

    // --- ORDERS ---
    createOrder(orderData) {
        const data = this.loadData();
        const order = {
            id: "ORD-" + Date.now().toString().slice(-6) + "-" + Math.random().toString(36).substr(2, 3).toUpperCase(),
            createdAt: new Date().toISOString(),
            status: "pending",
            ...orderData
        };
        data.orders.unshift(order);
        this.saveData(data);
        return order;
    }

    getOrderById(orderId) {
        return this.loadData().orders.find(o => o.id === orderId);
    }

    getUserOrders(userId) {
        return this.loadData().orders.filter(o => o.userId === userId);
    }

    getAllOrders() {
        return this.loadData().orders;
    }

    updateOrderStatus(orderId, status, extra = {}) {
        const data = this.loadData();
        const order = data.orders.find(o => o.id === orderId);
        if (!order) throw new Error("ไม่พบคำสั่งซื้อ");

        order.status = status;
        Object.assign(order, extra);
        this.saveData(data);
        return order;
    }
}

module.exports = new Database();
