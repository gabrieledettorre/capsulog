const coffeeModal = document.getElementById('coffee-modal');
const refillModal = document.getElementById('refill-modal');
let currentRefillId = null;

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

document.getElementById('save-btn')?.addEventListener('click', async () => {
    const id = document.getElementById('edit-id').value;
    const data = {
        nome: document.getElementById('nome').value,
        marca: document.getElementById('marca').value || null,
        gusto: document.getElementById('gusto').value || null,
        categoria: document.getElementById('categoria').value,
        magazzino: document.getElementById('magazzino').value,
        quantita: parseInt(document.getElementById('quantita').value) || 0
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

document.getElementById('new-coffee-btn')?.addEventListener('click', () => openModal(false));
document.getElementById('close-modal')?.addEventListener('click', closeModal);
document.getElementById('cancel-modal-btn')?.addEventListener('click', closeModal);
document.getElementById('close-refill-modal')?.addEventListener('click', closeRefillModal);
document.getElementById('refill-cancel')?.addEventListener('click', closeRefillModal);

coffeeModal?.addEventListener('click', (e) => { if (e.target === coffeeModal) closeModal(); });
refillModal?.addEventListener('click', (e) => { if (e.target === refillModal) closeRefillModal(); });

window.openRefillModal = openRefillModal;