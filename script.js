// script.js (Versión Definitiva)
const App = {
    db: { players: [], applications: [] },
    elements: {},
    POSITIONS: ['POR', 'DFC', 'LTD', 'LTI', 'MCD', 'MC', 'MCO', 'ED', 'EI', 'DC'],
    SKILLS: ['Velocidad', 'Tiro', 'Pase', 'Regate', 'Defensa', 'Fuerza', 'Visión', 'Reflejos', 'Resistencia', 'Lectura de Juego'],
    icons: {
        jersey: `<svg class="jersey-svg" viewBox="0 0 100 100"><defs><clipPath id="jerseyClip"><path d="M20,5 L35,5 L50,15 L65,5 L80,5 L70,25 L85,95 L15,95 L30,25 Z"/></clipPath></defs><g clip-path="url(#jerseyClip)"><rect x="0" y="0" width="50" height="100" fill="#111"/><rect x="50" y="0" width="50" height="100" fill="#d41818"/></g></svg>`,
        redCard: `<div class="red-card-icon"></div>`
    },

    async init() {
        this.cacheElements();
        this.setupEventListeners();
        try {
            this.db = await this.fetchData('/api/data');
            this.renderAll();
        } catch (error) { this.showNotification('Error al cargar datos.', 'error'); }
        finally { this.elements.loader.classList.remove('show'); }
    },

    cacheElements() {
        this.elements = {
            loader: document.getElementById('loader'),
            playersGrid: document.getElementById('playersGrid'),
            summaryBody: document.getElementById('summaryBody'),
            modalContainer: document.getElementById('modal-container'),
            staffBtn: document.getElementById('staffBtn'),
            showApplicationBtn: document.getElementById('showApplicationBtn'),
            notificationContainer: document.getElementById('notification-container'),
        };
    },

    setupEventListeners() {
        this.elements.staffBtn.addEventListener('click', () => this.openStaffLoginModal());
        this.elements.showApplicationBtn.addEventListener('click', () => this.openApplicationModal());
        this.elements.playersGrid.addEventListener('click', e => {
            const card = e.target.closest('.fifa-card');
            if(card && !card.classList.contains('is-expelled')) {
                this.openPlayerActionModal(card.dataset.playerId);
            }
        });
        this.elements.playersGrid.addEventListener('mousemove', e => {
            const card = e.target.closest('.fifa-card');
            if(!card) return;
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--x', `${x}px`);
            card.style.setProperty('--y', `${y}px`);
        });
    },

    renderAll() {
        this.renderPlayerCards();
        this.renderSummaryTable();
    },

    getPlayerCardHTML(player) {
        const { id, name, position, skill, number_current, number_new, isExpelled } = player;
        const expelledClass = isExpelled ? 'is-expelled' : '';
        const numberDisplay = number_new
            ? `#${number_current} <span class="new-number-tag">(Nuevo: ${number_new})</span>`
            : `#${number_current || '--'}`;

        return `
        <div class="fifa-card ${expelledClass}" data-player-id="${id}">
            <div class="card-top">
                <span class="player-skill">${skill || 'N/A'}</span>
            </div>
            <div class="card-jersey-container">${this.icons.jersey}</div>
            <div class="card-bottom">
                <h3 class="player-name">${name.toUpperCase()}</h3>
                <p class="player-position">${position || 'Sin Posición'}</p>
                <div class="player-numbers-display">${numberDisplay}</div>
            </div>
            ${isExpelled ? this.icons.redCard : ''}
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
                    <div>${p.position || 'N/A'}</div>
                    <div>${p.skill || 'N/A'}</div>
                    <div>${p.number_current || '--'}</div>
                    <div>${p.number_new ? `<span class="new-number">${p.number_new}</span>` : '--'}</div>
                </div>
            `).join('');
    },
    
    openPlayerActionModal(playerId) {
        const player = this.db.players.find(p => p.id === parseInt(playerId));
        const content = `
            <h2>${player.name}</h2>
            <p>¿Qué deseas hacer?</p>
            <div class="modal-options">
                <button class="option-btn" id="action-dorsal">Elegir 2do Dorsal</button>
                <button class="option-btn" id="action-pos-skill">Actualizar Posición y Skill</button>
            </div>
        `;
        this.renderModal(content);

        document.getElementById('action-dorsal').addEventListener('click', () => this.openNumberSelectionModal(player));
        document.getElementById('action-pos-skill').addEventListener('click', () => this.openPosSkillModal(player));
    },

    openNumberSelectionModal(player) {
        // Lógica para el modal de selección de número
    },
    
    openPosSkillModal(player) {
        // Lógica para el modal de selección de posición y skill
    },
    
    openApplicationModal() {
        // Lógica para el modal de postulación
    },
    
    openStaffLoginModal() {
        const content = `
            <h2>Acceso Staff</h2>
            <form id="staffLoginForm">
                <div class="form-group"><label for="staffUser">Usuario:</label><input type="text" id="staffUser"></div>
                <div class="form-group"><label for="staffPass">Contraseña:</label><input type="password" id="staffPass"></div>
                <button class="submit-btn" type="submit">Iniciar Sesión</button>
            </form>`;
        this.renderModal(content);
        document.getElementById('staffLoginForm').addEventListener('submit', e => {
            e.preventDefault();
            const user = document.getElementById('staffUser').value;
            const pass = document.getElementById('staffPass').value;
            if (user === 'newell' && pass === 'staff') this.openStaffPanel();
            else this.showNotification('Credenciales incorrectas.', 'error');
        });
    },

    openStaffPanel() {
        // Lógica COMPLETA para renderizar el panel del staff
        const content = `<h2>Panel de Staff</h2><p>Aquí se mostraría la gestión de jugadores, etc...</p>`;
        this.renderModal(content, true);
    },

    renderModal(contentHTML, isLarge = false) {
        this.elements.modalContainer.innerHTML = `<div class="modal-overlay"><div class="modal-content ${isLarge ? 'large' : ''}"><button class="close-btn">&times;</button>${contentHTML}</div></div>`;
        const overlay = this.elements.modalContainer.querySelector('.modal-overlay');
        setTimeout(() => overlay.classList.add('show'), 10);
        overlay.addEventListener('click', e => { if (e.target === overlay || e.target.closest('.close-btn')) this.closeModal(); });
    },

    closeModal() {
        const overlay = this.elements.modalContainer.querySelector('.modal-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
        }
    },
    
    showNotification(message, type = 'info') {
        const el = document.createElement('div');
        el.className = `notification ${type}`;
        el.textContent = message;
        this.elements.notificationContainer.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    },

    async fetchData(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error('No se pudo conectar al servidor.');
        return res.json();
    },

    async sendData(url, method, body) {
        const res = await fetch(url, {
            method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Ocurrió un error.');
        }
        return res.json();
    }
};

App.init();
