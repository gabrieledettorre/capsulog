let trasferisciModal = document.getElementById('trasferisci-modal');

function openTrasferisciModal(id) {
    fetch(`/api/caffe/${id}`)
        .then(r => r.json())
        .then(data => {
            document.getElementById('trasferisci-id').value = data.id;
            document.getElementById('trasferisci-nome').value = data.nome;
            document.getElementById('trasferisci-da').value = data.magazzino;
            // Default: se sono in Casa → Ufficio (flusso naturale), altrimenti Ufficio → Casa
            document.getElementById('trasferisci-a').value = data.magazzino === 'Casa' ? 'Ufficio' : 'Casa';
            document.getElementById('trasferisci-quantita').value = 1;
            trasferisciModal.classList.add('active');
        });
}

function closeTrasferisciModal() {
    trasferisciModal.classList.remove('active');
}

document.getElementById('trasferisci-confirm')?.addEventListener('click', async () => {
    const nome = document.getElementById('trasferisci-nome').value;
    const daMagazzino = document.getElementById('trasferisci-da').value;
    const aMagazzino = document.getElementById('trasferisci-a').value;
    const quantita = parseInt(document.getElementById('trasferisci-quantita').value) || 1;
    
    if (quantita <= 0) {
        alert('Inserisci una quantità valida');
        return;
    }
    if (daMagazzino === aMagazzino) {
        alert('I magazzini devono essere diversi');
        return;
    }
    
    try {
        const res = await fetch('/api/caffe/trasferisci', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, quantita, daMagazzino, aMagazzino })
        });
        
        const result = await res.json();
        if (!res.ok) {
            alert(result.error || 'Errore durante il trasferimento');
            return;
        }
        
        closeTrasferisciModal();
        loadDashboard();
        loadManageList();
    } catch (error) {
        alert('Errore durante il trasferimento');
    }
});

document.getElementById('close-trasferisci-modal')?.addEventListener('click', closeTrasferisciModal);
document.getElementById('trasferisci-cancel')?.addEventListener('click', closeTrasferisciModal);

trasferisciModal?.addEventListener('click', (e) => {
    if (e.target === trasferisciModal) closeTrasferisciModal();
});

window.openTrasferisciModal = openTrasferisciModal;