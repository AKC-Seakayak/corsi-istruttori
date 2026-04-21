// Variabili globali
let currentUser = null;
let studentsList = [];
let currentStudentId = null;

// Lista completa delle valutazioni
const evaluationItems = [
    "Pagaiata in avanti /groenlandese",
    "Pagaiata indietro /groenlandese",
    "Pagaiata in avanti /europea",
    "Pagaiata indietro /europea",
    "Pagaiata circolare 360°",
    "Spostamento laterale a un tempo",
    "Spostamento laterale continuo",
    "Timonata di poppa",
    "Appoggio basso",
    "Trasporto kayak",
    "Imbarco asciutto",
    "imbarco alla cowboy",
    "Imbarco bilanciere",
    "Sbarco con bilanciere",
    "Sbarco cowboy",
    "Uscita bagnata",
    "Autosalvataggio Cowboy",
    "Autosalvataggio con paddlefloat, Rescue T",
    "Inclinazione dello scafo con equilibrio",
    "Inclinazione dello scafo con perdita di equilibrio"
];

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti DOM
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const changePwdBtn = document.getElementById('change-password-btn');
    const addStudentBtn = document.getElementById('add-student-btn');
    const backToListBtn = document.getElementById('back-to-list-btn');
    const passwordModal = document.getElementById('password-modal');
    const closeModal = document.querySelector('.close-modal');
    const confirmPwdBtn = document.getElementById('confirm-password-btn');
    const userEmailSpan = document.getElementById('user-email');

    // Gestione autenticazione
    window.onAuthStateChanged(window.auth, async (user) => {
        if (user) {
            currentUser = user;
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            userEmailSpan.textContent = user.email;
            await loadStudents();
            showStudentListView();
        } else {
            currentUser = null;
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
            document.getElementById('register-email').value = '';
            document.getElementById('register-password').value = '';
        }
    });

    // Login
    loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const messageDiv = document.getElementById('auth-message');
        try {
            await window.signInWithEmailAndPassword(window.auth, email, password);
            messageDiv.textContent = 'Accesso riuscito!';
            messageDiv.className = 'message success';
            setTimeout(() => messageDiv.textContent = '', 2000);
        } catch (error) {
            messageDiv.textContent = 'Errore: ' + error.message;
            messageDiv.className = 'message error';
        }
    });

    // Registrazione
    registerBtn.addEventListener('click', async () => {
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const messageDiv = document.getElementById('auth-message');
        try {
            await window.createUserWithEmailAndPassword(window.auth, email, password);
            messageDiv.textContent = 'Registrazione riuscita! Ora sei loggato.';
            messageDiv.className = 'message success';
            setTimeout(() => messageDiv.textContent = '', 2000);
        } catch (error) {
            messageDiv.textContent = 'Errore: ' + error.message;
            messageDiv.className = 'message error';
        }
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        await window.signOut(window.auth);
    });

    // Cambio password
    changePwdBtn.addEventListener('click', () => {
        passwordModal.style.display = 'flex';
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        document.getElementById('password-message').textContent = '';
    });

    closeModal.addEventListener('click', () => {
        passwordModal.style.display = 'none';
    });

    confirmPwdBtn.addEventListener('click', async () => {
        const currentPwd = document.getElementById('current-password').value;
        const newPwd = document.getElementById('new-password').value;
        const confirmPwd = document.getElementById('confirm-password').value;
        const msgDiv = document.getElementById('password-message');
        
        if (newPwd !== confirmPwd) {
            msgDiv.textContent = 'Le nuove password non coincidono';
            msgDiv.className = 'message error';
            return;
        }
        if (newPwd.length < 6) {
            msgDiv.textContent = 'La password deve avere almeno 6 caratteri';
            msgDiv.className = 'message error';
            return;
        }
        
        try {
            const user = window.auth.currentUser;
            const credential = window.EmailAuthProvider.credential(user.email, currentPwd);
            await window.reauthenticateWithCredential(user, credential);
            await window.updatePassword(user, newPwd);
            msgDiv.textContent = 'Password cambiata con successo!';
            msgDiv.className = 'message success';
            setTimeout(() => passwordModal.style.display = 'none', 1500);
        } catch (error) {
            msgDiv.textContent = 'Errore: ' + error.message;
            msgDiv.className = 'message error';
        }
    });

    // Aggiungi studente
    addStudentBtn.addEventListener('click', () => {
        currentStudentId = null;
        showStudentEditView(null);
    });

    // Torna alla lista
    backToListBtn.addEventListener('click', showStudentListView);

    // Funzioni principali
    async function loadStudents() {
        try {
            const querySnapshot = await window.getDocs(window.collection(window.db, "students"));
            studentsList = [];
            querySnapshot.forEach(doc => {
                studentsList.push({ id: doc.id, ...doc.data() });
            });
            renderStudentsList();
        } catch (error) {
            console.error("Errore caricamento studenti:", error);
            showMessage("Errore nel caricamento degli studenti", "error");
        }
    }

    function renderStudentsList() {
        const grid = document.getElementById('students-grid');
        if (!grid) return;
        
        if (studentsList.length === 0) {
            grid.innerHTML = '<div class="card">Nessun allievo presente. Clicca su "+ Nuovo Allievo" per iniziare.</div>';
            return;
        }
        
        grid.innerHTML = '';
        studentsList.forEach(student => {
            const card = document.createElement('div');
            card.className = 'student-card';
            card.innerHTML = `
                <h3>${student.name || ''} ${student.surname || ''}</h3>
                <p><strong>Nato:</strong> ${student.birthDate || '-'}</p>
                <p><strong>Medico:</strong> ${student.medicalCert ? '✅ Sì' : '❌ No'} | <strong>BLSD:</strong> ${student.blsdCert ? '✅ Sì' : '❌ No'}</p>
                <div class="actions">
                    <button class="btn small edit-student" data-id="${student.id}">Modifica Valutazioni</button>
                    <button class="btn small danger delete-student" data-id="${student.id}">Elimina</button>
                </div>
            `;
            grid.appendChild(card);
        });
        
        // Eventi pulsanti
        document.querySelectorAll('.edit-student').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const student = studentsList.find(s => s.id === id);
                if (student) showStudentEditView(student);
            });
        });
        
        document.querySelectorAll('.delete-student').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                if (confirm('Sei sicuro di voler eliminare questo allievo?')) {
                    await window.deleteDoc(window.doc(window.db, "students", id));
                    await loadStudents();
                    showMessage('Allievo eliminato', 'success');
                }
            });
        });
    }

    async function showStudentEditView(student) {
        document.getElementById('student-list-view').style.display = 'none';
        document.getElementById('student-edit-view').style.display = 'block';
        
        const container = document.getElementById('student-form-container');
        
        // Inizializza valutazioni default se nuovo studente
        let evaluations = {};
        if (student && student.evaluations) {
            evaluations = student.evaluations;
        } else {
            evaluationItems.forEach(item => {
                evaluations[item] = { score: null, note: '' };
            });
        }
        
        const formHTML = `
            <div class="form-section">
                <h2>${student ? 'Modifica Allievo' : 'Nuovo Allievo'}</h2>
                <div class="form-row">
                    <div class="field"><label>Nome *</label><input type="text" id="student-name" value="${student?.name || ''}" placeholder="Nome"></div>
                    <div class="field"><label>Cognome *</label><input type="text" id="student-surname" value="${student?.surname || ''}" placeholder="Cognome"></div>
                </div>
                <div class="form-row">
                    <div class="field"><label>Indirizzo</label><input type="text" id="student-address" value="${student?.address || ''}" placeholder="Via, città, cap"></div>
                    <div class="field"><label>Data di nascita</label><input type="date" id="student-birthdate" value="${student?.birthDate || ''}"></div>
                </div>
                <div class="form-row checkbox-group">
                    <label><input type="checkbox" id="medical-cert" ${student?.medicalCert ? 'checked' : ''}> Certificato medico sportivo</label>
                    <label><input type="checkbox" id="blsd-cert" ${student?.blsdCert ? 'checked' : ''}> Certificato BLSD</label>
                </div>
                <div class="form-row">
                    <div class="field"><label>Altri brevetti sportivi</label><textarea id="other-patents" rows="2" placeholder="Inserisci altri brevetti">${student?.otherPatents || ''}</textarea></div>
                </div>
                
                <h3>Valutazioni tecniche</h3>
                <div style="overflow-x: auto;">
                    <table class="evaluation-table" id="evaluation-table">
                        <thead>
                            <tr><th>Abilità</th><th>Punteggio (1-10)</th><th>Note (editabile/cancellabile)</th></tr>
                        </thead>
                        <tbody>
                            ${evaluationItems.map(item => `
                                <tr>
                                    <td data-label="Abilità"><strong>${item}</strong></td>
                                    <td data-label="Punteggio">
                                        <input type="number" min="1" max="10" step="1" class="score-input" data-item="${item}" value="${evaluations[item]?.score || ''}">
                                    </td>
                                    <td data-label="Note">
                                        <div class="note-cell">
                                            <textarea class="note-textarea" data-item="${item}" rows="2" placeholder="Note ...">${evaluations[item]?.note || ''}</textarea>
                                            <button class="delete-note-btn" data-item="${item}">🗑 Cancella</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div style="display: flex; gap: 15px; margin-top: 20px;">
                    <button id="save-student-btn" class="btn primary">💾 Salva Allievo</button>
                    <button id="cancel-edit-btn" class="btn secondary">Annulla</button>
                </div>
            </div>
        `;
        
        container.innerHTML = formHTML;
        
        // Eventi per cancellare nota
        document.querySelectorAll('.delete-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = btn.getAttribute('data-item');
                const textarea = document.querySelector(`.note-textarea[data-item="${item}"]`);
                if (textarea) textarea.value = '';
            });
        });
        
        // Salvataggio
        document.getElementById('save-student-btn').addEventListener('click', async () => {
            // Raccolta dati personali
            const name = document.getElementById('student-name').value.trim();
            const surname = document.getElementById('student-surname').value.trim();
            if (!name || !surname) {
                alert('Nome e cognome sono obbligatori');
                return;
            }
            const address = document.getElementById('student-address').value;
            const birthDate = document.getElementById('student-birthdate').value;
            const medicalCert = document.getElementById('medical-cert').checked;
            const blsdCert = document.getElementById('blsd-cert').checked;
            const otherPatents = document.getElementById('other-patents').value;
            
            // Raccolta valutazioni
            const evaluationsData = {};
            evaluationItems.forEach(item => {
                const scoreInput = document.querySelector(`.score-input[data-item="${item}"]`);
                const noteTextarea = document.querySelector(`.note-textarea[data-item="${item}"]`);
                let score = scoreInput ? parseInt(scoreInput.value) : null;
                if (score && (score < 1 || score > 10)) score = null;
                evaluationsData[item] = {
                    score: score || null,
                    note: noteTextarea ? noteTextarea.value : ''
                };
            });
            
            const studentData = {
                name, surname, address, birthDate, medicalCert, blsdCert, otherPatents,
                evaluations: evaluationsData,
                updatedAt: new Date().toISOString()
            };
            
            try {
                if (student && student.id) {
                    await window.updateDoc(window.doc(window.db, "students", student.id), studentData);
                    showMessage('Allievo aggiornato con successo', 'success');
                } else {
                    await window.addDoc(window.collection(window.db, "students"), studentData);
                    showMessage('Allievo creato con successo', 'success');
                }
                await loadStudents();
                showStudentListView();
            } catch (error) {
                console.error(error);
                alert('Errore nel salvataggio: ' + error.message);
            }
        });
        
        document.getElementById('cancel-edit-btn').addEventListener('click', showStudentListView);
    }
    
    function showStudentListView() {
        document.getElementById('student-list-view').style.display = 'block';
        document.getElementById('student-edit-view').style.display = 'none';
        currentStudentId = null;
        renderStudentsList();
    }
    
    function showMessage(msg, type) {
        // semplice alert per messaggi veloci
        const tempDiv = document.createElement('div');
        tempDiv.className = `message ${type}`;
        tempDiv.textContent = msg;
        tempDiv.style.position = 'fixed';
        tempDiv.style.bottom = '20px';
        tempDiv.style.right = '20px';
        tempDiv.style.zIndex = '1000';
        tempDiv.style.padding = '12px 20px';
        tempDiv.style.borderRadius = '8px';
        tempDiv.style.backgroundColor = type === 'success' ? '#dcfce7' : '#fee2e2';
        tempDiv.style.color = type === 'success' ? '#15803d' : '#b91c1c';
        document.body.appendChild(tempDiv);
        setTimeout(() => tempDiv.remove(), 3000);
    }
});
