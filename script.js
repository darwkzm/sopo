// script.js (Versión Definitiva y Completa)
const App = {
    db: { players: [], applications: [] },
    elements: {},
    POSITIONS: ['POR', 'DFC', 'LTD', 'LTI', 'MCD', 'MC', 'MCO', 'ED', 'EI', 'DC'],
    SKILLS: ['Velocidad', 'Tiro', 'Pase Clave', 'Regate', 'Entradas', 'Fuerza', 'Visión', 'Reflejos', 'Resistencia', 'Lectura de Juego', 'Cabezazo', 'Centros'],
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
        if (document.querySelector('.staff-modal')) {
            this.openStaffPanel(false);
        }
    },
    
    // --- Lógica de Renderizado ---
    renderPlayerCards() {
        this.elements.playersGrid.innerHTML = this.db.players.map(p => this.getPlayerCardHTML(p)).join('');
    },
    
    getPlayerCardHTML(player) {
        const { id, name, position, skill, number_current, number_new, isExpelled } = player;
        const expelledClass = isExpelled ? 'is-expelled' : '';
        const numberDisplay = number_new
            ? `#${number_current || '--'} <span class="new-number-tag">(Nuevo: ${number_new})</span>`
            : `#${number_current || '--'}`;

        return `<div class="fifa-card ${expelledClass}" data-player-id="${id}"><div class="card-top"><span class="player-skill">${skill || 'N/A'}</span></div><div class="card-jersey-container">${this.icons.jersey}</div><div class="card-bottom"><h3 class="player-name">${name.toUpperCase()}</h3><p class="player-position">${position || 'Sin Posición'}</p><div class="player-numbers-display">${numberDisplay}</div></div>${isExpelled ? this.icons.redCard : ''}</div>`;
    },

    renderSummaryTable() {
        this.elements.summaryBody.innerHTML = this.db.players.sort((a,b) => a.name.localeCompare(b.name)).map(p => `<div class="summary-row"><div>${p.name}</div><div>${p.position || 'N/A'}</div><div>${p.skill || 'N/A'}</div><div>${p.number_current || '--'}</div><div>${p.number_new ? `<span class="new-number">${p.number_new}</span>` : '--'}</div></div>`).join('');
    },
    
    // --- Lógica de Modales ---

    openPlayerActionModal(playerId) {
        const player = this.db.players.find(p => p.id === parseInt(playerId));
        const content = `<h2>${player.name.toUpperCase()}</h2><p>¿Qué deseas hacer?</p><div class="modal-options"><button class="option-btn" id="action-dorsal">Asignar Nuevo Dorsal</button><button class="option-btn" id="action-pos-skill">Actualizar Posición y Skill</button></div>`;
        this.renderModal(content);
        document.getElementById('action-dorsal').addEventListener('click', () => this.openNumberSelectionModal(player));
        document.getElementById('action-pos-skill').addEventListener('click', () => this.openPosSkillModal(player));
    },

    openNumberSelectionModal(player) {
        const formContent = `<h2>Asignar Nuevo Dorsal a ${player.name}</h2><form id="numberForm"><div class="form-group"><label for="newNumber">Nuevo Número (1-99):</label><input type="number" id="newNumber" min="1" max="99" required value="${player.number_new || ''}"></div><button type="submit" class="submit-btn">Guardar Número</button></form>`;
        this.renderModal(formContent);
        document.getElementById('numberForm').addEventListener('submit', e => { e.preventDefault(); this.updatePlayer({ ...player, number_new: parseInt(document.getElementById('newNumber').value) || null }); this.closeModal(); });
    },
    
    openPosSkillModal(player) {
         const formContent = `<h2>Actualizar ${player.name}</h2><form id="posSkillForm"><div class="form-group"><label for="posSelect">Posición:</label>${this.getSelectHTML('posSelect', this.POSITIONS, player.position)}</div><div class="form-group"><label for="skillSelect">Skill Principal:</label>${this.getSelectHTML('skillSelect', this.SKILLS, player.skill)}</div><button type="submit" class="submit-btn">Guardar Cambios</button></form>`;
        this.renderModal(formContent);
         document.getElementById('posSkillForm').addEventListener('submit', e => { e.preventDefault(); this.updatePlayer({ ...player, position: document.getElementById('posSelect').value, skill: document.getElementById('skillSelect').value }); this.closeModal(); });
    },
    
    openApplicationModal() {
        const content = `<h2>Postúlate al Equipo</h2><form id="applicationForm"><div class="form-group"><label for="appName">Nombre:</label><input id="appName" type="text" required></div><div class="form-group"><label for="appNumber">Número Deseado:</label><input id="appNumber" type="number" min="1" max="99" required></div><div class="form-group"><label for="appPosition">Posición Principal:</label>${this.getSelectHTML('appPosition', this.POSITIONS)}</div><div class="form-group"><label for="appSkill">Skill Principal:</label>${this.getSelectHTML('appSkill', this.SKILLS)}</div><button class="submit-btn" type="submit">Enviar Solicitud</button></form>`;
        this.renderModal(content);
        document.getElementById('applicationForm').addEventListener('submit', async e => {
            e.preventDefault();
            const payload = { name: document.getElementById('appName').value, number: document.getElementById('appNumber').value, position: document.getElementById('appPosition').value, skill: document.getElementById('appSkill').value };
            try {
                const { db } = await this.sendData('/api/data', 'POST', { type: 'application', payload });
                this.db.applications = db.applications;
                this.showNotification('¡Solicitud enviada con éxito!', 'success');
                this.closeModal();
            } catch(error) { this.showNotification(error.message, 'error'); }
        });
    },

    // --- Lógica del Panel de Staff ¡COMPLETA! ---
    
    openStaffLoginModal() {
        const content = `<h2>Acceso Staff</h2><form id="staffLoginForm"><div class="form-group"><label for="staffUser">Usuario:</label><input type="text" id="staffUser"></div><div class="form-group"><label for="staffPass">Contraseña:</label><input type="password" id="staffPass"></div><button class="submit-btn" type="submit">Iniciar Sesión</button></form>`;
        this.renderModal(content);
        document.getElementById('staffLoginForm').addEventListener('submit', e => { e.preventDefault(); const user = document.getElementById('staffUser').value, pass = document.getElementById('staffPass').value; if (user === 'newell' && pass === 'staff') this.openStaffPanel(); else this.showNotification('Credenciales incorrectas.', 'error'); });
    },

    openStaffPanel(renderBase = true) {
        const tabsHTML = `<div class="staff-tabs"><button class="tab-btn active" data-tab="players">Jugadores</button><button class="tab-btn" data-tab="applications">Solicitudes</button></div><div class="staff-content" id="staffContent"></div>`;
        if (renderBase) this.renderModal(`<div class="staff-header"><h2>Panel de Administración</h2><button class="action-btn" id="addPlayerBtn">Añadir Jugador</button></div>${tabsHTML}`, true);
        
        const staffContent = document.getElementById('staffContent');
        this.renderStaffPlayers(staffContent);
        
        document.querySelector('.staff-tabs').addEventListener('click', e => { if(e.target.matches('.tab-btn')) { document.querySelector('.staff-tabs .active').classList.remove('active'); e.target.classList.add('active'); const tab = e.target.dataset.tab; if (tab === 'players') this.renderStaffPlayers(staffContent); else this.renderStaffApplications(staffContent); }});
        document.getElementById('addPlayerBtn').addEventListener('click', () => this.openEditPlayerModal(null));
    },

    renderStaffPlayers(container) {
        container.innerHTML = `<div class="staff-list">${this.db.players.map(p => `<div class="staff-list-item"><div class="staff-player-info"><strong>${p.name}</strong><br><span>${p.position} / #${p.number_current || '--'}</span></div><div class="staff-item-actions"><button class="action-btn-small" data-action="edit" data-id="${p.id}">Editar</button></div></div>`).join('')}</div>`;
        container.querySelector('.staff-list').addEventListener('click', e => { if (e.target.dataset.action === 'edit') this.openEditPlayerModal(e.target.dataset.id); });
    },

    openEditPlayerModal(playerId) {
        const isNew = playerId === null;
        const player = isNew ? {} : this.db.players.find(p => p.id === parseInt(playerId));
        const content = `<h2>${isNew ? 'Añadir Nuevo Jugador' : 'Editar a ' + player.name}</h2>
            <form id="editForm">
                <div class="form-grid">
                    <div class="form-group"><label>Nombre</label><input id="name" value="${player.name || ''}" required></div>
                    <div class="form-group"><label>Posición</label>${this.getSelectHTML('position', this.POSITIONS, player.position)}</div>
                    <div class="form-group"><label>Skill</label>${this.getSelectHTML('skill', this.SKILLS, player.skill)}</div>
                    <div class="form-group"><label>N° Actual</label><input id="num_current" type="number" value="${player.number_current || ''}"></div>
                    <div class="form-group"><label>N° Nuevo</label><input id="num_new" type="number" value="${player.number_new || ''}"></div>
                    <div class="form-group"><label>Goles</label><input id="stat_goles" type="number" value="${player.stats?.goles || 0}"></div>
                    <div class="form-group"><label>Partidos</label><input id="stat_partidos" type="number" value="${player.stats?.partidos || 0}"></div>
                    <div class="form-group"><label>Asistencias</label><input id="stat_asistencias" type="number" value="${player.stats?.asistencias || 0}"></div>
                </div>
                <div class="form-group checkbox-group"><input id="isExpelled" type="checkbox" ${player.isExpelled ? 'checked' : ''}><label for="isExpelled">Marcar como Expulsado</label></div>
                <button type="submit" class="submit-btn">Guardar Cambios</button>
            </form>`;
        this.renderModal(content, true);

        document.getElementById('editForm').addEventListener('submit', e => {
            e.preventDefault();
            const updatedPlayer = {
                id: player.id,
                name: document.getElementById('name').value,
                position: document.getElementById('position').value,
                skill: document.getElementById('skill').value,
                number_current: parseInt(document.getElementById('num_current').value) || null,
                number_new: parseInt(document.getElementById('num_new').value) || null,
                isExpelled: document.getElementById('isExpelled').checked,
                stats: {
                    goles: parseInt(document.getElementById('stat_goles').value) || 0,
                    partidos: parseInt(document.getElementById('stat_partidos').value) || 0,
                    asistencias: parseInt(document.getElementById('stat_asistencias').value) || 0,
                }
            };
            if (isNew) this.addPlayer(updatedPlayer);
            else this.updatePlayer(updatedPlayer);
            this.closeModal();
        });
    },
    
    // --- Lógica de Datos y API ---

    async addPlayer(newPlayerData) {
        try {
            const { db } = await this.sendData('/api/data', 'POST', { type: 'new_player', payload: newPlayerData });
            this.db = db;
            this.renderAll();
            this.showNotification('Jugador añadido con éxito.', 'success');
        } catch (e) { this.showNotification(e.message, 'error'); }
    },

    async updatePlayer(updatedPlayer) {
        const originalPlayers = JSON.parse(JSON.stringify(this.db.players));
        const playerIndex = this.db.players.findIndex(p => p.id === updatedPlayer.id);
        if (playerIndex > -1) {
            this.db.players[playerIndex] = updatedPlayer;
            this.renderAll();
        }
        try {
            await this.sendData('/api/data', 'PUT', { type: 'players', payload: this.db.players });
            this.showNotification('Jugador actualizado con éxito.', 'success');
        } catch(e) {
            this.showNotification('Error al guardar. Revirtiendo...', 'error');
            this.db.players = originalPlayers;
            this.renderAll();
        }
    },
    
    // --- Funciones de Utilidad ---
    getSelectHTML(id, options, selectedValue = '') { return `<select id="${id}">${options.map(opt => `<option value="${opt}" ${opt === selectedValue ? 'selected' : ''}>${opt}</option>`).join('')}</select>`; },
    renderModal(contentHTML, isLarge = false) { this.elements.modalContainer.innerHTML = `<div class="modal-overlay"><div class="modal-content ${isLarge ? 'large' : ''}"><button class="close-btn">&times;</button>${contentHTML}</div></div>`; const overlay = this.elements.modalContainer.querySelector('.modal-overlay'); setTimeout(() => overlay.classList.add('show'), 10); overlay.addEventListener('click', e => { if (e.target === overlay || e.target.closest('.close-btn')) this.closeModal(); }); },
    closeModal() { const overlay = this.elements.modalContainer.querySelector('.modal-overlay'); if (overlay) { overlay.classList.remove('show'); overlay.addEventListener('transitionend', () => overlay.remove(), { once: true }); } },
    showNotification(message, type = 'info') { const el = document.createElement('div'); el.className = `notification ${type}`; el.textContent = message; this.elements.notificationContainer.appendChild(el); setTimeout(() => el.remove(), 4000); },
    async fetchData(url) { const res = await fetch(url); if (!res.ok) throw new Error('No se pudo conectar al servidor.'); return res.json(); },
    async sendData(url, method, body) { const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Ocurrió un error.'); } return res.json(); }
};

App.init();
