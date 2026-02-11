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
            document.getElementById('discount').textContent = `-$${data.discount.toFixed(2)}`;
            document.getElementById('total').textContent = `$${data.total.toFixed(2)}`;
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

// Add CSS for notification animation
const style = document.createElement('style');
style.textContent = `
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
document.head.appendChild(style);

