let manageSearch = '';
let manageSort = { field: 'nome', order: 'asc' };

async function loadManageList() {
    const res = await fetch('/api/caffe');
    const caffe = await res.json();
    
    const container = document.getElementById('manage-list');
    
    const ufficioCount = caffe.filter(c => c.magazzino === 'Ufficio').length;
    const casaCount = caffe.filter(c => c.magazzino === 'Casa').length;
    document.getElementById('manage-count-ufficio').textContent = ufficioCount;
    document.getElementById('manage-count-casa').textContent = casaCount;
    
    if (caffe.length === 0) {
        container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-secondary);">Nessun caffè nel catalogo. Aggiungine uno!</div>';
        return;
    }
    
    const grouped = {};
    caffe.forEach(c => {
        if (!grouped[c.nome]) {
            grouped[c.nome] = {
                dettagli: {
                    marca: c.marca,
                    gusto: c.gusto,
                    categoria: c.categoria,
                    colore: c.colore,
                    note: c.note
                },
                ufficio: null,
                casa: null
            };
        }
        if (c.magazzino === 'Ufficio') grouped[c.nome].ufficio = c;
        if (c.magazzino === 'Casa') grouped[c.nome].casa = c;
    });
    
    let items = Object.keys(grouped).map(nome => ({
        nome,
        ...grouped[nome],
        totale: (grouped[nome].ufficio?.quantita || 0) + (grouped[nome].casa?.quantita || 0)
    }));
    
    if (manageSearch.trim()) {
        const q = manageSearch.toLowerCase().trim();
        items = items.filter(item => {
            const d = item.dettagli;
            return (
                item.nome.toLowerCase().includes(q) ||
                (d.marca || '').toLowerCase().includes(q) ||
                (d.gusto || '').toLowerCase().includes(q) ||
                (d.categoria || '').toLowerCase().includes(q) ||
                (d.note || '').toLowerCase().includes(q)
            );
        });
    }
    
    items.sort((a, b) => {
        let aVal, bVal;
        switch (manageSort.field) {
            case 'nome':
                aVal = a.nome.toLowerCase();
                bVal = b.nome.toLowerCase();
                return manageSort.order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            case 'totale':
                aVal = a.totale;
                bVal = b.totale;
                break;
            case 'categoria':
                aVal = (a.dettagli.categoria || '').toLowerCase();
                bVal = (b.dettagli.categoria || '').toLowerCase();
                return manageSort.order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            default:
                aVal = 0; bVal = 0;
        }
        return manageSort.order === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    updateManageSortUI();
    
    if (items.length === 0) {
        container.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-secondary);">Nessun risultato per "<strong>${escapeHtml(manageSearch)}</strong>"</div>`;
        return;
    }
    
    container.innerHTML = items.map(item => {
        const dettagli = item.dettagli;
        const colore = dettagli.colore || '#6f4e37';
        const textColor = '#ffffff';
        const uff = item.ufficio;
        const casa = item.casa;
        const nomeEscaped = escapeHtml(item.nome).replace(/'/g, "\\'");
        
        const uffQty = uff ? uff.quantita : 0;
        const casaQty = casa ? casa.quantita : 0;
        
        return `
        <div class="manage-item">
            <div class="manage-item-info">
                <div>
                    <span class="coffee-name-pill" style="background:${colore};color:${textColor};">
                        ${escapeHtml(item.nome)}
                    </span>
                </div>
                <div style="display:flex;gap:0.75rem;flex-wrap:wrap;font-size:0.75rem;">
                    ${dettagli.marca ? `<span style="color:var(--accent);"><i class="ri-store-line"></i> ${escapeHtml(dettagli.marca)}</span>` : ''}
                    <span style="color:var(--text-secondary);"><i class="ri-taste-line"></i> ${escapeHtml(dettagli.gusto) || '—'}</span>
                    <span style="color:var(--text-secondary);"><i class="ri-price-tag-3-line"></i> ${escapeHtml(dettagli.categoria)}</span>
                </div>
                ${dettagli.note ? `<span style="color:var(--text-secondary);font-size:0.7rem;font-style:italic;"><i class="ri-sticky-note-line"></i> ${escapeHtml(dettagli.note)}</span>` : ''}
                <div class="manage-badges">
                    <span class="magazzino-badge ${casaQty > 0 ? 'present' : ''}">
                        <i class="ri-home-line"></i> Casa <span class="qty">${casaQty}</span>
                    </span>
                    <span class="magazzino-badge ${uffQty > 0 ? 'present' : ''}">
                        <i class="ri-building-line"></i> Ufficio <span class="qty">${uffQty}</span>
                    </span>
                </div>
            </div>
            <div class="manage-actions">
                <button onclick="window.editCaffe(${uff?.id || casa?.id})" class="btn-icon" title="Modifica catalogo">
                    <i class="ri-edit-line"></i>
                </button>
                
                ${casa 
                    ? `<button onclick="window.settaQuantita(${casa.id})" class="btn-icon" title="Imposta quantità Casa"><i class="ri-home-line"></i> <i class="ri-edit-line" style="font-size:0.7rem;"></i></button>`
                    : `<button onclick="window.openAddWarehouseModal('${nomeEscaped}', 'Casa')" class="btn-icon" title="Aggiungi a Casa"><i class="ri-add-line"></i> <i class="ri-home-line"></i></button>`}
                
                ${uff 
                    ? `<button onclick="window.settaQuantita(${uff.id})" class="btn-icon" title="Imposta quantità Ufficio"><i class="ri-building-line"></i> <i class="ri-edit-line" style="font-size:0.7rem;"></i></button>`
                    : `<button onclick="window.openAddWarehouseModal('${nomeEscaped}', 'Ufficio')" class="btn-icon" title="Aggiungi a Ufficio"><i class="ri-add-line"></i> <i class="ri-building-line"></i></button>`}
                
                ${(uff && casa) 
                    ? `<button onclick="window.openTrasferisciModal(${casa.id})" class="btn-icon" title="Trasferisci"><i class="ri-exchange-line"></i></button>` 
                    : ''}
                
                <button onclick="window.deleteCatalogo('${nomeEscaped}')" class="btn-icon btn-icon-danger" title="Elimina dal catalogo (tutti i magazzini)">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
        </div>
    `}).join('');
}

function updateManageSortUI() {
    document.querySelectorAll('.manage-sort-btn').forEach(btn => {
        const field = btn.dataset.sort;
        const iconSpan = btn.querySelector('.sort-icon i');
        if (manageSort.field === field) {
            btn.classList.add('active');
            if (iconSpan) {
                iconSpan.className = manageSort.order === 'asc' ? 'ri-sort-asc' : 'ri-sort-desc';
            }
        } else {
            btn.classList.remove('active');
        }
    });
}

function initManageControls() {
    document.querySelectorAll('.manage-sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const field = btn.dataset.sort;
            if (manageSort.field === field) {
                manageSort.order = manageSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                manageSort.field = field;
                manageSort.order = field === 'totale' ? 'desc' : 'asc';
            }
            updateManageSortUI();
            loadManageList();
        });
    });
    
    const searchInput = document.getElementById('manage-search');
    if (searchInput) {
        let debounce;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                manageSearch = e.target.value;
                loadManageList();
            }, 150);
        });
    }
}

