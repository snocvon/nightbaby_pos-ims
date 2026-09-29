(function () {
    'use strict';

    var users = [];
    var tableBody = document.getElementById('usersTableBody');
    var modal = document.getElementById('userModal');
    var form = document.getElementById('userForm');
    var modalTitle = document.getElementById('userModalTitle');
    var usernameInput = document.getElementById('userUsername');
    var accountHolderNameInput = document.getElementById('accountHolderName');
    var roleInput = document.getElementById('userRole');
    var passwordInput = document.getElementById('userPassword');
    var securityQuestionInput = document.getElementById('userSecurityQuestion');
    var securityAnswerInput = document.getElementById('userSecurityAnswer');
    var editingUsername = document.getElementById('editingUsername');
    var formError = document.getElementById('userFormError');
    
    var isStaffManagement = window.location.pathname.indexOf('staff_management.html') !== -1;

    function displayRole(role) {
        if (typeof normalizeRoleLabel === 'function') return normalizeRoleLabel(role);
        return role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Cashier';
    }

    function normalizeUser(user) {
        user.role = user.role || (user.username === 'admin' ? 'admin' : 'cashier');
        if (user.role === 'superuser' || user.role === 'super_admin') user.role = 'super_admin';
        if (user.username === 'superuser') user.username = 'superadmin';
        if (user.username === 'superadmin') {
            if (!user.role || user.role === 'super_admin' || user.role === 'it') user.role = 'super_admin';
        }
        if (user.enabled === undefined) user.enabled = true;
        user.accountHolderName = user.accountHolderName || user.fullname || '';
        return user;
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, function (character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
        });
    }

    function isSuperUser() {
        var session = typeof getSession === 'function' ? getSession() : null;
        return session && (session.role === 'super_admin' || session.role === 'it');
    }

    function isAdmin() {
        var session = typeof getSession === 'function' ? getSession() : null;
        return session && session.role === 'admin';
    }

    function isCashier() {
        var session = typeof getSession === 'function' ? getSession() : null;
        return session && session.role === 'cashier';
    }

    function formatLockTime(seconds) {
        var total = Math.max(0, Math.floor(Number(seconds) || 0));
        if (total <= 0) return '';
        return ' (' + Math.floor(total / 60) + 'm ' + (total % 60) + 's)';
    }

    function renderUsers() {
        var session = typeof getSession === 'function' ? getSession() : null;
        var visibleUsers = users.filter(function (user) {
            if (isStaffManagement) {
                return user.role === 'admin' || user.role === 'cashier';
            }
            if (isSuperUser()) return true;
            if (isAdmin()) return user.role !== 'super_admin';
            return false;
        });
        
        if (!visibleUsers.length) {
            tableBody.innerHTML = '<tr><td colspan="4">No users found.</td></tr>';
            return;
        }

        tableBody.innerHTML = visibleUsers.map(function (user) {
            var username = escapeHtml(user.username);
            var accountHolderName = escapeHtml(user.accountHolderName || user.username);
            var initial = escapeHtml(user.username.charAt(0).toUpperCase());
            var enabled = user.enabled !== false;
            var isCurrentUser = session && session.username === user.username;
            var locked = (typeof isAccountLocked === 'function') ? isAccountLocked(user.username) : false;
            var failCount = (typeof getFailedLoginCount === 'function') ? getFailedLoginCount(user.username) : 0;
            
            var canEdit = true;
            var canToggle = !isCurrentUser;
            var canRemove = true;
            var canEditRole = true;
            

            if (isAdmin()) {
                if (user.role === 'super_admin') {
                    canEdit = false;
                    canToggle = false;
                    canRemove = false;
                    canEditRole = false;
                }
                if (isCurrentUser) {
                    canEdit = false;
                    canToggle = false;
                    canRemove = false;
                    canEditRole = false;
                }

                if (isStaffManagement && user.role === 'admin' && !isCurrentUser) {
                    canRemove = false;
                }
            }
            
            if (isSuperUser()) {
                if (isCurrentUser) {
                    canEdit = false;
                    canToggle = false;
                    canRemove = false;
                }
            }
            
            if (isCashier()) {
                canEdit = false;
                canToggle = false;
                canRemove = false;
                canEditRole = false;
            }
            
            var isProtected = user.role === 'super_admin' || isCurrentUser;
            var toggleLabel = enabled ? 'Disable' : 'Enable';
            var statusHtml = '';
            if (locked) {
                var remaining = (typeof getRemainingLockoutTime === 'function') ? getRemainingLockoutTime(user.username) : 0;
                statusHtml = '<span class="status-badge locked" title="Locked after ' + failCount + ' failed attempts">Locked<span class="lock-countdown" data-user="' + username + '">' + formatLockTime(remaining) + '</span></span>';
            } else {
                statusHtml = '<span class="status-badge ' + (enabled ? 'enabled' : 'disabled') + '">' + (enabled ? 'Enabled' : 'Disabled') + '</span>';
                if (failCount > 0) {
                    statusHtml += ' <span class="status-badge attempts" title="' + failCount + ' failed login attempt(s)">' + failCount + ' failed</span>';
                }
            }
            var unlockBtn = '';
            if (locked) {
                unlockBtn = '<button type="button" class="icon-btn unlock-btn" data-action="unlock" data-username="' + username + '" aria-label="Unlock ' + username + '" title="Unlock account"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/></svg></button>';
            }
            
            return '<tr>' +
                '<td><div class="user-cell"><span class="user-avatar-mini">' + initial + '</span><span><strong>' + accountHolderName + '</strong><small class="user-username">' + username + '</small></span></div></td>' +
                '<td><span class="role-badge">' + displayRole(user.role) + '</span></td>' +
                '<td>' + statusHtml + '</td>' +
                '<td class="table-actions"><div class="action-group">' + unlockBtn +
                '<button type="button" class="icon-btn" data-action="edit" data-username="' + username + '" ' + (canEdit ? '' : 'disabled') + ' aria-label="Edit ' + username + '" title="Edit">&#9998;</button>' +
                '<button type="button" class="icon-btn" data-action="toggle" data-username="' + username + '" ' + (canToggle ? '' : 'disabled') + ' aria-label="' + toggleLabel + ' ' + username + '" title="' + (isCurrentUser ? 'Your account cannot be disabled' : toggleLabel) + '">' + (enabled ? '&#8856;' : '&#9654;') + '</button>' +
                '<button type="button" class="icon-btn danger" data-action="remove" data-username="' + username + '" ' + (canRemove ? '' : 'disabled') + ' aria-label="Remove ' + username + '" title="' + (isCurrentUser ? 'Your logged-in account cannot be removed' : (user.role === 'super_admin' || user.role === 'it') ? 'Super Admin accounts cannot be deleted' : 'Remove') + '">&minus;</button>' +
                '</div></td></tr>';
        }).join('');
    }

    async function loadUsers() {
        if (typeof nbDataReady !== 'undefined') {
            try {
                await nbDataReady;
            } catch (error) {
            }
        }

        users = getUsers().map(normalizeUser);
        renderUsers();
    }

    function openModal(user) {
        form.reset();
        formError.textContent = '';
        var session = typeof getSession === 'function' ? getSession() : null;
        
        var superUserOption = roleInput.querySelector('option[value="super_admin"]');
        var adminOption = roleInput.querySelector('option[value="admin"]');
        var cashierOption = roleInput.querySelector('option[value="cashier"]');
        
        if (superUserOption) superUserOption.hidden = !isSuperUser();
        
        if (isAdmin()) {
            if (adminOption) adminOption.hidden = true;
            if (superUserOption) superUserOption.hidden = true;
            if (cashierOption) cashierOption.selected = true;
        }
        
        if (isStaffManagement && isAdmin()) {
            if (adminOption) adminOption.hidden = true;
            if (superUserOption) superUserOption.hidden = true;
            if (cashierOption) cashierOption.selected = true;
        }
        
        if (user) {
            var isCurrentUser = session && session.username === user.username;
            if (isCurrentUser && isAdmin()) {
                roleInput.disabled = true;
            } else if (user.role === 'super_admin' && isAdmin()) {
                roleInput.disabled = true;
            } else if (isStaffManagement && isAdmin() && user.role === 'admin' && !isCurrentUser) {
                roleInput.disabled = true;
            }
        } else {
            roleInput.disabled = false;
        }
        
        editingUsername.value = user ? user.username : '';
        modalTitle.textContent = user ? 'Edit User' : 'Add User';
        usernameInput.value = user ? user.username : '';
        usernameInput.readOnly = Boolean(user);
        accountHolderNameInput.value = user ? (user.accountHolderName || '') : '';
        roleInput.value = user ? (user.role || 'cashier') : 'cashier';
        passwordInput.required = !user;
        passwordInput.placeholder = user ? 'Leave blank to keep current password' : '';
        
        var securityQuestionGroup = document.getElementById('securityQuestionGroup');
        var securityAnswerGroup = document.getElementById('securityAnswerGroup');
        
        if (isStaffManagement || !isSuperUser()) {
            if (securityQuestionGroup) securityQuestionGroup.style.display = 'none';
            if (securityAnswerGroup) securityAnswerGroup.style.display = 'none';
        } else {

            if (securityQuestionGroup) {
                securityQuestionGroup.style.display = '';
                if (securityQuestionInput) securityQuestionInput.value = user ? (user.securityQuestion || '') : '';
            }
            if (securityAnswerGroup) {
                securityAnswerGroup.style.display = '';
                if (securityAnswerInput) securityAnswerInput.value = user ? (user.securityAnswer || '') : '';
            }
        }
        
        modal.hidden = false;
        modal.classList.add('active');
        usernameInput.focus();
    }

    function closeModal() {
        modal.classList.remove('active');
        modal.hidden = true;
    }

    async function saveUser(event) {
        event.preventDefault();
        formError.textContent = '';
        var username = usernameInput.value.trim().toLowerCase();
        var accountHolderName = accountHolderNameInput.value.trim();
        var role = roleInput.value;
        var password = passwordInput.value;
        var oldUsername = editingUsername.value;
        var existing = users.find(function (user) { return user.username === username; });
        var session = typeof getSession === 'function' ? getSession() : null;

        if (role === 'super_admin' && !isSuperUser()) {
            formError.textContent = 'Only a Super Admin can assign the Super Admin role.';
            return;
        }

        if (session && session.role === 'admin' && (role === 'super_admin' || role === 'it')) {
            formError.textContent = 'Admin cannot create Super Admin accounts.';
            return;
        }

        if (session && session.role === 'admin' && oldUsername && oldUsername !== session.username) {
            var targetUser = users.find(function (item) { return item.username === oldUsername; });
            if (targetUser && (targetUser.role === 'super_admin' || targetUser.role === 'it')) {
                formError.textContent = 'Admin cannot modify Super Admin accounts.';
                return;
            }
        }

        if (session && session.role === 'admin' && oldUsername === session.username && role !== 'admin') {
            formError.textContent = 'You cannot change your own role.';
            return;
        }

        if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
            formError.textContent = 'Use 3-30 letters, numbers, dots, hyphens, or underscores.';
            return;
        }
        if (!accountHolderName) {
            formError.textContent = 'Account holder name is required.';
            accountHolderNameInput.focus();
            return;
        }
        if (!oldUsername && existing) {
            formError.textContent = 'That username already exists.';
            return;
        }
        if (!oldUsername && !password) {
            formError.textContent = 'Password is required for a new account.';
            return;
        }

        if (password && !isStaffManagement) {
            var passwordValidation = validatePasswordStrength(password);
            if (!passwordValidation.valid) {
                formError.textContent = passwordValidation.message;
                return;
            }
        }

        var user = oldUsername ? users.find(function (item) { return item.username === oldUsername; }) : null;
        if (!user) {
            user = { username: username, accountHolderName: accountHolderName, role: role, cashierId: generateCashierId(role, users) };
            users.push(user);
        } else {
            var previousRole = user.role;
            user.accountHolderName = accountHolderName;
            user.role = role;
            if (!user.cashierId || previousRole !== role) user.cashierId = generateCashierId(role, users);
        }

        if (password) {
            user.salt = generateSalt();
            user.passwordHash = await hashPassword(password, user.salt);
            delete user.hash;
        }
        
        var securityQuestion = securityQuestionInput ? securityQuestionInput.value : '';
        var securityAnswer = securityAnswerInput ? securityAnswerInput.value.trim() : '';
        if (securityQuestion && securityAnswer && securityQuestionInput.parentElement.style.display !== 'none') {
            user.securityQuestion = securityQuestion;
            user.securityAnswer = securityAnswer;
        }
        
        saveUsers(users);
        renderUsers();
        closeModal();
    }

    tableBody.addEventListener('click', function (event) {
        var button = event.target.closest('button[data-action]');
        if (!button) return;
        var username = button.getAttribute('data-username');
        var user = users.find(function (item) { return item.username === username; });
        if (!user) return;
        if (button.dataset.action === 'edit') openModal(user);
        if (button.dataset.action === 'toggle') {
            if (typeof getSession === 'function' && getSession() && getSession().username === user.username) return;
            user.enabled = user.enabled === false;
            saveUsers(users);
            renderUsers();
        }
        if (button.dataset.action === 'remove' && ((user.role === 'super_admin' || user.role === 'it') || (getSession() && getSession().username === user.username))) return;
        if (button.dataset.action === 'unlock') {
            if (typeof clearFailedLoginAttempts === 'function') {
                if (confirm('Unlock account "' + username + '"?')) {
                    clearFailedLoginAttempts(username);
                    if (typeof showNotification === 'function') showNotification('Account "' + username + '" unlocked.', 'success');
                    renderUsers();
                }
            }
            return;
        }
        if (button.dataset.action === 'remove' && confirm('Remove user "' + username + '"?')) {
            users = users.filter(function (item) { return item.username !== username; });
            saveUsers(users);
            renderUsers();
        }
    });

    document.getElementById('addUserButton').addEventListener('click', function () { openModal(null); });
    document.getElementById('closeUserModal').addEventListener('click', closeModal);
    document.getElementById('cancelUserModal').addEventListener('click', closeModal);
    form.addEventListener('submit', saveUser);
    loadUsers();

    var lockTicker = null;

    function refreshLockCountdown() {
        var nodes = tableBody ? tableBody.querySelectorAll('.lock-countdown') : [];
        if (!nodes.length) return;
        var expired = false;
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var account = node.getAttribute('data-user');
            var remaining = (typeof getRemainingLockoutTime === 'function') ? getRemainingLockoutTime(account) : 0;
            if (remaining > 0) {
                node.textContent = formatLockTime(remaining);
            } else {
                expired = true;
            }
        }
        if (expired) renderUsers();
    }

    if (!lockTicker) lockTicker = setInterval(refreshLockCountdown, 1000);

    window.addEventListener('storage', function (event) {
        if (!event.key) return;
        if (event.key === 'nb_login_attempts') renderUsers();
        if (event.key === 'nb_users') loadUsers();
    });
}());

