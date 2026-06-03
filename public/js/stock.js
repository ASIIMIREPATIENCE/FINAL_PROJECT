
// View transaction details
function viewTransactionDetails(transactionId) {
   window.location.href = `/editTransactionForm/${transactionId}`;
}

// Edit transaction 
function editTransaction(transactionId) {
    window.location.href = `/editTransactionForm/${transactionId}`;
}

// Delete transaction
function deleteTransaction(transactionId) {
    if (confirm('⚠️ WARNING: Delete this transaction? This will update your stock levels.')) {
        fetch(`/deleteTransaction/${transactionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Transaction deleted, stock updated!', false);
                setTimeout(() => location.reload(), 1500);
            } else {
                showNotification('Error: ' + data.message);
            }
        })
        .catch(error => {
            showNotification('Error deleting transaction');
        });
    }
}


// STOCK FORM VALIDATION 

// DOM Elements
const form = document.getElementById('stockForm');
const productName = document.getElementById('productName');
const category = document.getElementById('category');
const quantity = document.getElementById('quantity');
const costPrice = document.getElementById('costPrice');
const sellingPrice = document.getElementById('sellingPrice');
const supplierName = document.getElementById('supplierName');
const supplierEmail = document.getElementById('supplierEmail');
const supplierPhone = document.getElementById('supplierPhone');
const supplierCompany = document.getElementById('supplierCompany');
const reorderLevel = document.getElementById('reorderLevel');
const paymentMethod = document.getElementById('paymentMethod');

// Track if field has been interacted with
let touchedFields = {
    productName: false,
    category: false,
    quantity: false,
    costPrice: false,
    sellingPrice: false,
    supplierName: false,
    supplierEmail: false,
    supplierPhone: false,
    supplierCompany: false,
    reorderLevel: false,
    paymentMethod: false
};

// Helper functions
function showFieldError(field, message) {
    if (!field) return;
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');
    
    let errorDiv = field.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains('invalid-feedback')) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    
    // Shake animation only on submit
    if (window.isSubmitting) {
        field.classList.add('shake');
        setTimeout(() => field.classList.remove('shake'), 300);
    }
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
    const allFields = document.querySelectorAll('.form-control, .form-select');
    allFields.forEach(field => {
        field.classList.remove('is-invalid', 'is-valid');
        const errorDiv = field.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('invalid-feedback')) {
            errorDiv.style.display = 'none';
        }
    });
}

function showNotification(message, isError = true) {
    const alertContainer = document.getElementById('alertContainer');
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
    alertContainer.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}


function validateField(field, showErrors = false) {
    const fieldName = field.id;
    
    switch(fieldName) {
        case 'productName':
            if (!field.value.trim()) {
                if (showErrors) showFieldError(field, 'Product name is required');
                return false;
            } else if (field.value.trim().length < 2) {
                if (showErrors) showFieldError(field, 'Product name must be at least 2 characters');
                return false;
            } else {
                if (showErrors) showFieldSuccess(field);
                return true;
            }
            
        case 'category':
            if (!field.value) {
                if (showErrors) showFieldError(field, 'Please select a category');
                return false;
            } else {
                if (showErrors) showFieldSuccess(field);
                return true;
            }
            
        case 'quantity':
            const qty = parseInt(field.value);
            if (!field.value || isNaN(qty) || qty < 1) {
                if (showErrors) showFieldError(field, 'Quantity must be at least 1');
                return false;
            } else {
                if (showErrors) showFieldSuccess(field);
                return true;
            }
            
        case 'costPrice':
            const cp = parseFloat(field.value);
            if (!field.value || isNaN(cp) || cp <= 0) {
                if (showErrors) showFieldError(field, 'Cost price must be greater than 0');
                return false;
            } else {
                if (showErrors) showFieldSuccess(field);
                return true;
            }
            
        case 'sellingPrice':
            const cost = parseFloat(costPrice ? costPrice.value : 0);
            const sp = parseFloat(field.value);
            if (!field.value || isNaN(sp) || sp <= cost) {
                if (showErrors) showFieldError(field, 'Selling price must be greater than cost price');
                return false;
            } else {
                if (showErrors) showFieldSuccess(field);
                return true;
            }
            
        case 'supplierName':
            if (!field.value.trim()) {
                if (showErrors) showFieldError(field, 'Supplier name is required');
                return false;
            } else if (field.value.trim().length < 2) {
                if (showErrors) showFieldError(field, 'Supplier name must be at least 2 characters');
                return false;
            } else {
                if (showErrors) showFieldSuccess(field);
                return true;
            }
            
        case 'supplierEmail':
            if (field.value.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(field.value)) {
                    if (showErrors) showFieldError(field, 'Enter a valid email address');
                    return false;
                } else {
                    if (showErrors) showFieldSuccess(field);
                    return true;
                }
            }
            return true; 
            
        case 'supplierPhone':
            if (field.value.trim() && field.value !== '+256') {
                const phoneRegex = /^\+256[0-9]{9}$|^0[0-9]{9}$/;
                if (!phoneRegex.test(field.value)) {
                    if (showErrors) showFieldError(field, 'Use +256XXXXXXXXX or 0XXXXXXXXX');
                    return false;
                } else {
                    if (showErrors) showFieldSuccess(field);
                    return true;
                }
            }
            return true; 
            
        case 'supplierCompany':
            if (!field.value.trim()) {
                if (showErrors) showFieldError(field, 'Supplier company is required');
                return false;
            } else if (field.value.trim().length < 2) {
                if (showErrors) showFieldError(field, 'Company name must be at least 2 characters');
                return false;
            } else {
                if (showErrors) showFieldSuccess(field);
                return true;
            }
            
        case 'reorderLevel':
            const reorder = parseInt(field.value);
            if (!field.value || isNaN(reorder) || reorder < 1) {
                if (showErrors) showFieldError(field, 'Reorder level must be at least 1');
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

// Real-time validation

if (productName) {
    productName.addEventListener('focus', () => {
        touchedFields.productName = true;
    });
    productName.addEventListener('input', () => {
        if (touchedFields.productName) {
            validateField(productName, true);
        }
    });
    productName.addEventListener('blur', () => {
        if (touchedFields.productName) {
            validateField(productName, true);
        }
    });
}

if (category) {
    category.addEventListener('focus', () => {
        touchedFields.category = true;
    });
    category.addEventListener('change', () => {
        if (touchedFields.category) {
            validateField(category, true);
        }
    });
}

if (quantity) {
    quantity.addEventListener('focus', () => {
        touchedFields.quantity = true;
    });
    quantity.addEventListener('input', () => {
        if (touchedFields.quantity) {
            validateField(quantity, true);
        }
    });
}

if (costPrice) {
    costPrice.addEventListener('focus', () => {
        touchedFields.costPrice = true;
    });
    costPrice.addEventListener('input', () => {
        if (touchedFields.costPrice) {
            validateField(costPrice, true);
            
            if (touchedFields.sellingPrice && sellingPrice && sellingPrice.value) {
                validateField(sellingPrice, true);
            }
        }
    });
}

if (sellingPrice) {
    sellingPrice.addEventListener('focus', () => {
        touchedFields.sellingPrice = true;
    });
    sellingPrice.addEventListener('input', () => {
        if (touchedFields.sellingPrice) {
            validateField(sellingPrice, true);
        }
    });
}

if (supplierName) {
    supplierName.addEventListener('focus', () => {
        touchedFields.supplierName = true;
    });
    supplierName.addEventListener('input', () => {
        if (touchedFields.supplierName) {
            validateField(supplierName, true);
        }
    });
}

if (supplierEmail) {
    supplierEmail.addEventListener('focus', () => {
        touchedFields.supplierEmail = true;
    });
    supplierEmail.addEventListener('input', () => {
        if (touchedFields.supplierEmail) {
            validateField(supplierEmail, true);
        }
    });
}

if (supplierPhone) {
    supplierPhone.addEventListener('focus', () => {
        touchedFields.supplierPhone = true;
    });
    supplierPhone.addEventListener('input', () => {
        if (touchedFields.supplierPhone) {
            validateField(supplierPhone, true);
        }
    });
}

if (supplierCompany) {
    supplierCompany.addEventListener('focus', () => {
        touchedFields.supplierCompany = true;
    });
    supplierCompany.addEventListener('input', () => {
        if (touchedFields.supplierCompany) {
            validateField(supplierCompany, true);
        }
    });
}

if (reorderLevel) {
    reorderLevel.addEventListener('focus', () => {
        touchedFields.reorderLevel = true;
    });
    reorderLevel.addEventListener('input', () => {
        if (touchedFields.reorderLevel) {
            validateField(reorderLevel, true);
        }
    });
}

if (paymentMethod) {
    paymentMethod.addEventListener('focus', () => {
        touchedFields.paymentMethod = true;
    });
    paymentMethod.addEventListener('change', () => {
        if (touchedFields.paymentMethod) {
            validateField(paymentMethod, true);
        }
    });
}

// Validate all fields and show errors

if (form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        clearAllErrors();
        
        window.isSubmitting = true;
        
        
        Object.keys(touchedFields).forEach(key => {
            touchedFields[key] = true;
        });
        
        // Validate all fields
        const isProductNameValid = validateField(productName, true);
        const isCategoryValid = validateField(category, true);
        const isQuantityValid = validateField(quantity, true);
        const isCostPriceValid = validateField(costPrice, true);
        const isSellingPriceValid = validateField(sellingPrice, true);
        const isSupplierNameValid = validateField(supplierName, true);
        const isSupplierEmailValid = validateField(supplierEmail, true);
        const isSupplierPhoneValid = validateField(supplierPhone, true);
        const isSupplierCompanyValid = validateField(supplierCompany, true);
        const isReorderLevelValid = validateField(reorderLevel, true);
        const isPaymentMethodValid = validateField(paymentMethod, true);
        
        const hasError = !(
            isProductNameValid && isCategoryValid && isQuantityValid &&
            isCostPriceValid && isSellingPriceValid && isSupplierNameValid &&
            isSupplierEmailValid && isSupplierPhoneValid && isSupplierCompanyValid &&
            isReorderLevelValid && isPaymentMethodValid
        );
        
        if (hasError) {
            const firstError = document.querySelector('.is-invalid');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.focus();
            }
            showNotification('Please fix the highlighted errors before submitting');
            window.isSubmitting = false;
        } else {
            form.submit();
        }
    });
}
