console.log('🔥 Registration Validation Loaded');

// DOM Elements
const form = document.getElementById('registerForm');
const fullname = document.getElementById('fullname');
const email = document.getElementById('email');
const phonenumber = document.getElementById('phonenumber');
const address = document.getElementById('address');
const nin = document.getElementById('nin');
const nextOfKinName = document.getElementById('nextOfKinName');
const nextOfKinPhone = document.getElementById('nextOfKinPhone');
const nextOfKinRelationship = document.getElementById('nextOfKinRelationship');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirmPassword');
const role = document.getElementById('role');

// Displaying errors 

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

function clearAllErrors() {
    const allFields = [fullname, email, phonenumber, address, nin, nextOfKinName, nextOfKinPhone, nextOfKinRelationship, password, confirmPassword, role];
    allFields.forEach(field => {
        if (field) {
            field.classList.remove('is-invalid', 'is-valid');
            const errorDiv = field.nextElementSibling;
            if (errorDiv && errorDiv.classList.contains('invalid-feedback')) {
                errorDiv.style.display = 'none';
            }
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

// Validation functions for each field

function validateFullname(field, showErrors = false) {
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
}

function validateEmail(field, showErrors = false) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!field.value.trim()) {
        if (showErrors) showFieldError(field, 'Email is required');
        return false;
    } else if (!emailRegex.test(field.value)) {
        if (showErrors) showFieldError(field, 'Enter a valid email address');
        return false;
    } else {
        if (showErrors) showFieldSuccess(field);
        return true;
    }
}

function validatePhone(field, showErrors = false) {
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
}

function validateAddress(field, showErrors = false) {
    if (!field.value.trim()) {
        if (showErrors) showFieldError(field, 'Address is required');
        return false;
    } else if (field.value.trim().length < 3) {
        if (showErrors) showFieldError(field, 'Address must be at least 3 characters');
        return false;
    } else {
        if (showErrors) showFieldSuccess(field);
        return true;
    }
}

function validateNIN(field, showErrors = false) {
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
}

function validateNextOfKinName(field, showErrors = false) {
    if (!field.value.trim()) {
        if (showErrors) showFieldError(field, 'Next of kin name is required');
        return false;
    } else if (field.value.trim().length < 2) {
        if (showErrors) showFieldError(field, 'Name must be at least 2 characters');
        return false;
    } else {
        if (showErrors) showFieldSuccess(field);
        return true;
    }
}

function validateNextOfKinPhone(field, showErrors = false) {
    const phoneRegex = /^\+256[0-9]{9}$|^0[0-9]{9}$/;
    if (!field.value.trim()) {
        if (showErrors) showFieldError(field, 'Next of kin phone is required');
        return false;
    } else if (!phoneRegex.test(field.value)) {
        if (showErrors) showFieldError(field, 'Use +256XXXXXXXXX or 0XXXXXXXXX');
        return false;
    } else {
        if (showErrors) showFieldSuccess(field);
        return true;
    }
}

function validateRelationship(field, showErrors = false) {
    if (!field.value.trim()) {
        if (showErrors) showFieldError(field, 'Relationship is required');
        return false;
    } else if (field.value.trim().length < 2) {
        if (showErrors) showFieldError(field, 'Relationship must be at least 2 characters');
        return false;
    } else {
        if (showErrors) showFieldSuccess(field);
        return true;
    }
}

function validatePassword(field, showErrors = false) {
    if (!field.value) {
        if (showErrors) showFieldError(field, 'Password is required');
        return false;
    } else if (field.value.length < 6) {
        if (showErrors) showFieldError(field, 'Password must be at least 6 characters');
        return false;
    } else {
        if (showErrors) showFieldSuccess(field);
        return true;
    }
}

function validateConfirmPassword(field, showErrors = false) {
    if (!field.value) {
        if (showErrors) showFieldError(field, 'Please confirm your password');
        return false;
    } else if (field.value !== password.value) {
        if (showErrors) showFieldError(field, 'Passwords do not match');
        return false;
    } else {
        if (showErrors) showFieldSuccess(field);
        return true;
    }
}

function validateRole(field, showErrors = false) {
    if (!field.value) {
        if (showErrors) showFieldError(field, 'Please select a role');
        return false;
    } else {
        if (showErrors) showFieldSuccess(field);
        return true;
    }
}

// REAL-TIME VALIDATION

if (fullname) {
    fullname.addEventListener('input', () => validateFullname(fullname, true));
    fullname.addEventListener('blur', () => validateFullname(fullname, true));
}

if (email) {
    email.addEventListener('input', () => validateEmail(email, true));
    email.addEventListener('blur', () => validateEmail(email, true));
}

if (phonenumber) {
    phonenumber.addEventListener('input', () => validatePhone(phonenumber, true));
    phonenumber.addEventListener('blur', () => validatePhone(phonenumber, true));
}

if (address) {
    address.addEventListener('input', () => validateAddress(address, true));
    address.addEventListener('blur', () => validateAddress(address, true));
}

if (nin) {
    nin.addEventListener('input', () => validateNIN(nin, true));
    nin.addEventListener('blur', () => validateNIN(nin, true));
}

if (nextOfKinName) {
    nextOfKinName.addEventListener('input', () => validateNextOfKinName(nextOfKinName, true));
    nextOfKinName.addEventListener('blur', () => validateNextOfKinName(nextOfKinName, true));
}

if (nextOfKinPhone) {
    nextOfKinPhone.addEventListener('input', () => validateNextOfKinPhone(nextOfKinPhone, true));
    nextOfKinPhone.addEventListener('blur', () => validateNextOfKinPhone(nextOfKinPhone, true));
}

if (nextOfKinRelationship) {
    nextOfKinRelationship.addEventListener('input', () => validateRelationship(nextOfKinRelationship, true));
    nextOfKinRelationship.addEventListener('blur', () => validateRelationship(nextOfKinRelationship, true));
}

if (password) {
    password.addEventListener('input', () => {
        validatePassword(password, true);
        if (confirmPassword && confirmPassword.value) {
            validateConfirmPassword(confirmPassword, true);
        }
    });
}

if (confirmPassword) {
    confirmPassword.addEventListener('input', () => validateConfirmPassword(confirmPassword, true));
}

if (role) {
    role.addEventListener('change', () => validateRole(role, true));
}

// FORM SUBMISSION

if (form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        clearAllErrors();
        
        let hasError = false;
        
        if (!validateFullname(fullname, true)) hasError = true;
        if (!validateEmail(email, true)) hasError = true;
        if (!validatePhone(phonenumber, true)) hasError = true;
        if (!validateAddress(address, true)) hasError = true;
        if (!validateNIN(nin, true)) hasError = true;
        if (!validateNextOfKinName(nextOfKinName, true)) hasError = true;
        if (!validateNextOfKinPhone(nextOfKinPhone, true)) hasError = true;
        if (!validateRelationship(nextOfKinRelationship, true)) hasError = true;
        if (!validatePassword(password, true)) hasError = true;
        if (!validateConfirmPassword(confirmPassword, true)) hasError = true;
        if (!validateRole(role, true)) hasError = true;
        
        if (hasError) {
            const firstError = document.querySelector('.is-invalid');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.focus();
            }
            showNotification('Please fix the highlighted errors before submitting');
        } else {
            form.submit();
        }
    });
}

