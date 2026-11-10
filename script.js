let currentUser = null;
let currentUserRole = null;
let currentCourseId = null;
let currentCourseName = null;
let coursesList = [];
let allUsersList = [];
let currentEditingStudent = null;
let currentEvaluationTab = 'corso'; // 'corso' | 'esame'

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

const evaluationItemsLevel1 = [
    "Imbarco asciutto", "Imbarco alla Cowboy", "Imbarco con Bilanciere",
    "Sbarco con Bilanciere", "Sbarco alla Cowboy", "Trasporto Kayak",
    "Pagaiata in avanti /groenlandese", "Pagaiata indietro /groenlandese",
    "Pagaiata in avanti /europea", "Pagaiata indietro /europea",
    "Pagaiata circolare 360°", "Spostamento a un tempo", "Spostamento laterale continuo",
    "Timonata di poppa", "Appoggio basso", "Inclinazione dello scafo con equilibrio",
    "Inclinazione dello scafo con perdita di equilibrio", "Uscita bagnata",
    "Autosalvataggio alla Cowboy", "Autosalvataggio con paddlefloat", "Rescue T"
];
const evaluationItemsLevel2Extra = [
    "Spostamento laterale con abbrivio", "Timonata di prua", "Appoggio alto",
    "Appoggio alto continuo", "Rolling a destra", "Rolling a sinistra",
    "Traino di contatto", "Traino con cima"
];
const evaluationItemsLevel2 = [...evaluationItemsLevel1, ...evaluationItemsLevel2Extra];

const didatticheItemsLevel1 = [
    "Introduzione", "Dimostrazione", "Esplicazione", "Attività", "Sommario",
    "IDEAS Lezioni Prova eseguite", "Altri metodi didattici"
];
const didatticheItemsLevel2 = [
    ...didatticheItemsLevel1,
    "Cartografia", "Oceanografia", "Meteorologia", "Leadership", "Risk Management"
];

const valutazioneOptions = [
    { value: "0", label: "Non valutata (0)" },
    { value: "3", label: "Insufficiente (3)" },
    { value: "6", label: "Sufficiente (6)" },
    { value: "7", label: "Discreto (7)" },
    { value: "8", label: "Buono (8)" },
    { value: "10", label: "Ottimo (10)" }
];

function getEvaluationItemsForCourse(courseLevel) {
    return courseLevel === 2 ? evaluationItemsLevel2 : evaluationItemsLevel1;
}
function getDidatticheItemsForCourse(courseLevel) {
    return courseLevel === 2 ? didatticheItemsLevel2 : didatticheItemsLevel1;
}
function getValutazioneLabel(value) {
    const opt = valutazioneOptions.find(o => o.value == value);
    return opt ? opt.label : "Non valutata (0)";
}

// ===================== HELPER: TAB CORSO/ESAME =====================

// Crea una struttura tab vuota con tutte le skill a "0"
function buildEmptyTab(evaluationItems, didatticheItems) {
    const tab = {
        evaluations: {},
        didattiche: {},
        attrezzatura: { score: "0", note: "" },
        psicoAttitudinali: { score: "0", note: "" },
        giudizioFinale: ""
    };
    for (let item of evaluationItems) tab.evaluations[item] = { score: "0", note: "" };
    for (let item of didatticheItems) tab.didattiche[item] = { score: "0", note: "" };
    return tab;
}

// Migra un allievo vecchio formato → nuovo formato (corso + esame)
// Idempotente: se ha già corso/esame, ritorna invariato
function migrateStudentData(student, evaluationItems, didatticheItems) {
    if (!student) return student;
    if (student.corso && student.esame) return student;

    const corso = {
        evaluations: student.evaluations || {},
        didattiche: student.didattiche || {},
        attrezzatura: student.attrezzatura || { score: "0", note: "" },
        psicoAttitudinali: student.psicoAttitudinali || { score: "0", note: "" },
        giudizioFinale: student.giudizioFinale || ""
    };
    // Completa eventuali skill mancanti
    for (let item of evaluationItems) {
        if (!corso.evaluations[item]) corso.evaluations[item] = { score: "0", note: "" };
    }
    for (let item of didatticheItems) {
        if (!corso.didattiche[item]) corso.didattiche[item] = { score: "0", note: "" };
    }

    const esame = buildEmptyTab(evaluationItems, didatticheItems);

    // Ritorna nuovo oggetto senza i vecchi campi
    const { evaluations, didattiche, attrezzatura, psicoAttitudinali, giudizioFinale, ...rest } = student;
    return { ...rest, corso, esame };
}

// Cattura lo stato attuale del tab attivo dal DOM
function captureCurrentTabData() {
    const course = coursesList.find(c => c.id === currentCourseId);
    const evaluationItems = getEvaluationItemsForCourse(course?.level || 1);
    const didatticheItems = getDidatticheItemsForCourse(course?.level || 1);

    const evaluationsData = {};
    for (let item of evaluationItems) {
        const sel = document.querySelector(`.evaluation-select[data-type="tech"][data-item="${escapeHtml(item)}"]`);
        const note = document.querySelector(`.note-textarea[data-type="tech"][data-item="${escapeHtml(item)}"]`)?.value || '';
        evaluationsData[item] = { score: sel ? sel.value : "0", note };
    }

    const didatticheData = {};
    for (let item of didatticheItems) {
        const sel = document.querySelector(`.evaluation-select[data-type="didat"][data-item="${escapeHtml(item)}"]`);
        const note = document.querySelector(`.note-textarea[data-type="didat"][data-item="${escapeHtml(item)}"]`)?.value || '';
        didatticheData[item] = { score: sel ? sel.value : "0", note };
    }

    const attData = {
        score: document.getElementById('attrezzatura-select')?.value || "0",
        note: document.getElementById('attrezzatura-note')?.value || ''
    };
    const psicoData = {
        score: document.getElementById('psico-select')?.value || "0",
        note: document.getElementById('psico-note')?.value || ''
    };
    const giudizio = document.getElementById('giudizio-finale')?.value || '';

    return {
        evaluations: evaluationsData,
        didattiche: didatticheData,
        attrezzatura: attData,
        psicoAttitudinali: psicoData,
        giudizioFinale: giudizio
    };
}

