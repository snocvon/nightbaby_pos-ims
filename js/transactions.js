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

    async function loadFromStorage() {
        if (typeof nbDataReady !== 'undefined') {
            try {
                await nbDataReady;
            } catch (error) {
            }
        }

        var stored = getTransactions();
        if (stored.length > 0) return stored;

        try {
            var response = await fetch('json/transactions.json', { cache: 'no-store' });
            if (!response.ok) throw new Error('Unable to load transactions');
            var data = await response.json();
            var txs = Array.isArray(data) ? data : (Array.isArray(data.transactions) ? data.transactions : []);
            saveTransactions(txs);
            return txs;
        } catch (error) {
            return getTransactions();
        }
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
        switch (status && status.toLowerCase()) {
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
        return {
            id: id,
            date: displayDate,
            time: displayTime,
            timestamp: tx.timestamp || 0,
            customer: tx.customer || 'Walk-in Customer',
            type: 'Purchase',
            cashier: tx.cashierName || tx.cashier || tx.username || 'Admin',
            itemCount: tx.itemCount || (tx.items ? tx.items.length : 0),
            total: tx.total || 0,
            status: 'Completed'
        };
    }

    function renderTable(rows) {
        if (!tbody) return;

        if (rows.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding:2rem; color:rgba(255,255,255,0.4);">
                        No transactions found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = rows.map(tx => `
            <tr data-tx='${JSON.stringify(tx)}'>
                <td class="trans-id">#${tx.id}</td>
                <td>${tx.date}${tx.time ? '<br />' + tx.time : ''}</td>
                <td>${tx.customer}</td>
                <td><span class="type-badge ${getTypeBadgeClass(tx.type)}">${tx.type}</span></td>
                <td>${tx.cashier}</td>
                <td>${tx.itemCount}</td>
                <td>${formatCurrency(tx.total)}</td>
                <td><span class="status-badge ${getStatusBadgeClass(tx.status)}">${tx.status}</span></td>
                <td><button class="action-btn">•••</button></td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const row = this.closest('tr');
                try {
                    const data = JSON.parse(row.dataset.tx);
                    showNotification(
                        `Transaction ${data.id}: ${data.itemCount} items, Total ${formatCurrency(data.total)}`,
                        'info'
                    );
                } catch (err) {
                    showNotification('Transaction details coming soon!', 'info');
                }
            });
        });
    }

    function updateStats(rows) {
        var statValues = document.querySelectorAll('.trans-stat-value');
        if (statValues.length < 4) return;

        var totalSales = 0;
        var itemsSold = 0;
        var refunds = 0;
        rows.forEach(function (tx) {
            var status = String(tx.status || '').toLowerCase();
            if (status === 'refunded') {
                refunds++;
            } else {
                totalSales += Number(tx.total) || 0;
                itemsSold += Number(tx.itemCount) || 0;
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
                showNotification('Transaction details coming soon!', 'info');
            });
        });

        applyFilters();
    }

    init();
});
