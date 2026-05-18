document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('admin-stock-alerts');
    const button = document.getElementById('admin-stock-alerts-btn');
    const panel = document.getElementById('admin-stock-alerts-panel');
    const count = document.getElementById('admin-stock-alerts-count');
    const list = document.getElementById('admin-stock-alerts-list');

    if (!root || !button || !panel || !count || !list) return;

    function setOpen(open) {
        panel.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
    }

    function render(items) {
        count.hidden = items.length === 0;
        count.textContent = String(items.length);

        if (!items.length) {
            list.innerHTML = '<p class="admin-stock-alerts-empty">All products are well stocked.</p>';
            return;
        }

        list.innerHTML = items.map(item => (
            `<p class="admin-stock-alerts-item ${item.urgency}">${item.message}</p>`
        )).join('');
    }

    async function fetchNotifications() {
        try {
            const response = await fetch('/admin/low-stock', { headers: { Accept: 'application/json' } });
            const data = await response.json();
            const items = [];

            (data.outOfStock || []).forEach(product => {
                items.push({
                    urgency: 'critical',
                    message: `"${product.name}" is out of stock.`
                });
            });

            (data.lowStockProducts || []).forEach(product => {
                items.push({
                    urgency: 'warning',
                    message: `"${product.name}" is low: only ${product.stock} left.`
                });
            });

            render(items);
        } catch (error) {
            list.innerHTML = '<p class="admin-stock-alerts-empty">Could not load stock alerts.</p>';
            console.error('Stock notification fetch failed:', error);
        }
    }

    button.addEventListener('click', event => {
        event.stopPropagation();
        setOpen(panel.hidden);
    });

    document.addEventListener('click', event => {
        if (!root.contains(event.target)) setOpen(false);
    });

    fetchNotifications();
    setInterval(fetchNotifications, 60000);
});
