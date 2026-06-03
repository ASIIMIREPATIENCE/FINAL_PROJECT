let cart = [];

const productSelect = document.getElementById('productSelect');
const qtyInput = document.getElementById('quantity');
const priceInput = document.getElementById('unitPrice');
const addBtn = document.getElementById('addItem');
const cartContainer = document.getElementById('cartContainer');
const editSaleForm = document.getElementById('editSaleForm');
const transportCheck = document.getElementById('addTransport');
const distanceInput = document.getElementById('distance');

// to load existing cart items 
document.querySelectorAll('.cart-item').forEach(item => {
    const hiddenInput = item.querySelector('input[type="hidden"]');
    if (hiddenInput) {
        try {
            const parsed = JSON.parse(hiddenInput.value);
            cart.push(parsed);
        } catch(e) {
            console.error('Error parsing cart item:', e);
        }
    }
});

productSelect.addEventListener('change', function() {
    const selected = productSelect.options[productSelect.selectedIndex];
    const price = selected.getAttribute('data-price');
    if (price) {
        priceInput.value = price;
    } else {
        priceInput.value = '';
    }
});

function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const distance = parseInt(distanceInput ? distanceInput.value : 0) || 0;
    const needTransport = transportCheck ? transportCheck.checked : false;
    
    let transportFee = 0;
    if (needTransport && distance > 0) {
        const isFree = (subtotal >= 500000 && distance <= 10);
        if (!isFree) transportFee = 30000;
    }
    
    const total = subtotal + transportFee;
    
    // display totals
    const displaySubtotal = document.getElementById('displaySubtotal');
    const displayTransport = document.getElementById('displayTransport');
    const displayTotal = document.getElementById('displayTotal');
    
    if (displaySubtotal) displaySubtotal.textContent = subtotal.toLocaleString();
    if (displayTransport) displayTransport.textContent = transportFee.toLocaleString();
    if (displayTotal) displayTotal.textContent = total.toLocaleString();
}

addBtn.addEventListener('click', function() {
    const selected = productSelect.options[productSelect.selectedIndex];
    
    if (!selected || !selected.value) {
        alert('Please select a product');
        return;
    }
    
    const productName = selected.value;
    const unitPrice = parseFloat(priceInput.value);
    const quantity = parseInt(qtyInput.value);
    const maxStock = parseInt(selected.getAttribute('data-stock'));
    
    if (isNaN(unitPrice) || unitPrice <= 0) {
        alert('Please enter a valid unit price');
        return;
    }
    
    if (isNaN(quantity) || quantity <= 0) {
        alert('Please enter a valid quantity');
        return;
    }
    
    if (quantity > maxStock) {
        alert('Only ' + maxStock + ' items available in stock');
        return;
    }
    
    const existingIndex = cart.findIndex(item => item.productName === productName);
    
    if (existingIndex !== -1) {
        const newQty = cart[existingIndex].quantity + quantity;
        if (newQty > maxStock) {
            alert('Total quantity would exceed stock (' + maxStock + ')');
            return;
        }
        cart[existingIndex].quantity = newQty;
    } else {
        cart.push({
            productName: productName,
            quantity: quantity,
            unitPrice: unitPrice
        });
    }
    
    updateCartDisplay();
    updateTotals();
    qtyInput.value = 1;
    productSelect.value = '';
    priceInput.value = '';
});

function removeItem(button) {
    const itemDiv = button.closest('.cart-item');
    const index = Array.from(itemDiv.parentElement.children).indexOf(itemDiv);
    cart.splice(index, 1);
    updateCartDisplay();
    updateTotals();
}

function escapeJsonString(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function updateCartDisplay() {
    if (!cartContainer) return;
    
    cartContainer.innerHTML = '';
    
    cart.forEach((item, index) => {
        const subtotal = item.quantity * item.unitPrice;
        const escapedName = escapeJsonString(item.productName);
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
            <input type="hidden" name="cartItems" value='{"productName":"${escapedName}","quantity":${item.quantity},"unitPrice":${item.unitPrice}}'>
            <div class="row align-items-center">
                <div class="col-md-5">
                    <strong>${escapeHtml(item.productName)}</strong>
                </div>
                <div class="col-md-2">
                    Qty: ${item.quantity}
                </div>
                <div class="col-md-3">
                    UGX ${item.unitPrice.toLocaleString()} = UGX ${subtotal.toLocaleString()}
                </div>
                <div class="col-md-2">
                    <button type="button" class="btn-remove-item" onclick="removeItem(this)">Remove</button>
                </div>
            </div>
        `;
        cartContainer.appendChild(itemDiv);
    });
    
    if (cart.length === 0) {
        cartContainer.innerHTML = '<div class="alert alert-info">No items in cart</div>';
    }
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

if (transportCheck) transportCheck.addEventListener('change', updateTotals);
if (distanceInput) distanceInput.addEventListener('input', updateTotals);

// Before form submit, ensure cart data is properly formatted
if (editSaleForm) {
    editSaleForm.addEventListener('submit', function(e) {
        // Remove any existing cartItems inputs that might be malformed
        const existingInputs = document.querySelectorAll('input[name="cartItems"]');
        existingInputs.forEach(input => input.remove());
        
        // Add fresh properly formatted cart items
        cart.forEach(item => {
            const escapedName = escapeJsonString(item.productName);
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'cartItems';
            input.value = JSON.stringify({
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice
            });
            editSaleForm.appendChild(input);
        });
    });
}

updateTotals();
updateCartDisplay();