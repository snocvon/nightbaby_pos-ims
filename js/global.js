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
function saveProducts(arr) {
    localStorage.setItem('nb_products', JSON.stringify(arr));
}
function getProductById(id) {
    var products = getProducts();
    for (var i = 0; i < products.length; i++) {
        if (products[i].id == id) {
            return products[i];
        }
    }
    return undefined;
}
function addProduct(obj) {
    var products = getProducts();
    var nextId = 1;
    for (var i = 0; i < products.length; i++) {
        if (products[i].id >= nextId) {
            nextId = products[i].id + 1;
        }
    }
    obj.id = nextId;
    products.push(obj);
    saveProducts(products);
    return obj;
}
function updateProduct(id, newFields) {
    var products = getProducts();
    for (var i = 0; i < products.length; i++) {
        if (products[i].id == id) {
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
    for (var i = 0; i < products.length; i++) {
        if (products[i].id == id) {
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
        var cartId = cartItem.id;
        var cartQty = Number(cartItem.quantity) || 0;
        for (var j = 0; j < products.length; j++) {
            if (products[j].id == cartId) {
                var newStock = Number(products[j].stock) - cartQty;
                products[j].stock = Math.max(0, newStock);
                break;
            }
        }
    }
    saveProducts(products);
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
    localStorage.setItem('nb_transactions', JSON.stringify(arr));
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
    localStorage.setItem('nb_users', JSON.stringify(arr));
}
function loadApplicationData() {
    var sources = [
        fetch('json/products.json', { cache: 'no-store' }).then(function (response) {
            if (!response.ok) throw new Error('Unable to load products');
            return response.json();
        }),
        fetch('json/revenue.json', { cache: 'no-store' }).then(function (response) {
            if (!response.ok) throw new Error('Unable to load revenue');
            return response.json();
        }),
        fetch('json/transactions.json', { cache: 'no-store' }).then(function (response) {
            if (!response.ok) throw new Error('Unable to load transactions');
            return response.json();
        }),
        fetch('json/user.json', { cache: 'no-store' }).then(function (response) {
            if (!response.ok) throw new Error('Unable to load users');
            return response.json();
        })
    ];

    return Promise.all(sources).then(function (data) {
        var products = data[0];
        var revenue = data[1];
        var transactions = data[2];
        var defaultUsers = Array.isArray(data[3].users) ? data[3].users : [];

        if (localStorage.getItem('nb_products') === null || getProducts().length === 0) {
            saveProducts(products);
        } else {
            var storedProducts = getProducts();
            var storedIds = storedProducts.map(function (product) { return String(product.id); });
            storedProducts.forEach(function (storedProduct) {
                var seedProduct = products.find(function (product) {
                    return String(product.id) === String(storedProduct.id);
                });
                if (seedProduct && seedProduct.image && storedProduct.image !== seedProduct.image) {
                    storedProduct.image = seedProduct.image;
                }
            });
            products.filter(function (product) {
                return product.category === 'services' && storedIds.indexOf(String(product.id)) === -1;
            }).forEach(function (service) {
                storedProducts.push(service);
            });
            saveProducts(storedProducts);
        }
        if (localStorage.getItem('nb_transactions') === null) {
            saveTransactions(transactions);
        }
        if (localStorage.getItem('nb_revenue') === null) {
            localStorage.setItem('nb_revenue', JSON.stringify(revenue));
        }

        var users = getUsers();
        users.forEach(function (user) {
            if (user.role === 'superuser' || user.username === 'superuser') user.role = 'it';
        });
        defaultUsers.forEach(function (defaultUser) {
            var existing = users.find(function (user) {
                return user.username === defaultUser.username;
            });
            if (!existing) users.push(defaultUser);
        });
        saveUsers(users);
    });
}

var nbDataReady = loadApplicationData();
function generateCashierId(role, users) {
    var prefix = '';
    if (role === 'cashier') prefix = 'CSH';
    else if (role === 'admin') prefix = 'ADM';
    else if (role === 'it') prefix = 'IT';
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
    for (var i = 0; i < 16; i++) {
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
function loginRequired(allowedRolesArray) {
    var session = getSession();
    if (!session) {
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
function setSession(userObj) {
    localStorage.setItem('nb_session', JSON.stringify(userObj));
}
function logout() {
    localStorage.removeItem('nb_session');
    window.location.href = 'index.html';
}
document.addEventListener('DOMContentLoaded', function () {
    var currentPage = window.location.pathname.split('/').pop() || '';
    var isLoginPage = (currentPage === 'index.html' || currentPage === 'login.html' || currentPage === '');
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
    var session = getSession();
    var userRole = session ? session.role : '';

    if (getSystemSettings().systemDown && (userRole === 'admin' || userRole === 'cashier') && currentPage !== 'system_down.html') {
        window.location.href = 'system_down.html';
        return;
    }

    var pageRoles = {
        'dashboard.html': ['admin'],
        'transaction.html': ['admin'],
        'pos.html': ['cashier'],
        'inventory.html': ['admin', 'it'],
        'discount.html': ['admin', 'it'],
        'staff_management.html': ['admin', 'it'],
        'account_management.html': ['it'],
        'system_management.html': ['it']
    };
    if (pageRoles[currentPage] && pageRoles[currentPage].indexOf(userRole) === -1) {
        window.location.href = 'index.html';
        return;
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

    var allowedPages = {
        admin: ['dashboard.html', 'transaction.html', 'inventory.html', 'discount.html', 'staff_management.html'],
        it: ['account_management.html', 'system_management.html', 'inventory.html', 'discount.html', 'staff_management.html'],
        cashier: ['pos.html']
    }[userRole] || [];
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
    var showTransactionSubNav = userRole === 'admin' || userRole === 'it';
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
    var chartBars = document.querySelectorAll('.chart-bar');
    if (chartBars.length > 0) {
        for (var cb = 0; cb < chartBars.length; cb++) {
            (function (bar, index) {
                var height = bar.style.height;
                bar.style.height = '0%';
                setTimeout(function () {
                    bar.style.height = height;
                }, 100 + (index * 80));
            })(chartBars[cb], cb);
        }
    }
});
