let itemsCart = [];
let confirmedGrandTotalValue = 0;

const itemSelect = document.getElementById('itemSelect');
const itemQty = document.getElementById('itemQuantity');
const itemPrice = document.getElementById('itemPrice');
const addItemBtn = document.getElementById('addItemBtn');
const itemsCartBody = document.getElementById('itemsCartBody');
const needTransport = document.getElementById('needTransport');
const distanceInput = document.getElementById('distanceKm');
const itemsSubtotalSpan = document.getElementById('itemsSubtotal');
const transportFeeSpan = document.getElementById('transportFee');
const grandTotalSpan = document.getElementById('grandTotal');
const cartItemsData = document.getElementById('cartItemsData');
const amountPaying = document.getElementById('amountPaying');
const depositorSelect = document.getElementById('depositorSelect');
const depositorIdHidden = document.getElementById('depositorIdHidden');
const confirmCartBtn = document.getElementById('confirmCartBtn');
const paymentSection = document.getElementById('paymentSection');
const confirmedGrandTotal = document.getElementById('confirmedGrandTotal');
const confirmedGrandTotalInput = document.getElementById('confirmedGrandTotalInput');

// Set hidden depositor ID when depositor is selected
if (depositorSelect) {
    depositorSelect.addEventListener('change', function() {
        if (depositorIdHidden) {
            depositorIdHidden.value = depositorSelect.value;
        }
    });
}

itemSelect.addEventListener('change', function() {
    const selected = itemSelect.options[itemSelect.selectedIndex];
    if (selected && selected.dataset.price) {
        itemPrice.value = selected.dataset.price;
    }
});

function updateTotals() {
    const itemsSubtotal = itemsCart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const distance = parseInt(distanceInput ? distanceInput.value : 0) || 0;
    const needTrans = needTransport ? needTransport.checked : false;
    
    let transportFee = 0;
    if (needTrans && distance > 0) {
        const isFree = (itemsSubtotal >= 500000 && distance <= 10);
        if (!isFree) transportFee = 30000;
    }
    
    const grandTotal = itemsSubtotal + transportFee;
    
    if (itemsSubtotalSpan) itemsSubtotalSpan.textContent = itemsSubtotal.toLocaleString();
    if (transportFeeSpan) transportFeeSpan.textContent = transportFee.toLocaleString();
    if (grandTotalSpan) grandTotalSpan.textContent = grandTotal.toLocaleString();
    
    if (amountPaying) {
        amountPaying.max = grandTotal;
        amountPaying.placeholder = 'Max: UGX ' + grandTotal.toLocaleString();
    }
}

addItemBtn.addEventListener('click', function() {
    if (depositorSelect && (!depositorSelect.value || depositorSelect.value === '')) {
        alert('Please select a depositor first');
        return;
    }
    
    const selected = itemSelect.options[itemSelect.selectedIndex];
    if (!selected || !selected.value) {
        alert('Please select an item');
        return;
    }
    
    const productName = selected.value;
    const unitPrice = parseFloat(itemPrice.value);
    const quantity = parseInt(itemQty.value);
    
    if (isNaN(unitPrice) || unitPrice <= 0) {
        alert('Please enter a valid unit price');
        return;
    }
    
    if (isNaN(quantity) || quantity <= 0) {
        alert('Please enter a valid quantity');
        return;
    }
    
    const existingIndex = itemsCart.findIndex(item => item.productName === productName);
    if (existingIndex !== -1) {
        itemsCart[existingIndex].quantity += quantity;
    } else {
        itemsCart.push({ productName, quantity, unitPrice });
    }
    
    renderItemsCart();
    updateTotals();
    itemQty.value = 1;
});

function removeItem(index) {
    itemsCart.splice(index, 1);
    renderItemsCart();
    updateTotals();
}

function renderItemsCart() {
    if (itemsCart.length === 0) {
        itemsCartBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No items added<\/td><\/tr>';
        cartItemsData.value = '';
        return;
    }
    
    let html = '';
    for (let i = 0; i < itemsCart.length; i++) {
        const item = itemsCart[i];
        const subtotal = item.quantity * item.unitPrice;
        html += '<tr>' +
            '<td>' + escapeHtml(item.productName) + '<\/td>' +
            '<td>' + item.quantity + '<\/td>' +
            '<td>UGX ' + item.unitPrice.toLocaleString() + '<\/td>' +
            '<td>UGX ' + subtotal.toLocaleString() + '<\/td>' +
            '<td><button type="button" class="btn btn-sm btn-danger" onclick="removeItem(' + i + ')">Remove<\/button><\/td>' +
        '<\/tr>';
    }
    itemsCartBody.innerHTML = html;
    cartItemsData.value = JSON.stringify(itemsCart);
}

