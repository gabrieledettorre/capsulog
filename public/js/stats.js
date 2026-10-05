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
    
    // Scala mista basata su valori assoluti quando i numeri sono piccoli
    // Altrimenti proporzionale al massimo
    
    // Caso max molto piccolo (uso personale, 1-2 caffè al giorno)
    if (max <= 2) {
        return quantita >= max ? 4 : 2;
    }
    
    if (max <= 5) {
        if (quantita === 1) return 1;
        if (quantita === 2) return 2;
        if (quantita === 3) return 3;
        return 4;
    }
    
    // max grande: scala proporzionale
    const ratio = quantita / max;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
}

function getHeatLevel(quantita, max) {
    if (quantita === 0) return 0;
    if (quantita === 1) return 1;
    if (quantita === 2) return 2;
    if (quantita === 3) return 3;
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