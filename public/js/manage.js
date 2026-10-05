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
        const nomeEscaped = escapeHtml(nome).replace(/'/g, "\\'");
        
        // Quantità visualizzate (0 se assente)
        const uffQty = uff ? uff.quantita : 0;
        const casaQty = casa ? casa.quantita : 0;
        
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
                    <span class="magazzino-badge ${casaQty > 0 ? 'present' : ''}">
                        <i class="ri-home-line"></i> Casa <span class="qty">${casaQty}</span>
                    </span>
                    <span class="magazzino-badge ${uffQty > 0 ? 'present' : ''}">
                        <i class="ri-building-line"></i> Ufficio <span class="qty">${uffQty}</span>
                    </span>
                </div>
            </div>
            <div class="manage-actions">
                <!-- Modifica catalogo -->
                <button onclick="window.editCaffe(${uff?.id || casa?.id})" class="btn-icon" title="Modifica catalogo">
                    <i class="ri-edit-line"></i>
                </button>
                
                <!-- Aggiungi/Imposta Casa -->
                ${casa 
                    ? `<button onclick="window.settaQuantita(${casa.id})" class="btn-icon" title="Imposta quantità Casa"><i class="ri-home-line"></i> <i class="ri-edit-line" style="font-size:0.7rem;"></i></button>`
                    : `<button onclick="window.openAddWarehouseModal('${nomeEscaped}', 'Casa')" class="btn-icon" title="Aggiungi a Casa"><i class="ri-add-line"></i> <i class="ri-home-line"></i></button>`}
                
                <!-- Aggiungi/Imposta Ufficio -->
                ${uff 
                    ? `<button onclick="window.settaQuantita(${uff.id})" class="btn-icon" title="Imposta quantità Ufficio"><i class="ri-building-line"></i> <i class="ri-edit-line" style="font-size:0.7rem;"></i></button>`
                    : `<button onclick="window.openAddWarehouseModal('${nomeEscaped}', 'Ufficio')" class="btn-icon" title="Aggiungi a Ufficio"><i class="ri-add-line"></i> <i class="ri-building-line"></i></button>`}
                
                <!-- Trasferisci (solo se entrambi esistono) -->
                ${(uff && casa) 
                    ? `<button onclick="window.openTrasferisciModal(${casa.id})" class="btn-icon" title="Trasferisci"><i class="ri-exchange-line"></i></button>` 
                    : ''}
                
                <!-- Elimina totale dal catalogo -->
                <button onclick="window.deleteCatalogo('${nomeEscaped}')" class="btn-icon btn-icon-danger" title="Elimina dal catalogo (tutti i magazzini)">
                    <i class="ri-delete-bin-line"></i>
                </button>
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
    document.getElementById('magazzino').value = c.magazzino || 'Casa';
    document.getElementById('quantita').value = c.quantita;
    setColor(c.colore || '#6f4e37');
    document.getElementById('note').value = c.note || '';
    
    document.getElementById('modal-title').textContent = 'Modifica Caffè';
    document.getElementById('coffee-modal').classList.add('active');
};

// Elimina singola voce (magazzino)
window.deleteCaffe = async (id) => {
    if (confirm('Rimuovere questo caffè da questo magazzino?')) {
        await fetch(`/api/caffe/${id}`, { method: 'DELETE' });
        loadDashboard();
        loadManageList();
    }
};

// Elimina dal catalogo (tutti i magazzini)
window.deleteCatalogo = async (nome) => {
    if (confirm(`Eliminare "${nome}" da TUTTO il catalogo?\n\nQuesta azione rimuoverà il caffè da tutti i magazzini.`)) {
        await fetch(`/api/caffe/catalogo/${encodeURIComponent(nome)}`, { method: 'DELETE' });
        loadDashboard();
        loadManageList();
    }
};