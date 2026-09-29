(function () {
	'use strict';

	var form = document.getElementById('loginFormElement');
	var usernameInput = document.getElementById('username');
	var passwordInput = document.getElementById('password');
	var loginButton = document.getElementById('loginButton');
	var forgotPasswordLink = document.getElementById('forgotPasswordLink');
	var forgotPasswordModal = document.getElementById('forgotPasswordModal');
	var forgotPasswordForm = document.getElementById('forgotPasswordForm');
	var forgotPasswordError = document.getElementById('forgotPasswordError');
	var errorMessage = document.createElement('p');

	errorMessage.className = 'login-error';
	form.appendChild(errorMessage);
	var systemDownNotice = document.createElement('p');
	systemDownNotice.className = 'login-error';
	if (getSystemSettings().systemDown) {
		systemDownNotice.textContent = 'System is down for maintenance. Admin and Cashier accounts will see the maintenance page.';
		form.insertBefore(systemDownNotice, form.firstChild);
	}

	async function loadUsers() {
		await nbDataReady;
		return getUsers();
	}

	function closeForgotPassword() {
		forgotPasswordModal.classList.remove('active');
		forgotPasswordModal.hidden = true;
		forgotPasswordForm.reset();
		forgotPasswordError.textContent = '';
	}

	forgotPasswordLink.addEventListener('click', function (event) {
		event.preventDefault();
		forgotPasswordModal.hidden = false;
		forgotPasswordModal.classList.add('active');
		document.getElementById('resetUsername').focus();
	});
	document.getElementById('closeForgotPassword').addEventListener('click', closeForgotPassword);
	document.getElementById('cancelForgotPassword').addEventListener('click', closeForgotPassword);
	forgotPasswordModal.addEventListener('click', function (event) {
		if (event.target === forgotPasswordModal) closeForgotPassword();
	});

	forgotPasswordForm.addEventListener('submit', async function (event) {
		event.preventDefault();
		forgotPasswordError.textContent = '';
		var resetUsername = document.getElementById('resetUsername').value.trim().toLowerCase();
		var resetName = document.getElementById('resetAccountHolderName').value.trim().toLowerCase();
		var newPassword = document.getElementById('resetNewPassword').value;
		var confirmPassword = document.getElementById('resetConfirmPassword').value;
		if (newPassword !== confirmPassword) {
			forgotPasswordError.textContent = 'Passwords do not match.';
			return;
		}
		if (newPassword.length < 6) {
			forgotPasswordError.textContent = 'Password must be at least 6 characters.';
			return;
		}
		try {
			var users = await loadUsers();
			var user = users.find(function (item) { return item.username === resetUsername; });
			var savedName = user && (user.accountHolderName || user.fullname || user.username).trim().toLowerCase();
			if (!user || savedName !== resetName) {
				forgotPasswordError.textContent = 'Username or account holder name is incorrect.';
				return;
			}
			user.salt = generateSalt();
			user.passwordHash = await hashPassword(newPassword, user.salt);
			delete user.hash;
			saveUsers(users);
			closeForgotPassword();
			errorMessage.textContent = 'Password reset successfully. You can now log in.';
		} catch (error) {
			forgotPasswordError.textContent = 'Unable to reset password. Please try again.';
		}
	});

	form.addEventListener('submit', async function (event) {
		event.preventDefault();
		errorMessage.textContent = '';
		loginButton.disabled = true;

		try {
			var username = usernameInput.value.trim().toLowerCase();
			var password = passwordInput.value;
			var users = await loadUsers();
			var user = users.find(function (item) { return item.username === username; });

			if (!user || user.enabled === false || !(await verifyPassword(password, user))) {
				throw new Error('Invalid username or password.');
			}
			setSession({
				username: user.username,
				fullname: user.accountHolderName || user.fullname || user.username,
				accountHolderName: user.accountHolderName || user.fullname || user.username,
				role: user.role,
				cashierId: user.cashierId || ''
			});
			window.location.href = (user.role === 'admin' || user.role === 'cashier') && getSystemSettings().systemDown
				? 'system_down.html'
				: user.role === 'cashier'
				? 'pos.html'
				: user.role === 'it' ? 'account_management.html' : 'dashboard.html';
		} catch (error) {
			errorMessage.textContent = error.message === 'Invalid username or password.' || error.message.indexOf('System is down') === 0
				? error.message
				: 'Unable to load user accounts.';
		} finally {
			loginButton.disabled = false;
		}
	});
}());