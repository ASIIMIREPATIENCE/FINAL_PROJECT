console.log('🔥 Deposit Scheme Validation Loaded - No alerts on load');

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

// Depositor form elements
const depositorForm = document.querySelector('form[action="/registerDepositor"]');
const fullName = document.querySelector('input[name="fullName"]');
const phoneNumber = document.querySelector('input[name="phoneNumber"]');
const nin = document.querySelector('input[name="nin"]');
const employer = document.querySelector('input[name="employer"]');

// Payment form elements
const paymentForm = document.querySelector('form[action="/recordDeposit"]');
const depositorSelect = paymentForm ? paymentForm.querySelector('select[name="depositorId"]') : null;
const amountPaid = paymentForm ? paymentForm.querySelector('input[name="amountPaid"]') : null;
const paymentMethodSelect = paymentForm ? paymentForm.querySelector('select[name="paymentMethod"]') : null;

// ============================================================
// HELPER FUNCTIONS FOR VALIDATION
// ============================================================

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
    
    // Shake animation
    field.classList.add('shake');
    setTimeout(() => field.classList.remove('shake'), 300);
}

function showFieldSuccess(field) {
    if (!field) return;
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');
    const errorDiv = field.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains('invalid-feedback')) {
        errorDiv.style.display = 'none';
    }
}

function clearFieldError(field) {
    if (!field) return;
    field.classList.remove('is-invalid', 'is-valid');
    const errorDiv = field.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains('invalid-feedback')) {
        errorDiv.style.display = 'none';
    }
}

function clearAllErrors() {
    const allFields = [fullName, phoneNumber, nin, employer, depositorSelect, amountPaid, paymentMethodSelect];
    allFields.forEach(field => {
        if (field) clearFieldError(field);
    });
}

function showNotification(message, isError = true) {
    const alertContainer = document.querySelector('.main-content');
    if (!alertContainer) return;
    
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${isError ? 'danger' : 'success'} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        <i class="bi bi-${isError ? 'exclamation-triangle-fill' : 'check-circle-fill'} me-2"></i>
        <strong>${isError ? 'Error' : 'Success'}:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.insertBefore(alertDiv, alertContainer.firstChild);
    setTimeout(() => alertDiv.remove(), 5000);
}

// ============================================================
// CART FUNCTIONS
// ============================================================

