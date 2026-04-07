/**
 * SaaS Schedule Creator - Analytics Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    const statTotal = document.getElementById('stat-total');
    const statCompleted = document.getElementById('stat-completed');
    const statFocus = document.getElementById('stat-focus');
    const statRate = document.getElementById('stat-completion-rate');

    const ringChart = document.getElementById('status-ring');
    const ringText = document.getElementById('status-ring-text');
    const lgCompleted = document.getElementById('lg-completed');
    const lgPending = document.getElementById('lg-pending');

    const valHigh = document.getElementById('val-high');
    const valMedium = document.getElementById('val-medium');
    const valLow = document.getElementById('val-low');

    const barHigh = document.getElementById('bar-high');
    const barMedium = document.getElementById('bar-medium');
    const barLow = document.getElementById('bar-low');

    window.updateAnalytics = function() {
        // Assume events array is attached to window from app.js
        const events = window._events || [];
        
        const total = events.length;
        const completed = events.filter(e => e.completed).length;
        const pending = total - completed;
        
        let focusSumMins = events.reduce((sum, e) => sum + (e.focusMins || 0), 0);
        
        const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

        // Update Numbers
        if(statTotal) statTotal.textContent = total;
        if(statCompleted) statCompleted.textContent = completed;
        if(statRate) statRate.textContent = `${rate}%`;
        
        if(statFocus) {
            const h = Math.floor(focusSumMins / 60);
            const m = focusSumMins % 60;
            statFocus.textContent = `${h}h ${m}m`;
        }

        // Update Ring Chart
        if(ringChart) {
            // green for complete, border for pending.
            const greenDeg = (rate / 100) * 360;
            ringChart.style.background = `conic-gradient(var(--c-emerald) 0deg, var(--c-emerald) ${greenDeg}deg, var(--c-border) ${greenDeg}deg, var(--c-border) 360deg)`;
            ringText.textContent = `${rate}%`;
            lgCompleted.textContent = completed;
            lgPending.textContent = pending;
        }

        // Update Bar Chart (By Priority)
        let ph = 0, pm = 0, pl = 0;
        events.forEach(e => {
            if(e.priority === 'high') ph++;
            else if(e.priority === 'low') pl++;
            else pm++;
        });

        const maxP = Math.max(ph, pm, pl, 1); // avoid div by 0

        if(valHigh) {
            valHigh.textContent = ph;
            barHigh.style.height = `${(ph/maxP)*100}%`;
        }
        if(valMedium) {
            valMedium.textContent = pm;
            barMedium.style.height = `${(pm/maxP)*100}%`;
        }
        if(valLow) {
            valLow.textContent = pl;
            barLow.style.height = `${(pl/maxP)*100}%`;
        }
    };
});
