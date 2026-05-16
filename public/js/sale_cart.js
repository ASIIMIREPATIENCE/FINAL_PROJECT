let cart = [];

const productSelect = document.getElementById('productName');
const qtyInput = document.getElementById('quantity');
const priceInput = document.getElementById('unitPrice');
const addBtn = document.getElementById('addToCart');
const cartBody = document.getElementById('cartBody');
const cartItemsInput = document.getElementById('cartItems');
const completeBtn = document.getElementById('completeSale');

// Auto-fill price when product is selected
productSelect.addEventListener('change', function() {
    const selected = productSelect.options[productSelect.selectedIndex];
    if (selected && selected.dataset.price) {
        priceInput.value = selected.dataset.price;
    }
});

// Add to cart button click
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
    
    // Check if product already in cart
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
    qtyInput.value = 1;
});

// Remove from cart
function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

// Render cart table
function renderCart() {
    if (cart.length === 0) {
        cartBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Cart is empty</td></tr>';
        cartItemsInput.value = JSON.stringify(cart);
        return;
    }
    
    let html = '';
    for (let i = 0; i < cart.length; i++) {
        const item = cart[i];
        html += '<tr>' +
            '<td>' + item.productName + '</td>' +
            '<td>' + item.quantity + '</td>' +
            '<td>' + item.unitPrice.toLocaleString() + '</td>' +
            '<td><button type="button" class="btn btn-sm btn-danger" onclick="removeFromCart(' + i + ')">Remove</button></td>' +
        '</tr>';
    }
    cartBody.innerHTML = html;
    cartItemsInput.value = JSON.stringify(cart);
}

// Validate before submit
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
});