(function () {
    var tbody = document.getElementById('remitStatusTbody');
    if (!tbody) return;
    var recordModal = document.getElementById('remitRecordModal');
    var recordBody = document.getElementById('remitRecordBody');
    var recordTitle = document.getElementById('remitRecordTitle');
    var money = function (v) { return typeof formatCurrency === 'function' ? formatCurrency(Number(v) || 0) : 'P' + (Number(v) || 0).toFixed(2); };

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

    function statusBadge(status) {
        if (status === 'short') return '<span class="status-badge status-out">Short</span>';
        if (status === 'over') return '<span class="status-badge status-low">Over</span>';
        if (status === 'exact') return '<span class="status-badge remitted-badge">Remitted</span>';
        return '<span class="status-badge">No remittance yet</span>';
    }

    function render() {
        var users = typeof getUsers === 'function' ? getUsers() : [];
        var remittances = typeof getRemittances === 'function' ? getRemittances() : [];
        var cashiers = users.filter(function (u) { return String(u.role || '') === 'cashier'; });
        var rows = '';
        for (var i = 0; i < cashiers.length; i++) {
            var cashier = cashiers[i];
            var name = cashier.fullname || cashier.username || 'Cashier';
            var records = remittances.filter(function (r) {
                return String(r.cashier || '').toLowerCase() === String(name).toLowerCase();
            }).sort(function (a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });
            var latest = records[0] || null;
            var expected = latest ? Number(latest.expected) || 0 : 0;
            var remitted = latest ? Number(latest.remitted) || 0 : 0;
            var diff = latest ? Number(latest.difference) || 0 : 0;
            rows += '<tr class="remit-status-row" data-cashier="' + esc(name) + '" style="cursor:pointer;">' +
                '<td>' + esc(name) + '</td>' +
                '<td>' + statusBadge(latest ? latest.status : 'none') + '</td>' +
                '<td>' + (latest ? money(expected) : '—') + '</td>' +
                '<td>' + (latest ? money(remitted) : '—') + '</td>' +
                '<td>' + (latest ? (diff === 0 ? 'Exact' : (diff > 0 ? 'Over ' + money(diff) : 'Short ' + money(-diff))) : '—') + '</td>' +
                '</tr>';
        }
        tbody.innerHTML = rows || '<tr><td colspan="5" class="empty-state-cell">No cashiers found</td></tr>';
    }

    function openRecord(cashierName) {
        var remittances = typeof getRemittances === 'function' ? getRemittances() : [];
        var cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 14);
        cutoff.setHours(0, 0, 0, 0);
        var records = remittances.filter(function (r) {
            if (String(r.cashier || '').toLowerCase() !== String(cashierName).toLowerCase()) return false;
            var d = new Date(r.date || 0);
            return !isNaN(d.getTime()) && d >= cutoff;
        }).sort(function (a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });
        if (recordTitle) recordTitle.textContent = 'Remittance Record — ' + cashierName + ' (past 2 weeks)';
        var html = '<div class="alert-table-wrapper remit-table-wrap"><table class="alert-table remit-table"><thead><tr><th>Date</th><th>Status</th><th>Expected</th><th>Remitted</th><th>Difference</th><th>TXs</th></tr></thead><tbody>';
        if (!records.length) {
            html += '<tr><td colspan="6" class="empty-state-cell">No remittance records in the past 2 weeks</td></tr>';
        } else {
            for (var i = 0; i < records.length; i++) {
                var r = records[i];
                var diff = Number(r.difference) || 0;
                html += '<tr><td>' + esc(r.date || '') + '</td>' +
                    '<td>' + statusBadge(r.status) + '</td>' +
                    '<td>' + money(r.expected) + '</td>' +
                    '<td>' + money(r.remitted) + '</td>' +
                    '<td>' + (diff === 0 ? 'Exact' : (diff > 0 ? 'Over ' + money(diff) : 'Short ' + money(-diff))) + '</td>' +
                    '<td>' + (r.txCount || 0) + '</td></tr>';
            }
        }
        html += '</tbody></table></div>';
        if (recordBody) recordBody.innerHTML = html;
        if (recordModal) recordModal.hidden = false;
    }

    tbody.addEventListener('click', function (e) {
        var row = e.target.closest ? e.target.closest('.remit-status-row') : null;
        if (row && row.dataset.cashier) openRecord(row.dataset.cashier);
    });
    var closeA = document.getElementById('remitRecordClose');
    var closeB = document.getElementById('remitRecordCloseBtn');
    if (closeA) closeA.addEventListener('click', function () { if (recordModal) recordModal.hidden = true; });
    if (closeB) closeB.addEventListener('click', function () { if (recordModal) recordModal.hidden = true; });

    render();
    window.addEventListener('storage', function (event) {
        if (!event.key || event.key === 'nb_remittances') render();
    });
}());
