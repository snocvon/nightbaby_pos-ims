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

	var passwordToggle = document.getElementById('passwordToggle');
	if (passwordToggle && passwordInput) {
		passwordToggle.addEventListener('click', function () {
			var showing = passwordInput.type === 'text';
			var nextLabel = showing ? 'Show password' : 'Hide password';
			passwordInput.type = showing ? 'password' : 'text';
			passwordToggle.setAttribute('aria-pressed', showing ? 'false' : 'true');
			passwordToggle.setAttribute('aria-label', nextLabel);
			passwordToggle.setAttribute('title', nextLabel);
			passwordInput.focus();
		});
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
		document.getElementById('resetSecurityQuestion').disabled = true;
	}

	forgotPasswordLink.addEventListener('click', function (event) {
		event.preventDefault();
		forgotPasswordModal.hidden = false;
		forgotPasswordModal.classList.add('active');
		document.getElementById('resetUsername').focus();
	});

	document.getElementById('resetUsername').addEventListener('input', function () {
		var username = this.value.trim();
		var securityQuestionSelect = document.getElementById('resetSecurityQuestion');
		securityQuestionSelect.disabled = username.length === 0;
		if (username.length === 0) securityQuestionSelect.value = '';
	});
	document.getElementById('closeForgotPassword').addEventListener('click', closeForgotPassword);
	document.getElementById('cancelForgotPassword').addEventListener('click', closeForgotPassword);

	forgotPasswordForm.addEventListener('submit', async function (event) {
		event.preventDefault();
		forgotPasswordError.textContent = '';
		var resetUsername = document.getElementById('resetUsername').value.trim().toLowerCase();
		var selectedQuestion = document.getElementById('resetSecurityQuestion').value;
		var securityAnswer = document.getElementById('resetSecurityAnswer').value.trim().toLowerCase();
		var newPassword = document.getElementById('resetNewPassword').value;
		var confirmPassword = document.getElementById('resetConfirmPassword').value;
		
		if (!selectedQuestion) {
			forgotPasswordError.textContent = 'Please select your security question.';
			return;
		}
		
		var passwordValidation = validatePasswordStrength(newPassword);
		if (!passwordValidation.valid) {
			forgotPasswordError.textContent = passwordValidation.message;
			return;
		}
		
		if (newPassword !== confirmPassword) {
			forgotPasswordError.textContent = 'Passwords do not match.';
			return;
		}
		
		try {
			var users = await loadUsers();
			var user = users.find(function (item) { return item.username === resetUsername; });
			
			if (!user) {
				forgotPasswordError.textContent = 'Username not found.';
				return;
			}
			
			if (!user.securityQuestion || !user.securityAnswer) {
				forgotPasswordError.textContent = 'This account does not have security questions configured. Please contact an administrator.';
				return;
			}
			
			var savedQuestion = user.securityQuestion;
			var savedAnswer = user.securityAnswer.trim().toLowerCase();
			if (savedQuestion !== selectedQuestion || savedAnswer !== securityAnswer) {
				forgotPasswordError.textContent = 'Security question or answer is incorrect.';
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
			
			if (isAccountLocked(username)) {
				var remainingTime = getRemainingLockoutTime(username);
				var minutes = Math.floor(remainingTime / 60);
				var seconds = remainingTime % 60;
				throw new Error('Account locked due to too many failed attempts. Try again in ' + minutes + 'm ' + seconds + 's.');
			}
			
			var users = await loadUsers();
			var user = users.find(function (item) { return item.username === username; });

			if (!user || user.enabled === false || !(await verifyPassword(password, user))) {
				recordFailedLoginAttempt(username);
				throw new Error('Invalid username or password.');
			}
			
			clearFailedLoginAttempts(username);
			
			setSession({
				username: user.username,
				fullname: user.accountHolderName || user.fullname || user.username,
				accountHolderName: user.accountHolderName || user.fullname || user.username,
				role: user.role,
				cashierId: user.cashierId || ''
			});

			var notifMessages = [];
			var isDefault = isDefaultPasswordUser(user);
			var noSecurity = needsSecurityQuestion(user);
			if (isDefault) notifMessages.push('change your default password');
			if (noSecurity) notifMessages.push('set your security question and answer');
			if (notifMessages.length > 0) {
				try {
					sessionStorage.setItem('nb_setup_notif', 'Please ' + notifMessages.join(' and ') + ' in Account Settings.');
				} catch (e) {}
			}
			
			var redirectPage = 'dashboard.html';
			if (typeof getDefaultPage === 'function') {
				redirectPage = getDefaultPage(user.role);
			} else {
				redirectPage = user.role === 'cashier' ? 'pos.html'
					: user.role === 'it' ? 'account_management.html'
					: 'dashboard.html';
			}

			if ((user.role === 'admin' || user.role === 'cashier') && getSystemSettings().systemDown) {
				redirectPage = 'system_down.html';
			}

			if (typeof setLastAuthorizedPage === 'function') {
				setLastAuthorizedPage(redirectPage);
			}

			window.location.href = redirectPage;

		} catch (error) {
			errorMessage.textContent = error.message === 'Invalid username or password.' || error.message.indexOf('System is down') === 0 || error.message.indexOf('Account locked') === 0
				? error.message
				: 'Unable to load user accounts.';
		} finally {
			loginButton.disabled = false;
		}
	});
}());