document.addEventListener('DOMContentLoaded', function () {
    var adDuration = 7000;
    var pollIntervalMs = 800;
    var customerWelcome = document.getElementById('customerWelcome');
    var customerCheckout = document.getElementById('customerCheckout');
    var customerAds = document.getElementById('customerAds');
    var customerAdPanel = document.querySelector('.customer-ad-panel');
    var customerItemCount = document.getElementById('customerItemCount');
    var customerItems = document.getElementById('customerItems');
    var customerSubtotal = document.getElementById('customerSubtotal');
    var customerDiscount = document.getElementById('customerDiscount');
    var customerTax = document.getElementById('customerTax');
    var customerTotal = document.getElementById('customerTotal');
    var customerAdTitle = document.getElementById('customerAdTitle');
    var customerAdCopy = document.getElementById('customerAdCopy');
    var customerAdImage = document.getElementById('customerAdImage');
    var customerAdProgress = document.getElementById('customerAdProgress');
    var lastSnapshotKey = '';
    var lastUpdatedAt = 0;
    var ads = [];
    var adIndex = 0;
    var adTimer = null;
    var pollTimer = null;
    var currentMode = 'init';

    function readSnapshot() {
        try {
            var raw = localStorage.getItem('nb_customer_display');
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            if (!parsed.items || !Array.isArray(parsed.items)) parsed.items = [];
            return parsed;
        } catch (error) {
            return null;
        }
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>'"]/g, function (character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
        });
    }

    function getAds() {
        return [
            {
                title: 'ABOUT NIGHTBABY ORIGINALS',
                copy: 'Nightbaby Originals is a fashion collection inspired by creativity, individuality, and self-expression. Through unique designs and distinct series, it encourages people to embrace who they are and stand out from the crowd.',
                image: 'images/PRODUCTS/ORIGS.png'
            },
            {
                title: 'CRISIS SERIES',
                copy: 'A collection inspired by conflict, change, and self-expression. The Crisis Series explores the tension between conformity and individuality through bold, statement-driven designs.',
                image: 'images/PRODUCTS/ORIGS1.png'
            },
            {
                title: 'STREETS SERIES',
                copy: 'A collection inspired by urban life, movement, and freedom. The Streets Series reflects the energy of the city and the people who shape its culture every day.',
                image: 'images/PRODUCTS/ORIGS2.png'
            },
            {
                title: 'GHOST SERIES',
                copy: 'A collection inspired by memories, mystery, and the unseen. The Ghost Series explores themes of presence, absence, and the traces people leave behind.',
                image: 'images/PRODUCTS/ORIGS3.png'
            }
        ];
    }

    function renderAd() {
        if (!customerAdTitle || !customerAdCopy || !customerAdProgress || !customerAdImage) return;
        var ad = ads[adIndex] || ads[0] || { title: '', copy: '', image: '' };
        customerAdTitle.textContent = ad.title;
        customerAdCopy.textContent = ad.copy;
        customerAdProgress.textContent = String(adIndex + 1).padStart(2, '0') + ' / ' + String(ads.length || 1).padStart(2, '0');
        customerAdImage.hidden = !ad.image;
        if (ad.image) {
            customerAdImage.onerror = function () { this.style.display = 'none'; };
            customerAdImage.src = ad.image;
        }
    }

    function showAds() {
        if (currentMode === 'ads') return;
        currentMode = 'ads';
        stopAds();
        if (customerWelcome) customerWelcome.hidden = false;
        if (customerCheckout) customerCheckout.hidden = true;
        if (customerAds) customerAds.hidden = false;
        if (customerAdPanel) customerAdPanel.hidden = false;
        ads = getAds();
        adIndex = 0;
        renderAd();
        adTimer = setInterval(function () {
            if (!ads.length) return;
            adIndex = (adIndex + 1) % ads.length;
            renderAd();
        }, adDuration);
    }

    function stopAds() {
        if (adTimer) {
            clearInterval(adTimer);
            adTimer = null;
        }
    }

    function showCheckout(snapshot) {
        currentMode = 'checkout';
        stopAds();
        if (customerAds) customerAds.hidden = true;
        if (customerWelcome) customerWelcome.hidden = true;
        if (customerCheckout) customerCheckout.hidden = false;

        var itemCount = Number(snapshot.itemCount) || 0;
        if (customerItemCount) {
            customerItemCount.textContent = itemCount + (itemCount === 1 ? ' item' : ' items');
        }
        var items = snapshot.items && snapshot.items.length ? snapshot.items : [];
        if (customerItems) {
            if (items.length === 0) {
                customerItems.innerHTML = '<p class="customer-empty">No items scanned yet.</p>';
            } else {
                var html = '';
                for (var i = 0; i < items.length; i++) {
                    var it = items[i];
                    var price = Number(it.price) || 0;
                    var qty = Number(it.quantity) || 0;
                    var lineTotal = price * qty;
                    html += '' +
                        '<div class="customer-item">' +
                        '    <div>' +
                        '        <strong>' + escapeHtml(it.name || 'Item') + '</strong>' +
                        '        <span>' + escapeHtml(String(qty)) + ' x ' + formatCurrency(price) + '</span>' +
                        '    </div>' +
                        '    <strong>' + formatCurrency(lineTotal) + '</strong>' +
                        '</div>';
                }
                customerItems.innerHTML = html;
            }
        }
        if (customerSubtotal) customerSubtotal.textContent = formatCurrency(Number(snapshot.subtotal) || 0);
        if (customerDiscount) {
            var disc = Number(snapshot.discount) || 0;
            customerDiscount.textContent = disc > 0 ? '-' + formatCurrency(disc) : formatCurrency(0);
        }
        if (customerTax) customerTax.textContent = formatCurrency(Number(snapshot.tax) || 0);
        if (customerTotal) customerTotal.textContent = formatCurrency(Number(snapshot.total) || 0);
    }

    function snapshotChanged(snapshot) {
        if (!snapshot) return false;
        var ts = Number(snapshot.updatedAt) || 0;
        if (ts !== lastUpdatedAt) return true;
        var key = (snapshot.items || []).map(function (i) {
            return (i.id || '') + '|' + (i.quantity || 0);
        }).join('__') + '__' + (snapshot.total || 0);
        if (key !== lastSnapshotKey) return true;
        return false;
    }

    function refreshIfChanged() {
        var snapshot = readSnapshot();
        if (!snapshot) {
            if (currentMode !== 'ads') showAds();
            lastSnapshotKey = '';
            lastUpdatedAt = 0;
            return;
        }
        if (!snapshotChanged(snapshot)) return;

        lastUpdatedAt = Number(snapshot.updatedAt) || 0;
        lastSnapshotKey = (snapshot.items || []).map(function (i) {
            return (i.id || '') + '|' + (i.quantity || 0);
        }).join('__') + '__' + (snapshot.total || 0);

        var hasItems = snapshot.items && snapshot.items.length > 0;
        if (hasItems) {
            showCheckout(snapshot);
        } else {
            showAds();
        }
    }

    window.addEventListener('storage', function (event) {
        if (event.key === 'nb_customer_display') {
            refreshIfChanged();
        }
    });

    window.addEventListener('focus', function () {
        refreshIfChanged();
    });

    pollTimer = setInterval(refreshIfChanged, pollIntervalMs);
    showAds();
    refreshIfChanged();

    var scanChannel = null;
    try { scanChannel = new BroadcastChannel('nb_scanner_relay'); } catch (e) { scanChannel = null; }
    var relayBuffer = '';
    var relayLastKeyAt = 0;
    var relayLastCharacter = '';
    document.addEventListener('keydown', function (e) {
        var now = Date.now();
        var isChar = e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey;
        if (isChar && now - relayLastKeyAt < 100) {
            if (!relayBuffer) relayBuffer = relayLastCharacter;
            relayBuffer += e.key;
            e.preventDefault();
            relayLastKeyAt = now;
            relayLastCharacter = e.key;
            return;
        }
        if (e.key === 'Enter' && relayBuffer) {
            e.preventDefault();
            var code = relayBuffer;
            relayBuffer = '';
            relayLastKeyAt = 0;
            relayLastCharacter = '';
            if (document.hasFocus() && scanChannel) {
                scanChannel.postMessage({ type: 'scan', code: code });
            }
            return;
        }
        if (now - relayLastKeyAt >= 1000) relayBuffer = '';
        relayLastKeyAt = now;
        if (isChar) relayLastCharacter = e.key;
    }, true);
});
