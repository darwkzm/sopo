document.addEventListener('DOMContentLoaded', () => {
    const App = {
        db: { players: [], applications: [], selections: [] },
        state: { selectedPlayer: null, selectedNumberChoice: null },
        elements: {},

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
        
        renderAll() {
            this.renderLeaderboard();
            this.renderPlayers();
            // Si el panel de staff está visible, se re-renderiza también
            if(this.elements.staffAdminPanel.offsetParent !== null) {
                this.renderStaffDashboard();
                const activeTab = this.elements.staffTabs.querySelector('.active').dataset.tab;
                this.renderStaffContent(activeTab);
            }
        },

        async fetchData(url) {
            const response = await fetch(url);
            if (!response.ok) throw new Error('No se pudo conectar con el servidor.');
            return response.json();
        },

        async sendData(url, method, body) {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: 'Error desconocido en el servidor.' }));
                throw new Error(err.error);
            }
            return response.json();
        },

        cacheElements() {
            this.elements = {
                loader: document.getElementById('loader'),
                leaderboardContent: document.getElementById('leaderboardContent'),
                playersGrid: document.getElementById('playersGrid'),
                selectionCard: document.getElementById('selectionCard'),
                selectedPlayerName: document.getElementById('selectedPlayerName'),
                currentNumberBtn: document.getElementById('currentNumberBtn'),
                customNumberBtn: document.getElementById('customNumberBtn'),
                customNumberDiv: document.getElementById('customNumberDiv'),
                customNumberInput: document.getElementById('customNumberInput'),
                submitSelection: document.getElementById('submitSelection'),
                showApplicationForm: document.getElementById('showApplicationForm'),
                applicationForm: document.getElementById('applicationForm'),
                staffBtn: document.getElementById('staffBtn'),
                staffModal: document.getElementById('staffModal'),
                closeStaffModal: document.getElementById('closeStaffModal'),
                staffLogin: document.getElementById('staffLogin'),
                staffLoginForm: document.getElementById('staffLoginForm'),
                staffAdminPanel: document.getElementById('staffAdminPanel'),
                staffDashboard: document.getElementById('staffDashboard'),
                staffTabs: document.querySelector('.staff-tabs'),
                staffContent: document.getElementById('staffContent'),
                notificationContainer: document.getElementById('notification-container'),
            };
        },

        setupEventListeners() {
            this.elements.playersGrid.addEventListener('click', e => this.handlePlayerSelection(e));
            this.elements.currentNumberBtn.addEventListener('click', () => this.selectNumberChoice('current'));
            this.elements.customNumberBtn.addEventListener('click', () => this.selectNumberChoice('custom'));
            this.elements.submitSelection.addEventListener('click', () => this.submitSelection());
            this.elements.showApplicationForm.addEventListener('click', () => this.elements.applicationForm.classList.toggle('hidden'));
            this.elements.applicationForm.addEventListener('submit', e => { e.preventDefault(); this.submitApplication(); });
            this.elements.staffBtn.addEventListener('click', () => this.elements.staffModal.classList.add('show'));
            this.elements.closeStaffModal.addEventListener('click', () => this.elements.staffModal.classList.remove('show'));
            this.elements.staffLoginForm.addEventListener('submit', e => { e.preventDefault(); this.staffLogin(); });
            this.elements.staffTabs.addEventListener('click', e => this.handleTabClick(e));
        },
        
        renderLeaderboard() {
            const content = this.elements.leaderboardContent;
            content.innerHTML = '';
            const topScorers = [...this.db.players].sort((a, b) => b.goals - a.goals).slice(0, 3);
            if(topScorers.length === 0 || topScorers.every(p => p.goals === 0)){
                 content.innerHTML = '<p>La tabla de goleadores se actualizará pronto.</p>'; return;
            }
            topScorers.forEach((player, index) => {
                if (player.goals > 0) {
                    const item = document.createElement('div');
                    item.className = 'leaderboard-item';
                    item.innerHTML = `<span>${index + 1}. ${player.name}</span> <span>${player.goals} Goles</span>`;
                    content.appendChild(item);
                }
            });
        },
        
        renderPlayers() {
            this.elements.playersGrid.innerHTML = '';
            this.db.players.sort((a,b) => (a.number || 100) - (b.number || 100)).forEach(player => {
                const card = document.createElement('div');
                card.className = 'player-card';
                card.dataset.playerId = player.id;
                card.innerHTML = `
                    <div class="player-name">${player.name}</div>
                    <div class="player-details">
                        <span>#${player.number || '?'}</span><span>•</span><span>⚽ ${player.goals}</span>
                    </div>`;
                this.elements.playersGrid.appendChild(card);
            });
        },
        
        handlePlayerSelection(e) {
            const card = e.target.closest('.player-card');
            if (!card) return;
            this.state.selectedPlayer = this.db.players.find(p => p.id === parseInt(card.dataset.playerId));
            document.querySelectorAll('.player-card.selected').forEach(el => el.classList.remove('selected'));
            card.classList.add('selected');
            this.elements.selectedPlayerName.textContent = this.state.selectedPlayer.name.split(' ')[0];
            this.elements.selectionCard.classList.remove('hidden');
            this.elements.currentNumberBtn.style.display = this.state.selectedPlayer.number ? 'block' : 'none';
            this.elements.currentNumberBtn.textContent = `Mantener mi número (#${this.state.selectedPlayer.number})`;
            this.selectNumberChoice(this.state.selectedPlayer.number ? 'current' : 'custom');
        },
        
        selectNumberChoice(choice) {
            this.state.selectedNumberChoice = choice;
            this.elements.currentNumberBtn.classList.toggle('selected', choice === 'current');
            this.elements.customNumberBtn.classList.toggle('selected', choice === 'custom');
            this.elements.customNumberDiv.classList.toggle('hidden', choice !== 'custom');
        },

        async submitSelection() {
            if (!this.state.selectedPlayer || !this.state.selectedNumberChoice) return this.showNotification('Selecciona un jugador y una opción.', 'error');
            let finalNumber;
            if (this.state.selectedNumberChoice === 'current') {
                finalNumber = this.state.selectedPlayer.number;
            } else {
                finalNumber = parseInt(this.elements.customNumberInput.value);
                if (!finalNumber || finalNumber < 1 || finalNumber > 99) return this.showNotification('Ingresa un número válido (1-99).', 'error');
                if (this.db.players.some(p => p.number === finalNumber && p.id !== this.state.selectedPlayer.id)) return this.showNotification(`El número ${finalNumber} ya está ocupado.`, 'error');
            }
            try {
                const payload = { playerName: this.state.selectedPlayer.name, requestedNumber: finalNumber };
                const newSelection = await this.sendData('/api/data', 'POST', { type: 'selection', payload });
                this.db.selections.push(newSelection);
                this.showNotification('¡Selección registrada con éxito!', 'success');
                this.elements.selectionCard.classList.add('hidden');
                document.querySelectorAll('.player-card.selected').forEach(el => el.classList.remove('selected'));
            } catch (error) { this.showNotification(error.message, 'error'); }
        },

        async submitApplication() {
            const name = document.getElementById('applicantName').value.trim();
            const position = document.getElementById('applicantPosition').value.trim();
            if (!name) return this.showNotification('El nombre es obligatorio.', 'error');
            try {
                const payload = { name, position };
                const newApp = await this.sendData('/api/data', 'POST', { type: 'application', payload });
                this.db.applications.push(newApp);
                this.showNotification('Solicitud enviada. ¡El staff la revisará!', 'success');
                this.elements.applicationForm.reset();
                this.elements.applicationForm.classList.add('hidden');
            } catch (error) { this.showNotification(error.message, 'error'); }
        },

        staffLogin() {
            const user = document.getElementById('staffUser').value;
            const pass = document.getElementById('staffPass').value;
            if (user === 'newell' && pass === 'staff') {
                this.elements.staffLogin.classList.add('hidden');
                this.elements.staffAdminPanel.classList.remove('hidden');
                this.renderStaffDashboard();
                this.renderStaffContent('players');
            } else {
                this.showNotification('Usuario o contraseña incorrectos.', 'error');
            }
        },

        handleTabClick(e) {
            const tabButton = e.target.closest('.tab-btn');
            if (!tabButton) return;
            this.elements.staffTabs.querySelector('.active').classList.remove('active');
            tabButton.classList.add('active');
            this.renderStaffContent(tabButton.dataset.tab);
        },
        
        renderStaffDashboard() {
            const totalGoals = this.db.players.reduce((sum, p) => sum + p.goals, 0);
            this.elements.staffDashboard.innerHTML = `
                <div class="stat-card"><div class="stat-value">${this.db.players.length}</div><div class="stat-label">Jugadores</div></div>
                <div class="stat-card"><div class="stat-value">${this.db.applications.length}</div><div class="stat-label">Solicitudes</div></div>
                <div class="stat-card"><div class="stat-value">${totalGoals}</div><div class="stat-label">Goles Totales</div></div>
            `;
        },

        renderStaffContent(tab) {
            const content = this.elements.staffContent;
            content.innerHTML = '';
            if (tab === 'players') this.renderStaffPlayers();
            if (tab === 'applications') this.renderStaffApplications();
            if (tab === 'selections') this.renderStaffSelections();
        },
        
        renderStaffPlayers() {
            const content = this.elements.staffContent;
            content.innerHTML = '';
            this.db.players.forEach(player => {
                const item = document.createElement('div');
                item.className = 'staff-list-item';
                item.dataset.playerId = player.id;
                item.innerHTML = `
                    <div>
                        <strong>${player.name}</strong>
                        <div style="font-size:0.9em; color:#a3a3a3">#${player.number || 'SN'} • ⚽ ${player.goals}</div>
                    </div>
                    <div><button class="btn-edit">Editar</button></div>`;
                content.appendChild(item);
                item.querySelector('.btn-edit').addEventListener('click', e => this.togglePlayerEdit(e.currentTarget, player));
            });
        },
        
        togglePlayerEdit(editButton, player) {
            const item = editButton.closest('.staff-list-item');
            item.innerHTML = `
                <div class="form-group" style="flex: 2; min-width: 150px;">
                    <label>Nombre</label>
                    <input type="text" class="name-input" value="${player.name}">
                </div>
                <div class="form-group" style="flex: 1;">
                    <label>Número</label>
                    <input type="number" class="number-input" value="${player.number || ''}">
                </div>
                <div class="form-group" style="flex: 1;">
                    <label>Goles</label>
                    <div class="goals-controls">
                        <button class="goals-btn minus" aria-label="Restar gol">-</button>
                        <input type="number" class="goals-input" value="${player.goals}">
                        <button class="goals-btn plus" aria-label="Sumar gol">+</button>
                    </div>
                </div>
                <div style="display:flex; gap:10px; align-self:flex-end;">
                    <button class="btn-save">Guardar</button>
                    <button class="btn-cancel">Cancelar</button>
                </div>
            `;

            item.querySelector('.plus').addEventListener('click', () => {
                const input = item.querySelector('.goals-input');
                input.value = parseInt(input.value || 0) + 1;
            });
            item.querySelector('.minus').addEventListener('click', () => {
                const input = item.querySelector('.goals-input');
                const currentValue = parseInt(input.value || 0);
                if (currentValue > 0) {
                    input.value = currentValue - 1;
                }
            });
            item.querySelector('.btn-save').addEventListener('click', () => this.savePlayerChanges(item, player.id));
            item.querySelector('.btn-cancel').addEventListener('click', () => this.renderStaffContent('players'));
        },
        
        async savePlayerChanges(item, playerId) {
            const name = item.querySelector('.name-input').value.trim();
            const number = parseInt(item.querySelector('.number-input').value) || null;
            const goals = parseInt(item.querySelector('.goals-input').value) || 0;
            
            if (!name) return this.showNotification('El nombre no puede estar vacío.', 'error');

            const updatedPlayers = this.db.players.map(p => 
                p.id === playerId ? { ...p, name, number, goals } : p
            );

            try {
                await this.sendData('/api/data', 'PUT', { type: 'players', payload: updatedPlayers });
                this.db.players = updatedPlayers;
                this.renderAll();
                this.showNotification('Jugador actualizado.', 'success');
            } catch (error) { this.showNotification('Error al guardar cambios.', 'error'); }
        },

        renderStaffApplications() {
            const content = this.elements.staffContent;
            content.innerHTML = '';
            if (this.db.applications.length === 0) {
                content.innerHTML = '<p>No hay solicitudes pendientes.</p>'; return;
            }
            this.db.applications.forEach(app => {
                const item = document.createElement('div');
                item.className = 'staff-list-item';
                item.innerHTML = `
                    <div><strong>${app.name}</strong><div style="font-size:0.9em;color:#a3a3a3">Pos: ${app.position||'N/A'}</div></div>
                    <div><button class="btn-approve" data-id="${app.id}">Aprobar</button><button class="btn-reject" data-id="${app.id}">Rechazar</button></div>
                `;
                content.appendChild(item);
            });
            content.addEventListener('click', e => {
                const id = parseInt(e.target.dataset.id);
                if (e.target.classList.contains('btn-approve')) this.handleApplication(id, true);
                if (e.target.classList.contains('btn-reject')) this.handleApplication(id, false);
            });
        },
        
        async handleApplication(appId, isApproved) {
            const app = this.db.applications.find(a => a.id === appId);
            if (!app) return;
            
            if (isApproved) {
                this.db.players.push({ id: app.id, name: app.name, number: null, goals: 0 });
                try {
                    await this.sendData('/api/data', 'PUT', { type: 'players', payload: this.db.players });
                } catch (error) {
                    this.showNotification('Error al aprobar la solicitud.', 'error');
                    // Revert local change if server fails
                    this.db.players.pop();
                    return;
                }
            }
            // Always remove application from the list
            this.db.applications = this.db.applications.filter(a => a.id !== appId);
            try {
                await this.sendData('/api/data', 'PUT', { type: 'applications', payload: this.db.applications });
                this.renderAll();
                this.showNotification(`Solicitud ${isApproved ? 'aprobada' : 'rechazada'}.`, 'success');
            } catch (error) {
                this.showNotification('Error al actualizar las solicitudes.', 'error');
            }
        },
        
        renderStaffSelections() {
            const content = this.elements.staffContent;
            content.innerHTML = '';
             if (!this.db.selections || this.db.selections.length === 0) {
                content.innerHTML = '<p>No hay registros de selección de números.</p>'; return;
            }
            this.db.selections.sort((a,b)=> b.id - a.id).forEach(sel => {
                const item = document.createElement('div');
                item.className = 'staff-list-item';
                item.innerHTML = `
                    <span><strong>${sel.playerName}</strong> solicitó el número <strong>#${sel.requestedNumber}</strong></span>
                    <small>${sel.date}</small>`;
                content.appendChild(item);
            });
        },

        showNotification(message, type = 'info') {
            const container = this.elements.notificationContainer;
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            container.appendChild(notification);
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.addEventListener('transitionend', () => notification.remove());
            }, 4000);
        }
    };
    
    // Inicia toda la aplicación
    App.init();
});