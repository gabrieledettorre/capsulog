function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return map[m];
    });
}

let lowStockThreshold = parseInt(localStorage.getItem('lowStockThreshold')) || 3;
let currentSort = { field: 'quantita', order: 'desc' };
let currentFilter = 'all';
let currentMagazzino = 'Ufficio';
let allCaffe = [];

function saveThreshold(value) {
    lowStockThreshold = value;
    localStorage.setItem('lowStockThreshold', value);
}