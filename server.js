const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================
// DATABASE SQLITE
// ============================
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'capsulog.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Schema (con dettagli già incluso)
db.exec(`
    CREATE TABLE IF NOT EXISTS caffe (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        marca TEXT,
        gusto TEXT,
        categoria TEXT DEFAULT 'Caffè',
        magazzino TEXT DEFAULT 'Casa',
        quantita INTEGER DEFAULT 0,
        colore TEXT DEFAULT '#6f4e37',
        note TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_caffe_nome ON caffe(nome);
    CREATE INDEX IF NOT EXISTS idx_caffe_magazzino ON caffe(magazzino);

    CREATE TABLE IF NOT EXISTS log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        caffe_id INTEGER,
        nome TEXT,
        marca TEXT,
        categoria TEXT,
        colore TEXT,
        magazzino TEXT,
        da_magazzino TEXT,
        a_magazzino TEXT,
        quantita INTEGER,
        timestamp TEXT DEFAULT (datetime('now')),
        dettagli TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_log_timestamp ON log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_log_tipo ON log(tipo);
    CREATE INDEX IF NOT EXISTS idx_log_nome ON log(nome);
`);

// Migrazione una tantum: aggiungi colonna dettagli se manca (db vecchi)
(function migraDettagli() {
    const columns = db.prepare("PRAGMA table_info(log)").all();
    const hasDettagli = columns.some(c => c.name === 'dettagli');
    if (!hasDettagli) {
        db.exec("ALTER TABLE log ADD COLUMN dettagli TEXT");
        console.log('✓ Migrazione: aggiunta colonna "dettagli" alla tabella log');
    }
})();

// ============================
// SEED INIZIALE
// ============================
const countCaffe = db.prepare('SELECT COUNT(*) as n FROM caffe').get();
if (countCaffe.n === 0) {
    const insert = db.prepare(`
        INSERT INTO caffe (nome, marca, gusto, categoria, magazzino, quantita, colore, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run('Espresso Bar', 'Lavazza', 'Intenso', 'Caffè', 'Ufficio', 12, '#6f4e37', 'Intensità 8/12');
    insert.run('Espresso Bar', 'Lavazza', 'Intenso', 'Caffè', 'Casa', 4, '#6f4e37', 'Intensità 8/12');
    insert.run('Ginseng', 'Nescafé', 'Dolce', 'Bevande Calde', 'Ufficio', 2, '#c9a227', 'Delicato');
    console.log('Database inizializzato con dati di esempio');
}

// ============================
// HELPER
// ============================
function logEvento(tipo, dettagli) {
    db.prepare(`
        INSERT INTO log (tipo, caffe_id, nome, marca, categoria, colore, magazzino, da_magazzino, a_magazzino, quantita)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        tipo,
        dettagli.caffeId || null,
        dettagli.nome || null,
        dettagli.marca || null,
        dettagli.categoria || null,
        dettagli.colore || null,
        dettagli.magazzino || null,
        dettagli.daMagazzino || null,
        dettagli.aMagazzino || null,
        dettagli.quantita || 0
    );
}

function rowToCaffe(row) {
    if (!row) return null;
    return {
        id: row.id,
        nome: row.nome,
        marca: row.marca,
        gusto: row.gusto,
        categoria: row.categoria,
        magazzino: row.magazzino,
        quantita: row.quantita,
        colore: row.colore,
        note: row.note
    };
}

function rowToLog(row) {
    if (!row) return null;
    return {
        id: row.id,
        tipo: row.tipo,
        caffeId: row.caffe_id,
        nome: row.nome,
        marca: row.marca,
        categoria: row.categoria,
        colore: row.colore,
        magazzino: row.magazzino,
        daMagazzino: row.da_magazzino,
        aMagazzino: row.a_magazzino,
        quantita: row.quantita,
        timestamp: row.timestamp
    };
}

// ============================
// API CAFFÈ
// ============================

