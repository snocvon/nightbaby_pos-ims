document.addEventListener('DOMContentLoaded', function() {
    if (typeof loginRequired === 'function') {
        loginRequired(['admin', 'it']);
    }

    const tbody = document.querySelector('.transactions-table tbody');
    const paginationInfo = document.querySelector('.transactions-pagination .pagination-info');
    const searchInput = document.querySelector('.search-group .search-input');
    const filterSelects = document.querySelectorAll('.filter-select');
    const refreshBtn = document.querySelector('.refresh-btn');
    const exportBtn = document.querySelector('.export-btn');
    const actionBtns = document.querySelectorAll('.action-btn');

    var txDetailOverlay = document.getElementById('txDetailOverlay');
    var txDetailId = document.getElementById('txDetailId');
    var txDetailCashier = document.getElementById('txDetailCashier');
    var txDetailItemsBody = document.getElementById('txDetailItemsBody');
    var txDetailGrandTotal = document.getElementById('txDetailGrandTotal');
    var currentTxList = [];

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    async function loadFromStorage() {
        if (typeof nbDataReady !== 'undefined') {
            try {
                await nbDataReady;
            } catch (error) {
            }
        }

        return getTransactions();
    }

    function getTypeBadgeClass(type) {
        switch (type && type.toLowerCase()) {
            case 'purchase': return 'purchase';
            case 'bespoke': return 'bespoke';
            case 'repair': return 'repair';
            case 'consultation': return 'consultation';
            default: return 'purchase';
        }
    }

    function getStatusBadgeClass(status) {
        var s = (status || '').toLowerCase();
        if (s.indexOf('partial') !== -1) return 'partial';
        switch (s) {
            case 'completed': return 'completed';
            case 'in production': return 'in-production';
            case 'ready for pickup': return 'ready';
            case 'refunded': return 'refunded';
            default: return 'completed';
        }
    }

    function normalizeTx(tx) {
        const rawId = String(tx.id || '');
        const id = rawId.replace(/^#/, '').replace(/^TRX-/, 'POS-');
        const dateValue = tx.date || 'N/A';
        let displayDate = dateValue;
        let displayTime = tx.time || '';
        if (!displayTime) {
            const dateMatch = dateValue.match(/^(.*),\s*(\d{1,2}:\d{2}\s*[AP]M)$/i);
            if (dateMatch) {
                displayDate = dateMatch[1];
                displayTime = dateMatch[2];
            }
        }
        var rawStatus = String(tx.status || 'Completed');
        var rsLow = rawStatus.toLowerCase();
        if (rsLow.indexOf('partial') !== -1) rawStatus = 'Partially Refunded';
        else if (rsLow.indexOf('refund') !== -1) rawStatus = 'Refunded';
        else rawStatus = 'Completed';
        return {
            id: id,
            date: displayDate,
            time: displayTime,
            timestamp: tx.timestamp || 0,
            customer: tx.customer || 'Walk-in Customer',
            type: tx.type || 'Purchase',
            cashier: tx.cashierName || tx.cashier || tx.username || 'Admin',
            itemCount: tx.itemCount || (tx.items ? tx.items.length : 0),
            total: tx.total || 0,
            status: rawStatus,
            refundedAmount: tx.refundedAmount || 0,
            items: tx.items || []
        };
    }

    function renderTable(rows) {
        if (!tbody) return;

        if (rows.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:2rem; color:rgba(255,255,255,0.4);">
                        No transactions found
                    </td>
                </tr>
            `;
            return;
        }

        currentTxList = rows;
        tbody.innerHTML = rows.map(tx => `
            <tr data-tx-id="${tx.id}">
                <td class="trans-id">#${tx.id}</td>
                <td>${tx.date}${tx.time ? '<br />' + tx.time : ''}</td>
                <td><span class="type-badge ${getTypeBadgeClass(tx.type)}">${tx.type}</span></td>
                <td>${tx.cashier}</td>
                <td>${tx.itemCount}</td>
                <td>${formatCurrency(tx.total)}</td>
                <td><span class="status-badge ${getStatusBadgeClass(tx.status)}">${tx.status}</span></td>
                <td><button type="button" class="action-btn" title="View details">•••</button></td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                openTxDetailByRow(this.closest('tr'));
            });
        });

        tbody.querySelectorAll('tr[data-tx-id]').forEach(row => {
            row.style.cursor = 'pointer';
            row.addEventListener('click', function() {
                openTxDetailByRow(this);
            });
        });
    }

    function openTxDetailByRow(row) {
        if (!row) return;
        var id = row.getAttribute('data-tx-id');
        var tx = currentTxList.find(function (t) { return String(t.id) === String(id); });
        if (!tx) {
            showNotification('Transaction details coming soon!', 'info');
            return;
        }
        openTxDetail(tx);
    }

    function openTxDetail(tx) {
        if (!txDetailOverlay) return;
        txDetailOverlay.removeAttribute('hidden');
        if (txDetailId) txDetailId.textContent = tx.id || '--';
        if (txDetailCashier) txDetailCashier.textContent = tx.cashier || '--';
        if (txDetailGrandTotal) txDetailGrandTotal.textContent = formatCurrency(tx.total || 0);

        var items = tx.items || [];
        if (txDetailItemsBody) {
            if (items.length === 0) {
                txDetailItemsBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--color-text-soft);padding:1rem;">No items recorded</td></tr>';
            } else {
                txDetailItemsBody.innerHTML = items.map(function (item) {
                    var qty = Number(item.quantity) || 1;
                    var lineTotal = (Number(item.price) || 0) * qty;
                    var isRefunded = !!(item.refunded);
                    var strike = isRefunded ? 'text-decoration: line-through; text-decoration-color: rgba(230,57,70,0.7); color: var(--color-text-tertiary); opacity: 0.65;' : '';
                    var reasonHtml = isRefunded && item.refundReason
                        ? '<br><span style="display:block;font-size:0.7rem;color:#e57373;font-style:italic;margin-top:2px;">Refunded. Reason: ' + escapeHtml(item.refundReason) + '</span>'
                        : '';
                    var name = '<strong style="' + strike + '">' + escapeHtml(item.name || 'Item') + '</strong>';
                    if (item.size) {
                        name += '<br><span style="display:block;font-size:0.72rem;color:var(--color-text-tertiary);opacity:0.8;">Size: ' + escapeHtml(item.size) + '</span>';
                    }
                    name += reasonHtml;
                    return '<tr>' +
                        '<td>' + name + '</td>' +
                        '<td style="' + strike + '">' + qty + '</td>' +
                        '<td class="tx-price" style="' + strike + '">' + formatCurrency(item.price || 0) + '</td>' +
                        '<td class="tx-price">' + (isRefunded ? '<span class="tx-refunded-label">Refunded</span>' : formatCurrency(lineTotal)) + '</td>' +
                        '</tr>';
                }).join('');
            }
        }
    }

    function closeTxDetail() {
        if (txDetailOverlay) txDetailOverlay.setAttribute('hidden', '');
    }

    function updateStats(rows) {
        var statValues = document.querySelectorAll('.trans-stat-value');
        if (statValues.length < 4) return;

        var totalSales = 0;
        var itemsSold = 0;
        var refunds = 0;
        rows.forEach(function (tx) {
            var status = String(tx.status || '').toLowerCase();
            var items = tx.items || [];
            var nonRefundedItems = 0;
            for (var ii = 0; ii < items.length; ii++) {
                if (!items[ii].refunded) nonRefundedItems += Number(items[ii].quantity) || 0;
            }
            if (status.indexOf('refunded') !== -1) {
                if (status === 'refunded') refunds++;
                totalSales += Number(tx.total) || 0;
                itemsSold += nonRefundedItems;
            } else {
                totalSales += Number(tx.total) || 0;
                itemsSold += Number(tx.itemCount) || nonRefundedItems || 0;
            }
        });

        statValues[0].textContent = rows.length;
        statValues[1].textContent = formatCurrency(totalSales);
        statValues[2].textContent = itemsSold;
        statValues[3].textContent = refunds;
    }

    function getActiveFilters() {
        const filters = {};
        if (filterSelects && filterSelects.length >= 3) {
            filters.type = filterSelects[0] && filterSelects[0].value;
            filters.status = filterSelects[1] && filterSelects[1].value;
        }
        return filters;
    }

    async function applyFilters() {
        const all = (await loadFromStorage()).map(normalizeTx);
        const filters = getActiveFilters();
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

        let filtered = all.filter(tx => {
            if (filters.type && filters.type !== 'All Types' && tx.type !== filters.type) return false;
            if (filters.status && filters.status !== 'All Status' && tx.status !== filters.status) return false;
            if (query) {
                const haystack = [
                    tx.id, tx.date, tx.time, tx.customer, tx.type,
                    tx.cashier, String(tx.itemCount), String(tx.total), tx.status
                ].join(' ').toLowerCase();
                if (!haystack.includes(query)) return false;
            }
            return true;
        });

        renderTable(filtered);
        updateStats(all);

        if (paginationInfo) {
            paginationInfo.textContent = `Showing 1–${filtered.length} of ${all.length} transactions`;
        }
    }

    function init() {
        const subSidebarLinks = document.querySelectorAll('.sub-sidebar-link');
        const currentPage = window.location.pathname.split('/').pop() || 'transactions.html';
        subSidebarLinks.forEach(link => {
            const href = link.getAttribute('href');
            link.classList.remove('active');
            if (href === currentPage) link.classList.add('active');
            if (href === '#') {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    subSidebarLinks.forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                    const subpage = this.dataset.subpage || '';
                    if (subpage) showNotification(`Navigated to ${subpage.charAt(0).toUpperCase() + subpage.slice(1)}`, 'info');
                });
            }
        });

        const paginationBtns = document.querySelectorAll('.transactions-pagination .pagination-btn:not(.prev-btn):not(.next-btn)');
        paginationBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                paginationBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        });

        const prevBtn = document.querySelector('.transactions-pagination .prev-btn');
        const nextBtn = document.querySelector('.transactions-pagination .next-btn');
        let currentPageNum = 1;
        const totalPages = 5;

        function updatePagination() {
            paginationBtns.forEach((btn, idx) => {
                btn.classList.toggle('active', idx + 1 === currentPageNum);
            });
        }

        if (prevBtn) prevBtn.addEventListener('click', () => {
            if (currentPageNum > 1) { currentPageNum--; updatePagination(); }
        });
        if (nextBtn) nextBtn.addEventListener('click', () => {
            if (currentPageNum < totalPages) { currentPageNum++; updatePagination(); }
        });

        if (searchInput) searchInput.addEventListener('input', applyFilters);
        if (filterSelects) filterSelects.forEach(sel => sel.addEventListener('change', applyFilters));

        if (refreshBtn) refreshBtn.addEventListener('click', () => {
            applyFilters();
            showNotification('Transactions refreshed!', 'info');
        });

        if (exportBtn) exportBtn.addEventListener('click', () => {
            showNotification('Exporting to PDF...', 'info');
        });

        actionBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var row = this.closest('tr');
                if (row) {
                    var id = row.getAttribute('data-tx-id');
                    var tx = currentTxList.find(function(t) { return String(t.id) === String(id); });
                    if (tx) openTxDetail(tx);
                } else {
                    showNotification('Transaction details coming soon!', 'info');
                }
            });
        });

        var closeTxDetailBtn = document.getElementById('closeTxDetail');
        if (closeTxDetailBtn) closeTxDetailBtn.addEventListener('click', closeTxDetail);
        var txDetailCloseFooter = document.getElementById('txDetailCloseBtn');
        if (txDetailCloseFooter) txDetailCloseFooter.addEventListener('click', closeTxDetail);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && txDetailOverlay && !txDetailOverlay.hasAttribute('hidden')) {
                closeTxDetail();
            }
        });

        applyFilters();
    }

    init();
});
