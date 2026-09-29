/**
 * nightbaby - Point of Sale (POS) JavaScript
 * Complete POS functionality with categories, images, and cart management
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 POS System Initialized');

    // ============================================
    // PRODUCT CATALOG WITH CATEGORIES & IMAGES
    // ============================================
    
    const products = [
        // ===== CLOTHING =====
        { 
            id: 1, 
            name: 'MISFIT Gothic Black Shirt', 
            category: 'clothing', 
            subcategory: 'Graphic T-Shirts',
            price: 550.00, 
            stock: 100,
            image: 'nightbaby/images/clothes.jpeg'
        },
        { 
            id: 2, 
            name: 'SKULL Grunge Grey Shirt', 
            category: 'clothing', 
            subcategory: 'Graphic T-Shirts',
            price: 400.00, 
            stock: 100,
            image: 'images/products/clothing/skull-grey.jpg'
        },
        { 
            id: 3, 
            name: 'SKULL Purple Shirt', 
            category: 'clothing', 
            subcategory: 'Graphic T-Shirts',
            price: 650.00, 
            stock: 100,
            image: 'images/products/clothing/skull-purple.jpg'
        },
        { 
            id: 4, 
            name: 'RAVEN Noir Jacket', 
            category: 'clothing', 
            subcategory: 'Outerwear',
            price: 1200.00, 
            stock: 50,
            image: 'images/products/clothing/raven-jacket.jpg'
        },
        { 
            id: 5, 
            name: 'MINI SKIRT - Black', 
            category: 'clothing', 
            subcategory: 'Bottoms',
            price: 450.00, 
            stock: 80,
            image: 'images/products/clothing/mini-skirt.jpg'
        },
        { 
            id: 6, 
            name: 'LEATHER Jacket - Vintage', 
            category: 'clothing', 
            subcategory: 'Outerwear',
            price: 1500.00, 
            stock: 30,
            image: 'images/products/clothing/leather-jacket.jpg'
        },
        
        // ===== PERFUME =====
        { 
            id: 7, 
            name: 'RAVEN Noir EDP', 
            category: 'perfume', 
            subcategory: 'Eau de Parfum',
            price: 850.00, 
            stock: 60,
            image: 'images/products/perfume/raven-noir.jpg'
        },
        { 
            id: 8, 
            name: 'MIDNIGHT Rose Perfume', 
            category: 'perfume', 
            subcategory: 'Eau de Toilette',
            price: 550.00, 
            stock: 75,
            image: 'images/products/perfume/midnight-rose.jpg'
        },
        { 
            id: 9, 
            name: 'GOTHIC Vanilla Fragrance', 
            category: 'perfume', 
            subcategory: 'Fragrance Oil',
            price: 380.00, 
            stock: 90,
            image: 'images/products/perfume/gothic-vanilla.jpg'
        },
        { 
            id: 10, 
            name: 'OUD Wood Premium', 
            category: 'perfume', 
            subcategory: 'Attar',
            price: 950.00, 
            stock: 40,
            image: 'images/products/perfume/oud-wood.jpg'
        },
        
        // ===== ACCESSORIES =====
        { 
            id: 11, 
            name: 'CHAIN Wallet - Black', 
            category: 'accessories', 
            subcategory: 'Wallets',
            price: 350.00, 
            stock: 120,
            image: 'images/products/accessories/chain-wallet.jpg'
        },
        { 
            id: 12, 
            name: 'SKULL Ring - Silver', 
            category: 'accessories', 
            subcategory: 'Jewelry',
            price: 280.00, 
            stock: 150,
            image: 'images/products/accessories/skull-ring.jpg'
        },
        { 
            id: 13, 
            name: 'GOTHIC Choker', 
            category: 'accessories', 
            subcategory: 'Necklaces',
            price: 220.00, 
            stock: 100,
            image: 'images/products/accessories/gothic-choker.jpg'
        },
        { 
            id: 14, 
            name: 'LEATHER Bracelet - Studded', 
            category: 'accessories', 
            subcategory: 'Bracelets',
            price: 180.00, 
            stock: 130,
            image: 'images/products/accessories/leather-bracelet.jpg'
        }
    ];

    // ============================================
    // STATE MANAGEMENT
    // ============================================
    
    let cart = [];
    let discount = 0;
    let receiptId = generateReceiptId();
    let currentCategory = 'all';
    let searchQuery = '';

    // ============================================
    // DOM REFERENCES
    // ============================================
    
    const cartItemsContainer = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartItemCount = document.getElementById('cartItemCount');
    const receiptItemsContainer = document.getElementById('receiptItems');
    const subtotalDisplay = document.getElementById('subtotalDisplay');
    const totalDisplay = document.getElementById('totalDisplay');
    const discountDisplay = document.getElementById('discountDisplay');
    const receiptIdDisplay = document.getElementById('receiptId');
    const receiptDateDisplay = document.getElementById('receiptDate');
    const completeSaleBtn = document.getElementById('completeSaleBtn');
    const clearCartBtn = document.getElementById('clearCartBtn');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const productsGrid = document.getElementById('productsGrid');
    const productCountDisplay = document.getElementById('productCountDisplay');
    const categoryTabs = document.querySelectorAll('.category-tab');

    // ============================================
    // MODAL ELEMENTS
    // ============================================
    
    function createModal() {
        const modalHTML = `
            <div class="pos-modal-overlay" id="posModalOverlay">
                <div class="pos-modal">
                    <div class="pos-modal-header">
                        <h2>Confirm Sale</h2>
                        <button class="pos-modal-close" id="posModalClose">✕</button>
                    </div>
                    <div class="pos-modal-body">
                        <div class="modal-order-summary">
                            <div class="modal-summary-row">
                                <span>Items in Cart</span>
                                <span id="modalItemCount">0</span>
                            </div>
                            <div class="modal-summary-row">
                                <span>Subtotal</span>
                                <span id="modalSubtotal">₱0.00</span>
                            </div>
                            <div class="modal-summary-row">
                                <span>Discount</span>
                                <span id="modalDiscount">₱0.00</span>
                            </div>
                            <div class="modal-summary-row modal-total-row">
                                <span>Total</span>
                                <span id="modalTotal">₱0.00</span>
                            </div>
                        </div>
                        <div class="modal-items-preview" id="modalItemsPreview"></div>
                        <div class="modal-payment-section">
                            <label for="modalPaymentAmount">Payment Amount</label>
                            <input type="number" id="modalPaymentAmount" placeholder="Enter payment amount" min="0" step="0.01">
                            <div class="modal-change-display">
                                <span>Change:</span>
                                <span id="modalChangeAmount">₱0.00</span>
                            </div>
                        </div>
                    </div>
                    <div class="pos-modal-footer">
                        <button class="modal-btn-cancel" id="modalCancelBtn">Cancel</button>
                        <button class="modal-btn-confirm" id="modalConfirmBtn">Confirm Sale</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    let modalOverlay, modalClose, modalCancelBtn, modalConfirmBtn;
    let modalItemCount, modalSubtotal, modalDiscount, modalTotal;
    let modalItemsPreview, modalPaymentAmount, modalChangeAmount;
    
    function initModalElements() {
        modalOverlay = document.getElementById('posModalOverlay');
        modalClose = document.getElementById('posModalClose');
        modalCancelBtn = document.getElementById('modalCancelBtn');
        modalConfirmBtn = document.getElementById('modalConfirmBtn');
        modalItemCount = document.getElementById('modalItemCount');
        modalSubtotal = document.getElementById('modalSubtotal');
        modalDiscount = document.getElementById('modalDiscount');
        modalTotal = document.getElementById('modalTotal');
        modalItemsPreview = document.getElementById('modalItemsPreview');
        modalPaymentAmount = document.getElementById('modalPaymentAmount');
        modalChangeAmount = document.getElementById('modalChangeAmount');
    }
    
    createModal();
    initModalElements();

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    function generateReceiptId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = 'POS-';
        for (let i = 0; i < 10; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }
    
    function formatCurrency(amount) {
        return '₱' + amount.toFixed(2);
    }
    
    function getCurrentDateTime() {
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[now.getMonth()];
        const day = now.getDate();
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${month} ${day}, ${hours}:${minutes} ${ampm}`;
    }
    
    function updateReceiptId() {
        receiptId = generateReceiptId();
        receiptIdDisplay.textContent = 'ID: ' + receiptId;
    }
    
    function updateDateTimeDisplay() {
        receiptDateDisplay.textContent = getCurrentDateTime();
    }

    // ============================================
    // PRODUCT DISPLAY FUNCTIONS
    // ============================================
    
    function getFilteredProducts() {
        let filtered = products;
        
        // Filter by category
        if (currentCategory !== 'all') {
            filtered = filtered.filter(p => p.category === currentCategory);
        }
        
        // Filter by search query
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(query) || 
                p.subcategory.toLowerCase().includes(query) ||
                p.category.toLowerCase().includes(query)
            );
        }
        
        return filtered;
    }
    
    function renderProducts() {
        const filtered = getFilteredProducts();
        productCountDisplay.textContent = filtered.length + ' products';
        
        if (filtered.length === 0) {
            productsGrid.innerHTML = `
                <div class="no-products-found">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <span>No products found</span>
                </div>
            `;
            return;
        }
        
        productsGrid.innerHTML = filtered.map(product => `
            <div class="product-card" data-product='${JSON.stringify(product)}'>
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22 viewBox=%220 0 120 120%22%3E%3Crect width=%22120%22 height=%22120%22 fill=%22%231a1714%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22monospace%22 font-size=%2210%22 fill=%22%235a4f45%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENO IMAGE%3C/text%3E%3C/svg%3E'">
                    <div class="product-stock-badge">${product.stock} in stock</div>
                </div>
                <div class="product-details">
                    <span class="product-category-tag">${product.category}</span>
                    <span class="product-name">${product.name}</span>
                    <span class="product-subcategory">${product.subcategory}</span>
                    <span class="product-price">${formatCurrency(product.price)}</span>
                </div>
                <button class="product-add-btn">Add to Cart</button>
            </div>
        `).join('');
        
        // Add event listeners to product cards
        document.querySelectorAll('.product-card').forEach(card => {
            const addBtn = card.querySelector('.product-add-btn');
            const productData = JSON.parse(card.dataset.product);
            
            addBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                addToCart(productData);
            });
            
            card.addEventListener('click', function() {
                addToCart(productData);
            });
        });
    }
    
    function updateCategoryTabs() {
        categoryTabs.forEach(tab => {
            const category = tab.dataset.category;
            tab.classList.toggle('active', category === currentCategory);
        });
    }

    // ============================================
    // CART FUNCTIONS
    // ============================================
    
    function addToCart(product) {
        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                category: product.category,
                subcategory: product.subcategory,
                price: product.price,
                quantity: 1,
                stock: product.stock,
                image: product.image
            });
        }
        
        updateCartUI();
        showNotification(`${product.name} added to cart!`, 'success');
    }
    
    function removeFromCart(productId) {
        const item = cart.find(item => item.id === productId);
        if (item) {
            if (item.quantity > 1) {
                item.quantity -= 1;
            } else {
                cart = cart.filter(item => item.id !== productId);
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
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
    
    function getCartItemCount() {
        return cart.reduce((count, item) => count + item.quantity, 0);
    }

    // ============================================
    // MODAL FUNCTIONS
    // ============================================
    
    function openCheckoutModal() {
        if (cart.length === 0) {
            showNotification('Cart is empty! Add items first.', 'error');
            return;
        }
        
        const total = getCartTotal();
        const subtotal = total - discount;
        const itemCount = getCartItemCount();
        
        modalItemCount.textContent = itemCount;
        modalSubtotal.textContent = formatCurrency(subtotal);
        modalDiscount.textContent = discount > 0 ? formatCurrency(discount) : '₱0.00';
        modalTotal.textContent = formatCurrency(total);
        
        modalItemsPreview.innerHTML = cart.map(item => `
            <div class="modal-preview-item">
                <span class="modal-preview-name">${item.name}</span>
                <span class="modal-preview-details">${item.quantity} × ${formatCurrency(item.price)}</span>
                <span class="modal-preview-total">${formatCurrency(item.price * item.quantity)}</span>
            </div>
        `).join('');
        
        modalPaymentAmount.value = '';
        modalChangeAmount.textContent = '₱0.00';
        modalOverlay.classList.add('active');
        
        setTimeout(() => {
            modalPaymentAmount.focus();
        }, 300);
    }
    
    function closeModal() {
        modalOverlay.classList.remove('active');
    }
    
    function calculateChange() {
        const total = getCartTotal();
        const payment = parseFloat(modalPaymentAmount.value) || 0;
        const change = payment - total;
        
        if (change >= 0) {
            modalChangeAmount.textContent = formatCurrency(change);
            modalChangeAmount.style.color = '#81c784';
        } else {
            modalChangeAmount.textContent = formatCurrency(Math.abs(change)) + ' short';
            modalChangeAmount.style.color = '#e63946';
        }
    }
    
    function confirmSale() {
        const total = getCartTotal();
        const payment = parseFloat(modalPaymentAmount.value) || 0;
        
        if (payment < total) {
            showNotification(`Payment is short by ${formatCurrency(total - payment)}`, 'error');
            modalPaymentAmount.focus();
            return;
        }
        
        if (payment === 0) {
            showNotification('Please enter a payment amount', 'error');
            modalPaymentAmount.focus();
            return;
        }
        
        const receipt = {
            id: receiptId,
            date: getCurrentDateTime(),
            items: [...cart],
            subtotal: total - discount,
            discount: discount,
            total: total,
            payment: payment,
            change: payment - total
        };
        
        showNotification(`Sale completed! Change: ${formatCurrency(payment - total)}`, 'success');
        console.log('🧾 RECEIPT:', receipt);
        
        cart = [];
        discount = 0;
        updateReceiptId();
        updateCartUI();
        closeModal();
        
        const availableCount = document.getElementById('availableCount');
        if (availableCount) {
            let current = parseInt(availableCount.textContent) || 30;
            availableCount.textContent = current - 1;
        }
    }

    // ============================================
    // UI UPDATE FUNCTIONS
    // ============================================
    
    function updateCartUI() {
        const itemCount = getCartItemCount();
        const total = getCartTotal();
        
        cartCount.textContent = itemCount + ' items';
        cartItemCount.textContent = itemCount;
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `<div class="empty-cart-message">No items in cart</div>`;
        } else {
            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="pos-cart-item" data-id="${item.id}">
                    <div class="cart-item-info">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-category">${item.category}</span>
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-controls">
                            <button class="cart-qty-btn minus-btn" data-id="${item.id}">−</button>
                            <span class="cart-item-qty">×${item.quantity}</span>
                            <button class="cart-qty-btn plus-btn" data-id="${item.id}">+</button>
                        </div>
                        <span class="cart-item-price">${formatCurrency(item.price * item.quantity)}</span>
                        <button class="cart-remove-btn" data-id="${item.id}">✕</button>
                    </div>
                </div>
            `).join('');
            
            document.querySelectorAll('.minus-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.dataset.id);
                    removeFromCart(id);
                });
            });
            
            document.querySelectorAll('.plus-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.dataset.id);
                    const item = cart.find(i => i.id === id);
                    if (item) {
                        addToCart(item);
                    }
                });
            });
            
            document.querySelectorAll('.cart-remove-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.dataset.id);
                    cart = cart.filter(item => item.id !== id);
                    updateCartUI();
                    showNotification('Item removed from cart', 'info');
                });
            });
        }
        
        updateReceiptUI();
    }
    
    function updateReceiptUI() {
        const total = getCartTotal();
        const subtotal = total - discount;
        
        if (cart.length === 0) {
            receiptItemsContainer.innerHTML = `<div class="empty-cart-message">No items in receipt</div>`;
        } else {
            receiptItemsContainer.innerHTML = cart.map(item => `
                <div class="receipt-item">
                    <div class="receipt-item-info">
                        <span class="receipt-item-name">${item.name}</span>
                        <span class="receipt-item-category">${item.category}</span>
                    </div>
                    <div class="receipt-item-details">
                        <span class="receipt-item-qty">×${item.quantity}</span>
                        <span class="receipt-item-price">${formatCurrency(item.price * item.quantity)}</span>
                    </div>
                </div>
            `).join('');
        }
        
        subtotalDisplay.textContent = formatCurrency(subtotal);
        totalDisplay.textContent = formatCurrency(total);
        
        if (discount > 0) {
            discountDisplay.textContent = `₱${discount.toFixed(2)} off`;
        } else {
            discountDisplay.textContent = 'From: None';
        }
        
        updateDateTimeDisplay();
    }

    // ============================================
    // NOTIFICATIONS
    // ============================================
    
    function showNotification(message, type = 'info') {
        const existing = document.querySelector('.pos-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `pos-notification pos-notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    // Category tabs
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            currentCategory = this.dataset.category;
            updateCategoryTabs();
            renderProducts();
        });
    });
    
    // Search functionality
    searchInput.addEventListener('input', function() {
        searchQuery = this.value;
        renderProducts();
    });
    
    searchBtn.addEventListener('click', function(e) {
        e.preventDefault();
        searchQuery = searchInput.value;
        renderProducts();
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchQuery = this.value;
            renderProducts();
        }
    });
    
    // Clear cart
    clearCartBtn.addEventListener('click', clearCart);
    
    // Complete sale - Open modal
    completeSaleBtn.addEventListener('click', openCheckoutModal);
    
    // Modal events
    modalClose.addEventListener('click', closeModal);
    modalCancelBtn.addEventListener('click', closeModal);
    
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closeModal();
        }
    });
    
    modalPaymentAmount.addEventListener('input', calculateChange);
    modalConfirmBtn.addEventListener('click', confirmSale);
    
    modalPaymentAmount.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmSale();
        }
    });

    // ============================================
    // INITIALIZATION
    // ============================================
    
    updateDateTimeDisplay();
    updateReceiptId();
    renderProducts();
    updateCartUI();
    
    console.log('✅ POS System Ready');
    console.log(`📦 ${cart.length} items in cart`);
    console.log(`🆔 Receipt ID: ${receiptId}`);
});