app.get('/api/caffe', (req, res) => {
    const rows = db.prepare('SELECT * FROM caffe ORDER BY nome ASC').all();
    res.json(rows.map(rowToCaffe));
});

app.get('/api/caffe/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM caffe WHERE id = ?').get(parseInt(req.params.id));
    if (!row) return res.status(404).json({ error: 'Caffè non trovato' });
    res.json(rowToCaffe(row));
});

app.post('/api/caffe', (req, res) => {
    const { nome, marca, gusto, categoria, magazzino, quantita, colore, note } = req.body;
    if (!nome || !nome.trim()) {
        return res.status(400).json({ error: 'Il nome è obbligatorio' });
    }

    const result = db.prepare(`
        INSERT INTO caffe (nome, marca, gusto, categoria, magazzino, quantita, colore, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        nome.trim(),
        marca ? marca.trim() : null,
        gusto ? gusto.trim() : null,
        categoria || 'Caffè',
        magazzino || 'Casa',
        parseInt(quantita) || 0,
        colore || '#6f4e37',
        note ? note.trim() : null
    );

    const nuovo = rowToCaffe(db.prepare('SELECT * FROM caffe WHERE id = ?').get(result.lastInsertRowid));
    logEvento('creazione', {
        caffeId: nuovo.id,
        nome: nuovo.nome,
        marca: nuovo.marca,
        categoria: nuovo.categoria,
        colore: nuovo.colore,
        magazzino: nuovo.magazzino,
        quantita: nuovo.quantita
    });
    res.status(201).json(nuovo);
});

app.post('/api/caffe/aggiungi-a-magazzino', (req, res) => {
    const { nome, magazzino, quantita } = req.body;
    if (!nome || !magazzino) {
        return res.status(400).json({ error: 'Nome e magazzino sono obbligatori' });
    }

    const esistente = db.prepare('SELECT * FROM caffe WHERE LOWER(nome) = LOWER(?) LIMIT 1').get(nome);
    if (!esistente) {
        return res.status(404).json({ error: 'Caffè non trovato nel catalogo' });
    }

    const giàPresente = db.prepare('SELECT id FROM caffe WHERE LOWER(nome) = LOWER(?) AND magazzino = ?').get(nome, magazzino);
    if (giàPresente) {
        return res.status(400).json({ error: 'Questo caffè è già presente in questo magazzino' });
    }

    const result = db.prepare(`
        INSERT INTO caffe (nome, marca, gusto, categoria, magazzino, quantita, colore, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        esistente.nome,
        esistente.marca,
        esistente.gusto,
        esistente.categoria,
        magazzino,
        parseInt(quantita) || 0,
        esistente.colore,
        esistente.note
    );

    const nuovo = rowToCaffe(db.prepare('SELECT * FROM caffe WHERE id = ?').get(result.lastInsertRowid));
    logEvento('creazione', {
        caffeId: nuovo.id,
        nome: nuovo.nome,
        marca: nuovo.marca,
        categoria: nuovo.categoria,
        colore: nuovo.colore,
        magazzino: nuovo.magazzino,
        quantita: nuovo.quantita
    });
    res.status(201).json(nuovo);
});

app.put('/api/caffe/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const esistente = db.prepare('SELECT * FROM caffe WHERE id = ?').get(id);
    if (!esistente) return res.status(404).json({ error: 'Caffè non trovato' });

    const { nome, marca, gusto, categoria, magazzino, quantita, colore, note } = req.body;
    const vecchioNome = esistente.nome;

    const nuovoNome = nome && nome.trim() ? nome.trim() : esistente.nome;
    const nuovaMarca = marca !== undefined ? (marca ? marca.trim() : null) : esistente.marca;
    const nuovoGusto = gusto !== undefined ? (gusto ? gusto.trim() : null) : esistente.gusto;
    const nuovaCategoria = categoria || esistente.categoria;
    const nuovoMagazzino = magazzino || esistente.magazzino;
    const nuovaQuantita = quantita !== undefined ? parseInt(quantita) : esistente.quantita;
    const nuovoColore = colore !== undefined ? colore : esistente.colore;
    const nuoveNote = note !== undefined ? (note ? note.trim() : null) : esistente.note;

    const tx = db.transaction(() => {
        db.prepare(`
            UPDATE caffe 
            SET nome = ?, marca = ?, gusto = ?, categoria = ?, magazzino = ?, quantita = ?, colore = ?, note = ?
            WHERE id = ?
        `).run(nuovoNome, nuovaMarca, nuovoGusto, nuovaCategoria, nuovoMagazzino, nuovaQuantita, nuovoColore, nuoveNote, id);

        if (vecchioNome && nuovoNome !== vecchioNome) {
            db.prepare(`
                UPDATE caffe 
                SET nome = ?, marca = ?, gusto = ?, categoria = ?, colore = ?, note = ?
                WHERE LOWER(nome) = LOWER(?) AND id != ?
            `).run(nuovoNome, nuovaMarca, nuovoGusto, nuovaCategoria, nuovoColore, nuoveNote, vecchioNome, id);
        } else {
            db.prepare(`
                UPDATE caffe 
                SET marca = ?, gusto = ?, categoria = ?, colore = ?, note = ?
                WHERE LOWER(nome) = LOWER(?) AND id != ?
            `).run(nuovaMarca, nuovoGusto, nuovaCategoria, nuovoColore, nuoveNote, nuovoNome, id);
        }
    });
    tx();

    const aggiornato = rowToCaffe(db.prepare('SELECT * FROM caffe WHERE id = ?').get(id));
    res.json(aggiornato);
});

