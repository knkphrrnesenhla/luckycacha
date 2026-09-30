// Main Application Logic for LuckyCard Shop
class App {
    constructor() {
        this.currentTab = 'shop';
        this.adminSubtab = 'settings';
        this.packs = [];
        this.tiers = [];
        this.settings = {};
        this.userInventory = [];
        this.selectedInventoryIds = new Set();
        this.activePaymentOrder = null;
        this.authMode = 'login'; // 'login' or 'register'
        this.activeGachaResult = null;
        this.currentBinderFilter = 'ALL';
    }

    async init() {
        // Check logged in user
        if (API.currentUser) {
            await API.refreshProfile();
        } else {
            // Auto login as demo user for great first-time impression
            try {
                await API.login('demo@user.com', 'user123');
            } catch (e) {
                console.warn("Could not auto-login demo:", e);
            }
        }

        // Load initial shop data
        await this.loadShopData();
        this.renderHeader();
        this.renderShop();

        // Event listener for user updates
        window.addEventListener('user-changed', () => {
            this.renderHeader();
            this.renderShop();
            if (this.currentTab === 'binder') this.loadBinder();
            if (this.currentTab === 'membership') this.renderMembership();
            if (this.currentTab === 'profile') this.renderProfile();
            if (this.currentTab === 'orders') this.loadOrders();
        });
    }