// Cattura i campi anagrafici dal DOM
function captureAnagrafica() {
    if (!currentEditingStudent) currentEditingStudent = {};
    const el = id => document.getElementById(id);
    if (el('student-name')) currentEditingStudent.name = el('student-name').value;
    if (el('student-surname')) currentEditingStudent.surname = el('student-surname').value;
    if (el('student-address')) currentEditingStudent.address = el('student-address').value;
    if (el('student-birthdate')) currentEditingStudent.birthDate = el('student-birthdate').value;
    if (el('student-phone')) currentEditingStudent.phone = el('student-phone').value;
    if (el('student-email')) currentEditingStudent.email = el('student-email').value;
    if (el('medical-cert')) currentEditingStudent.medicalCert = el('medical-cert').checked;
    if (el('blsd-cert')) currentEditingStudent.blsdCert = el('blsd-cert').checked;
    if (el('other-patents')) currentEditingStudent.otherPatents = el('other-patents').value;
}

// ===================== EXPORT / IMPORT =====================

function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
}
function exportToXLSX(data, fileName) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
}
function exportToCSV(data, fileName) {
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    downloadFile(csv, `${fileName}.csv`, "text/csv;charset=utf-8;");
}

// Esporta tutti gli allievi del corso — usa il tab attualmente attivo
async function exportCourse(format) {
    if (!currentCourseId) return alert("Nessun corso selezionato");
    const course = coursesList.find(c => c.id === currentCourseId);
    if (!course) return;
    const tabKey = currentEvaluationTab || 'corso';
    const tabLabel = tabKey === 'corso' ? 'Corso' : 'Esame';

    const studentsSnap = await window.getDocs(window.collection(window.db, "students"));
    const allievi = [];
    studentsSnap.forEach(doc => {
        if (doc.data().courseId === currentCourseId) allievi.push({ id: doc.id, ...doc.data() });
    });

    const evaluationItems = getEvaluationItemsForCourse(course.level);
    const didatticheItems = getDidatticheItemsForCourse(course.level);

    const data = allievi.map(s => {
        const tab = s[tabKey] || {};
        return {
            "Tipo valutazione": tabLabel,
            "Nome": s.name, "Cognome": s.surname, "Data di nascita": s.birthDate,
            "Indirizzo": s.address, "Telefono": s.phone, "Email": s.email,
            "Cert. medico": s.medicalCert ? "Sì" : "No", "Cert. BLSD": s.blsdCert ? "Sì" : "No",
            "Altri brevetti": s.otherPatents,
            ...(tab.evaluations || {}),
            ...(tab.didattiche || {}),
            "Attrezzatura_valutazione": tab.attrezzatura?.score,
            "Attrezzatura_note": tab.attrezzatura?.note,
            "Psico_valutazione": tab.psicoAttitudinali?.score,
            "Psico_note": tab.psicoAttitudinali?.note,
            "Giudizio finale e TESI esame": tab.giudizioFinale
        };
    });

    const suffix = tabKey === 'corso' ? 'corso' : 'esame';
    if (format === 'xlsx') exportToXLSX(data, `${course.name}_allievi_${suffix}`);
    else exportToCSV(data, `${course.name}_allievi_${suffix}`);
}

// Esporta il singolo allievo — usa il tab attualmente attivo
async function exportStudent(format) {
    if (!currentEditingStudent) return alert("Nessun allievo selezionato");
    const s = currentEditingStudent;
    const course = coursesList.find(c => c.id === currentCourseId);
    const tabKey = currentEvaluationTab || 'corso';
    const tabLabel = tabKey === 'corso' ? 'Corso' : 'Esame';
    const tab = s[tabKey] || {};

    const data = [{
        "Corso": course?.name || "",
        "Tipo valutazione": tabLabel,
        "Nome": s.name, "Cognome": s.surname,
        "Data di nascita": s.birthDate, "Indirizzo": s.address, "Telefono": s.phone,
        "Email": s.email, "Cert. medico": s.medicalCert ? "Sì" : "No",
        "Cert. BLSD": s.blsdCert ? "Sì" : "No", "Altri brevetti": s.otherPatents,
        ...(tab.evaluations || {}),
        ...(tab.didattiche || {}),
        "Attrezzatura_valutazione": tab.attrezzatura?.score,
        "Attrezzatura_note": tab.attrezzatura?.note,
        "Psico_valutazione": tab.psicoAttitudinali?.score,
        "Psico_note": tab.psicoAttitudinali?.note,
        "Giudizio finale e TESI esame": tab.giudizioFinale
    }];

    const suffix = tabKey === 'corso' ? 'corso' : 'esame';
    if (format === 'xlsx') exportToXLSX(data, `${s.name}_${s.surname}_scheda_${suffix}`);
    else exportToCSV(data, `${s.name}_${s.surname}_scheda_${suffix}`);
}

async function importStudentsFromExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            resolve(rows);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// ===================== STAMPA (IFRAME) =====================