app.patch('/api/caffe/:id/consuma', (req, res) => {
    const id = parseInt(req.params.id);
    const caffe = db.prepare('SELECT * FROM caffe WHERE id = ?').get(id);
    if (!caffe) return res.status(404).json({ error: 'Caffè non trovato' });
    if (caffe.quantita <= 0) return res.status(400).json({ error: 'Scorta esaurita' });

    db.prepare('UPDATE caffe SET quantita = quantita - 1 WHERE id = ?').run(id);

    logEvento('consumo', {
        caffeId: caffe.id,
        nome: caffe.nome,
        marca: caffe.marca,
        categoria: caffe.categoria,
        colore: caffe.colore,
        magazzino: caffe.magazzino,
        quantita: 1
    });

    res.json(rowToCaffe(db.prepare('SELECT * FROM caffe WHERE id = ?').get(id)));
});

app.patch('/api/caffe/:id/refill', (req, res) => {
    const id = parseInt(req.params.id);
    const caffe = db.prepare('SELECT * FROM caffe WHERE id = ?').get(id);
    if (!caffe) return res.status(404).json({ error: 'Caffè non trovato' });

    const { aggiungi } = req.body;
    const qty = parseInt(aggiungi) || 0;
    if (qty <= 0) return res.status(400).json({ error: 'Quantità non valida' });

    db.prepare('UPDATE caffe SET quantita = quantita + ? WHERE id = ?').run(qty, id);

    logEvento('refill', {
        caffeId: caffe.id,
        nome: caffe.nome,
        marca: caffe.marca,
        categoria: caffe.categoria,
        colore: caffe.colore,
        magazzino: caffe.magazzino,
        quantita: qty
    });

    res.json(rowToCaffe(db.prepare('SELECT * FROM caffe WHERE id = ?').get(id)));
});

