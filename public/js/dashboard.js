function updateSortUI() {
    document.querySelectorAll('.sort-btn[data-sort]').forEach(btn => {
        const field = btn.dataset.sort;
        const iconSpan = btn.querySelector('.sort-icon i');
        if (currentSort.field === field) {
            btn.classList.add('active');
            if (iconSpan) {
                iconSpan.className = currentSort.order === 'asc' ? 'ri-sort-asc' : 'ri-sort-desc';
            }
        } else {
            btn.classList.remove('active');
        }
    });
}

function updateFilterUI() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === currentFilter);
    });
}

function updateMagazzinoUI() {
    document.querySelectorAll('.magazzino-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.magazzino === currentMagazzino);
    });
}

function initSorting() {
    document.querySelectorAll('.sort-btn[data-sort]').forEach(btn => {
        btn.addEventListener('click', () => {
            const field = btn.dataset.sort;
            if (currentSort.field === field) {
                currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.field = field;
                currentSort.order = field === 'quantita' ? 'desc' : 'asc';
            }
            updateSortUI();
            loadDashboard();
        });
    });
}

function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            updateFilterUI();
            loadDashboard();
        });
    });
}

function initMagazzino() {
    document.querySelectorAll('.magazzino-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentMagazzino = btn.dataset.magazzino;
            updateMagazzinoUI();
            loadDashboard();
        });
    });
}

async function loadDashboard() {
    const res = await fetch('/api/caffe');
    allCaffe = await res.json();
    
    const ufficioCount = allCaffe.filter(c => c.magazzino === 'Ufficio').length;
    const casaCount = allCaffe.filter(c => c.magazzino === 'Casa').length;
    document.getElementById('count-ufficio').textContent = ufficioCount;
    document.getElementById('count-casa').textContent = casaCount;
    
    checkLowStock(allCaffe);
    
    let filtered = allCaffe.filter(c => c.magazzino === currentMagazzino);
    if (currentFilter !== 'all') {
        filtered = filtered.filter(c => c.categoria === currentFilter);
    }
    
    filtered.sort((a, b) => {
        let aVal = a[currentSort.field] || '';
        let bVal = b[currentSort.field] || '';
        if (typeof aVal === 'string') {
            return currentSort.order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return currentSort.order === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    const totalTypes = filtered.length;
    const totalQuantity = filtered.reduce((sum, c) => sum + c.quantita, 0);
    const lowStock = filtered.filter(c => c.quantita > 0 && c.quantita <= lowStockThreshold).length;
    
    document.getElementById('stats').innerHTML = `
        <div class="stat-card"><div class="stat-value">${totalTypes}</div><div class="stat-label"><i class="ri-cup-line"></i> Tipologie</div></div>
        <div class="stat-card"><div class="stat-value">${totalQuantity}</div><div class="stat-label"><i class="ri-stack-line"></i> Capsule totali</div></div>
        <div class="stat-card"><div class="stat-value">${lowStock}</div><div class="stat-label"><i class="ri-alert-line"></i> Scorte basse</div></div>
    `;
    
    const container = document.getElementById('caffe-list');
    if (filtered.length === 0) {
        container.innerHTML = `<div class="coffee-card" style="text-align:center;grid-column:1/-1;justify-content:center;align-items:center;">Nessun elemento nel magazzino ${currentMagazzino}</div>`;
        return;
    }
    
    container.innerHTML = filtered.map(c => {
        const isLowStock = c.quantita > 0 && c.quantita <= lowStockThreshold;
        const categoriaIcon = c.categoria === 'Caffè' ? 'ri-cup-line' : 'ri-tea-line';
        
        return `
        <div class="coffee-card">
            <div class="coffee-header">
                <div>
                    <div class="coffee-name">${escapeHtml(c.nome)}</div>
                    ${c.marca ? `<div class="coffee-marca">${escapeHtml(c.marca)}</div>` : ''}
                    <div class="coffee-categoria"><i class="${categoriaIcon}"></i> ${escapeHtml(c.categoria)}</div>
                </div>
                <div class="quantity-badge">${c.quantita}</div>
            </div>
            <div class="coffee-gusto">${c.gusto ? `<i class="ri-taste-line"></i> ${escapeHtml(c.gusto)}` : '&nbsp;'}</div>
            ${isLowStock ? '<div class="low-stock-warning"><i class="ri-alert-line"></i> Scorta bassa</div>' : '<div style="height:20px;"></div>'}
            <div class="coffee-actions">
                <button onclick="window.consuma(${c.id})" class="btn-consume"><i class="ri-cup-line"></i> Consuma</button>
                <button onclick="window.openRefillModal(${c.id})" class="btn-icon" title="Aggiungi"><i class="ri-add-line"></i></button>
                <button onclick="window.openTrasferisciModal(${c.id})" class="btn-icon" title="Trasferisci"><i class="ri-exchange-line"></i></button>
                <button onclick="window.settaQuantita(${c.id})" class="btn-icon" title="Imposta quantità"><i class="ri-stack-line"></i></button>
            </div>
        </div>
    `}).join('');
}