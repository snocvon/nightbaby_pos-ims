document.addEventListener('DOMContentLoaded', function () {
    var adDuration = 7000;
    var customerWelcome = document.getElementById('customerWelcome');
    var customerCheckout = document.getElementById('customerCheckout');
    var customerAds = document.getElementById('customerAds');
    var customerAdPanel = document.querySelector('.customer-ad-panel');
    var customerStoreName = document.getElementById('customerStoreName');
    var checkoutStoreName = document.getElementById('checkoutStoreName');
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
    var lastSnapshot = null;
    var ads = [];
    var adIndex = 0;
    var adTimer;

    function readSnapshot() {
        try {
            return JSON.parse(localStorage.getItem('nb_customer_display') || '{}');
        } catch (error) {
            return {};
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
        var ad = ads[adIndex] || ads[0];
        customerAdTitle.textContent = ad.title;
        customerAdCopy.textContent = ad.copy;
        customerAdProgress.textContent = String(adIndex + 1).padStart(2, '0') + ' / ' + String(ads.length).padStart(2, '0');
        customerAdImage.hidden = !ad.image;
        if (ad.image) customerAdImage.src = ad.image;
    }

    function showAds() {
        customerWelcome.hidden = false;
        customerCheckout.hidden = true;
        customerAds.hidden = false;
        customerAdPanel.hidden = false;
        ads = getAds();
        adIndex = 0;
        renderAd();
        clearInterval(adTimer);
        adTimer = setInterval(function () {
            adIndex = (adIndex + 1) % ads.length;
            renderAd();
        }, adDuration);
    }

    function stopAds() {
        clearInterval(adTimer);
        adTimer = null;
    }

    function showCheckout(snapshot) {
        stopAds();
        customerAds.hidden = true;
        customerWelcome.hidden = true;
        customerCheckout.hidden = false;
        customerItemCount.textContent = (snapshot.itemCount || 0) + ' items';
        customerItems.innerHTML = snapshot.items && snapshot.items.length ? snapshot.items.map(function (item) {
            return '<div class="customer-item"><div><strong>' + escapeHtml(item.name) + '</strong><span>' + item.quantity + ' x ' + formatCurrency(item.price) + '</span></div><strong>' + formatCurrency(item.price * item.quantity) + '</strong></div>';
        }).join('') : '<p class="customer-empty">No items scanned yet.</p>';
        customerSubtotal.textContent = formatCurrency(snapshot.subtotal || 0);
        customerDiscount.textContent = snapshot.discount > 0 ? '-' + formatCurrency(snapshot.discount) : formatCurrency(0);
        customerTax.textContent = formatCurrency(snapshot.tax || 0);
        customerTotal.textContent = formatCurrency(snapshot.total || 0);
    }

    function showWelcome(snapshot) {
        stopAds();
        customerCheckout.hidden = true;
        customerAds.hidden = false;
        customerAdPanel.hidden = true;
        customerWelcome.hidden = false;
    }

    function refresh(snapshot) {
        lastSnapshot = snapshot;
        if (snapshot.items && snapshot.items.length) {
            showCheckout(snapshot);
        } else {
            showAds();
        }
    }

    window.addEventListener('storage', function (event) {
        if (event.key === 'nb_customer_display') refresh(readSnapshot());
    });

    window.addEventListener('focus', function () {
        if (lastSnapshot) refresh(readSnapshot());
    });

    refresh(readSnapshot());
});
