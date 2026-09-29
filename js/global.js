function getSystemSettings() {
    var defaults = { storeName: 'nightbaby', storeContact: '', currencySymbol: '₱', taxRate: 0, lowStockThreshold: 10, receiptFooter: 'Thank you for shopping with us', systemDown: false };
    try {
        return Object.assign({}, defaults, JSON.parse(localStorage.getItem('nb_settings') || '{}'));
    } catch (error) {
        return defaults;
    }
}

function formatCurrency(n) {
    return getSystemSettings().currencySymbol + Number(n).toFixed(2);
}

function getCurrentDateTime() {
    var now = new Date();
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var month = months[now.getMonth()];
    var day = now.getDate();
    var hours = now.getHours();
    var minutes = String(now.getMinutes()).padStart(2, '0');
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return month + ' ' + day + ', ' + hours + ':' + minutes + ' ' + ampm;
}

function generateReceiptId(accountId) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var accountPart = String(accountId || 'LOCAL').replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
    var id = 'POS-' + accountPart + '-';
    for (var i = 0; i < 10; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}


function showNotification(msg, type) {
    if (!type) type = 'info';

    var existing = document.querySelector('.pos-notification');
    if (existing) {
        existing.remove();
    }

    var notification = document.createElement('div');
    notification.className = 'pos-notification pos-notification-' + type;
    notification.textContent = msg;
    document.body.appendChild(notification);

    setTimeout(function () {
        notification.classList.add('show');
    }, 10);

    setTimeout(function () {
        notification.classList.remove('show');
        setTimeout(function () {
            notification.remove();
        }, 300);
    }, 3000);
}
function getProducts() {
    try {
        var raw = localStorage.getItem('nb_products');
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}
function compressImageFile(file, maxDim, quality, callback) {
    var max = maxDim || 400;
    var q = quality || 0.7;
    var reader = new FileReader();
    reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
            try {
                var scale = Math.min(1, max / Math.max(img.width, img.height));
                var w = Math.max(1, Math.round(img.width * scale));
                var h = Math.max(1, Math.round(img.height * scale));
                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                callback(canvas.toDataURL('image/jpeg', q));
            } catch (err) {
                callback(String(e.target.result || ''));
            }
        };
        img.onerror = function () { callback(String(e.target.result || '')); };
        img.src = e.target.result;
    };
    reader.onerror = function () { callback(''); };
    reader.readAsDataURL(file);
}

function shrinkStoredProductImages(products, maxDim, quality, onDone) {
    var max = maxDim || 300;
    var q = quality || 0.6;
    var pending = 0;
    var changed = false;
    function maybeDone() {
        if (pending === 0 && typeof onDone === 'function') onDone(changed);
    }
    for (var i = 0; i < products.length; i++) {
        (function (p) {
            var img = p && typeof p.image === 'string' ? p.image : '';
            if (img.indexOf('data:image') === 0 && img.length > 20000) {
                pending++;
                var imageEl = new Image();
                imageEl.onload = function () {
                    try {
                        var scale = Math.min(1, max / Math.max(imageEl.width, imageEl.height));
                        var w = Math.max(1, Math.round(imageEl.width * scale));
                        var h = Math.max(1, Math.round(imageEl.height * scale));
                        var canvas = document.createElement('canvas');
                        canvas.width = w;
                        canvas.height = h;
                        canvas.getContext('2d').drawImage(imageEl, 0, 0, w, h);
                        var small = canvas.toDataURL('image/jpeg', q);
                        if (small.length < img.length) { p.image = small; changed = true; }
                    } catch (err) { }
                    pending--;
                    maybeDone();
                };
                imageEl.onerror = function () { pending--; maybeDone(); };
                imageEl.src = img;
            }
        })(products[i]);
    }
    maybeDone();
}