// ============================
// CONSUMA (con toast + undo)
// ============================
window.consuma = async (id) => {
    const res = await fetch(`/api/caffe/${id}/consuma`, { method: 'PATCH' });
    if (res.status === 400) {
        alert('Scorta esaurita');
        return;
    }
    const caffe = await res.json();
    
    loadDashboard();
    loadManageList();
    
    mostraToastConsumo(caffe.nome, caffe.magazzino);
    aggiornaBottoneAnnulla();
};

window.settaQuantita = async (id) => {
    const nuova = prompt('Nuova quantità:');
    if (nuova !== null && !isNaN(nuova) && parseInt(nuova) >= 0) {
        const res = await fetch(`/api/caffe/${id}`);
        const c = await res.json();
        await fetch(`/api/caffe/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...c, quantita: parseInt(nuova) })
        });
        loadDashboard();
        loadManageList();
    }
};

window.editCaffe = async (id) => {
    const res = await fetch(`/api/caffe/${id}`);
    const c = await res.json();
    document.getElementById('edit-id').value = c.id;
    document.getElementById('nome').value = c.nome;
    document.getElementById('marca').value = c.marca || '';
    document.getElementById('gusto').value = c.gusto || '';
    document.getElementById('categoria').value = c.categoria || 'Caffè';
    document.getElementById('magazzino').value = c.magazzino || 'Casa';
    document.getElementById('quantita').value = c.quantita;
    setColor(c.colore || '#6f4e37');
    document.getElementById('note').value = c.note || '';
    
    document.getElementById('modal-title').textContent = 'Modifica Caffè';
    document.getElementById('coffee-modal').classList.add('active');
};

window.deleteCaffe = async (id) => {
    if (confirm('Rimuovere questo caffè da questo magazzino?')) {
        await fetch(`/api/caffe/${id}`, { method: 'DELETE' });
        loadDashboard();
        loadManageList();
    }
};

window.deleteCatalogo = async (nome) => {
    if (confirm(`Eliminare "${nome}" da TUTTO il catalogo?\n\nQuesta azione rimuoverà il caffè da tutti i magazzini.`)) {
        await fetch(`/api/caffe/catalogo/${encodeURIComponent(nome)}`, { method: 'DELETE' });
        loadDashboard();
        loadManageList();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initManageControls);
} else {
    initManageControls();
}