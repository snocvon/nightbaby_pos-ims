document.addEventListener('DOMContentLoaded', function () {
    var discounts = readDiscounts();
    var table = document.getElementById('discountsTableBody');
    var modal = document.getElementById('discountModal');
    var form = document.getElementById('discountForm');

    function readDiscounts() {
        try { return JSON.parse(localStorage.getItem('nb_discounts') || '[]'); } catch (error) { return []; }
    }

    function saveDiscounts() {
        localStorage.setItem('nb_discounts', JSON.stringify(discounts));
    }

    function populateDiscountTargets() {
        var targetList = document.getElementById('discountTargets');
        if (!targetList || typeof getProducts !== 'function') return;
        var targets = [];
        getProducts().forEach(function (product) {
            [product.name, product.category, product.subcategory].forEach(function (target) {
                if (target && targets.indexOf(target) === -1) targets.push(target);
            });
        });
        targetList.innerHTML = targets.sort().map(function (target) {
            return '<option value="' + escapeHtml(target) + '"></option>';
        }).join('');
    }

    function getStatus(discount) {
        var today = new Date().toISOString().slice(0, 10);
        if (today < discount.startDate) return 'Scheduled';
        if (today > discount.endDate) return 'Expired';
        return 'Active';
    }

    function render() {
        if (!discounts.length) {
            table.innerHTML = '<tr><td colspan="7">No discounts found.</td></tr>';
            return;
        }
        table.innerHTML = discounts.map(function (discount) {
            var state = getStatus(discount);
            return '<tr><td>' + escapeHtml(discount.name) + '</td>' +
                '<td>' + escapeHtml(discount.category) + '</td>' +
                '<td>' + Number(discount.percent) + '%</td>' +
                '<td>' + discount.startDate + '</td><td>' + discount.endDate + '</td>' +
                '<td><span class="status-badge status-' + state.toLowerCase() + '">' + state + '</span></td>' +
                '<td><div class="action-group"><button class="icon-btn" data-edit="' + discount.id + '" title="Edit" aria-label="Edit discount">&#9998;</button>' +
                '<button class="icon-btn danger" data-delete="' + discount.id + '" title="Delete" aria-label="Delete discount">&#10005;</button></div></td></tr>';
        }).join('');
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>'"]/g, function (character) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
        });
    }

    function open(discount) {
        form.reset();
        document.getElementById('editingDiscountId').value = discount ? discount.id : '';
        document.getElementById('discountModalTitle').textContent = discount ? 'Edit Discount' : 'Add Discount';
        document.getElementById('discountError').textContent = '';
        if (discount) {
            document.getElementById('discountName').value = discount.name;
            document.getElementById('discountCategory').value = discount.category;
            document.getElementById('discountPercent').value = discount.percent;
            document.getElementById('discountStart').value = discount.startDate;
            document.getElementById('discountEnd').value = discount.endDate;
        }
        modal.hidden = false;
        modal.classList.add('active');
    }

    function close() {
        modal.hidden = true;
        modal.classList.remove('active');
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        var start = document.getElementById('discountStart').value;
        var end = document.getElementById('discountEnd').value;
        var percent = Number(document.getElementById('discountPercent').value);
        var error = document.getElementById('discountError');
        if (!start || !end || end < start || percent < 1 || percent > 100) {
            error.textContent = 'Check the dates and discount percentage.';
            return;
        }
        var id = document.getElementById('editingDiscountId').value;
        var discount = {
            id: id || Date.now(),
            name: document.getElementById('discountName').value.trim(),
            category: document.getElementById('discountCategory').value.trim(),
            percent: percent,
            startDate: start,
            endDate: end
        };
        var index = discounts.findIndex(function (item) { return String(item.id) === String(id); });
        if (index >= 0) discounts[index] = discount;
        else discounts.push(discount);
        saveDiscounts();
        render();
        close();
    });

    table.addEventListener('click', function (event) {
        var edit = event.target.closest('[data-edit]');
        var remove = event.target.closest('[data-delete]');
        if (edit) open(discounts.find(function (item) { return String(item.id) === edit.dataset.edit; }));
        if (remove && confirm('Delete this discount?')) {
            discounts = discounts.filter(function (item) { return String(item.id) !== remove.dataset.delete; });
            saveDiscounts();
            render();
        }
    });

    document.getElementById('addDiscountButton').addEventListener('click', function () { open(null); });
    document.getElementById('closeDiscountModal').addEventListener('click', close);
    document.getElementById('cancelDiscountModal').addEventListener('click', close);
    var dataReady = typeof nbDataReady !== 'undefined' ? nbDataReady : Promise.resolve();
    dataReady.then(function () {
        populateDiscountTargets();
        render();
    });
});