app.post('/api/caffe/trasferisci', (req, res) => {
    const { nome, quantita, daMagazzino, aMagazzino } = req.body;
    const qty = parseInt(quantita);

    if (!nome || !daMagazzino || !aMagazzino || !qty || qty <= 0) {
        return res.status(400).json({ error: 'Dati di trasferimento non validi' });
    }
    if (daMagazzino === aMagazzino) {
        return res.status(400).json({ error: 'I magazzini devono essere diversi' });
    }

    const sorgente = db.prepare('SELECT * FROM caffe WHERE LOWER(nome) = LOWER(?) AND magazzino = ?').get(nome, daMagazzino);
    if (!sorgente || sorgente.quantita < qty) {
        return res.status(400).json({ error: 'Quantità insufficiente nel magazzino di origine' });
    }

    const tx = db.transaction(() => {
        db.prepare('UPDATE caffe SET quantita = quantita - ? WHERE id = ?').run(qty, sorgente.id);

        const destinazione = db.prepare('SELECT * FROM caffe WHERE LOWER(nome) = LOWER(?) AND magazzino = ?').get(nome, aMagazzino);
        if (destinazione) {
            db.prepare('UPDATE caffe SET quantita = quantita + ? WHERE id = ?').run(qty, destinazione.id);
        } else {
            db.prepare(`
                INSERT INTO caffe (nome, marca, gusto, categoria, magazzino, quantita, colore, note)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(sorgente.nome, sorgente.marca, sorgente.gusto, sorgente.categoria, aMagazzino, qty, sorgente.colore, sorgente.note);
        }
    });
    tx();

    logEvento('trasferimento', {
        nome: sorgente.nome,
        marca: sorgente.marca,
        categoria: sorgente.categoria,
        colore: sorgente.colore,
        daMagazzino,
        aMagazzino,
        quantita: qty
    });

    res.json({ message: `Trasferite ${qty} capsule da ${daMagazzino} a ${aMagazzino}` });
});

app.delete('/api/caffe/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.prepare('DELETE FROM caffe WHERE id = ?').run(id);
    res.json({ success: true });
});

app.delete('/api/caffe/catalogo/:nome', (req, res) => {
    const nome = decodeURIComponent(req.params.nome);
    const result = db.prepare('DELETE FROM caffe WHERE LOWER(nome) = LOWER(?)').run(nome);
    logEvento('eliminazione', { nome });
    res.json({ success: true, rimosse: result.changes });
});

// ============================
// API LOG
// ============================

app.get('/api/log', (req, res) => {
    const conditions = [];
    const params = [];

    if (req.query.tipo) {
        conditions.push('tipo = ?');
        params.push(req.query.tipo);
    }
    if (req.query.dal) {
        conditions.push('timestamp >= ?');
        params.push(req.query.dal);
    }
    if (req.query.al) {
        conditions.push('timestamp <= ?');
        params.push(req.query.al + 'T23:59:59');
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const limit = parseInt(req.query.limit) || 500;

    const rows = db.prepare(`SELECT * FROM log ${where} ORDER BY timestamp DESC LIMIT ?`).all(...params, limit);
    res.json(rows.map(rowToLog));
});

// ============================
// API UNDO CONSUMO
// ============================

// GET - Ultimo consumo annullabile
app.get('/api/log/ultimo-consumo', (req, res) => {
    try {
        const ultimo = db.prepare(`
            SELECT * FROM log 
            WHERE tipo = 'consumo' 
            ORDER BY id DESC 
            LIMIT 1
        `).get();
        
        if (!ultimo) {
            return res.json({ annullabile: false });
        }
        
        const giàAnnullato = db.prepare(`
            SELECT * FROM log 
            WHERE tipo = 'consumo_annullato' 
              AND dettagli LIKE ?
            LIMIT 1
        `).get(`%"consumo_id":${ultimo.id}%`);
        
        if (giàAnnullato) {
            return res.json({ annullabile: false });
        }
        
        res.json({
            annullabile: true,
            log: rowToLog(ultimo)
        });
    } catch (e) {
        console.error('Errore ultimo-consumo:', e);
        res.status(500).json({ error: 'Errore server: ' + e.message });
    }
});

// POST - Annulla un consumo
app.post('/api/log/annulla-consumo/:logId', (req, res) => {
    try {
        const logId = parseInt(req.params.logId);
        const logConsumo = db.prepare("SELECT * FROM log WHERE id = ? AND tipo = 'consumo'").get(logId);
        
        if (!logConsumo) {
            return res.status(404).json({ error: 'Consumo non trovato' });
        }
        
        const ultimo = db.prepare(`
            SELECT * FROM log WHERE tipo = 'consumo' ORDER BY id DESC LIMIT 1
        `).get();
        
        if (!ultimo || ultimo.id !== logId) {
            return res.status(400).json({ error: 'Puoi annullare solo l\'ultimo consumo' });
        }
        
        const giàAnnullato = db.prepare(`
            SELECT * FROM log 
            WHERE tipo = 'consumo_annullato' 
              AND dettagli LIKE ?
            LIMIT 1
        `).get(`%"consumo_id":${logId}%`);
        
        if (giàAnnullato) {
            return res.status(400).json({ error: 'Consumo già annullato' });
        }
        
        const caffe = db.prepare('SELECT * FROM caffe WHERE id = ?').get(logConsumo.caffe_id);
        if (!caffe) {
            return res.status(404).json({ error: 'Caffè non più in catalogo' });
        }
        
        const qty = logConsumo.quantita || 1;
        
        db.prepare('UPDATE caffe SET quantita = quantita + ? WHERE id = ?').run(qty, caffe.id);
        
        db.prepare(`
            INSERT INTO log (tipo, caffe_id, nome, marca, categoria, colore, magazzino, quantita, dettagli)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            'consumo_annullato',
            caffe.id,
            caffe.nome,
            caffe.marca,
            caffe.categoria,
            caffe.colore,
            caffe.magazzino,
            qty,
            JSON.stringify({ consumo_id: logId })
        );
        
        res.json({ 
            success: true, 
            ripristinato: qty,
            nome: caffe.nome,
            magazzino: caffe.magazzino
        });
    } catch (e) {
        console.error('Errore annulla-consumo:', e);
        res.status(500).json({ error: 'Errore server: ' + e.message });
    }
});

// ============================
// API STATISTICHE (con sottrazione annullamenti)
// ============================

app.get('/api/statistiche', (req, res) => {
    try {
        const giorni = parseInt(req.query.giorni) || 30;

        const oggi = new Date();
        const al = oggi.toISOString().slice(0, 19).replace('T', ' ');
        const dalDate = new Date();
        dalDate.setDate(dalDate.getDate() - giorni + 1);
        dalDate.setHours(0, 0, 0, 0);
        const dal = dalDate.toISOString().slice(0, 19).replace('T', ' ');

        // Consumi - annullamenti, per giorno (heatmap)
        const heatmapRows = db.prepare(`
            SELECT 
                DATE(timestamp, 'localtime') as giorno,
                SUM(CASE WHEN tipo = 'consumo' THEN quantita ELSE -quantita END) as totale
            FROM log 
            WHERE tipo IN ('consumo', 'consumo_annullato') 
              AND timestamp >= ? AND timestamp <= ?
            GROUP BY DATE(timestamp, 'localtime')
        `).all(dal, al);
        
        const heatmap = {};
        heatmapRows.forEach(r => { 
            if (r.totale > 0) {
                heatmap[r.giorno] = r.totale;
            }
        });

        // Totale consumato (consumi - annullamenti)
        const totaleConsumatoRow = db.prepare(`
            SELECT SUM(CASE WHEN tipo = 'consumo' THEN quantita ELSE -quantita END) as totale
            FROM log 
            WHERE tipo IN ('consumo', 'consumo_annullato') 
              AND timestamp >= ? AND timestamp <= ?
        `).get(dal, al);
        const totaleConsumato = totaleConsumatoRow.totale || 0;

        // Top caffè consumati (consumi - annullamenti)
        const topCaffeRows = db.prepare(`
            SELECT 
                nome,
                marca,
                MAX(colore) as colore,
                SUM(CASE WHEN tipo = 'consumo' THEN quantita ELSE -quantita END) as quantita,
                SUM(CASE WHEN tipo = 'consumo' AND magazzino = 'Ufficio' THEN quantita 
                         WHEN tipo = 'consumo_annullato' AND magazzino = 'Ufficio' THEN -quantita 
                         ELSE 0 END) as ufficio,
                SUM(CASE WHEN tipo = 'consumo' AND magazzino = 'Casa' THEN quantita 
                         WHEN tipo = 'consumo_annullato' AND magazzino = 'Casa' THEN -quantita 
                         ELSE 0 END) as casa
            FROM log 
            WHERE tipo IN ('consumo', 'consumo_annullato') 
              AND timestamp >= ? AND timestamp <= ?
            GROUP BY nome, marca
            HAVING quantita > 0
            ORDER BY quantita DESC
        `).all(dal, al);

        // Top refill
        const topRefillRows = db.prepare(`
            SELECT 
                nome,
                marca,
                MAX(colore) as colore,
                SUM(quantita) as quantita
            FROM log 
            WHERE tipo = 'refill' AND timestamp >= ? AND timestamp <= ?
            GROUP BY nome, marca
            ORDER BY quantita DESC
        `).all(dal, al);

        // Per categoria (consumi - annullamenti)
        const perCategoriaRows = db.prepare(`
            SELECT categoria, 
                   SUM(CASE WHEN tipo = 'consumo' THEN quantita ELSE -quantita END) as quantita
            FROM log 
            WHERE tipo IN ('consumo', 'consumo_annullato') 
              AND timestamp >= ? AND timestamp <= ?
            GROUP BY categoria
        `).all(dal, al);
        
        const perCategoria = {};
        perCategoriaRows.forEach(r => { 
            if (r.quantita > 0) perCategoria[r.categoria || 'Altro'] = r.quantita; 
        });

        // Per magazzino (consumi - annullamenti)
        const perMagazzinoRows = db.prepare(`
            SELECT magazzino, 
                   SUM(CASE WHEN tipo = 'consumo' THEN quantita ELSE -quantita END) as quantita
            FROM log 
            WHERE tipo IN ('consumo', 'consumo_annullato') 
              AND timestamp >= ? AND timestamp <= ?
            GROUP BY magazzino
        `).all(dal, al);
        
        const perMagazzino = { Ufficio: 0, Casa: 0 };
        perMagazzinoRows.forEach(r => { 
            if (r.magazzino) perMagazzino[r.magazzino] = Math.max(0, r.quantita);
        });

        // Trasferimenti
        const trasferimentiRow = db.prepare(`
            SELECT COUNT(*) as n FROM log 
            WHERE tipo = 'trasferimento' AND timestamp >= ? AND timestamp <= ?
        `).get(dal, al);

        // Refill totale
        const refillRow = db.prepare(`
            SELECT SUM(quantita) as totale FROM log 
            WHERE tipo = 'refill' AND timestamp >= ? AND timestamp <= ?
        `).get(dal, al);

        res.json({
            periodo: { dal, al, giorni },
            totaleConsumato: Math.max(0, totaleConsumato),
            mediaGiornaliera: (Math.max(0, totaleConsumato) / giorni).toFixed(2),
            totaleRefill: refillRow.totale || 0,
            totaleTrasferimenti: trasferimentiRow.n || 0,
            heatmap,
            topCaffe: topCaffeRows,
            topRefill: topRefillRows,
            perCategoria,
            perMagazzino
        });
    } catch (e) {
        console.error('Errore statistiche:', e);
        res.status(500).json({ error: 'Errore server: ' + e.message });
    }
});

// ============================
// AVVIO
// ============================
app.listen(PORT, () => {
    console.log(`Server Capsulog avviato su http://localhost:${PORT}`);
    console.log(`Database: ${DB_PATH}`);
});