let statsGiorni = 30;

async function loadStats() {
    const res = await fetch(`/api/statistiche?giorni=${statsGiorni}`);
    const data = await res.json();
    
    renderOverview(data);
    renderHeatmap(data.heatmap, statsGiorni);
    renderTopCaffe(data.topCaffe);
    renderTopRefill(data.topRefill);
    renderPerCategoria(data.perCategoria);
    renderPerMagazzino(data.perMagazzino);
}

function renderOverview(data) {
    const el = document.getElementById('stats-overview');
    if (!el) return;
    
    el.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${data.totaleConsumato}</div>
            <div class="stat-label"><i class="ri-cup-line"></i> Capsule consumate</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${data.mediaGiornaliera}</div>
            <div class="stat-label"><i class="ri-line-chart-line"></i> Media giornaliera</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${data.totaleRefill}</div>
            <div class="stat-label"><i class="ri-shopping-bag-line"></i> Capsule aggiunte</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${data.totaleTrasferimenti}</div>
            <div class="stat-label"><i class="ri-exchange-line"></i> Trasferimenti</div>
        </div>
    `;
}

function renderHeatmap(heatmap, giorni) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;
    
    // Mostra sempre almeno 12 settimane (84 giorni), oppure estendi in base al periodo
    const numGiorni = Math.max(84, giorni);
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    
    // Trova il lunedì della settimana più vecchia
    const inizio = new Date(oggi);
    inizio.setDate(inizio.getDate() - numGiorni + 1);
    const dayOfWeek = (inizio.getDay() + 6) % 7; // 0 = lunedì
    inizio.setDate(inizio.getDate() - dayOfWeek);
    
    // Calcola max e totale per scalatura e statistiche
    const maxConsumo = Math.max(1, ...Object.values(heatmap || {}));
    const totPeriodo = Object.values(heatmap || {}).reduce((s, v) => s + v, 0);
    const giorniAttivi = Object.values(heatmap || {}).filter(v => v > 0).length;
    
    // Costruisci settimane
    const settimane = [];
    let corrente = new Date(inizio);
    while (corrente <= oggi) {
        const settimana = [];
        for (let d = 0; d < 7; d++) {
            const dataStr = corrente.toISOString().split('T')[0];
            settimana.push({
                data: dataStr,
                dataObj: new Date(corrente),
                futuro: corrente > oggi,
                quantita: heatmap[dataStr] || 0
            });
            corrente.setDate(corrente.getDate() + 1);
        }
        settimane.push(settimana);
    }
    
    const mesiLabel = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    const giorniLabel = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
    
    // Riepilogo in alto
    let summaryHtml = `
        <div class="heatmap-summary">
            <div class="heatmap-summary-item">
                <span class="heatmap-summary-value">${totPeriodo}</span>
                <span class="heatmap-summary-label">capsule totali</span>
            </div>
            <div class="heatmap-summary-item">
                <span class="heatmap-summary-value">${giorniAttivi}</span>
                <span class="heatmap-summary-label">giorni attivi</span>
            </div>
            <div class="heatmap-summary-item">
                <span class="heatmap-summary-value">${maxConsumo}</span>
                <span class="heatmap-summary-label">record giornaliero</span>
            </div>
        </div>
    `;
    
    // Griglia heatmap
    let html = '<div class="heatmap-scroll">';
    html += '<div class="heatmap-grid">';
    
    // Colonna etichette giorni (a sinistra)
    html += '<div class="heatmap-day-labels">';
    html += '<div class="heatmap-day-label header"></div>'; // spazio per riga mesi
    giorniLabel.forEach(g => {
        html += `<div class="heatmap-day-label">${g}</div>`;
    });
    html += '</div>';
    
    // Settimane
    html += '<div class="heatmap-weeks">';
    let ultimoMese = -1;
    let ultimaSettimanaMese = '';
    settimane.forEach((settimana) => {
        const primoGiorno = settimana[0].dataObj;
        const mese = primoGiorno.getMonth();
        const annoCorrente = primoGiorno.getFullYear();
        let mostraMese = '';
        
        // Mostra il nome del mese quando cambia (evitando ripetizioni troppo vicine)
        const keyMese = `${annoCorrente}-${mese}`;
        if (keyMese !== ultimaSettimanaMese && mese !== ultimoMese) {
            // Verifica che non ci sia già un'etichetta troppo vicina
            const giorniDallInizioMese = primoGiorno.getDate();
            if (giorniDallInizioMese <= 7 || mese !== ultimoMese) {
                mostraMese = mesiLabel[mese];
                if (mese === 0) mostraMese += ` ${annoCorrente}`;
                ultimoMese = mese;
                ultimaSettimanaMese = keyMese;
            }
        }
        
        html += '<div class="heatmap-week">';
        html += `<div class="heatmap-month-label">${mostraMese}</div>`;
        settimana.forEach(giorno => {
            const livello = giorno.futuro ? 'futuro' : getHeatLevel(giorno.quantita, maxConsumo);
            const dataIt = giorno.dataObj.toLocaleDateString('it-IT', { 
                weekday: 'short', day: 'numeric', month: 'short' 
            });
            const titolo = giorno.futuro 
                ? '' 
                : `${dataIt}: ${giorno.quantita} capsule`;
            html += `<div class="heatmap-cell level-${livello}" title="${titolo}" data-qty="${giorno.quantita}" data-date="${giorno.data}"></div>`;
        });
        html += '</div>';
    });
    html += '</div></div></div>';
    
    // Legenda
    let legendHtml = `
        <div class="heatmap-legend">
            <span class="heatmap-legend-label">Meno</span>
            <div class="heatmap-legend-scale">
                <span class="heatmap-cell level-0"></span>
                <span class="heatmap-cell level-1"></span>
                <span class="heatmap-cell level-2"></span>
                <span class="heatmap-cell level-3"></span>
                <span class="heatmap-cell level-4"></span>
            </div>
            <span class="heatmap-legend-label">Più</span>
            <span class="heatmap-legend-range">(0 → ${maxConsumo})</span>
        </div>
    `;
    
    container.innerHTML = summaryHtml + html + legendHtml;
}

function getHeatLevel(quantita, max) {
    if (quantita === 0) return 0;
    const ratio = quantita / max;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
}

function renderTopCaffe(topCaffe) {
    const container = document.getElementById('top-caffe-container');
    if (!container) return;
    
    if (topCaffe.length === 0) {
        container.innerHTML = '<div class="empty-chart"><i class="ri-inbox-line"></i> Nessun consumo nel periodo</div>';
        return;
    }
    
    const max = topCaffe[0].quantita;
    const top5 = topCaffe.slice(0, 8);
    
    container.innerHTML = top5.map(c => {
        const perc = (c.quantita / max) * 100;
        const nome = c.marca ? `${c.nome} <span style="opacity:0.6;font-size:0.7rem;">${c.marca}</span>` : c.nome;
        return `
            <div class="bar-row">
                <div class="bar-label" title="${c.nome}">
                    <span class="coffee-color-dot" style="background:${c.colore};"></span>
                    ${nome}
                </div>
                <div class="bar-track">
                    <div class="bar-fill" style="width:${perc}%;background:${c.colore};"></div>
                </div>
                <div class="bar-value">${c.quantita}</div>
            </div>
        `;
    }).join('');
}

function renderTopRefill(topRefill) {
    const container = document.getElementById('top-refill-container');
    if (!container) return;
    
    if (topRefill.length === 0) {
        container.innerHTML = '<div class="empty-chart"><i class="ri-inbox-line"></i> Nessun refill nel periodo</div>';
        return;
    }
    
    const max = topRefill[0].quantita;
    const top5 = topRefill.slice(0, 8);
    
    container.innerHTML = top5.map(c => {
        const perc = (c.quantita / max) * 100;
        const nome = c.marca ? `${c.nome} <span style="opacity:0.6;font-size:0.7rem;">${c.marca}</span>` : c.nome;
        return `
            <div class="bar-row">
                <div class="bar-label" title="${c.nome}">
                    <span class="coffee-color-dot" style="background:${c.colore};"></span>
                    ${nome}
                </div>
                <div class="bar-track">
                    <div class="bar-fill" style="width:${perc}%;background:${c.colore};"></div>
                </div>
                <div class="bar-value">${c.quantita}</div>
            </div>
        `;
    }).join('');
}

function renderPerCategoria(perCategoria) {
    const container = document.getElementById('per-categoria-container');
    if (!container) return;
    
    const entries = Object.entries(perCategoria);
    if (entries.length === 0) {
        container.innerHTML = '<div class="empty-chart"><i class="ri-inbox-line"></i> Nessun dato</div>';
        return;
    }
    
    const totale = entries.reduce((s, [, v]) => s + v, 0);
    const colori = ['#6f4e37', '#c9a227', '#a67c52', '#4a7c59', '#7a3b8f', '#2c5f8a'];
    
    // Barra stacked
    let stackedHtml = '<div class="stacked-bar">';
    entries.forEach(([, v], i) => {
        const perc = (v / totale) * 100;
        stackedHtml += `<div class="stacked-segment" style="width:${perc}%;background:${colori[i % colori.length]};" title="${v} (${perc.toFixed(1)}%)"></div>`;
    });
    stackedHtml += '</div>';
    
    // Legenda
    let legendHtml = '<div class="legend-list">';
    entries.forEach(([k, v], i) => {
        const perc = ((v / totale) * 100).toFixed(1);
        legendHtml += `
            <div class="legend-item">
                <span class="legend-dot" style="background:${colori[i % colori.length]};"></span>
                <span class="legend-label">${escapeHtml(k)}</span>
                <span class="legend-value">${v} (${perc}%)</span>
            </div>
        `;
    });
    legendHtml += '</div>';
    
    container.innerHTML = stackedHtml + legendHtml;
}

function renderPerMagazzino(perMagazzino) {
    const container = document.getElementById('per-magazzino-container');
    if (!container) return;
    
    const totale = (perMagazzino.Ufficio || 0) + (perMagazzino.Casa || 0);
    if (totale === 0) {
        container.innerHTML = '<div class="empty-chart"><i class="ri-inbox-line"></i> Nessun dato</div>';
        return;
    }
    
    const uffPerc = ((perMagazzino.Ufficio / totale) * 100).toFixed(1);
    const casaPerc = ((perMagazzino.Casa / totale) * 100).toFixed(1);
    
    container.innerHTML = `
        <div class="magazzino-stat">
            <div class="magazzino-stat-header">
                <span><i class="ri-building-line"></i> Ufficio</span>
                <span><strong>${perMagazzino.Ufficio}</strong> (${uffPerc}%)</span>
            </div>
            <div class="bar-track" style="height:10px;">
                <div class="bar-fill" style="width:${uffPerc}%;background:#6f4e37;"></div>
            </div>
        </div>
        <div class="magazzino-stat" style="margin-top:1rem;">
            <div class="magazzino-stat-header">
                <span><i class="ri-home-line"></i> Casa</span>
                <span><strong>${perMagazzino.Casa}</strong> (${casaPerc}%)</span>
            </div>
            <div class="bar-track" style="height:10px;">
                <div class="bar-fill" style="width:${casaPerc}%;background:#a67c52;"></div>
            </div>
        </div>
    `;
}

// --- Inizializzazione pulsanti periodo ---
document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        statsGiorni = parseInt(btn.dataset.giorni);
        loadStats();
    });
});

window.loadStats = loadStats;