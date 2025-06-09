// script.js (Versión Final Definitiva y Verificada)
const App = {
    db: { players: [], applications: [] },
    elements: {},
    POSITIONS: ['POR', 'DFC', 'LTD', 'LTI', 'MCD', 'MC', 'MCO', 'ED', 'EI', 'DC'],
    SKILLS: ['Velocidad', 'Tiro', 'Pase Clave', 'Regate', 'Entradas', 'Fuerza', 'Visión', 'Reflejos', 'Resistencia', 'Lectura de Juego', 'Cabezazo', 'Centros'],
    icons: {
        jersey: `<svg class="jersey-svg" viewBox="0 0 100 100"><defs><clipPath id="jerseyClip"><path d="M20,5 L35,5 L50,15 L65,5 L80,5 L70,25 L85,95 L15,95 L30,25 Z"/></clipPath></defs><g clip-path="url(#jerseyClip)"><rect x="0" y="0" width="50" height="100" fill="#111"/><rect x="50" y="0" width="50" height="100" fill="#d41818"/></g></svg>`,
        redCard: `<div class="red-card-icon"></div>`,
        logout: `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"></path></svg>`
    },

    async init() {
        this.cacheElements();
        this.setupEventListeners();
        try {
            this.db = await this.fetchData('/api/data');
            this.renderAll();
        } catch (error) { this.showNotification('Error al cargar datos del servidor.', 'error'); }
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
            if (card && !card.classList.contains('is-expelled')) {
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
    
    // --- Lógica de Modales de Jugador y Aplicaciones ---

    openPlayerActionModal(playerId) {
        const player = this.db.players.find(p => p.id === parseInt(playerId));
        const content = `<h2>${player.name.toUpperCase()}</h2><p>¿Qué deseas hacer?</p><div class="modal-options"><button class="option-btn" data-action="dorsal">Asignar Nuevo Dorsal</button><button class="option-btn" data-action="pos-skill">Actualizar Posición y Skill</button></div>`;
        this.renderModal(content);
        
        this.elements.modalContainer.querySelector('.modal-options').addEventListener('click', e => {
            if (e.target.dataset.action === 'dorsal') this.openNumberSelectionModal(player);
            if (e.target.dataset.action === 'pos-skill') this.openPosSkillModal(player);
        });
    },

    openNumberSelectionModal(player) {
        const formContent = `<h2>Asignar Nuevo Dorsal a ${player.name}</h2><form id="numberForm"><div class="form-group"><label for="newNumber">Nuevo Número (1-99):</label><input type="number" id="newNumber" min="1" max="99" required value="${player.number_new || ''}"></div><button type="submit" class="submit-btn">Guardar Número</button></form>`;
        this.renderModal(formContent);
        document.getElementById('numberForm').addEventListener('submit', e => { 
            e.preventDefault(); 
            const newNumber = parseInt(document.getElementById('newNumber').value);
            if (this.isNumberTaken(newNumber, player.id)) {
                return this.showNotification('Ese dorsal ya está en uso. Elige otro.', 'error');
            }
            this.updatePlayer({ ...player, number_new: newNumber || null }); 
            this.closeModal(); 
        });
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
            const newNumber = parseInt(document.getElementById('appNumber').value);
            if (this.isNumberTaken(newNumber)) {
                return this.showNotification('El número deseado ya está en uso. Elige otro.', 'error');
            }
            const payload = { name: document.getElementById('appName').value, number: newNumber, position: document.getElementById('appPosition').value, skill: document.getElementById('appSkill').value, };
            try {
                const { db } = await this.sendData('/api/data', 'POST', { type: 'application', payload });
                this.db.applications = db.applications;
                this.showNotification('¡Solicitud enviada con éxito!', 'success');
                this.closeModal();
            } catch(error) { this.showNotification(error.message, 'error'); }
        });
    },

    // --- Lógica del Panel de Staff ---
    
    openStaffLoginModal() {
        const content = `<h2>Acceso Staff</h2><form id="staffLoginForm"><div class="form-group"><label for="staffUser">Usuario:</label><input type="text" id="staffUser"></div><div class="form-group"><label for="staffPass">Contraseña:</label><input type="password" id="staffPass"></div><button class="submit-btn" type="submit">Iniciar Sesión</button></form>`;
        this.renderModal(content);
        document.getElementById('staffLoginForm').addEventListener('submit', e => { e.preventDefault(); const user = document.getElementById('staffUser').value, pass = document.getElementById('staffPass').value; if (user === 'newell' && pass === 'staff') { this.openStaffPanel(); } else { this.showNotification('Credenciales incorrectas.', 'error'); }});
    },

    openStaffPanel(renderBase = true) {
        const contentHTML = `
            <div class="staff-header">
                <h2>Panel de Administración</h2>
                <div>
                    <button class="action-btn-small" id="addPlayerBtn">Añadir Jugador</button>
                    <button class="action-btn-small" id="logoutBtn" aria-label="Cerrar Sesión">${this.icons.logout}</button>
                </div>
            </div>
            <div class="staff-tabs">
                <button class="tab-btn active" data-tab="players">Jugadores</button>
                <button class="tab-btn" data-tab="applications">Solicitudes (${this.db.applications.length})</button>
            </div>
            <div class="staff-content" id="staffContent"></div>`;
        
        if (renderBase) this.renderModal(contentHTML, true, 'staff-modal');
        
        const staffContent = document.getElementById('staffContent');
        this.renderStaffPlayers(staffContent);
        
        document.querySelector('.staff-tabs').addEventListener('click', e => {
            if(e.target.matches('.tab-btn')) {
                document.querySelector('.staff-tabs .active').classList.remove('active');
                e.target.classList.add('active');
                const tab = e.target.dataset.tab;
                if (tab === 'players') this.renderStaffPlayers(staffContent);
                else this.renderStaffApplications(staffContent);
            }
        });
        document.getElementById('addPlayerBtn').addEventListener('click', () => this.openEditPlayerModal(null));
        document.getElementById('logoutBtn').addEventListener('click', () => this.openStaffLoginModal());
    },

    renderStaffPlayers(container) {
        container.innerHTML = `<div class="staff-list">${this.db.players.sort((a,b)=>a.name.localeCompare(b.name)).map(p => `<div class="staff-list-item"><div class="staff-player-info"><strong>${p.name}</strong><br><span>${p.position || 'N/A'} / #${p.number_current || '--'}</span></div><div class="staff-item-actions"><button class="action-btn-small" data-action="edit" data-id="${p.id}">Editar</button></div></div>`).join('')}</div>`;
        container.querySelector('.staff-list').addEventListener('click', e => { if (e.target.dataset.action === 'edit') this.openEditPlayerModal(e.target.dataset.id); });
    },

    renderStaffApplications(container) {
        if(this.db.applications.length === 0) { container.innerHTML = '<p style="padding: 1rem;">No hay solicitudes pendientes.</p>'; return; }
        container.innerHTML = `<div class="staff-list">${this.db.applications.map(app => `<div class="staff-list-item application"><div><strong>${app.name}</strong><br><span>${app.position} / #${app.number}</span></div><div class="staff-item-actions"><button class="action-btn-small approve" data-action="approve" data-id="${app.id}">Aprobar</button><button class="action-btn-small reject" data-action="reject" data-id="${app.id}">Rechazar</button></div></div>`).join('')}</div>`;
        container.querySelector('.staff-list').addEventListener('click', async e => {
            const action = e.target.dataset.action;
            if (action === 'approve' || action === 'reject') {
                const appId = parseInt(e.target.dataset.id);
                if (action === 'approve') {
                    const app = this.db.applications.find(a => a.id === appId);
                    if (this.isNumberTaken(app.number)) {
                        return this.showNotification('No se puede aprobar: El número ya está en uso.', 'error');
                    }
                    await this.addPlayer({ name: app.name, position: app.position, skill: app.skill, number_current: app.number });
                }
                this.db.applications = this.db.applications.filter(a => a.id !== appId);
                await this.sendData('/api/data', 'PUT', { type: 'applications', payload: this.db.applications });
                this.renderAll();
                this.showNotification(`Solicitud ${action === 'approve' ? 'aprobada' : 'rechazada'}.`, 'success');
            }
        });
    },

    openEditPlayerModal(playerId) {
        const isNew = playerId === null;
        const player = isNew ? { stats: {} } : this.db.players.find(p => p.id === parseInt(playerId));
        const modalContent = `<h2>${isNew ? 'Añadir Nuevo Jugador' : 'Editar a ' + player.name}</h2><form id="editForm"><div class="form-grid"><div class="form-group"><label>Nombre</label><input id="name" value="${player.name || ''}" required></div><div class="form-group"><label>Posición</label>${this.getSelectHTML('position', this.POSITIONS, player.position)}</div><div class="form-group"><label>Skill</label>${this.getSelectHTML('skill', this.SKILLS, player.skill)}</div><div class="form-group"><label>N° Actual</label><input id="num_current" type="number" value="${player.number_current || ''}"></div><div class="form-group"><label>N° Nuevo</label><input id="num_new" type="number" value="${player.number_new || ''}"></div><div class="form-group"><label>Goles</label><input id="stat_goles" type="number" value="${player.stats?.goles || 0}"></div><div class="form-group"><label>Partidos</label><input id="stat_partidos" type="number" value="${player.stats?.partidos || 0}"></div><div class="form-group"><label>Asistencias</label><input id="stat_asistencias" type="number" value="${player.stats?.asistencias || 0}"></div></div><div class="form-group checkbox-group"><input id="isExpelled" type="checkbox" ${player.isExpelled ? 'checked' : ''}><label for="isExpelled">Marcar como Expulsado</label></div><button type="submit" class="submit-btn">${isNew ? 'Añadir al Plantel' : 'Guardar Cambios'}</button></form>`;
        this.renderModal(modalContent, true);

        document.getElementById('editForm').addEventListener('submit', e => {
            e.preventDefault();
            const num_current = parseInt(document.getElementById('num_current').value) || null;
            const num_new = parseInt(document.getElementById('num_new').value) || null;
            
            // Validar ambos números
            if (this.isNumberTaken(num_current, player.id)) return this.showNotification(`El número actual ${num_current} ya está en uso.`, 'error');
            if (this.isNumberTaken(num_new, player.id)) return this.showNotification(`El número nuevo ${num_new} ya está en uso.`, 'error');

            const formPlayer = {
                id: player.id, name: document.getElementById('name').value, position: document.getElementById('position').value, skill: document.getElementById('skill').value,
                number_current: num_current, number_new: num_new, isExpelled: document.getElementById('isExpelled').checked,
                stats: { goles: parseInt(document.getElementById('stat_goles').value) || 0, partidos: parseInt(document.getElementById('stat_partidos').value) || 0, asistencias: parseInt(document.getElementById('stat_asistencias').value) || 0, }
            };
            if (isNew) this.addPlayer(formPlayer); else this.updatePlayer(formPlayer);
            this.closeModal();
        });
    },
    
    // --- Lógica de Datos y API ---
    async addPlayer(playerData) {
        try {
            const { db } = await this.sendData('/api/data', 'POST', { type: 'new_player', payload: playerData });
            this.db = db; this.renderAll();
            this.showNotification('Jugador añadido con éxito.', 'success');
        } catch (e) { this.showNotification(e.message, 'error'); }
    },
    async updatePlayer(updatedPlayer) {
        const originalPlayers = JSON.parse(JSON.stringify(this.db.players));
        const playerIndex = this.db.players.findIndex(p => p.id === updatedPlayer.id);
        if (playerIndex > -1) { this.db.players[playerIndex] = updatedPlayer; this.renderAll(); }
        try {
            await this.sendData('/api/data', 'PUT', { type: 'players', payload: this.db.players });
            this.showNotification('Jugador actualizado.', 'success');
        } catch(e) { this.showNotification('Error al guardar. Revirtiendo...', 'error'); this.db.players = originalPlayers; this.renderAll(); }
    },

    // --- Funciones de Utilidad ---
    isNumberTaken(number, excludePlayerId = null) {
        if (number === null || number === undefined) return false;
        return this.db.players.some(p => {
            if (p.id === excludePlayerId) return false; // No comparar con el mismo jugador
            return p.number_current === number || p.number_new === number;
        });
    },
    getSelectHTML(id, options, selectedValue = '') { return `<select id="${id}">${options.map(opt => `<option value="${opt}" ${opt === selectedValue ? 'selected' : ''}>${opt}</option>`).join('')}</select>`; },
    renderModal(contentHTML, isLarge = false, customClass = '') { this.elements.modalContainer.innerHTML = `<div class="modal-overlay"><div class="modal-content ${isLarge ? 'large' : ''} ${customClass}"><button class="close-btn">&times;</button>${contentHTML}</div></div>`; const overlay = this.elements.modalContainer.querySelector('.modal-overlay'); setTimeout(() => overlay.classList.add('show'), 10); overlay.addEventListener('click', e => { if (e.target === overlay || e.target.closest('.close-btn')) this.closeModal(); }); },
    closeModal() { const overlay = this.elements.modalContainer.querySelector('.modal-overlay'); if (overlay) { overlay.classList.remove('show'); overlay.addEventListener('transitionend', () => overlay.remove(), { once: true }); } },
    showNotification(message, type = 'info') { const el = document.createElement('div'); el.className = `notification ${type}`; el.textContent = message; this.elements.notificationContainer.appendChild(el); setTimeout(() => el.remove(), 4000); },
    async fetchData(url) { const res = await fetch(url); if (!res.ok) throw new Error('No se pudo conectar al servidor.'); return res.json(); },
    async sendData(url, method, body) { const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Ocurrió un error.'); } return res.json(); }
};

App.init();
