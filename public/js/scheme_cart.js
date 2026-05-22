let itemsCart = [];

const itemSelect = document.getElementById('itemSelect');
const itemQty = document.getElementById('itemQuantity');
const itemPrice = document.getElementById('itemPrice');
const addItemBtn = document.getElementById('addItemBtn');
const itemsCartBody = document.getElementById('itemsCartBody');
const itemsSubtotalSpan = document.getElementById('itemsSubtotal');
const transportFeeSpan = document.getElementById('transportFeeDisplay');
const totalAmountSpan = document.getElementById('totalAmount');
const cartItemsInput = document.getElementById('cartItems');
const needTransport = document.getElementById('needTransport');
const distanceInput = document.getElementById('distanceKm');

if (itemSelect) {
    itemSelect.addEventListener('change', function() {
        const selected = itemSelect.options[itemSelect.selectedIndex];
        if (selected && selected.dataset.price) {
            itemPrice.value = selected.dataset.price;
        }
    });
}

function calculateTotals() {
    const itemsSubtotal = itemsCart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const distance = parseInt(distanceInput ? distanceInput.value : 0) || 0;
    const needTrans = needTransport ? needTransport.checked : false;
    
    let transportFee = 0;
    if (needTrans && distance > 0) {
        const isFree = (itemsSubtotal >= 500000 && distance <= 10);
        if (!isFree) transportFee = 30000;
    }
    
    const total = itemsSubtotal + transportFee;
    
    if (itemsSubtotalSpan) itemsSubtotalSpan.textContent = itemsSubtotal.toLocaleString();
    if (transportFeeSpan) transportFeeSpan.textContent = transportFee.toLocaleString();
    if (totalAmountSpan) totalAmountSpan.textContent = total.toLocaleString();
}

if (addItemBtn) {
    addItemBtn.addEventListener('click', function() {
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
        calculateTotals();
        itemQty.value = 1;
    });
}

function removeItem(index) {
    itemsCart.splice(index, 1);
    renderItemsCart();
    calculateTotals();
}

function renderItemsCart() {
    if (!itemsCartBody) return;
    
    if (itemsCart.length === 0) {
        itemsCartBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No items added<\/td><\/tr>';
        if (cartItemsInput) cartItemsInput.value = '';
        calculateTotals();
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
    if (cartItemsInput) cartItemsInput.value = JSON.stringify(itemsCart);
    calculateTotals();
}

if (needTransport) {
    needTransport.addEventListener('change', calculateTotals);
}
if (distanceInput) {
    distanceInput.addEventListener('input', calculateTotals);
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

calculateTotals();