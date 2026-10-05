let statsGiorni = 30;

async function loadStats() {
    const res = await fetch(`/api/statistiche?giorni=${statsGiorni}`);
    const data = await res.json();
    
    renderOverview(data);
    renderHeatmap(data.heatmap, statsGiorni);
    renderTopCaffe(data.topCaffe);
    renderTopRefill(data.topRefill);
    renderPerCategoria(data.perCategoria);
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

// Helper ROBUSTO: ritorna YYYY-MM-DD nel fuso locale del browser
function formatLocalDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getHeatLevel(quantita, max) {
    if (quantita === 0) return 0;
    if (max <= 0) return 1;
    const ratio = quantita / max;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
}

function renderHeatmap(heatmap, giorni) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;
    
    const numGiorni = Math.max(84, giorni);
    
    // Normalizza le chiavi heatmap: estrai solo YYYY-MM-DD
    const heatmapNorm = {};
    Object.keys(heatmap || {}).forEach(k => {
        const key = String(k).substring(0, 10);
        heatmapNorm[key] = (heatmapNorm[key] || 0) + (heatmap[k] || 0);
    });
    
    // OGGI in formato YYYY-MM-DD locale
    const oggi = new Date();
    const oggiStr = formatLocalDate(oggi);
    
    // Data di inizio: numGiorni fa
    const inizioData = new Date(oggi);
    inizioData.setDate(inizioData.getDate() - numGiorni + 1);
    
    // Arretra al lunedì della settimana
    const dow = (inizioData.getDay() + 6) % 7; // 0 = lunedì
    inizioData.setDate(inizioData.getDate() - dow);
    
    // Costruisci settimane
    const settimane = [];
    const corrente = new Date(inizioData);
    
    while (formatLocalDate(corrente) <= oggiStr) {
        const settimana = [];
        for (let d = 0; d < 7; d++) {
            const dataStr = formatLocalDate(corrente);
            const dataObj = new Date(corrente);
            const futuro = dataStr > oggiStr;
            settimana.push({
                data: dataStr,
                dataObj,
                futuro,
                quantita: futuro ? 0 : (heatmapNorm[dataStr] || 0)
            });
            corrente.setDate(corrente.getDate() + 1);
        }
        settimane.push(settimana);
    }
    
    // Debug
    console.log('[HEATMAP] oggi:', oggiStr);
    console.log('[HEATMAP] settimane:', settimane.length);
    console.log('[HEATMAP] chiavi:', Object.keys(heatmapNorm));
    
    // Statistiche
    const valori = Object.values(heatmapNorm);
    const maxConsumo = valori.length > 0 ? Math.max(...valori) : 1;
    const totPeriodo = valori.reduce((s, v) => s + v, 0);
    const giorniAttivi = valori.filter(v => v > 0).length;
    
    const mesiLabel = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    const giorniLabel = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
    
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
    
    let html = '<div class="heatmap-scroll">';
    html += '<div class="heatmap-grid">';
    
    // Etichette giorni
    html += '<div class="heatmap-day-labels">';
    html += '<div class="heatmap-day-label header"></div>';
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
        
        const keyMese = `${annoCorrente}-${mese}`;
        if (keyMese !== ultimaSettimanaMese && mese !== ultimoMese) {
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
    
    let stackedHtml = '<div class="stacked-bar">';
    entries.forEach(([, v], i) => {
        const perc = (v / totale) * 100;
        stackedHtml += `<div class="stacked-segment" style="width:${perc}%;background:${colori[i % colori.length]};" title="${v} (${perc.toFixed(1)}%)"></div>`;
    });
    stackedHtml += '</div>';
    
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