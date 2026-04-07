/**
 * SaaS Schedule Creator - App Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    const STORAGE_KEY = 'saas_schedulizer_events';
    let events = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    // Migrate old events to have new properties if missing
    events = events.map(e => ({
        ...e,
        completed: e.completed || false,
        focusMins: e.focusMins || 0
    }));
    
    // Make events global for analytics and export
    window._events = events;
    
    let tempSubtasks = [];
    
    // Set init pomodoro placeholder
    const initSetting = JSON.parse(localStorage.getItem('saas_schedulizer_settings'));
    const pLen = initSetting ? (initSetting.pomoLength || 25) : 25;
    const estInput = document.getElementById('event-est');
    if (estInput) estInput.placeholder = pLen;

    // --- Theme Toggling ---
    const themeBtn = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            if (htmlEl.getAttribute('data-theme') === 'dark') {
                htmlEl.setAttribute('data-theme', 'light');
                themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
            } else {
                htmlEl.setAttribute('data-theme', 'dark');
                themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
            }
        });
    }

    // --- Core SPA Routing ---
    const navItems = document.querySelectorAll('.app-nav .nav-item');
    const sections = document.querySelectorAll('.app-section');

    function navigateTo(targetId) {
        sections.forEach(sec => sec.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        navItems.forEach(item => {
            if (item.dataset.target === targetId) item.classList.add('active');
            else item.classList.remove('active');
        });

        // Trigger updates if specific sections are opened
        if (targetId === 'section-analytics' && window.updateAnalytics) {
            window.updateAnalytics();
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navigateTo(item.dataset.target);
            // On mobile, close sidebar (simulate by scrolling up)
            if(window.innerWidth < 768) {
                window.scrollTo(0,0);
            }
            // Update page title
            const titleEl = document.getElementById('page-title');
            if (item.dataset.target === 'section-calendar') titleEl.textContent = 'Dashboard';
            if (item.dataset.target === 'section-analytics') titleEl.textContent = 'Analytics';
            if (item.dataset.target === 'section-settings') titleEl.textContent = 'Settings';
        });
    });

    // --- Toast & Notifications ---
    window.showToast = function(title, message, iconStr = 'fa-bell', colorClass = 'bg-primary') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.innerHTML = `
            <div class="toast-icon ${colorClass} text-white">
                <i class="fas ${iconStr}"></i>
            </div>
            <div class="toast-content flex-1">
                <h4>${title}</h4>
                <p>${message}</p>
                <button class="toast-btn" onclick="stopRingtone()">
                    <i class="fas fa-volume-mute"></i> Stop Audio
                </button>
            </div>
            <button class="toast-close btn" onclick="this.parentElement.remove(); stopRingtone();">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        playRingtone();
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 15000); 
    };

    // --- Audio Sync Engine ---
    const ringtone = document.getElementById('reminder-ringtone');
    const syncBtn = document.getElementById('btn-sync-audio');
    let audioUnlocked = false;

    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            if (ringtone) {
                ringtone.play().then(() => {
                    ringtone.pause();
                    ringtone.currentTime = 0;
                    audioUnlocked = true;
                    window.showToast('Audio Linked', 'Alerts are armed for this session.', 'fa-link', 'bg-emerald');
                    if (Notification.permission !== 'granted') Notification.requestPermission();
                    syncBtn.textContent = 'LINKED';
                    syncBtn.classList.add('bg-emerald');
                    syncBtn.style.color = 'white';
                }).catch(e => console.error("Audio block:", e));
            }
        });
    }

    function playRingtone() {
        if (ringtone && audioUnlocked) ringtone.play().catch(() => {});
    }

    window.stopRingtone = function() {
        if (ringtone) {
            ringtone.pause();
            ringtone.currentTime = 0;
        }
    };

    setInterval(() => {
        const _now = new Date();
        let updated = false;

        events.forEach(ev => {
            if (!ev.notified && !ev.completed && ev.start && ev.start !== "All Day") {
                const evDate = new Date(`${ev.date}T${ev.start}:00`);
                if (!isNaN(evDate)) {
                    const diffMins = Math.floor((evDate - _now) / 60000);
                    const target = parseInt(ev.reminder) || 10;

                    if (diffMins >= 0 && diffMins <= target) {
                        window.showToast(`Upcoming: ${ev.title}`, `Starts in ${diffMins} minutes.`, 'fa-clock', 'bg-rose');
                        ev.notified = true;
                        updated = true;
                        if (Notification.permission === 'granted') {
                            new Notification(`Schedulizer: ${ev.title}`, { body: `Starts in ${diffMins} mins.` });
                        }
                    }
                }
            }
        });
        if (updated) saveEvents();
    }, 60000);

    function saveEvents() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
        window._events = events;
        if(window.updateAnalytics) window.updateAnalytics();
    }
    
    // Export globally for settings module
    window.saveEvents = saveEvents;

    // --- Authentication ---
    const authBtn = document.getElementById('auth-btn-header');
    const authStatus = document.getElementById('auth-status-text');
    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('auth-form');

    function updateAuthUI() {
        const user = localStorage.getItem('saas_user');
        if (user && authStatus) {
            authStatus.textContent = `Hi, ${user}`;
            authStatus.classList.add('text-primary');
        } else if (authStatus) {
            authStatus.textContent = 'Sign In';
            authStatus.classList.remove('text-primary');
        }
    }
    updateAuthUI();

    if (authBtn) {
        authBtn.addEventListener('click', () => {
            const user = localStorage.getItem('saas_user');
            if (user) {
                if (confirm(`Log out of ${user}'s workspace?`)) {
                    localStorage.removeItem('saas_user');
                    updateAuthUI();
                }
            } else {
                authModal.classList.remove('hidden');
                setTimeout(() => authModal.classList.add('show'), 10);
            }
        });
    }

    if (document.getElementById('auth-modal-close')) {
        document.getElementById('auth-modal-close').addEventListener('click', () => {
            authModal.classList.remove('show');
            setTimeout(() => authModal.classList.add('hidden'), 300);
        });
    }

    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('auth-name').value;
            localStorage.setItem('saas_user', name);
            updateAuthUI();
            authModal.classList.remove('show');
            setTimeout(() => authModal.classList.add('hidden'), 300);
            window.showToast('Workspace Ready', `Welcome, ${name}! Your configurations are locked in.`, 'fa-rocket', 'bg-purple');
        });
    }

    // --- Calendar Main Logic ---
    const now = new Date();
    let currentView = 'monthly';
    let currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
    let editingEventId = null;

    const monthPicker = document.getElementById('calendar-month-picker');
    if (monthPicker) monthPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (document.getElementById('event-date')) document.getElementById('event-date').valueAsDate = now;

    const viewTabs = document.querySelectorAll('.view-tab');
    viewTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            viewTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentView = tab.getAttribute('data-view');
            renderCalendar();
        });
    });

    monthPicker.addEventListener('change', (e) => {
        const [y, m] = e.target.value.split('-');
        if (y && m) {
            currentDate = new Date(parseInt(y), parseInt(m) - 1, 1);
            renderCalendar();
        }
    });

    let selectedColor = 'bg-slate';
    document.querySelectorAll('.color-choice').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('.color-choice').forEach(c => c.classList.remove('selected'));
            b.classList.add('selected');
            selectedColor = b.getAttribute('data-color');
        });
    });

    const btnSubmit = document.getElementById('btn-submit-event');
    const btnCancel = document.getElementById('btn-cancel-edit');
    const form = document.getElementById('event-form');

    // Subtask Logic for Entry
    const subtaskInp = document.getElementById('event-subtask-input');
    const bAddSub = document.getElementById('btn-add-subtask');
    const subList = document.getElementById('event-subtasks-list');

    function renderTempSubtasks() {
        subList.innerHTML = '';
        tempSubtasks.forEach((s, i) => {
            const div = document.createElement('div');
            div.className = 'subtask-item';
            div.innerHTML = `
                <span>${s.text}</span>
                <button type="button" class="btn-remove-subtask" onclick="removeTempSubtask(${i})"><i class="fas fa-trash"></i></button>
            `;
            subList.appendChild(div);
        });
    }

    window.removeTempSubtask = (idx) => {
        tempSubtasks.splice(idx, 1);
        renderTempSubtasks();
    };

    bAddSub.addEventListener('click', () => {
        const val = subtaskInp.value.trim();
        if(val) {
            tempSubtasks.push({ text: val, done: false });
            subtaskInp.value = '';
            renderTempSubtasks();
        }
    });

    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            editingEventId = null;
            btnSubmit.innerHTML = 'Add to Calendar';
            btnCancel.classList.add('hidden');
            document.getElementById('event-recurring').disabled = false;
            form.reset();
            document.getElementById('event-date').valueAsDate = new Date();
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const base = {
            title: document.getElementById('event-title').value,
            date: document.getElementById('event-date').value,
            start: document.getElementById('event-start').value || "All Day",
            end: document.getElementById('event-end').value || "",
            priority: document.getElementById('event-priority').value,
            reminder: document.getElementById('event-reminder').value,
            estTime: parseInt(document.getElementById('event-est').value) || (JSON.parse(localStorage.getItem('saas_schedulizer_settings'))?.pomoLength || 25),
            details: document.getElementById('event-details').value,
            color: selectedColor,
            notified: false,
            completed: false, // newly added tasks are not complete
            focusMins: 0,
            subtasks: [...tempSubtasks]
        };

        if (editingEventId) {
            const idx = events.findIndex(x => x.id === editingEventId);
            if (idx > -1) {
                base.completed = events[idx].completed; // preserve completion status
                base.focusMins = events[idx].focusMins;
                events[idx] = { ...events[idx], ...base };
            }
            editingEventId = null;
            btnSubmit.innerHTML = 'Add to Calendar';
            btnCancel.classList.add('hidden');
            document.getElementById('event-recurring').disabled = false;
            window.showToast('Event Linked', 'Task successfully updated in workspace.', 'fa-check', 'bg-emerald');
        } else {
            const rec = document.getElementById('event-recurring').value;
            let occ = rec === 'daily' ? 30 : (rec === 'weekly' ? 12 : (rec === 'monthly' ? 12 : 1));
            
            const bDate = new Date(base.date + 'T12:00:00');
            for(let i=0; i<occ; i++) {
                let d = new Date(bDate);
                if (rec === 'daily') d.setDate(d.getDate() + i);
                if (rec === 'weekly') d.setDate(d.getDate() + (i*7));
                if (rec === 'monthly') d.setMonth(d.getMonth() + i);
                
                const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                events.push({
                    ...base,
                    id: Date.now() + '-' + i,
                    date: ds
                });
            }
            window.showToast('Deployed', `Added ${occ} events to the planner.`, 'fa-layer-group', 'bg-primary');
        }

        saveEvents();
        form.reset();
        tempSubtasks = [];
        renderTempSubtasks();
        document.getElementById('event-date').valueAsDate = new Date();
        renderCalendar();
    });

    document.getElementById('btn-clear-all').addEventListener('click', () => {
        if(confirm("Purge entire workspace schedule?")) {
            events = [];
            saveEvents();
            renderCalendar();
            window.showToast('Purged', 'Entire calendar and analytics data cleared.', 'fa-trash-alt', 'bg-rose');
        }
    });

    // --- Render Logic ---
    const calContainer = document.getElementById('calendar-grid-container');
    const calTitle = document.getElementById('calendar-title');

    function formatTime(str) {
        if(!str || str === "All Day") return "";
        let [h, m] = str.split(':');
        h = parseInt(h);
        const ampm = h >= 12 ? 'pm' : 'am';
        h = h % 12 || 12;
        return `${h}:${m}${ampm}`;
    }

    window.globalRenderCalendar = renderCalendar; // export to attach refresh across modules

    function renderCalendar() {
        calContainer.innerHTML = '';
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        const mName = currentDate.toLocaleString('default', {month: 'long'});

        if (currentView === 'monthly') {
            calTitle.textContent = `${mName} ${y}`;
            renderMonthly(y, m);
        } else if (currentView === 'weekly') {
            calTitle.textContent = `Week View: ${mName} ${y}`;
            renderWeekly(y, m);
        } else {
            const tDate = new Date(document.getElementById('event-date').value || now);
            calTitle.textContent = tDate.toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric', year:'numeric'});
            renderDaily(tDate);
        }
        
        window._currentView = currentView;
        window._currentDate = currentDate;
    }

    function renderMonthly(year, month) {
        const dInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();

        const grid = document.createElement('div');
        grid.className = 'cal-grid-month';

        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        days.forEach(d => {
            const th = document.createElement('div');
            th.className = 'cal-header-cell';
            th.textContent = d;
            grid.appendChild(th);
        });

        for(let i=0; i<firstDay; i++) {
            grid.appendChild(createEmptyCell());
        }

        for(let d=1; d<=dInMonth; d++) {
            const cell = document.createElement('div');
            cell.className = 'cal-day-cell text-sm';
            
            const isToday = d===now.getDate() && month===now.getMonth() && year===now.getFullYear();
            cell.innerHTML = `
                <div class="day-number ${isToday ? 'today' : ''}">${d}</div>
                <div class="events-list"></div>
            `;
            
            const eList = cell.querySelector('.events-list');
            const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            
            let dayEvths = events.filter(e => e.date === dStr);
            dayEvths.sort((a,b) => (a.start==="All Day"? "00:00":a.start).localeCompare(b.start==="All Day"?"00:00":b.start));

            dayEvths.forEach(ev => {
                const pl = document.createElement('div');
                pl.className = `event-pill ${ev.color} ${ev.completed ? 'task-completed-pill' : ''}`;
                const tStr = formatTime(ev.start);
                pl.innerHTML = tStr ? `<span class="e-time">${tStr}</span>${ev.title}` : ev.title;
                pl.onclick = () => openTaskModal(ev);
                eList.appendChild(pl);
            });
            grid.appendChild(cell);
        }

        const rem = (firstDay + dInMonth) % 7;
        if(rem > 0) {
            for(let i=0; i<(7-rem); i++) {
                grid.appendChild(createEmptyCell());
            }
        }
        calContainer.appendChild(grid);
    }
    
    function createEmptyCell(){
        const bl = document.createElement('div');
        bl.className = 'cal-day-cell dimmed';
        return bl;
    }

    function renderWeekly(year, month) {
        let scTime = new Date(year, month, 1);
        const day = scTime.getDay();
        const diff = scTime.getDate() - day + (day===0? -6 : 1);
        scTime = new Date(scTime.setDate(diff));

        const grid = document.createElement('div');
        grid.className = 'cal-grid-week';

        for(let i=0; i<7; i++) {
            let curD = new Date(scTime);
            curD.setDate(scTime.getDate() + i);
            const dStr = `${curD.getFullYear()}-${String(curD.getMonth()+1).padStart(2,'0')}-${String(curD.getDate()).padStart(2,'0')}`;
            const isToday = curD.toDateString() === now.toDateString();

            const col = document.createElement('div');
            col.className = 'week-col';
            col.innerHTML = `
                <div class="week-header ${isToday?'today':''}">
                    <div class="week-day">${curD.toLocaleString('default',{weekday:'short'})}</div>
                    <div class="week-date">${curD.getDate()}</div>
                </div>
                <div class="week-events"></div>
            `;
            
            const weList = col.querySelector('.week-events');
            let weEvts = events.filter(e => e.date === dStr);
            weEvts.sort((a,b) => (a.start==="All Day"? "00:00":a.start).localeCompare(b.start==="All Day"?"00:00":b.start));

            weEvts.forEach(ev => {
                const ed = document.createElement('div');
                ed.className = `week-event ${ev.color} ${ev.completed ? 'task-completed-pill' : ''}`;
                const tStr = [formatTime(ev.start), formatTime(ev.end)].filter(Boolean).join(' - ');
                ed.innerHTML = `
                    <span class="we-time">${tStr || "All Day"}</span>
                    <span class="we-title">${ev.title}</span>
                `;
                ed.onclick = () => openTaskModal(ev);
                weList.appendChild(ed);
            });
            grid.appendChild(col);
        }
        calContainer.appendChild(grid);
    }

    function renderDaily(tDate) {
        const dStr = `${tDate.getFullYear()}-${String(tDate.getMonth()+1).padStart(2,'0')}-${String(tDate.getDate()).padStart(2,'0')}`;
        let dEvs = events.filter(e => e.date === dStr);
        const isToday = tDate.toDateString() === now.toDateString();
        
        if(isToday) {
            dEvs.push({
                isMarker: true,
                start: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
                title: 'Current Segment'
            });
        }
        
        dEvs.sort((a,b) => (a.start==="All Day"? "00:00":a.start).localeCompare(b.start==="All Day"?"00:00":b.start));
        
        const cont = document.createElement('div');
        cont.className = 'daily-container';

        if(dEvs.length === 0 || (dEvs.length===1 && dEvs[0].isMarker)) {
            cont.innerHTML = `<div class="empty-state"><i class="fas fa-mug-hot"></i><p>No operational tasks for this bracket.</p></div>`;
            calContainer.appendChild(cont);
            return;
        }

        const tl = document.createElement('div');
        tl.className = 'timeline';

        dEvs.forEach(ev => {
            const tm = document.createElement('div');
            if(ev.isMarker) {
                tm.className = 'current-time-marker';
                tm.innerHTML = `<div class="current-time-badge"><i class="fas fa-satellite-dish"></i> Live &bull; ${formatTime(ev.start)}</div>`;
                tl.appendChild(tm);
                return;
            }

            tm.className = `timeline-item ${ev.completed ? 'task-completed' : ''}`;
            tm.onclick = () => openTaskModal(ev);
            
            const timeStr = ev.start === "All Day" ? "All Day" : [formatTime(ev.start), formatTime(ev.end)].filter(Boolean).join(' - ');
            
            tm.innerHTML = `
                <div class="timeline-dot ${ev.color}"></div>
                <div class="timeline-content">
                    <div class="tl-time">${timeStr}</div>
                    <div class="tl-title">${ev.title}</div>
                </div>
            `;
            tl.appendChild(tm);
        });

        cont.appendChild(tl);
        calContainer.appendChild(cont);
    }

    renderCalendar();

    // --- Modals ---
    const tmModal = document.getElementById('task-modal');
    const tmTitle = document.getElementById('tm-title');
    const tmCol = document.getElementById('tm-color');
    const tmDate = document.getElementById('tm-date');
    const tmTime = document.getElementById('tm-time');
    const tmRem = document.getElementById('tm-reminder');
    const tmDet = document.getElementById('tm-details');
    const tmPrio = document.getElementById('tm-priority');
    const tmStatus = document.getElementById('tm-status');
    const btnToggleComplete = document.getElementById('btn-toggle-complete');

    let openTask = null;

    window.openTaskModal = function(ev) {
        openTask = ev;
        tmTitle.textContent = ev.title;
        tmCol.className = `task-icon ${ev.color}`;
        
        const dobj = new Date(ev.date+'T00:00:00');
        tmDate.textContent = dobj.toDateString();
        tmTime.textContent = ev.start==="All Day"?"All Day":[formatTime(ev.start),formatTime(ev.end)].filter(Boolean).join(' - ') || 'N/A';
        tmRem.textContent = (ev.reminder && ev.reminder!=='none') ? `${ev.reminder} mins before` : 'No alert set';
        tmDet.textContent = ev.details || 'No extended notes provided.';
        
        tmPrio.textContent = `${ev.priority} Priority`;
        if(ev.priority==='high') { tmPrio.style.background = 'var(--c-danger-light)'; tmPrio.style.color = 'var(--c-danger)'; }
        else if (ev.priority==='low') { tmPrio.style.background = 'var(--c-primary-light)'; tmPrio.style.color = 'var(--c-primary)'; }
        else { tmPrio.style.background = 'var(--c-warning-light)'; tmPrio.style.color = 'var(--c-warning)'; }

        if(ev.completed) {
            tmStatus.classList.remove('hidden');
            tmTitle.parentElement.parentElement.classList.add('task-completed');
            btnToggleComplete.innerHTML = '<i class="fas fa-undo"></i> Revert';
            btnToggleComplete.classList.replace('btn-success', 'btn-outline');
        } else {
            tmStatus.classList.add('hidden');
            tmTitle.parentElement.parentElement.classList.remove('task-completed');
            btnToggleComplete.innerHTML = '<i class="fas fa-check"></i> Mark Done';
            btnToggleComplete.classList.replace('btn-outline', 'btn-success');
        }

        tmModal.classList.remove('hidden');
        renderModalSubtasks();
        setTimeout(() => tmModal.classList.add('show'), 10);
    };

    function renderModalSubtasks() {
        const subCont = document.getElementById('tm-subtasks-list');
        subCont.innerHTML = '';
        if(!openTask || !openTask.subtasks || openTask.subtasks.length === 0) {
            subCont.innerHTML = '<p style="color:var(--c-text-muted); font-size:0.9rem;">No action items defined.</p>';
            return;
        }

        openTask.subtasks.forEach((s, i) => {
            const item = document.createElement('div');
            item.className = `subtask-item ${s.done ? 'done' : ''}`;
            item.innerHTML = `
                <i class="subtask-check ${s.done ? 'fas fa-check-square' : 'far fa-square'}" onclick="toggleSubtask(${i})"></i>
                <span>${s.text}</span>
            `;
            subCont.appendChild(item);
        });
    }

    window.toggleSubtask = (idx) => {
        if(!openTask) return;
        const evIdx = events.findIndex(e => e.id === openTask.id);
        if(evIdx > -1) {
            events[evIdx].subtasks[idx].done = !events[evIdx].subtasks[idx].done;
            openTask = events[evIdx];
            saveEvents();
            renderModalSubtasks();
        }
    };

    function closeTaskModal() {
        tmModal.classList.remove('show');
        setTimeout(() => tmModal.classList.add('hidden'), 300);
        openTask = null;
    }

    document.getElementById('task-modal-close').addEventListener('click', closeTaskModal);

    btnToggleComplete.addEventListener('click', () => {
        if(openTask) {
            const idx = events.findIndex(e => e.id === openTask.id);
            if(idx > -1) {
                events[idx].completed = !events[idx].completed;
                saveEvents();
                renderCalendar();
                closeTaskModal();
                const statusStr = events[idx].completed ? "Completed" : "Reverted";
                window.showToast('Task Updated', `Task marked as ${statusStr}.`, 'fa-check-circle', 'bg-emerald');
            }
        }
    });

    document.getElementById('btn-delete-event').addEventListener('click', () => {
        if(openTask) {
            events = events.filter(e => e.id !== openTask.id);
            saveEvents();
            renderCalendar();
            closeTaskModal();
            window.showToast('Archived', 'Task removed from workspace.', 'fa-archive', 'bg-rose');
        }
    });

    document.getElementById('btn-edit-event').addEventListener('click', () => {
        if(openTask) {
            document.getElementById('event-title').value = openTask.title;
            document.getElementById('event-date').value = openTask.date;
            document.getElementById('event-start').value = openTask.start !== "All Day" ? openTask.start:"";
            document.getElementById('event-end').value = openTask.end;
            document.getElementById('event-priority').value = openTask.priority || "medium";
            document.getElementById('event-reminder').value = openTask.reminder || "none";
            document.getElementById('event-est').value = openTask.estTime || "";
            document.getElementById('event-details').value = openTask.details || "";

            selectedColor = openTask.color;
            document.querySelectorAll('.color-choice').forEach(b => {
                b.classList.remove('selected');
                if(b.getAttribute('data-color') === selectedColor) b.classList.add('selected');
            });

            editingEventId = openTask.id;
            btnSubmit.innerHTML = '<i class="fas fa-save"></i> Update Task';
            btnCancel.classList.remove('hidden');
            document.getElementById('event-recurring').value = 'none';
            document.getElementById('event-recurring').disabled = true;

            closeTaskModal();
        }
    });

    // --- Pomodoro ---
    let focInt = null;
    let focTimeLeft = 25*60;
    let focPaused = false;
    let focElapsedSec = 0;
    
    const focOv = document.getElementById('focus-overlay');
    const focDisp = document.getElementById('focus-timer-display');
    const focStat = document.getElementById('focus-timer-status');
    const focTogBtn = document.getElementById('focus-toggle-btn');
    const focTogTxt = document.getElementById('focus-toggle-text');

    document.getElementById('btn-start-focus').addEventListener('click', () => {
        if(!openTask) return;
        document.getElementById('focus-task-title').textContent = openTask.title;
        closeTaskModal();
        focOv.classList.remove('hidden');
        setTimeout(() => focOv.classList.add('show'), 10);

        const pomoSetting = JSON.parse(localStorage.getItem('saas_schedulizer_settings'))?.pomoLength || 25;
        const est = parseInt(openTask.estTime) || pomoSetting;
        focTimeLeft = est * 60;
        focElapsedSec = 0;
        focPaused = false;
        
        focTogTxt.textContent = "Pause";
        focTogBtn.firstElementChild.className = "fas fa-pause";
        updateFocDisp();

        clearInterval(focInt);
        focInt = setInterval(() => {
            if(!focPaused && focTimeLeft > 0) {
                focTimeLeft--;
                focElapsedSec++;
                updateFocDisp();
            } else if (focTimeLeft <= 0) {
                finishFocus();
            }
        }, 1000);
    });

    function updateFocDisp() {
        const m = String(Math.floor(focTimeLeft/60)).padStart(2,'0');
        const s = String(focTimeLeft%60).padStart(2,'0');
        focDisp.textContent = `${m}:${s}`;
        focStat.textContent = `${m} mins remaining block`;
    }

    focTogBtn.addEventListener('click', () => {
        focPaused = !focPaused;
        if(focPaused) {
            focTogTxt.textContent = "Resume";
            focTogBtn.firstElementChild.className = "fas fa-play";
            focStat.textContent = "Focus Paused";
        } else {
            focTogTxt.textContent = "Pause";
            focTogBtn.firstElementChild.className = "fas fa-pause";
            updateFocDisp();
        }
    });

    document.getElementById('focus-stop-btn').addEventListener('click', finishFocus);
    document.getElementById('focus-close-btn').addEventListener('click', () => {
        clearInterval(focInt);
        closeFocus();
    });

    function finishFocus() {
        clearInterval(focInt);
        
        if (openTask && focElapsedSec > 0) {
            const idx = events.findIndex(e => e.id === openTask.id);
            if (idx > -1) {
                // Focus time measured in minutes
                const mElapsed = Math.ceil(focElapsedSec / 60);
                events[idx].focusMins = (events[idx].focusMins || 0) + mElapsed;
                saveEvents();
            }
        }
        
        window.showToast('Deep Work Concluded', 'Session metrics recorded successfully.', 'fa-brain', 'bg-indigo');
        closeFocus();
    }

    function closeFocus() {
        focOv.classList.remove('show');
        setTimeout(() => focOv.classList.add('hidden'), 500);
    }
});
