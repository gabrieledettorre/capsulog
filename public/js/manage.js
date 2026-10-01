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
        if (!grouped[c.nome]) grouped[c.nome] = {};
        grouped[c.nome][c.magazzino] = c;
        grouped[c.nome]['dettagli'] = { marca: c.marca, gusto: c.gusto, categoria: c.categoria };
    });
    
    container.innerHTML = Object.keys(grouped).map(nome => {
        const item = grouped[nome];
        const ufficio = item['Ufficio'];
        const casa = item['Casa'];
        const dettagli = item.dettagli;
        
        return `
        <div class="manage-item">
            <div class="manage-item-info">
                <span style="font-weight:600;"><i class="ri-cup-line"></i> ${escapeHtml(nome)}</span>
                ${dettagli.marca ? `<span style="color:var(--accent);font-size:0.75rem;"><i class="ri-store-line"></i> ${escapeHtml(dettagli.marca)}</span>` : ''}
                <span style="color:var(--text-secondary);font-size:0.75rem;"><i class="ri-taste-line"></i> ${escapeHtml(dettagli.gusto) || '—'}</span>
                <span style="font-size:0.75rem;"><i class="ri-building-line"></i> Ufficio: ${ufficio ? ufficio.quantita : 0}</span>
                <span style="font-size:0.75rem;"><i class="ri-home-line"></i> Casa: ${casa ? casa.quantita : 0}</span>
            </div>
            <div style="display:flex;gap:0.5rem;">
                ${ufficio ? `<button onclick="window.editCaffe(${ufficio.id})" class="btn-icon" title="Modifica Ufficio"><i class="ri-building-line"></i></button>` : ''}
                ${casa ? `<button onclick="window.editCaffe(${casa.id})" class="btn-icon" title="Modifica Casa"><i class="ri-home-line"></i></button>` : ''}
                ${ufficio ? `<button onclick="window.deleteCaffe(${ufficio.id})" class="btn-icon" title="Elimina Ufficio"><i class="ri-delete-bin-line"></i></button>` : ''}
                ${casa ? `<button onclick="window.deleteCaffe(${casa.id})" class="btn-icon" title="Elimina Casa"><i class="ri-delete-bin-line"></i></button>` : ''}
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
    const nuova = prompt('Nuova quantità totale:');
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
    document.getElementById('modal-title').textContent = 'Modifica Caffè';
    document.getElementById('coffee-modal').classList.add('active');
};

window.deleteCaffe = async (id) => {
    if (confirm('Eliminare questo caffè?')) {
        await fetch(`/api/caffe/${id}`, { method: 'DELETE' });
        loadDashboard();
        loadManageList();
    }
};