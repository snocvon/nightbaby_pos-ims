/**
 * nightbaby - Transactions JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Transactions Page Loaded');

    // ============================================
    // SUB-SIDEBAR NAVIGATION
    // ============================================
    
    const subSidebarLinks = document.querySelectorAll('.sub-sidebar-link');
    
    subSidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Don't prevent default for actual links (like inventory.html)
            const href = this.getAttribute('href');
            if (href === '#') {
                e.preventDefault();
                // Remove active from all sub-links
                subSidebarLinks.forEach(l => l.classList.remove('active'));
                // Add active to clicked link
                this.classList.add('active');
                // Get the subpage
                const subpage = this.dataset.subpage;
                console.log('📍 Navigated to:', subpage);
                showNotification(`Navigated to ${subpage.charAt(0).toUpperCase() + subpage.slice(1)}`, 'info');
            }
            // If href is not '#', the link will navigate normally
        });
    });

    // ============================================
    // ACTIVE STATE FOR SUB-NAV ON PAGE LOAD
    // ============================================
    
    // Highlight the active sub-nav based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'transactions.html';
    const subLinks = document.querySelectorAll('.sub-sidebar-link');
    subLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        }
    });

    // ============================================
    // PAGINATION
    // ============================================
    
    const paginationBtns = document.querySelectorAll('.pagination-btn:not(.prev-btn):not(.next-btn)');
    paginationBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            paginationBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Previous / Next buttons
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    let currentPage = 1;
    const totalPages = 5;

    function updatePagination() {
        paginationBtns.forEach((btn, index) => {
            btn.classList.toggle('active', index + 1 === currentPage);
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                updatePagination();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (currentPage < totalPages) {
                currentPage++;
                updatePagination();
            }
        });
    }

    // ============================================
    // FILTERS
    // ============================================
    
    const filterSelects = document.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            console.log('Filter changed:', this.value);
        });
    });

    // ============================================
    // SEARCH
    // ============================================
    
    const searchInput = document.querySelector('.search-group .search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            const rows = document.querySelectorAll('.transactions-table tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }

    // ============================================
    // ACTION BUTTONS (View/Edit/Delete)
    // ============================================
    
    const actionBtns = document.querySelectorAll('.action-btn');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            showNotification('Transaction details view coming soon!', 'info');
        });
    });

    // ============================================
    // EXPORT BUTTON
    // ============================================
    
    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            showNotification('Exporting to PDF...', 'info');
        });
    }

    // ============================================
    // REFRESH BUTTON
    // ============================================
    
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            showNotification('Refreshing data...', 'info');
        });
    }

    // ============================================
    // NOTIFICATIONS
    // ============================================
    
    function showNotification(message, type = 'info') {
        const existing = document.querySelector('.pos-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `pos-notification pos-notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
});