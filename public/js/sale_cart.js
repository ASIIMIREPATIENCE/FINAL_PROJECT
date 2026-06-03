// BLOCK ALL ALERTS
window.alert = function() { return false; };
console.log('✅ Validation script loaded - alerts blocked');

let cart = [];

const productSelect = document.getElementById('productName');
const qtyInput = document.getElementById('quantity');
const priceInput = document.getElementById('unitPrice');
const addBtn = document.getElementById('addToCart');
const cartBody = document.getElementById('cartBody');
const cartItemsInput = document.getElementById('cartItems');
const completeBtn = document.getElementById('completeSale');
const transportCheck = document.getElementById('addTransport');
const distanceInput = document.getElementById('distance');
const displaySubtotal = document.getElementById('displaySubtotal');
const displayTransport = document.getElementById('displayTransport');
const displayTotal = document.getElementById('displayTotal');
const customerName = document.getElementById('customerName');
const customerPhone = document.getElementById('customerPhone');
const paymentMethod = document.getElementById('paymentMethod');

// Auto-populate price
productSelect.addEventListener('change', function() {
    const selected = productSelect.options[productSelect.selectedIndex];
    if (selected && selected.dataset.price) {
        priceInput.value = selected.dataset.price;
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
    
    if (displaySubtotal) displaySubtotal.textContent = subtotal.toLocaleString();
    if (displayTransport) displayTransport.textContent = transportFee.toLocaleString();
    if (displayTotal) displayTotal.textContent = total.toLocaleString();
}

// Error display functions
function showFieldError(field, message) {
    if (!field) return;
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');
    
    let errorDiv = field.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains('invalid-feedback')) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    } else {
        errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        field.parentNode.insertBefore(errorDiv, field.nextSibling);
    }
}

function showFieldSuccess(field) {
    if (!field) return;
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');
    const errorMsg = field.nextElementSibling;
    if (errorMsg && errorMsg.classList.contains('invalid-feedback')) {
        errorMsg.style.display = 'none';
    }
}

function clearAllErrors() {
    document.querySelectorAll('.form-control, .form-select').forEach(field => {
        field.classList.remove('is-invalid', 'is-valid');
        const errorMsg = field.nextElementSibling;
        if (errorMsg && errorMsg.classList.contains('invalid-feedback')) {
            errorMsg.style.display = 'none';
        }
    });
}

// Add to cart
addBtn.addEventListener('click', function() {
    const selected = productSelect.options[productSelect.selectedIndex];
    
    if (!selected || !selected.value) {
        showFieldError(productSelect, 'Please select a product');
        return;
    }
    showFieldSuccess(productSelect);
    
    const unitPrice = parseFloat(priceInput.value);
    const quantity = parseInt(qtyInput.value);
    const maxStock = parseInt(selected.dataset.stock);
    
    if (isNaN(unitPrice) || unitPrice <= 0) {
        showFieldError(priceInput, 'Valid unit price required');
        return;
    }
    showFieldSuccess(priceInput);
    
    if (isNaN(quantity) || quantity <= 0) {
        showFieldError(qtyInput, 'Valid quantity required');
        return;
    }
    
    if (quantity > maxStock) {
        showFieldError(qtyInput, 'Only ' + maxStock + ' available');
        return;
    }
    showFieldSuccess(qtyInput);
    
    const existingIndex = cart.findIndex(item => item.productName === selected.value);
    if (existingIndex !== -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push({
            productName: selected.value,
            quantity: quantity,
            unitPrice: unitPrice
        });
    }
    
    renderCart();
    updateTotals();
    qtyInput.value = 1;
});

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
    updateTotals();
}

function renderCart() {
    if (cart.length === 0) {
        cartBody.innerHTML = '<td><td colspan="5" class="text-center">Cart is empty</td></tr>';
        cartItemsInput.value = JSON.stringify(cart);
        return;
    }
    
    let html = '';
    cart.forEach((item, i) => {
        const subtotal = item.quantity * item.unitPrice;
        html += `<tr>
            <td>${escapeHtml(item.productName)}</td>
            <td>${item.quantity}</td>
            <td>UGX ${item.unitPrice.toLocaleString()}</td>
            <td>UGX ${subtotal.toLocaleString()}</td>
            <td><button type="button" class="btn btn-sm btn-danger" onclick="removeFromCart(${i})">Remove</button></td>
        </tr>`;
    });
    cartBody.innerHTML = html;
    cartItemsInput.value = JSON.stringify(cart);
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// FORM SUBMISSION - NO ALERTS, JUST RED FIELDS
completeBtn.addEventListener('click', function(e) {
    e.preventDefault();
    clearAllErrors();
    
    let hasError = false;
    
    // Customer name
    if (!customerName.value.trim()) {
        showFieldError(customerName, 'Customer name is required');
        hasError = true;
    } else if (customerName.value.trim().length < 2) {
        showFieldError(customerName, 'Must be at least 2 characters');
        hasError = true;
    } else {
        showFieldSuccess(customerName);
    }
    
    // Phone
    const phoneRegex = /^\+256[0-9]{9}$|^0[0-9]{9}$/;
    if (!customerPhone.value.trim()) {
        showFieldError(customerPhone, 'Phone number is required');
        hasError = true;
    } else if (!phoneRegex.test(customerPhone.value)) {
        showFieldError(customerPhone, 'Use +256XXXXXXXXX or 0XXXXXXXXX');
        hasError = true;
    } else {
        showFieldSuccess(customerPhone);
    }
    
    // Payment
    if (!paymentMethod.value) {
        showFieldError(paymentMethod, 'Select payment method');
        hasError = true;
    } else {
        showFieldSuccess(paymentMethod);
    }
    
    // Cart
    if (cart.length === 0) {
        alert('Cart is empty'); 
        hasError = true;
    }
    
    if (!hasError) {
        document.getElementById('saleForm').submit();
    } else {
        const firstError = document.querySelector('.is-invalid');
        if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});

// Transport listeners
if (transportCheck) transportCheck.addEventListener('change', updateTotals);
if (distanceInput) distanceInput.addEventListener('input', updateTotals);

updateTotals();
window.removeFromCart = removeFromCart;