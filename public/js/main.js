// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.navbar')) {
            navMenu.classList.remove('active');
        }
    });
});

// Add to cart
async function addToCart(productId, size = '', color = '') {
    try {
        const response = await fetch('/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId,
                quantity: 1,
                size,
                color
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Failed to add product to cart', 'error');
    }
}

// Add to wishlist
async function addToWishlist(productId) {
    try {
        const response = await fetch('/wishlist/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productId })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Failed to add product to wishlist', 'error');
    }
}

// Remove from wishlist
async function removeFromWishlist(productId) {
    try {
        const response = await fetch('/wishlist/remove', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productId })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            setTimeout(() => {
                location.reload();
            }, 500);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Failed to remove product from wishlist', 'error');
    }
}

// Update cart item quantity
async function updateCartQuantity(itemId, quantity) {
    if (quantity < 1) {
        removeFromCart(itemId);
        return;
    }

    try {
        const response = await fetch('/cart/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ itemId, quantity })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Cart updated', 'success');
            setTimeout(() => {
                location.reload();
            }, 500);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Failed to update cart', 'error');
    }
}

// Remove from cart
async function removeFromCart(itemId) {
    if (!confirm('Are you sure you want to remove this item from cart?')) {
        return;
    }

    try {
        const response = await fetch('/cart/remove', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ itemId })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            setTimeout(() => {
                location.reload();
            }, 500);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Failed to remove item from cart', 'error');
    }
}

// Apply coupon
async function applyCoupon() {
    const couponCode = document.getElementById('coupon-code').value;

    if (!couponCode) {
        showNotification('Please enter a coupon code', 'error');
        return;
    }

    try {
        const response = await fetch('/orders/apply-coupon', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ couponCode })
        });

        const data = await response.json();

        if (data.success) {
            const discountEl = document.getElementById('discount');
            const totalEl = document.getElementById('total');
            const shippingEl = document.getElementById('order-shipping');

            if (discountEl) discountEl.textContent = `-Rs.${data.discount.toFixed(2)}`;
            if (shippingEl && typeof data.deliveryCharge !== 'undefined') shippingEl.textContent = `Rs.${data.deliveryCharge.toFixed(2)}`;
            if (totalEl) totalEl.textContent = `Rs.${data.total.toFixed(2)}`;
            document.getElementById('applied-coupon').value = couponCode;
            showNotification(data.message, 'success');
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Failed to apply coupon', 'error');
    }
}

// Cancel order
async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) {
        return;
    }

    try {
        const response = await fetch(`/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Failed to cancel order', 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Event delegation for add to cart and wishlist buttons
document.addEventListener('click', function(event) {
    const target = event.target.closest('[data-action], .btn-add-cart, .product-quick-add, .btn-wishlist');
    if (!target) return;

    // Skip if this is a form submit button (like login/signup)
    if (target.type === 'submit' && target.closest('form')) {
        return;
    }

    // Skip if this button doesn't have product-related attributes
    const action = target.getAttribute('data-action');
    const productId = target.getAttribute('data-product-id');

    // Only prevent default if we have product-related attributes or actions
    if (!productId && !action && !target.classList.contains('btn-wishlist')) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Handle data-action attributes (new way)
    if (action === 'add-to-cart') {
        const size = document.getElementById('product-size') ?.value || '';
        const color = document.getElementById('product-color') ?.value || '';
        addToCart(productId, size, color);
    } else if (action === 'add-to-wishlist') {
        addToWishlist(productId);
    } else if (action === 'remove-from-wishlist') {
        removeFromWishlist(productId);
    } else if (action === 'remove-from-cart') {
        removeFromCart(productId);
    } else if (action === 'update-quantity') {
        const quantity = parseInt(target.getAttribute('data-quantity'));
        updateCartQuantity(productId, quantity);
    }
    // Handle legacy classes (for backward compatibility)
    else if (target.classList.contains('btn-wishlist') && productId) {
        addToWishlist(productId);
    } else if ((target.classList.contains('btn-add-cart') || target.classList.contains('product-quick-add')) && productId) {
        addToCart(productId);
    }
});

// Add CSS for notification animation
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(notificationStyle);