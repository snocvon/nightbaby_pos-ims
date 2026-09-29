document.addEventListener('DOMContentLoaded', function () {
    if (typeof loginRequired === 'function') {
        loginRequired(['admin', 'super_admin']);
    }

    var session = null;
    if (typeof getSession === 'function') {
        session = getSession();
    }
    function getProductStock(p) {
        if (typeof getCurrentStock === 'function') {
            return getCurrentStock(p);
        }
        return Number(p.stock) || 0;
    }

    function renderDashboard() {
        var products = [];
        var transactions = [];
        if (typeof getProducts === 'function') products = getProducts();
        if (typeof getTransactions === 'function') transactions = getTransactions();

        var totalProducts = products.length;
        var availableItems = 0;
        var lowStockItems = 0;
        var lowStockThreshold = Number(getSystemSettings().lowStockThreshold) || 10;
        for (var i = 0; i < products.length; i++) {
            var productStock = getProductStock(products[i]);
            availableItems += productStock;
            if (productStock <= lowStockThreshold) lowStockItems++;
        }
        var totalSales = transactions.length;
        var totalRevenue = 0;
        for (var j = 0; j < transactions.length; j++) {
            if (String(transactions[j].status || '').toLowerCase() !== 'refunded') {
                totalRevenue += Number(transactions[j].total) || 0;
            }
        }

    var topSellingProducts = document.getElementById('topSellingProducts');
    if (topSellingProducts) {
        var salesByProduct = {};
        transactions.forEach(function (transaction) {
            var transactionStatus = String(transaction.status || 'completed').toLowerCase();
            if (transactionStatus !== 'completed') return;
            (transaction.items || []).forEach(function (item) {
                var productId = item.productId || item.id;
                var product = products.find(function (entry) {
                    return String(entry.id) === String(productId) || entry.name === item.name || entry.name === item.productName;
                });
                var name = item.name || item.productName || (product && product.name);
                if (!name) return;
                var quantity = Number(item.quantity || item.qty || 1);
                if (!isFinite(quantity) || quantity <= 0) return;
                var unitPrice = Number(item.price || (product && product.price)) || 0;
                var amount = Number(item.total || item.subtotal) || unitPrice * quantity;
                var productKey = product ? String(product.id) : String(productId || name).toLowerCase();
                if (!salesByProduct[productKey]) {
                    salesByProduct[productKey] = { name: product ? product.name : name, quantity: 0, amount: 0 };
                }
                salesByProduct[productKey].quantity += quantity;
                salesByProduct[productKey].amount += amount;
            });
        });
        var topProducts = Object.keys(salesByProduct).map(function (name) { return salesByProduct[name]; });
        topProducts.sort(function (a, b) { return b.quantity - a.quantity || b.amount - a.amount; });
        topProducts = topProducts.slice(0, 4);
        if (topProducts.length) {
            localStorage.setItem('nb_top_selling_products', JSON.stringify(topProducts));
        } else {
            localStorage.removeItem('nb_top_selling_products');
        }
        topSellingProducts.innerHTML = topProducts.length
            ? topProducts.map(function (product, index) {
                var amount = typeof formatCurrency === 'function'
                    ? formatCurrency(product.amount)
                    : 'P' + product.amount.toFixed(2);
                return '<div class="product-item">' +
                    '<span class="product-rank">' + (index + 1) + '</span>' +
                    '<span class="product-name">' + product.name + '</span>' +
                    '<span class="product-sales">' + product.quantity + ' sold · ' + amount + '</span>' +
                    '</div>';
            }).join('')
            : '<div class="product-item"><span class="product-name">No product sales data</span></div>';
    }
    var statValues = document.querySelectorAll('.dashboard-top-row .stat-card-value');
    if (statValues.length >= 4) {
        if (typeof formatCurrency === 'function') {
            statValues[0].textContent = formatCurrency(totalRevenue);
        } else {
            statValues[0].textContent = 'P' + totalRevenue.toFixed(2);
        }
        statValues[1].textContent = totalSales;
        statValues[2].textContent = lowStockItems;
        statValues[3].textContent = typeof formatCurrency === 'function'
            ? formatCurrency(totalRevenue)
            : 'P' + totalRevenue.toFixed(2);
    }
    var productsCountEl = document.getElementById('productsCount');
    if (productsCountEl) productsCountEl.textContent = totalProducts;
    var availableCountEl = document.getElementById('availableCount');
    if (availableCountEl) availableCountEl.textContent = availableItems;
    var salesCountEl = document.getElementById('salesTransactionCount');
    if (salesCountEl) salesCountEl.textContent = totalSales;
    var totalRevenueEl = document.getElementById('totalRevenue');
    if (totalRevenueEl) {
        totalRevenueEl.textContent = typeof formatCurrency === 'function'
            ? formatCurrency(totalRevenue)
            : 'P' + totalRevenue.toFixed(2);
    }
    var lowStockTbody = document.querySelector('.alert-card .alert-table tbody');
    if (lowStockTbody) {
        lowStockTbody.innerHTML = '';
        var lowStockProducts = [];
        for (var k = 0; k < products.length; k++) {
            var stk = getProductStock(products[k]);
            if (stk <= lowStockThreshold) {
                lowStockProducts.push(products[k]);
            }
        }
        if (lowStockProducts.length === 0) {
            lowStockTbody.innerHTML = '<tr><td colspan="4" class="empty-state-cell">No low stock items</td></tr>';
        } else {
            for (var m = 0; m < lowStockProducts.length; m++) {
                var lp = lowStockProducts[m];
                var lstk = getProductStock(lp);
                var sizeVal = lp.size || 'N/A';
                var statusBadge = lstk === 0
                    ? '<span class="status-badge status-out">Out</span>'
                    : '<span class="status-badge status-low">Low</span>';
                var tr = document.createElement('tr');
                tr.innerHTML =
                    '<td>' + lp.name + '</td>' +
                    '<td>' + sizeVal + '</td>' +
                    '<td>' + lstk + '</td>' +
                    '<td>' + statusBadge + '</td>';
                lowStockTbody.appendChild(tr);
            }
        }
    }
    var expireTbody = document.querySelector('.expire-card .alert-table tbody');
    if (expireTbody) {
        expireTbody.innerHTML = '';
        var perfumes = [];
        for (var n = 0; n < products.length; n++) {
            var cat = (products[n].category || '').toString().toLowerCase();
            var sub = (products[n].subcategory || '').toString().toLowerCase();
            if (cat === 'perfume' || sub.indexOf('parfum') >= 0 || sub.indexOf('toilette') >= 0 || sub.indexOf('fragrance') >= 0 || sub.indexOf('attar') >= 0) {
                perfumes.push(products[n]);
            }
        }
        var todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        var DAY_MS = 24 * 60 * 60 * 1000;
        var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        function getDaysLeft(item) {
            var exp = (item.expiration || '').toString().trim();
            if (!exp) return null;
            var expDate = new Date(exp + 'T00:00:00');
            if (isNaN(expDate.getTime())) return null;
            return Math.round((expDate.getTime() - todayStart.getTime()) / DAY_MS);
        }
        function formatExpDate(item) {
            var exp = (item.expiration || '').toString().trim();
            if (!exp) return null;
            var expDate = new Date(exp + 'T00:00:00');
            if (isNaN(expDate.getTime())) return null;
            return MONTHS[expDate.getMonth()] + ' ' + expDate.getDate() + ', ' + expDate.getFullYear();
        }
        perfumes.sort(function (a, b) {
            var da = getDaysLeft(a);
            var db = getDaysLeft(b);
            if (da === null && db === null) return 0;
            if (da === null) return 1;
            if (db === null) return -1;
            return da - db;
        });
        var topPerf = perfumes.slice(0, 5);
        if (topPerf.length === 0) {
            expireTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--color-text-tertiary);padding:1rem;">No perfumes listed</td></tr>';
        } else {
            for (var p = 0; p < topPerf.length; p++) {
                var pp = topPerf[p];
                var daysLeft = getDaysLeft(pp);
                var pdate = formatExpDate(pp) || '—';
                var pdays = daysLeft === null ? '—' : String(daysLeft);
                var pstatus;
                if (daysLeft === null) {
                    pstatus = '<span class="status-badge status-low">No Date</span>';
                } else if (daysLeft < 0) {
                    pstatus = '<span class="status-badge status-expired">Expired</span>';
                } else if (daysLeft <= 30) {
                    pstatus = '<span class="status-badge status-soon">Soon</span>';
                } else {
                    pstatus = '<span class="status-badge status-ok">OK</span>';
                }
                var ptr = document.createElement('tr');
                ptr.innerHTML =
                    '<td>' + pp.name + '</td>' +
                    '<td>' + pdate + '</td>' +
                    '<td>' + pdays + '</td>' +
                    '<td>' + pstatus + '</td>';
                expireTbody.appendChild(ptr);
            }
        }
    }
    var revenueCanvas = document.getElementById('revenueChart');
    var chartFilter = document.getElementById('chartFilter');
    var revenueChart = null;
    var loadedRevenueData = null;
    var revenueNoDataEl = document.getElementById('revenueNoData');

    function drawRevenueChart(revenueData, period) {
        if (!revenueCanvas || typeof Chart === 'undefined' || !revenueData || !revenueData[period]) return;
        var dataset = revenueData[period];
        var allZero = !dataset.values || dataset.values.every(function (v) { return Number(v) === 0; });
        var isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
        var chartTextColor = isLightTheme ? 'rgba(43, 37, 32, 0.62)' : 'rgba(255,255,255,0.55)';
        var chartGridColor = isLightTheme ? 'rgba(43, 37, 32, 0.12)' : 'rgba(255,255,255,0.08)';
        if (revenueChart) revenueChart.destroy();

        if (allZero) {
            if (revenueNoDataEl) revenueNoDataEl.style.display = 'block';
            var ctx = revenueCanvas.getContext('2d');
            ctx.clearRect(0, 0, revenueCanvas.width, revenueCanvas.height);
            revenueChart = null;
            return;
        }

        if (revenueNoDataEl) revenueNoDataEl.style.display = 'none';

        var xTicks = { color: chartTextColor, autoSkip: true, maxRotation: 0, minRotation: 0 };
        if (period === 'day') xTicks.maxTicksLimit = 8;

        revenueChart = new Chart(revenueCanvas, {
            type: 'line',
            data: {
                labels: dataset.labels,
                datasets: [{
                    label: 'Revenue',
                    data: dataset.values,
                    borderColor: '#e63946',
                    backgroundColor: 'rgba(230, 57, 70, 0.16)',
                    fill: true,
                    tension: 0,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#e63946',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                animations: { colors: false, numbers: false },
                transitions: { active: { animation: { duration: 0 } } },
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: xTicks, grid: { display: false } },
                    y: { beginAtZero: true, ticks: { color: chartTextColor }, grid: { color: chartGridColor } }
                }
            }
        });
    }

    if (revenueCanvas) {

        function parseTxDate(tx) {
            var raw = tx.date || tx.createdAt || tx.timestamp;
            if (raw === undefined || raw === null || raw === '') return null;
            if (raw instanceof Date) return new Date(raw.getTime());
            if (typeof raw === 'number' && isFinite(raw)) {
                var ms = raw < 100000000000 ? raw * 1000 : raw;
                var byNum = new Date(ms);
                return isNaN(byNum.getTime()) ? null : byNum;
            }
            if (typeof raw === 'string') {
                var s = raw.trim();
                if (!s) return null;
                var m = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(?:(\d{2,4})\s*,?\s*)?(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])$/);
                if (m) {
                    var names = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
                    var key = m[1].slice(0, 4).toLowerCase();
                    if (key === 'sept') key = 'sept';
                    else key = key.slice(0, 3);
                    var month = names[key];
                    if (month === undefined) return null;
                    var day = parseInt(m[2], 10);
                    var now = new Date();
                    var year = m[3] ? parseInt(m[3], 10) : now.getFullYear();
                    if (year < 100) year += 2000;
                    var hour = parseInt(m[4], 10);
                    var min = parseInt(m[5], 10);
                    var sec = m[6] ? parseInt(m[6], 10) : 0;
                    var mer = (m[7] || '').toUpperCase();
                    if (mer === 'PM' && hour < 12) hour += 12;
                    if (mer === 'AM' && hour === 12) hour = 0;
                    var built = new Date(year, month, day, hour, min, sec);
                    if (!m[3] && built.getTime() > now.getTime() + 86400000) built.setFullYear(year - 1);
                    return isNaN(built.getTime()) ? null : built;
                }
                var direct = new Date(s);
                if (!isNaN(direct.getTime())) return direct;
                return null;
            }
            return null;
        }

        function buildRevenueFromTransactions(txns) {
            var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            var nowRef = new Date();
            nowRef.setHours(0, 0, 0, 0);
            var weekLabels = [];
            for (var w = 6; w >= 0; w--) {
                var weekDay = new Date(nowRef.getTime());
                weekDay.setDate(weekDay.getDate() - w);
                weekLabels.push(DAY_NAMES[weekDay.getDay()]);
            }
            var hourLabels = [];
            var hourValues = [];
            for (var hh = 0; hh < 24; hh++) {
                hourLabels.push((hh < 10 ? '0' : '') + hh + ':00');
                hourValues.push(0);
            }
            var buckets = {
                'day':    { labels: hourLabels, values: hourValues },
                '7days':  { labels: weekLabels, values: [0,0,0,0,0,0,0] },
                'month':  { labels: [], values: [] },
                'year':   { labels: [], values: [] }
            };
            if (!txns || !txns.length) return buckets;

            var today = new Date();
            today.setHours(0, 0, 0, 0);

            txns.forEach(function (tx) {
                var d = parseTxDate(tx);
                if (!d || isNaN(d.getTime())) return;
                var txHour = d.getHours();
                d.setHours(0, 0, 0, 0);
                var total = Number(tx.total) || 0;
                var status = String(tx.status || 'completed').toLowerCase();
                if (status === 'refunded') return;

                var daysAgo = Math.round((today - d) / 86400000);
                if (daysAgo >= 0 && daysAgo < 7) {
                    buckets['7days'].values[6 - daysAgo] += total;
                }

                if (daysAgo === 0 && txHour >= 0 && txHour < 24) {
                    buckets['day'].values[txHour] += total;
                }

                if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()) {
                    var dayOfMonth = d.getDate() - 1;
                    while (buckets['month'].labels.length <= dayOfMonth) {
                        buckets['month'].labels.push(String(buckets['month'].labels.length + 1));
                        buckets['month'].values.push(0);
                    }
                    buckets['month'].values[dayOfMonth] += total;
                }

                if (d.getFullYear() === today.getFullYear()) {
                    var monthIndex = d.getMonth();
                    while (buckets['year'].labels.length <= monthIndex) {
                        var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                        buckets['year'].labels.push(monthNames[buckets['year'].labels.length] || '');
                        buckets['year'].values.push(0);
                    }
                    buckets['year'].values[monthIndex] += total;
                }
            });
            return buckets;
        }

        document.addEventListener('nb-theme-change', function () {
            if (loadedRevenueData) {
                drawRevenueChart(loadedRevenueData, chartFilter ? chartFilter.value : '7days');
            }
        });

        var revenueData = buildRevenueFromTransactions(transactions);
        loadedRevenueData = revenueData;
        var period = chartFilter ? chartFilter.value : '7days';
        try { drawRevenueChart(revenueData, period); } catch (err) { if (window.console) console.error('Revenue chart error:', err); }
        if (chartFilter && !chartFilter.dataset.bound) {
            chartFilter.dataset.bound = '1';
            chartFilter.addEventListener('change', function () {
                try {
                var selectedPeriod = chartFilter.value;
                var live = buildRevenueFromTransactions(typeof getTransactions === 'function' ? getTransactions() : []);
                loadedRevenueData = live;
                drawRevenueChart(live, selectedPeriod);
                } catch (err) { if (window.console) console.error('Revenue chart error:', err); }
            });
        }
    }
    var activityList = document.querySelector('.activity-list');
    if (activityList) {
        activityList.innerHTML = '';
        var recentTxs = transactions.slice(0, 6);
        if (recentTxs.length === 0) {
            activityList.innerHTML = '<div style="padding:1rem;color:var(--color-text-tertiary);text-align:center;">No recent activity</div>';
        } else {
            for (var t = 0; t < recentTxs.length; t++) {
                var tx = recentTxs[t];
                var txTotal = typeof formatCurrency === 'function'
                    ? formatCurrency(tx.total)
                    : 'P' + (Number(tx.total) || 0).toFixed(2);
                var txId = tx.id || tx.receiptId || ('TX-' + (t + 1));
                var txUser = tx.cashierName || tx.cashier || (session ? session.fullname : 'Unknown');
                var txTime = tx.date || tx.createdAt || 'recent';
                var actItem = document.createElement('div');
                actItem.className = 'activity-item';
                actItem.innerHTML =
                    '<div class="activity-left">' +
                    '<span class="activity-amount">' + txTotal + '</span>' +
                    '<span class="activity-id">— ' + txId + '</span>' +
                    '</div>' +
                    '<div class="activity-right">' +
                    '<span class="activity-user">by ' + txUser + '</span>' +
                    '<span class="activity-time">' + txTime + '</span>' +
                    '</div>';
                activityList.appendChild(actItem);
            }
        }
    }

    var liveStatDateEl = document.getElementById('liveStatDate');
    if (liveStatDateEl) {
        liveStatDateEl.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    var liveStatUpdatedEl = document.getElementById('liveStatUpdated');
    if (liveStatUpdatedEl) {
        liveStatUpdatedEl.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
    }
    }


    function safeRender() {
        try { renderDashboard(); } catch (err) { if (window.console) console.error('Dashboard render error:', err); }
    }
    if (typeof nbDataReady !== 'undefined' && nbDataReady && typeof nbDataReady.then === 'function') {
        nbDataReady.then(function () { safeRender(); });
    } else {
        safeRender();
    }

    var refreshTimer = null;
    function scheduleRefresh() {
        if (refreshTimer) return;
        refreshTimer = setTimeout(function () {
            refreshTimer = null;
            try { if (typeof renderDashboard === 'function') renderDashboard(); } catch (err) { if (window.console) console.error('Dashboard render error:', err); }
        }, 300);
    }
    window.addEventListener('storage', function (event) {
        if (!event.key || event.key === 'nb_transactions' || event.key === 'nb_products' || event.key === 'nb_stock_overrides' || event.key === 'nb_discounts') {
            scheduleRefresh();
        }
    });
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) scheduleRefresh();
    });

    var exportModal = document.getElementById('exportRangeModal');
    var exportBtn = document.getElementById('exportPdfBtn');
    var exportFrom = document.getElementById('exportDateFrom');
    var exportTo = document.getElementById('exportDateTo');
    var exportError = document.getElementById('exportRangeError');
    function openExportModal() {
        if (!exportModal) return;
        exportError.textContent = '';
        var today = new Date().toISOString().slice(0, 10);
        if (!exportFrom.value) exportFrom.value = today;
        if (!exportTo.value) exportTo.value = today;
        exportModal.hidden = false;
    }
    function closeExportModal() { if (exportModal) exportModal.hidden = true; }
    if (exportBtn) exportBtn.addEventListener('click', openExportModal);
    if (document.getElementById('exportRangeClose')) document.getElementById('exportRangeClose').addEventListener('click', closeExportModal);
    if (document.getElementById('exportRangeCancel')) document.getElementById('exportRangeCancel').addEventListener('click', closeExportModal);
    if (document.getElementById('exportRangeConfirm')) document.getElementById('exportRangeConfirm').addEventListener('click', function () {
        exportError.textContent = '';
        var fromStr = exportFrom.value;
        var toStr = exportTo.value;
        if (!fromStr || !toStr) { exportError.textContent = 'Please select both dates.'; return; }
        var from = new Date(fromStr + 'T00:00:00');
        var to = new Date(toStr + 'T23:59:59');
        if (isNaN(from.getTime()) || isNaN(to.getTime())) { exportError.textContent = 'Invalid dates.'; return; }
        if (from > to) { exportError.textContent = '"From" must be before "To".'; return; }
        try { generateRangePdf(from, to); closeExportModal(); } catch (err) {
            exportError.textContent = 'Failed to generate PDF: ' + err.message;
        }
    });

    function pdfMoney(v) { return typeof formatCurrency === 'function' ? formatCurrency(v) : 'P' + (Number(v) || 0).toFixed(2); }

    function generateRangePdf(from, to) {
        var JsPdfCtor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : null;
        if (!JsPdfCtor) throw new Error('jsPDF library not loaded.');
        var doc = new JsPdfCtor({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        var products = typeof getProducts === 'function' ? getProducts() : [];
        var allTx = typeof getTransactions === 'function' ? getTransactions() : [];
        var inRange = [];
        for (var i = 0; i < allTx.length; i++) {
            var d = new Date(allTx[i].date || allTx[i].createdAt || 0);
            if (!isNaN(d.getTime()) && d >= from && d <= to) inRange.push(allTx[i]);
        }
        var revenue = 0, orders = 0;
        for (var r = 0; r < inRange.length; r++) {
            if (String(inRange[r].status || '').toLowerCase() !== 'refunded') { revenue += Number(inRange[r].total) || 0; orders++; }
        }
        var left = 14, y = 16;
        doc.setFontSize(16);
        doc.text('nightbaby — Sales Report', 105, y, { align: 'center' }); y += 6;
        doc.setFontSize(10);
        doc.text(from.toLocaleDateString() + '  to  ' + to.toLocaleDateString(), 105, y, { align: 'center' }); y += 6;
        doc.setFontSize(8);
        doc.text('Generated: ' + new Date().toLocaleString(), 105, y, { align: 'center' }); y += 10;
        doc.setFontSize(12); doc.text('Summary', left, y); y += 6;
        doc.setFontSize(10);
        doc.text('Total Orders: ' + orders, left, y); y += 5;
        doc.text('Total Revenue: ' + pdfMoney(revenue), left, y); y += 5;
        doc.text('Total Transactions (incl. refunds): ' + inRange.length, left, y); y += 10;
        var salesByProduct = {};
        inRange.forEach(function (tx) {
            if (String(tx.status || 'completed').toLowerCase() !== 'completed') return;
            (tx.items || []).forEach(function (item) {
                var name = item.name || item.productName || 'Unknown';
                var qty = Number(item.quantity || item.qty || 1) || 0;
                var amount = Number(item.total || item.subtotal) || 0;
                if (!salesByProduct[name]) salesByProduct[name] = { quantity: 0, amount: 0 };
                salesByProduct[name].quantity += qty;
                salesByProduct[name].amount += amount;
            });
        });
        var topList = Object.keys(salesByProduct).map(function (k) { return { name: k, quantity: salesByProduct[k].quantity, amount: salesByProduct[k].amount }; });
        topList.sort(function (a, b) { return b.quantity - a.quantity || b.amount - a.amount; });
        topList = topList.slice(0, 5);
        doc.setFontSize(12); doc.text('Top Selling Products', left, y); y += 6;
        doc.setFontSize(10);
        if (!topList.length) { doc.text('No product sales in this range.', left, y); y += 8; }
        else {
            for (var t = 0; t < topList.length; t++) {
                doc.text((t + 1) + '. ' + topList[t].name + ' — ' + topList[t].quantity + ' sold — ' + pdfMoney(topList[t].amount), left, y); y += 5;
            }
            y += 4;
        }

        var dayMap = {};
        for (var c = 0; c < inRange.length; c++) {
            if (String(inRange[c].status || '').toLowerCase() === 'refunded') continue;
            var cd = new Date(inRange[c].date || inRange[c].createdAt || 0);
            if (isNaN(cd.getTime())) continue;
            var key = cd.getFullYear() + '-' + String(cd.getMonth() + 1).padStart(2, '0') + '-' + String(cd.getDate()).padStart(2, '0');
            dayMap[key] = (dayMap[key] || 0) + (Number(inRange[c].total) || 0);
        }
        var labels = [], values = [];
        var cursor = new Date(from); cursor.setHours(0, 0, 0, 0);
        var guard = 0;
        while (cursor <= to && guard < 400) {
            var key2 = cursor.getFullYear() + '-' + String(cursor.getMonth() + 1).padStart(2, '0') + '-' + String(cursor.getDate()).padStart(2, '0');
            labels.push((cursor.getMonth() + 1) + '/' + cursor.getDate());
            values.push(dayMap[key2] || 0);
            cursor.setDate(cursor.getDate() + 1);
            guard++;
        }
        if (y > 200) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.text('Revenue Chart', left, y); y += 4;
        var chartCanvas = document.createElement('canvas');
        chartCanvas.width = 700; chartCanvas.height = 320;
        var chartImg = null;
        try {
            var chart = new Chart(chartCanvas.getContext('2d'), {
                type: 'line',
                data: { labels: labels, datasets: [{ label: 'Revenue', data: values, borderColor: '#2e7d32', backgroundColor: 'rgba(46,125,50,0.15)', fill: true, tension: 0.3 }] },
                options: { animation: false, responsive: false, scales: { y: { beginAtZero: true } } }
            });
            chartImg = chartCanvas.toDataURL('image/png');
            chart.destroy();
        } catch (e) { chartImg = null; }
        if (chartImg) { doc.addImage(chartImg, 'PNG', left, y, 180, 82); y += 90; }
        else { doc.setFontSize(9); doc.text('(Chart unavailable)', left, y); y += 10; }

        if (y > 230) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.text('Low Stock Items', left, y); y += 6;
        doc.setFontSize(10);
        var lowStockThreshold = Number(getSystemSettings().lowStockThreshold) || 10;
        var lowList = [];
        for (var l = 0; l < products.length; l++) {
            var stk = typeof getCurrentStock === 'function' ? getCurrentStock(products[l]) : Number(products[l].stock) || 0;
            if (stk <= lowStockThreshold) lowList.push(products[l]);
        }
        if (!lowList.length) { doc.text('No low stock items.', left, y); y += 8; }
        else {
            for (var ls = 0; ls < lowList.length && ls < 20; ls++) {
                var stk2 = typeof getCurrentStock === 'function' ? getCurrentStock(lowList[ls]) : Number(lowList[ls].stock) || 0;
                doc.text(lowList[ls].name + ' (' + (lowList[ls].size || 'N/A') + ') — stock: ' + stk2, left, y); y += 5;
            }
            if (lowList.length > 20) { doc.text('...and ' + (lowList.length - 20) + ' more.', left, y); y += 5; }
            y += 4;
        }

        var actTx = inRange.slice().reverse();
        var usingFallback = false;
        if (!actTx.length && allTx.length) {
            var sortedAll = allTx.slice().sort(function (a, b) {
                return new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0);
            });
            actTx = [sortedAll[0]];
            usingFallback = true;
        }
        if (y > 235) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.text('Activity (Transactions in Range)' + (usingFallback ? ' — showing latest transaction' : ''), left, y); y += 6;
        doc.setFontSize(10);
        if (!actTx.length) { doc.text('No transactions in this range.', left, y); y += 8; }
        else {
            for (var a = 0; a < actTx.length && a < 18; a++) {
                var atx = actTx[a];
                doc.text((atx.id || atx.receiptId || 'TX') + ' — ' + pdfMoney(atx.total) + ' — ' + (atx.cashierName || atx.cashier || 'Unknown') + ' — ' + (atx.date || ''), left, y); y += 5;
            }
            if (actTx.length > 18) { doc.text('...and ' + (actTx.length - 18) + ' more.', left, y); y += 5; }
        }
        doc.save('nightbaby-report-' + from.toISOString().slice(0, 10) + '_to_' + to.toISOString().slice(0, 10) + '.pdf');
    }

});