    // --- TAB NAVIGATION ---
    switchTab(tabName) {
        this.currentTab = tabName;

        // Update Nav Buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.className = 'nav-btn px-4 py-2 rounded-lg text-sm font-medium transition text-slate-400 hover:text-slate-200 hover:bg-slate-800/60';
        });
        const activeNav = document.getElementById(`nav-${tabName}`);
        if (activeNav) {
            if (tabName === 'admin') {
                activeNav.className = 'nav-btn px-4 py-2 rounded-lg text-sm font-medium transition text-amber-400 bg-amber-950/40 border border-amber-800/50';
            } else {
                activeNav.className = 'nav-btn px-4 py-2 rounded-lg text-sm font-medium transition text-purple-400 bg-purple-950/40 border border-purple-800/50';
            }
        }

        // Hide all sections
        ['shop', 'binder', 'membership', 'profile', 'orders', 'admin'].forEach(t => {
            const el = document.getElementById(`view-${t}`);
            if (el) el.classList.add('hidden');
        });

        // Show active section
        const activeView = document.getElementById(`view-${tabName}`);
        if (activeView) activeView.classList.remove('hidden');

        // Trigger tab specific loads
        if (tabName === 'shop') this.renderShop();
        if (tabName === 'binder') this.loadBinder();
        if (tabName === 'membership') this.renderMembership();
        if (tabName === 'profile') this.renderProfile();
        if (tabName === 'orders') this.loadOrders();
        if (tabName === 'admin') this.loadAdmin();
    }

    // --- LOAD SHOP DATA ---
    async loadShopData() {
        try {
            const data = await API.getPacks();
            this.packs = data.packs;
            this.tiers = data.tiers;
            this.settings = data.settings;
        } catch (err) {
            this.showAlert("ไม่สามารถโหลดข้อมูลสินค้าได้: " + err.message, "error");
        }
    }

    // --- RENDER HEADER ---
    renderHeader() {
        const userArea = document.getElementById('header-user-area');
        const user = API.currentUser;

        if (!user) {
            userArea.innerHTML = `
        <button onclick="app.openAuthModal('login')" class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs sm:text-sm shadow-md transition">
          <i class="fa-solid fa-right-to-bracket mr-1.5"></i> เข้าสู่ระบบ
        </button>
      `;
            return;
        }

        const tier = user.tierInfo || { name: 'Bronze Member', badgeColor: '#94a3b8' };

        userArea.innerHTML = `
      <!-- Coins Balance -->
      <button onclick="app.openTopupModal()" class="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs transition">
        <span class="text-amber-400 font-bold font-orbitron">${user.coins || 0}</span>
        <span class="text-amber-400">🪙</span>
      </button>

      <!-- Points Balance -->
      <button onclick="app.switchTab('membership')" class="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs transition">
        <span class="text-purple-400 font-bold font-orbitron">${user.points || 0}</span>
        <span class="text-purple-400">✨</span>
      </button>

      <!-- User Profile Dropdown Pill -->
      <div class="relative group">
        <button onclick="app.switchTab('profile')" class="flex items-center space-x-2 p-1.5 pr-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-xs transition">
          <img src="${user.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lucky'}" class="w-7 h-7 rounded-lg bg-slate-900 object-cover">
          <div class="text-left hidden md:block">
            <div class="font-bold text-slate-200 truncate max-w-[100px]">${user.displayName || user.email}</div>
            <div class="text-[10px]" style="color: ${tier.badgeColor}">${tier.name}</div>
          </div>
          <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 ml-1"></i>
        </button>

        <!-- Dropdown Menu -->
        <div class="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1 hidden group-hover:block z-50">
          <div class="px-4 py-2 border-b border-slate-800">
            <p class="text-xs font-bold text-white truncate">${user.displayName}</p>
            <p class="text-[10px] text-slate-400 truncate">${user.email}</p>
          </div>
          <a href="#" onclick="app.switchTab('profile'); return false;" class="block px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white">
            <i class="fa-solid fa-user-gear mr-2 text-purple-400"></i>การตั้งค่าโปรไฟล์
          </a>
          <a href="#" onclick="app.switchTab('binder'); return false;" class="block px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white">
            <i class="fa-solid fa-book mr-2 text-blue-400"></i>คลังการ์ดสะสม
          </a>
          <a href="#" onclick="app.switchTab('orders'); return false;" class="block px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white">
            <i class="fa-solid fa-receipt mr-2 text-emerald-400"></i>คำสั่งซื้อของฉัน
          </a>
          ${user.role === 'admin' ? `
            <a href="#" onclick="app.switchTab('admin'); return false;" class="block px-4 py-2 text-xs text-amber-400 hover:bg-amber-950/40">
              <i class="fa-solid fa-shield-halved mr-2"></i>ระบบแอดมิน
            </a>
          ` : ''}
          <div class="border-t border-slate-800 mt-1"></div>
          <a href="#" onclick="API.logout(); return false;" class="block px-4 py-2 text-xs text-red-400 hover:bg-slate-800">
            <i class="fa-solid fa-right-from-bracket mr-2"></i>ออกจากระบบ
          </a>
        </div>
      </div>
    `;
    }

    // --- RENDER SHOP PACKS ---
    renderShop() {
        const user = API.currentUser;
        const tier = user ? (user.tierInfo || { discountPct: 0, name: 'Bronze' }) : { discountPct: 0, name: 'Bronze' };

        // Member Perk Banner
        const perkBanner = document.getElementById('shop-member-perk-card');
        if (user) {
            perkBanner.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center text-amber-400 text-lg">
            <i class="fa-solid fa-crown"></i>
          </div>
          <div>
            <div class="text-sm font-bold text-white flex items-center">
              สิทธิพิเศษเมมเบอร์: <span class="ml-1 text-purple-300 font-semibold">${tier.name}</span>
              ${tier.discountPct > 0 ? `<span class="ml-2 px-2 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ลดทันที ${tier.discountPct}% ทุกซอง!</span>` : ''}
            </div>
            <p class="text-xs text-slate-400">ยอดสะสมของคุณ: ${(user.totalSpent || 0).toLocaleString()} ฿ (รับ Points x${tier.pointMultiplier || 1})</p>
          </div>
        </div>
        <button onclick="app.switchTab('membership')" class="text-xs text-purple-400 hover:text-purple-300 underline font-medium whitespace-nowrap ml-2">
          ดูสิทธิประโยชน์ VIP <i class="fa-solid fa-arrow-right ml-1"></i>
        </button>
      `;
        } else {
            perkBanner.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-amber-900/40 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg">
            <i class="fa-solid fa-gift"></i>
          </div>
          <div>
            <div class="text-sm font-bold text-white">สมัครสมาชิกรับส่วนลดและสะสมแต้มแลกการ์ดฟรี!</div>
            <p class="text-xs text-slate-400">เข้าสู่ระบบเพื่อรับส่วนลดสมาชิกสูงสุด 15% พร้อมตัวคูณแต้ม 2x</p>
          </div>
        </div>
        <button onclick="app.openAuthModal('register')" class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold whitespace-nowrap ml-2">
          สมัครเลย
        </button>
      `;
        }

        // Render Packs
        const container = document.getElementById('packs-container');
        container.innerHTML = this.packs.map(pack => {
            const discountAmount = Math.round(pack.price * (tier.discountPct / 100));
            const finalPrice = Math.max(1, pack.price - discountAmount);
            const multiPrice = finalPrice * 10;

            return `
        <div class="group relative rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 p-5 space-y-4 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-900/20 flex flex-col justify-between">
          
          <div class="space-y-3">
            <!-- Cover Art -->
            <div class="relative h-48 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
              <img src="${pack.coverImage}" alt="${pack.name}" class="w-full h-full object-cover transition transform duration-500 group-hover:scale-105">
              <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
              
              <!-- Pack Badge -->
              <div class="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-950/80 backdrop-blur-md text-purple-300 border border-purple-500/30 font-orbitron">
                ${pack.cardsPerPack || 3} CARDS / PACK
              </div>

              <!-- Rates Pill -->
              <div class="absolute top-3 right-3 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                SSR: ${pack.rates?.SSR || 5}%
              </div>

              <!-- Pack Title on Image -->
              <div class="absolute bottom-3 left-3 right-3">
                <h3 class="text-lg font-bold text-white leading-tight drop-shadow-md">${pack.name}</h3>
              </div>
            </div>

            <p class="text-xs text-slate-400 line-clamp-2">${pack.tagline}</p>

            <!-- Drop Rates Breakdown -->
            <div class="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-[11px] grid grid-cols-4 gap-1 text-center font-orbitron">
              <div class="text-amber-400"><span class="text-[9px] block text-slate-500">SSR</span>${pack.rates?.SSR || 5}%</div>
              <div class="text-purple-400"><span class="text-[9px] block text-slate-500">SR</span>${pack.rates?.SR || 15}%</div>
              <div class="text-cyan-400"><span class="text-[9px] block text-slate-500">R</span>${pack.rates?.R || 30}%</div>
              <div class="text-slate-400"><span class="text-[9px] block text-slate-500">C</span>${pack.rates?.C || 50}%</div>
            </div>

            <!-- Price Display -->
            <div class="flex items-baseline space-x-2 pt-1">
              <div class="text-2xl font-black text-amber-400 font-orbitron">${finalPrice} ฿</div>
              ${discountAmount > 0 ? `
                <div class="text-xs text-slate-500 line-through">${pack.price} ฿</div>
                <span class="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">ประหยัด ${discountAmount}฿</span>
              ` : ''}
              <span class="text-xs text-slate-400">/ ซอง</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="space-y-2 pt-2 border-t border-slate-800/80">
            <!-- 1 Pack Pull Button -->
            <div class="grid grid-cols-2 gap-2">
              <button onclick="app.buyWithPromptPay('${pack.id}', 1)" class="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs border border-cyan-500/30 transition flex items-center justify-center">
                <i class="fa-solid fa-qrcode mr-1.5"></i> สแกนจ่าย 1 ซอง
              </button>
              <button onclick="app.openWithCoins('${pack.id}', 1)" class="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition shadow-md shadow-purple-600/20 flex items-center justify-center">
                <i class="fa-solid fa-coins mr-1.5 text-amber-300"></i> ${finalPrice} Coins
              </button>
            </div>

            <!-- 10 Pack Multi-Pull (with Guarantee SR+) -->
            <button onclick="app.buyWithPromptPay('${pack.id}', 10)" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-purple-600/20 to-pink-500/20 hover:from-amber-500/30 hover:to-pink-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs transition flex items-center justify-center">
              <i class="fa-solid fa-wand-magic-sparkles mr-1.5 text-amber-400"></i> สุ่มยกบ็อกซ์ 10 ซอง (${multiPrice} ฿) <span class="ml-1 text-[10px] text-pink-300 font-normal">[การันตี SR+]</span>
            </button>
          </div>

        </div>
      `;
        }).join('');
    }

    // --- GACHA OPENING FLOW ---
    async openWithCoins(packId, count = 1) {
        if (!API.currentUser) {
            this.openAuthModal('login');
            return;
        }

        try {
            const res = await API.openWithCoins(packId, count);
            this.showAlert(res.message, "success");
            this.startGachaAnimation(res.gachaResult);
        } catch (err) {
            this.showAlert(err.message, "error");
        }
    }

    startGachaAnimation(gachaResult) {
        this.activeGachaResult = gachaResult;
        const modal = document.getElementById('gacha-modal');
        const stagePack = document.getElementById('gacha-stage-pack');
        const stageReveal = document.getElementById('gacha-stage-reveal');
        const packTitle = document.getElementById('gacha-pack-title');

        packTitle.innerText = `${gachaResult.packName} (${gachaResult.cards.length} ใบ)`;

        stagePack.classList.remove('hidden');
        stageReveal.classList.add('hidden');
        modal.classList.remove('hidden');

        // Trigger initial whoosh
        window.soundEngine.playCardFlip();
    }

    ripPack() {
        const packArt = document.getElementById('gacha-pack-art');
        packArt.classList.add('anim-tear');
        window.soundEngine.playPackTear();

        setTimeout(() => {
            packArt.classList.remove('anim-tear');
            document.getElementById('gacha-stage-pack').classList.add('hidden');
            document.getElementById('gacha-stage-reveal').classList.remove('hidden');
            this.renderGachaRevealCards();
        }, 850);
    }

    renderGachaRevealCards() {
        const container = document.getElementById('gacha-cards-container');
        const cards = this.activeGachaResult.cards;

        // Check if we hit SSR to shoot confetti!
        const hasSSR = cards.some(c => c.rarity === 'SSR');
        if (hasSSR && window.confetti) {
            setTimeout(() => {
                window.confetti({
                    particleCount: 120,
                    spread: 80,
                    origin: { y: 0.6 }
                });
            }, 500);
        }

        container.innerHTML = cards.map((card, idx) => {
            const rarityColors = {
                SSR: 'text-amber-400 bg-amber-500/20 border-amber-500/40 glow-ssr',
                SR: 'text-purple-400 bg-purple-500/20 border-purple-500/40 glow-sr',
                R: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40 glow-r',
                C: 'text-slate-400 bg-slate-800 border-slate-700 glow-c'
            };

            const foilClass = card.isFoil ? 'holo-foil' : '';

            return `
        <div class="card-container h-80 w-full max-w-[240px] mx-auto" onclick="app.flipGachaCard(${idx})">
          <div id="gacha-card-${idx}" class="card-inner">
            
            <!-- BACK OF CARD (Hidden State) -->
            <div class="card-back bg-gradient-to-br from-slate-900 to-indigo-950 border-2 border-purple-500/50 p-4 flex flex-col items-center justify-between text-center shadow-xl">
              <div class="text-[10px] text-purple-400 font-orbitron">LUCKYCARD TCG</div>
              <div class="w-16 h-16 rounded-full bg-purple-900/40 border border-purple-400/40 flex items-center justify-center">
                <i class="fa-solid fa-question text-3xl text-purple-300"></i>
              </div>
              <div class="text-xs text-slate-400">คลิกเพื่อเปิดการ์ด</div>
            </div>

            <!-- FRONT OF CARD (Revealed State) -->
            <div class="card-front bg-slate-900 border-2 ${rarityColors[card.rarity]} rounded-2xl overflow-hidden p-3 flex flex-col justify-between text-left ${foilClass} shadow-2xl">
              <div>
                <div class="flex items-center justify-between">
                  <span class="text-xs font-black px-2 py-0.5 rounded font-orbitron ${rarityColors[card.rarity]}">${card.rarity}</span>
                  <span class="text-[10px] text-slate-300 font-medium">${card.element || ''}</span>
                </div>
                <div class="mt-2 h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                  <img src="${card.image}" class="w-full h-full object-cover">
                </div>
                <h4 class="mt-2 text-sm font-bold text-white truncate">${card.name}</h4>
              </div>

              <div>
                <div class="grid grid-cols-2 gap-1 text-[10px] bg-slate-950/80 p-1.5 rounded-lg font-orbitron text-center border border-slate-800">
                  <div><span class="text-slate-500">ATK</span> <span class="text-red-400 font-bold">${card.atk}</span></div>
                  <div><span class="text-slate-500">DEF</span> <span class="text-blue-400 font-bold">${card.def}</span></div>
                </div>
              </div>

            </div>

          </div>
        </div>
      `;
        }).join('');
    }

    flipGachaCard(index) {
        const cardEl = document.getElementById(`gacha-card-${index}`);
        if (cardEl && !cardEl.classList.contains('flipped')) {
            cardEl.classList.add('flipped');
            window.soundEngine.playCardFlip();
            const card = this.activeGachaResult.cards[index];
            setTimeout(() => {
                window.soundEngine.playRarityReveal(card.rarity);
            }, 200);
        }
    }

    revealAllCards() {
        if (!this.activeGachaResult) return;
        this.activeGachaResult.cards.forEach((card, idx) => {
            setTimeout(() => {
                this.flipGachaCard(idx);
            }, idx * 180);
        });
    }

    closeGachaModal() {
        document.getElementById('gacha-modal').classList.add('hidden');
        this.activeGachaResult = null;
    }

    // --- PROMPTPAY QR PAYMENT MODAL ---
    async buyWithPromptPay(packId, count = 1) {
        try {
            const data = await API.createPaymentQR('pack_purchase', packId, count);
            this.showPaymentModal(data);
        } catch (err) {
            this.showAlert(err.message, "error");
        }
    }

    showPaymentModal(data) {
        this.activePaymentOrder = data.order;

        document.getElementById('pay-item-name').innerText = `${data.order.packName} (จำนวน ${data.order.quantity || 1} ซอง)`;
        document.getElementById('pay-discount-text').innerText = data.discountAmount > 0 ? `-${data.discountAmount} ฿` : '0 ฿';
        document.getElementById('pay-amount').innerText = Number(data.finalAmount).toFixed(2);
        document.getElementById('pay-merchant-name').innerText = data.promptpayName || 'ร้าน LuckyCard Shop';
        document.getElementById('pay-qr-image').src = data.qrDataUrl;
        document.getElementById('slip-file-input').value = "";

        document.getElementById('payment-modal').classList.remove('hidden');
    }

    closePaymentModal() {
        document.getElementById('payment-modal').classList.add('hidden');
        this.activePaymentOrder = null;
    }

    async submitSlip() {
        if (!this.activePaymentOrder) return;

        const fileInput = document.getElementById('slip-file-input');
        const file = fileInput.files[0];

        try {
            const res = await API.uploadSlip(this.activePaymentOrder.id, file);
            this.closePaymentModal();
            this.showAlert(res.message, "success");

            if (res.gachaResult) {
                // Gacha completed!
                this.startGachaAnimation(res.gachaResult);
            } else {
                // Top-up or Waiting admin approval
                if (this.currentTab === 'orders') this.loadOrders();
            }
        } catch (err) {
            this.showAlert("เกิดข้อผิดพลาดในการแนบสลิป: " + err.message, "error");
        }
    }

    async confirmDemoPayment() {
        if (!this.activePaymentOrder) return;
        try {
            const res = await API.confirmDemoPayment(this.activePaymentOrder.id);
            this.closePaymentModal();
            this.showAlert(res.message, "success");

            if (res.gachaResult) {
                this.startGachaAnimation(res.gachaResult);
            } else {
                if (this.currentTab === 'orders') this.loadOrders();
            }
        } catch (err) {
            this.showAlert(err.message, "error");
        }
    }

    // --- WALLET TOPUP MODAL ---
    openTopupModal() {
        document.getElementById('topup-modal').classList.remove('hidden');
    }

    closeTopupModal() {
        document.getElementById('topup-modal').classList.add('hidden');
    }

    selectTopupAmount(amount) {
        document.getElementById('topup-custom-amount').value = amount;
    }

    async submitTopup() {
        const amount = document.getElementById('topup-custom-amount').value;
        try {
            const data = await API.createPaymentQR('topup', null, 1, amount);
            this.closeTopupModal();
            this.showPaymentModal(data);
        } catch (err) {
            this.showAlert(err.message, "error");
        }
    }

    // --- CARD BINDER VIEW ---
    async loadBinder() {
        if (!API.currentUser) {
            this.openAuthModal('login');
            return;
        }

        try {
            const data = await API.getUserInventory();
            this.userInventory = data.cards || [];
            this.renderBinder();
        } catch (err) {
            this.showAlert(err.message, "error");
        }
    }

    filterBinder(rarity) {
        this.currentBinderFilter = rarity;
        document.querySelectorAll('.binder-filter-btn').forEach(btn => {
            if (btn.dataset.filter === rarity) {
                btn.classList.remove('bg-slate-800');
                btn.classList.add('bg-purple-600', 'text-white');
            } else {
                btn.classList.add('bg-slate-800');
                btn.classList.remove('bg-purple-600', 'text-white');
            }
        });
        this.renderBinder();
    }

    renderBinder() {
        const cards = this.userInventory;

        // Counts
        document.getElementById('count-all').innerText = cards.length;
        document.getElementById('count-ssr').innerText = cards.filter(c => c.rarity === 'SSR').length;
        document.getElementById('count-sr').innerText = cards.filter(c => c.rarity === 'SR').length;
        document.getElementById('count-r').innerText = cards.filter(c => c.rarity === 'R').length;
        document.getElementById('count-c').innerText = cards.filter(c => c.rarity === 'C').length;
        document.getElementById('selected-cards-count').innerText = this.selectedInventoryIds.size;

        const filtered = this.currentBinderFilter === 'ALL'
            ? cards
            : cards.filter(c => c.rarity === this.currentBinderFilter);

        const grid = document.getElementById('binder-cards-grid');

        if (filtered.length === 0) {
            grid.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-500 space-y-3">
          <i class="fa-solid fa-box-open text-4xl"></i>
          <p class="text-sm">ยังไม่มีการ์ดในหมวดนี้ ไปเปิดซองสุ่มการ์ดที่หน้าร้านได้เลย!</p>
          <button onclick="app.switchTab('shop')" class="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold">
            เปิดซองสุ่มเลย
          </button>
        </div>
      `;
            return;
        }

        grid.innerHTML = filtered.map(item => {
            const isSelected = this.selectedInventoryIds.has(item.id);
            const isRedeemed = item.physicalRedeemed;

            return `
        <div class="relative group rounded-2xl bg-slate-900 border ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-slate-800'} p-3 flex flex-col justify-between transition-all hover:border-purple-500/50">
          
          <!-- Selection Checkbox -->
          <div class="absolute top-2 left-2 z-10">
            ${isRedeemed ? `
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <i class="fa-solid fa-truck mr-1"></i>ส่งพัสดุแล้ว
              </span>
            ` : `
              <label class="flex items-center cursor-pointer">
                <input type="checkbox" onchange="app.toggleSelectCard('${item.id}')" ${isSelected ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700 cursor-pointer">
              </label>
            `}
          </div>

          <!-- Rarity Badge -->
          <div class="absolute top-2 right-2 z-10">
            <span class="px-2 py-0.5 rounded text-[10px] font-black font-orbitron ${item.rarity === 'SSR' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : item.rarity === 'SR' ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-300'}">${item.rarity}</span>
          </div>

          <!-- Image -->
          <div class="mt-6 h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 cursor-pointer" onclick="app.openCardDetail('${item.id}')">
            <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-105 transition">
          </div>

          <!-- Info -->
          <div class="mt-2 space-y-1">
            <h4 class="text-xs font-bold text-white truncate" title="${item.cardName}">${item.cardName}</h4>
            <div class="flex justify-between text-[10px] text-slate-400 font-orbitron">
              <span>ATK: <strong class="text-red-400">${item.atk}</strong></span>
              <span>DEF: <strong class="text-blue-400">${item.def}</strong></span>
            </div>
            <div class="text-[9px] text-slate-500 pt-1 border-t border-slate-800/80">
              ได้รับเมื่อ: ${new Date(item.obtainedAt).toLocaleDateString('th-TH')}
            </div>
          </div>

        </div>
      `;
        }).join('');
    }

    toggleSelectCard(id) {
        if (this.selectedInventoryIds.has(id)) {
            this.selectedInventoryIds.delete(id);
        } else {
            this.selectedInventoryIds.add(id);
        }
        document.getElementById('selected-cards-count').innerText = this.selectedInventoryIds.size;
        this.renderBinder();
    }

    async requestPhysicalDelivery() {
        if (this.selectedInventoryIds.size === 0) {
            this.showAlert("กรุณาติ๊กเลือกการ์ดที่ต้องการให้จัดส่งอย่างน้อย 1 ใบ", "error");
            return;
        }

        const user = API.currentUser;
        if (!user || !user.address || !user.address.street || !user.address.recipientName) {
            this.showAlert("กรุณากรอกข้อมูลที่อยู่จัดส่งพัสดุในหน้า 'การตั้งค่าโปรไฟล์' ก่อนทำรายการ", "error");
            this.switchTab('profile');
            return;
        }

        if (!confirm(`คุณต้องการขอจัดส่งการ์ดจำนวน ${this.selectedInventoryIds.size} ใบ ไปยังที่อยู่ของคุณหรือไม่?`)) {
            return;
        }

        try {
            const res = await API.requestShipping(Array.from(this.selectedInventoryIds), user.address);
            this.showAlert(res.message, "success");
            this.selectedInventoryIds.clear();
            await this.loadBinder();
        } catch (err) {
            this.showAlert(err.message, "error");
        }
    }

    openCardDetail(inventoryId) {
        const card = this.userInventory.find(c => c.id === inventoryId);
        if (!card) return;

        document.getElementById('detail-card-badge').innerText = card.rarity;
        document.getElementById('detail-card-name').innerText = card.cardName;
        document.getElementById('detail-card-element').innerText = card.element || '-';
        document.getElementById('detail-card-img').src = card.image;
        document.getElementById('detail-card-atk').innerText = card.atk;
        document.getElementById('detail-card-def').innerText = card.def;
        document.getElementById('detail-card-desc').innerText = card.desc || 'การ์ดสะสมหายากในชุดพิเศษ';

        document.getElementById('card-detail-modal').classList.remove('hidden');
    }

    closeCardDetailModal() {
        document.getElementById('card-detail-modal').classList.add('hidden');
    }

    // --- MEMBERSHIP VIEW ---
    renderMembership() {
        const user = API.currentUser;
        const tiers = this.tiers;
        const currentTier = user ? (user.tierInfo || { id: 'bronze', minSpend: 0, name: 'Bronze' }) : { id: 'bronze', minSpend: 0, name: 'Bronze' };

        // Overview Card
        const overviewEl = document.getElementById('member-overview-card');
        const totalSpent = user ? (user.totalSpent || 0) : 0;

        // Find Next Tier
        const sortedTiers = [...tiers].sort((a, b) => a.minSpend - b.minSpend);
        const nextTier = sortedTiers.find(t => t.minSpend > totalSpent);
        const progressPct = nextTier
            ? Math.min(100, Math.round((totalSpent / nextTier.minSpend) * 100))
            : 100;

        overviewEl.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div class="space-y-2">
          <div class="text-xs text-slate-400 font-medium">ระดับเมมเบอร์ปัจจุบันของคุณ</div>
          <div class="text-3xl font-extrabold text-white flex items-center">
            <i class="fa-solid fa-crown text-amber-400 mr-2.5"></i> ${currentTier.name}
          </div>
          <div class="text-xs text-slate-300">
            รับส่วนลดทันที <strong class="text-emerald-400">${currentTier.discountPct || 0}%</strong> ทุกซอง | ตัวคูณแต้ม <strong class="text-purple-400">x${currentTier.pointMultiplier || 1}</strong>
          </div>
        </div>

        <div class="md:col-span-2 space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <div class="flex justify-between text-xs">
            <span class="text-slate-400">ยอดใช้จ่ายสะสมทั้งหมด: <strong class="text-white">${totalSpent.toLocaleString()} ฿</strong></span>
            ${nextTier ? `
              <span class="text-purple-300 font-medium">อีก ${(nextTier.minSpend - totalSpent).toLocaleString()} ฿ เพื่อขึ้น <strong>${nextTier.name}</strong></span>
            ` : `
              <span class="text-amber-400 font-bold">คุณอยู่ในระดับสูงสุดแล้ว (VIP)!</span>
            `}
          </div>
          
          <!-- Progress Bar -->
          <div class="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
            <div class="bg-gradient-to-r from-purple-500 to-amber-400 h-full rounded-full transition-all duration-500" style="width: ${progressPct}%"></div>
          </div>

          <div class="flex justify-between text-[11px] text-slate-500">
            <span>0 ฿</span>
            <span>ความคืบหน้า ${progressPct}%</span>
            <span>${nextTier ? nextTier.minSpend.toLocaleString() + ' ฿' : 'MAX'}</span>
          </div>
        </div>
      </div>
    `;

        // Tier Cards Matrix
        const tiersContainer = document.getElementById('tiers-list-container');
        tiersContainer.innerHTML = sortedTiers.map(t => {
            const isCurrent = currentTier.id === t.id;
            return `
        <div class="rounded-3xl bg-slate-900 border ${isCurrent ? 'border-amber-400 shadow-xl shadow-amber-500/10 ring-1 ring-amber-400' : 'border-slate-800'} p-6 space-y-5 flex flex-col justify-between">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800" style="color: ${t.badgeColor}">
                ${t.name}
              </span>
              ${isCurrent ? '<span class="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">ระดับคุณ</span>' : ''}
            </div>

            <div>
              <div class="text-2xl font-black text-white font-orbitron">${t.minSpend.toLocaleString()} ฿</div>
              <div class="text-xs text-slate-400">ยอดสะสมขั้นต่ำ</div>
            </div>

            <ul class="text-xs text-slate-300 space-y-2.5 pt-2 border-t border-slate-800">
              <li class="flex items-center"><i class="fa-solid fa-check text-emerald-400 mr-2 text-xs"></i> ส่วนลดทันที <strong>${t.discountPct}%</strong></li>
              <li class="flex items-center"><i class="fa-solid fa-check text-emerald-400 mr-2 text-xs"></i> ตัวคูณแต้ม <strong>x${t.pointMultiplier}</strong></li>
              <li class="flex items-center"><i class="fa-solid fa-check text-emerald-400 mr-2 text-xs"></i> สิทธิ์สุ่มการ์ดโปรโมชั่น</li>
              ${t.id === 'diamond' ? '<li class="flex items-center text-amber-300 font-medium"><i class="fa-solid fa-star text-amber-400 mr-2 text-xs"></i> โบนัสเรท SSR +2%</li>' : ''}
            </ul>
          </div>

          <div class="pt-4">
            ${isCurrent ? `
              <div class="py-2 text-center text-xs font-bold text-amber-400 bg-amber-500/10 rounded-xl">
                ระดับสมาชิกปัจจุบัน
              </div>
            ` : `
              <div class="py-2 text-center text-xs text-slate-500">
                ${totalSpent >= t.minSpend ? 'ปลดล็อกแล้ว' : `ยอดขาดอีก ${(t.minSpend - totalSpent).toLocaleString()} ฿`}
              </div>
            `}
          </div>
        </div>
      `;
        }).join('');
    }

    // --- USER PROFILE BACKSTAGE VIEW ---
    renderProfile() {
        const user = API.currentUser;
        if (!user) {
            this.openAuthModal('login');
            return;
        }

        const tier = user.tierInfo || { name: 'Bronze Member', badgeColor: '#94a3b8' };

        // Fill Summary Card
        document.getElementById('profile-avatar-preview').src = user.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lucky';
        document.getElementById('profile-summary-name').innerText = user.displayName || user.email;
        document.getElementById('profile-summary-email').innerText = user.email;
        document.getElementById('profile-summary-tier-badge').innerText = tier.name;
        document.getElementById('profile-summary-tier-badge').style.color = tier.badgeColor;
        document.getElementById('profile-coins').innerText = (user.coins || 0).toLocaleString();
        document.getElementById('profile-points').innerText = (user.points || 0).toLocaleString();

        // Fill Form Fields
        document.getElementById('prof-display-name').value = user.displayName || '';
        document.getElementById('prof-phone').value = user.phone || '';
        document.getElementById('prof-email').value = user.email;

        // Shipping Address Fields
        const addr = user.address || {};
        document.getElementById('addr-name').value = addr.recipientName || user.displayName || '';
        document.getElementById('addr-phone').value = addr.phone || user.phone || '';
        document.getElementById('addr-street').value = addr.street || '';
        document.getElementById('addr-subdistrict').value = addr.subdistrict || '';
        document.getElementById('addr-district').value = addr.district || '';
        document.getElementById('addr-province').value = addr.province || '';
        document.getElementById('addr-postal').value = addr.postalCode || '';
        document.getElementById('addr-note').value = addr.note || '';
    }

    randomizeAvatar() {
        const seeds = ['DragonKing', 'Valkyrie', 'NeonHero', 'GachaMaster', 'CyberCat', 'StarMage'];
        const randomSeed = seeds[Math.floor(Math.random() * seeds.length)] + '_' + Math.random().toString(36).substr(2, 4);
        const newAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${randomSeed}`;
        document.getElementById('profile-avatar-preview').src = newAvatar;
        this.saveProfileInfo(null, newAvatar);
    }

    async saveProfileInfo(e, directAvatar = null) {
        if (e) e.preventDefault();

        const avatar = directAvatar || document.getElementById('profile-avatar-preview').src;
        const displayName = document.getElementById('prof-display-name').value;
        const phone = document.getElementById('prof-phone').value;

        const address = {
            recipientName: document.getElementById('addr-name').value,
            phone: document.getElementById('addr-phone').value,
            street: document.getElementById('addr-street').value,
            subdistrict: document.getElementById('addr-subdistrict').value,
            district: document.getElementById('addr-district').value,
            province: document.getElementById('addr-province').value,
            postalCode: document.getElementById('addr-postal').value,
            note: document.getElementById('addr-note').value
        };

        try {
            const res = await API.updateProfile({ displayName, phone, avatar, address });
            this.showAlert(res.message, "success");
            this.renderProfile();
            this.renderHeader();
        } catch (err) {
            this.showAlert(err.message, "error");
        }
    }

    async savePassword(e) {
        e.preventDefault();
        const oldPassword = document.getElementById('pwd-old').value;
        const newPassword = document.getElementById('pwd-new').value;

        try {
            const res = await API.changePassword(oldPassword, newPassword);
            this.showAlert(res.message, "success");
            document.getElementById('form-change-password').reset();
        } catch (err) {
            this.showAlert(err.message, "error");
        }
    }

    // --- ORDER HISTORY VIEW ---
    async loadOrders() {
        if (!API.currentUser) {
            this.openAuthModal('login');
            return;
        }

        try {
            const data = await API.getUserOrders();
            this.renderOrders(data.orders || []);
        } catch (err) {
            this.showAlert(err.message, "error");
        }
    }

    renderOrders(orders) {
        const tbody = document.getElementById('orders-table-body');
        if (orders.length === 0) {
            tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-12 text-center text-slate-500 text-sm">
            ยังไม่มีรายการคำสั่งซื้อ
          </td>
        </tr>
      `;
            return;
        }

        tbody.innerHTML = orders.map(o => {
            const statusBadges = {
                completed: '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ชำระเงินสำเร็จ</span>',
                pending: '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">รอชำระเงิน</span>',
                slip_submitted: '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">รอแอดมินตรวจสลิป</span>',
                rejected: '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30">ยกเลิก/สลิปไม่ผ่าน</span>'
            };

            return `
        <tr class="hover:bg-slate-950/40 transition">
          <td class="px-6 py-4">
            <div class="font-bold text-white font-orbitron">${o.id}</div>
            <div class="text-xs text-slate-500">${new Date(o.createdAt).toLocaleString('th-TH')}</div>
          </td>
          <td class="px-6 py-4">
            <div class="font-medium text-slate-200">${o.packName || 'เติมเหรียญ Coins'}</div>
            <div class="text-xs text-slate-400">จำนวน ${o.quantity || 1} รายการ</div>
          </td>
          <td class="px-6 py-4 font-bold text-amber-400 font-orbitron">
            ${(o.finalAmount || 0).toLocaleString()} ฿
          </td>
          <td class="px-6 py-4 text-xs text-slate-300">
            ${o.paymentMethod === 'promptpay' ? '<span class="text-cyan-400"><i class="fa-solid fa-qrcode mr-1"></i>PromptPay</span>' : '<span class="text-amber-400"><i class="fa-solid fa-coins mr-1"></i>Coins</span>'}
          </td>
          <td class="px-6 py-4">
            ${statusBadges[o.status] || o.status}
          </td>
          <td class="px-6 py-4 text-right">
            ${o.status === 'pending' ? `
              <button onclick="app.reopenPayment('${o.id}')" class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition">
                <i class="fa-solid fa-qrcode mr-1"></i> จ่ายเงิน/แนบสลิป
              </button>
            ` : o.cardsWon ? `
              <span class="text-xs text-purple-300 font-medium">${o.cardsWon.length} การ์ด</span>
            ` : '-'}
          </td>
        </tr>
      `;
        }).join('');
    }

    async reopenPayment(orderId) {
        try {
            const orders = (await API.getUserOrders()).orders;
            const order = orders.find(o => o.id === orderId);
            if (order) {
                const qrResult = await API.createPaymentQR('pack_purchase', order.packId, order.quantity);
                this.showPaymentModal(qrResult);
            }
        } catch (e) {
            this.showAlert(e.message, "error");
        }
    }

    // --- ADMIN BACK-OFFICE VIEW ---
    async loadAdmin() {
        const user = API.currentUser;
        if (!user || user.role !== 'admin') {
            this.showAlert("ต้องใช้บัญชีผู้ดูแลระบบ (Admin) เท่านั้น เข้าสู่ระบบด้วย admin@luckycard.com / admin123", "error");
            this.openAuthModal('login');
            this.fillDemoLogin('admin@luckycard.com', 'admin123');
            return;
        }

        try {
            const overview = await API.getAdminOverview();
            this.renderAdminOverview(overview);
            this.loadAdminSettings();
            this.loadAdminOrders();
            this.loadAdminUsers();
        } catch (err) {
            this.showAlert(err.message, "error");
        }
    }

    renderAdminOverview(overview) {
        const container = document.getElementById('admin-stats-container');
        container.innerHTML = `
      <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800">
        <div class="text-xs text-slate-400">ยอดขายรวมทั้งหมด</div>
        <div class="text-2xl font-black text-emerald-400 font-orbitron">${(overview.totalRevenue || 0).toLocaleString()} ฿</div>
      </div>
      <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800">
        <div class="text-xs text-slate-400">ซองการ์ดที่ขายได้</div>
        <div class="text-2xl font-black text-purple-400 font-orbitron">${(overview.totalPacksSold || 0).toLocaleString()} ซอง</div>
      </div>
      <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800">
        <div class="text-xs text-slate-400">สมาชิกทั้งหมด</div>
        <div class="text-2xl font-black text-cyan-400 font-orbitron">${overview.totalUsers || 0} คน</div>
      </div>
      <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800">
        <div class="text-xs text-slate-400">สลิปรอการตรวจสอบ</div>
        <div class="text-2xl font-black text-amber-400 font-orbitron">${overview.pendingSlips || 0} รายการ</div>
      </div>
    `;
    }

    switchAdminSubtab(subtab) {
        this.adminSubtab = subtab;
        ['settings', 'orders', 'users'].forEach(s => {
            document.getElementById(`admin-subtab-${s}`).className =
                s === subtab
                    ? 'pb-3 text-sm font-semibold border-b-2 border-amber-400 text-amber-400'
                    : 'pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-200';
            document.getElementById(`admin-section-${s}`).classList.toggle('hidden', s !== subtab);
        });
    }

    async loadAdminSettings() {
        try {
            const data = await API.getAdminSettings();
            const s = data.settings;
            document.getElementById('adm-store-name').value = s.storeName || '';
            document.getElementById('adm-promptpay-id').value = s.promptpayId || '';
            document.getElementById('adm-promptpay-name').value = s.promptpayName || '';
            document.getElementById('adm-auto-approve').checked = !!s.autoApproveSlip;
        } catch (e) {
            console.warn("Error loading settings:", e);
        }
    }

    async saveAdminSettings(e) {
        e.preventDefault();
        const settings = {
            storeName: document.getElementById('adm-store-name').value,
            promptpayId: document.getElementById('adm-promptpay-id').value,
            promptpayName: document.getElementById('adm-promptpay-name').value,
            autoApproveSlip: document.getElementById('adm-auto-approve').checked
        };

        try {
            const res = await API.updateAdminSettings(settings);
            this.showAlert(res.message, "success");
            await this.loadShopData();
        } catch (err) {
            this.showAlert(err.message, "error");
        }
    }

    async loadAdminOrders() {
        try {
            const res = await API.getAdminOrders();
            const orders = res.orders || [];
            const tbody = document.getElementById('admin-orders-table-body');

            tbody.innerHTML = orders.map(o => `
        <tr class="hover:bg-slate-950/40">
          <td class="px-4 py-3 font-orbitron font-bold text-white">${o.id}</td>
          <td class="px-4 py-3">
            <div class="font-medium text-white">${o.userName || o.userEmail}</div>
            <div class="text-[11px] text-slate-400">${o.userEmail}</div>
          </td>
          <td class="px-4 py-3 text-xs text-slate-300">${o.packName}</td>
          <td class="px-4 py-3 font-bold text-amber-400 font-orbitron">${o.finalAmount} ฿</td>
          <td class="px-4 py-3 text-xs">
            ${o.slipUrl ? `
              <a href="${o.slipUrl}" target="_blank" class="text-cyan-400 underline hover:text-cyan-300 flex items-center">
                <i class="fa-solid fa-image mr-1"></i>ดูสลิป
              </a>
            ` : '<span class="text-slate-500">ไม่มีสลิป</span>'}
          </td>
          <td class="px-4 py-3">
            <span class="px-2 py-0.5 rounded text-[11px] font-bold ${o.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}">
              ${o.status}
            </span>
          </td>
          <td class="px-4 py-3 text-right space-x-1">
            ${o.status !== 'completed' ? `
              <button onclick="app.adminApproveOrder('${o.id}')" class="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold">อนุมัติ</button>
              <button onclick="app.adminRejectOrder('${o.id}')" class="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold">ปฏิเสธ</button>
            ` : '<span class="text-slate-500 text-xs">เรียบร้อย</span>'}
          </td>
        </tr>
      `).join('');
        } catch (e) {
            console.warn("Error loading admin orders:", e);
        }
    }

    async adminApproveOrder(orderId) {
        try {
            const res = await API.approveOrder(orderId);
            this.showAlert(res.message, "success");
            this.loadAdminOrders();
            this.loadAdmin();
        } catch (e) {
            this.showAlert(e.message, "error");
        }
    }

    async adminRejectOrder(orderId) {
        const reason = prompt("กรุณาระบุเหตุผลการปฏิเสธ:");
        if (!reason) return;
        try {
            const res = await API.rejectOrder(orderId, reason);
            this.showAlert(res.message, "success");
            this.loadAdminOrders();
        } catch (e) {
            this.showAlert(e.message, "error");
        }
    }

    async loadAdminUsers() {
        try {
            const res = await API.getAdminUsers();
            const users = res.users || [];
            const tbody = document.getElementById('admin-users-table-body');

            tbody.innerHTML = users.map(u => `
        <tr class="hover:bg-slate-950/40">
          <td class="px-4 py-3 font-medium text-white">${u.displayName}</td>
          <td class="px-4 py-3 text-xs text-slate-300">${u.email} <br><span class="text-slate-500">${u.phone || '-'}</span></td>
          <td class="px-4 py-3 text-xs font-bold" style="color: ${u.tierInfo?.badgeColor}">${u.tierInfo?.name}</td>
          <td class="px-4 py-3 font-bold text-slate-200 font-orbitron">${(u.totalSpent || 0).toLocaleString()} ฿</td>
          <td class="px-4 py-3 font-orbitron text-xs">
            <span class="text-amber-400 font-bold">${u.coins || 0}</span> 🪙 | <span class="text-purple-400 font-bold">${u.points || 0}</span> ✨
          </td>
          <td class="px-4 py-3 text-right">
            <button onclick="app.adminAdjustUser('${u.id}', '${u.displayName}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold">
              <i class="fa-solid fa-plus-minus mr-1"></i>ปรับยอด
            </button>
          </td>
        </tr>
      `).join('');
        } catch (e) {
            console.warn("Error loading admin users:", e);
        }
    }

    async adminAdjustUser(userId, name) {
        const coins = prompt(`เพิ่ม/ลด Coins ให้คุณ ${name} (เช่น 500 หรือ -100):`, "100");
        if (coins === null) return;
        try {
            const res = await API.adjustUserBalance(userId, { coinsDelta: parseInt(coins) || 0 });
            this.showAlert(res.message, "success");
            this.loadAdminUsers();
        } catch (e) {
            this.showAlert(e.message, "error");
        }
    }

    // --- AUTH MODALS ---
    openAuthModal(mode = 'login') {
        this.authMode = mode;
        this.updateAuthModalView();
        document.getElementById('auth-modal').classList.remove('hidden');
    }

    closeAuthModal() {
        document.getElementById('auth-modal').classList.add('hidden');
    }

    toggleAuthMode() {
        this.authMode = this.authMode === 'login' ? 'register' : 'login';
        this.updateAuthModalView();
    }

    updateAuthModalView() {
        const isRegister = this.authMode === 'register';
        document.getElementById('auth-modal-title').innerText = isRegister ? 'สมัครสมาชิกใหม่' : 'เข้าสู่ระบบสมาชิก';
        document.getElementById('auth-name-group').classList.toggle('hidden', !isRegister);
        document.getElementById('auth-phone-group').classList.toggle('hidden', !isRegister);
        document.getElementById('auth-submit-btn').innerText = isRegister ? 'สร้างบัญชีสมาชิก' : 'เข้าสู่ระบบ';
        document.getElementById('auth-switch-text').innerText = isRegister ? 'มีบัญชีอยู่แล้ว?' : 'ยังไม่มีบัญชีสมาชิก?';
        document.getElementById('auth-switch-btn').innerText = isRegister ? 'เข้าสู่ระบบ' : 'สมัครสมาชิกใหม่';
    }

    fillDemoLogin(email, pwd) {
        this.authMode = 'login';
        this.updateAuthModalView();
        document.getElementById('auth-email').value = email;
        document.getElementById('auth-password').value = pwd;
    }

    async handleAuthSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        try {
            if (this.authMode === 'login') {
                const res = await API.login(email, password);
                this.showAlert(`ยินดีต้อนรับคุณ ${res.user.displayName}!`, "success");
            } else {
                const displayName = document.getElementById('auth-display-name').value;
                const phone = document.getElementById('auth-phone').value;
                const res = await API.register(email, password, displayName, phone);
                this.showAlert(`สมัครสมาชิกสำเร็จ! ยินดีต้อนรับคุณ ${res.user.displayName}`, "success");
            }
            this.closeAuthModal();
        } catch (err) {
            this.showAlert(err.message, "error");
        }
    }

    // --- AUDIO & ALERTS ---
    toggleSound() {
        const isMuted = window.soundEngine.toggleMute();
        const btn = document.getElementById('sound-btn');
        btn.innerHTML = isMuted
            ? '<i class="fa-solid fa-volume-xmark text-lg text-slate-500"></i>'
            : '<i class="fa-solid fa-volume-high text-lg text-purple-400"></i>';
    }

    showAlert(message, type = 'info') {
        const banner = document.getElementById('alert-banner');
        banner.classList.remove('hidden', 'bg-emerald-950/80', 'border-emerald-500/50', 'text-emerald-300', 'bg-red-950/80', 'border-red-500/50', 'text-red-300', 'bg-purple-950/80', 'border-purple-500/50', 'text-purple-300');

        if (type === 'success') {
            banner.classList.add('bg-emerald-950/80', 'border', 'border-emerald-500/50', 'text-emerald-300');
            banner.innerHTML = `<div><i class="fa-solid fa-circle-check mr-2"></i> ${message}</div><button onclick="this.parentElement.classList.add('hidden')"><i class="fa-solid fa-xmark"></i></button>`;
        } else if (type === 'error') {
            banner.classList.add('bg-red-950/80', 'border', 'border-red-500/50', 'text-red-300');
            banner.innerHTML = `<div><i class="fa-solid fa-circle-exclamation mr-2"></i> ${message}</div><button onclick="this.parentElement.classList.add('hidden')"><i class="fa-solid fa-xmark"></i></button>`;
        } else {
            banner.classList.add('bg-purple-950/80', 'border', 'border-purple-500/50', 'text-purple-300');
            banner.innerHTML = `<div><i class="fa-solid fa-circle-info mr-2"></i> ${message}</div><button onclick="this.parentElement.classList.add('hidden')"><i class="fa-solid fa-xmark"></i></button>`;
        }

        setTimeout(() => {
            banner.classList.add('hidden');
        }, 6000);
    }
}

window.app = new App();
document.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
