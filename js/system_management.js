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
        var backup = {};
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            backup[key] = localStorage.getItem(key);
        }
        var blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data: backup }, null, 2)], { type: 'text/plain' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'nightbaby-system-backup-' + new Date().toISOString().slice(0, 10) + '.txt';
        link.click();
        URL.revokeObjectURL(link.href);
        showSaved('Backup downloaded.');
    });

    document.getElementById('resetSystemDataBtn').addEventListener('click', function () {
        if (!confirm('Reset products, transactions, discounts, and settings to defaults?')) return;
        ['nb_products', 'nb_transactions', 'nb_revenue', 'nb_discounts', 'nb_settings'].forEach(function (key) {
            localStorage.removeItem(key);
        });
        window.location.reload();
    });

});
