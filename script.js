const App = {
    db: { players: [], applications: [], selections: [] },
    elements: {},
    icons: {
        jersey: (p) => `<svg class="jersey-svg" viewBox="0 0 100 100"><defs><clipPath id="jerseyClip"><path d="M20,5 L35,5 L50,15 L65,5 L80,5 L70,25 L85,95 L15,95 L30,25 Z"/></clipPath></defs><g clip-path="url(#jerseyClip)"><rect x="0" y="0" width="50" height="100" fill="#111"/><rect x="50" y="0" width="50" height="100" fill="#d41818"/><text x="25" y="70" font-family="Oswald" font-size="30" fill="#a0a0b0" text-anchor="middle">${p.number_current || ''}</text><text x="75" y="70" font-family="Oswald" font-size="30" fill="white" text-anchor="middle">${p.number_new || ''}</text></g></svg>`,
        edit: `<svg fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>`,
        save: `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>`,
        cancel: `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.697a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>`,
    },

    async init() {
        this.cacheElements();
        this.setupEventListeners();
        try {
            const data = await this.fetchData('/api/data');
            this.db = data;
            this.renderAll();
        } catch (error) {
            this.showNotification('Error al cargar los datos del servidor.', 'error');
        } finally {
            this.elements.loader.classList.remove('show');
        }
    },

    cacheElements() {
        this.elements = {
            loader: document.getElementById('loader'),
            playersGrid: document.getElementById('playersGrid'),
            summaryBody: document.getElementById('summaryBody'),
            modalContainer: document.getElementById('modal-container'),
            staffBtn: document.getElementById('staffBtn'),
            notificationContainer: document.getElementById('notification-container'),
        };
    },

    setupEventListeners() {
        this.elements.playersGrid.addEventListener('click', e => {
            const card = e.target.closest('.fifa-card');
            if(card) this.openSelectionModal(card.dataset.playerId);
        });
        
        this.elements.playersGrid.addEventListener('mousemove', e => {
            if (!e.target.matches('.fifa-card')) return;
            const card = e.target;
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--x', `${x}px`);
            card.style.setProperty('--y', `${y}px`);
        });

        this.elements.staffBtn.addEventListener('click', () => this.openStaffModal());
    },

    renderAll() {
        this.renderPlayerCards();
        this.renderSummaryTable();
    },

    getPlayerCardHTML(player) {
        const { name, number_current, number_new, stats, id } = player;
        const rating = number_new ?? number_current;
        return `
        <div class="fifa-card" data-player-id="${id}">
            <div class="card-header"><span class="player-rating">${rating || '??'}</span></div>
            <div class="card-jersey-container">${this.icons.jersey(player)}</div>
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
        this.elements.playersGrid.innerHTML = this.db.players
            .map(player => this.getPlayerCardHTML(player))
            .join('');
    },

    renderSummaryTable() {
        this.elements.summaryBody.innerHTML = this.db.players
            .sort((a,b) => a.name.localeCompare(b.name))
            .map(p => `
                <div class="summary-row">
                    <div>${p.name}</div>
                    <div>${p.number_current || 'N/A'}</div>
                    <div>${p.number_new ? `<span class="new-number">${p.number_new}</span>` : '---'}</div>
                    <div>${p.stats.goles}</div>
                </div>
            `).join('');
    },
    
    openSelectionModal(playerId) {
        const player = this.db.players.find(p => p.id === parseInt(playerId));
        const content = `
            <h2>Hola, ${player.name}</h2>
            <p>Elige tu número para la nueva temporada.</p>
            <div class="form-group">
                <label for="newNumberInput">Ingresa tu número nuevo (1-99):</label>
                <input type="number" id="newNumberInput" min="1" max="99" placeholder="${player.number_new || 'Ej: 10'}">
            </div>
            <button class="submit-btn" id="confirmSelectionBtn">Confirmar Nuevo Número</button>
        `;
        this.renderModal(content);
        
        document.getElementById('confirmSelectionBtn').addEventListener('click', async () => {
            const input = document.getElementById('newNumberInput');
            const newNumber = parseInt(input.value);

            if (!newNumber || newNumber < 1 || newNumber > 99) {
                return this.showNotification('Por favor, ingresa un número válido.', 'error');
            }
            if (this.db.players.some(p => p.number_new === newNumber || p.number_current === newNumber)) {
                return this.showNotification('Ese número ya está en uso.', 'error');
            }
            
            const originalPlayerState = JSON.parse(JSON.stringify(player));
            player.number_new = newNumber;
            this.renderAll();
            this.closeModal();
            this.showNotification('Número registrado. Guardando...', 'success');

            try {
                await this.sendData('/api/data', 'POST', { type: 'selection', payload: { playerId: player.id, newNumber } });
            } catch (error) {
                this.showNotification('Error al guardar. Revirtiendo...', 'error');
                Object.assign(player, originalPlayerState); // Revertir
                this.renderAll();
            }
        });
    },

    renderModal(contentHTML, isStaff = false) {
        this.elements.modalContainer.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content ${isStaff ? 'staff-modal' : ''}">
                    <button class="close-btn" aria-label="Cerrar modal">&times;</button>
                    ${contentHTML}
                </div>
            </div>
        `;
        const overlay = this.elements.modalContainer.querySelector('.modal-overlay');
        setTimeout(() => overlay.classList.add('show'), 10);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.closest('.close-btn')) {
                this.closeModal();
            }
        });
    },

    closeModal() {
        const overlay = this.elements.modalContainer.querySelector('.modal-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
        }
    },
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        this.elements.notificationContainer.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    },

    // --- LÓGICA DE STAFF (Simplificada para brevedad, expandir según se necesite) ---
    openStaffModal() {
        // La lógica para renderizar el modal de login y el panel de staff iría aquí,
        // similar a las versiones anteriores pero usando el nuevo sistema de `renderModal`.
        this.renderModal('<h2>Staff Login</h2><p>Funcionalidad de Staff aquí.</p>', true);
    },
    
    // --- API HELPERS ---
    async fetchData(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error('No se pudo conectar con el servidor.');
        return response.json();
    },

    async sendData(url, method, body) {
        const response = await fetch(url, {
            method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Error desconocido.' }));
            throw new Error(err.error);
        }
        return response.json();
    }
};

App.init();
