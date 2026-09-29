document.addEventListener('DOMContentLoaded', function () {
    var systemDownToggle = document.getElementById('systemDownToggle');
    var savedMessage = document.createElement('span');
    savedMessage.className = 'settings-saved';
    document.querySelector('.maintenance-header').appendChild(savedMessage);

    function showSaved(message) {
        savedMessage.textContent = message;
        setTimeout(function () { savedMessage.textContent = ''; }, 2500);
    }

    function readSettings() {
        try {
            return JSON.parse(localStorage.getItem('nb_settings') || '{}');
        } catch (error) {
            return {};
        }
    }

    systemDownToggle.checked = Boolean(readSettings().systemDown);
    systemDownToggle.addEventListener('change', function () {
        var settings = readSettings();
        settings.systemDown = this.checked;
        localStorage.setItem('nb_settings', JSON.stringify(settings));
        showSaved(this.checked ? 'System is down for maintenance.' : 'System is back up.');
    });

    document.getElementById('backupSystemBtn').addEventListener('click', function () {
        var data = {};
        var keys = (typeof NB_DATA_KEYS !== 'undefined' && NB_DATA_KEYS.length) ? NB_DATA_KEYS : ['nb_users', 'nb_products', 'nb_transactions', 'nb_discounts', 'nb_settings', 'nb_revenue', 'nb_stock_overrides', 'nb_login_attempts'];
        keys.forEach(function (key) { try { data[key] = localStorage.getItem(key); } catch (e) { data[key] = null; } });
        var payload = { app: 'nightbaby-pos-ims', format: 'NBData', version: 1, exportedAt: new Date().toISOString(), exportedBy: (typeof getSession === 'function' && getSession()) ? getSession().username : 'unknown', data: data };
        var json = JSON.stringify(payload);
        var b64 = btoa(unescape(encodeURIComponent(json)));
        var blob = new Blob(['NBDATA1:' + b64], { type: 'application/octet-stream' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'nightbaby-backup-' + new Date().toISOString().slice(0, 10) + '.NBData';
        document.body.appendChild(link);
        link.click();
        setTimeout(function () { try { document.body.removeChild(link); } catch (e) {} URL.revokeObjectURL(link.href); }, 500);
        showSaved('Backup (.NBData) downloaded.');
    });

    document.getElementById('importSystemBtn').addEventListener('click', function () {
        var fileInput = document.getElementById('importSystemFile');
        if (fileInput) fileInput.click();
    });

    document.getElementById('importSystemFile').addEventListener('change', function () {
        var file = this.files && this.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
            try {
                var text = String(reader.result || '');
                var json = text;
                if (text.indexOf('NBDATA1:') === 0) {
                    json = decodeURIComponent(escape(atob(text.slice('NBDATA1:'.length).trim())));
                }
                var payload = JSON.parse(json);
                if (!payload || (payload.format !== 'NBData' && !payload.data)) throw new Error('bad file');
                var data = payload.data || {};
                if (!confirm('Import backup from ' + (payload.exportedAt || 'unknown date') + '? Current data will be replaced.')) return;
                Object.keys(data).forEach(function (key) {
                    try {
                        if (data[key] === null || typeof data[key] === 'undefined') localStorage.removeItem(key);
                        else localStorage.setItem(key, data[key]);
                    } catch (e) {}
                });
                showSaved('Backup imported. Reloading...');
                setTimeout(function () { window.location.reload(); }, 800);
            } catch (error) {
                showSaved('Import failed: invalid .NBData file.');
            }
        };
        reader.readAsText(file);
        this.value = '';
    });

    document.getElementById('resetSystemDataBtn').addEventListener('click', function () {
        var includeUsersToggle = document.getElementById('resetIncludeUsersToggle');
        var includeUsers = !!(includeUsersToggle && includeUsersToggle.checked);
        var firstPrompt = includeUsers
            ? 'SYSTEM RESET: deletes ALL products, sales, discounts, charts AND all accounts, restoring only the 2 defaults (superadmin + admin).\n\nType RESET to continue:'
            : 'SYSTEM RESET: deletes ALL products, sales, discounts and charts. User accounts will be KEPT.\n\nType RESET to continue:';
        var first = prompt(firstPrompt);
        if (!first || first.trim().toUpperCase() !== 'RESET') return;
        var confirmMsg = includeUsers
            ? 'Final check: wipe everything to 0 and restore the 2 default accounts?'
            : 'Final check: wipe everything to 0 while KEEPING all user accounts?';
        if (!confirm(confirmMsg)) return;
        if (typeof resetSystemToDefaults === 'function') resetSystemToDefaults(includeUsers);
        else ['nb_products', 'nb_transactions', 'nb_revenue', 'nb_discounts', 'nb_settings', 'nb_stock_overrides', 'nb_login_attempts'].forEach(function (key) { try { localStorage.removeItem(key); } catch (e) {} });
        showSaved(includeUsers ? 'System reset to defaults (users included).' : 'System reset to defaults (users kept).');
        setTimeout(function () { window.location.reload(); }, 800);
    });

});
