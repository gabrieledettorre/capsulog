let notifications = [];

function checkLowStock(caffe) {
    const lowStockItems = caffe.filter(c => c.quantita > 0 && c.quantita <= lowStockThreshold);
    const newNotifications = lowStockItems.map(c => ({
        id: c.id,
        title: 'Scorta bassa',
        message: `${c.nome}${c.marca ? ` - ${c.marca}` : ''} ha solo ${c.quantita} capsule rimaste (${c.magazzino})`,
        read: false,
        timestamp: new Date()
    }));
    
    const existingIds = new Set(notifications.map(n => n.id));
    newNotifications.forEach(n => {
        if (!existingIds.has(n.id)) {
            notifications.unshift(n);
        }
    });
    
    notifications = notifications.slice(0, 20);
    updateNotificationBadge();
    renderNotifications();
}

function updateNotificationBadge() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notification-badge');
    if (!badge) return;
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function renderNotifications() {
    const container = document.getElementById('notification-list');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = '<div style="padding:1rem;text-align:center;font-size:0.8rem;color:var(--text-secondary);"><i class="ri-notification-off-line"></i> Nessuna notifica</div>';
        return;
    }
    
    container.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}">
            <i class="ri-alert-line" style="color:var(--danger)"></i>
            <div>
                <div class="notification-title">${escapeHtml(n.title)}</div>
                <div class="notification-desc">${escapeHtml(n.message)}</div>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.notification-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = parseInt(el.dataset.notifId);
            const notif = notifications.find(n => n.id === id);
            if (notif) notif.read = true;
            updateNotificationBadge();
            renderNotifications();
        });
    });
}

document.getElementById('bell-icon')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
});

document.addEventListener('click', () => {
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) dropdown.classList.remove('show');
});