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
    var editingUsername = document.getElementById('editingUsername');
    var formError = document.getElementById('userFormError');

    function displayRole(role) {
        return role === 'it' ? 'Super User' : role === 'admin' ? 'Admin' : 'Cashier';
    }

    function normalizeUser(user) {
        user.role = user.role || (user.username === 'admin' ? 'admin' : 'cashier');
        if (user.role === 'superuser' || user.username === 'superuser') user.role = 'it';
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
        return session && session.role === 'it';
    }

    function renderUsers() {
        var visibleUsers = users.filter(function (user) {
            return isSuperUser() || user.role !== 'it';
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
            var session = typeof getSession === 'function' ? getSession() : null;
            var isCurrentUser = session && session.username === user.username;
            var isProtected = user.role === 'it' || isCurrentUser;
            var toggleLabel = enabled ? 'Disable' : 'Enable';
            return '<tr>' +
                '<td><div class="user-cell"><span class="user-avatar-mini">' + initial + '</span><span><strong>' + accountHolderName + '</strong><small class="user-username">' + username + '</small></span></div></td>' +
                '<td><span class="role-badge">' + displayRole(user.role) + '</span></td>' +
                '<td><span class="status-badge ' + (enabled ? 'enabled' : 'disabled') + '">' + (enabled ? 'Enabled' : 'Disabled') + '</span></td>' +
                '<td class="table-actions"><div class="action-group">' +
                '<button type="button" class="icon-btn" data-action="edit" data-username="' + username + '" aria-label="Edit ' + username + '" title="Edit">&#9998;</button>' +
                '<button type="button" class="icon-btn" data-action="toggle" data-username="' + username + '" ' + (isCurrentUser ? 'disabled' : '') + ' aria-label="' + toggleLabel + ' ' + username + '" title="' + (isCurrentUser ? 'Your account cannot be disabled' : toggleLabel) + '">' + (enabled ? '&#8856;' : '&#9654;') + '</button>' +
                '<button type="button" class="icon-btn danger" data-action="remove" data-username="' + username + '" ' + (isProtected ? 'disabled' : '') + ' aria-label="Remove ' + username + '" title="' + (isCurrentUser ? 'Your logged-in account cannot be removed' : user.role === 'it' ? 'Super User accounts cannot be deleted' : 'Remove') + '">&minus;</button>' +
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

        var storedUsers = localStorage.getItem('nb_users');
        if (storedUsers !== null) {
            users = getUsers().map(normalizeUser);
            renderUsers();
            return;
        }

        try {
            var response = await fetch('json/user.json', { cache: 'no-store' });
            if (!response.ok) throw new Error('Unable to load users');
            var seed = await response.json();
            users = Array.isArray(seed.users) ? seed.users.map(normalizeUser) : [];
            saveUsers(users);
        } catch (error) {
            users = [];
        }
        renderUsers();
    }

    function openModal(user) {
        form.reset();
        formError.textContent = '';
        var superUserOption = roleInput.querySelector('option[value="it"]');
        if (superUserOption) superUserOption.hidden = !isSuperUser();
        editingUsername.value = user ? user.username : '';
        modalTitle.textContent = user ? 'Edit User' : 'Add User';
        usernameInput.value = user ? user.username : '';
        usernameInput.readOnly = Boolean(user);
        accountHolderNameInput.value = user ? (user.accountHolderName || '') : '';
        roleInput.value = user ? (user.role || 'cashier') : 'cashier';
        passwordInput.required = !user;
        passwordInput.placeholder = user ? 'Leave blank to keep current password' : '';
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

        if (role === 'it' && !isSuperUser()) {
            formError.textContent = 'Only a Super User can assign the Super User role.';
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
        if (button.dataset.action === 'remove' && (user.role === 'it' || (getSession() && getSession().username === user.username))) return;
        if (button.dataset.action === 'remove' && confirm('Remove user "' + username + '"?')) {
            users = users.filter(function (item) { return item.username !== username; });
            saveUsers(users);
            renderUsers();
        }
    });

    document.getElementById('addUserButton').addEventListener('click', function () { openModal(null); });
    document.getElementById('closeUserModal').addEventListener('click', closeModal);
    document.getElementById('cancelUserModal').addEventListener('click', closeModal);
    modal.addEventListener('click', function (event) { if (event.target === modal) closeModal(); });
    form.addEventListener('submit', saveUser);
    loadUsers();
}());
