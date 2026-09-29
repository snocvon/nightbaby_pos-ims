document.addEventListener('DOMContentLoaded', function () {
    if (typeof loginRequired === 'function') {
        loginRequired(['admin', 'it']);
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
        statValues[3].textContent = 'P0.00';
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
            lowStockTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:rgba(255,255,255,0.4);padding:1rem;">No low stock items</td></tr>';
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
        perfumes.sort(function (a, b) {
            return getProductStock(a) - getProductStock(b);
        });
        var topPerf = perfumes.slice(0, 5);
        if (topPerf.length === 0) {
            expireTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.4);padding:1rem;">No perfumes listed</td></tr>';
        } else {
            for (var p = 0; p < topPerf.length; p++) {
                var pp = topPerf[p];
                var psize = pp.size || 'N/A';
                var pstk = getProductStock(pp);
                var pstatus = pstk <= 5
                    ? '<span class="status-badge status-soon">Soon</span>'
                    : '<span class="status-badge status-low">Watch</span>';
                var ptr = document.createElement('tr');
                ptr.innerHTML =
                    '<td>' + pp.name + '</td>' +
                    '<td>' + psize + '</td>' +
                    '<td>N/A</td>' +
                    '<td>' + pstk + ' left</td>' +
                    '<td>' + pstatus + '</td>';
                expireTbody.appendChild(ptr);
            }
        }
    }
    var revenueCanvas = document.getElementById('revenueChart');
    var chartFilter = document.getElementById('chartFilter');
    var revenueChart = null;

    function drawRevenueChart(revenueData, period) {
        if (!revenueCanvas || typeof Chart === 'undefined' || !revenueData[period]) return;
        var dataset = revenueData[period];
        if (revenueChart) revenueChart.destroy();
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
                    tension: 0.35,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#e63946',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: 'rgba(255,255,255,0.55)' }, grid: { display: false } },
                    y: { beginAtZero: true, ticks: { color: 'rgba(255,255,255,0.55)' }, grid: { color: 'rgba(255,255,255,0.08)' } }
                }
            }
        });
    }

    if (revenueCanvas) {
        fetch('json/revenue.json', { cache: 'no-store' })
            .then(function (response) {
                if (!response.ok) throw new Error('Unable to load revenue data');
                return response.json();
            })
            .then(function (revenueData) {
                var period = chartFilter ? chartFilter.value : '7days';
                drawRevenueChart(revenueData, period);
                var revenueValues = revenueData[period] && revenueData[period].values || [];
                var periodRevenue = revenueValues.reduce(function (sum, value) { return sum + (Number(value) || 0); }, 0);
                if (statValues.length >= 4) {
                    statValues[3].textContent = typeof formatCurrency === 'function'
                        ? formatCurrency(periodRevenue)
                        : 'P' + periodRevenue.toFixed(2);
                }
                if (chartFilter) {
                    chartFilter.addEventListener('change', function () {
                        var selectedPeriod = chartFilter.value;
                        drawRevenueChart(revenueData, selectedPeriod);
                        var selectedValues = revenueData[selectedPeriod] && revenueData[selectedPeriod].values || [];
                        var selectedRevenue = selectedValues.reduce(function (sum, value) { return sum + (Number(value) || 0); }, 0);
                        if (statValues.length >= 4) {
                            statValues[3].textContent = typeof formatCurrency === 'function'
                                ? formatCurrency(selectedRevenue)
                                : 'P' + selectedRevenue.toFixed(2);
                        }
                    });
                }
            })
            .catch(function () {
                var chartArea = revenueCanvas.parentElement;
                chartArea.innerHTML = '<p style="color:rgba(255,255,255,0.5);text-align:center;padding:4rem 1rem;">Revenue data unavailable.</p>';
            });
    }
    var activityList = document.querySelector('.activity-list');
    if (activityList) {
        activityList.innerHTML = '';
        var recentTxs = transactions.slice(0, 6);
        if (recentTxs.length === 0) {
            activityList.innerHTML = '<div style="padding:1rem;color:rgba(255,255,255,0.4);text-align:center;">No recent activity</div>';
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
    var role = session ? session.role : (localStorage.getItem('userRole') || '');
    if (role === 'it') {
        var resetContainer = document.createElement('div');
        resetContainer.className = 'dashboard-card';
        resetContainer.style.marginTop = '1.5rem';
        resetContainer.innerHTML =
            '<div class="card-header"><h3>System Reset (IT Only)</h3></div>' +
            '<div style="padding:1.5rem;display:flex;gap:1rem;flex-wrap:wrap;">' +
            '<button id="resetStockBtn" style="padding:0.75rem 1.25rem;background:#e63946;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Reset Stock (re-seed products)</button>' +
            '<button id="resetTxBtn" style="padding:0.75rem 1.25rem;background:#e63946;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Reset Transactions</button>' +
            '<button id="resetAllBtn" style="padding:0.75rem 1.25rem;background:#450a0a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Reset Everything</button>' +
            '</div>';

        var mainEl = document.querySelector('.dashboard-main');
        if (mainEl) {
            var footerEl = mainEl.querySelector('.dashboard-footer');
            if (footerEl && footerEl.parentNode) {
                footerEl.parentNode.insertBefore(resetContainer, footerEl);
            } else {
                mainEl.appendChild(resetContainer);
            }
        }

        var resetStockBtn = document.getElementById('resetStockBtn');
        var resetTxBtn = document.getElementById('resetTxBtn');
        var resetAllBtn = document.getElementById('resetAllBtn');

        if (resetStockBtn) {
            resetStockBtn.addEventListener('click', function () {
                if (!confirm('Reset product stock? This will reload products from JSON seed.')) return;
                localStorage.removeItem('nb_products');
                localStorage.removeItem('nb_seed_done');
                localStorage.removeItem('nb_stock_overrides');
                try {
                    fetch('json/products.json')
                        .then(function (res) { return res.json(); })
                        .then(function (seedArr) {
                            if (typeof saveProducts === 'function') saveProducts(seedArr);
                            if (typeof showNotification === 'function') showNotification('Products re-seeded from JSON.', 'success');
                            location.reload();
                        })
                        .catch(function () {
                            if (typeof showNotification === 'function') showNotification('Reset flags cleared. Reloading.', 'info');
                            location.reload();
                        });
                } catch (e) {
                    location.reload();
                }
            });
        }

        if (resetTxBtn) {
            resetTxBtn.addEventListener('click', function () {
                if (!confirm('Delete ALL transactions? This cannot be undone.')) return;
                localStorage.removeItem('nb_transactions');
                localStorage.removeItem('nb_stock_overrides');
                if (typeof showNotification === 'function') showNotification('Transactions cleared.', 'success');
                location.reload();
            });
        }

        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', function () {
                if (!confirm('Reset EVERYTHING? Products, transactions, and seed will be cleared.')) return;
                localStorage.removeItem('nb_products');
                localStorage.removeItem('nb_transactions');
                localStorage.removeItem('nb_seed_done');
                localStorage.removeItem('nb_stock_overrides');
                location.reload();
            });
        }
    }

});