function saveProducts(arr) {
    try {
        localStorage.setItem('nb_products', JSON.stringify(arr));
    } catch (e) {
        if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
            shrinkStoredProductImages(arr, 300, 0.55, function () {
                try {
                    localStorage.setItem('nb_products', JSON.stringify(arr));
                    if (typeof showNotification === 'function') {
                        showNotification('Storage was full — product images were compressed to fit.', 'info');
                    }
                } catch (e2) {
                    if (typeof showNotification === 'function') {
                        showNotification('Storage full: unable to save products. Free up space or use fewer/smaller product images.', 'error');
                    }
                }
            });
            return false;
        }
        throw e;
    }
    return true;
}
function getProductById(id) {
    var products = getProducts();
    var target = String(id);
    for (var i = 0; i < products.length; i++) {
        if (String(products[i].id) === target) {
            return products[i];
        }
    }
    return undefined;
}
function generateAlphanumericId(len) {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var result = '';
    for (var i = 0; i < (len || 6); i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function getRemittances() {
    try {
        var raw = localStorage.getItem('nb_remittances');
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}
function saveRemittances(arr) {
    try {
        localStorage.setItem('nb_remittances', JSON.stringify(arr));
        return true;
    } catch (e) {
        return false;
    }
}
function addRemittance(obj) {
    var remittances = getRemittances();
    obj.id = 'RMT-' + generateAlphanumericId(6);
    remittances.push(obj);
    saveRemittances(remittances);
    return obj;
}
function getRemittedTxIds() {
    var ids = [];
    var remittances = getRemittances();
    for (var i = 0; i < remittances.length; i++) {
        var idsFromRecord = remittances[i].txIds || [];
        for (var j = 0; j < idsFromRecord.length; j++) {
            if (ids.indexOf(String(idsFromRecord[j])) === -1) ids.push(String(idsFromRecord[j]));
        }
    }
    return ids;
}
function getUnremittedCashTransactions(cashierName) {
    var remitted = getRemittedTxIds();
    var transactions = typeof getTransactions === 'function' ? getTransactions() : [];
    var result = [];
    for (var i = 0; i < transactions.length; i++) {
        var tx = transactions[i];
        var status = String(tx.status || 'completed').toLowerCase();
        if (status === 'refunded') continue;
        var method = String(tx.paymentMethod || tx.payment || '').toLowerCase();
        if (method !== 'cash') continue;
        var txCashier = String(tx.cashierName || tx.cashier || '');
        if (cashierName && txCashier.toLowerCase() !== String(cashierName).toLowerCase()) continue;
        var txId = String(tx.id || tx.receiptId || '');
        if (!txId || remitted.indexOf(txId) !== -1) continue;
        result.push(tx);
    }
    result.sort(function (a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });
    return result;
}

function addProduct(obj) {
    var products = getProducts();
    var newId;
    do {
        newId = generateAlphanumericId(6);
    } while (products.some(function (p) { return String(p.id) === newId; }));
    obj.id = newId;
    products.push(obj);
    saveProducts(products);
    return obj;
}
function updateProduct(id, newFields) {
    var products = getProducts();
    var target = String(id);
    for (var i = 0; i < products.length; i++) {
        if (String(products[i].id) === target) {
            for (var key in newFields) {
                if (newFields.hasOwnProperty(key)) {
                    products[i][key] = newFields[key];
                }
            }
            saveProducts(products);
            return products[i];
        }
    }
    return undefined;
}
function deleteProduct(id) {
    var products = getProducts();
    var target = String(id);
    for (var i = 0; i < products.length; i++) {
        if (String(products[i].id) === target) {
            products.splice(i, 1);
            saveProducts(products);
            return true;
        }
    }
    return false;
}
function deductProductStock(cartItems) {
    var products = getProducts();
    for (var i = 0; i < cartItems.length; i++) {
        var cartItem = cartItems[i];
        var cartId = String(cartItem.id);
        var cartQty = Number(cartItem.quantity) || 0;
        for (var j = 0; j < products.length; j++) {
            if (String(products[j].id) === cartId) {
                var newStock = Number(products[j].stock) - cartQty;
                products[j].stock = Math.max(0, newStock);
                break;
            }
        }
    }
    saveProducts(products);
    return true;
}

function restoreProductStock(items) {
    var products = getProducts();
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var itemId = String(item.id || item.sku);
        var itemQty = Number(item.quantity) || 0;
        for (var j = 0; j < products.length; j++) {
            if (String(products[j].id) === itemId || String(products[j].sku) === itemId) {
                products[j].stock = (Number(products[j].stock) || 0) + itemQty;
                break;
            }
        }
    }
    saveProducts(products);
    return true;
}

function getRefundedItems() {
    var txs = getTransactions();
    var refunded = [];
    for (var i = 0; i < txs.length; i++) {
        var tx = txs[i];
        var items = tx.items || [];
        for (var j = 0; j < items.length; j++) {
            var it = items[j];
            if (it.refunded) {
                refunded.push({
                    txId: tx.id,
                    txDate: tx.date,
                    productId: it.id,
                    productName: it.name,
                    quantity: it.quantity,
                    price: it.price,
                    refundReason: it.refundReason || 'N/A',
                    refundedAt: it.refundedAt || tx.timestamp
                });
            }
        }
    }
    return refunded;
}

function saveTransaction(tx) {
    var allTx = getTransactions();
    var target = String(tx.id);
    for (var i = 0; i < allTx.length; i++) {
        if (String(allTx[i].id) === target) {
            allTx[i] = tx;
            saveTransactions(allTx);
            return true;
        }
    }
    allTx.unshift(tx);
    saveTransactions(allTx);
    return true;
}
function getTransactions() {
    try {
        var raw = localStorage.getItem('nb_transactions');
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}
function saveTransactions(arr) {
    try {
        localStorage.setItem('nb_transactions', JSON.stringify(arr));
    } catch (e) {
        if (e && e.name === 'QuotaExceededError') {
            showNotification('Storage full: cannot save the sale! Delete old transactions first to free up space.', 'error');
        }
        throw e;
    }
}
function addTransaction(tx) {
    var list = getTransactions();
    if (!tx.status) {
        tx.status = 'Completed';
    }
    list.unshift(tx);
    saveTransactions(list);
}
function getUsers() {
    try {
        var raw = localStorage.getItem('nb_users');
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}
function saveUsers(arr) {
    try {
        localStorage.setItem('nb_users', JSON.stringify(arr));
    } catch (e) {
        if (e && e.name === 'QuotaExceededError') {
            showNotification('Storage full: unable to save user data. Clear old transactions.', 'error');
        }
        throw e;
    }
}
var NB_DEFAULT_SALT_SUPERADMIN = 'nightbaby-super-2026';
var NB_DEFAULT_SALT_ADMIN = 'nightbaby-admin-2026';
var NB_DEFAULT_CASHIER_PREFIX = { super_admin: 'SUP', admin: 'ADM', cashier: 'CSH' };

function getDefaultUsers() {
    return [
        {
            username: 'superadmin',
            role: 'super_admin',
            cashierId: 'SUP-0001',
            salt: NB_DEFAULT_SALT_SUPERADMIN,
            passwordHash: '',
            accountHolderName: 'Super Admin',
            fullname: 'Super Admin',
            fullName: 'Super Admin',
            securityQuestion: '',
            securityAnswer: '',
            enabled: true,
            preferences: { theme: 'dark', fontSize: 'default' }
        },
        {
            username: 'admin',
            role: 'admin',
            cashierId: 'ADM-0001',
            salt: NB_DEFAULT_SALT_ADMIN,
            passwordHash: '',
            accountHolderName: 'Admin',
            fullname: 'Admin',
            fullName: 'Admin',
            securityQuestion: '',
            securityAnswer: '',
            enabled: true,
            preferences: { theme: 'dark', fontSize: 'default' }
        }
    ];
}

function getDefaultSettings() {
    return { storeName: 'nightbaby', storeContact: '', currencySymbol: '₱', taxRate: 0, lowStockThreshold: 10, receiptFooter: 'Thank you for shopping with us', systemDown: false };
}

var NB_DATA_KEYS = ['nb_users', 'nb_products', 'nb_transactions', 'nb_discounts', 'nb_settings', 'nb_revenue', 'nb_stock_overrides', 'nb_login_attempts', 'nb_top_selling_products'];

function buildDefaultData() {
    var data = {};
    data['nb_users'] = JSON.stringify(getDefaultUsers());
    data['nb_products'] = JSON.stringify([]);
    data['nb_transactions'] = JSON.stringify([]);
    data['nb_discounts'] = JSON.stringify([]);
    data['nb_settings'] = JSON.stringify(getDefaultSettings());
    data['nb_revenue'] = JSON.stringify({});
    data['nb_stock_overrides'] = JSON.stringify({});
    data['nb_login_attempts'] = JSON.stringify({});
    return data;
}

function resetSystemToDefaults(includeUsers) {
    var defaults = buildDefaultData();
    if (includeUsers === false) {
        delete defaults['nb_users'];
    }
    Object.keys(defaults).forEach(function (key) {
        try { localStorage.setItem(key, defaults[key]); } catch (e) {}
    });
    try { localStorage.removeItem('nb_seed_done'); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
}

async function ensureDefaultPasswordHashes() {
    try {
        var users = getUsers();
        var changed = false;
        for (var i = 0; i < users.length; i++) {
            var u = users[i];
            if (u.username === 'superadmin' && !u.passwordHash) {
                u.passwordHash = await hashPassword('NightBaby2026!', NB_DEFAULT_SALT_SUPERADMIN);
                changed = true;
            }
            if (u.username === 'admin' && !u.passwordHash) {
                u.passwordHash = await hashPassword('Admin2026!', NB_DEFAULT_SALT_ADMIN);
                changed = true;
            }
        }
        if (changed) saveUsers(users);
    } catch (e) {}
}

function loadApplicationData() {
    try {
        if (localStorage.getItem('nb_users') === null) {
            var defaults = buildDefaultData();
            Object.keys(defaults).forEach(function (key) {
                if (localStorage.getItem(key) === null) {
                    try { localStorage.setItem(key, defaults[key]); } catch (e) {}
                }
            });
        } else {
            var users = getUsers();
            var migrated = false;
            users.forEach(function (user) {
                if (user.username === 'superuser') { user.username = 'superadmin'; migrated = true; }
                if (user.role === 'superuser') { user.role = 'it'; migrated = true; }
                if (!user.accountHolderName && (user.fullname || user.fullName)) {
                    user.accountHolderName = user.fullname || user.fullName;
                    migrated = true;
                }
            });
            if (migrated) saveUsers(users);
        }
    } catch (e) {}
    return ensureDefaultPasswordHashes();
}

var nbDataReady = loadApplicationData();
function normalizeRoleLabel(role) {
    if (role === 'it' || role === 'super_admin' || role === 'superadmin') return 'Super Admin';
    if (role === 'admin') return 'Admin';
    return 'Cashier';
}
function generateCashierId(role, users) {
    var prefix = '';
    if (role === 'cashier') prefix = 'CSH';
    else if (role === 'admin') prefix = 'ADM';
    else if (role === 'super_admin' || role === 'it') prefix = 'SUP';
    else prefix = 'USR';
    var maxNum = 0;
    for (var i = 0; i < users.length; i++) {
        var cid = users[i].cashierId || '';
        if (cid.indexOf(prefix + '-') === 0) {
            var numPart = cid.substring(prefix.length + 1);
            var num = parseInt(numPart, 10);
            if (num > maxNum) {
                maxNum = num;
            }
        }
    }
    var nextNum = maxNum + 1;
    var padded = String(nextNum).padStart(4, '0');
    return prefix + '-' + padded;
}
function generateSalt() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var salt = '';
    for (var i = 0; i < 32; i++) {
        salt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return salt;
}
async function hashPassword(pw, salt) {
    var input = salt + pw;
    try {
        if (window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === 'function') {
            var encoder = new TextEncoder();
            var data = encoder.encode(input);
            var hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
            var hashArray = new Uint8Array(hashBuffer);
            var hex = '';
            for (var i = 0; i < hashArray.length; i++) {
                var byteHex = hashArray[i].toString(16).padStart(2, '0');
                hex += byteHex;
            }
            return hex;
        }
    } catch (cryptoErr) {
    }
    var fake = 'FAKE__' + salt + '__' + btoa(pw);
    return fake;
}
async function verifyPassword(pw, stored) {
    var salt = stored.salt || '';
    var storedHash = stored.passwordHash || stored.hash || '';
    var computedHash = await hashPassword(pw, salt);
    return computedHash === storedHash;
}

function validatePasswordStrength(password) {
    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters.' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one uppercase letter.' };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one lowercase letter.' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one number.' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one special character.' };
    }
    return { valid: true, message: '' };
}

function recordFailedLoginAttempt(username) {
    var key = String(username || '').toLowerCase();
    if (!key) return;
    var attempts = {};
    try { attempts = JSON.parse(localStorage.getItem('nb_login_attempts') || '{}') || {}; } catch (e) { attempts = {}; }
    var now = Date.now();
    if (!attempts[key]) {
        attempts[key] = { count: 0, lastAttempt: 0 };
    }
    attempts[key].count++;
    attempts[key].lastAttempt = now;
    localStorage.setItem('nb_login_attempts', JSON.stringify(attempts));
}

function clearFailedLoginAttempts(username) {
    var key = String(username || '').toLowerCase();
    if (!key) return;
    var attempts = {};
    try { attempts = JSON.parse(localStorage.getItem('nb_login_attempts') || '{}') || {}; } catch (e) { attempts = {}; }
    delete attempts[key];
    delete attempts[username];
    localStorage.setItem('nb_login_attempts', JSON.stringify(attempts));
}

function getFailedLoginCount(username) {
    if (!username) return 0;
    var key = String(username).toLowerCase();
    var attempts = {};
    try { attempts = JSON.parse(localStorage.getItem('nb_login_attempts') || '{}') || {}; } catch (e) { attempts = {}; }
    var entry = attempts[key] || attempts[username];
    return entry ? (Number(entry.count) || 0) : 0;
}

function isAccountLocked(username) {
    if (!username) return false;
    var key = String(username).toLowerCase();
    var raw = localStorage.getItem('nb_login_attempts') || '{}';
    var attempts = {};
    try { attempts = JSON.parse(raw) || {}; } catch (e) { attempts = {}; }
    var userAttempts = attempts[key] || attempts[username];
    if (!userAttempts) return false;
    
    var now = Date.now();
    var lockoutDuration = 15 * 60 * 1000;
    
    if (userAttempts.count >= 5 && (now - userAttempts.lastAttempt) < lockoutDuration) {
        return true;
    }
    
    if ((now - userAttempts.lastAttempt) >= lockoutDuration) {
        clearFailedLoginAttempts(username);
    }
    
    return false;
}

function getRemainingLockoutTime(username) {
    if (!username) return 0;
    var key = String(username).toLowerCase();
    var raw = localStorage.getItem('nb_login_attempts') || '{}';
    var attempts = {};
    try { attempts = JSON.parse(raw) || {}; } catch (e) { attempts = {}; }
    var userAttempts = attempts[key] || attempts[username];
    if (!userAttempts) return 0;
    
    var now = Date.now();
    var lockoutDuration = 15 * 60 * 1000;
    var elapsed = now - userAttempts.lastAttempt;
    var remaining = lockoutDuration - elapsed;
    
    return Math.max(0, Math.ceil(remaining / 1000));
}

function generateSessionToken() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var token = '';
    for (var i = 0; i < 64; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

function setSession(userObj) {
    var sessionData = {
        username: userObj.username,
        fullname: userObj.fullname || userObj.accountHolderName || userObj.username,
        accountHolderName: userObj.accountHolderName || userObj.fullname || userObj.username,
        role: userObj.role,
        cashierId: userObj.cashierId || '',
        token: generateSessionToken(),
        createdAt: Date.now(),
        expiresAt: Date.now() + (8 * 60 * 60 * 1000)
    };
    localStorage.setItem('nb_session', JSON.stringify(sessionData));
    localStorage.setItem('nb_session_tokens', JSON.stringify((JSON.parse(localStorage.getItem('nb_session_tokens') || '[]')).concat([sessionData.token])));
}

function isSessionValid() {
    var session = getSession();
    if (!session) return false;
    
    var now = Date.now();
    if (now > session.expiresAt) {
        logout();
        return false;
    }
    
    session.expiresAt = now + (8 * 60 * 60 * 1000);
    localStorage.setItem('nb_session', JSON.stringify(session));
    
    return true;
}
function loginRequired(allowedRolesArray) {
    if (typeof requireAuth === 'function') {
        return requireAuth(allowedRolesArray);
    }

    var session = getSession();
    if (!session || !isSessionValid()) {
        window.location.href = 'index.html';
        return false;
    }
    var roleAllowed = false;
    for (var i = 0; i < allowedRolesArray.length; i++) {
        if (allowedRolesArray[i] === session.role) {
            roleAllowed = true;
            break;
        }
    }
    if (!roleAllowed) {
        window.location.href = 'index.html';
        return false;
    }

    return true;
}

function getSession() {
    try {
        var raw = localStorage.getItem('nb_session');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}
function isDefaultPasswordUser(user) {
    if (!user) return false;
    var defaults = {
        'superadmin': 'NightBaby2026!',
        'admin': 'Admin2026!'
    };
    if (defaults[user.username]) {
        return true;
    }
    return false;
}

function needsSecurityQuestion(user) {
    if (!user) return false;
    return !user.securityQuestion || !user.securityAnswer || String(user.securityQuestion).trim() === '' || String(user.securityAnswer).trim() === '';
}

function needsAccountSetup(user) {
    if (!user) return false;
    var defaultPass = isDefaultPasswordUser(user);
    var noSecurity = needsSecurityQuestion(user);
    return defaultPass || noSecurity;
}

function getAccountSetupStatus(user) {
    return {
        needsSetup: needsAccountSetup(user),
        defaultPassword: isDefaultPasswordUser(user),
        needsSecurityQuestion: needsSecurityQuestion(user)
    };
}

function refreshAccountBadges(session) {
    if (!session) return;
    var storedUser = getUsers().find(function (user) {
        return user.username === session.username;
    });
    var needsBadge = needsSecurityQuestion(storedUser);

    var avatars = document.querySelectorAll('.admin-avatar');
    avatars.forEach(function (avatar) {
        var wrapper = avatar.parentElement.classList && avatar.parentElement.classList.contains('admin-avatar-wrapper')
            ? avatar.parentElement
            : null;
        if (!wrapper) {
            wrapper = document.createElement('span');
            wrapper.className = 'admin-avatar-wrapper';
            avatar.parentNode.insertBefore(wrapper, avatar);
            wrapper.appendChild(avatar);
        }
        var existingBadge = wrapper.querySelector('.avatar-notif-badge');
        if (needsBadge) {
            if (!existingBadge) {
                var badge = document.createElement('span');
                badge.className = 'avatar-notif-badge';
                badge.setAttribute('aria-hidden', 'true');
                wrapper.appendChild(badge);
            }
        } else {
            if (existingBadge) existingBadge.remove();
        }
    });

    var menuAccountItem = document.getElementById('accountSettingsOption');
    if (menuAccountItem) {
        var existingMenuBadge = menuAccountItem.querySelector('.menu-notif-badge');
        var spanWrapper = menuAccountItem.querySelector('span');
        if (needsBadge) {
            if (!existingMenuBadge) {
                var menuBadge = document.createElement('span');
                menuBadge.className = 'menu-notif-badge';
                menuBadge.setAttribute('aria-hidden', 'true');
                if (spanWrapper) spanWrapper.appendChild(menuBadge);
            }
        } else {
            if (existingMenuBadge) existingMenuBadge.remove();
        }
    }

    var modalHeader = document.querySelector('#profileSettingsModal .account-modal-header h2');
    if (modalHeader) {
        var existingModalBadge = modalHeader.querySelector('.modal-notif-badge');
        if (needsBadge) {
            if (!existingModalBadge) {
                var modalBadge = document.createElement('span');
                modalBadge.className = 'modal-notif-badge';
                modalBadge.textContent = '!';
                modalBadge.setAttribute('title', 'Please set your security question and answer');
                modalHeader.style.position = 'relative';
                modalHeader.style.display = 'inline-flex';
                modalHeader.style.alignItems = 'center';
                modalHeader.style.gap = '0.5rem';
                modalHeader.appendChild(modalBadge);
            }
        } else {
            if (existingModalBadge) existingModalBadge.remove();
        }
    }
}

function logout() {
    var session = getSession();
    if (session && session.token) {
        var tokens = JSON.parse(localStorage.getItem('nb_session_tokens') || '[]');
        tokens = tokens.filter(function (token) { return token !== session.token; });
        localStorage.setItem('nb_session_tokens', JSON.stringify(tokens));
    }
    localStorage.removeItem('nb_session');
    if (typeof clearLastAuthorizedPage === 'function') {
        clearLastAuthorizedPage();
    }
    window.location.href = 'index.html';
}

function initializeProfileMenu(session) {
    var avatars = document.querySelectorAll('.admin-avatar');

    if (!avatars.length || !session) return;

    var storedUser = getUsers().find(function (user) {
        return user.username === session.username;
    }) || session;
    var accountPreferences = storedUser.preferences || {};
    var menu = document.createElement('div');
    menu.className = 'profile-menu preferences-collapsed';
    menu.id = 'profileMenu';
    menu.innerHTML = '<button type="button" class="profile-menu-heading" id="preferencesToggle" aria-expanded="false">Preferences</button>' +
        '<div class="profile-menu-options">' +
        '<button type="button" class="profile-menu-item" id="darkModeOption"><span>Dark mode</span><span class="theme-switch" aria-hidden="true"><span></span></span></button>' +
        '<label class="profile-menu-item profile-font-size" for="fontSizeOption"><span>Font size</span><select id="fontSizeOption" aria-label="Font size"><option value="small">Small</option><option value="default">Default</option><option value="large">Large</option></select></label>' +
        '</div>' +
        '<button type="button" class="profile-menu-item account-settings-item" id="accountSettingsOption"><span>Account settings</span></button>';
    document.body.appendChild(menu);

    var modal = document.createElement('div');
    modal.className = 'account-modal-overlay';
    modal.id = 'profileSettingsModal';
    modal.hidden = true;
    modal.innerHTML = '<section class="account-modal profile-settings-modal" role="dialog" aria-modal="true" aria-labelledby="profileSettingsTitle">' +
        '<div class="account-modal-header"><h2 id="profileSettingsTitle">Account Settings</h2><button type="button" class="pos-modal-close" id="closeProfileSettings" aria-label="Close">&times;</button></div>' +
        '<form id="profileSettingsForm" class="account-form" autocomplete="off">' +
        '<div class="profile-photo-editor"><div class="profile-photo-preview" id="profilePhotoPreview"></div><div><strong>Profile picture</strong><small>Upload an image or take a photo.</small><div class="profile-photo-actions"><label class="profile-photo-button" for="profilePhotoUpload">Upload<input type="file" id="profilePhotoUpload" accept="image/*"></label><button type="button" class="profile-photo-button" id="takePhotoButton">Take a photo</button><input type="file" id="profileCameraFallback" accept="image/*" capture="user" hidden></div></div></div>' +
        '<div class="camera-capture-panel" id="cameraCapturePanel" hidden><video id="cameraPreview" autoplay playsinline></video><canvas id="cameraCanvas" hidden></canvas><div class="camera-capture-actions"><button type="button" class="profile-photo-button" id="capturePhotoButton">Capture</button><button type="button" class="profile-photo-button" id="cancelCameraButton">Cancel</button></div></div>' +
        '<div class="form-group"><label for="profileName">Name</label><input type="text" id="profileName" required autocomplete="name"></div>' +
        '<div class="form-group"><label for="profileUsername">Username</label><input type="text" id="profileUsername" required autocomplete="username" pattern="[A-Za-z0-9_]{3,32}" title="3-32 letters, numbers, or underscores only"></div>' +
        '<div class="profile-settings-grid"><div class="form-group"><label for="profileCurrentPassword">Current password</label><input type="password" id="profileCurrentPassword" autocomplete="current-password"></div><div class="form-group"><label for="profileNewPassword">New password</label><input type="password" id="profileNewPassword" autocomplete="new-password"></div></div>' +
        '<div class="form-group"><label for="profileConfirmPassword">Confirm new password</label><input type="password" id="profileConfirmPassword" autocomplete="new-password"></div>' +
        '<div class="security-question-wrapper" id="securityQuestionWrapper">' +
        '<div class="security-question-status" id="securityQuestionStatus"><div class="form-group security-set-group"><button type="button" class="modal-btn-confirm reset-security-btn" id="resetSecurityQuestionBtn">Security Question (Reset Security Question)</button></div></div>' +
        '<div class="security-question-fields" id="securityQuestionFields">' +
        '<div class="form-group"><label for="profileSecurityQuestion">Security question</label><select id="profileSecurityQuestion"><option value="">Select a security question</option><option value="pet">What was the name of your first pet?</option><option value="school">What was the name of your first school?</option><option value="city">In what city were you born?</option></select></div>' +
        '<div class="form-group"><label for="profileSecurityAnswer">Security answer</label><input type="text" id="profileSecurityAnswer" autocomplete="off"></div>' +
        '</div>' +
        '<div class="security-question-password-verify" id="securityQuestionVerify" hidden>' +
        '<div class="form-group"><label for="resetSecurityVerifyPass">Enter current password to reset security question</label><input type="password" id="resetSecurityVerifyPass" autocomplete="current-password"></div>' +
        '<div class="verify-actions"><button type="button" class="modal-btn-cancel" id="cancelSecurityVerifyBtn">Cancel</button><button type="button" class="modal-btn-confirm" id="confirmSecurityVerifyBtn">Confirm</button></div>' +
        '</div>' +
        '</div>' +
        '<p class="account-form-error" id="profileSettingsError" role="alert"></p><div class="account-modal-footer"><button type="button" class="modal-btn-cancel" id="cancelProfileSettings">Cancel</button><button type="submit" class="modal-btn-confirm">Save changes</button></div></form></section>';
    document.body.appendChild(modal);
    var cameraStream = null;

    function persistPreference(name, value) {
        var users = getUsers();
        var user = users.find(function (item) { return item.username === session.username; });
        if (!user) return;
        user.preferences = user.preferences || {};
        user.preferences[name] = value;
        saveUsers(users);
        storedUser.preferences = user.preferences;
    }
    function setTheme(theme) {
        var root = document.documentElement;
        root.classList.add('theme-switching');
        void root.offsetHeight;
        root.setAttribute('data-theme', theme);
        var switchEl = document.querySelector('#darkModeOption .theme-switch');
        if (switchEl) switchEl.classList.toggle('on', theme === 'dark');
        var logos = document.querySelectorAll('.sidebar-logo-img');
        for (var li = 0; li < logos.length; li++) {
            logos[li].src = theme === 'light' ? 'images/logo_black.png' : 'images/logo.png';
        }
        document.dispatchEvent(new CustomEvent('nb-theme-change', { detail: { theme: theme } }));
        try { persistPreference('theme', theme); } catch (e) {}
        void root.offsetHeight;
        requestAnimationFrame(function () {
            root.classList.remove('theme-switching');
        });
    }
    setTheme(accountPreferences.theme || 'dark');
    function setFontSize(size) {
        var sizes = { small: '90%', default: '100%', large: '110%' };
        var selectedSize = sizes[size] ? size : 'default';
        document.documentElement.style.fontSize = sizes[selectedSize];
        persistPreference('fontSize', selectedSize);
        document.getElementById('fontSizeOption').value = selectedSize;
    }
    setFontSize(accountPreferences.fontSize || 'default');

    function updateAvatars(user) {
        var picture = user.profilePicture || '';
        avatars.forEach(function (avatar) {
            var image = avatar.querySelector('img');
            if (!image) return;
            image.src = picture || 'sources/icons/user-svgrepo-com.png';
            image.classList.toggle('profile-avatar-image', Boolean(picture));
        });
    }
    function closeMenu() { menu.classList.remove('open'); }
    var menuCloseTimer;
    function showMenu() {
        clearTimeout(menuCloseTimer);
        menu.classList.add('open');
    }
    function scheduleMenuClose() {
        menuCloseTimer = setTimeout(closeMenu, 180);
    }
    function openSettings() {
        var currentUser = getUsers().find(function (user) { return user.username === session.username; }) || session;
        var hasSecurityQuestion = !needsSecurityQuestion(currentUser);

        document.getElementById('profileName').value = currentUser.accountHolderName || currentUser.fullname || currentUser.username || '';
        document.getElementById('profileUsername').value = currentUser.username || '';
        document.getElementById('profileSecurityQuestion').value = currentUser.securityQuestion || '';
        document.getElementById('profileSecurityAnswer').value = currentUser.securityAnswer || '';
        document.getElementById('profileCurrentPassword').value = '';
        document.getElementById('profileNewPassword').value = '';
        document.getElementById('profileConfirmPassword').value = '';
        document.getElementById('profileSettingsError').textContent = '';
        document.getElementById('resetSecurityVerifyPass').value = '';

        var statusDiv = document.getElementById('securityQuestionStatus');
        var fieldsDiv = document.getElementById('securityQuestionFields');
        var verifyDiv = document.getElementById('securityQuestionVerify');

        if (hasSecurityQuestion) {
            statusDiv.style.display = '';
            fieldsDiv.style.display = 'none';
            verifyDiv.hidden = true;
        } else {
            statusDiv.style.display = 'none';
            fieldsDiv.style.display = '';
            verifyDiv.hidden = true;
        }

        var preview = document.getElementById('profilePhotoPreview');
        preview.innerHTML = currentUser.profilePicture ? '<img src="' + currentUser.profilePicture + '" alt="Profile preview">' : '<span>' + (currentUser.username || 'A').charAt(0).toUpperCase() + '</span>';
        modal.hidden = false;
        modal.classList.add('active');
        closeMenu();
        refreshAccountBadges(session);
        document.getElementById('profileName').focus();
    }
    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(function (track) { track.stop(); });
            cameraStream = null;
        }
        var cameraPreview = document.getElementById('cameraPreview');
        var cameraPanel = document.getElementById('cameraCapturePanel');
        if (cameraPreview) cameraPreview.srcObject = null;
        if (cameraPanel) cameraPanel.hidden = true;
    }
    function closeSettings() {
        stopCamera();
        modal.classList.remove('active');
        modal.hidden = true;
    }
    async function startCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            document.getElementById('profileCameraFallback').click();
            return;
        }
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
            var cameraPreview = document.getElementById('cameraPreview');
            cameraPreview.srcObject = cameraStream;
            document.getElementById('cameraCapturePanel').hidden = false;
        } catch (error) {
            document.getElementById('profileCameraFallback').click();
        }
    }
    function capturePhoto() {
        var cameraPreview = document.getElementById('cameraPreview');
        var cameraCanvas = document.getElementById('cameraCanvas');
        if (!cameraPreview.videoWidth || !cameraPreview.videoHeight) return;
        cameraCanvas.width = cameraPreview.videoWidth;
        cameraCanvas.height = cameraPreview.videoHeight;
        cameraCanvas.getContext('2d').drawImage(cameraPreview, 0, 0, cameraCanvas.width, cameraCanvas.height);
        modal.dataset.profilePicture = cameraCanvas.toDataURL('image/jpeg', 0.88);
        modal.dataset.profilePictureName = session.username + '_' + (storedUser.role || session.role || 'user');
        document.getElementById('profilePhotoPreview').innerHTML = '<img src="' + modal.dataset.profilePicture + '" alt="Profile preview">';
        stopCamera();
    }
    function readPhoto(file) {
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
            document.getElementById('profilePhotoPreview').innerHTML = '<img src="' + reader.result + '" alt="Profile preview">';
            modal.dataset.profilePicture = reader.result;
            modal.dataset.profilePictureName = session.username + '_' + (storedUser.role || session.role || 'user');
        };
        reader.readAsDataURL(file);
    }
    avatars.forEach(function (avatar) {
        avatar.setAttribute('role', 'button');
        avatar.setAttribute('tabindex', '0');
        avatar.setAttribute('aria-label', 'Open profile preferences');
        avatar.addEventListener('click', function (event) { event.stopPropagation(); menu.classList.toggle('open'); });
        avatar.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showMenu(); } });
    });
    menu.addEventListener('mouseenter', showMenu);
    menu.addEventListener('mouseleave', scheduleMenuClose);
    document.getElementById('preferencesToggle').addEventListener('click', function () {
        var expanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!expanded));
        menu.classList.toggle('preferences-collapsed', expanded);
    });
    document.getElementById('darkModeOption').addEventListener('click', function () {
        setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
    document.getElementById('fontSizeOption').addEventListener('change', function () { setFontSize(this.value); });
    document.getElementById('accountSettingsOption').addEventListener('click', openSettings);
    document.getElementById('closeProfileSettings').addEventListener('click', closeSettings);
    document.getElementById('cancelProfileSettings').addEventListener('click', closeSettings);

    document.getElementById('resetSecurityQuestionBtn').addEventListener('click', function () {
        var statusDiv = document.getElementById('securityQuestionStatus');
        var fieldsDiv = document.getElementById('securityQuestionFields');
        var verifyDiv = document.getElementById('securityQuestionVerify');
        document.getElementById('resetSecurityVerifyPass').value = '';
        document.getElementById('profileSettingsError').textContent = '';
        statusDiv.style.display = 'none';
        fieldsDiv.style.display = 'none';
        verifyDiv.hidden = false;
        document.getElementById('resetSecurityVerifyPass').focus();
    });

    document.getElementById('cancelSecurityVerifyBtn').addEventListener('click', function () {
        var currentUser = getUsers().find(function (user) { return user.username === session.username; }) || session;
        var hasSecurityQuestion = !needsSecurityQuestion(currentUser);
        var statusDiv = document.getElementById('securityQuestionStatus');
        var fieldsDiv = document.getElementById('securityQuestionFields');
        var verifyDiv = document.getElementById('securityQuestionVerify');
        document.getElementById('resetSecurityVerifyPass').value = '';
        document.getElementById('profileSettingsError').textContent = '';
        if (hasSecurityQuestion) {
            statusDiv.style.display = '';
            fieldsDiv.style.display = 'none';
        } else {
            statusDiv.style.display = 'none';
            fieldsDiv.style.display = '';
        }
        verifyDiv.hidden = true;
    });

    document.getElementById('confirmSecurityVerifyBtn').addEventListener('click', async function () {
        var users = getUsers();
        var user = users.find(function (item) { return item.username === session.username; });
        if (!user) return;
        var verifyPass = document.getElementById('resetSecurityVerifyPass').value;
        if (!(await verifyPassword(verifyPass, user))) {
            document.getElementById('profileSettingsError').textContent = 'Incorrect password. Cannot reset security question.';
            return;
        }
        var statusDiv = document.getElementById('securityQuestionStatus');
        var fieldsDiv = document.getElementById('securityQuestionFields');
        var verifyDiv = document.getElementById('securityQuestionVerify');
        document.getElementById('profileSecurityQuestion').value = '';
        document.getElementById('profileSecurityAnswer').value = '';
        document.getElementById('resetSecurityVerifyPass').value = '';
        document.getElementById('profileSettingsError').textContent = '';
        statusDiv.style.display = 'none';
        fieldsDiv.style.display = '';
        verifyDiv.hidden = true;
    });
    document.addEventListener('click', function (event) { if (!menu.contains(event.target) && !Array.prototype.some.call(avatars, function (avatar) { return avatar.contains(event.target); })) closeMenu(); });
    document.getElementById('profilePhotoUpload').addEventListener('change', function () { readPhoto(this.files[0]); });
    document.getElementById('profileCameraFallback').addEventListener('change', function () { readPhoto(this.files[0]); });
    document.getElementById('takePhotoButton').addEventListener('click', startCamera);
    document.getElementById('capturePhotoButton').addEventListener('click', capturePhoto);
    document.getElementById('cancelCameraButton').addEventListener('click', stopCamera);
    document.getElementById('profileSettingsForm').addEventListener('submit', async function (event) {
        event.preventDefault();
        var error = document.getElementById('profileSettingsError');
        var currentPassword = document.getElementById('profileCurrentPassword').value;
        var newPassword = document.getElementById('profileNewPassword').value;
        var confirmPassword = document.getElementById('profileConfirmPassword').value;
        var newUsernameInput = document.getElementById('profileUsername').value.trim();
        var newUsername = newUsernameInput.toLowerCase();
        var users = getUsers();
        var user = users.find(function (item) { return item.username === session.username; });
        if (!user) return;
        error.textContent = '';

        if (newUsername && newUsername !== user.username.toLowerCase()) {
            if (!/^[A-Za-z0-9_]{3,32}$/.test(newUsername)) {
                error.textContent = 'Username must be 3-32 characters: letters, numbers, or underscores only.';
                return;
            }
            var duplicate = users.find(function (item) { return item.username.toLowerCase() === newUsername; });
            if (duplicate) {
                error.textContent = 'Username is already in use. Please choose a different one.';
                return;
            }
            if (!currentPassword) {
                error.textContent = 'Current password is required to change your username.';
                return;
            }
        }

        if (newPassword || currentPassword || confirmPassword || (newUsername && newUsername !== user.username.toLowerCase())) {
            if (!(await verifyPassword(currentPassword, user))) { error.textContent = 'Current password is incorrect.'; return; }
            
            var passwordValidation = newPassword ? validatePasswordStrength(newPassword) : { valid: true, message: '' };
            if (!passwordValidation.valid) { error.textContent = passwordValidation.message; return; }
            
            if (newPassword && newPassword !== confirmPassword) { error.textContent = 'New passwords do not match.'; return; }
            if (newPassword) {
                user.salt = generateSalt();
                user.passwordHash = await hashPassword(newPassword, user.salt);
                delete user.hash;
            }
        }

        var usernameChanged = newUsername && newUsername !== user.username.toLowerCase();
        if (usernameChanged) {
            var oldUsername = user.username;
            user.username = newUsername;
            if (user.profileImageKey && typeof user.profileImageKey === 'string' && user.profileImageKey.indexOf(oldUsername + '_') === 0) {
                user.profileImageKey = newUsername + '_' + user.profileImageKey.substring((oldUsername + '_').length);
            }
        }

        user.accountHolderName = document.getElementById('profileName').value.trim() || user.username;
        user.fullname = user.accountHolderName;

        var fieldsDiv = document.getElementById('securityQuestionFields');
        var fieldsVisible = fieldsDiv && fieldsDiv.style.display !== 'none';
        if (fieldsVisible) {
            var secQuestion = document.getElementById('profileSecurityQuestion').value;
            var secAnswer = document.getElementById('profileSecurityAnswer').value.trim();
            if (secQuestion && secAnswer) {
                user.securityQuestion = secQuestion;
                user.securityAnswer = secAnswer;
            } else if (!user.securityQuestion || !user.securityAnswer) {
                user.securityQuestion = '';
                user.securityAnswer = '';
            }
        }

        if (modal.dataset.profilePicture) {
            user.profilePicture = modal.dataset.profilePicture;
            user.profileImageKey = modal.dataset.profilePictureName || (user.username + '_' + (user.role || session.role || 'user'));
        }
        saveUsers(users);
        if (usernameChanged) {
            try {
                var currentSession = JSON.parse(localStorage.getItem('nb_session') || 'null');
                if (currentSession) {
                    currentSession.username = user.username;
                    currentSession.fullname = user.accountHolderName;
                    currentSession.accountHolderName = user.accountHolderName;
                    localStorage.setItem('nb_session', JSON.stringify(currentSession));
                }
                var lockedMap = JSON.parse(localStorage.getItem('nb_failed_logins') || '{}');
                if (lockedMap && typeof lockedMap === 'object' && Object.prototype.hasOwnProperty.call(lockedMap, oldUsername)) {
                    lockedMap[user.username] = lockedMap[oldUsername];
                    delete lockedMap[oldUsername];
                    localStorage.setItem('nb_failed_logins', JSON.stringify(lockedMap));
                }
            } catch (e) {}
            session = Object.assign({}, session || {}, {
                username: user.username,
                fullname: user.accountHolderName,
                accountHolderName: user.accountHolderName
            });
        } else {
            setSession(Object.assign({}, session, { fullname: user.accountHolderName, accountHolderName: user.accountHolderName, preferences: user.preferences || {} }));
        }
        updateAvatars(user);
        var nameElement = document.getElementById('topbarAdminName');
        if (nameElement) nameElement.textContent = user.accountHolderName;
        delete modal.dataset.profilePicture;
        refreshAccountBadges(session);
        closeSettings();
        if (typeof showNotification === 'function') {
            var msg = usernameChanged ? 'Account settings saved. Username updated — please use your new username next login.' : 'Account settings saved.';
            showNotification(msg, 'success');
        }
    });
    updateAvatars(storedUser);
    refreshAccountBadges(session);
}
document.addEventListener('DOMContentLoaded', async function () {
    var currentPage = window.location.pathname.split('/').pop() || '';
    var isCustomerDisplay = (currentPage === 'customer.html');
    var session = getSession();
    if (isCustomerDisplay) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.style.fontSize = '100%';
    } else
    if (session) {
        var users = getUsers();
        var user = users.find(function (user) { return user.username === session.username; });
        if (user && user.preferences && user.preferences.theme) {
            document.documentElement.setAttribute('data-theme', user.preferences.theme);
            document.querySelectorAll('.sidebar-logo-img').forEach(function (logo) {
                logo.src = user.preferences.theme === 'light' ? 'images/logo_black.png' : 'images/logo.png';
            });
        }
    }
    
    var isLoginPage = (currentPage === 'index.html' || currentPage === 'login.html' || currentPage === '');
    
    if (!isLoginPage) {
        if (typeof enforceAccessControl === 'function') {
            if (!enforceAccessControl()) {
                return;
            }
        } else {
            if (!validatePageAccess()) {
                return;
            }
        }
    } else {

        if (session && isSessionValid()) {
            var userRole = session.role;
            var redirectPage = (typeof getDefaultPage === 'function')
                ? getDefaultPage(userRole)
                : (userRole === 'cashier' ? 'pos.html'
                  : (userRole === 'super_admin' || userRole === 'it' || userRole === 'superuser') ? 'account_management.html'
                  : 'dashboard.html');
            if (typeof setLastAuthorizedPage === 'function') {
                setLastAuthorizedPage(redirectPage);
            }
            window.location.href = redirectPage;
            return;
        }
    }

    
    function updateDateTime() {
        var now = new Date();
        var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        var dayName = days[now.getDay()];
        var monthName = months[now.getMonth()];
        var day = now.getDate();
        var year = now.getFullYear();
        var dateString = monthName + ' ' + day + ', ' + year;

        var hours = now.getHours();
        var minutes = String(now.getMinutes()).padStart(2, '0');
        var ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        var timeString = hours + ':' + minutes + ' ' + ampm;
        var dayEls = document.querySelectorAll('.datetime-day');
        for (var i = 0; i < dayEls.length; i++) { dayEls[i].textContent = dayName; }

        var dateEls = document.querySelectorAll('.datetime-date');
        for (var j = 0; j < dateEls.length; j++) { dateEls[j].textContent = dateString; }

        var timeEls = document.querySelectorAll('.datetime-time');
        for (var k = 0; k < timeEls.length; k++) { timeEls[k].textContent = timeString; }

        var footerEls = document.querySelectorAll('.footer-date');
        for (var m = 0; m < footerEls.length; m++) { footerEls[m].textContent = dateString; }
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);
    if (isLoginPage) {
        return;
    }
    var logoutLink = document.querySelector('.sidebar-link.logout');
    if (logoutLink) {
        logoutLink.addEventListener('click', function (e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                logout();
            }
        });
    }
    

    
    if (typeof enforceAccessControl === 'function') {
        if (!enforceAccessControl()) {
            return;
        }
    }


    var allSidebarLinks = document.querySelectorAll('.sidebar-link:not(.logout)');
    for (var a = 0; a < allSidebarLinks.length; a++) {
        var link = allSidebarLinks[a];
        var href = link.getAttribute('href') || '';
        var linkPage = href.split('/').pop();

        if (linkPage === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }

        link.addEventListener('click', function (e) {
            var session = getSession();
            if (!session || !isSessionValid()) {
                e.preventDefault();
                window.location.href = 'index.html';
                return;
            }

            var targetPage = this.getAttribute('href').split('/').pop();
            var userRole = session.role;

            var pageAllowed = (typeof isPageAccessible === 'function')
                ? isPageAccessible(targetPage, userRole)
                : false;

            if (!pageAllowed) {
                e.preventDefault();
                var lastPage = (typeof getLastAuthorizedPage === 'function')
                    ? getLastAuthorizedPage()
                    : null;
                var redirectPage = (lastPage && (typeof isPageAccessible === 'function')
                    ? isPageAccessible(lastPage, userRole)
                    : false)
                    ? lastPage
                    : (typeof getDefaultPage === 'function')
                        ? getDefaultPage(userRole)
                        : 'index.html';
                window.location.href = redirectPage;
                return;
            }
        });
    }



    var subSidebarLinks = document.querySelectorAll('.sub-sidebar-link');
    for (var s = 0; s < subSidebarLinks.length; s++) {
        var subLink = subSidebarLinks[s];
        var subHref = subLink.getAttribute('href') || '';
        var subPage = subHref.split('/').pop();
        subLink.classList.remove('active');
        if (subPage === currentPage) {
            subLink.classList.add('active');
        }
    }

    function hideLink(link) {
        link.style.display = 'none';
    }
    function showLink(link) {
        link.style.display = 'flex';
    }

    var userRole = session ? session.role : null;
    var allowedPages = (typeof getAllowedPages === 'function')
        ? getAllowedPages(userRole)
        : ({
            admin: ['dashboard.html', 'transaction.html', 'inventory.html', 'discount.html', 'staff_management.html'],
            it: ['account_management.html', 'system_management.html', 'inventory.html', 'discount.html', 'staff_management.html', 'dashboard.html', 'transaction.html'],
            cashier: ['pos.html']
          }[userRole] || []);

    var navLinks = document.querySelectorAll('.sidebar-nav .sidebar-link:not(.logout)');

    for (var n = 0; n < navLinks.length; n++) {
        var navLink = navLinks[n];
        var navHref = navLink.getAttribute('href') || '';
        var navPage = navHref.split('/').pop();
        if (allowedPages.indexOf(navPage) >= 0) {
            showLink(navLink);
        } else {
            hideLink(navLink);
        }
    }
    var normalizedUserRole = (typeof normalizeRole === 'function') ? normalizeRole(userRole) : userRole;
    var showTransactionSubNav = (normalizedUserRole === 'admin' || normalizedUserRole === 'super_admin');
    for (var subIndex = 0; subIndex < subSidebarLinks.length; subIndex++) {
        if (showTransactionSubNav) {
            showLink(subSidebarLinks[subIndex]);
        } else {
            hideLink(subSidebarLinks[subIndex]);
        }
    }
    var topbarAdminName = document.getElementById('topbarAdminName');
    if (topbarAdminName && session) {
        var displayName = session.accountHolderName || session.fullname || session.username;
        var storedUser = getUsers().find(function (user) {
            return user.username === session.username;
        });
        if (storedUser) {
            displayName = storedUser.accountHolderName || storedUser.fullname || displayName;
        }
        topbarAdminName.textContent = displayName;
    }
    if (typeof nbDataReady !== 'undefined') {
        try {
            await nbDataReady;
        } catch (error) {
        }
    }
    initializeProfileMenu(session);

    if (session && typeof showNotification === 'function') {
        try {
            var setupNotif = sessionStorage.getItem('nb_setup_notif');
            if (setupNotif) {
                sessionStorage.removeItem('nb_setup_notif');
                setTimeout(function () {
                    showNotification(setupNotif, 'warning');
                }, 800);
            }
        } catch (e) {}
    }
});
