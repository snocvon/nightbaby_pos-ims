(function () {
    'use strict';
    var ROLE_PERMISSIONS = {
        'super_admin': [
            'dashboard.html',
            'transaction.html',
            'inventory.html',
            'discount.html',
            'staff_management.html',
            'account_management.html',
            'system_management.html',
            'pos.html'
        ],
        'admin': [
            'dashboard.html',
            'transaction.html',
            'inventory.html',
            'discount.html',
            'staff_management.html'
        ],
        'cashier': [
            'pos.html'
        ]
    };

    var ROLE_DEFAULT_PAGES = {
        'super_admin': 'account_management.html',
        'admin': 'dashboard.html',
        'cashier': 'pos.html'
    };

    var PUBLIC_PAGES = [
        'index.html',
        'login.html',
        'system_down.html',
        'customer.html'
    ];

    var STORAGE_KEY_LAST_PAGE = 'nb_last_authorized_page';
    var STORAGE_KEY_REDIRECT_FLAG = 'nb_redirect_in_progress';

    function getCurrentPage() {
        var path = window.location.pathname;
        var page = path.substring(path.lastIndexOf('/') + 1);
        return page || 'index.html';
    }

    function setLastAuthorizedPage(page) {
        try {
            sessionStorage.setItem(STORAGE_KEY_LAST_PAGE, page);
        } catch (e) {
        }
    }

    function getLastAuthorizedPage() {
        try {
            return sessionStorage.getItem(STORAGE_KEY_LAST_PAGE) || null;
        } catch (e) {
            return null;
        }
    }

    function clearLastAuthorizedPage() {
        try {
            sessionStorage.removeItem(STORAGE_KEY_LAST_PAGE);
        } catch (e) {
        }
    }

    function setRedirectFlag(targetPage) {
        try {
            sessionStorage.setItem(STORAGE_KEY_REDIRECT_FLAG, targetPage);
        } catch (e) {
        }
    }

    function consumeRedirectFlag() {
        try {
            var target = sessionStorage.getItem(STORAGE_KEY_REDIRECT_FLAG);
            sessionStorage.removeItem(STORAGE_KEY_REDIRECT_FLAG);
            return target;
        } catch (e) {
            return null;
        }
    }

    function normalizeRole(role) {
        if (role === 'super_admin' || role === 'it' || role === 'superuser') {
            return 'super_admin';
        }
        return role || '';
    }

    function getAllowedPages(role) {
        var normalized = normalizeRole(role);
        return ROLE_PERMISSIONS[normalized] || [];
    }

    function getDefaultPage(role) {
        var normalized = normalizeRole(role);
        return ROLE_DEFAULT_PAGES[normalized] || 'index.html';
    }

    function isPageAccessible(page, role) {
        if (PUBLIC_PAGES.indexOf(page) !== -1) return true;
        var allowed = getAllowedPages(role);
        return allowed.indexOf(page) !== -1;
    }


    function enforceAccessControl() {
        var currentPage = getCurrentPage();

        if (PUBLIC_PAGES.indexOf(currentPage) !== -1) {
            return true;
        }

        var session = null;
        if (typeof getSession === 'function') {
            session = getSession();
        }
        if (!session || (typeof isSessionValid === 'function' && !isSessionValid())) {
            window.location.href = 'index.html';
            return false;
        }

        var userRole = session.role;

        if (isPageAccessible(currentPage, userRole)) {
            if (typeof getSystemSettings === 'function' &&
                getSystemSettings().systemDown &&
                (userRole === 'admin' || userRole === 'cashier') &&
                currentPage !== 'system_down.html') {
                window.location.href = 'system_down.html';
                return false;
            }
            setLastAuthorizedPage(currentPage);
            consumeRedirectFlag();
            return true;
        }

        var redirectFlag = consumeRedirectFlag();
        if (redirectFlag === currentPage) {
            setLastAuthorizedPage(currentPage);
            return true;
        }

        var lastPage = getLastAuthorizedPage();
        var destination = null;

        if (lastPage && isPageAccessible(lastPage, userRole)) {
            destination = lastPage;
        } else {
            destination = getDefaultPage(userRole);
        }

        if (destination === currentPage) {
            return false;
        }

        setRedirectFlag(destination);
        window.location.href = destination;
        return false;
    }

    function requireAuth(allowedRoles) {
        if (!enforceAccessControl()) {
            return false;
        }

        if (allowedRoles && allowedRoles.length > 0) {
            var session = null;
            if (typeof getSession === 'function') {
                session = getSession();
            }
            if (!session) {
                window.location.href = 'index.html';
                return false;
            }

            var roleAllowed = false;
            for (var i = 0; i < allowedRoles.length; i++) {
                if (allowedRoles[i] === session.role) {
                    roleAllowed = true;
                    break;
                }
            }

            if (!roleAllowed) {
                var lastPage = getLastAuthorizedPage();
                var destination = (lastPage && isPageAccessible(lastPage, session.role))
                    ? lastPage
                    : getDefaultPage(session.role);

                if (destination !== getCurrentPage()) {
                    setRedirectFlag(destination);
                    window.location.href = destination;
                }
                return false;
            }
        }

        return true;
    }

    window.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
    window.ROLE_DEFAULT_PAGES = ROLE_DEFAULT_PAGES;
    window.PUBLIC_PAGES = PUBLIC_PAGES;
    window.getCurrentPage = getCurrentPage;
    window.setLastAuthorizedPage = setLastAuthorizedPage;
    window.getLastAuthorizedPage = getLastAuthorizedPage;
    window.clearLastAuthorizedPage = clearLastAuthorizedPage;
    window.normalizeRole = normalizeRole;
    window.getAllowedPages = getAllowedPages;
    window.getDefaultPage = getDefaultPage;
    window.isPageAccessible = isPageAccessible;
    window.enforceAccessControl = enforceAccessControl;
    window.requireAuth = requireAuth;

})();
