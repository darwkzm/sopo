// script.js (Versión Final con Timeout y Mejoras de Resistencia)
const App = {
    db: { players: [], applications: [] },
    state: { loggedInPlayerId: null },
    elements: {},
    POSITIONS: ['POR', 'DFC', 'LTD', 'LTI', 'MCD', 'MC', 'MCO', 'ED', 'EI', 'DC'],
    SKILLS: ['Velocidad', 'Tiro', 'Pase Clave', 'Regate', 'Entradas', 'Fuerza', 'Visión', 'Reflejos', 'Resistencia', 'Lectura de Juego', 'Cabezazo', 'Centros'],
    icons: {
        jersey: `<svg class="jersey-svg" viewBox="0 0 100 100"><defs><clipPath id="jerseyClip"><path d="M20,5 L35,5 L50,15 L65,5 L80,5 L70,25 L85,95 L15,95 L30,25 Z"/></clipPath></defs><g clip-path="url(#jerseyClip)"><rect x="0" y="0" width="50" height="100" fill="#111"/><rect x="50" y="0" width="50" height="100" fill="#d41818"/></g></svg>`,
        redCard: `<div class="red-card-icon"></div>`,
        logout: `<svg fill="currentColor" viewBox="0 0 20 20" width="20" height="20"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"></path></svg>`
    },

    async init() {
        this.cacheElements();
        this.setupEventListeners();
        try {
            this.showNotification('Cargando datos del equipo...', 'info');
            this.db = await this.fetchData('/api/data', 10000); // 10 segundos de timeout
            this.checkSession();
        } catch (error) {
            this.showNotification(error.message, 'error');
        } finally {
            this.elements.loader.classList.remove('show');
        }
    },
    
    // --- LÓGICA DE SESIÓN Y RENDERIZADO (sin cambios) ---
    checkSession() {
        const loggedInId = this.getCookie('loggedInPlayerId');
        if (loggedInId && this.db.players.some(p => p.id === parseInt(loggedInId))) {
            this.state.loggedInPlayerId = parseInt(loggedInId);
            this.elements.mainContainer.classList.remove('hidden');
            this.renderAll();
        } else {
            this.openLoginModal();
        }
    },
    renderAll() {
        this.renderPlayerCards();
        this.renderSummaryTable();
        this.renderFooter(); 
        if (document.querySelector('.staff-modal')) { this.openStaffPanel(false); }
    },

    // --- MANEJO DE DATOS CON TIMEOUT ---
    async fetchData(url, timeout = 10000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            if (!response.ok) {
                throw new Error('Respuesta de red inválida.');
            }
            return await response.json();
        } catch (error) {
            clearTimeout(id);
            if (error.name === 'AbortError') {
                throw new Error('El servidor tardó mucho en responder. Intenta recargar.');
            }
            throw new Error('No se pudo conectar al servidor.');
        }
    },

    async sendData(url, method, body) {
        try {
            const response = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Ocurrió un error al guardar los datos.');
            }
            return response.json();
        } catch (error) {
            throw error;
        }
    },
    
    // El resto del código es idéntico al de la respuesta anterior.
    // Lo incluyo todo para que solo tengas que copiar y pegar este bloque completo.
    cacheElements() {
        this.elements = {
            loader: document.getElementById('loader'), mainContainer: document.querySelector('.main-container'), playersGrid: document.getElementById('playersGrid'),
            summaryBody: document.getElementById('summaryBody'), modalContainer: document.getElementById('modal-container'), staffBtn: document.getElementById('staffBtn'),
            notificationContainer: document.getElementById('notification-container'),
        };
    },
    setupEventListeners() {
        this.elements.staffBtn.addEventListener('click', () => this.openStaffLoginModal());
        document.body.addEventListener('click', e => {
            const actionBtn = e.target.closest('[data-action]'); if (!actionBtn) return;
            const action = actionBtn.dataset.action; const id = actionBtn.dataset.id;
            const actions = {
                showApplication: () => this.openApplicationModal(), logout: () => this.logout(), logoutStaff: () => this.openStaffLoginModal(),
                addPlayer: () => this.openEditPlayerModal(null), editPlayer: () => this.openEditPlayerModal(id),
                approveApplication: () => this.handleApplication(id, true), rejectApplication: () => this.handleApplication(id, false),
            };
            if (actions[action]) actions[action]();
        });
        this.elements.playersGrid.addEventListener('click', e => {
            const card = e.target.closest('.fifa-card'); if (card) { const clickedPlayerId = parseInt(card.dataset.playerId);
                if (clickedPlayerId === this.state.loggedInPlayerId) { if (!card.classList.contains('is-expelled')) this.openPlayerActionModal(clickedPlayerId);
                } else this.showNotification('Solo puedes modificar tu propia ficha.', 'info');
            }
        });
        this.elements.playersGrid.addEventListener('mousemove', e => {
            const card = e.target.closest('.fifa-card'); if(!card) return; const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; const y = e.clientY - rect.top;
            card.style.setProperty('--x', `${x}px`); card.style.setProperty('--y', `${y}px`);
        });
    },
    logout() { this.eraseCookie('loggedInPlayerId'); this.state.loggedInPlayerId = null; this.elements.mainContainer.classList.add('hidden'); this.openLoginModal(); },
    renderPlayerCards() { this.elements.playersGrid.innerHTML = this.db.players.map(p => this.getPlayerCardHTML(p)).join(''); },
    getPlayerCardHTML(player) { const { id, name, position, skill, number_current, number_new, isExpelled } = player; const isCurrentUser = id === this.state.loggedInPlayerId; const numberDisplay = number_new ? `#${number_current || '--'} <span class="new-number-tag">(Nuevo: ${number_new})</span>` : `#${number_current || '--'}`; return `<div class="fifa-card ${isExpelled ? 'is-expelled' : ''} ${isCurrentUser ? 'is-current-user' : ''}" data-player-id="${id}"><div class="card-top"><span class="player-skill">${skill || 'N/A'}</span></div><div class="card-jersey-container">${this.icons.jersey}</div><div class="card-bottom"><h3 class="player-name">${name.toUpperCase()}</h3><p class="player-position">${position || 'Sin Posición'}</p><div class="player-numbers-display">${numberDisplay}</div></div>${isExpelled ? this.icons.redCard : ''}</div>`; },
    renderSummaryTable() { this.elements.summaryBody.innerHTML = [...this.db.players].sort((a,b) => b.stats.goles - a.stats.goles).map(p => `<div class="summary-row"><div>${p.name}</div><div>${p.position || 'N/A'}</div><div>${p.skill || 'N/A'}</div><div class="goals">${p.stats.goles}</div><div>${p.number_current || '--'}</div><div>${p.number_new ? `<span class="new-number">${p.number_new}</span>` : '--'}</div></div>`).join(''); },
    renderFooter() { let footer = document.querySelector('.main-footer'); if (!footer) { footer = document.createElement('footer'); footer.className = 'main-footer'; this.elements.mainContainer.appendChild(footer); } footer.innerHTML = `<button class="action-btn" data-action="showApplication">¿Eres nuevo? Postúlate</button><button class="action-btn" data-action="logout">Cambiar de Jugador</button>`; },
    openLoginModal() { const playerOptions = this.db.players.sort((a, b) => a.name.localeCompare(b.name)).map(p => `<option value="${p.id}">${p.name}</option>`).join(''); const content = `<h2>¿Quién Eres?</h2><p>Selecciona tu nombre para continuar.</p><form id="playerLoginForm"><div class="form-group"><label for="playerSelect">Selecciona tu Perfil</label><select id="playerSelect" required><option value="" disabled selected>-- Elige tu nombre --</option>${playerOptions}</select></div><button type="submit" class="submit-btn">Entrar</button></form>`; this.renderModal(content, false, 'login-modal'); document.getElementById('playerLoginForm').addEventListener('submit', e => { e.preventDefault(); const selectedId = document.getElementById('playerSelect').value; if (selectedId) { this.state.loggedInPlayerId = parseInt(selectedId); this.setCookie('loggedInPlayerId', selectedId, 7); this.closeModal(); this.elements.mainContainer.classList.remove('hidden'); this.renderAll(); } }); },
    openPlayerActionModal(playerId) { const player = this.db.players.find(p => p.id === parseInt(playerId)); const content = `<h2>${player.name.toUpperCase()}</h2><p>¿Qué deseas hacer?</p><div class="modal-options"><button class="option-btn" id="action-dorsal">Asignar Nuevo Dorsal</button><button class="option-btn" id="action-pos-skill">Actualizar Posición y Skill</button></div>`; this.renderModal(content); document.getElementById('action-dorsal').addEventListener('click', () => this.openNumberSelectionModal(player)); document.getElementById('action-pos-skill').addEventListener('click', () => this.openPosSkillModal(player)); },
    openNumberSelectionModal(player) { const formContent = `<h2>Asignar Nuevo Dorsal a ${player.name}</h2><form id="numberForm"><div class="form-group"><label for="newNumber">Nuevo Número (1-99):</label><input type="number" id="newNumber" min="1" max="99" required value="${player.number_new || ''}"></div><button type="submit" class="submit-btn">Guardar Número</button></form>`; this.renderModal(formContent); document.getElementById('numberForm').addEventListener('submit', e => { e.preventDefault(); const newNumber = parseInt(document.getElementById('newNumber').value); if (this.isNumberTaken(newNumber, player.id)) return this.showNotification('Ese dorsal ya está en uso. Elige otro.', 'error'); this.updatePlayer({ ...player, number_new: newNumber || null }); this.closeModal(); }); },
    openPosSkillModal(player) { const formContent = `<h2>Actualizar ${player.name}</h2><form id="posSkillForm"><div class="form-group"><label for="position">Posición:</label>${this.getSelectHTML('position', this.POSITIONS, player.position)}</div><div class="form-group"><label for="skill">Skill Principal:</label>${this.getSelectHTML('skill', this.SKILLS, player.skill)}</div><button type="submit" class="submit-btn">Guardar Cambios</button></form>`; this.renderModal(formContent); document.getElementById('posSkillForm').addEventListener('submit', e => { e.preventDefault(); this.updatePlayer({ ...player, position: document.getElementById('position').value, skill: document.getElementById('skill').value }); this.closeModal(); }); },
    openApplicationModal() { const content = `<h2>Postúlate al Equipo</h2><form id="applicationForm"><div class="form-group"><label for="appName">Nombre:</label><input id="appName" type="text" required></div><div class="form-group"><label for="appNumber">Número Deseado:</label><input id="appNumber" type="number" min="1" max="99" required></div><div class="form-group"><label for="appPosition">Posición Principal:</label>${this.getSelectHTML('appPosition', this.POSITIONS)}</div><div class="form-group"><label for="appSkill">Skill Principal:</label>${this.getSelectHTML('appSkill', this.SKILLS)}</div><button class="submit-btn" type="submit">Enviar Solicitud</button></form>`; this.renderModal(content); document.getElementById('applicationForm').addEventListener('submit', async e => { e.preventDefault(); const newNumber = parseInt(document.getElementById('appNumber').value); if (this.isNumberTaken(newNumber)) return this.showNotification('El número deseado ya está en uso. Elige otro.', 'error'); const payload = { name: document.getElementById('appName').value, number: newNumber, position: document.getElementById('appPosition').value, skill: document.getElementById('appSkill').value, }; try { const { db } = await this.sendData('/api/data', 'POST', { type: 'application', payload }); this.db.applications = db.applications; this.showNotification('¡Solicitud enviada con éxito!', 'success'); this.closeModal(); if(document.querySelector('.staff-modal')) this.openStaffPanel(false); } catch(error) { this.showNotification(error.message, 'error'); } }); },
    openStaffLoginModal() { const content = `<h2>Acceso Staff</h2><form id="staffLoginForm"><div class="form-group"><label for="staffUser">Usuario:</label><input type="text" id="staffUser"></div><div class="form-group"><label for="staffPass">Contraseña:</label><input type="password" id="staffPass"></div><button class="submit-btn" type="submit">Iniciar Sesión</button></form>`; this.renderModal(content, false, 'staff-login-modal'); document.getElementById('staffLoginForm').addEventListener('submit', e => { e.preventDefault(); const user = document.getElementById('staffUser').value, pass = document.getElementById('staffPass').value; if (user === 'newell' && pass === 'staff') { this.openStaffPanel(); } else { this.showNotification('Credenciales incorrectas.', 'error'); }}); },
    openStaffPanel(renderBase = true) { const contentHTML = `<div class="staff-header"><h2>Panel de Administración</h2><div class="header-actions"><button class="action-btn-small" data-action="addPlayer">Añadir Jugador</button><button class="action-btn-small logout-btn" data-action="logoutStaff" aria-label="Cerrar Sesión">${this.icons.logout}</button></div></div><div class="staff-tabs"><button class="tab-btn active" data-tab="players">Jugadores</button><button class="tab-btn" data-tab="applications">Solicitudes (${this.db.applications.length})</button></div><div class="staff-content" id="staffContent"></div>`; if (renderBase) this.renderModal(contentHTML, true, 'staff-modal'); const staffContent = document.getElementById('staffContent'); this.renderStaffPlayers(staffContent); document.querySelector('.staff-tabs').addEventListener('click', e => { if(e.target.matches('.tab-btn')) { document.querySelector('.staff-tabs .active').classList.remove('active'); e.target.classList.add('active'); this.renderStaffContent(e.target.dataset.tab); }}); },
    renderStaffContent(tab) { const container = document.getElementById('staffContent'); if (tab === 'players') this.renderStaffPlayers(container); else this.renderStaffApplications(container); },
    renderStaffPlayers(container) { container.innerHTML = `<div class="staff-list">${this.db.players.sort((a,b)=>a.name.localeCompare(b.name)).map(p => `<div class="staff-list-item"><div class="staff-player-info"><strong>${p.name}</strong><br><span>${p.position || 'N/A'} / #${p.number_current || '--'}</span></div><div class="staff-item-actions"><button class="action-btn-small" data-action="editPlayer" data-id="${p.id}">Editar</button></div></div>`).join('')}</div>`; },
    renderStaffApplications(container) { if(this.db.applications.length === 0) { container.innerHTML = '<p style="padding: 1rem;">No hay solicitudes pendientes.</p>'; return; } container.innerHTML = `<div class="staff-list">${this.db.applications.map(app => `<div class="staff-list-item application"><div><strong>${app.name}</strong><br><span>${app.position} / #${app.number}</span></div><div class="staff-item-actions"><button class="action-btn-small approve" data-action="approveApplication" data-id="${app.id}">Aprobar</button><button class="action-btn-small reject" data-action="rejectApplication" data-id="${app.id}">Rechazar</button></div></div>`).join('')}</div>`; },
    async handleApplication(appId, isApproved) { appId = parseInt(appId); if (isApproved) { const app = this.db.applications.find(a => a.id === appId); if (!app) return; if (this.isNumberTaken(app.number)) return this.showNotification('No se puede aprobar: El número ya está en uso.', 'error'); await this.addPlayer({ name: app.name, position: app.position, skill: app.skill, number_current: app.number }); } const originalApps = JSON.parse(JSON.stringify(this.db.applications)); this.db.applications = this.db.applications.filter(a => a.id !== appId); try { await this.sendData('/api/data', 'PUT', { type: 'applications', payload: this.db.applications }); this.renderAll(); this.showNotification(`Solicitud ${isApproved ? 'aprobada' : 'rechazada'}.`, 'success'); } catch (e) { this.db.applications = originalApps; this.renderAll(); this.showNotification('Error al procesar la solicitud.', 'error');} },
    openEditPlayerModal(playerId) { const isNew = playerId === null; const player = isNew ? { stats: {} } : this.db.players.find(p => p.id === parseInt(playerId)); const modalContent = `<h2>${isNew ? 'Añadir Nuevo Jugador' : 'Editar a ' + player.name}</h2><form id="editForm"><div class="form-grid"><div class="form-group"><label>Nombre</label><input id="name" value="${player.name || ''}" required></div><div class="form-group"><label>Posición</label>${this.getSelectHTML('position', this.POSITIONS, player.position)}</div><div class="form-group"><label>Skill</label>${this.getSelectHTML('skill', this.SKILLS, player.skill)}</div><div class="form-group"><label>N° Actual</label><input id="num_current" type="number" value="${player.number_current || ''}"></div><div class="form-group"><label>N° Nuevo</label><input id="num_new" type="number" value="${player.number_new || ''}"></div><div class="form-group"><label>Goles</label><input id="stat_goles" type="number" value="${player.stats?.goles || 0}"></div><div class="form-group"><label>Partidos</label><input id="stat_partidos" type="number" value="${player.stats?.partidos || 0}"></div><div class="form-group"><label>Asistencias</label><input id="stat_asistencias" type="number" value="${player.stats?.asistencias || 0}"></div></div><div class="form-group checkbox-group"><input id="isExpelled" type="checkbox" ${player.isExpelled ? 'checked' : ''}><label for="isExpelled">Marcar como Expulsado</label></div><button type="submit" class="submit-btn">${isNew ? 'Añadir al Plantel' : 'Guardar Cambios'}</button></form>`; this.renderModal(modalContent, true); document.getElementById('editForm').addEventListener('submit', e => { e.preventDefault(); const num_current = parseInt(document.getElementById('num_current').value) || null; const num_new = parseInt(document.getElementById('num_new').value) || null; const idToCheck = isNew ? null : player.id; if (this.isNumberTaken(num_current, idToCheck)) return this.showNotification(`El número actual ${num_current} ya está en uso.`, 'error'); if (this.isNumberTaken(num_new, idToCheck)) return this.showNotification(`El número nuevo ${num_new} ya está en uso.`, 'error'); const formPlayer = { id: player.id, name: document.getElementById('name').value, position: document.getElementById('position').value, skill: document.getElementById('skill').value, number_current: num_current, number_new: num_new, isExpelled: document.getElementById('isExpelled').checked, stats: { goles: parseInt(document.getElementById('stat_goles').value) || 0, partidos: parseInt(document.getElementById('stat_partidos').value) || 0, asistencias: parseInt(document.getElementById('stat_asistencias').value) || 0, } }; if (isNew) this.addPlayer(formPlayer); else this.updatePlayer(formPlayer); this.closeModal(); }); },
    async addPlayer(playerData) { try { const { db } = await this.sendData('/api/data', 'POST', { type: 'new_player', payload: playerData }); this.db.players = db.players; this.renderAll(); this.showNotification('Jugador añadido.', 'success'); } catch (e) { this.showNotification(e.message, 'error'); } },
    async updatePlayer(updatedPlayer) { const originalPlayers = JSON.parse(JSON.stringify(this.db.players)); const playerIndex = this.db.players.findIndex(p => p.id === updatedPlayer.id); if (playerIndex > -1) { this.db.players[playerIndex] = updatedPlayer; this.renderAll(); } try { await this.sendData('/api/data', 'PUT', { type: 'players', payload: this.db.players }); this.showNotification('Jugador actualizado.', 'success'); } catch(e) { this.showNotification('Error al guardar.', 'error'); this.db.players = originalPlayers; this.renderAll(); } },
    isNumberTaken(number, excludePlayerId = null) { if (number === null || number === 0 || isNaN(number)) return false; return this.db.players.some(p => { if (p.id === excludePlayerId) return false; return p.number_current === number || p.number_new === number; }); },
    getSelectHTML(id, options, selectedValue = '') { return `<select id="${id}">${options.map(opt => `<option value="${opt}" ${opt === selectedValue ? 'selected' : ''}>${opt}</option>`).join('')}</select>`; },
    renderModal(contentHTML, isLarge = false, customClass = '') { this.elements.modalContainer.innerHTML = `<div class="modal-overlay"><div class="modal-content ${isLarge ? 'large' : ''} ${customClass}"><button class="close-btn">&times;</button>${contentHTML}</div></div>`; const overlay = this.elements.modalContainer.querySelector('.modal-overlay'); setTimeout(() => overlay.classList.add('show'), 10); overlay.addEventListener('click', e => { if (e.target === overlay || e.target.closest('.close-btn')) this.closeModal(); }); },
    closeModal() { const overlay = this.elements.modalContainer.querySelector('.modal-overlay'); if (overlay) { overlay.classList.remove('show'); overlay.addEventListener('transitionend', () => overlay.remove(), { once: true }); } },
    showNotification(message, type = 'info') { const el = document.createElement('div'); el.className = `notification ${type}`; el.textContent = message; this.elements.notificationContainer.appendChild(el); setTimeout(() => { el.style.opacity = '0'; el.addEventListener('transitionend', () => el.remove()); }, 4000); },
    setCookie(name, value, days) { let expires = ""; if (days) { const date = new Date(); date.setTime(date.getTime() + (days*24*60*60*1000)); expires = "; expires=" + date.toUTCString(); } document.cookie = name + "=" + (value || "") + expires + "; path=/"; },
    getCookie(name) { const nameEQ = name + "="; const ca = document.cookie.split(';'); for(let i=0;i < ca.length;i++) { let c = ca[i]; while (c.charAt(0)==' ') c = c.substring(1,c.length); if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length); } return null; },
    eraseCookie(name) { document.cookie = name+'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'; }
};

App.init();
