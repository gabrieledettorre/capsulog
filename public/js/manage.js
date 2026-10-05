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
    
    // Raggruppa per nome (catalogo centrale)
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
    
    container.innerHTML = Object.keys(grouped).map(nome => {
        const item = grouped[nome];
        const dettagli = item.dettagli;
        const colore = dettagli.colore || '#6f4e37';
        const uff = item.ufficio;
        const casa = item.casa;
        
        return `
        <div class="manage-item" style="--capsule-color: ${colore};">
            <div class="manage-item-info">
                <span style="font-weight:600;display:flex;align-items:center;">
                    <span class="coffee-color-dot" style="background:${colore};"></span>
                    ${escapeHtml(nome)}
                </span>
                <div style="display:flex;gap:0.75rem;flex-wrap:wrap;font-size:0.75rem;">
                    ${dettagli.marca ? `<span style="color:var(--accent);"><i class="ri-store-line"></i> ${escapeHtml(dettagli.marca)}</span>` : ''}
                    <span style="color:var(--text-secondary);"><i class="ri-taste-line"></i> ${escapeHtml(dettagli.gusto) || '—'}</span>
                    <span style="color:var(--text-secondary);"><i class="ri-price-tag-3-line"></i> ${escapeHtml(dettagli.categoria)}</span>
                </div>
                ${dettagli.note ? `<span style="color:var(--text-secondary);font-size:0.7rem;font-style:italic;"><i class="ri-sticky-note-line"></i> ${escapeHtml(dettagli.note)}</span>` : ''}
                <div class="manage-badges">
                    ${uff 
                        ? `<span class="magazzino-badge present"><i class="ri-building-line"></i> Ufficio <span class="qty">${uff.quantita}</span></span>` 
                        : `<span class="magazzino-badge"><i class="ri-building-line"></i> Ufficio —</span>`}
                    ${casa 
                        ? `<span class="magazzino-badge present"><i class="ri-home-line"></i> Casa <span class="qty">${casa.quantita}</span></span>` 
                        : `<span class="magazzino-badge"><i class="ri-home-line"></i> Casa —</span>`}
                </div>
            </div>
            <div class="manage-actions">
                ${uff 
                    ? `<button onclick="window.editCaffe(${uff.id})" class="btn-icon" title="Modifica"><i class="ri-edit-line"></i></button>`
                    : `<button onclick="window.editCaffe(${casa.id})" class="btn-icon" title="Modifica"><i class="ri-edit-line"></i></button>`}
                ${uff 
                    ? `<button onclick="window.settaQuantita(${uff.id})" class="btn-icon" title="Q.tà Ufficio"><i class="ri-building-line"></i></button>` 
                    : `<button onclick="window.openAddWarehouseModal('${escapeHtml(nome).replace(/'/g, "\\'")}')" class="btn-icon" title="Aggiungi a Ufficio"><i class="ri-add-line"></i> <i class="ri-building-line"></i></button>`}
                ${casa 
                    ? `<button onclick="window.settaQuantita(${casa.id})" class="btn-icon" title="Q.tà Casa"><i class="ri-home-line"></i></button>` 
                    : `<button onclick="window.openAddWarehouseModal('${escapeHtml(nome).replace(/'/g, "\\'")}')" class="btn-icon" title="Aggiungi a Casa"><i class="ri-add-line"></i> <i class="ri-home-line"></i></button>`}
                ${(uff && casa) 
                    ? `<button onclick="window.openTrasferisciModal(${uff.id})" class="btn-icon" title="Trasferisci"><i class="ri-exchange-line"></i></button>` 
                    : ''}
                ${uff ? `<button onclick="window.deleteCaffe(${uff.id})" class="btn-icon" title="Rimuovi da Ufficio"><i class="ri-delete-bin-line"></i></button>` : ''}
                ${casa ? `<button onclick="window.deleteCaffe(${casa.id})" class="btn-icon" title="Rimuovi da Casa"><i class="ri-delete-bin-line"></i></button>` : ''}
            </div>
        </div>
    `}).join('');
}

window.consuma = async (id) => {
    const res = await fetch(`/api/caffe/${id}/consuma`, { method: 'PATCH' });
    if (res.status === 400) {
        alert('Scorta esaurita');
    } else {
        loadDashboard();
        loadManageList();
    }
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
    document.getElementById('magazzino').value = c.magazzino || 'Ufficio';
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