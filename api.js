// API Service for LuckyCard Shop
const API = {
    currentUser: null,

    init() {
        const saved = localStorage.getItem('luckycard_user');
        if (saved) {
            try {
                this.currentUser = JSON.parse(saved);
            } catch (e) {
                this.currentUser = null;
            }
        }
    },

    setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem('luckycard_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('luckycard_user');
        }
        window.dispatchEvent(new CustomEvent('user-changed', { detail: user }));
    },

    async request(endpoint, options = {}) {
        const headers = options.headers || {};
        if (this.currentUser && this.currentUser.id) {
            headers['x-user-id'] = this.currentUser.id;
        }

        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const config = {
            ...options,
            headers
        };

        try {
            const res = await fetch(endpoint, config);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
            }
            return data;
        } catch (err) {
            console.error(`API Error [${endpoint}]:`, err);
            throw err;
        }
    },

    // Auth
    async login(email, password) {
        const data = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        this.setCurrentUser(data.user);
        return data;
    },

    async register(email, password, displayName, phone) {
        const data = await this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, displayName, phone })
        });
        this.setCurrentUser(data.user);
        return data;
    },

    logout() {
        this.setCurrentUser(null);
    },

    async refreshProfile() {
        if (!this.currentUser) return null;
        try {
            const data = await this.request('/api/auth/me');
            this.setCurrentUser(data.user);
            return data.user;
        } catch (e) {
            console.warn("Session expired or invalid:", e);
            this.setCurrentUser(null);
            return null;
        }
    },

    // User Profile
    async updateProfile(profileData) {
        const data = await this.request('/api/user/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
        this.setCurrentUser(data.user);
        return data;
    },

    async changePassword(oldPassword, newPassword) {
        return await this.request('/api/user/password', {
            method: 'PUT',
            body: JSON.stringify({ oldPassword, newPassword })
        });
    },

    async getUserInventory() {
        return await this.request('/api/user/inventory');
    },

    async getUserOrders() {
        return await this.request('/api/user/orders');
    },

    async requestShipping(inventoryIds, shippingAddress) {
        return await this.request('/api/user/redeem-shipping', {
            method: 'POST',
            body: JSON.stringify({ inventoryIds, shippingAddress })
        });
    },

    // Shop & Gacha
    async getPacks() {
        return await this.request('/api/packs');
    },

    async openWithCoins(packId, packCount = 1) {
        const data = await this.request('/api/packs/open-with-coins', {
            method: 'POST',
            body: JSON.stringify({ packId, packCount })
        });
        if (data.user) {
            this.setCurrentUser(data.user);
        }
        return data;
    },

    // Payment & PromptPay
    async createPaymentQR(type, packId, packCount, topupAmount) {
        return await this.request('/api/payment/create-qr', {
            method: 'POST',
            body: JSON.stringify({ type, packId, packCount, topupAmount })
        });
    },

    async uploadSlip(orderId, file) {
        const formData = new FormData();
        formData.append('orderId', orderId);
        if (file) {
            formData.append('slip', file);
        }
        const data = await this.request('/api/payment/upload-slip', {
            method: 'POST',
            body: formData
        });
        if (data.user) {
            this.setCurrentUser(data.user);
        }
        return data;
    },

    async confirmDemoPayment(orderId) {
        const data = await this.request('/api/payment/confirm-demo', {
            method: 'POST',
            body: JSON.stringify({ orderId })
        });
        if (data.user) {
            this.setCurrentUser(data.user);
        }
        return data;
    },

    // Admin APIs
    async getAdminOverview() {
        return await this.request('/api/admin/overview');
    },

    async getAdminOrders() {
        return await this.request('/api/admin/orders');
    },

    async approveOrder(orderId) {
        return await this.request(`/api/admin/orders/${orderId}/approve`, {
            method: 'POST'
        });
    },

    async rejectOrder(orderId, reason) {
        return await this.request(`/api/admin/orders/${orderId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
    },

    async getAdminSettings() {
        return await this.request('/api/admin/settings');
    },

    async updateAdminSettings(settings) {
        return await this.request('/api/admin/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    },

    async getAdminUsers() {
        return await this.request('/api/admin/users');
    },

    async adjustUserBalance(userId, balanceData) {
        return await this.request(`/api/admin/users/${userId}/adjust`, {
            method: 'PUT',
            body: JSON.stringify(balanceData)
        });
    }
};

API.init();
window.API = API;
