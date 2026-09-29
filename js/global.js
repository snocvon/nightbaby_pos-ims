/**
 * nightbaby - Global Functions
 * Shared across all pages (login, dashboard, pos, etc.)
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================
    // REAL-TIME CLOCK & DATE - GLOBAL
    // ============================================
    
    function updateDateTime() {
        const now = new Date();
        
        // Day names
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        // Get all datetime elements on the page
        const dayElements = document.querySelectorAll('.datetime-day');
        const dateElements = document.querySelectorAll('.datetime-date');
        const timeElements = document.querySelectorAll('.datetime-time');
        const footerDateElements = document.querySelectorAll('.footer-date');
        
        // Format day
        const dayName = days[now.getDay()];
        
        // Format date
        const monthName = months[now.getMonth()];
        const day = now.getDate();
        const year = now.getFullYear();
        const dateString = `${monthName} ${day}, ${year}`;
        
        // Format time (12-hour format with AM/PM)
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const timeString = `${hours}:${minutes} ${ampm}`;
        
        // Update all day elements
        dayElements.forEach(el => {
            el.textContent = dayName;
        });
        
        // Update all date elements
        dateElements.forEach(el => {
            el.textContent = dateString;
        });
        
        // Update all time elements
        timeElements.forEach(el => {
            el.textContent = timeString;
        });
        
        // Update all footer date elements
        footerDateElements.forEach(el => {
            el.textContent = dateString;
        });
    }
    
    // Update immediately
    updateDateTime();
    
    // Update every second
    setInterval(updateDateTime, 1000);
    
    // ============================================
    // SIDEBAR NAVIGATION - ACTIVE STATE
    // ============================================
    
    // Get current page filename
    const currentPage = window.location.pathname.split('/').pop() || 'home.html';
    
    // Find and highlight the active sidebar link
    const sidebarLinks = document.querySelectorAll('.sidebar-link:not(.logout)');
    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // ============================================
    // SUB-NAVIGATION - ACTIVE STATE INDICATION
    // ============================================
    
    // Highlight the correct sub-nav link
    const subSidebarLinks = document.querySelectorAll('.sub-sidebar-link');
    subSidebarLinks.forEach(link => {
        const href = link.getAttribute('href');
        // Remove active from all first
        link.classList.remove('active');
        // Add active to the matching page
        if (href === currentPage) {
            link.classList.add('active');
        }
    });
    
    // Also highlight the main Transactions link if on any sub-page
    const mainTransactionsLink = document.querySelector('.sidebar-nav-group .sidebar-link');
    if (mainTransactionsLink) {
        // Check if current page is Transactions or any sub-page
        const isTransactionsPage = currentPage === 'transactions.html';
        const isInventoryPage = currentPage === 'inventory.html';
        // Add more sub-pages here as you create them
        const isSubPage = isTransactionsPage || isInventoryPage;
        
        if (isSubPage) {
            mainTransactionsLink.classList.add('active');
        } else {
            mainTransactionsLink.classList.remove('active');
        }
    }

    // ============================================
    // USER ROLE MANAGEMENT - GLOBAL
    // ============================================
    
    const userRoleBtn = document.getElementById('userRoleBtn');
    const userRoleText = document.getElementById('userRoleText');
    const topbarAdminName = document.getElementById('topbarAdminName');
    
    if (userRoleBtn) {
        // Get user role from localStorage or set default
        let userRole = localStorage.getItem('userRole') || 'admin';
        
        function updateUserRole(role) {
            localStorage.setItem('userRole', role);
            userRole = role;
            
            const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
            if (userRoleText) userRoleText.textContent = roleDisplay;
            if (topbarAdminName) topbarAdminName.textContent = roleDisplay;
            
            // Remove existing role classes
            userRoleBtn.classList.remove('role-admin', 'role-cashier');
            
            if (role === 'admin') {
                userRoleBtn.classList.add('role-admin');
            } else if (role === 'cashier') {
                userRoleBtn.classList.add('role-cashier');
            }
            
            updateSidebarLinks(role);
        }
        
        function updateSidebarLinks(role) {
            const sidebarLinks = document.querySelectorAll('.sidebar-link:not(.logout)');
            
            if (role === 'cashier') {
                sidebarLinks.forEach((link) => {
                    const span = link.querySelector('span');
                    if (span && span.textContent === 'Transactions') {
                        link.style.display = 'none';
                    } else {
                        link.style.display = 'flex';
                    }
                });
            } else {
                sidebarLinks.forEach(link => {
                    link.style.display = 'flex';
                });
            }
        }
        
        // Toggle role on click
        userRoleBtn.addEventListener('click', function() {
            const newRole = userRole === 'admin' ? 'cashier' : 'admin';
            updateUserRole(newRole);
        });
        
        // Initialize
        updateUserRole(userRole);
    }
    
    // ============================================
    // LOGOUT - GLOBAL
    // ============================================
    
    const logoutLink = document.querySelector('.sidebar-link.logout');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('userRole');
                window.location.href = 'login.html';
            }
        });
    }
    
    // ============================================
    // CHART ANIMATION - FOR DASHBOARD
    // ============================================
    
    const chartBars = document.querySelectorAll('.chart-bar');
    if (chartBars.length > 0) {
        chartBars.forEach((bar, index) => {
            const height = bar.style.height;
            bar.style.height = '0%';
            setTimeout(() => {
                bar.style.height = height;
            }, 100 + (index * 80));
        });
    }
    
    console.log('🌙 nightbaby global scripts loaded');
    console.log('📍 Current page:', currentPage);
});