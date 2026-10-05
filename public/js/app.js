document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}-page`).classList.add('active');
        if (page === 'dashboard') loadDashboard();
        if (page === 'manage') loadManageList();
        if (page === 'stats') loadStats();
    });
});

document.getElementById('low-stock-threshold')?.addEventListener('change', (e) => {
    saveThreshold(parseInt(e.target.value));
    loadDashboard();
});

document.getElementById('export-data')?.addEventListener('click', async () => {
    const res = await fetch('/api/caffe');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capsulog-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('reset-data')?.addEventListener('click', async () => {
    if (confirm('Reset completo? Tutti i dati saranno eliminati.')) {
        const caffe = await (await fetch('/api/caffe')).json();
        for (const c of caffe) {
            await fetch(`/api/caffe/${c.id}`, { method: 'DELETE' });
        }
        notifications = [];
        updateNotificationBadge();
        loadDashboard();
        loadManageList();
    }
});

document.getElementById('import-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const text = await file.text();
        const data = JSON.parse(text);
        for (const item of data) {
            await fetch('/api/caffe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
        }
        loadDashboard();
        loadManageList();
        alert('Import completato');
    }
});

// Inizializzazione
if (document.getElementById('low-stock-threshold')) {
    document.getElementById('low-stock-threshold').value = lowStockThreshold;
}
initTheme();
initSorting();
initFilters();
initMagazzino();
updateSortUI();
updateFilterUI();
updateMagazzinoUI();
loadDashboard();
loadManageList();