async function printCourse(title = "Stampa corso") {
    if (!currentCourseId) return;
    const course = coursesList.find(c => c.id === currentCourseId);
    if (!course) return;
    const tabKey = currentEvaluationTab || 'corso';
    const tabLabel = tabKey === 'corso' ? 'Valutazione Corso' : 'Valutazione Esame';

    const studentsSnap = await window.getDocs(window.collection(window.db, "students"));
    const courseStudents = [];
    studentsSnap.forEach(doc => {
        if (doc.data().courseId === currentCourseId) courseStudents.push({ id: doc.id, ...doc.data() });
    });

    const evaluationItems = getEvaluationItemsForCourse(course.level);
    const didatticheItems = getDidatticheItemsForCourse(course.level);
    const logoHtml = `<div style="text-align:center; margin-bottom:15px;"><img src="logo-fict.png" style="max-width:180px;"></div>`;

    let studentsHtml = '';
    for (let i = 0; i < courseStudents.length; i++) {
        const s = courseStudents[i];
        const tab = s[tabKey] || {};
        const pageBreak = i === 0 ? '' : 'page-break-before: always;';

        let techRows = '';
        for (let item of evaluationItems) {
            const v = tab.evaluations?.[item] || {};
            techRows += `<tr><td style="border:1px solid #ccc; padding:4px;"><strong>${escapeHtml(item)}</strong></td><td style="border:1px solid #ccc; padding:4px;">${getValutazioneLabel(v.score)}</td><td style="border:1px solid #ccc; padding:4px;">${escapeHtml(v.note || '')}</td></tr>`;
        }
        let didatRows = '';
        for (let item of didatticheItems) {
            const v = tab.didattiche?.[item] || {};
            didatRows += `<tr><td style="border:1px solid #ccc; padding:4px;"><strong>${escapeHtml(item)}</strong></td><td style="border:1px solid #ccc; padding:4px;">${getValutazioneLabel(v.score)}</td><td style="border:1px solid #ccc; padding:4px;">${escapeHtml(v.note || '')}</td></tr>`;
        }

        studentsHtml += `<div style="${pageBreak}">
            ${logoHtml}
            <h3>${escapeHtml(s.name)} ${escapeHtml(s.surname)}</h3>
            <p><em>${tabLabel}</em></p>
            <p><strong>Nato:</strong> ${s.birthDate || '-'}<br>
            <strong>Indirizzo:</strong> ${escapeHtml(s.address || '-')}<br>
            <strong>Telefono:</strong> ${escapeHtml(s.phone || '-')}<br>
            <strong>Email:</strong> ${escapeHtml(s.email || '-')}<br>
            <strong>Certificato medico:</strong> ${s.medicalCert ? 'Sì' : 'No'} | <strong>BLSD:</strong> ${s.blsdCert ? 'Sì' : 'No'}<br>
            <strong>Altri brevetti:</strong> ${escapeHtml(s.otherPatents || '-')}</p>
            <h4>Valutazioni tecniche</h4>
            <table style="width:100%; border-collapse:collapse;">${techRows}</table>
            <h4>Attrezzatura</h4>
            <table style="width:100%; border-collapse:collapse;"><tr><td style="border:1px solid #ccc; padding:4px;"><strong>Valutazione</strong></td><td style="border:1px solid #ccc; padding:4px;">${getValutazioneLabel(tab.attrezzatura?.score)}</td></tr>
            <tr><td style="border:1px solid #ccc; padding:4px;"><strong>Note</strong></td><td style="border:1px solid #ccc; padding:4px;">${escapeHtml(tab.attrezzatura?.note || '')}</td></tr></table>
            <h4>Valutazioni didattiche</h4>
            <table style="width:100%; border-collapse:collapse;"><thead><tr><th>Campo</th><th>Valutazione</th><th>Note</th></tr></thead><tbody>${didatRows}</tbody></table>
            <h4>Capacità psico-attitudinali</h4>
            <table style="width:100%; border-collapse:collapse;"><tr><td style="border:1px solid #ccc; padding:4px;"><strong>Valutazione</strong></td><td style="border:1px solid #ccc; padding:4px;">${getValutazioneLabel(tab.psicoAttitudinali?.score)}</td></tr>
            <tr><td style="border:1px solid #ccc; padding:4px;"><strong>Note</strong></td><td style="border:1px solid #ccc; padding:4px;">${escapeHtml(tab.psicoAttitudinali?.note || '')}</td></tr></table>
            <h4>Giudizio finale e TESI esame</h4>
            <p>${escapeHtml(tab.giudizioFinale || '')}</p>
        </div>`;
    }

    const fullHtml = `<!DOCTYPE html><html><head><title>${escapeHtml(course.name)}</title><style>body{font-family:Inter,sans-serif;margin:20px} img{max-width:180px}</style></head><body><h2>${escapeHtml(course.name)} - ${tabLabel}</h2><p>Stampato il ${new Date().toLocaleString()}</p>${studentsHtml}</body></html>`;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(fullHtml);
    iframeDoc.close();
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
}

