document.addEventListener('DOMContentLoaded', async function () {
    loginRequired(['cashier', 'it']);
    var currentSession = getSession();
    var cart = [];
    var discount = 0;
    var tax = 0;
    var receiptId = generateReceiptId(currentSession && (currentSession.cashierId || currentSession.username));
    var currentTxType = 'Purchase';
    var currentCategory = 'all';
    var searchQuery = '';
    function loadProducts() {
        getProducts();
        renderProducts();
        updateStats();
    }
    var cartItemsContainer = document.getElementById('cartItems');
    var cartCount = document.getElementById('cartCount');
    var cartItemCount = document.getElementById('cartItemCount');
    var receiptItemsContainer = document.getElementById('receiptItems');
    var subtotalDisplay = document.getElementById('subtotalDisplay');
    var totalDisplay = document.getElementById('totalDisplay');
    var discountDisplay = document.getElementById('discountDisplay');
    var receiptIdDisplay = document.getElementById('receiptId');
    var receiptDateDisplay = document.getElementById('receiptDate');
    var completeSaleBtn = document.getElementById('completeSaleBtn');
    var clearCartBtn = document.getElementById('clearCartBtn');
    var searchInput = document.getElementById('searchInput');
    var searchBtn = document.getElementById('searchBtn');
    var productsGrid = document.getElementById('productsGrid');
    var productCountDisplay = document.getElementById('productCountDisplay');
    var customerScreenBtn = document.getElementById('customerScreenBtn');
    var categoryTabs = document.querySelectorAll('.category-tab');

    function publishCustomerDisplay() {
        try {
            var finalTotal = getFinalTotal();
            var subtotal = finalTotal + discount - tax;
            var displayItems = [];
            for (var di = 0; di < cart.length; di++) {
                var srcItem = cart[di];
                displayItems.push({
                    id: srcItem.id,
                    name: srcItem.name,
                    category: srcItem.category,
                    subcategory: srcItem.subcategory,
                    price: srcItem.price,
                    quantity: srcItem.quantity,
                    stock: srcItem.stock
                });
            }
            localStorage.setItem('nb_customer_display', JSON.stringify({
                storeName: getSystemSettings().storeName || 'nightbaby',
                items: displayItems,
                itemCount: getCartItemCount(),
                subtotal: subtotal,
                discount: discount,
                tax: tax,
                total: finalTotal,
                updatedAt: Date.now()
            }));
        } catch (e) {
            if (e && e.name === 'QuotaExceededError') {
                showNotification('Unable to update customer display: storage is full.', 'error');
            }
        }
    }

    function openCustomerScreen() {
        var customerWindow = window.open('customer.html', 'nightbabyCustomerDisplay', 'width=1280,height=800');
        if (!customerWindow) {
            showNotification('Allow pop-ups to open the customer display.', 'error');
            return;
        }
        try { customerWindow.blur(); } catch (e) { }
        try { window.focus(); } catch (e) { }
        setTimeout(function () {
            try { window.focus(); } catch (e) { }
        }, 50);
        var focusWatchdog = setInterval(function () {
            if (customerWindow.closed) {
                clearInterval(focusWatchdog);
                try { window.focus(); } catch (e) { }
            }
        }, 500);
    }
    function createCheckoutModal() {
        var modalHTML = '' +
            '<div class="pos-modal-overlay" id="posModalOverlay">' +
            '    <div class="pos-modal">' +
            '        <div class="pos-modal-header">' +
            '            <h2>Confirm Sale</h2>' +
            '            <button class="pos-modal-close" id="posModalClose">✕</button>' +
            '        </div>' +
            '        <div class="pos-modal-body">' +
            '            <div class="modal-order-summary">' +
            '                <div class="modal-summary-row"><span>Items in Cart</span><span id="modalItemCount">0</span></div>' +
            '                <div class="modal-summary-row"><span>Subtotal</span><span id="modalSubtotal">₱0.00</span></div>' +
            '                <div class="modal-summary-row"><span>Discount</span><span id="modalDiscount">₱0.00</span></div>' +
            '                <div class="modal-summary-row"><span>Tax</span><span id="modalTax">₱0.00</span></div>' +
            '                <div class="modal-summary-row modal-total-row"><span>Total</span><span id="modalTotal">₱0.00</span></div>' +
            '            </div>' +
            '            <div class="modal-items-preview" id="modalItemsPreview"></div>' +
            '            <div class="modal-payment-section">' +
            '                <label for="modalPaymentMethod">Payment Method</label>' +
            '                <div class="payment-method-control"><select id="modalPaymentMethod">' +
            '                    <option value="Cash">Cash</option>' +
            '                    <option value="GCash">GCash</option>' +
            '                </select></div>' +
            '                <div id="accountHolderField"><label for="modalAccountHolderName">Account Holder Name</label>' +
            '                <input type="text" id="modalAccountHolderName" placeholder="Enter account holder name" autocomplete="off"></div>' +
            '                <div id="referenceNumberField"><label for="modalReferenceNumber">Reference Number</label>' +
            '                <input type="text" id="modalReferenceNumber" placeholder="Enter reference number" autocomplete="off"></div>' +
            '                <label for="modalPaymentAmount">Payment Amount</label>' +
            '                <input type="number" id="modalPaymentAmount" placeholder="Enter payment amount" min="0" step="0.01">' +
            '                <div class="modal-change-display">' +
            '                    <span>Change:</span><span id="modalChangeAmount">₱0.00</span>' +
            '                </div>' +
            '            </div>' +
            '        </div>' +
            '        <div class="pos-modal-footer">' +
            '            <button class="modal-btn-cancel" id="modalCancelBtn">Cancel</button>' +
            '            <button class="modal-btn-confirm" id="modalConfirmBtn">Confirm Sale</button>' +
            '        </div>' +
            '    </div>' +
            '</div>';
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    var modalOverlay, modalClose, modalCancelBtn, modalConfirmBtn;
    var modalItemCount, modalSubtotal, modalDiscount, modalTotal;
    var modalItemsPreview, modalPaymentMethod, accountHolderField, referenceNumberField;
    var modalAccountHolderName, modalReferenceNumber, modalPaymentAmount, modalChangeAmount;

    function cacheModalElements() {
        modalOverlay = document.getElementById('posModalOverlay');
        modalClose = document.getElementById('posModalClose');
        modalCancelBtn = document.getElementById('modalCancelBtn');
        modalConfirmBtn = document.getElementById('modalConfirmBtn');
        modalItemCount = document.getElementById('modalItemCount');
        modalSubtotal = document.getElementById('modalSubtotal');
        modalDiscount = document.getElementById('modalDiscount');
        modalTotal = document.getElementById('modalTotal');
        modalItemsPreview = document.getElementById('modalItemsPreview');
        modalPaymentMethod = document.getElementById('modalPaymentMethod');
        accountHolderField = document.getElementById('accountHolderField');
        referenceNumberField = document.getElementById('referenceNumberField');
        modalAccountHolderName = document.getElementById('modalAccountHolderName');
        modalReferenceNumber = document.getElementById('modalReferenceNumber');
        modalPaymentAmount = document.getElementById('modalPaymentAmount');
        modalChangeAmount = document.getElementById('modalChangeAmount');
    }
    function getFilteredProducts() {
        var allProducts = getProducts();
        var filtered = [];
        for (var i = 0; i < allProducts.length; i++) {
            var p = allProducts[i];
            if (currentCategory !== 'all' && p.category !== currentCategory) {
                continue;
            }
            filtered.push(p);
        }
        if (searchQuery.trim() !== '') {
            var q = searchQuery.toLowerCase().trim();
            var searchResults = [];
            for (var j = 0; j < filtered.length; j++) {
                var prod = filtered[j];
                var match = false;
                if (prod.name && prod.name.toLowerCase().indexOf(q) !== -1) match = true;
                if (prod.subcategory && prod.subcategory.toLowerCase().indexOf(q) !== -1) match = true;
                if (prod.category && prod.category.toLowerCase().indexOf(q) !== -1) match = true;
                if (String(prod.id).toLowerCase().indexOf(q) !== -1) match = true;
                if (match) searchResults.push(prod);
            }
            filtered = searchResults;
        }

        return filtered;
    }
    function renderProducts() {
        var filtered = getFilteredProducts();
        productCountDisplay.textContent = filtered.length + ' products';
        if (filtered.length === 0) {
            productsGrid.innerHTML = '' +
                '<div class="no-products-found">' +
                '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '        <circle cx="11" cy="11" r="8"/>' +
                '        <path d="M21 21l-4.35-4.35"/>' +
                '    </svg>' +
                '    <span>No products found</span>' +
                '</div>';
            return;
        }
        var html = '';
        for (var i = 0; i < filtered.length; i++) {
            var product = filtered[i];
            var currentStock = Number(product.stock) || 0;
            var outOfStock = (currentStock <= 0);
            var lowStock = (!outOfStock && currentStock <= 10);
            var badgeClass = '';
            if (outOfStock) badgeClass = 'out';
            else if (lowStock) badgeClass = 'low';
            var badgeText = '';
            if (outOfStock) badgeText = 'Out of Stock';
            else badgeText = currentStock + ' in stock';
            var btnDisabled = outOfStock ? 'disabled' : '';
            var btnText = outOfStock ? 'Sold Out' : 'Add to Cart';
            var cardDisabledClass = outOfStock ? 'disabled' : '';
            var dataStr = JSON.stringify(product).replace(/"/g, '&quot;');
            var imgErrorFallback = "this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22 viewBox=%220 0 120 120%22%3E%3Crect width=%22120%22 height=%22120%22 fill=%22%231a1714%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22monospace%22 font-size=%2210%22 fill=%22%235a4f45%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENO IMAGE%3C/text%3E%3C/svg%3E'";

            html += '' +
                '<div class="product-card ' + cardDisabledClass + '" data-product="' + dataStr + '">' +
                '    <div class="product-image">' +
                '        <img src="' + product.image + '" alt="' + product.name + '" onerror="' + imgErrorFallback + '">' +
                '        <div class="product-stock-badge ' + badgeClass + '">' + badgeText + '</div>' +
                '    </div>' +
                '    <div class="product-details">' +
                '        <span class="product-category-tag">' + product.category + '</span>' +
                '        <span class="product-name">' + product.name + '</span>' +
                '        <span class="product-subcategory">' + (product.subcategory || '') + '</span>' +
                '        <span class="product-price">' + formatCurrency(product.price) + '</span>' +
                '    </div>' +
                '    <button class="product-add-btn" ' + btnDisabled + '>' + btnText + '</button>' +
                '</div>';
        }
        productsGrid.innerHTML = html;
        var cards = document.querySelectorAll('.product-card');
        for (var c = 0; c < cards.length; c++) {
            (function (card) {
                var addBtn = card.querySelector('.product-add-btn');
                var productData = JSON.parse(card.dataset.product);
                var prodStock = Number(productData.stock) || 0;
                if (prodStock <= 0) {
                    card.style.opacity = '0.55';
                    card.style.pointerEvents = 'none';
                    return;
                }
                addBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    addToCart(productData);
                });
                card.addEventListener('click', function () {
                    addToCart(productData);
                });
            })(cards[c]);
        }
    }
    function updateCategoryTabs() {
        for (var i = 0; i < categoryTabs.length; i++) {
            var tab = categoryTabs[i];
            if (tab.dataset.category === currentCategory) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        }
    }
    function addToCart(product) {
        var currentStock = Number(product.stock) || 0;
        var existingItem = null;
        var currentQty = 0;
        for (var i = 0; i < cart.length; i++) {
            if (cart[i].id === product.id) {
                existingItem = cart[i];
                currentQty = existingItem.quantity;
                break;
            }
        }
        if (currentQty + 1 > currentStock) {
            showNotification('Not enough stock for "' + product.name + '" (only ' + currentStock + ' left)', 'error');
            return;
        }
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            var newItem = {
                id: product.id,
                name: product.name,
                category: product.category,
                subcategory: product.subcategory,
                price: product.price,
                quantity: 1,
                stock: currentStock,
                image: product.image
            };
            cart.push(newItem);
        }

        updateCartUI();
        showNotification(product.name + ' added to cart!', 'success');
    }
    function removeFromCart(productId) {
        for (var i = 0; i < cart.length; i++) {
            if (cart[i].id === productId) {
                if (cart[i].quantity > 1) {
                    cart[i].quantity -= 1;
                } else {
                    cart.splice(i, 1);
                }
                break;
            }
        }
        updateCartUI();
        showNotification('Item removed from cart', 'info');
    }
    function clearCart() {
        if (cart.length === 0) {
            showNotification('Cart is already empty', 'info');
            return;
        }
        if (confirm('Are you sure you want to clear the cart?')) {
            cart = [];
            updateCartUI();
            updateReceiptId();
            showNotification('Cart cleared', 'info');
        }
    }
    function getCartTotal() {
        var total = 0;
        for (var i = 0; i < cart.length; i++) {
            total += (cart[i].price * cart[i].quantity);
        }
        return total;
    }

    function getCartItemCount() {
        var count = 0;
        for (var i = 0; i < cart.length; i++) {
            count += cart[i].quantity;
        }
        return count;
    }

    function getCartDiscount() {
        var savedDiscounts;
        try {
            savedDiscounts = JSON.parse(localStorage.getItem('nb_discounts') || '[]');
        } catch (error) {
            savedDiscounts = [];
        }
        var today = new Date().toISOString().slice(0, 10);
        var totalDiscount = 0;

        for (var i = 0; i < cart.length; i++) {
            var item = cart[i];
            var itemTargets = [item.name, item.category, item.subcategory].filter(Boolean).map(function (target) {
                return String(target).toLowerCase();
            });
            var highestPercent = 0;
            for (var j = 0; j < savedDiscounts.length; j++) {
                var saved = savedDiscounts[j];
                var target = String(saved.category || '').toLowerCase();
                var active = (!saved.startDate || today >= saved.startDate) && (!saved.endDate || today <= saved.endDate);
                if (active && target && itemTargets.indexOf(target) !== -1) {
                    highestPercent = Math.max(highestPercent, Number(saved.percent) || 0);
                }
            }
            totalDiscount += (Number(item.price) || 0) * item.quantity * highestPercent / 100;
        }
        return totalDiscount;
    }

    function getFinalTotal() {
        var grossTotal = getCartTotal();
        discount = Math.min(getCartDiscount(), grossTotal);
        tax = (grossTotal - discount) * (Number(getSystemSettings().taxRate) || 0) / 100;
        return grossTotal - discount + tax;
    }
    function openCheckoutModal() {
        if (cart.length === 0) {
            showNotification('Cart is empty! Add items first.', 'error');
            return;
        }
        if (!modalOverlay) {
            showNotification('Checkout modal is not ready. Please refresh the page.', 'error');
            return;
        }

        var total = getFinalTotal();
        var subtotal = total + discount - tax;

        if (modalItemCount) modalItemCount.textContent = getCartItemCount();
        if (modalSubtotal) modalSubtotal.textContent = formatCurrency(subtotal);
        if (modalDiscount) modalDiscount.textContent = formatCurrency(discount);
        var modalTaxEl = document.getElementById('modalTax');
        if (modalTaxEl) modalTaxEl.textContent = tax > 0 ? formatCurrency(tax) : formatCurrency(0);
        if (modalTotal) modalTotal.textContent = formatCurrency(total);
        if (modalItemsPreview) {
            var previewHTML = '';
            for (var i = 0; i < cart.length; i++) {
                var item = cart[i];
                var lineTotal = item.price * item.quantity;
                previewHTML += '' +
                    '<div class="modal-preview-item">' +
                    '    <span class="modal-preview-name">' + item.name + '</span>' +
                    '    <span class="modal-preview-details">' + item.quantity + ' × ' + formatCurrency(item.price) + '</span>' +
                    '    <span class="modal-preview-total">' + formatCurrency(lineTotal) + '</span>' +
                    '</div>';
            }
            modalItemsPreview.innerHTML = previewHTML;
        }
        if (modalPaymentMethod) modalPaymentMethod.value = 'Cash';
        if (modalAccountHolderName) modalAccountHolderName.value = '';
        if (modalReferenceNumber) modalReferenceNumber.value = '';
        updatePaymentFields();
        if (modalPaymentAmount) modalPaymentAmount.value = '';
        if (modalChangeAmount) modalChangeAmount.textContent = formatCurrency(0);
        modalOverlay.classList.add('active');
        setTimeout(function () {
            if (modalPaymentAmount) modalPaymentAmount.focus();
        }, 300);
    }

    function updatePaymentFields() {
        if (!modalPaymentMethod || !accountHolderField || !referenceNumberField || !modalAccountHolderName || !modalReferenceNumber) return;
        var method = modalPaymentMethod.value;
        var isCash = method === 'Cash';
        var isGcash = method === 'GCash';
        accountHolderField.hidden = isCash || isGcash;
        referenceNumberField.hidden = isCash;
        modalAccountHolderName.required = !isCash && !isGcash;
        modalReferenceNumber.required = !isCash;
        var refLabel = document.querySelector('#referenceNumberField label');
        if (refLabel) refLabel.textContent = isGcash ? 'GCash Reference Number' : 'Reference Number';
    }
    function closeModal() {
        if (modalOverlay) modalOverlay.classList.remove('active');
    }
    function calculateChange() {
        if (!modalPaymentAmount || !modalChangeAmount) return;
        var total = getFinalTotal();
        var payment = parseFloat(modalPaymentAmount.value) || 0;
        var change = payment - total;

        if (change >= 0) {
            modalChangeAmount.textContent = formatCurrency(change);
            modalChangeAmount.style.color = '';
        } else {
            modalChangeAmount.textContent = formatCurrency(Math.abs(change)) + ' short';
            modalChangeAmount.style.color = '#e63946';
        }
    }
    function confirmSale() {
        try {
            if (!modalPaymentMethod) {
                showNotification('Checkout modal elements not found. Please refresh.', 'error');
                return;
            }
            var total = getFinalTotal();
            var grossTotal = getCartTotal();
            var currentDiscount = Math.min(getCartDiscount(), grossTotal);
            var taxRate = Number(getSystemSettings().taxRate) || 0;
            var currentTax = (grossTotal - currentDiscount) * taxRate / 100;
            var subtotal = grossTotal - currentDiscount;
            var paymentMethod = modalPaymentMethod.value;
            var accountHolderName = (modalAccountHolderName && modalAccountHolderName.value) ? modalAccountHolderName.value.trim() : '';
            var referenceNumber = (modalReferenceNumber && modalReferenceNumber.value) ? modalReferenceNumber.value.trim() : '';
            var payment = parseFloat((modalPaymentAmount && modalPaymentAmount.value) || '0') || 0;
            var isCash = paymentMethod === 'Cash';
            var isGcash = paymentMethod === 'GCash';
            if (!isCash && !isGcash && !accountHolderName) {
                showNotification('Please enter the account holder name', 'error');
                if (modalAccountHolderName) modalAccountHolderName.focus();
                return;
            }
            if (!isCash && !referenceNumber) {
                showNotification('Please enter the payment reference number', 'error');
                if (modalReferenceNumber) modalReferenceNumber.focus();
                return;
            }
            if (payment === 0) {
                showNotification('Please enter a payment amount', 'error');
                if (modalPaymentAmount) modalPaymentAmount.focus();
                return;
            }
            if (payment < total) {
                showNotification('Payment is short by ' + formatCurrency(total - payment), 'error');
                if (modalPaymentAmount) modalPaymentAmount.focus();
                return;
            }
            var session = getSession();
            var compactItems = [];
            for (var ci = 0; ci < cart.length; ci++) {
                var src = cart[ci];
                compactItems.push({
                    id: src.id,
                    name: src.name,
                    category: src.category,
                    subcategory: src.subcategory,
                    price: src.price,
                    quantity: src.quantity,
                    stock: src.stock
                });
            }
            var itemsSnapshot = JSON.parse(JSON.stringify(compactItems));

            var tx = {
                id: receiptId,
                date: getCurrentDateTime(),
                timestamp: Date.now(),
                userId: session ? session.userId : null,
                username: session ? session.username : '',
                cashierId: session ? session.cashierId : '',
                cashierName: session ? session.fullname : '',
                items: itemsSnapshot,
                itemCount: getCartItemCount(),
                subtotal: subtotal,
                discount: currentDiscount,
                tax: currentTax,
                total: total,
                payment: payment,
                paymentMethod: paymentMethod,
                accountHolderName: accountHolderName,
                referenceNumber: referenceNumber,
                change: payment - total,
                type: currentTxType,
                status: 'Completed'
            };
            try {
                addTransaction(tx);
            } catch (writeErr) {
                if (writeErr && writeErr.name === 'QuotaExceededError') {
                    return;
                }
                throw writeErr;
            }
            deductProductStock(cart);
            updateStats();
            renderProducts();
            cart = [];
            discount = 0;
            resetTxType();
            updateReceiptId();
            updateCartUI();
            closeModal();
            showReceiptModal(tx);

            showNotification('Sale completed! Change: ' + formatCurrency(payment - total), 'success');
        } catch (e) {
            console.error(e);
            if (e && e.name !== 'QuotaExceededError') {
                showNotification('Unable to confirm sale: ' + (e.message || 'Unexpected error'), 'error');
            }
        }
    }

    var refundModalOverlay, refundModalClose, refundCancelBtn, refundConfirmBtn;
    var refundReceiptCode, refundLookupBtn, refundTxInfo, refundTxIdShow, refundTxCashier, refundTxDate;
    var refundProductSelect, refundProductInfo, refundProductPrice, refundProductTxQty;
    var refundQty, refundReason, refundAmountDisplay;
    var refundCurrentTx = null;
    var refundCurrentItemIndex = -1;

    function cacheRefundModalElements() {
        refundModalOverlay = document.getElementById('refundModalOverlay');
        refundModalClose = document.getElementById('refundModalClose');
        refundCancelBtn = document.getElementById('refundCancelBtn');
        refundConfirmBtn = document.getElementById('refundConfirmBtn');
        refundReceiptCode = document.getElementById('refundReceiptCode');
        refundLookupBtn = document.getElementById('refundLookupBtn');
        refundTxInfo = document.getElementById('refundTxInfo');
        refundTxIdShow = document.getElementById('refundTxIdShow');
        refundTxCashier = document.getElementById('refundTxCashier');
        refundTxDate = document.getElementById('refundTxDate');
        refundProductSelect = document.getElementById('refundProductSelect');
        refundProductInfo = document.getElementById('refundProductInfo');
        refundProductPrice = document.getElementById('refundProductPrice');
        refundProductTxQty = document.getElementById('refundProductTxQty');
        refundQty = document.getElementById('refundQty');
        refundReason = document.getElementById('refundReason');
        refundAmountDisplay = document.getElementById('refundAmountDisplay');
    }

    function resetRefundModal() {
        if (refundReceiptCode) refundReceiptCode.value = '';
        if (refundTxInfo) refundTxInfo.style.display = 'none';
        if (refundProductSelect) {
            refundProductSelect.innerHTML = '<option value="">-- Select product after lookup --</option>';
            refundProductSelect.disabled = true;
        }
        if (refundProductInfo) refundProductInfo.style.display = 'none';
        if (refundQty) { refundQty.value = 1; refundQty.disabled = true; }
        if (refundReason) refundReason.value = 'Defective Item';
        if (refundAmountDisplay) refundAmountDisplay.textContent = formatCurrency(0);
        if (refundConfirmBtn) refundConfirmBtn.disabled = true;
        refundCurrentTx = null;
        refundCurrentItemIndex = -1;
    }

    function openRefundModal() {
        resetRefundModal();
        if (refundModalOverlay) refundModalOverlay.classList.add('active');
        setTimeout(function () { if (refundReceiptCode) refundReceiptCode.focus(); }, 300);
    }

    function closeRefundModal() {
        if (refundModalOverlay) refundModalOverlay.classList.remove('active');
        resetRefundModal();
    }

    function lookupRefundTransaction() {
        var code = (refundReceiptCode ? refundReceiptCode.value.trim() : '').replace(/^#/, '');
        if (!code) {
            showNotification('Please enter a receipt/transaction code', 'error');
            return;
        }
        var allTx = getTransactions();
        var found = allTx.find(function (t) { return String(t.id) === code || String(t.id).replace(/^#/, '') === code; });
        if (!found) {
            showNotification('Transaction not found: ' + code, 'error');
            return;
        }
        refundCurrentTx = JSON.parse(JSON.stringify(found));
        refundTxIdShow.textContent = refundCurrentTx.id;
        refundTxCashier.textContent = refundCurrentTx.cashierName || refundCurrentTx.cashier || refundCurrentTx.username || '--';
        refundTxDate.textContent = refundCurrentTx.date || '--';
        refundTxInfo.style.display = 'block';

        var items = refundCurrentTx.items || [];
        var options = '<option value="">-- Select a product to refund --</option>';
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            if (it.refunded) continue;
            options += '<option value="' + i + '">' + (it.name || 'Item') + ' (Qty: ' + (it.quantity || 1) + ', ' + formatCurrency(it.price || 0) + ')</option>';
        }
        refundProductSelect.innerHTML = options;
        refundProductSelect.disabled = (items.filter(function (x) { return !x.refunded; }).length === 0);
        if (refundProductSelect.disabled) {
            showNotification('All items in this transaction have already been refunded', 'info');
        }
        refundProductInfo.style.display = 'none';
        refundQty.disabled = true;
        refundQty.value = 1;
        refundConfirmBtn.disabled = true;
        refundCurrentItemIndex = -1;
        updateRefundAmount();
    }

    function onRefundProductChange() {
        if (!refundCurrentTx || !refundProductSelect) return;
        var idx = Number(refundProductSelect.value);
        if (isNaN(idx) || idx < 0) {
            refundProductInfo.style.display = 'none';
            refundQty.disabled = true;
            refundConfirmBtn.disabled = true;
            refundCurrentItemIndex = -1;
            return;
        }
        refundCurrentItemIndex = idx;
        var it = refundCurrentTx.items[idx];
        if (!it) return;
        refundProductPrice.textContent = formatCurrency(Number(it.price) || 0);
        refundProductTxQty.textContent = it.quantity || 1;
        refundProductInfo.style.display = 'block';
        refundQty.max = it.quantity || 1;
        refundQty.value = Math.min(1, it.quantity || 1);
        refundQty.disabled = false;
        refundConfirmBtn.disabled = false;
        updateRefundAmount();
    }

    function updateRefundAmount() {
        if (!refundCurrentTx || refundCurrentItemIndex < 0) {
            if (refundAmountDisplay) refundAmountDisplay.textContent = formatCurrency(0);
            return;
        }
        var it = refundCurrentTx.items[refundCurrentItemIndex];
        var qty = Math.max(1, Math.min(Number(refundQty ? refundQty.value : 1) || 1, Number(it.quantity) || 1));
        var amt = (Number(it.price) || 0) * qty;
        if (refundAmountDisplay) refundAmountDisplay.textContent = formatCurrency(amt);
    }

    function confirmRefund() {
        if (!refundCurrentTx || refundCurrentItemIndex < 0) {
            showNotification('Please select a transaction and product', 'error');
            return;
        }
        var item = refundCurrentTx.items[refundCurrentItemIndex];
        if (!item) {
            showNotification('Product not found in transaction', 'error');
            return;
        }
        var qtyToRefund = Math.max(1, Math.min(Number(refundQty.value) || 1, Number(item.quantity) || 1));
        var reason = refundReason.value || 'Other';
        var price = Number(item.price) || 0;
        var refundAmt = price * qtyToRefund;

        var allTx = getTransactions();
        var txIdx = allTx.findIndex(function (t) { return String(t.id) === String(refundCurrentTx.id); });
        if (txIdx < 0) {
            showNotification('Transaction no longer exists', 'error');
            return;
        }
        var liveTx = allTx[txIdx];
        var liveItem = liveTx.items[refundCurrentItemIndex];
        if (!liveItem) {
            showNotification('Product not found in transaction', 'error');
            return;
        }
        if (liveItem.refunded) {
            showNotification('This item has already been refunded', 'error');
            return;
        }

        if (qtyToRefund >= Number(liveItem.quantity || 1)) {
            liveItem.refunded = true;
            liveItem.refundReason = reason;
            liveItem.refundedAt = Date.now();
            liveItem.refundedBy = getSession() ? getSession().username : '';
            delete liveItem.image;
        } else {
            var keptQty = Number(liveItem.quantity || 1) - qtyToRefund;
            var refundedCopy = {};
            var copyKeys = ['id','name','category','subcategory','price','quantity','stock'];
            for (var rk = 0; rk < copyKeys.length; rk++) {
                if (liveItem.hasOwnProperty(copyKeys[rk])) refundedCopy[copyKeys[rk]] = liveItem[copyKeys[rk]];
            }
            refundedCopy.quantity = qtyToRefund;
            refundedCopy.refunded = true;
            refundedCopy.refundReason = reason;
            refundedCopy.refundedAt = Date.now();
            refundedCopy.refundedBy = getSession() ? getSession().username : '';
            liveItem.quantity = keptQty;
            delete liveItem.image;
            if (!liveTx.items) liveTx.items = [];
            liveTx.items.splice(refundCurrentItemIndex + 1, 0, refundedCopy);
        }

        restoreProductStock([{ id: liveItem.id, quantity: qtyToRefund }]);

        liveTx.refundedAmount = (Number(liveTx.refundedAmount) || 0) + refundAmt;
        liveTx.total = Math.max(0, Number(liveTx.total || 0) - refundAmt);
        var allRefunded = liveTx.items.every(function (it2) { return !!it2.refunded; }) && liveTx.items.length > 0;
        liveTx.status = allRefunded ? 'Refunded' : (liveTx.refundedAmount > 0 ? 'Partially Refunded' : 'Completed');

        allTx[txIdx] = liveTx;
        saveTransactions(allTx);

        updateStats();
        renderProducts();
        showNotification('Refund successful: ' + formatCurrency(refundAmt) + ' (' + reason + ')', 'success');
        closeRefundModal();
    }
    function updateStats() {
        var txs = getTransactions();
        var salesCountEl = document.getElementById('salesTransactionCount');
        if (salesCountEl) salesCountEl.textContent = txs.length;
        var allProducts = getProducts();
        var totalStock = 0;
        for (var i = 0; i < allProducts.length; i++) {
            totalStock += Number(allProducts[i].stock) || 0;
        }
        var availableCountEl = document.getElementById('availableCount');
        if (availableCountEl) availableCountEl.textContent = totalStock;
        var productCountEl = document.getElementById('productCount');
        if (productCountEl) productCountEl.textContent = allProducts.length;
    }
    function updateCartUI() {
        var itemCount = getCartItemCount();
        var total = getCartTotal();

        if (cartCount) cartCount.textContent = itemCount + ' items';
        if (cartItemCount) cartItemCount.textContent = itemCount;
        if (cartItemsContainer) {
            if (cart.length === 0) {
                cartItemsContainer.innerHTML = '<div class="empty-cart-message">No items in cart</div>';
            } else {
            var cartHTML = '';
            for (var i = 0; i < cart.length; i++) {
                var item = cart[i];
                cartHTML += '' +
                    '<div class="pos-cart-item" data-id="' + item.id + '">' +
                    '    <div class="cart-item-info">' +
                    '        <span class="cart-item-name">' + item.name + '</span>' +
                    '        <span class="cart-item-category">' + item.category + '</span>' +
                    '    </div>' +
                    '    <div class="cart-item-details">' +
                    '        <div class="cart-item-controls">' +
                    '            <button class="cart-qty-btn minus-btn" data-id="' + item.id + '">−</button>' +
                    '            <span class="cart-item-qty">×' + item.quantity + '</span>' +
                    '            <button class="cart-qty-btn plus-btn" data-id="' + item.id + '">+</button>' +
                    '        </div>' +
                    '        <span class="cart-item-price">' + formatCurrency(item.price * item.quantity) + '</span>' +
                    '        <button class="cart-remove-btn" data-id="' + item.id + '">✕</button>' +
                    '    </div>' +
                    '</div>';
            }
            cartItemsContainer.innerHTML = cartHTML;
            var minusBtns = document.querySelectorAll('.minus-btn');
            for (var m = 0; m < minusBtns.length; m++) {
                minusBtns[m].addEventListener('click', function () {
                    var id = String(this.dataset.id);
                    removeFromCart(id);
                });
            }

            var plusBtns = document.querySelectorAll('.plus-btn');
            for (var p = 0; p < plusBtns.length; p++) {
                plusBtns[p].addEventListener('click', function () {
                    var id = String(this.dataset.id);
                    var liveProduct = getProductById(id);
                    if (liveProduct) {
                        addToCart(liveProduct);
                    }
                });
            }

            var removeBtns = document.querySelectorAll('.cart-remove-btn');
            for (var r = 0; r < removeBtns.length; r++) {
                removeBtns[r].addEventListener('click', function () {
                    var id = String(this.dataset.id);
                    var newCart = [];
                    for (var i2 = 0; i2 < cart.length; i2++) {
                        if (String(cart[i2].id) !== id) {
                            newCart.push(cart[i2]);
                        }
                    }
                    cart = newCart;
                    updateCartUI();
                    showNotification('Item removed from cart', 'info');
                });
            }
            }
        }
        updateReceiptUI();
        publishCustomerDisplay();
    }
    function updateReceiptUI() {
        var total = getFinalTotal();
        var subtotal = total + discount - tax;
        if (cart.length === 0) {
            receiptItemsContainer.innerHTML = '<div class="empty-cart-message">No items in receipt</div>';
        } else {
            var receiptHTML = '';
            for (var i = 0; i < cart.length; i++) {
                var it = cart[i];
                receiptHTML += '' +
                    '<div class="receipt-item">' +
                    '    <div class="receipt-item-info">' +
                    '        <span class="receipt-item-name">' + it.name + '</span>' +
                    '        <span class="receipt-item-category">' + it.category + '</span>' +
                    '    </div>' +
                    '    <div class="receipt-item-details">' +
                    '        <div class="receipt-qty-stepper">' +
                    '            <button type="button" class="receipt-qty-btn receipt-qty-minus" data-id="' + it.id + '" aria-label="Decrease quantity for ' + it.name + '">&minus;</button>' +
                    '            <input class="receipt-qty-input" type="number" min="1" max="' + (Number(it.stock) || 1) + '" value="' + it.quantity + '" data-id="' + it.id + '" aria-label="Quantity for ' + it.name + '">' +
                    '            <button type="button" class="receipt-qty-btn receipt-qty-plus" data-id="' + it.id + '" aria-label="Increase quantity for ' + it.name + '">+</button>' +
                    '        </div>' +
                    '        <span class="receipt-item-price">' + formatCurrency(it.price * it.quantity) + '</span>' +
                    '        <button type="button" class="receipt-remove-btn" data-id="' + it.id + '" aria-label="Remove ' + it.name + '">&times;</button>' +
                    '    </div>' +
                    '</div>';
            }
            receiptItemsContainer.innerHTML = receiptHTML;
            receiptItemsContainer.querySelectorAll('.receipt-qty-input').forEach(function (input) {
                input.addEventListener('change', function () {
                    var id = String(this.dataset.id);
                    var item = cart.find(function (entry) { return String(entry.id) === id; });
                    var nextQuantity = Math.floor(Number(this.value));
                    if (!item) return;
                    if (!isFinite(nextQuantity) || nextQuantity < 1) nextQuantity = 1;
                    if (nextQuantity > item.stock) nextQuantity = item.stock;
                    item.quantity = nextQuantity;
                    updateCartUI();
                });
            });
            receiptItemsContainer.querySelectorAll('.receipt-qty-minus').forEach(function (button) {
                button.addEventListener('click', function () {
                    var id = String(this.dataset.id);
                    var index = -1;
                    for (var qi = 0; qi < cart.length; qi++) {
                        if (String(cart[qi].id) === id) { index = qi; break; }
                    }
                    if (index === -1) return;
                    if (cart[index].quantity > 1) {
                        cart[index].quantity -= 1;
                        updateCartUI();
                    } else {
                        cart.splice(index, 1);
                        updateCartUI();
                        showNotification('Item removed from cart', 'info');
                    }
                });
            });
            receiptItemsContainer.querySelectorAll('.receipt-qty-plus').forEach(function (button) {
                button.addEventListener('click', function () {
                    var id = String(this.dataset.id);
                    var item = cart.find(function (entry) { return String(entry.id) === id; });
                    if (!item) return;
                    var maxQty = Number(item.stock) || 0;
                    if (item.quantity + 1 > maxQty) {
                        showNotification('Not enough stock for "' + item.name + '" (only ' + maxQty + ' left)', 'error');
                        return;
                    }
                    item.quantity += 1;
                    updateCartUI();
                });
            });
            receiptItemsContainer.querySelectorAll('.receipt-remove-btn').forEach(function (button) {
                button.addEventListener('click', function () {
                    var id = String(this.dataset.id);
                    cart = cart.filter(function (entry) { return String(entry.id) !== id; });
                    updateCartUI();
                });
            });
        }
        subtotalDisplay.textContent = formatCurrency(subtotal);
        var taxDisplay = document.getElementById('taxDisplay');
        if (taxDisplay) taxDisplay.textContent = formatCurrency(tax);
        totalDisplay.textContent = formatCurrency(total);
        if (discount > 0) {
            discountDisplay.textContent = '₱' + discount.toFixed(2) + ' off';
        } else {
            discountDisplay.textContent = 'From: None';
        }
        if (receiptDateDisplay) receiptDateDisplay.textContent = getCurrentDateTime();
    }
    function updateReceiptId() {
        receiptId = generateReceiptId(currentSession && (currentSession.cashierId || currentSession.username));
        if (receiptIdDisplay) receiptIdDisplay.textContent = 'ID: ' + receiptId;
    }
    function bindTxTypeTabs() {
        var txTypeTabs = document.querySelectorAll('#txTypeTabs .tx-type-tab');
        for (var i = 0; i < txTypeTabs.length; i++) {
            txTypeTabs[i].addEventListener('click', function () {
                currentTxType = this.dataset.txtype || 'Purchase';
                var allTabs = document.querySelectorAll('#txTypeTabs .tx-type-tab');
                for (var j = 0; j < allTabs.length; j++) {
                    allTabs[j].classList.toggle('active', allTabs[j] === this);
                }
                showNotification('Transaction type set to: ' + currentTxType, 'info');
            });
        }
    }
    function resetTxType() {
        currentTxType = 'Purchase';
        var allTabs = document.querySelectorAll('#txTypeTabs .tx-type-tab');
        for (var j = 0; j < allTabs.length; j++) {
            allTabs[j].classList.toggle('active', (allTabs[j].dataset.txtype || 'Purchase') === 'Purchase');
        }
    }
    function bindEvents() {
        var scannerBuffer = '';
        var lastScannerKeyAt = 0;
        var lastScannerCharacter = '';
        document.addEventListener('keydown', function (e) {
            var now = Date.now();
            var isSearchField = e.target === searchInput;
            var isScannerCharacter = e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey;
            if (isScannerCharacter && now - lastScannerKeyAt < 100) {
                if (!scannerBuffer) scannerBuffer = lastScannerCharacter;
                if (isSearchField) searchInput.value = '';
                scannerBuffer += e.key;
                e.preventDefault();
                lastScannerKeyAt = now;
                lastScannerCharacter = e.key;
                return;
            }
            if (e.key === 'Enter' && scannerBuffer) {
                e.preventDefault();
                var scannedId = scannerBuffer;
                scannerBuffer = '';
                lastScannerKeyAt = 0;
                lastScannerCharacter = '';
                var scannedProduct = getProductById(scannedId);
                if (scannedProduct) {
                    addToCart(scannedProduct);
                } else {
                    showNotification('No product found for barcode ' + scannedId, 'error');
                }
                return;
            }
            if (now - lastScannerKeyAt >= 1000) scannerBuffer = '';
            lastScannerKeyAt = now;
            if (isScannerCharacter) lastScannerCharacter = e.key;
        }, true);
        for (var t = 0; t < categoryTabs.length; t++) {
            categoryTabs[t].addEventListener('click', function () {
                currentCategory = this.dataset.category;
                updateCategoryTabs();
                renderProducts();
            });
        }
        if (searchInput) searchInput.addEventListener('input', function () {
            searchQuery = this.value;
            renderProducts();
        });
        if (searchBtn) searchBtn.addEventListener('click', function (e) {
            e.preventDefault();
            searchQuery = searchInput.value;
            renderProducts();
        });
        if (searchInput) searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchQuery = this.value;
                renderProducts();
            }
        });
        if (clearCartBtn) clearCartBtn.addEventListener('click', clearCart);
        if (customerScreenBtn) customerScreenBtn.addEventListener('click', openCustomerScreen);
        if (completeSaleBtn) completeSaleBtn.addEventListener('click', openCheckoutModal);
        if (modalClose) modalClose.addEventListener('click', closeModal);
        if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                if (modalOverlay && modalOverlay.classList.contains('active')) closeModal();
                if (refundModalOverlay && refundModalOverlay.classList.contains('active')) closeRefundModal();
                var receiptOverlayEsc = document.getElementById('receiptModalOverlay');
                if (receiptOverlayEsc && receiptOverlayEsc.classList.contains('active')) closeReceiptModal();
            }
        });
        if (modalPaymentAmount) modalPaymentAmount.addEventListener('input', calculateChange);
        if (modalPaymentMethod) modalPaymentMethod.addEventListener('change', updatePaymentFields);
        if (modalConfirmBtn) modalConfirmBtn.addEventListener('click', confirmSale);
        if (modalPaymentAmount) modalPaymentAmount.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmSale();
            }
        });

        var refundBtn = document.getElementById('refundBtn');
        if (refundBtn) refundBtn.addEventListener('click', openRefundModal);
        if (refundModalClose) refundModalClose.addEventListener('click', closeRefundModal);
        if (refundCancelBtn) refundCancelBtn.addEventListener('click', closeRefundModal);
        if (refundLookupBtn) refundLookupBtn.addEventListener('click', lookupRefundTransaction);
        if (refundReceiptCode) refundReceiptCode.addEventListener('keypress', function (e) { if (e.key === 'Enter') { e.preventDefault(); lookupRefundTransaction(); } });
        if (refundProductSelect) refundProductSelect.addEventListener('change', onRefundProductChange);
        if (refundQty) refundQty.addEventListener('input', updateRefundAmount);
        if (refundConfirmBtn) refundConfirmBtn.addEventListener('click', confirmRefund);

        var remitBtnEl = document.getElementById('remitBtn');
        if (remitBtnEl) remitBtnEl.addEventListener('click', openRemitModal);
        var remitCloseEl = document.getElementById('remitModalClose');
        if (remitCloseEl) remitCloseEl.addEventListener('click', closeRemitModal);
        var remitCancelEl = document.getElementById('remitCancelBtn');
        if (remitCancelEl) remitCancelEl.addEventListener('click', closeRemitModal);
        var remitConfirmEl = document.getElementById('remitConfirmBtn');
        if (remitConfirmEl) remitConfirmEl.addEventListener('click', confirmRemit);
        var remitAmountEl = document.getElementById('remitAmount');
        if (remitAmountEl) remitAmountEl.addEventListener('input', updateRemitDiff);

        var receiptCloseBtnEl = document.getElementById('receiptCloseBtn');
        if (receiptCloseBtnEl) receiptCloseBtnEl.addEventListener('click', closeReceiptModal);
        var receiptDoneBtnEl = document.getElementById('receiptDoneBtn');
        if (receiptDoneBtnEl) receiptDoneBtnEl.addEventListener('click', closeReceiptModal);
        var receiptExportBtnEl = document.getElementById('receiptExportBtn');
        if (receiptExportBtnEl) receiptExportBtnEl.addEventListener('click', exportReceiptPdf);
        var receiptPrintBtnEl = document.getElementById('receiptPrintBtn');
        if (receiptPrintBtnEl) receiptPrintBtnEl.addEventListener('click', printReceipt);

        bindBackForwardGuard();
        bindScanRelayListener();
    }

    function openRemitModal() {
        var session = typeof getSession === 'function' ? getSession() : null;
        var cashierName = session ? (session.fullname || session.username || 'Cashier') : 'Cashier';
        var txList = typeof getUnremittedCashTransactions === 'function' ? getUnremittedCashTransactions(cashierName) : [];
        var tbody = document.getElementById('remitTxTbody');
        var expected = 0;
        var rows = '';
        for (var i = 0; i < txList.length; i++) {
            var tx = txList[i];
            var amt = Number(tx.total) || 0;
            expected += amt;
            var money = typeof formatCurrency === 'function' ? formatCurrency(amt) : 'P' + amt.toFixed(2);
            rows += '<tr><td>' + (tx.id || tx.receiptId || 'TX') + '</td><td>' + (tx.date || '') + '</td><td style="text-align:right;">' + money + '</td></tr>';
        }
        if (tbody) {
            tbody.innerHTML = rows || '<tr><td colspan="3" style="text-align:center; padding:1rem; color:var(--color-text-tertiary);">No un-remitted cash sales</td></tr>';
        }
        var expEl = document.getElementById('remitExpected');
        if (expEl) {
            expEl.textContent = typeof formatCurrency === 'function' ? formatCurrency(expected) : 'P' + expected.toFixed(2);
        }
        var countEl = document.getElementById('remitTxCount');
        if (countEl) countEl.textContent = String(txList.length);
        var amountEl = document.getElementById('remitAmount');
        if (amountEl) amountEl.value = '';
        var remitModalOverlay = document.getElementById('remitModalOverlay');
        if (remitModalOverlay) {
            remitModalOverlay.dataset.expected = String(expected);
            remitModalOverlay.dataset.txIds = JSON.stringify(txList.map(function (t) { return String(t.id || t.receiptId || ''); }));
            remitModalOverlay.classList.add('active');
        }
        updateRemitDiff();
    }
    function updateRemitDiff() {
        var overlay = document.getElementById('remitModalOverlay');
        var amountEl = document.getElementById('remitAmount');
        var diffEl = document.getElementById('remitDiff');
        if (!overlay || !amountEl || !diffEl) return;
        var expected = Number(overlay.dataset.expected) || 0;
        var remitted = parseFloat(amountEl.value) || 0;
        var diff = remitted - expected;
        var money = function (v) { return typeof formatCurrency === 'function' ? formatCurrency(Math.abs(v)) : 'P' + Math.abs(v).toFixed(2); };
        if (!amountEl.value) { diffEl.textContent = '—'; diffEl.style.color = ''; return; }
        if (diff === 0) { diffEl.textContent = 'Exact — ' + money(remitted); diffEl.style.color = '#81c784'; }
        else if (diff > 0) { diffEl.textContent = 'Over by ' + money(diff); diffEl.style.color = '#4fc3f7'; }
        else { diffEl.textContent = 'Short by ' + money(diff); diffEl.style.color = '#e63946'; }
    }
    function confirmRemit() {
        var overlay = document.getElementById('remitModalOverlay');
        var amountEl = document.getElementById('remitAmount');
        var session = typeof getSession === 'function' ? getSession() : null;
        if (!overlay || !amountEl) return;
        var expected = Number(overlay.dataset.expected) || 0;
        var remitted = parseFloat(amountEl.value) || 0;
        if (remitted <= 0) {
            showNotification('Enter the remitted amount.', 'error');
            return;
        }
        var txIds = [];
        try { txIds = JSON.parse(overlay.dataset.txIds || '[]'); } catch (e) { txIds = []; }
        var diff = remitted - expected;
        var record = {
            cashier: session ? (session.fullname || session.username || 'Cashier') : 'Cashier',
            cashierId: session ? (session.cashierId || session.username || '') : '',
            expected: expected,
            remitted: remitted,
            difference: diff,
            status: diff === 0 ? 'exact' : (diff > 0 ? 'over' : 'short'),
            txCount: txIds.length,
            txIds: txIds,
            date: typeof getCurrentDateTime === 'function' ? getCurrentDateTime() : new Date().toLocaleString()
        };
        if (typeof addRemittance === 'function') addRemittance(record);
        var money = function (v) { return typeof formatCurrency === 'function' ? formatCurrency(Math.abs(v)) : 'P' + Math.abs(v).toFixed(2); };
        if (diff === 0) showNotification('Remittance recorded — exact.', 'success');
        else if (diff > 0) showNotification('Remittance recorded — over by ' + money(diff) + '.', 'success');
        else showNotification('Remittance recorded — short by ' + money(diff) + '.', 'error');
        closeRemitModal();
    }
    function closeRemitModal() {
        var overlay = document.getElementById('remitModalOverlay');
        if (overlay) overlay.classList.remove('active');
    }

    var lastReceiptTx = null;
    function showReceiptModal(tx) {
        lastReceiptTx = tx || null;
        if (!tx) return;
        var storeEl = document.getElementById('receiptStoreName');
        var noEl = document.getElementById('receiptNo');
        var dtEl = document.getElementById('receiptDateTime');
        var cashierEl = document.getElementById('receiptCashier');
        var itemsEl = document.getElementById('receiptItemsList');
        var totalsEl = document.getElementById('receiptTotals');
        var payEl = document.getElementById('receiptPaymentInfo');
        var money = function (v) { return typeof formatCurrency === 'function' ? formatCurrency(Number(v) || 0) : 'P' + (Number(v) || 0).toFixed(2); };
        if (storeEl) storeEl.textContent = (typeof getSystemSettings === 'function' && getSystemSettings().storeName) ? getSystemSettings().storeName : 'nightbaby';
        if (noEl) noEl.textContent = 'Receipt #: ' + (tx.id || tx.receiptId || '—');
        if (dtEl) dtEl.textContent = tx.date || '';
        if (cashierEl) cashierEl.textContent = 'Cashier: ' + (tx.cashierName || tx.cashier || tx.username || '—');
        if (itemsEl) {
            var rows = '';
            var items = tx.items || [];
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                var qty = Number(it.quantity || it.qty || 1) || 1;
                var lineTotal = Number(it.total || it.subtotal) || (Number(it.price) || 0) * qty;
                rows += '<div class="receipt-item-row">' +
                    '<span class="receipt-item-name">' + (it.name || it.productName || 'Item') + '</span>' +
                    '<span class="receipt-item-qty">x' + qty + '</span>' +
                    '<span class="receipt-item-amount">' + money(lineTotal) + '</span>' +
                    '</div>';
            }
            itemsEl.innerHTML = rows || '<div class="receipt-item-row"><span class="receipt-item-name">No items</span></div>';
        }
        if (totalsEl) {
            totalsEl.innerHTML =
                '<div class="receipt-total-row"><span>Subtotal</span><span>' + money(tx.subtotal) + '</span></div>' +
                '<div class="receipt-total-row"><span>Discount</span><span>-' + money(tx.discount) + '</span></div>' +
                '<div class="receipt-total-row"><span>Tax</span><span>' + money(tx.tax) + '</span></div>' +
                '<div class="receipt-total-row receipt-grand"><span>Total</span><span>' + money(tx.total) + '</span></div>';
        }
        if (payEl) {
            var p =
                '<div class="receipt-total-row"><span>Payment Method</span><span>' + (tx.paymentMethod || '—') + '</span></div>' +
                '<div class="receipt-total-row"><span>Payment</span><span>' + money(tx.payment) + '</span></div>' +
                '<div class="receipt-total-row"><span>Change</span><span>' + money(tx.change) + '</span></div>';
            if (tx.referenceNumber) p += '<div class="receipt-total-row"><span>Ref No.</span><span>' + tx.referenceNumber + '</span></div>';
            payEl.innerHTML = p;
        }
        var overlay = document.getElementById('receiptModalOverlay');
        if (overlay) overlay.classList.add('active');
    }
    function closeReceiptModal() {
        var overlay = document.getElementById('receiptModalOverlay');
        if (overlay) overlay.classList.remove('active');
        lastReceiptTx = null;
    }
    function buildReceiptLines() {
        var tx = lastReceiptTx;
        if (!tx) return [];
        var money = function (v) { return typeof formatCurrency === 'function' ? formatCurrency(Number(v) || 0) : 'P' + (Number(v) || 0).toFixed(2); };
        var lines = [];
        var storeName = (typeof getSystemSettings === 'function' && getSystemSettings().storeName) ? getSystemSettings().storeName : 'nightbaby';
        lines.push({ text: storeName.toUpperCase(), size: 14, align: 'center' });
        lines.push({ text: 'Receipt #: ' + (tx.id || tx.receiptId || '—'), size: 9, align: 'center' });
        lines.push({ text: String(tx.date || ''), size: 9, align: 'center' });
        lines.push({ text: 'Cashier: ' + (tx.cashierName || tx.cashier || tx.username || '—'), size: 9, align: 'center' });
        lines.push({ text: '--------------------------------', size: 9, align: 'center' });
        var items = tx.items || [];
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            var qty = Number(it.quantity || it.qty || 1) || 1;
            var lineTotal = Number(it.total || it.subtotal) || (Number(it.price) || 0) * qty;
            lines.push({ text: (it.name || it.productName || 'Item').slice(0, 22), size: 9, align: 'left' });
            lines.push({ text: '  x' + qty + ' @ ' + money(Number(it.price) || 0) + ' = ' + money(lineTotal), size: 9, align: 'left' });
        }
        lines.push({ text: '--------------------------------', size: 9, align: 'center' });
        lines.push({ text: 'Subtotal: ' + money(tx.subtotal), size: 9, align: 'left' });
        lines.push({ text: 'Discount: -' + money(tx.discount), size: 9, align: 'left' });
        lines.push({ text: 'Tax: ' + money(tx.tax), size: 9, align: 'left' });
        lines.push({ text: 'TOTAL: ' + money(tx.total), size: 11, align: 'left' });
        lines.push({ text: 'Payment (' + (tx.paymentMethod || '—') + '): ' + money(tx.payment), size: 9, align: 'left' });
        lines.push({ text: 'Change: ' + money(tx.change), size: 9, align: 'left' });
        if (tx.referenceNumber) lines.push({ text: 'Ref No.: ' + tx.referenceNumber, size: 9, align: 'left' });
        lines.push({ text: '--------------------------------', size: 9, align: 'center' });
        lines.push({ text: 'Thank you for shopping!', size: 9, align: 'center' });
        return lines;
    }
    function buildReceiptCanvas(lines) {
        var pxPerMm = 8;
        var yMm = 10;
        var positions = [];
        for (var i = 0; i < lines.length; i++) {
            positions.push(yMm);
            yMm += (lines[i].size >= 11 ? 6 : 4.6);
        }
        var heightMm = yMm + 6;
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(80 * pxPerMm);
        canvas.height = Math.round(heightMm * pxPerMm);
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#111111';
        ctx.textBaseline = 'alphabetic';
        for (var j = 0; j < lines.length; j++) {
            var ln = lines[j];
            var sizePx = Math.round((ln.size || 9) * (25.4 / 72) * pxPerMm * 10) / 10;
            ctx.font = (ln.size >= 11 ? 'bold ' : '') + sizePx + 'px Consolas, Monaco, monospace';
            var baseline = Math.round(positions[j] * pxPerMm);
            if (ln.align === 'center') {
                ctx.textAlign = 'center';
                ctx.fillText(ln.text, Math.round(40 * pxPerMm), baseline);
            } else {
                ctx.textAlign = 'left';
                ctx.fillText(ln.text, Math.round(4 * pxPerMm), baseline);
            }
        }
        return { canvas: canvas, heightMm: heightMm };
    }
    function exportReceiptPdf() {
        var tx = lastReceiptTx;
        if (!tx) { showNotification('No receipt to export.', 'error'); return; }
        var JsPdfCtor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : null;
        if (!JsPdfCtor) { showNotification('PDF library not loaded.', 'error'); return; }
        try {
            var doc = new JsPdfCtor({ orientation: 'portrait', unit: 'mm', format: [80, 297] });
            var lines = buildReceiptLines();
            var rendered = buildReceiptCanvas(lines);
            var dataUrl = rendered.canvas.toDataURL('image/png');
            doc.addImage(dataUrl, 'PNG', 0, 0, 80, rendered.heightMm);
            doc.save('receipt-' + (tx.id || tx.receiptId || 'sale') + '.pdf');
            showNotification('Receipt PDF downloaded.', 'success');
        } catch (err) {
            showNotification('Failed to export receipt: ' + (err.message || 'error'), 'error');
        }
    }
    function printReceipt() {
        var tx = lastReceiptTx;
        if (!tx) { showNotification('No receipt to print.', 'error'); return; }
        var printWindow = window.open('', '_blank', 'width=420,height=640');
        if (!printWindow) { showNotification('Allow pop-ups to print the receipt.', 'error'); return; }
        var money = function (v) { return typeof formatCurrency === 'function' ? formatCurrency(Number(v) || 0) : 'P' + (Number(v) || 0).toFixed(2); };
        var storeName = (typeof getSystemSettings === 'function' && getSystemSettings().storeName) ? getSystemSettings().storeName : 'nightbaby';
        var itemsHtml = '';
        var items = tx.items || [];
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            var qty = Number(it.quantity || it.qty || 1) || 1;
            var lineTotal = Number(it.total || it.subtotal) || (Number(it.price) || 0) * qty;
            itemsHtml += '<div class="r-row"><span>' + (it.name || it.productName || 'Item').slice(0, 26) + '</span><span>x' + qty + '</span><span>' + money(lineTotal) + '</span></div>';
        }
        printWindow.document.write(
            '<!DOCTYPE html><html><head><title>Receipt ' + (tx.id || '') + '</title><style>' +
            'body{font-family:Consolas,monospace;font-size:11px;margin:8px;width:72mm;color:#000;}' +
            'h1{font-size:15px;text-align:center;margin:4px 0;letter-spacing:1px;}' +
            '.c{text-align:center;margin:2px 0;}' +
            '.r-row{display:flex;justify-content:space-between;gap:6px;margin:2px 0;}' +
            '.r-row span:first-child{flex:1;}' +
            '.hr{border-top:1px dashed #000;margin:6px 0;}' +
            '.tot{display:flex;justify-content:space-between;font-weight:bold;}' +
            '</style></head><body>' +
            '<h1>' + storeName.toUpperCase() + '</h1>' +
            '<div class="c">Receipt #: ' + (tx.id || tx.receiptId || '') + '</div>' +
            '<div class="c">' + (tx.date || '') + '</div>' +
            '<div class="c">Cashier: ' + (tx.cashierName || tx.cashier || '') + '</div>' +
            '<div class="hr"></div>' + itemsHtml + '<div class="hr"></div>' +
            '<div class="r-row"><span>Subtotal</span><span>' + money(tx.subtotal) + '</span></div>' +
            '<div class="r-row"><span>Discount</span><span>-' + money(tx.discount) + '</span></div>' +
            '<div class="r-row"><span>Tax</span><span>' + money(tx.tax) + '</span></div>' +
            '<div class="tot"><span>TOTAL</span><span>' + money(tx.total) + '</span></div>' +
            '<div class="r-row"><span>Payment (' + (tx.paymentMethod || '') + ')</span><span>' + money(tx.payment) + '</span></div>' +
            '<div class="r-row"><span>Change</span><span>' + money(tx.change) + '</span></div>' +
            (tx.referenceNumber ? '<div class="r-row"><span>Ref No.</span><span>' + tx.referenceNumber + '</span></div>' : '') +
            '<div class="hr"></div><div class="c">Thank you for shopping!</div>' +
            '</body></html>'
        );
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    function bindScanRelayListener() {
        var channel = null;
        try { channel = new BroadcastChannel('nb_scanner_relay'); } catch (e) { return; }
        channel.onmessage = function (event) {
            var data = event.data || {};
            if (data.type !== 'scan' || !data.code) return;
            var scannedProduct = getProductById(String(data.code));
            if (scannedProduct) {
                addToCart(scannedProduct);
            } else {
                showNotification('No product found for barcode ' + data.code, 'error');
            }
        };
    }

    function bindBackForwardGuard() {
        try { history.pushState(null, '', location.href); } catch (e) { }
        window.addEventListener('popstate', function () {
            try { history.pushState(null, '', location.href); } catch (e) { }
        });
        ['mouseup', 'auxclick'].forEach(function (type) {
            document.addEventListener(type, function (e) {
                if (e.button === 3 || e.button === 4) e.preventDefault();
            });
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'BrowserBack' || e.key === 'BrowserForward' ||
                (e.altKey && e.key === 'ArrowLeft') || (e.altKey && e.key === 'ArrowRight')) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    }
    async function init() {
        loadProducts();
        createCheckoutModal();
        cacheModalElements();
        cacheRefundModalElements();
        bindEvents();
        bindTxTypeTabs();
        updateReceiptId();
        if (receiptDateDisplay) receiptDateDisplay.textContent = getCurrentDateTime();
        renderProducts();
        updateCartUI();
        updateStats();
    }

    init();
});
