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

addBtn.addEventListener('click', function() {
    const selected = productSelect.options[productSelect.selectedIndex];
    
    if (!selected || !selected.value) {
        alert('Please select a product');
        return;
    }
    
    const productName = selected.value;
    const unitPrice = parseFloat(priceInput.value);
    const quantity = parseInt(qtyInput.value);
    const maxStock = parseInt(selected.dataset.stock);
    
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
        cartBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Cart is empty<\/td><\/tr>';
        cartItemsInput.value = JSON.stringify(cart);
        return;
    }
    
    let html = '';
    for (let i = 0; i < cart.length; i++) {
        const item = cart[i];
        const subtotal = item.quantity * item.unitPrice;
        html += '<tr>' +
            '<td>' + escapeHtml(item.productName) + '<\/td>' +
            '<td>' + item.quantity + '<\/td>' +
            '<td>UGX ' + item.unitPrice.toLocaleString() + '<\/td>' +
            '<td>UGX ' + subtotal.toLocaleString() + '<\/td>' +
            '<td><button type="button" class="btn btn-sm btn-danger" onclick="removeFromCart(' + i + ')">Remove<\/button><\/td>' +
        '<\/tr>';
    }
    cartBody.innerHTML = html;
    cartItemsInput.value = JSON.stringify(cart);
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

completeBtn.addEventListener('click', function(e) {
    const custName = document.getElementById('customerName').value.trim();
    const custPhone = document.getElementById('customerPhone').value.trim();
    const payMethod = document.getElementById('paymentMethod').value;
    
    if (!custName) {
        e.preventDefault();
        alert('Please enter customer name');
        return;
    }
    
    if (!custPhone) {
        e.preventDefault();
        alert('Please enter phone number');
        return;
    }
    
    if (!payMethod) {
        e.preventDefault();
        alert('Please select payment method');
        return;
    }
    
    if (cart.length === 0) {
        e.preventDefault();
        alert('Cart is empty. Add at least one product.');
        return;
    }
    
    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const distance = parseInt(distanceInput ? distanceInput.value : 0) || 0;
    const needTransport = transportCheck ? transportCheck.checked : false;
    let transportFee = 0;
    if (needTransport && distance > 0) {
        const isFree = (subtotal >= 500000 && distance <= 10);
        if (!isFree) transportFee = 30000;
    }
    const total = subtotal + transportFee;
    
});

updateTotals();