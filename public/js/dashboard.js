// Calcola se il colore è scuro (ritorna true) o chiaro (false)
function isColorDark(hex) {
    if (!hex) return true;
    let c = hex.replace('#', '');
    if (c.length === 3) {
        c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    }
    if (c.length !== 6) return true;
    
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    
    // Formula luminanza percepita (W3C)
    const luminanza = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminanza < 0.55;
}

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
    
    // Sort robusto: gestisce null/undefined e tipi misti
    filtered.sort((a, b) => {
        let aVal = a[currentSort.field];
        let bVal = b[currentSort.field];
        
        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return currentSort.order === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal);
        const bStr = String(bVal);
        return currentSort.order === 'asc' 
            ? aStr.localeCompare(bStr) 
            : bStr.localeCompare(aStr);
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
        const colore = c.colore || '#6f4e37';
        const textColor = '#ffffff';
        
        return `
        <div class="coffee-card">
            <div class="coffee-header">
                <div style="flex:1;min-width:0;">
                    <div class="coffee-name-pill" style="background:${colore};color:${textColor};">
                        ${escapeHtml(c.nome)}
                    </div>
                    ${c.marca ? `<div class="coffee-marca">${escapeHtml(c.marca)}</div>` : ''}
                    <div class="coffee-categoria"><i class="${categoriaIcon}"></i> ${escapeHtml(c.categoria)}</div>
                </div>
                <div class="quantity-badge">${c.quantita}</div>
            </div>
            <div class="coffee-gusto">${c.gusto ? `<i class="ri-taste-line"></i> ${escapeHtml(c.gusto)}` : '&nbsp;'}</div>
            ${c.note ? `<div class="coffee-note"><i class="ri-sticky-note-line"></i> ${escapeHtml(c.note)}</div>` : ''}
            ${isLowStock ? '<div class="low-stock-warning" style="margin-top:0.5rem;color:var(--danger);font-size:0.7rem;"><i class="ri-alert-line"></i> Scorta bassa</div>' : ''}
            <div class="coffee-actions">
                <button onclick="window.consuma(${c.id})" class="btn-consume"><i class="ri-cup-line"></i> Consuma</button>
                <button onclick="window.openRefillModal(${c.id})" class="btn-icon" title="Aggiungi"><i class="ri-add-line"></i></button>
                <button onclick="window.openTrasferisciModal(${c.id})" class="btn-icon" title="Trasferisci"><i class="ri-exchange-line"></i></button>
                <button onclick="window.settaQuantita(${c.id})" class="btn-icon" title="Imposta quantità"><i class="ri-stack-line"></i></button>
            </div>
        </div>
    `}).join('');
}