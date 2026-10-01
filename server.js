const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database in memoria
let dbCaffe = [
    { id: 1, nome: 'Espresso Bar', marca: 'Lavazza', gusto: 'Intenso', categoria: 'Caffè', magazzino: 'Ufficio', quantita: 12 },
    { id: 2, nome: 'Espresso Bar', marca: 'Lavazza', gusto: 'Intenso', categoria: 'Caffè', magazzino: 'Casa', quantita: 4 },
    { id: 3, nome: 'Ginseng', marca: 'Nescafé', gusto: 'Dolce', categoria: 'Bevande Calde', magazzino: 'Ufficio', quantita: 2 }
];

let nextId = 4;

// GET - Tutti i caffè
app.get('/api/caffe', (req, res) => {
    res.json(dbCaffe);
});

// GET - Singolo caffè
app.get('/api/caffe/:id', (req, res) => {
    const caffe = dbCaffe.find(c => c.id === parseInt(req.params.id));
    if (!caffe) return res.status(404).json({ error: 'Caffè non trovato' });
    res.json(caffe);
});

// POST - Crea nuovo caffè
app.post('/api/caffe', (req, res) => {
    const { nome, marca, gusto, categoria, magazzino, quantita } = req.body;
    if (!nome) return res.status(400).json({ error: 'Il nome è obbligatorio' });

    const nuovoCaffe = {
        id: nextId++,
        nome: nome.trim(),
        marca: marca ? marca.trim() : null,
        gusto: gusto ? gusto.trim() : null,
        categoria: categoria || 'Caffè',
        magazzino: magazzino || 'Ufficio',
        quantita: parseInt(quantita) || 0
    };

    dbCaffe.push(nuovoCaffe);
    res.status(201).json(nuovoCaffe);
});

// PUT - Aggiorna caffè
app.put('/api/caffe/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const idx = dbCaffe.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Caffè non trovato' });

    const { nome, marca, gusto, categoria, magazzino, quantita } = req.body;
    dbCaffe[idx] = {
        ...dbCaffe[idx],
        nome: nome ? nome.trim() : dbCaffe[idx].nome,
        marca: marca !== undefined ? (marca ? marca.trim() : null) : dbCaffe[idx].marca,
        gusto: gusto !== undefined ? (gusto ? gusto.trim() : null) : dbCaffe[idx].gusto,
        categoria: categoria || dbCaffe[idx].categoria,
        magazzino: magazzino || dbCaffe[idx].magazzino,
        quantita: quantita !== undefined ? parseInt(quantita) : dbCaffe[idx].quantita
    };

    res.json(dbCaffe[idx]);
});

// PATCH - Consuma 1 capsula
app.patch('/api/caffe/:id/consuma', (req, res) => {
    const id = parseInt(req.params.id);
    const caffe = dbCaffe.find(c => c.id === id);
    if (!caffe) return res.status(404).json({ error: 'Caffè non trovato' });
    if (caffe.quantita <= 0) return res.status(400).json({ error: 'Scorta esaurita' });

    caffe.quantita -= 1;
    res.json(caffe);
});

// PATCH - Refill aggiuntivo
app.patch('/api/caffe/:id/refill', (req, res) => {
    const id = parseInt(req.params.id);
    const caffe = dbCaffe.find(c => c.id === id);
    if (!caffe) return res.status(404).json({ error: 'Caffè non trovato' });

    const { aggiungi } = req.body;
    const qty = parseInt(aggiungi) || 0;
    if (qty <= 0) return res.status(400).json({ error: 'Quantità non valida' });

    caffe.quantita += qty;
    res.json(caffe);
});

// POST - Trasferisci tra magazzini
app.post('/api/caffe/trasferisci', (req, res) => {
    const { nome, quantita, daMagazzino, aMagazzino } = req.body;
    const qty = parseInt(quantita);

    if (!nome || !daMagazzino || !aMagazzino || !qty || qty <= 0) {
        return res.status(400).json({ error: 'Dati di trasferimento non validi' });
    }

    const sorgente = dbCaffe.find(c => c.nome.toLowerCase() === nome.toLowerCase() && c.magazzino === daMagazzino);
    if (!sorgente || sorgente.quantita < qty) {
        return res.status(400).json({ error: 'Quantità insufficiente nel magazzino di origine' });
    }

    sorgente.quantita -= qty;

    let destinazione = dbCaffe.find(c => c.nome.toLowerCase() === nome.toLowerCase() && c.magazzino === aMagazzino);
    if (destinazione) {
        destinazione.quantita += qty;
    } else {
        destinazione = {
            id: nextId++,
            nome: sorgente.nome,
            marca: sorgente.marca,
            gusto: sorgente.gusto,
            categoria: sorgente.categoria,
            magazzino: aMagazzino,
            quantita: qty
        };
        dbCaffe.push(destinazione);
    }

    res.json({ message: `Trasferite ${qty} capsule da ${daMagazzino} a ${aMagazzino}` });
});

// DELETE - Elimina caffè
app.delete('/api/caffe/:id', (req, res) => {
    const id = parseInt(req.params.id);
    dbCaffe = dbCaffe.filter(c => c.id !== id);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server Capsulog avviato su http://localhost:${PORT}`);
});