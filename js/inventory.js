/**
 * nightbaby - Inventory JavaScript
 */

document.addEventListener("DOMContentLoaded", function () {
    console.log("📦 Inventory Page Loaded");

    // ============================================
    // PRODUCT DETAILS MODAL
    // ============================================

    const modalOverlay = document.getElementById("productModalOverlay");
    const modalClose = document.getElementById("productModalClose");
    const modalCloseBtn = document.getElementById("modalCloseBtn");
    const modalEditBtn = document.getElementById("modalEditBtn");
    const modalDeleteBtn = document.getElementById("modalDeleteBtn");
    const modalProductImage = document.getElementById("modalProductImage");

    const detailName = document.getElementById("detailName");
    const detailCategory = document.getElementById("detailCategory");
    const detailSku = document.getElementById("detailSku");
    const detailSize = document.getElementById("detailSize");
    const detailPrice = document.getElementById("detailPrice");
    const detailStock = document.getElementById("detailStock");
    const detailAlert = document.getElementById("detailAlert");
    const detailTotal = document.getElementById("detailTotal");
    const detailStatus = document.getElementById("detailStatus");
    const detailDateAdded = document.getElementById("detailDateAdded");
    const detailUpdated = document.getElementById("detailUpdated");

    let currentProductData = null;

    function openProductModal(productData) {
        currentProductData = productData;
        detailName.textContent = productData.name || "N/A";
        detailCategory.textContent = productData.category || "N/A";
        detailSku.textContent = productData.sku || "N/A";
        detailSize.textContent = productData.size || "N/A";
        detailPrice.textContent = productData.price || "₱0";
        detailStock.textContent = productData.stock || "0";
        detailAlert.textContent = productData.alert || "10";
        detailTotal.textContent = productData.total || "₱0.00";
        detailDateAdded.textContent = productData.dateAdded || "2026-01-08";
        detailUpdated.textContent = productData.updated || "2026-05-08";

        if (productData.image) {
            modalProductImage.src = productData.image;
        } else {
            modalProductImage.src = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22 viewBox=%220 0 200 200%22%3E%3Crect width=%22200%22 height=%22200%22 fill=%22%231a1714%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22monospace%22 font-size=%2214%22 fill=%22%235a4f45%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENO IMAGE%3C/text%3E%3C/svg%3E";
        }

        const status = productData.status || "In Stock";
        let statusClass = "status-instock";
        if (status === "Low Stock") statusClass = "status-low";
        else if (status === "Out of Stock") statusClass = "status-out";
        else if (status === "Expires Soon") statusClass = "status-expires";
        else if (status === "Expired") statusClass = "status-expired";
        detailStatus.innerHTML = `<span class="inv-status ${statusClass}">${status}</span>`;

        modalOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    function closeProductModal() {
        modalOverlay.classList.remove("active");
        document.body.style.overflow = "";
        currentProductData = null;
    }

    // View buttons
    document.querySelectorAll(".view-btn").forEach((btn) => {
        btn.addEventListener("click", function (e) {
            e.stopPropagation();
            try {
                const productData = JSON.parse(this.dataset.product);
                openProductModal(productData);
            } catch (error) {
                console.error("Error parsing product data:", error);
            }
        });
    });

    modalClose.addEventListener("click", closeProductModal);
    modalCloseBtn.addEventListener("click", closeProductModal);
    modalOverlay.addEventListener("click", function (e) {
        if (e.target === this) closeProductModal();
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && modalOverlay.classList.contains("active")) {
            closeProductModal();
        }
    });

    // Edit button in product details modal - opens edit modal
    modalEditBtn.addEventListener("click", function () {
        if (currentProductData) {
            closeProductModal();
            // Small delay to allow modal to close
            setTimeout(() => {
                openEditProductModal(currentProductData);
            }, 300);
        }
    });

    // Delete button in product details modal - opens delete confirmation
    modalDeleteBtn.addEventListener("click", function () {
        if (currentProductData) {
            closeProductModal();
            setTimeout(() => {
                openDeleteProductModal(currentProductData);
            }, 300);
        }
    });

    // ============================================
    // SEARCH & FILTERS
    // ============================================

    const searchInput = document.querySelector(".inventory-search-filters .search-input");
    const categoryFilter = document.querySelector(".inventory-search-filters .filter-group .filter-select:first-of-type");
    const statusFilter = document.querySelector(".inventory-search-filters .filter-group .filter-select:last-of-type");

    function filterTable() {
        const query = searchInput ? searchInput.value.toLowerCase() : "";
        const category = categoryFilter ? categoryFilter.value : "All Categories";
        const status = statusFilter ? statusFilter.value : "All Status";

        document.querySelectorAll(".inventory-table tbody tr").forEach((row) => {
            const text = row.textContent.toLowerCase();
            const rowCategory = row.querySelector("td:nth-child(2)")?.textContent || "";
            const rowStatus = row.querySelector(".inv-status")?.textContent || "";
            let show = true;
            if (query && !text.includes(query)) show = false;
            if (category !== "All Categories" && !rowCategory.includes(category)) show = false;
            if (status !== "All Status" && !rowStatus.includes(status)) show = false;
            row.style.display = show ? "" : "none";
        });
    }

    if (searchInput) searchInput.addEventListener("input", filterTable);
    if (categoryFilter) categoryFilter.addEventListener("change", filterTable);
    if (statusFilter) statusFilter.addEventListener("change", filterTable);

    // ============================================
    // PAGINATION
    // ============================================

    const paginationBtns = document.querySelectorAll(".inventory-pagination .pagination-btn:not(.prev-btn):not(.next-btn)");
    paginationBtns.forEach((btn) => {
        btn.addEventListener("click", function () {
            paginationBtns.forEach((b) => b.classList.remove("active"));
            this.classList.add("active");
        });
    });

    const prevBtn = document.querySelector(".inventory-pagination .prev-btn");
    const nextBtn = document.querySelector(".inventory-pagination .next-btn");
    let currentPage = 1;
    const totalPages = 5;

    function updatePagination() {
        paginationBtns.forEach((btn, index) => {
            btn.classList.toggle("active", index + 1 === currentPage);
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", function () {
            if (currentPage > 1) { currentPage--;
                updatePagination(); }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener("click", function () {
            if (currentPage < totalPages) { currentPage++;
                updatePagination(); }
        });
    }

    // ============================================
    // TABLE ACTION BUTTONS
    // ============================================

    // Edit buttons in table - opens edit modal
    document.querySelectorAll(".edit-btn").forEach((btn) => {
        btn.addEventListener("click", function (e) {
            e.stopPropagation();
            const row = this.closest("tr");
            if (row) {
                const productData = {
                    name: row.querySelector(".product-name")?.textContent || "N/A",
                    category: row.querySelector("td:nth-child(2)")?.textContent || "N/A",
                    sku: row.querySelector(".sku-code")?.textContent || "N/A",
                    size: row.querySelector("td:nth-child(4)")?.textContent || "N/A",
                    price: row.querySelector(".product-price")?.textContent || "₱0",
                    stock: row.querySelector(".stock-count")?.textContent || "0",
                    alert: "10",
                    status: row.querySelector(".inv-status")?.textContent || "In Stock",
                    dateAdded: "2026-01-08",
                    updated: "2026-05-08",
                };
                openEditProductModal(productData);
            }
        });
    });

    // Delete buttons in table - opens delete confirmation
    document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", function (e) {
            e.stopPropagation();
            const row = this.closest("tr");
            if (row) {
                const productData = {
                    name: row.querySelector(".product-name")?.textContent || "N/A",
                    sku: row.querySelector(".sku-code")?.textContent || "N/A",
                    category: row.querySelector("td:nth-child(2)")?.textContent || "N/A",
                    size: row.querySelector("td:nth-child(4)")?.textContent || "N/A",
                    price: row.querySelector(".product-price")?.textContent || "₱0",
                    stock: row.querySelector(".stock-count")?.textContent || "0",
                };
                openDeleteProductModal(productData);
            }
        });
    });

    // ============================================
    // ADD PRODUCT MODAL
    // ============================================

    const addModalOverlay = document.getElementById("addProductModalOverlay");
    const addModalClose = document.getElementById("addProductModalClose");
    const addModalCloseBtn = document.getElementById("addProductCloseBtn");
    const addModalSaveBtn = document.getElementById("addProductSaveBtn");
    const addProductForm = document.getElementById("addProductForm");
    const imageUploadArea = document.getElementById("imageUploadArea");
    const productImageUpload = document.getElementById("productImageUpload");

    function openAddProductModal() {
        console.log("Opening Add Product Modal");
        addModalOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
        addProductForm.reset();
        imageUploadArea.classList.remove("has-image");
        const preview = imageUploadArea.querySelector(".upload-preview");
        if (preview) preview.remove();
        const svg = imageUploadArea.querySelector("svg");
        const span = imageUploadArea.querySelector("span");
        const small = imageUploadArea.querySelector("small");
        if (svg) svg.style.display = "";
        if (span) span.style.display = "";
        if (small) small.style.display = "";
        document.getElementById("addProductName").value = "MISFIT Gothic Black Shirt";
        document.getElementById("addProductSku").value = "NB-TS-001";
        document.getElementById("addProductPrice").value = "550";
        document.getElementById("addProductLowStock").value = "10";
        document.getElementById("addProductStock").value = "100";
        document.getElementById("addProductExpiration").value = "2028-01-08";
        document.getElementById("addProductCategory").value = "shirt";
        document.getElementById("addProductSize").value = "M";
    }

    function closeAddProductModal() {
        addModalOverlay.classList.remove("active");
        document.body.style.overflow = "";
    }

    function resetUploadArea() {
        const preview = imageUploadArea.querySelector(".upload-preview");
        if (preview) preview.remove();
        const svg = imageUploadArea.querySelector("svg");
        const span = imageUploadArea.querySelector("span");
        const small = imageUploadArea.querySelector("small");
        if (svg) svg.style.display = "";
        if (span) span.style.display = "";
        if (small) small.style.display = "";
        imageUploadArea.classList.remove("has-image");
        productImageUpload.value = "";
    }

    productImageUpload.addEventListener("change", function (e) {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const existingPreview = imageUploadArea.querySelector(".upload-preview");
                if (existingPreview) existingPreview.remove();
                const svg = imageUploadArea.querySelector("svg");
                const span = imageUploadArea.querySelector("span");
                const small = imageUploadArea.querySelector("small");
                if (svg) svg.style.display = "none";
                if (span) span.style.display = "none";
                if (small) small.style.display = "none";
                const img = document.createElement("img");
                img.src = event.target.result;
                img.className = "upload-preview";
                img.alt = "Product preview";
                imageUploadArea.appendChild(img);
                imageUploadArea.classList.add("has-image");
            };
            reader.readAsDataURL(file);
        }
    });

    addModalClose.addEventListener("click", function () { closeAddProductModal();
        resetUploadArea(); });
    addModalCloseBtn.addEventListener("click", function () { closeAddProductModal();
        resetUploadArea(); });
    addModalOverlay.addEventListener("click", function (e) {
        if (e.target === this) { closeAddProductModal();
            resetUploadArea(); }
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && addModalOverlay.classList.contains("active")) {
            closeAddProductModal();
            resetUploadArea();
        }
    });

    addModalSaveBtn.addEventListener("click", function () {
        const productData = {
            name: document.getElementById("addProductName").value,
            sku: document.getElementById("addProductSku").value,
            price: document.getElementById("addProductPrice").value,
            lowStockAlert: document.getElementById("addProductLowStock").value,
            category: document.getElementById("addProductCategory").value,
            size: document.getElementById("addProductSize").value,
            stock: document.getElementById("addProductStock").value,
            expiration: document.getElementById("addProductExpiration").value,
        };
        if (!productData.name || !productData.sku) {
            showNotification("Please fill in all required fields", "error");
            return;
        }
        closeAddProductModal();
        resetUploadArea();
        showNotification('Product "' + productData.name + '" added successfully!', "success");
        console.log("New Product:", productData);
    });

    // Add Product button
    const addProductBtn = document.querySelector(".add-product-btn");
    if (addProductBtn) {
        addProductBtn.addEventListener("click", function (e) {
            e.preventDefault();
            openAddProductModal();
        });
    }

    // ============================================
    // EDIT PRODUCT MODAL
    // ============================================

    const editModalOverlay = document.getElementById("editProductModalOverlay");
    const editModalClose = document.getElementById("editProductModalClose");
    const editModalCloseBtn = document.getElementById("editProductCloseBtn");
    const editModalSaveBtn = document.getElementById("editProductSaveBtn");
    const editProductForm = document.getElementById("editProductForm");
    const editImageUploadArea = document.getElementById("editImageUploadArea");
    const editProductImageUpload = document.getElementById("editProductImageUpload");

    const editProductName = document.getElementById("editProductName");
    const editProductSku = document.getElementById("editProductSku");
    const editProductPrice = document.getElementById("editProductPrice");
    const editProductLowStock = document.getElementById("editProductLowStock");
    const editProductCategory = document.getElementById("editProductCategory");
    const editProductSize = document.getElementById("editProductSize");
    const editProductStock = document.getElementById("editProductStock");
    const editProductExpiration = document.getElementById("editProductExpiration");

    let currentEditProductData = null;

    function openEditProductModal(productData) {
        currentEditProductData = productData;
        editProductName.value = productData.name || "";
        editProductSku.value = productData.sku || "";
        editProductPrice.value = productData.price ? productData.price.replace(/[₱,]/g, '') : "";
        editProductLowStock.value = productData.alert || "10";
        editProductCategory.value = productData.category ? productData.category.toLowerCase() : "shirt";
        editProductSize.value = productData.size || "M";
        editProductStock.value = productData.stock || "0";
        editProductExpiration.value = productData.dateAdded || "2028-01-08";

        editImageUploadArea.classList.remove("has-image");
        const preview = editImageUploadArea.querySelector(".upload-preview");
        if (preview) preview.remove();
        const svg = editImageUploadArea.querySelector("svg");
        const span = editImageUploadArea.querySelector("span");
        const small = editImageUploadArea.querySelector("small");
        if (svg) svg.style.display = "";
        if (span) span.style.display = "";
        if (small) small.style.display = "";
        editProductImageUpload.value = "";

        editModalOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    function closeEditProductModal() {
        editModalOverlay.classList.remove("active");
        document.body.style.overflow = "";
        currentEditProductData = null;
    }

    function resetEditUploadArea() {
        const preview = editImageUploadArea.querySelector(".upload-preview");
        if (preview) preview.remove();
        const svg = editImageUploadArea.querySelector("svg");
        const span = editImageUploadArea.querySelector("span");
        const small = editImageUploadArea.querySelector("small");
        if (svg) svg.style.display = "";
        if (span) span.style.display = "";
        if (small) small.style.display = "";
        editImageUploadArea.classList.remove("has-image");
        editProductImageUpload.value = "";
    }

    editProductImageUpload.addEventListener("change", function (e) {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const existingPreview = editImageUploadArea.querySelector(".upload-preview");
                if (existingPreview) existingPreview.remove();
                const svg = editImageUploadArea.querySelector("svg");
                const span = editImageUploadArea.querySelector("span");
                const small = editImageUploadArea.querySelector("small");
                if (svg) svg.style.display = "none";
                if (span) span.style.display = "none";
                if (small) small.style.display = "none";
                const img = document.createElement("img");
                img.src = event.target.result;
                img.className = "upload-preview";
                img.alt = "Product preview";
                editImageUploadArea.appendChild(img);
                editImageUploadArea.classList.add("has-image");
            };
            reader.readAsDataURL(file);
        }
    });

    editModalClose.addEventListener("click", function () { closeEditProductModal();
        resetEditUploadArea(); });
    editModalCloseBtn.addEventListener("click", function () { closeEditProductModal();
        resetEditUploadArea(); });
    editModalOverlay.addEventListener("click", function (e) {
        if (e.target === this) { closeEditProductModal();
            resetEditUploadArea(); }
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && editModalOverlay.classList.contains("active")) {
            closeEditProductModal();
            resetEditUploadArea();
        }
    });

    editModalSaveBtn.addEventListener("click", function () {
        const productData = {
            name: editProductName.value,
            sku: editProductSku.value,
            price: editProductPrice.value,
            lowStockAlert: editProductLowStock.value,
            category: editProductCategory.value,
            size: editProductSize.value,
            stock: editProductStock.value,
            expiration: editProductExpiration.value,
        };
        if (!productData.name || !productData.sku) {
            showNotification("Please fill in all required fields", "error");
            return;
        }
        closeEditProductModal();
        resetEditUploadArea();
        showNotification('Product "' + productData.name + '" updated successfully!', "success");
        console.log("Updated Product:", productData);
    });

    // ============================================
    // ADJUST STOCK MODAL
    // ============================================

    const adjustModalOverlay = document.getElementById("adjustStockModalOverlay");
    const adjustModalClose = document.getElementById("adjustStockModalClose");
    const adjustModalCloseBtn = document.getElementById("adjustStockCloseBtn");
    const adjustModalSaveBtn = document.getElementById("adjustStockSaveBtn");
    const adjustStockForm = document.getElementById("adjustStockForm");

    const adjustStockProductName = document.getElementById("adjustStockProductName");
    const adjustStockType = document.getElementById("adjustStockType");
    const adjustStockQuantity = document.getElementById("adjustStockQuantity");
    const adjustStockReason = document.getElementById("adjustStockReason");
    const adjustStockNotes = document.getElementById("adjustStockNotes");

    function openAdjustStockModal(productData) {
        adjustStockProductName.value = productData.name || "N/A";
        adjustStockType.value = "+";
        adjustStockQuantity.value = "50";
        adjustStockReason.value = "Customer Return";
        adjustStockNotes.value = "Additional Notes......";
        adjustModalOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    function closeAdjustStockModal() {
        adjustModalOverlay.classList.remove("active");
        document.body.style.overflow = "";
    }

    adjustModalClose.addEventListener("click", closeAdjustStockModal);
    adjustModalCloseBtn.addEventListener("click", closeAdjustStockModal);
    adjustModalOverlay.addEventListener("click", function (e) {
        if (e.target === this) closeAdjustStockModal();
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && adjustModalOverlay.classList.contains("active")) {
            closeAdjustStockModal();
        }
    });

    adjustModalSaveBtn.addEventListener("click", function () {
        const adjustmentData = {
            productName: adjustStockProductName.value,
            type: adjustStockType.value,
            quantity: adjustStockQuantity.value,
            reason: adjustStockReason.value,
            notes: adjustStockNotes.value,
        };
        if (!adjustmentData.quantity || parseInt(adjustmentData.quantity) <= 0) {
            showNotification("Please enter a valid quantity", "error");
            return;
        }
        closeAdjustStockModal();
        const typeText = adjustmentData.type === "+" ? "added to" : "removed from";
        showNotification('Stock ' + typeText + ' "' + adjustmentData.productName + '" successfully!', "success");
        console.log("Stock Adjustment:", adjustmentData);
    });

    // Adjust Stock button
    const adjustStockBtn = document.querySelector(".adjust-stock-btn");
    if (adjustStockBtn) {
        adjustStockBtn.addEventListener("click", function (e) {
            e.preventDefault();
            const firstRow = document.querySelector(".inventory-table tbody tr");
            if (firstRow) {
                const productData = {
                    name: firstRow.querySelector(".product-name")?.textContent || "N/A",
                };
                openAdjustStockModal(productData);
            } else {
                openAdjustStockModal({ name: "Sample Product" });
            }
        });
    }

    // ============================================
    // DELETE PRODUCT MODAL
    // ============================================

    const deleteModalOverlay = document.getElementById("deleteProductModalOverlay");
    const deleteModalClose = document.getElementById("deleteProductModalClose");
    const deleteModalCloseBtn = document.getElementById("deleteProductCloseBtn");
    const deleteModalConfirmBtn = document.getElementById("deleteProductConfirmBtn");
    const deleteProductName = document.getElementById("deleteProductName");
    const deleteProductSku = document.getElementById("deleteProductSku");

    let currentDeleteProductData = null;

    function openDeleteProductModal(productData) {
        currentDeleteProductData = productData;
        deleteProductName.textContent = productData.name || "N/A";
        deleteProductSku.textContent = productData.sku || "N/A";
        deleteModalOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    function closeDeleteProductModal() {
        deleteModalOverlay.classList.remove("active");
        document.body.style.overflow = "";
        currentDeleteProductData = null;
    }

    deleteModalClose.addEventListener("click", closeDeleteProductModal);
    deleteModalCloseBtn.addEventListener("click", closeDeleteProductModal);
    deleteModalOverlay.addEventListener("click", function (e) {
        if (e.target === this) closeDeleteProductModal();
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && deleteModalOverlay.classList.contains("active")) {
            closeDeleteProductModal();
        }
    });

    deleteModalConfirmBtn.addEventListener("click", function () {
        if (currentDeleteProductData) {
            closeDeleteProductModal();
            showNotification('Product "' + currentDeleteProductData.name + '" deleted successfully!', "success");
            console.log("Deleted Product:", currentDeleteProductData);
            
            // Remove the row from the table
            const rows = document.querySelectorAll(".inventory-table tbody tr");
            rows.forEach((row) => {
                const name = row.querySelector(".product-name")?.textContent || "";
                const sku = row.querySelector(".sku-code")?.textContent || "";
                if (name === currentDeleteProductData.name && sku === currentDeleteProductData.sku) {
                    row.remove();
                }
            });
            
            // Update the stats if needed
            updateStats();
        }
    });

    // ============================================
    // UPDATE STATS FUNCTION
    // ============================================

    function updateStats() {
        const rows = document.querySelectorAll(".inventory-table tbody tr");
        const totalProducts = rows.length;
        const totalProductsDisplay = document.querySelector(".inv-stat-card .inv-stat-value");
        if (totalProductsDisplay) {
            // This would need to be more sophisticated in a real app
            // For now, just count visible rows
            let visibleCount = 0;
            rows.forEach(row => {
                if (row.style.display !== "none") visibleCount++;
            });
            // Update the stats display
            // This is simplified - in a real app you'd have proper data
        }
    }

    // ============================================
    // NOTIFICATIONS
    // ============================================

    function showNotification(message, type = "info") {
        const existing = document.querySelector(".pos-notification");
        if (existing) existing.remove();

        const notification = document.createElement("div");
        notification.className = `pos-notification pos-notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add("show");
        }, 10);

        setTimeout(() => {
            notification.classList.remove("show");
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
});