const coffeeModal = document.getElementById('coffee-modal');
const refillModal = document.getElementById('refill-modal');
const addWarehouseModal = document.getElementById('add-to-warehouse-modal');
let currentRefillId = null;

// --- Sync color picker <-> input hex ---
const colorInput = document.getElementById('colore');
const hexInput = document.getElementById('colore-hex');

function setColor(value) {
    colorInput.value = value;
    hexInput.value = value;
}

colorInput?.addEventListener('input', () => {
    hexInput.value = colorInput.value;
});

hexInput?.addEventListener('input', () => {
    let v = hexInput.value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    // Accetta solo hex validi (3 o 6 cifre)
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
        // Normalizza a 6 cifre se è a 3
        if (v.length === 4) {
            v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
        }
        colorInput.value = v.toLowerCase();
    }
});

hexInput?.addEventListener('blur', () => {
    // Al blur, se non valido, ripristina dal color picker
    let v = hexInput.value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
        hexInput.value = colorInput.value;
    } else {
        if (v.length === 4) {
            v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
        }
        hexInput.value = v.toLowerCase();
        colorInput.value = v.toLowerCase();
    }
});

// --- Preset colori ---
document.querySelectorAll('.color-preset').forEach(btn => {
    btn.style.background = btn.dataset.color;
    btn.addEventListener('click', () => {
        setColor(btn.dataset.color);
    });
});

function openModal(isEdit = false) {
    coffeeModal.classList.add('active');
    if (!isEdit) {
        document.getElementById('modal-title').textContent = 'Nuovo Caffè';
        resetForm();
    }
}

function closeModal() {
    coffeeModal.classList.remove('active');
    resetForm();
}

function resetForm() {
    document.getElementById('edit-id').value = '';
    document.getElementById('nome').value = '';
    document.getElementById('marca').value = '';
    document.getElementById('gusto').value = '';
    document.getElementById('categoria').value = 'Caffè';
    document.getElementById('magazzino').value = currentMagazzino || 'Ufficio';
    document.getElementById('quantita').value = 0;
    setColor('#6f4e37');
    document.getElementById('note').value = '';
}

function openRefillModal(id) {
    currentRefillId = id;
    refillModal.classList.add('active');
    document.getElementById('refill-quantity').value = 5;
}

function closeRefillModal() {
    refillModal.classList.remove('active');
    currentRefillId = null;
}

// --- Modal "Aggiungi a magazzino" ---
function openAddWarehouseModal(nome) {
    document.getElementById('add-warehouse-nome').textContent = nome;
    document.getElementById('add-warehouse-nome-hidden').value = nome;
    document.getElementById('add-warehouse-magazzino').value = currentMagazzino === 'Ufficio' ? 'Casa' : 'Ufficio';
    document.getElementById('add-warehouse-quantita').value = 0;
    addWarehouseModal.classList.add('active');
}

function closeAddWarehouseModal() {
    addWarehouseModal.classList.remove('active');
}

// --- Salva caffè ---
document.getElementById('save-btn')?.addEventListener('click', async () => {
    const id = document.getElementById('edit-id').value;
    const data = {
        nome: document.getElementById('nome').value,
        marca: document.getElementById('marca').value || null,
        gusto: document.getElementById('gusto').value || null,
        categoria: document.getElementById('categoria').value,
        magazzino: document.getElementById('magazzino').value,
        quantita: parseInt(document.getElementById('quantita').value) || 0,
        colore: hexInput.value || '#6f4e37',
        note: document.getElementById('note').value || null
    };
    
    if (!data.nome) {
        alert('Il nome è obbligatorio');
        return;
    }
    
    if (id) {
        await fetch(`/api/caffe/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } else {
        await fetch('/api/caffe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }
    closeModal();
    loadDashboard();
    loadManageList();
});

// --- Conferma aggiungi a magazzino ---
document.getElementById('add-warehouse-confirm')?.addEventListener('click', async () => {
    const nome = document.getElementById('add-warehouse-nome-hidden').value;
    const magazzino = document.getElementById('add-warehouse-magazzino').value;
    const quantita = parseInt(document.getElementById('add-warehouse-quantita').value) || 0;
    
    const res = await fetch('/api/caffe/aggiungi-a-magazzino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, magazzino, quantita })
    });
    
    if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Errore');
        return;
    }
    
    closeAddWarehouseModal();
    loadDashboard();
    loadManageList();
});

// --- Refill ---
document.getElementById('refill-confirm')?.addEventListener('click', async () => {
    const aggiungi = parseInt(document.getElementById('refill-quantity').value);
    if (aggiungi && aggiungi > 0 && currentRefillId) {
        await fetch(`/api/caffe/${currentRefillId}/refill`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aggiungi })
        });
        loadDashboard();
        loadManageList();
    }
    closeRefillModal();
});

// --- Event listeners ---
document.getElementById('new-coffee-btn')?.addEventListener('click', () => openModal(false));
document.getElementById('close-modal')?.addEventListener('click', closeModal);
document.getElementById('cancel-modal-btn')?.addEventListener('click', closeModal);
document.getElementById('close-refill-modal')?.addEventListener('click', closeRefillModal);
document.getElementById('refill-cancel')?.addEventListener('click', closeRefillModal);
document.getElementById('close-add-warehouse-modal')?.addEventListener('click', closeAddWarehouseModal);
document.getElementById('add-warehouse-cancel')?.addEventListener('click', closeAddWarehouseModal);

coffeeModal?.addEventListener('click', (e) => { if (e.target === coffeeModal) closeModal(); });
refillModal?.addEventListener('click', (e) => { if (e.target === refillModal) closeRefillModal(); });
addWarehouseModal?.addEventListener('click', (e) => { if (e.target === addWarehouseModal) closeAddWarehouseModal(); });

window.openRefillModal = openRefillModal;
window.openAddWarehouseModal = openAddWarehouseModal;