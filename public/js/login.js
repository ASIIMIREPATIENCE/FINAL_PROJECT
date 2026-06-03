console.log('🔥 Login Validation Loaded');

// DOM Elements
const form = document.getElementById('loginForm');
const email = document.getElementById('email');
const password = document.getElementById('password');

// ERROR DISPLAY FUNCTIONS

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
    const allFields = [email, password];
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


// Validations

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

function validatePassword(field, showErrors = false) {
    if (!field.value) {
        if (showErrors) showFieldError(field, 'Password is required');
        return false;
    } else if (field.valuegt) {
        if (showErrors) showFieldError(field, 'Invalid password');
        return false;
    } else {
        if (showErrors) showFieldSuccess(field);
        return true;
    }
}


// Real-time validation


if (email) {
    email.addEventListener('input', () => validateEmail(email, true));
    email.addEventListener('blur', () => validateEmail(email, true));
}

if (password) {
    password.addEventListener('input', () => validatePassword(password, true));
    password.addEventListener('blur', () => validatePassword(password, true));
}

// Form submission validation

if (form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        clearAllErrors();
        
        let hasError = false;
        
        if (!validateEmail(email, true)) hasError = true;
        if (!validatePassword(password, true)) hasError = true;
        
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