if (itemSelect) {
    itemSelect.addEventListener('change', function() {
        const selected = itemSelect.options[itemSelect.selectedIndex];
        if (selected && selected.dataset.price) {
            itemPrice.value = selected.dataset.price;
        }
        if (itemSelect.value) {
            showFieldSuccess(itemSelect);
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
        // Validate item selection
        if (!itemSelect.value) {
            showFieldError(itemSelect, 'Please select an item');
            return;
        } else {
            showFieldSuccess(itemSelect);
        }
        
        const unitPrice = parseFloat(itemPrice.value);
        if (isNaN(unitPrice) || unitPrice <= 0) {
            showFieldError(itemPrice, 'Please enter a valid unit price');
            return;
        } else {
            showFieldSuccess(itemPrice);
        }
        
        const quantity = parseInt(itemQty.value);
        if (isNaN(quantity) || quantity <= 0) {
            showFieldError(itemQty, 'Please enter a valid quantity');
            return;
        } else {
            showFieldSuccess(itemQty);
        }
        
        const selected = itemSelect.options[itemSelect.selectedIndex];
        const productName = selected.value;
        
        const existingIndex = itemsCart.findIndex(item => item.productName === productName);
        if (existingIndex !== -1) {
            itemsCart[existingIndex].quantity += quantity;
        } else {
            itemsCart.push({ productName, quantity, unitPrice });
        }
        
        renderItemsCart();
        calculateTotals();
        itemQty.value = 1;
        itemSelect.value = '';
        itemPrice.value = '';
        
        // Clear validation styles
        itemSelect.classList.remove('is-invalid', 'is-valid');
        itemQty.classList.remove('is-invalid', 'is-valid');
        itemPrice.classList.remove('is-invalid', 'is-valid');
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
        itemsCartBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No items added</td></tr>';
        if (cartItemsInput) cartItemsInput.value = '';
        calculateTotals();
        return;
    }
    
    let html = '';
    for (let i = 0; i < itemsCart.length; i++) {
        const item = itemsCart[i];
        const subtotal = item.quantity * item.unitPrice;
        html += '<tr>' +
            '<td>' + escapeHtml(item.productName) + '</td>' +
            '<td>' + item.quantity + '</td>' +
            '<td>UGX ' + item.unitPrice.toLocaleString() + '</td>' +
            '<td>UGX ' + subtotal.toLocaleString() + '</td>' +
            '<td><button type="button" class="btn btn-sm btn-danger" onclick="removeItem(' + i + ')">Remove</button></td>' +
        '</tr>';
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

// Make removeItem available globally
window.removeItem = removeItem;

// ============================================================
// DEPOSITOR FORM VALIDATION
// ============================================================

let depositorFieldInteracted = {
    fullName: false,
    phoneNumber: false,
    nin: false
};

function validateDepositorField(field, showErrors = false) {
    if (!field) return true;
    
    switch(field.name) {
        case 'fullName':
            if (!field.value.trim()) {
                if (showErrors) showFieldError(field, 'Full name is required');
                return false;
            } else if (field.value.trim().length < 2) {
                if (showErrors) showFieldError(field, 'Name must be at least 2 characters');
                return false;
            } else {
                if (showErrors) showFieldSuccess(field);
                return true;
            }
            
        case 'phoneNumber':
            const phoneRegex = /^\+256[0-9]{9}$|^0[0-9]{9}$/;
            if (!field.value.trim()) {
                if (showErrors) showFieldError(field, 'Phone number is required');
                return false;
            } else if (!phoneRegex.test(field.value)) {
                if (showErrors) showFieldError(field, 'Use +256XXXXXXXXX or 0XXXXXXXXX');
                return false;
            } else {
                if (showErrors) showFieldSuccess(field);
                return true;
            }
            
        case 'nin':
            const ninRegex = /^(CF|CM)[0-9]{12}$/i;
            if (!field.value.trim()) {
                if (showErrors) showFieldError(field, 'NIN is required');
                return false;
            } else if (!ninRegex.test(field.value.toUpperCase())) {
                if (showErrors) showFieldError(field, 'NIN must be CFXXXXXXXXXXXX or CMXXXXXXXXXXXX');
                return false;
            } else {
                if (showErrors) showFieldSuccess(field);
                return true;
            }
            
        default:
            return true;
    }
}

function setupDepositorValidation(field) {
    if (!field) return;
    
    field.addEventListener('focus', () => {
        depositorFieldInteracted[field.name] = true;
    });
    
    field.addEventListener('input', () => {
        if (depositorFieldInteracted[field.name]) {
            validateDepositorField(field, true);
        }
    });
    
    field.addEventListener('blur', () => {
        if (depositorFieldInteracted[field.name]) {
            validateDepositorField(field, true);
        }
    });
}

// Setup depositor validation
if (fullName) setupDepositorValidation(fullName);
if (phoneNumber) setupDepositorValidation(phoneNumber);
if (nin) setupDepositorValidation(nin);

// Depositor form submission
if (depositorForm) {
    depositorForm.addEventListener('submit', function(e) {
        e.preventDefault();
        clearAllErrors();
        
        // Mark all fields as interacted
        depositorFieldInteracted.fullName = true;
        depositorFieldInteracted.phoneNumber = true;
        depositorFieldInteracted.nin = true;
        
        // Validate cart is not empty
        let isCartValid = true;
        if (itemsCart.length === 0) {
            showNotification('Please add at least one item to the cart');
            isCartValid = false;
        }
        
        // Validate all fields
        const isFullNameValid = validateDepositorField(fullName, true);
        const isPhoneValid = validateDepositorField(phoneNumber, true);
        const isNinValid = validateDepositorField(nin, true);
        
        const hasError = !(isFullNameValid && isPhoneValid && isNinValid) || !isCartValid;
        
        if (hasError) {
            const firstError = document.querySelector('.is-invalid');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.focus();
            }
            showNotification('Please fix the highlighted errors before submitting');
        } else {
            if (cartItemsInput) {
                cartItemsInput.value = JSON.stringify(itemsCart);
            }
            depositorForm.submit();
        }
    });
}

// ============================================================
// PAYMENT FORM VALIDATION
// ============================================================

let paymentFieldInteracted = {
    depositorId: false,
    amountPaid: false,
    paymentMethod: false
};

function validatePaymentField(field, showErrors = false) {
    if (!field) return true;
    
    switch(field.name) {
        case 'depositorId':
            if (!field.value) {
                if (showErrors) showFieldError(field, 'Please select a depositor');
                return false;
            } else {
                if (showErrors) showFieldSuccess(field);
                return true;
            }
            
        case 'amountPaid':
            const amount = parseFloat(field.value);
            if (!field.value || isNaN(amount) || amount < 1000) {
                if (showErrors) showFieldError(field, 'Amount must be at least UGX 1,000');
                return false;
            } else {
                if (showErrors) showFieldSuccess(field);
                return true;
            }
            
        case 'paymentMethod':
            if (!field.value) {
                if (showErrors) showFieldError(field, 'Please select payment method');
                return false;
            } else {
                if (showErrors) showFieldSuccess(field);
                return true;
            }
            
        default:
            return true;
    }
}

function setupPaymentValidation(field) {
    if (!field) return;
    
    field.addEventListener('focus', () => {
        paymentFieldInteracted[field.name] = true;
    });
    
    field.addEventListener('change', () => {
        if (paymentFieldInteracted[field.name]) {
            validatePaymentField(field, true);
        }
    });
    
    field.addEventListener('input', () => {
        if (paymentFieldInteracted[field.name]) {
            validatePaymentField(field, true);
        }
    });
}

// Setup payment validation
if (depositorSelect) setupPaymentValidation(depositorSelect);
if (amountPaid) setupPaymentValidation(amountPaid);
if (paymentMethodSelect) setupPaymentValidation(paymentMethodSelect);

// Payment form submission
if (paymentForm) {
    paymentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Clear previous errors
        if (depositorSelect) clearFieldError(depositorSelect);
        if (amountPaid) clearFieldError(amountPaid);
        if (paymentMethodSelect) clearFieldError(paymentMethodSelect);
        
        // Mark all fields as interacted
        paymentFieldInteracted.depositorId = true;
        paymentFieldInteracted.amountPaid = true;
        paymentFieldInteracted.paymentMethod = true;
        
        // Validate all fields
        const isDepositorValid = validatePaymentField(depositorSelect, true);
        const isAmountValid = validatePaymentField(amountPaid, true);
        const isPaymentMethodValid = validatePaymentField(paymentMethodSelect, true);
        
        const hasError = !(isDepositorValid && isAmountValid && isPaymentMethodValid);
        
        if (hasError) {
            const firstError = document.querySelector('.is-invalid');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.focus();
            }
            showNotification('Please fix the highlighted errors before submitting');
        } else {
            paymentForm.submit();
        }
    });
}

calculateTotals();
console.log('✅ Deposit scheme validation loaded - No alerts on load');