document.addEventListener('DOMContentLoaded', function () {


    if (typeof loginRequired === 'function') {
        loginRequired(['admin', 'it']);
    }


    function getEffectiveStock(p) {
        if (typeof getCurrentStock === 'function') {
            return getCurrentStock(p);
        }
        return Number(p.stock) || 0;
    }


    function generateSku(p) {
        if (p && p.sku) return p.sku;
        var cat = (p && p.category || 'X').toString().toUpperCase().slice(0, 3);
        var rawId = String(p && p.id || '0000');
        var shortId = '';
        if (/^\d+$/.test(rawId)) {
            shortId = String(Number(rawId)).padStart(4, '0');
        } else {
            for (var i = rawId.length - 4; i < rawId.length; i++) {
                var ch = rawId.charCodeAt(i >= 0 ? i : 0);
                shortId += String((ch % 10));
            }
            while (shortId.length < 4) shortId = '0' + shortId;
        }
        return 'NB-' + cat + '-' + shortId.slice(-4);
    }


    function getStatusBadge(stock) {
        var threshold = Number(getSystemSettings().lowStockThreshold) || 10;
        if (stock <= 0) {
            return '<span class="inv-status status-out">Out of Stock</span>';
        } else if (stock <= threshold) {
            return '<span class="inv-status status-low">Low Stock</span>';
        } else {
            return '<span class="inv-status status-instock">In Stock</span>';
        }
    }


    function getStatusText(stock) {
        var threshold = Number(getSystemSettings().lowStockThreshold) || 10;
        if (stock <= 0) return 'Out of Stock';
        if (stock <= threshold) return 'Low Stock';
        return 'In Stock';
    }

  
    function getStatusClass(stock) {
        var threshold = Number(getSystemSettings().lowStockThreshold) || 10;
        if (stock <= 0) return 'status-out';
        if (stock <= threshold) return 'status-low';
        return 'status-instock';
    }


    function allProducts() {
        if (typeof getProducts === 'function') return getProducts();
        return [];
    }


    var tbody = document.querySelector('.inventory-table tbody');


    function updateStats(list) {
        var cards = document.querySelectorAll('.inv-stat-card .inv-stat-value');
        if (!cards || cards.length < 4) return;
        var totalP = list.length;
        var inStock = 0;
        var lowStock = 0;
        var outStock = 0;
        var threshold = Number(getSystemSettings().lowStockThreshold) || 10;
        for (var i = 0; i < list.length; i++) {
            var s = getEffectiveStock(list[i]);
            if (s <= 0) outStock++;
            else if (s <= threshold) lowStock++;
            else inStock++;
        }
        cards[0].textContent = totalP;
        cards[1].textContent = inStock;
        cards[2].textContent = lowStock;
        cards[3].textContent = outStock;
    }

    function renderInventoryTable(productsArr) {
        if (!tbody) return;
        tbody.innerHTML = '';
        updateStats(productsArr);

        if (productsArr.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:rgba(255,255,255,0.4);">No products found</td></tr>';
        } else {
            for (var i = 0; i < productsArr.length; i++) {
                var p = productsArr[i];
                var stock = getEffectiveStock(p);
                var price = Number(p.price) || 0;
                var formattedPrice = typeof formatCurrency === 'function'
                    ? formatCurrency(price)
                    : 'P' + price.toFixed(2);
                var catCol = p.subcategory || p.category || 'N/A';
                var sizeVal = p.size || 'N/A';
                var sku = generateSku(p);

                var tr = document.createElement('tr');
                tr.setAttribute('data-product-id', String(p.id));
                tr.innerHTML =
                    '<td class="product-name">' + escapeHtml(p.name) + '</td>' +
                    '<td>' + escapeHtml(catCol) + '</td>' +
                    '<td class="sku-code">' + sku + '</td>' +
                    '<td>' + escapeHtml(sizeVal) + '</td>' +
                    '<td class="product-price">' + formattedPrice + '</td>' +
                    '<td class="stock-count">' + stock + '</td>' +
                    '<td>' + getStatusBadge(stock) + '</td>' +
                    '<td>' +
                    '  <button class="inv-action-btn view-btn" title="View Product" data-id="' + p.id + '">' +
                    '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />' +
                    '    </svg>' +
                    '  </button>' +
                    '  <button class="inv-action-btn edit-btn" title="Edit" data-id="' + p.id + '">' +
                    '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />' +
                    '      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />' +
                    '    </svg>' +
                    '  </button>' +
                    '  <button class="inv-action-btn delete-btn" title="Delete" data-id="' + p.id + '">' +
                    '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '      <polyline points="3 6 5 6 21 6" />' +
                    '      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />' +
                    '    </svg>' +
                    '  </button>' +
                    '  <button class="inv-action-btn barcode-btn" title="Generate Barcode" data-id="' + p.id + '">' +
                    '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '      <path d="M3 5v14M6 5v14M10 5v14M14 5v14M18 5v14M21 5v14" />' +
                    '    </svg>' +
                    '  </button>' +
                    '</td>';
                tbody.appendChild(tr);
            }
        }


        var pagInfo = document.querySelector('.inventory-pagination .pagination-info');
        if (pagInfo) {
            var n = productsArr.length;
            pagInfo.textContent = n === 0
                ? 'Showing 0 results'
                : 'Showing 1 to ' + n + ' of ' + n + ' results';
        }


        bindRowButtons();
    }


    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }


    function filterAndRender() {
        var list = allProducts();
        var searchEl = document.querySelector('.inventory-search-filters .search-input');
        var filterSelects = document.querySelectorAll('.inventory-search-filters .filter-select');
        var q = searchEl ? searchEl.value.toLowerCase().trim() : '';

        var categoryFilter = 'All Categories';
        var statusFilter = 'All Status';
        if (filterSelects && filterSelects.length >= 2) {
            categoryFilter = filterSelects[0].value;
            statusFilter = filterSelects[1].value;
        } else if (filterSelects && filterSelects.length >= 1) {

            var firstLabel = filterSelects[0].closest('.filter-group');
            if (firstLabel) {
                var lab = firstLabel.querySelector('label');
                if (lab && lab.textContent.toLowerCase().indexOf('category') >= 0) {
                    categoryFilter = filterSelects[0].value;
                } else {
                    statusFilter = filterSelects[0].value;
                }
            }
        }

        var filtered = [];
        for (var i = 0; i < list.length; i++) {
            var p = list[i];
            var stock = getEffectiveStock(p);
            var statusText = getStatusText(stock);
            var catText = p.subcategory || p.category || '';


            if (categoryFilter !== 'All Categories' && categoryFilter !== '') {
                var cf = categoryFilter.toLowerCase();
                var sub = (p.subcategory || '').toLowerCase();
                var pc = (p.category || '').toLowerCase();
                if (sub !== cf && pc !== cf && catText.toLowerCase().indexOf(cf) < 0) {
                    continue;
                }
            }


            if (statusFilter !== 'All Status' && statusFilter !== '') {
                if (statusFilter.toLowerCase() !== statusText.toLowerCase()) {
                    if (statusFilter === 'Expires Soon' || statusFilter === 'Expired') {
                        continue;
                    }
                    continue;
                }
            }


            if (q) {
                var haystack = (
                    (p.name || '') + ' ' +
                    (p.subcategory || '') + ' ' +
                    (p.category || '') + ' ' +
                    generateSku(p)
                ).toLowerCase();
                if (haystack.indexOf(q) < 0) continue;
            }

            filtered.push(p);
        }

        renderInventoryTable(filtered);
    }


    function bindRowButtons() {
        if (!tbody) return;

        tbody.querySelectorAll('.view-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = this.getAttribute('data-id');
                var p = getProductByIdSafe(id);
                if (p) openViewModal(p);
            });
        });

        tbody.querySelectorAll('.edit-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = this.getAttribute('data-id');
                var p = getProductByIdSafe(id);
                if (p) openEditModal(p);
            });
        });

        tbody.querySelectorAll('.delete-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = this.getAttribute('data-id');
                var p = getProductByIdSafe(id);
                if (p) openDeleteModal(p);
            });
        });

        tbody.querySelectorAll('.barcode-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var p = getProductByIdSafe(this.getAttribute('data-id'));
                if (p) openBarcodeModal(p);
            });
        });
    }

    function getProductByIdSafe(id) {
        if (typeof getProductById === 'function') {
            return getProductById(id);
        }
        var list = allProducts();
        for (var i = 0; i < list.length; i++) {
            if (String(list[i].id) === String(id)) return list[i];
        }
        return null;
    }



    function closeModal(overlayId) {
        var ov = document.getElementById(overlayId);
        if (ov) ov.classList.remove('active');
        document.body.style.overflow = '';
    }
    function openModal(overlayId) {
        var ov = document.getElementById(overlayId);
        if (ov) ov.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function bindModalClose(overlayId, closeBtnIds) {
        var ov = document.getElementById(overlayId);
        if (!ov) return;
        if (!ov.__boundClose) {
            ov.__boundClose = true;
            for (var i = 0; i < closeBtnIds.length; i++) {
                var btn = document.getElementById(closeBtnIds[i]);
                if (btn) btn.addEventListener('click', function () { closeModal(overlayId); });
            }
        }
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.product-modal-overlay.active').forEach(function (ov) {
                ov.classList.remove('active');
            });
            document.body.style.overflow = '';
        }
    });


    bindModalClose('productModalOverlay', ['productModalClose', 'modalCloseBtn']);
    bindModalClose('addProductModalOverlay', ['addProductModalClose', 'addProductCloseBtn']);
    bindModalClose('editProductModalOverlay', ['editProductModalClose', 'editProductCloseBtn']);
    bindModalClose('adjustStockModalOverlay', ['adjustStockModalClose', 'adjustStockCloseBtn']);
    bindModalClose('deleteProductModalOverlay', ['deleteProductModalClose', 'deleteProductCloseBtn']);
    bindModalClose('barcodeModalOverlay', ['barcodeModalClose', 'barcodeCloseBtn']);

    function barcodeValue(product) {
        return String(product.id);
    }

    function renderBarcode(product, target) {
        if (!target || typeof JsBarcode !== 'function') return;
        target.innerHTML = '';
        JsBarcode(target, barcodeValue(product), {
            format: 'CODE128',
            displayValue: false,
            height: 72,
            margin: 8,
            lineColor: '#111111',
            background: '#ffffff'
        });
    }

    function openBarcodeModal(product) {
        var top = document.getElementById('barcodeLabelTop');
        var bottom = document.getElementById('barcodeLabelBottom');
        var sku = document.getElementById('barcodeSku');
        var price = document.getElementById('barcodePrice');
        var stock = document.getElementById('barcodeStock');
        if (top) top.textContent = product.name || 'Product';
        if (bottom) bottom.textContent = barcodeValue(product);
        if (sku) sku.textContent = generateSku(product);
        if (price) price.textContent = typeof formatCurrency === 'function' ? formatCurrency(Number(product.price) || 0) : 'P' + (Number(product.price) || 0).toFixed(2);
        if (stock) stock.textContent = getEffectiveStock(product);
        renderBarcode(product, document.getElementById('barcodeCanvas'));
        var printBtn = document.getElementById('printSingleBarcodeBtn');
        var qtyInput = document.getElementById('barcodePrintQty');
        function getPrintCopies() {
            var copies = Math.floor(Number(qtyInput && qtyInput.value) || 1);
            if (!isFinite(copies) || copies < 1) copies = 1;
            if (copies > 500) copies = 500;
            return copies;
        }
        if (printBtn) {
            printBtn.onclick = function () { printBarcodes([product], getPrintCopies()); };
        }
        if (qtyInput && printBtn) {
            qtyInput.oninput = function () {
                printBtn.textContent = 'Print Barcode × ' + getPrintCopies();
            };
            qtyInput.oninput();
        }
        openModal('barcodeModalOverlay');
    }

    function printBarcodes(products, copies) {
        var container = document.getElementById('printBarcodesContainer');
        if (!container || typeof JsBarcode !== 'function' || !products.length) return;
        var repeat = Math.floor(Number(copies) || 1);
        if (!isFinite(repeat) || repeat < 1) repeat = 1;
        if (repeat > 500) repeat = 500;
        container.innerHTML = '<div class="print-area"><h1>nightbaby Inventory Barcodes</h1><div class="print-barcode-grid"></div></div>';
        var grid = container.querySelector('.print-barcode-grid');
        products.forEach(function (product) {
            for (var copy = 0; copy < repeat; copy++) {
                var label = document.createElement('div');
                label.className = 'print-barcode-label';
                label.innerHTML = '<strong>' + escapeHtml(product.name || 'Product') + '</strong><svg></svg><span>' + escapeHtml(barcodeValue(product)) + '</span>';
                grid.appendChild(label);
                renderBarcode(product, label.querySelector('svg'));
            }
        });
        window.print();
    }

    var printInventoryBtn = document.querySelector('.print-inventory-btn');
    if (printInventoryBtn) printInventoryBtn.addEventListener('click', function () { printBarcodes(allProducts()); });

    function exportBarcodesPdf(products) {
        if (!products.length) {
            if (typeof showNotification === 'function') showNotification('No products available to export.', 'error');
            return;
        }
        if (!window.jspdf || typeof window.jspdf.jsPDF !== 'function') {
            if (typeof showNotification === 'function') showNotification('PDF library is not available. Check your internet connection.', 'error');
            return;
        }

        var doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        var pageWidth = 210;
        var pageHeight = 297;
        var margin = 8;
        var columns = 4;
        var gap = 3;
        var cellWidth = (pageWidth - (margin * 2) - (gap * (columns - 1))) / columns;
        var cellHeight = 28;
        var startY = 18;
        var row = 0;

        doc.setFontSize(12);
        doc.text('nightbaby Inventory Barcodes', pageWidth / 2, 10, { align: 'center' });

        products.forEach(function (product, index) {
            var column = index % columns;
            if (index > 0 && column === 0) row++;
            var x = margin + column * (cellWidth + gap);
            var y = startY + row * (cellHeight + gap);
            if (y + cellHeight > pageHeight - margin) {
                doc.addPage();
                row = 0;
                y = startY;
                doc.setFontSize(12);
                doc.text('nightbaby Inventory Barcodes', pageWidth / 2, 10, { align: 'center' });
            }

            var barcodeCanvas = document.createElement('canvas');
            JsBarcode(barcodeCanvas, barcodeValue(product), {
                format: 'CODE128',
                displayValue: false,
                width: 2,
                height: 46,
                margin: 0,
                lineColor: '#111111',
                background: '#ffffff'
            });

            doc.setDrawColor(210, 210, 210);
            doc.rect(x, y, cellWidth, cellHeight);
            doc.setTextColor(20, 20, 20);
            doc.setFontSize(7);
            doc.text(String(product.name || 'Product').slice(0, 30), x + cellWidth / 2, y + 4, { align: 'center' });
            doc.addImage(barcodeCanvas.toDataURL('image/png'), 'PNG', x + 3, y + 6, cellWidth - 6, 15);
            doc.setFontSize(8);
            doc.text(barcodeValue(product), x + cellWidth / 2, y + 25, { align: 'center' });
        });

        doc.save('nightbaby-barcodes-' + new Date().toISOString().slice(0, 10) + '.pdf');
    }

    var exportPdfBtn = document.querySelector('.export-pdf-btn');
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', function () {
        exportBarcodesPdf(allProducts());
    });


    function openViewModal(p) {
        var stock = getEffectiveStock(p);
        var price = Number(p.price) || 0;
        var formattedPrice = typeof formatCurrency === 'function'
            ? formatCurrency(price)
            : 'P' + price.toFixed(2);
        var totalValue = price * stock;
        var formattedTotal = typeof formatCurrency === 'function'
            ? formatCurrency(totalValue)
            : 'P' + totalValue.toFixed(2);

        var elName = document.getElementById('detailName');
        var elCat = document.getElementById('detailCategory');
        var elSku = document.getElementById('detailSku');
        var elSize = document.getElementById('detailSize');
        var elPrice = document.getElementById('detailPrice');
        var elStock = document.getElementById('detailStock');
        var elAlert = document.getElementById('detailAlert');
        var elTotal = document.getElementById('detailTotal');
        var elStatus = document.getElementById('detailStatus');
        var elDate = document.getElementById('detailDateAdded');
        var elUpdated = document.getElementById('detailUpdated');
        var elImg = document.getElementById('modalProductImage');

        if (elName) elName.textContent = p.name || 'N/A';
        if (elCat) elCat.textContent = p.subcategory || p.category || 'N/A';
        if (elSku) elSku.textContent = generateSku(p);
        if (elSize) elSize.textContent = p.size || 'N/A';
        if (elPrice) elPrice.textContent = formattedPrice;
        if (elStock) elStock.textContent = stock;
        if (elAlert) elAlert.textContent = p.lowStockAlert || p.alert || '10';
        if (elTotal) elTotal.textContent = formattedTotal;
        if (elStatus) {
            elStatus.innerHTML = '<span class="inv-status ' + getStatusClass(stock) + '">' + getStatusText(stock) + '</span>';
        }
        if (elDate) elDate.textContent = p.dateAdded || 'N/A';
        if (elUpdated) elUpdated.textContent = p.updated || p.updatedAt || 'N/A';
        if (elImg && p.image) {
            elImg.src = p.image;
        } else if (elImg) {
            elImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231a1714'/%3E%3Ctext x='50%25' y='50%25' font-family='monospace' font-size='14' fill='%235a4f45' text-anchor='middle' dy='.3em'%3ENO IMAGE%3C/text%3E%3C/svg%3E";
        }


        var editBtn = document.getElementById('modalEditBtn');
        if (editBtn) {
            editBtn.onclick = function () {
                closeModal('productModalOverlay');
                setTimeout(function () { openEditModal(p); }, 200);
            };
        }
        var delBtn = document.getElementById('modalDeleteBtn');
        if (delBtn) {
            delBtn.onclick = function () {
                closeModal('productModalOverlay');
                setTimeout(function () { openDeleteModal(p); }, 200);
            };
        }

        openModal('productModalOverlay');
    }

    var addProductImageData = '';
    var editProductImageData = '';

    function setupImagePreview(previewEl, fileInputEl, dataHolder) {
        if (!previewEl || !fileInputEl) return;
        function clearPreview() {
            previewEl.innerHTML = '<span class="image-placeholder-text">No image</span>';
        }
        fileInputEl.addEventListener('change', function () {
            var file = this.files && this.files[0];
            if (!file) return;
            if (!file.type || file.type.indexOf('image/') !== 0) {
                if (typeof showNotification === 'function') showNotification('Please select an image file', 'error');
                return;
            }
            var reader = new FileReader();
            reader.onload = function (e) {
                var dataUrl = e.target && e.target.result ? String(e.target.result) : '';
                previewEl.innerHTML = '<img src="' + dataUrl + '" alt="Preview" style="width:100%;height:100%;object-fit:cover;">';

                function storeValue(val) {
                    if (dataHolder === 'add') addProductImageData = val;
                    else if (dataHolder === 'edit') editProductImageData = val;
                }

                var relPath = 'images/PRODUCTS/' + file.name;
                if (window.showSaveFilePicker) {
                    saveImageFileToProject(file, function (saved) {
                        storeValue(relPath);
                        if (saved && typeof showNotification === 'function') {
                            showNotification('Image saved to ' + relPath, 'success');
                        }
                    });
                } else {
                    storeValue(relPath);
                }
            };
            reader.onerror = function () {
                if (typeof showNotification === 'function') showNotification('Failed to read image', 'error');
                clearPreview();
            };
            reader.readAsDataURL(file);
        });
    }

    function saveImageFileToProject(file, callback) {
        try {
            window.showSaveFilePicker({
                suggestedName: file.name,
                types: [{ description: 'Image', accept: { 'image/*': ['.' + (file.name.split('.').pop() || 'jpg')] } }],
                startIn: 'pictures'
            }).then(function (handle) {
                return handle.createWritable().then(function (writable) {
                    return writable.write(file).then(function () {
                        return writable.close();
                    });
                }).then(function () {
                    callback(true);
                });
            }).catch(function () {
                callback(false);
            });
        } catch (err) {
            callback(false);
        }
    }

    var addProductBtn = document.querySelector('.add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', function () { openAddModal(); });
    }
    function openAddModal() {
        var f = document.getElementById('addProductForm');
        if (f) f.reset();
        addProductImageData = '';
        var prev = document.getElementById('addProductImagePreview');
        if (prev) prev.innerHTML = '<span class="image-placeholder-text">No image</span>';
        openModal('addProductModalOverlay');
    }

    var addImgFile = document.getElementById('addProductImage');
    var addImgPrev = document.getElementById('addProductImagePreview');
    setupImagePreview(addImgPrev, addImgFile, 'add');
    if (addImgPrev && addImgFile) {
        addImgPrev.addEventListener('click', function (e) {
            if (e.target.tagName !== 'INPUT') {
                e.preventDefault();
                addImgFile.click();
            }
        });
    }

    var addSaveBtn = document.getElementById('addProductSaveBtn');
    if (addSaveBtn) {
        addSaveBtn.addEventListener('click', function () {
            var nameEl = document.getElementById('addProductName');
            var priceEl = document.getElementById('addProductPrice');
            var stockEl = document.getElementById('addProductStock');
            var catEl = document.getElementById('addProductCategory');
            var subcatEl = document.getElementById('addProductSubcategory');
            var sizeEl = document.getElementById('addProductSize');
            var alertEl = document.getElementById('addProductLowStock');
            var discountEl = document.getElementById('addProductDiscount');
            var expEl = document.getElementById('addProductExpiration');

            var name = nameEl ? nameEl.value.trim() : '';
            var price = priceEl ? Number(priceEl.value) : 0;
            var stock = stockEl ? Number(stockEl.value) : 0;
            var discount = discountEl ? Number(discountEl.value) : 0;
            var category = catEl ? catEl.value : '';

            if (!name) {
                if (typeof showNotification === 'function') showNotification('Product name is required', 'error');
                return;
            }
            if (!category) {
                if (typeof showNotification === 'function') showNotification('Category is required', 'error');
                return;
            }
            if (isNaN(price) || price < 0) {
                if (typeof showNotification === 'function') showNotification('Valid price is required', 'error');
                return;
            }
            if (isNaN(stock) || stock < 0) {
                if (typeof showNotification === 'function') showNotification('Valid stock is required', 'error');
                return;
            }
            if (isNaN(discount) || discount < 0 || discount > 100) {
                if (typeof showNotification === 'function') showNotification('Discount must be between 0 and 100', 'error');
                return;
            }

            var newProduct = {
                name: name,
                category: category,
                subcategory: subcatEl ? subcatEl.value : '',
                price: price,
                discount: discount,
                stock: stock,
                size: sizeEl ? sizeEl.value : 'N/A',
                lowStockAlert: alertEl ? Number(alertEl.value) || 10 : 10,
                expiration: expEl ? expEl.value : '',
                image: addProductImageData || '',
                dateAdded: typeof getCurrentDateTime === 'function' ? getCurrentDateTime() : new Date().toLocaleString(),
                updated: typeof getCurrentDateTime === 'function' ? getCurrentDateTime() : new Date().toLocaleString()
            };

            if (typeof addProduct === 'function') {
                addProduct(newProduct);
            } else {
                var list = allProducts();
                if (typeof generateAlphanumericId === 'function') {
                    var nid;
                    do { nid = generateAlphanumericId(6); } while (list.some(function (p) { return String(p.id) === nid; }));
                    newProduct.id = nid;
                } else {
                    var newId = 1;
                    for (var xi = 0; xi < list.length; xi++) newId = Math.max(newId, Number(list[xi].id) + 1);
                    newProduct.id = newId;
                }
                list.push(newProduct);
                if (typeof saveProducts === 'function') saveProducts(list);
            }

            if (typeof showNotification === 'function') {
                showNotification('Product "' + name + '" added successfully!', 'success');
            }
            closeModal('addProductModalOverlay');
            filterAndRender();
        });
    }
    var currentEditId = null;
    var editImgFile = document.getElementById('editProductImage');
    var editImgPrev = document.getElementById('editProductImagePreview');
    setupImagePreview(editImgPrev, editImgFile, 'edit');
    if (editImgPrev && editImgFile) {
        editImgPrev.addEventListener('click', function (e) {
            if (e.target.tagName !== 'INPUT') {
                e.preventDefault();
                editImgFile.click();
            }
        });
    }

    function openEditModal(p) {
        currentEditId = p.id;
        var nameEl = document.getElementById('editProductName');
        var skuEl = document.getElementById('editProductSku');
        var priceEl = document.getElementById('editProductPrice');
        var discountEl = document.getElementById('editProductDiscount');
        var alertEl = document.getElementById('editProductLowStock');
        var catEl = document.getElementById('editProductCategory');
        var sizeEl = document.getElementById('editProductSize');
        var stockEl = document.getElementById('editProductStock');
        var expEl = document.getElementById('editProductExpiration');

        editProductImageData = p.image || '';
        if (editImgPrev) {
            editImgPrev.innerHTML = editProductImageData
                ? '<img src="' + editProductImageData + '" alt="Preview" style="width:100%;height:100%;object-fit:cover;">'
                : '<span class="image-placeholder-text">No image</span>';
        }

        if (nameEl) nameEl.value = p.name || '';
        if (skuEl) skuEl.value = generateSku(p);
        if (priceEl) priceEl.value = Number(p.price) || 0;
        if (discountEl) discountEl.value = Number(p.discount) || 0;
        if (alertEl) alertEl.value = Number(p.lowStockAlert || p.alert) || 10;
        if (catEl) {
            var found = false;
            for (var i = 0; i < catEl.options.length; i++) {
                var ov = catEl.options[i].value.toLowerCase();
                var pc = (p.category || '').toLowerCase();
                var ps = (p.subcategory || '').toLowerCase();
                if (ov === pc || ov === ps) {
                    catEl.selectedIndex = i;
                    found = true;
                    break;
                }
            }
            if (!found && catEl.options.length > 0) catEl.selectedIndex = 0;
        }
        if (sizeEl) {
            var szFound = false;
            for (var s = 0; s < sizeEl.options.length; s++) {
                if (sizeEl.options[s].value === (p.size || '')) {
                    sizeEl.selectedIndex = s;
                    szFound = true;
                    break;
                }
            }
            if (!szFound && p.size && sizeEl.options.length > 0) {
                var opt = document.createElement('option');
                opt.value = p.size;
                opt.textContent = p.size;
                sizeEl.appendChild(opt);
                sizeEl.value = p.size;
            }
        }
        if (stockEl) stockEl.value = getEffectiveStock(p);
        if (expEl) expEl.value = p.expiration || '';

        openModal('editProductModalOverlay');
    }

    var editSaveBtn = document.getElementById('editProductSaveBtn');
    if (editSaveBtn) {
        editSaveBtn.addEventListener('click', function () {
            if (currentEditId == null) return;
            var nameEl = document.getElementById('editProductName');
            var priceEl = document.getElementById('editProductPrice');
            var discountEl = document.getElementById('editProductDiscount');
            var stockEl = document.getElementById('editProductStock');
            var catEl = document.getElementById('editProductCategory');
            var sizeEl = document.getElementById('editProductSize');
            var skuEl = document.getElementById('editProductSku');
            var alertEl = document.getElementById('editProductLowStock');
            var expEl = document.getElementById('editProductExpiration');

            var name = nameEl ? nameEl.value.trim() : '';
            var price = priceEl ? Number(priceEl.value) : 0;
            var stock = stockEl ? Number(stockEl.value) : 0;
            var discount = discountEl ? Number(discountEl.value) : 0;
            var category = catEl ? catEl.value : '';

            if (!name) {
                if (typeof showNotification === 'function') showNotification('Product name is required', 'error');
                return;
            }
            if (isNaN(price) || price < 0) {
                if (typeof showNotification === 'function') showNotification('Valid price is required', 'error');
                return;
            }
            if (isNaN(stock) || stock < 0) {
                if (typeof showNotification === 'function') showNotification('Valid stock is required', 'error');
                return;
            }
            if (isNaN(discount) || discount < 0 || discount > 100) {
                if (typeof showNotification === 'function') showNotification('Discount must be between 0 and 100', 'error');
                return;
            }

            var fields = {
                name: name,
                category: category,
                price: price,
                discount: discount,
                stock: stock,
                size: sizeEl ? sizeEl.value : 'N/A',
                sku: skuEl ? skuEl.value.trim() : '',
                lowStockAlert: alertEl ? Number(alertEl.value) || 10 : 10,
                expiration: expEl ? expEl.value : '',
                updated: typeof getCurrentDateTime === 'function' ? getCurrentDateTime() : new Date().toLocaleString()
            };
            if (editProductImageData) fields.image = editProductImageData;

            if (typeof updateProduct === 'function') {
                updateProduct(currentEditId, fields);
            } else {
                var list = allProducts();
                for (var fi = 0; fi < list.length; fi++) {
                    if (String(list[fi].id) === String(currentEditId)) {
                        for (var k in fields) {
                            if (fields.hasOwnProperty(k)) list[fi][k] = fields[k];
                        }
                        break;
                    }
                }
                if (typeof saveProducts === 'function') saveProducts(list);
            }

            if (typeof showNotification === 'function') {
                showNotification('Product "' + name + '" updated successfully!', 'success');
            }
            closeModal('editProductModalOverlay');
            currentEditId = null;
            filterAndRender();
        });
    }
    var currentDeleteId = null;
    function openDeleteModal(p) {
        currentDeleteId = p.id;
        var delName = document.getElementById('deleteProductName');
        var delSku = document.getElementById('deleteProductSku');
        if (delName) delName.textContent = p.name || 'N/A';
        if (delSku) delSku.textContent = generateSku(p);
        openModal('deleteProductModalOverlay');
    }

    var delConfirmBtn = document.getElementById('deleteProductConfirmBtn');
    if (delConfirmBtn) {
        delConfirmBtn.addEventListener('click', function () {
            if (currentDeleteId == null) return;
            var p = getProductByIdSafe(currentDeleteId);
            var pname = p ? p.name : '';

            if (typeof deleteProduct === 'function') {
                deleteProduct(currentDeleteId);
            } else {
                var list = allProducts();
                var newList = [];
                for (var i = 0; i < list.length; i++) {
                    if (String(list[i].id) !== String(currentDeleteId)) {
                        newList.push(list[i]);
                    }
                }
                if (typeof saveProducts === 'function') saveProducts(newList);
            }
            if (typeof showNotification === 'function') {
                showNotification('Product "' + pname + '" deleted successfully!', 'success');
            }
            closeModal('deleteProductModalOverlay');
            currentDeleteId = null;
            filterAndRender();
        });
    }
    var currentAdjustId = null;
    var currentAdjustPendingKey = null;

    function getRefundStockDoneKeys() {
        try {
            var raw = localStorage.getItem('nb_refund_stock_done');
            if (!raw) return {};
            var obj = JSON.parse(raw);
            return obj && typeof obj === 'object' ? obj : {};
        } catch (e) {
            return {};
        }
    }
    function saveRefundStockDoneKeys(keys) {
        try { localStorage.setItem('nb_refund_stock_done', JSON.stringify(keys || {})); } catch (e) { }
    }
    function refundItemKey(r) {
        return String(r.txId || '') + '::' + String(r.productId || '') + '::' + String(r.refundedAt || 0);
    }
    function getPendingRefundedItems() {
        var all = typeof getRefundedItems === 'function' ? getRefundedItems() : [];
        var done = getRefundStockDoneKeys();
        var pending = [];
        for (var i = 0; i < all.length; i++) {
            var r = all[i];
            if (!done[refundItemKey(r)]) pending.push(r);
        }
        pending.sort(function (a, b) { return (b.refundedAt || 0) - (a.refundedAt || 0); });
        return pending;
    }
    function markRefundStockDone(r) {
        var done = getRefundStockDoneKeys();
        done[refundItemKey(r)] = Date.now();
        saveRefundStockDoneKeys(done);
    }

    function updateAdjustStockButtonState() {
        var btn = document.querySelector('.adjust-stock-btn');
        var badge = document.querySelector('.adjust-stock-badge');
        var pending = getPendingRefundedItems();
        var count = pending.length;
        if (btn) {
            if (count > 0) {
                btn.disabled = false;
                btn.classList.remove('is-disabled');
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            } else {
                btn.disabled = true;
                btn.classList.add('is-disabled');
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        }
        if (badge) {
            if (count > 0) {
                badge.style.display = 'inline-block';
                badge.textContent = String(count > 99 ? '99+' : count);
            } else {
                badge.style.display = 'none';
                badge.textContent = '0';
            }
        }
    }

    var adjustBtn = document.querySelector('.adjust-stock-btn');
    if (adjustBtn) {
        adjustBtn.addEventListener('click', function () {
            var pending = getPendingRefundedItems();
            if (!pending.length) {
                if (typeof showNotification === 'function') showNotification('No refunded items to process', 'info');
                return;
            }
            openAdjustModal();
        });
    }

    function renderPendingAdjustList(selectedKey) {
        var container = document.getElementById('adjustPendingList');
        if (!container) return;
        var pending = getPendingRefundedItems();
        if (!pending.length) {
            container.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--color-text-tertiary); font-size:0.85rem;">No refunded items to process</div>';
            return;
        }
        var html = '';
        for (var ri = 0; ri < pending.length; ri++) {
            var r = pending[ri];
            var key = refundItemKey(r);
            var p = getProductByIdSafe(r.productId);
            var curStock = p ? getEffectiveStock(p) : 0;
            var stockBadge = getStatusBadge(curStock);
            var isSelected = selectedKey && key === selectedKey;
            var selBg = isSelected ? 'background:rgba(244,162,97,0.1); outline:2px solid var(--color-accent, #f4a261);' : 'background:transparent;';
            html += '<div class="adjust-pending-row" data-key="' + escapeHtml(key) + '" data-product-id="' + escapeHtml(String(r.productId || '')) + '" data-pending-index="' + ri + '" data-selected="' + (isSelected ? '1' : '0') + '" style="padding:0.5rem 0.6rem; border-bottom:1px solid var(--color-border); font-size:0.82rem; display:flex; flex-direction:column; gap:4px; cursor:pointer; border-radius:6px; margin:2px 0; transition:background 0.15s, outline 0.15s;' + selBg + '">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">' +
                '<strong style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHtml(r.productName) + '</strong>' +
                stockBadge +
                '</div>' +
                '<div style="display:flex; justify-content:space-between; color:var(--color-text-secondary); flex-wrap:wrap; gap:4px;">' +
                '<span>Qty: ' + (r.quantity || 1) + ' | Reason: ' + escapeHtml(r.refundReason || 'N/A') + '</span>' +
                '<span style="margin-left:0.5rem; flex-shrink:0;">TX: ' + escapeHtml(String(r.txId).slice(-8)) + '</span>' +
                '</div>' +
                '</div>';
        }
        container.innerHTML = html;
        var rows = container.querySelectorAll('.adjust-pending-row');
        for (var rj = 0; rj < rows.length; rj++) {
            (function (row) {
                row.addEventListener('mouseenter', function () {
                    if (row.getAttribute('data-selected') !== '1') {
                        row.style.background = 'rgba(244,162,97,0.08)';
                    }
                });
                row.addEventListener('mouseleave', function () {
                    if (row.getAttribute('data-selected') === '1') {
                        row.style.background = 'rgba(244,162,97,0.1)';
                    } else {
                        row.style.background = 'transparent';
                    }
                });
                row.addEventListener('click', function () {
                    var key = row.getAttribute('data-key');
                    var pid = row.getAttribute('data-product-id');
                    selectPendingAdjustRow(key, pid);
                });
            })(rows[rj]);
        }
    }

    function selectPendingAdjustRow(key, productId) {
        currentAdjustPendingKey = key || null;
        currentAdjustId = productId || null;
        var selectedEl = document.getElementById('adjustSelectedProduct');
        var stockEl = document.getElementById('adjustStockCurrentStock');
        var statusEl = document.getElementById('adjustStockCurrentStatus');
        if (!currentAdjustId) {
            if (selectedEl) selectedEl.value = '-- Select from list --';
            if (stockEl) stockEl.value = '--';
            if (statusEl) statusEl.textContent = '--';
            return;
        }
        var p = getProductByIdSafe(currentAdjustId);
        if (!p) {
            if (selectedEl) selectedEl.value = 'Product not found in inventory';
            if (stockEl) stockEl.value = '--';
            if (statusEl) statusEl.textContent = '--';
            return;
        }
        var stock = getEffectiveStock(p);
        if (selectedEl) selectedEl.value = (p.name || '') + ' (SKU: ' + generateSku(p) + ')';
        if (stockEl) stockEl.value = String(stock);
        if (statusEl) {
            statusEl.innerHTML = getStatusBadge(stock);
            statusEl.style.background = 'transparent';
            statusEl.style.padding = '0';
        }
        var qtyEl = document.getElementById('adjustStockQuantity');
        if (qtyEl && !qtyEl.value) {
            var pendingList = getPendingRefundedItems();
            for (var i = 0; i < pendingList.length; i++) {
                if (refundItemKey(pendingList[i]) === key) {
                    qtyEl.value = String(pendingList[i].quantity || 1);
                    break;
                }
            }
        }
        renderPendingAdjustList(key);
    }

    function openAdjustModal() {
        currentAdjustId = null;
        currentAdjustPendingKey = null;
        var selectedEl = document.getElementById('adjustSelectedProduct');
        if (selectedEl) selectedEl.value = '-- Select from list --';
        var stockEl = document.getElementById('adjustStockCurrentStock');
        if (stockEl) stockEl.value = '--';
        var statusEl = document.getElementById('adjustStockCurrentStatus');
        if (statusEl) statusEl.textContent = '--';
        var typeEl = document.getElementById('adjustStockType');
        if (typeEl) typeEl.value = '+';
        var qtyEl = document.getElementById('adjustStockQuantity');
        if (qtyEl) qtyEl.value = '';
        var reasonEl = document.getElementById('adjustStockReason');
        if (reasonEl) reasonEl.value = 'Customer Return';
        var notesEl = document.getElementById('adjustStockNotes');
        if (notesEl) notesEl.value = '';
        setTimeout(function () {
            renderPendingAdjustList(null);
        }, 50);
        openModal('adjustStockModalOverlay');
    }

    var refreshRefundedBtn = document.getElementById('refreshRefundedBtn');
    if (refreshRefundedBtn) refreshRefundedBtn.addEventListener('click', function () {
        updateAdjustStockButtonState();
        renderPendingAdjustList(currentAdjustPendingKey);
    });

    var adjustSaveBtn = document.getElementById('adjustStockSaveBtn');
    if (adjustSaveBtn) {
        adjustSaveBtn.addEventListener('click', function () {
            if (currentAdjustId == null || !currentAdjustPendingKey) {
                if (typeof showNotification === 'function') showNotification('Please select a refunded item from the list', 'error');
                return;
            }
            var typeEl = document.getElementById('adjustStockType');
            var qtyEl = document.getElementById('adjustStockQuantity');
            var op = typeEl ? typeEl.value : '+';
            var qty = qtyEl ? Number(qtyEl.value) : 0;

            if (isNaN(qty) || qty <= 0) {
                if (typeof showNotification === 'function') showNotification('Enter a valid quantity', 'error');
                return;
            }

            var p = getProductByIdSafe(currentAdjustId);
            if (!p) {
                if (typeof showNotification === 'function') showNotification('Product not found in inventory', 'error');
                return;
            }
            var cur = Number(p.stock) || 0;
            var newStock = op === '+' ? cur + qty : cur - qty;
            if (newStock < 0) newStock = 0;

            if (typeof updateProduct === 'function') {
                updateProduct(currentAdjustId, {
                    stock: newStock,
                    updated: typeof getCurrentDateTime === 'function' ? getCurrentDateTime() : new Date().toLocaleString()
                });
            } else {
                var list = allProducts();
                for (var i = 0; i < list.length; i++) {
                    if (String(list[i].id) === String(currentAdjustId)) {
                        list[i].stock = newStock;
                        break;
                    }
                }
                if (typeof saveProducts === 'function') saveProducts(list);
            }

            var pending = getPendingRefundedItems();
            for (var pi = 0; pi < pending.length; pi++) {
                if (refundItemKey(pending[pi]) === currentAdjustPendingKey) {
                    markRefundStockDone(pending[pi]);
                    break;
                }
            }

            if (typeof showNotification === 'function') {
                var word = op === '+' ? 'added to' : 'removed from';
                showNotification('Stock ' + word + ' "' + p.name + '" successfully!', 'success');
            }

            filterAndRender();
            updateAdjustStockButtonState();

            var remaining = getPendingRefundedItems();
            if (!remaining.length) {
                closeModal('adjustStockModalOverlay');
                currentAdjustId = null;
                currentAdjustPendingKey = null;
            } else {
                currentAdjustId = null;
                currentAdjustPendingKey = null;
                var selEl = document.getElementById('adjustSelectedProduct');
                if (selEl) selEl.value = '-- Select from list --';
                var sEl = document.getElementById('adjustStockCurrentStock');
                if (sEl) sEl.value = '--';
                var stEl = document.getElementById('adjustStockCurrentStatus');
                if (stEl) stEl.textContent = '--';
                if (qtyEl) qtyEl.value = '';
                if (notesEl) notesEl.value = '';
                renderPendingAdjustList(null);
            }
        });
    }

    updateAdjustStockButtonState();

    var searchInput = document.querySelector('.inventory-search-filters .search-input');
    if (searchInput) searchInput.addEventListener('input', filterAndRender);

    var filterSelects = document.querySelectorAll('.inventory-search-filters .filter-select');
    filterSelects.forEach(function (sel) {
        sel.addEventListener('change', filterAndRender);
    });
    var initialRender = typeof nbDataReady !== 'undefined'
        ? nbDataReady.catch(function () { })
        : Promise.resolve();
    initialRender.then(function () {
        renderInventoryTable(allProducts());
    });

});
