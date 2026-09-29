document.addEventListener('DOMContentLoaded', async function () {
    loginRequired(['cashier', 'it']);
    var currentSession = getSession();
    var cart = [];
    var discount = 0;
    var tax = 0;
    var receiptId = generateReceiptId(currentSession && (currentSession.cashierId || currentSession.username));
    var currentCategory = 'all';
    var searchQuery = '';
    async function loadProducts() {
        var products = getProducts();
        if (products.length === 0) {
            try {
                var response = await fetch('json/products.json');
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                var jsonProducts = await response.json();
                saveProducts(jsonProducts);
                localStorage.setItem('nb_seed_done', '1');
                showNotification('Products loaded from database.', 'success');
            } catch (error) {
                showNotification('Failed to load products: ' + error.message, 'error');
            }
        }
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
        var finalTotal = getFinalTotal();
        var subtotal = finalTotal + discount - tax;
        localStorage.setItem('nb_customer_display', JSON.stringify({
            storeName: getSystemSettings().storeName || 'nightbaby',
            items: JSON.parse(JSON.stringify(cart)),
            itemCount: getCartItemCount(),
            subtotal: subtotal,
            discount: discount,
            tax: tax,
            total: finalTotal,
            updatedAt: Date.now()
        }));
    }

    function openCustomerScreen() {
        var customerWindow = window.open('customer.html', 'nightbabyCustomerDisplay', 'width=1280,height=800');
        if (!customerWindow) {
            showNotification('Allow pop-ups to open the customer display.', 'error');
        }
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
            '                    <option value="PayMaya">PayMaya</option>' +
            '                    <option value="Debit Card">Debit Card</option>' +
            '                    <option value="Credit Card">Credit Card</option>' +
            '                    <option value="Mastercard">Mastercard</option>' +
            '                    <option value="Visa">Visa</option>' +
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

        var total = getFinalTotal();
        var subtotal = total + discount - tax;

        modalItemCount.textContent = getCartItemCount();
        modalSubtotal.textContent = formatCurrency(subtotal);
        modalDiscount.textContent = formatCurrency(discount);
        document.getElementById('modalTax').textContent = tax > 0 ? formatCurrency(tax) : formatCurrency(0);
        modalTotal.textContent = formatCurrency(total);
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
        modalPaymentMethod.value = 'Cash';
        modalAccountHolderName.value = '';
        modalReferenceNumber.value = '';
        updatePaymentFields();
        modalPaymentAmount.value = '';
        modalChangeAmount.textContent = '₱0.00';
        modalOverlay.classList.add('active');
        setTimeout(function () {
            modalPaymentAmount.focus();
        }, 300);
    }

    function updatePaymentFields() {
        var method = modalPaymentMethod.value;
        var isCash = method === 'Cash';
        var isGcash = method === 'GCash';
        accountHolderField.hidden = isCash || isGcash;
        referenceNumberField.hidden = isCash;
        modalAccountHolderName.required = !isCash && !isGcash;
        modalReferenceNumber.required = !isCash;
        document.querySelector('#referenceNumberField label').textContent = isGcash ? 'GCash Reference Number' : 'Reference Number';
    }
    function closeModal() {
        modalOverlay.classList.remove('active');
    }
    function calculateChange() {
            var total = getFinalTotal();
        var payment = parseFloat(modalPaymentAmount.value) || 0;
        var change = payment - total;

        if (change >= 0) {
            modalChangeAmount.textContent = formatCurrency(change);
            modalChangeAmount.style.color = '#81c784';
        } else {
            modalChangeAmount.textContent = formatCurrency(Math.abs(change)) + ' short';
            modalChangeAmount.style.color = '#e63946';
        }
    }
    function confirmSale() {
        var total = getFinalTotal();
        var paymentMethod = modalPaymentMethod.value;
        var accountHolderName = modalAccountHolderName.value.trim();
        var referenceNumber = modalReferenceNumber.value.trim();
        var payment = parseFloat(modalPaymentAmount.value) || 0;
        if (paymentMethod !== 'Cash' && paymentMethod !== 'GCash' && !accountHolderName) {
            showNotification('Please enter the account holder name', 'error');
            modalAccountHolderName.focus();
            return;
        }
        if (paymentMethod !== 'Cash' && !referenceNumber) {
            showNotification('Please enter the payment reference number', 'error');
            modalReferenceNumber.focus();
            return;
        }
        if (payment === 0) {
            showNotification('Please enter a payment amount', 'error');
            modalPaymentAmount.focus();
            return;
        }
        if (payment < total) {
            showNotification('Payment is short by ' + formatCurrency(total - payment), 'error');
            modalPaymentAmount.focus();
            return;
        }
        var session = getSession();
        var subtotal = total + discount - tax;
        var itemsSnapshot = JSON.parse(JSON.stringify(cart));

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
            discount: discount,
            tax: tax,
            total: total,
            payment: payment,
            paymentMethod: paymentMethod,
            accountHolderName: accountHolderName,
            referenceNumber: referenceNumber,
            change: payment - total,
            status: 'Completed'
        };
        addTransaction(tx);
        deductProductStock(cart);
        updateStats();
        renderProducts();
        cart = [];
        discount = 0;
        updateReceiptId();
        updateCartUI();
        closeModal();

        showNotification('Sale completed! Change: ' + formatCurrency(payment - total), 'success');
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

        cartCount.textContent = itemCount + ' items';
        if (cartItemCount) cartItemCount.textContent = itemCount;
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
                    var id = parseInt(this.dataset.id);
                    removeFromCart(id);
                });
            }

            var plusBtns = document.querySelectorAll('.plus-btn');
            for (var p = 0; p < plusBtns.length; p++) {
                plusBtns[p].addEventListener('click', function () {
                    var id = parseInt(this.dataset.id);
                    var liveProduct = getProductById(id);
                    if (liveProduct) {
                        addToCart(liveProduct);
                    }
                });
            }

            var removeBtns = document.querySelectorAll('.cart-remove-btn');
            for (var r = 0; r < removeBtns.length; r++) {
                removeBtns[r].addEventListener('click', function () {
                    var id = parseInt(this.dataset.id);
                    var newCart = [];
                    for (var i2 = 0; i2 < cart.length; i2++) {
                        if (cart[i2].id !== id) {
                            newCart.push(cart[i2]);
                        }
                    }
                    cart = newCart;
                    updateCartUI();
                    showNotification('Item removed from cart', 'info');
                });
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
                    '        <span class="receipt-item-qty">×' + it.quantity + '</span>' +
                    '        <span class="receipt-item-price">' + formatCurrency(it.price * it.quantity) + '</span>' +
                    '    </div>' +
                    '</div>';
            }
            receiptItemsContainer.innerHTML = receiptHTML;
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
        searchInput.addEventListener('input', function () {
            searchQuery = this.value;
            renderProducts();
        });
        searchBtn.addEventListener('click', function (e) {
            e.preventDefault();
            searchQuery = searchInput.value;
            renderProducts();
        });
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchQuery = this.value;
                renderProducts();
            }
        });
        clearCartBtn.addEventListener('click', clearCart);
        customerScreenBtn.addEventListener('click', openCustomerScreen);
        completeSaleBtn.addEventListener('click', openCheckoutModal);
        modalClose.addEventListener('click', closeModal);
        modalCancelBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', function (e) {
            if (e.target === this) closeModal();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
                closeModal();
            }
        });
        modalPaymentAmount.addEventListener('input', calculateChange);
        modalPaymentMethod.addEventListener('change', updatePaymentFields);
        modalConfirmBtn.addEventListener('click', confirmSale);
        modalPaymentAmount.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmSale();
            }
        });
    }
    async function init() {
        await loadProducts();
        createCheckoutModal();
        cacheModalElements();
        bindEvents();
        updateReceiptId();
        if (receiptDateDisplay) receiptDateDisplay.textContent = getCurrentDateTime();
        renderProducts();
        updateCartUI();
        updateStats();
    }

    init();
});