async function printSingleStudent(student, title = "Stampa scheda") {
    if (!student) return;
    const course = coursesList.find(c => c.id === currentCourseId);
    if (!course) return;
    const tabKey = currentEvaluationTab || 'corso';
    const tabLabel = tabKey === 'corso' ? 'Valutazione Corso' : 'Valutazione Esame';
    const tab = student[tabKey] || {};

    const evaluationItems = getEvaluationItemsForCourse(course.level);
    const didatticheItems = getDidatticheItemsForCourse(course.level);
    const logoHtml = `<div style="text-align:center; margin-bottom:15px;"><img src="logo-fict.png" style="max-width:180px;"></div>`;

    let techRows = '';
    for (let item of evaluationItems) {
        const v = tab.evaluations?.[item] || {};
        techRows += `<tr><td style="border:1px solid #ccc; padding:4px;"><strong>${escapeHtml(item)}</strong></td><td style="border:1px solid #ccc; padding:4px;">${getValutazioneLabel(v.score)}</td><td style="border:1px solid #ccc; padding:4px;">${escapeHtml(v.note || '')}</td></tr>`;
    }
    let didatRows = '';
    for (let item of didatticheItems) {
        const v = tab.didattiche?.[item] || {};
        didatRows += `<tr><td style="border:1px solid #ccc; padding:4px;"><strong>${escapeHtml(item)}</strong></td><td style="border:1px solid #ccc; padding:4px;">${getValutazioneLabel(v.score)}</td><td style="border:1px solid #ccc; padding:4px;">${escapeHtml(v.note || '')}</td></tr>`;
    }

    const studentHtml = `${logoHtml}
        <h3>${escapeHtml(student.name)} ${escapeHtml(student.surname)}</h3>
        <p><em>${tabLabel}</em></p>
        <p><strong>Nato:</strong> ${student.birthDate || '-'}<br>
        <strong>Indirizzo:</strong> ${escapeHtml(student.address || '-')}<br>
        <strong>Telefono:</strong> ${escapeHtml(student.phone || '-')}<br>
        <strong>Email:</strong> ${escapeHtml(student.email || '-')}<br>
        <strong>Certificato medico:</strong> ${student.medicalCert ? 'Sì' : 'No'} | <strong>BLSD:</strong> ${student.blsdCert ? 'Sì' : 'No'}<br>
        <strong>Altri brevetti:</strong> ${escapeHtml(student.otherPatents || '-')}</p>
        <h4>Valutazioni tecniche</h4>
        <table style="width:100%; border-collapse:collapse;">${techRows}</table>
        <h4>Attrezzatura</h4>
        <table style="width:100%; border-collapse:collapse;"><tr><td style="border:1px solid #ccc; padding:4px;"><strong>Valutazione</strong></td><td style="border:1px solid #ccc; padding:4px;">${getValutazioneLabel(tab.attrezzatura?.score)}</td></tr>
        <tr><td style="border:1px solid #ccc; padding:4px;"><strong>Note</strong></td><td style="border:1px solid #ccc; padding:4px;">${escapeHtml(tab.attrezzatura?.note || '')}</td></tr></table>
        <h4>Valutazioni didattiche</h4>
        <table style="width:100%; border-collapse:collapse;"><thead><tr><th>Campo</th><th>Valutazione</th><th>Note</th></tr></thead><tbody>${didatRows}</tbody></table>
        <h4>Capacità psico-attitudinali</h4>
        <table style="width:100%; border-collapse:collapse;"><tr><td style="border:1px solid #ccc; padding:4px;"><strong>Valutazione</strong></td><td style="border:1px solid #ccc; padding:4px;">${getValutazioneLabel(tab.psicoAttitudinali?.score)}</td></tr>
        <tr><td style="border:1px solid #ccc; padding:4px;"><strong>Note</strong></td><td style="border:1px solid #ccc; padding:4px;">${escapeHtml(tab.psicoAttitudinali?.note || '')}</td></tr></table>
        <h4>Giudizio finale e TESI esame</h4>
        <p>${escapeHtml(tab.giudizioFinale || '')}</p>`;

    const fullHtml = `<!DOCTYPE html><html><head><title>${escapeHtml(student.name)} ${escapeHtml(student.surname)}</title><style>body{font-family:Inter,sans-serif;margin:20px} img{max-width:180px}</style></head><body><h2>${escapeHtml(course.name)} - ${tabLabel}</h2><p>Stampato il ${new Date().toLocaleString()}</p>${studentHtml}</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(fullHtml);
    iframeDoc.close();
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
}

// ===================== AUTO-SALVATAGGIO =====================
let autoSaveTimeout = null;
let isSaving = false;

function showAutoSaveMessage(msg, isError = false) {
    let toast = document.getElementById('auto-save-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'auto-save-toast';
        toast.style.position = 'fixed';
        toast.style.bottom = '80px';
        toast.style.right = '20px';
        toast.style.backgroundColor = isError ? '#fee2e2' : '#dcfce7';
        toast.style.color = isError ? '#b91c1c' : '#15803d';
        toast.style.padding = '8px 16px';
        toast.style.borderRadius = '40px';
        toast.style.fontSize = '0.75rem';
        toast.style.fontWeight = '500';
        toast.style.zIndex = '1000';
        toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        toast.style.transition = 'opacity 0.2s';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 1500);
}

async function performAutoSave() {
    if (isSaving) return;
    isSaving = true;
    showAutoSaveMessage('Salvataggio...');

    try {
        captureAnagrafica();

        const course = coursesList.find(c => c.id === currentCourseId);
        const evaluationItems = course ? getEvaluationItemsForCourse(course.level) : [];
        const didatticheItems = course ? getDidatticheItemsForCourse(course.level) : [];

        // Cattura il tab attivo dal DOM
        const activeTabData = captureCurrentTabData();
        currentEditingStudent[currentEvaluationTab] = activeTabData;

        // Assicura che esistano entrambe le tab
        if (!currentEditingStudent.corso) currentEditingStudent.corso = buildEmptyTab(evaluationItems, didatticheItems);
        if (!currentEditingStudent.esame) currentEditingStudent.esame = buildEmptyTab(evaluationItems, didatticheItems);

        const name = (currentEditingStudent.name || '').trim();
        const surname = (currentEditingStudent.surname || '').trim();
        if (!name || !surname) { isSaving = false; return; }

        const studentData = {
            name: currentEditingStudent.name,
            surname: currentEditingStudent.surname,
            address: currentEditingStudent.address || '',
            birthDate: currentEditingStudent.birthDate || '',
            phone: currentEditingStudent.phone || '',
            email: currentEditingStudent.email || '',
            medicalCert: currentEditingStudent.medicalCert || false,
            blsdCert: currentEditingStudent.blsdCert || false,
            otherPatents: currentEditingStudent.otherPatents || '',
            corso: currentEditingStudent.corso,
            esame: currentEditingStudent.esame,
            courseId: currentCourseId,
            updatedAt: new Date().toISOString()
        };

        if (currentEditingStudent.id) {
            await window.updateDoc(window.doc(window.db, "students", currentEditingStudent.id), studentData);
            showAutoSaveMessage('Salvato');
        } else {
            const docRef = await window.addDoc(window.collection(window.db, "students"), studentData);
            currentEditingStudent.id = docRef.id;
            showAutoSaveMessage('Creato e salvato');
        }
    } catch (err) {
        console.error(err);
        showAutoSaveMessage('Errore salvataggio', true);
    } finally {
        isSaving = false;
    }
}

function triggerAutoSave() {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => { performAutoSave(); }, 1000);
}

function attachAutoSaveEvents() {
    const container = document.getElementById('student-form-container');
    if (!container) return;
    const elements = container.querySelectorAll('input, select, textarea');
    elements.forEach(el => {
        el.removeEventListener('input', triggerAutoSave);
        el.removeEventListener('change', triggerAutoSave);
        el.addEventListener('input', triggerAutoSave);
        el.addEventListener('change', triggerAutoSave);
    });
}

// ===================== DOM READY =====================
document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const changePwdBtn = document.getElementById('change-password-btn');
    const passwordModal = document.getElementById('password-modal');
    const closeModal = document.querySelector('.close-modal');
    const confirmPwdBtn = document.getElementById('confirm-password-btn');
    const userEmailSpan = document.getElementById('user-email');
    const adminBtn = document.getElementById('admin-btn');
    const addCourseBtn = document.getElementById('add-course-btn');
    const backToCoursesBtn = document.getElementById('back-to-courses-btn');
    const addStudentToCourseBtn = document.getElementById('add-student-to-course-btn');
    const backToStudentsBtn = document.getElementById('back-to-students-btn');
    const backFromAdminBtn = document.getElementById('back-from-admin-btn');
    const printCourseBtn = document.getElementById('print-course-btn');
    const assignModal = document.getElementById('assign-modal');
    const closeAssignModal = document.querySelector('.close-assign-modal');
    const saveAssignmentsBtn = document.getElementById('save-assignments-btn');
    let currentAssignCourse = null;

    window.onAuthStateChanged(window.auth, async (user) => {
        if (user) {
            currentUser = user;
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            userEmailSpan.textContent = user.email;
            let userDoc = await window.getDoc(window.doc(window.db, "users", user.uid));
            if (!userDoc.exists()) {
                try {
                    await window.setDoc(window.doc(window.db, "users", user.uid), { email: user.email, role: "user", uid: user.uid });
                } catch(e) {}
            }
            if (userDoc.exists()) currentUserRole = userDoc.data().role;
            else currentUserRole = "user";
            if (adminBtn) adminBtn.style.display = currentUserRole === 'admin' ? 'inline-block' : 'none';
            if (addCourseBtn) addCourseBtn.style.display = currentUserRole === 'admin' ? 'inline-block' : 'none';
            await loadCourses();
            showCoursesView();
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
    registerBtn.addEventListener('click', async () => {
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const messageDiv = document.getElementById('auth-message');
        try {
            const u = await window.createUserWithEmailAndPassword(window.auth, email, password);
            await window.setDoc(window.doc(window.db, "users", u.user.uid), { email: email, role: "user", uid: u.user.uid });
            messageDiv.textContent = 'Registrazione riuscita!';
            messageDiv.className = 'message success';
        } catch (error) {
            messageDiv.textContent = 'Errore: ' + error.message;
            messageDiv.className = 'message error';
        }
    });
    logoutBtn.addEventListener('click', async () => { await window.signOut(window.auth); });
    changePwdBtn.addEventListener('click', () => {
        passwordModal.style.display = 'flex';
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        document.getElementById('password-message').textContent = '';
    });
    closeModal.addEventListener('click', () => { passwordModal.style.display = 'none'; });
    confirmPwdBtn.addEventListener('click', async () => {
        const currentPwd = document.getElementById('current-password').value;
        const newPwd = document.getElementById('new-password').value;
        const confirmPwd = document.getElementById('confirm-password').value;
        const msgDiv = document.getElementById('password-message');
        if (newPwd !== confirmPwd) { msgDiv.textContent = 'Le nuove password non coincidono'; msgDiv.className = 'message error'; return; }
        if (newPwd.length < 6) { msgDiv.textContent = 'Minimo 6 caratteri'; msgDiv.className = 'message error'; return; }
        try {
            const user = window.auth.currentUser;
            const credential = window.EmailAuthProvider.credential(user.email, currentPwd);
            await window.reauthenticateWithCredential(user, credential);
            await window.updatePassword(user, newPwd);
            msgDiv.textContent = 'Password cambiata!';
            msgDiv.className = 'message success';
            setTimeout(() => passwordModal.style.display = 'none', 1500);
        } catch (error) {
            msgDiv.textContent = 'Errore: ' + error.message;
            msgDiv.className = 'message error';
        }
    });
    addCourseBtn.addEventListener('click', async () => {
        const courseName = prompt('Nome del corso:');
        if (!courseName) return;
        let level = prompt('Livello (1 = Base, 2 = Avanzato):', '1');
        while (level !== '1' && level !== '2') { level = prompt('1 = Base, 2 = Avanzato:', '1'); if (level === null) return; }
        const description = prompt('Descrizione (opzionale):');
        await window.addDoc(window.collection(window.db, "courses"), {
            name: courseName, description: description || '', level: parseInt(level),
            createdAt: new Date().toISOString(), createdBy: currentUser.uid, assignedUserIds: []
        });
        await loadCourses();
        showMessage('Corso creato', 'success');
    });
    backToCoursesBtn.addEventListener('click', () => { showCoursesView(); loadCourses(); });
    addStudentToCourseBtn.addEventListener('click', () => {
        if (!currentCourseId) return alert('Nessun corso selezionato');
        showStudentEditView(null);
    });
    backToStudentsBtn.addEventListener('click', () => {
        if (currentCourseId) showCourseStudents({ id: currentCourseId, name: currentCourseName });
        else showCoursesView();
    });
    adminBtn.addEventListener('click', showAdminView);
    backFromAdminBtn.addEventListener('click', () => { showCoursesView(); loadCourses(); });
    closeAssignModal.addEventListener('click', () => { assignModal.style.display = 'none'; });
    saveAssignmentsBtn.addEventListener('click', async () => {
        if (!currentAssignCourse) return;
        const checkboxes = document.querySelectorAll('#assign-users-list input[type="checkbox"]');
        const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
        try {
            await window.updateDoc(window.doc(window.db, "courses", currentAssignCourse.id), { assignedUserIds: selected });
            document.getElementById('assign-message').textContent = 'Assegnazioni salvate!';
            document.getElementById('assign-message').className = 'message success';
            setTimeout(() => { assignModal.style.display = 'none'; loadCourses(); }, 1000);
        } catch (error) {
            document.getElementById('assign-message').textContent = 'Errore: ' + error.message;
            document.getElementById('assign-message').className = 'message error';
        }
    });

    printCourseBtn.addEventListener('click', () => printCourse("Stampa corso"));
    const printStudentBtn = document.getElementById('print-student-btn');
    if (printStudentBtn) printStudentBtn.addEventListener('click', () => {
        if (currentEditingStudent) printSingleStudent(currentEditingStudent, "Stampa scheda");
        else alert('Nessun allievo selezionato');
    });
    document.getElementById('export-course-pdf-btn')?.addEventListener('click', () => printCourse("Esporta PDF corso"));
    document.getElementById('export-student-pdf-btn')?.addEventListener('click', () => {
        if (currentEditingStudent) printSingleStudent(currentEditingStudent, "Esporta PDF scheda");
        else alert('Nessun allievo selezionato');
    });
    document.getElementById('export-course-xlsx')?.addEventListener('click', () => exportCourse('xlsx'));
    document.getElementById('export-course-csv')?.addEventListener('click', () => exportCourse('csv'));
    document.getElementById('export-student-xlsx')?.addEventListener('click', () => exportStudent('xlsx'));
    document.getElementById('export-student-csv')?.addEventListener('click', () => exportStudent('csv'));

    const importFileInput = document.createElement('input');
    importFileInput.type = 'file';
    importFileInput.accept = '.xlsx, .csv';
    document.getElementById('import-course-btn')?.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !currentCourseId) return;
        try {
            const rows = await importStudentsFromExcel(file);
            const course = coursesList.find(c => c.id === currentCourseId);
            const evaluationItems = getEvaluationItemsForCourse(course?.level || 1);
            const didatticheItems = getDidatticheItemsForCourse(course?.level || 1);
            for (const row of rows) {
                // Importa tutto dentro "corso", "esame" parte vuoto
                const corso = buildEmptyTab(evaluationItems, didatticheItems);
                for (let item of evaluationItems) corso.evaluations[item] = { score: row[item] || "0", note: "" };
                for (let item of didatticheItems) corso.didattiche[item] = { score: row[item] || "0", note: "" };
                corso.attrezzatura = { score: row["Attrezzatura_valutazione"] || "0", note: row["Attrezzatura_note"] || "" };
                corso.psicoAttitudinali = { score: row["Psico_valutazione"] || "0", note: row["Psico_note"] || "" };
                corso.giudizioFinale = row["Giudizio finale e TESI esame"] || "";

                const studentData = {
                    name: row["Nome"] || "", surname: row["Cognome"] || "", birthDate: row["Data di nascita"] || "",
                    address: row["Indirizzo"] || "", phone: row["Telefono"] || "", email: row["Email"] || "",
                    medicalCert: row["Cert. medico"] === "Sì", blsdCert: row["Cert. BLSD"] === "Sì",
                    otherPatents: row["Altri brevetti"] || "",
                    corso,
                    esame: buildEmptyTab(evaluationItems, didatticheItems),
                    courseId: currentCourseId, updatedAt: new Date().toISOString()
                };
                await window.addDoc(window.collection(window.db, "students"), studentData);
            }
            showMessage("Importazione completata", "success");
            showCourseStudents({ id: currentCourseId, name: currentCourseName });
        } catch (err) { showMessage("Errore: " + err.message, "error"); }
        importFileInput.value = '';
    });

    async function loadCourses() {
        try {
            const q = await window.getDocs(window.collection(window.db, "courses"));
            coursesList = [];
            q.forEach(doc => { const d = doc.data(); if (!d.level) d.level = 1; if (!d.assignedUserIds) d.assignedUserIds = []; coursesList.push({ id: doc.id, ...d }); });
            renderCoursesList();
        } catch(e) { showMessage("Errore caricamento corsi", "error"); }
    }

    function renderCoursesList() {
        const grid = document.getElementById('courses-grid');
        if (!grid) return;
        let visible = coursesList;
        if (currentUserRole !== 'admin') visible = coursesList.filter(c => c.assignedUserIds?.includes(currentUser.uid));
        if (visible.length === 0) { grid.innerHTML = '<div class="card">Nessun corso disponibile.</div>'; return; }
        grid.innerHTML = '';
        visible.forEach(course => {
            const levelLabel = course.level === 1 ? 'Base' : 'Avanzato';
            const card = document.createElement('div');
            card.className = 'student-card';
            card.innerHTML = `<h3>📘 ${escapeHtml(course.name)} <span style="font-size:0.8rem;">(${levelLabel})</span></h3>
                <p>${escapeHtml(course.description || '')}</p>
                <div class="actions">
                    <button class="btn small view-course" data-id="${course.id}">Apri Corso</button>
                    ${currentUserRole === 'admin' ? `<button class="btn small secondary assign-users" data-id="${course.id}" data-name="${escapeHtml(course.name)}">👥 Assegna Utenti</button>
                    <button class="btn small danger delete-course" data-id="${course.id}">Elimina</button>` : ''}
                </div>`;
            grid.appendChild(card);
        });
        document.querySelectorAll('.view-course').forEach(btn => btn.addEventListener('click', e => {
            const id = btn.getAttribute('data-id');
            const course = visible.find(c => c.id === id);
            if (course) showCourseStudents(course);
        }));
        if (currentUserRole === 'admin') {
            document.querySelectorAll('.assign-users').forEach(btn => btn.addEventListener('click', async e => {
                const id = btn.getAttribute('data-id');
                const course = visible.find(c => c.id === id);
                if (course) await showAssignUsersModal(course);
            }));
            document.querySelectorAll('.delete-course').forEach(btn => btn.addEventListener('click', async e => {
                const id = btn.getAttribute('data-id');
                if (confirm('Eliminare corso e tutti gli allievi?')) {
                    const ss = await window.getDocs(window.collection(window.db, "students"));
                    for (const d of ss.docs) if (d.data().courseId === id) await window.deleteDoc(window.doc(window.db, "students", d.id));
                    await window.deleteDoc(window.doc(window.db, "courses", id));
                    await loadCourses();
                    showMessage('Corso eliminato', 'success');
                }
            }));
        }
    }

    async function showAssignUsersModal(course) {
        currentAssignCourse = course;
        const usersSnap = await window.getDocs(window.collection(window.db, "users"));
        const container = document.getElementById('assign-users-list');
        container.innerHTML = '';
        usersSnap.forEach(userDoc => {
            const user = userDoc.data();
            const isChecked = course.assignedUserIds?.includes(user.uid);
            const div = document.createElement('div');
            div.style.margin = '8px 0';
            div.innerHTML = `<label><input type="checkbox" value="${user.uid}" ${isChecked ? 'checked' : ''}> ${escapeHtml(user.email)} (${user.role})</label>`;
            container.appendChild(div);
        });
        document.getElementById('assign-course-name').textContent = course.name;
        document.getElementById('assign-message').textContent = '';
        assignModal.style.display = 'flex';
    }

    async function showCourseStudents(course) {
        currentCourseId = course.id;
        currentCourseName = course.name;
        document.getElementById('courses-view').style.display = 'none';
        document.getElementById('course-students-view').style.display = 'block';
        document.getElementById('student-edit-view').style.display = 'none';
        document.getElementById('admin-view').style.display = 'none';
        document.getElementById('course-title').innerHTML = `📘 ${escapeHtml(course.name)} (${course.level === 1 ? 'Base' : 'Avanzato'})`;
        const ss = await window.getDocs(window.collection(window.db, "students"));
        const courseStudents = [];
        ss.forEach(doc => { if (doc.data().courseId === course.id) courseStudents.push({ id: doc.id, ...doc.data() }); });
        renderCourseStudents(courseStudents);
    }

    function renderCourseStudents(students) {
        const grid = document.getElementById('students-by-course-grid');
        if (!grid) return;
        if (students.length === 0) { grid.innerHTML = '<div class="card">Nessun allievo. Clicca "+ Nuovo Allievo".</div>'; return; }
        grid.innerHTML = '';
        students.forEach(student => {
            const card = document.createElement('div');
            card.className = 'student-card';
            card.innerHTML = `<h3>${escapeHtml(student.name)} ${escapeHtml(student.surname)}</h3>
                <p><strong>Nato:</strong> ${student.birthDate || '-'}</p>
                <p><strong>Medico:</strong> ${student.medicalCert ? 'Certificato medico' : 'No'} | <strong>BLSD:</strong> ${student.blsdCert ? 'Certificato BLSD' : 'No'}</p>
                <div class="actions">
                    <button class="btn small edit-student-course" data-id="${student.id}">Modifica Valutazioni</button>
                    <button class="btn small danger delete-student-course" data-id="${student.id}">Elimina</button>
                </div>`;
            grid.appendChild(card);
        });
        document.querySelectorAll('.edit-student-course').forEach(btn => btn.addEventListener('click', async e => {
            const id = btn.getAttribute('data-id');
            const student = students.find(s => s.id === id);
            if (student) showStudentEditView(student);
        }));
        document.querySelectorAll('.delete-student-course').forEach(btn => btn.addEventListener('click', async e => {
            const id = btn.getAttribute('data-id');
            if (confirm('Eliminare allievo?')) {
                await window.deleteDoc(window.doc(window.db, "students", id));
                showMessage('Allievo eliminato', 'success');
                showCourseStudents({ id: currentCourseId, name: currentCourseName });
            }
        }));
    }

    // ============ RENDER SCHEDA ALLIEVO CON TAB CORSO/ESAME ============
    function buildSelectOptions(currentValue) {
        return valutazioneOptions.map(opt => `<option value="${opt.value}" ${currentValue == opt.value ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`).join('');
    }

    // Costruisce l'HTML della sezione tab-corrente (dalla sezione "Valutazioni tecniche" in poi)
    function buildTabContentHtml(tab, evaluationItems, didatticheItems) {
        let techRows = '';
        for (let item of evaluationItems) {
            const val = tab.evaluations?.[item]?.score || "0";
            const note = tab.evaluations?.[item]?.note || '';
            const safeItem = escapeHtml(item);
            techRows += `<tr><td style="font-weight:bold;">${safeItem}</td>
                <td><select class="evaluation-select" data-type="tech" data-item="${safeItem}">${buildSelectOptions(val)}</select></td>
                <td><div class="note-cell"><textarea class="note-textarea" data-type="tech" data-item="${safeItem}" rows="2">${escapeHtml(note)}</textarea><button class="delete-note-btn" data-type="tech" data-item="${safeItem}">🗑 Cancella</button></div></td>
            </tr>`;
        }
        let didatRows = '';
        for (let item of didatticheItems) {
            const val = tab.didattiche?.[item]?.score || "0";
            const note = tab.didattiche?.[item]?.note || '';
            const safeItem = escapeHtml(item);
            didatRows += `<tr><td style="font-weight:bold;">${safeItem}</td>
                <td><select class="evaluation-select" data-type="didat" data-item="${safeItem}">${buildSelectOptions(val)}</select></td>
                <td><div class="note-cell"><textarea class="note-textarea" data-type="didat" data-item="${safeItem}" rows="2">${escapeHtml(note)}</textarea><button class="delete-note-btn" data-type="didat" data-item="${safeItem}">🗑 Cancella</button></div></td>
            </tr>`;
        }
        const attrezzatura = tab.attrezzatura || { score: "0", note: "" };
        const psico = tab.psicoAttitudinali || { score: "0", note: "" };
        const giudizio = tab.giudizioFinale || '';

        return `
            <div class="accordion-section"><div class="accordion-header">Valutazioni tecniche</div><div class="accordion-content"><div style="overflow-x:auto;"><table class="evaluation-table"><tbody>${techRows}</tbody></table></div></div></div>
            <div class="accordion-section"><div class="accordion-header">Attrezzatura</div><div class="accordion-content"><div class="single-evaluation"><select id="attrezzatura-select" class="evaluation-select" style="width:100%">${buildSelectOptions(attrezzatura.score)}</select><div class="note-cell"><textarea id="attrezzatura-note" rows="2" style="flex:1">${escapeHtml(attrezzatura.note)}</textarea><button id="delete-attrezzatura-note" class="delete-note-btn">🗑 Cancella</button></div></div></div></div>
            <div class="accordion-section"><div class="accordion-header">Valutazioni didattiche</div><div class="accordion-content"><div style="overflow-x:auto;"><table class="evaluation-table"><tbody>${didatRows}</tbody></table></div></div></div>
            <div class="accordion-section"><div class="accordion-header">Capacità psico-attitudinali</div><div class="accordion-content"><div class="single-evaluation"><select id="psico-select" class="evaluation-select" style="width:100%">${buildSelectOptions(psico.score)}</select><div class="note-cell"><textarea id="psico-note" rows="2" style="flex:1">${escapeHtml(psico.note)}</textarea><button id="delete-psico-note" class="delete-note-btn">🗑 Cancella</button></div></div></div></div>
            <div class="accordion-section"><div class="accordion-header">Giudizio finale e TESI esame</div><div class="accordion-content"><div class="giudizio-finale"><textarea id="giudizio-finale" rows="3" style="width:100%">${escapeHtml(giudizio)}</textarea></div></div></div>
        `;
    }

    function attachTabContentHandlers() {
        const tabContent = document.getElementById('tab-content');
        if (!tabContent) return;
        const sections = tabContent.querySelectorAll('.accordion-section');
        sections.forEach(section => {
            const header = section.querySelector('.accordion-header');
            const content = section.querySelector('.accordion-content');
            header.addEventListener('click', () => {
                const isOpen = content.classList.contains('open');
                sections.forEach(s => { s.querySelector('.accordion-content').classList.remove('open'); s.querySelector('.accordion-header').classList.remove('open'); });
                if (!isOpen) { content.classList.add('open'); header.classList.add('open'); }
            });
        });
        tabContent.querySelectorAll('.delete-note-btn[data-type]').forEach(btn => btn.addEventListener('click', e => {
            const type = btn.getAttribute('data-type'), item = btn.getAttribute('data-item');
            const ta = document.querySelector(`.note-textarea[data-type="${type}"][data-item="${item}"]`);
            if (ta) { ta.value = ''; triggerAutoSave(); }
        }));
        document.getElementById('delete-attrezzatura-note')?.addEventListener('click', () => { document.getElementById('attrezzatura-note').value = ''; triggerAutoSave(); });
        document.getElementById('delete-psico-note')?.addEventListener('click', () => { document.getElementById('psico-note').value = ''; triggerAutoSave(); });
    }

    function renderTabContent() {
        const tabContent = document.getElementById('tab-content');
        if (!tabContent) return;
        const course = coursesList.find(c => c.id === currentCourseId);
        const evaluationItems = getEvaluationItemsForCourse(course?.level || 1);
        const didatticheItems = getDidatticheItemsForCourse(course?.level || 1);
        const tab = currentEditingStudent?.[currentEvaluationTab] || buildEmptyTab(evaluationItems, didatticheItems);
        tabContent.innerHTML = buildTabContentHtml(tab, evaluationItems, didatticheItems);
        attachTabContentHandlers();
        // Aggiorna stato visivo delle tab
        document.querySelectorAll('.evaluation-tab').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-tab') === currentEvaluationTab);
        });
        attachAutoSaveEvents();
    }

    // Cambio tab: cattura il tab corrente, salva in memoria, ricostruisce il contenuto
    function switchEvaluationTab(newTab) {
        if (newTab === currentEvaluationTab) return;
        // Cattura lo stato corrente dal DOM
        const currentData = captureCurrentTabData();
        if (!currentEditingStudent) currentEditingStudent = {};
        currentEditingStudent[currentEvaluationTab] = currentData;
        captureAnagrafica();
        // Cambia tab
        currentEvaluationTab = newTab;
        // Re-render contenuto
        renderTabContent();
        // Salva su Firestore dopo il cambio (con debounce)
        triggerAutoSave();
    }

    // ============ SHOW STUDENT EDIT VIEW ============
    async function showStudentEditView(student) {
        currentEvaluationTab = 'corso'; // reset alla tab di default
        document.getElementById('courses-view').style.display = 'none';
        document.getElementById('course-students-view').style.display = 'none';
        document.getElementById('student-edit-view').style.display = 'block';
        document.getElementById('admin-view').style.display = 'none';

        const container = document.getElementById('student-form-container');
        const course = coursesList.find(c => c.id === currentCourseId);
        const evaluationItems = getEvaluationItemsForCourse(course?.level || 1);
        const didatticheItems = getDidatticheItemsForCourse(course?.level || 1);

        // Migrazione lazy
        let s = student;
        if (s && (!s.corso || !s.esame)) {
            s = migrateStudentData(s, evaluationItems, didatticheItems);
        }
        currentEditingStudent = s;

        // Se è nuovo allievo, inizializza struttura vuota
        if (!currentEditingStudent) {
            currentEditingStudent = {
                name: '', surname: '', address: '', birthDate: '', phone: '', email: '',
                medicalCert: false, blsdCert: false, otherPatents: '',
                corso: buildEmptyTab(evaluationItems, didatticheItems),
                esame: buildEmptyTab(evaluationItems, didatticheItems)
            };
        }
        if (!currentEditingStudent.corso) currentEditingStudent.corso = buildEmptyTab(evaluationItems, didatticheItems);
        if (!currentEditingStudent.esame) currentEditingStudent.esame = buildEmptyTab(evaluationItems, didatticheItems);

        const levelLabel = course?.level === 2 ? '2 (Avanzato)' : '1 (Base)';

        const formHTML = `<div class="form-section">
            <h2>${s ? 'Modifica Allievo' : 'Nuovo Allievo'} - Livello ${levelLabel}</h2>
            <div class="form-row"><div class="field"><label>Nome *</label><input type="text" id="student-name" value="${escapeHtml(currentEditingStudent.name || '')}"></div>
            <div class="field"><label>Cognome *</label><input type="text" id="student-surname" value="${escapeHtml(currentEditingStudent.surname || '')}"></div></div>
            <div class="form-row"><div class="field"><label>Indirizzo</label><input type="text" id="student-address" value="${escapeHtml(currentEditingStudent.address || '')}"></div>
            <div class="field"><label>Data nascita</label><input type="date" id="student-birthdate" value="${currentEditingStudent.birthDate || ''}"></div></div>
            <div class="form-row"><div class="field"><label>Telefono</label><input type="tel" id="student-phone" value="${escapeHtml(currentEditingStudent.phone || '')}"></div>
            <div class="field"><label>Email</label><input type="email" id="student-email" value="${escapeHtml(currentEditingStudent.email || '')}"></div></div>
            <div class="checkbox-group"><label><input type="checkbox" id="medical-cert" ${currentEditingStudent.medicalCert ? 'checked' : ''}> Certificato medico sportivo</label>
            <label><input type="checkbox" id="blsd-cert" ${currentEditingStudent.blsdCert ? 'checked' : ''}> Certificato BLSD</label></div>
            <div class="form-row"><div class="field"><label>Altri brevetti</label><textarea id="other-patents" rows="2">${escapeHtml(currentEditingStudent.otherPatents || '')}</textarea></div></div>

            <div class="evaluation-tabs" role="tablist">
                <button type="button" class="evaluation-tab ${currentEvaluationTab === 'corso' ? 'active' : ''}" data-tab="corso" role="tab">📘 Valutazione Corso</button>
                <button type="button" class="evaluation-tab ${currentEvaluationTab === 'esame' ? 'active' : ''}" data-tab="esame" role="tab">🎓 Valutazione Esame</button>
            </div>

            <div id="tab-content"></div>

            <div style="display:flex; gap:15px; margin-top:20px;">
                <button id="save-student-btn" class="btn primary">💾 Salva Allievo</button>
                <button id="cancel-edit-btn" class="btn secondary">Annulla</button>
            </div>
        </div>`;

        container.innerHTML = formHTML;

        // Render contenuto della tab attiva
        renderTabContent();

        // Handler cambio tab
        document.querySelectorAll('.evaluation-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const newTab = btn.getAttribute('data-tab');
                switchEvaluationTab(newTab);
            });
        });

        // Autosave sugli input anagrafici
        attachAutoSaveEvents();

        // Salva manualmente
        document.getElementById('save-student-btn').addEventListener('click', async () => {
            captureAnagrafica();
            const name = (currentEditingStudent.name || '').trim();
            const surname = (currentEditingStudent.surname || '').trim();
            if (!name || !surname) return alert('Nome e cognome obbligatori');
            await performAutoSave();
            showMessage('Salvato!', 'success');
            setTimeout(() => showCourseStudents({ id: currentCourseId, name: currentCourseName }), 500);
        });

        // Annulla
        document.getElementById('cancel-edit-btn').addEventListener('click', () => showCourseStudents({ id: currentCourseId, name: currentCourseName }));
    }

    async function showAdminView() {
        document.getElementById('courses-view').style.display = 'none';
        document.getElementById('course-students-view').style.display = 'none';
        document.getElementById('student-edit-view').style.display = 'none';
        document.getElementById('admin-view').style.display = 'block';
        const us = await window.getDocs(window.collection(window.db, "users"));
        const users = []; us.forEach(d => users.push({ id: d.id, ...d.data() }));
        const container = document.getElementById('users-list');
        container.innerHTML = '';
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'student-card';
            card.innerHTML = `<h3>${escapeHtml(user.email)}</h3><p>Ruolo: <strong>${user.role}</strong></p><div class="actions"><button class="btn small change-role" data-uid="${user.uid}" data-role="${user.role}">${user.role === 'admin' ? 'Retrocedi' : 'Promuovi'}</button></div>`;
            container.appendChild(card);
        });
        document.querySelectorAll('.change-role').forEach(btn => btn.addEventListener('click', async e => {
            const uid = btn.getAttribute('data-uid');
            const newRole = btn.getAttribute('data-role') === 'admin' ? 'user' : 'admin';
            if (confirm('Cambiare ruolo?')) {
                await window.updateDoc(window.doc(window.db, "users", uid), { role: newRole });
                showMessage('Ruolo aggiornato', 'success');
                showAdminView();
            }
        }));
    }

    function showCoursesView() {
        document.getElementById('courses-view').style.display = 'block';
        document.getElementById('course-students-view').style.display = 'none';
        document.getElementById('student-edit-view').style.display = 'none';
        document.getElementById('admin-view').style.display = 'none';
        currentEvaluationTab = 'corso'; // reset default
    }

    function showMessage(msg, type) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.textContent = msg;
        div.style.position = 'fixed';
        div.style.bottom = '20px';
        div.style.right = '20px';
        div.style.zIndex = '1000';
        div.style.padding = '12px 20px';
        div.style.borderRadius = '8px';
        div.style.background = type === 'success' ? '#dcfce7' : '#fee2e2';
        div.style.color = type === 'success' ? '#15803d' : '#b91c1c';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }
});