// Confirm Cart Button
if (confirmCartBtn) {
    confirmCartBtn.addEventListener('click', function() {
        if (itemsCart.length === 0) {
            alert('Please add at least one item to cart before confirming');
            return;
        }
        
        if (!depositorSelect || !depositorSelect.value) {
            alert('Please select a depositor first');
            return;
        }
        
        const grandTotalText = grandTotalSpan.textContent;
        const grandTotal = parseInt(grandTotalText.replace(/[^0-9]/g, '')) || 0;
        
        if (grandTotal <= 0) {
            alert('Please add items to cart first');
            return;
        }
        
        // Store confirmed grand total
        confirmedGrandTotalValue = grandTotal;
        
        // Show payment section
        if (paymentSection) paymentSection.style.display = 'block';
        if (confirmedGrandTotal) confirmedGrandTotal.textContent = grandTotal.toLocaleString();
        if (confirmedGrandTotalInput) confirmedGrandTotalInput.value = grandTotal;
        
        // Update the amount owed display
        const amountOwedSpan = document.getElementById('amountOwedDisplay');
        if (amountOwedSpan) amountOwedSpan.textContent = grandTotal.toLocaleString();
        
        // Scroll to payment section
        paymentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Disable add button to prevent changes after confirmation
        addItemBtn.disabled = true;
        addItemBtn.style.opacity = '0.5';
        addItemBtn.title = 'Cart confirmed, please proceed to payment or reset';
        
        // Show reset button if needed
        if (!document.getElementById('resetCartBtn')) {
            const resetBtn = document.createElement('button');
            resetBtn.id = 'resetCartBtn';
            resetBtn.type = 'button';
            resetBtn.className = 'btn btn-secondary mt-2';
            resetBtn.style.width = '100%';
            resetBtn.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i>RESET CART';
            resetBtn.onclick = function() {
                itemsCart = [];
                renderItemsCart();
                updateTotals();
                confirmedGrandTotalValue = 0;
                addItemBtn.disabled = false;
                addItemBtn.style.opacity = '1';
                paymentSection.style.display = 'none';
                if (confirmedGrandTotalInput) confirmedGrandTotalInput.value = '';
                if (confirmedGrandTotal) confirmedGrandTotal.textContent = '0';
                const amountOwedSpan = document.getElementById('amountOwedDisplay');
                if (amountOwedSpan) amountOwedSpan.textContent = '0';
                this.remove();
            };
            confirmCartBtn.parentElement.parentElement.appendChild(resetBtn);
        }
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Validate before submit
const recordForm = document.querySelector('form[action="/recordDepositWithItems"]');
if (recordForm) {
    recordForm.addEventListener('submit', function(e) {
        const amount = parseFloat(document.getElementById('amountPaying').value);
        const grandTotal = confirmedGrandTotalValue;
        
        if (isNaN(amount) || amount <= 0) {
            e.preventDefault();
            alert('Please enter a valid amount to pay');
            return false;
        }
        
        if (amount > grandTotal) {
            e.preventDefault();
            alert('Amount paid cannot exceed Grand Total of UGX ' + grandTotal.toLocaleString());
            return false;
        }
        
        if (!depositorSelect || !depositorSelect.value) {
            e.preventDefault();
            alert('Please select a depositor');
            return false;
        }
    });
}

// Also reset when depositor changes
if (depositorSelect) {
    depositorSelect.addEventListener('change', function() {
        itemsCart = [];
        renderItemsCart();
        updateTotals();
        confirmedGrandTotalValue = 0;
        if (paymentSection) paymentSection.style.display = 'none';
        addItemBtn.disabled = false;
        addItemBtn.style.opacity = '1';
        const resetBtn = document.getElementById('resetCartBtn');
        if (resetBtn) resetBtn.remove();
        if (confirmedGrandTotalInput) confirmedGrandTotalInput.value = '';
        if (confirmedGrandTotal) confirmedGrandTotal.textContent = '0';
    });
}

if (needTransport) needTransport.addEventListener('change', updateTotals);
if (distanceInput) distanceInput.addEventListener('input', updateTotals);

updateTotals();