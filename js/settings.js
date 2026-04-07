/**
 * SaaS Schedule Creator - Settings Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    const SETTINGS_KEY = 'saas_schedulizer_settings';
    
    const defaultSettings = {
        primaryColor: '#64748b', // Slate Blue
        bgStyle: 'solid',
        glassIntensity: 80,
        calStyle: 'minimal',
        pomoLength: 25
    };

    let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { ...defaultSettings };

    // DOM Elements
    const root = document.documentElement;
    const body = document.body;
    
    const colorBtns = document.querySelectorAll('.theme-cc');
    const bgSelect = document.getElementById('setting-bg-style');
    const glassRange = document.getElementById('setting-glass-intensity');

    // UI Updates based on data
    function applySettings() {
        // Apply Color
        root.style.setProperty('--c-primary', settings.primaryColor);
        // compute an approximate hover/light based on main by adjusting opacity
        root.style.setProperty('--c-primary-light', settings.primaryColor + '20'); 
        root.style.setProperty('--c-primary-hover', settings.primaryColor + 'EE'); 

        // Apply background
        body.classList.remove('mesh', 'mesh-calm', 'waves', 'forest', 'dawn');
        if(settings.bgStyle !== 'solid') {
            body.classList.add(settings.bgStyle);
        }

        // Apply Glass Intensity
        // Default opacity is 0.7 for glass panels. Let's scale intensity 0-100 to 0.4-0.95 opacity
        // higher intensity means more blur, maybe less opacity. Let's say:
        const opacity = 1 - (settings.glassIntensity / 200); // 80 -> 1 - 0.4 = 0.6
        root.style.setProperty('--c-bg-surface', `var(--c-bg-app)`); // wait, we can't easily merge color logic purely via var if we rely on variables.
        // Let's modify the backdrop filter and background opacity across panels.
        const panels = document.querySelectorAll('.glass-panel');
        panels.forEach(p => {
            p.style.backdropFilter = `blur(${settings.glassIntensity / 10}px)`;
            p.style.webkitBackdropFilter = `blur(${settings.glassIntensity / 10}px)`;
        });

        const modals = document.querySelectorAll('.glass-modal, .task-details-modal');
        modals.forEach(m => {
            m.style.backdropFilter = `blur(${settings.glassIntensity / 5}px)`;
        });
        
        // Apply Calendar Style layout
        if(settings.calStyle === 'cards') {
            body.classList.add('cal-style-cards');
        } else {
            body.classList.remove('cal-style-cards');
        }

        // Apply Pomodoro Length (Handled on render or form load, but push to localStorage)
        // Set root if we needed it globally, but app.js will read this setting.

        // Save
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    // Initialize UI controls
    colorBtns.forEach(btn => {
        if(btn.dataset.hex === settings.primaryColor) {
            btn.classList.add('active');
        }
        btn.addEventListener('click', () => {
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            settings.primaryColor = btn.dataset.hex;
            applySettings();
        });
    });

    if (bgSelect) {
        bgSelect.value = settings.bgStyle;
        bgSelect.addEventListener('change', (e) => {
            settings.bgStyle = e.target.value;
            applySettings();
        });
    }

    if (glassRange) {
        glassRange.value = settings.glassIntensity;
        glassRange.addEventListener('input', (e) => {
            settings.glassIntensity = e.target.value;
            applySettings();
        });
    }
    
    const calSelect = document.getElementById('setting-cal-style');
    if (calSelect) {
        calSelect.value = settings.calStyle;
        calSelect.addEventListener('change', (e) => {
            settings.calStyle = e.target.value;
            applySettings();
            // trigger calendar re-render if loaded
            if (window.globalRenderCalendar) window.globalRenderCalendar();
        });
    }

    const pomoSelect = document.getElementById('setting-pomo-length');
    if (pomoSelect) {
        pomoSelect.value = settings.pomoLength;
        pomoSelect.addEventListener('change', (e) => {
            settings.pomoLength = parseInt(e.target.value, 10);
            applySettings();
            // Update the form default live
            const estInput = document.getElementById('event-est');
            if(estInput && !estInput.value) estInput.placeholder = settings.pomoLength;
        });
    }

    // Factory Reset
    const btnReset = document.getElementById('btn-factory-reset');
    if(btnReset) {
        btnReset.addEventListener('click', () => {
            if(confirm("Are you absolutely sure? This will delete all tasks and reset all settings to default. This cannot be undone.")) {
                localStorage.removeItem(SETTINGS_KEY);
                localStorage.removeItem('saas_schedulizer_events');
                localStorage.removeItem('saas_user');
                alert("Factory reset complete. Application will reload.");
                window.location.reload();
            }
        });
    }

    // JSON Export
    const btnExportData = document.getElementById('btn-export-json');
    if(btnExportData) {
        btnExportData.addEventListener('click', () => {
            const evs = window._events || [];
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(evs, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href",     dataStr);
            downloadAnchorNode.setAttribute("download", "schedulizer_backup.json");
            document.body.appendChild(downloadAnchorNode); 
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });
    }

    // Run Once
    applySettings();
});
