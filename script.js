const App = {
    // ... (Propiedades db, state, elements, icons se mantienen)
    
    async init() {
        // ... (Se mantiene igual, llama a renderAll)
    },

    renderAll() {
        this.renderPlayerCards();
        this.renderSummaryTable();
    },

    getPlayerCardHTML(player) {
        const { name, number_current, number_new, stats } = player;
        const rating = number_new ?? number_current; // El "rating" es el número nuevo si existe
        
        // El ícono de la camiseta ahora muestra ambos números
        const jerseyIcon = `
        <svg class="jersey-svg" viewBox="0 0 100 100">
            <defs><clipPath id="jerseyClip"><path d="M20,5 L35,5 L50,15 L65,5 L80,5 L70,25 L85,95 L15,95 L30,25 Z"/></clipPath></defs>
            <g clip-path="url(#jerseyClip)">
                <rect x="0" y="0" width="50" height="100" fill="#111111"/>
                <rect x="50" y="0" width="50" height="100" fill="#d41818"/>
                <text x="25" y="70" font-family="Oswald" font-size="30" fill="#a0a0b0" text-anchor="middle">${number_current || ''}</text>
                <text x="75" y="70" font-family="Oswald" font-size="30" fill="white" text-anchor="middle">${number_new || ''}</text>
            </g>
        </svg>`;

        return `
        <div class="fifa-card" data-player-id="${player.id}">
            <div class="card-header"><span class="player-rating">${rating || '??'}</span></div>
            <div class="card-jersey-container">${jerseyIcon}</div>
            <div class="card-name-banner"><span class="player-name">${name.toUpperCase()}</span></div>
            <div class="card-stats-grid">
                <div class="stat-item"><span class="stat-value">${stats.goles}</span><span class="stat-label">GOL</span></div>
                <div class="stat-item"><span class="stat-value">${stats.velocidad}</span><span class="stat-label">VEL</span></div>
                <div class="stat-item"><span class="stat-value">${stats.partidos}</span><span class="stat-label">PAR</span></div>
                <div class="stat-item"><span class="stat-value">${stats.regate}</span><span class="stat-label">REG</span></div>
                <div class="stat-item"><span class="stat-value">${stats.asistencias}</span><span class="stat-label">ASI</span></div>
                <div class="stat-item"><span class="stat-value">${stats.defensa}</span><span class="stat-label">DEF</span></div>
            </div>
        </div>`;
    },

    renderPlayerCards() {
        const grid = document.getElementById('playersGrid');
        grid.innerHTML = '';
        this.db.players.forEach(player => {
            grid.insertAdjacentHTML('beforeend', this.getPlayerCardHTML(player));
        });
        // Aquí irían los listeners para las tarjetas
    },

    renderSummaryTable() {
        const tableBody = document.getElementById('summaryBody');
        tableBody.innerHTML = '';
        this.db.players.sort((a,b) => a.name.localeCompare(b.name)).forEach(player => {
            const row = document.createElement('div');
            row.className = 'summary-row';
            row.innerHTML = `
                <div>${player.name}</div>
                <div>${player.number_current || 'N/A'}</div>
                <div>${player.number_new ? `<span class="new-number">${player.number_new}</span>` : '---'}</div>
                <div>${player.stats.goles}</div>
            `;
            tableBody.appendChild(row);
        });
    }

    // ... (El resto del código: API, Lógica de Staff, Modales, etc., se adapta para usar la nueva estructura de `player` con `number_current` y `number_new`)
};

App.init();
