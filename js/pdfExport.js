/**
 * SaaS Schedule Creator - PDF Export Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    const btnExportPdf = document.getElementById('btn-export-pdf');
    if(!btnExportPdf) return;

    btnExportPdf.addEventListener('click', async () => {
        const overlay = document.getElementById('pdf-processing');
        overlay.classList.remove('hidden');
        
        try {
            const templateTitle = document.getElementById('pdf-template-title');
            const templateSubtitle = document.getElementById('pdf-template-subtitle');
            const templateContent = document.getElementById('pdf-template-content');
            const templateDate = document.getElementById('pdf-template-date');
            
            // Assuming globals from app.js
            const cView = window._currentView || 'monthly';
            const cDate = window._currentDate || new Date();
            const events = window._events || [];
            const calTitleText = document.getElementById('calendar-title')?.textContent || "Schedule";

            templateTitle.textContent = cView === 'daily' ? 'Daily Planner' : (cView === 'weekly' ? 'Weekly Planner' : 'Monthly Planner');
            templateSubtitle.textContent = calTitleText;
            templateDate.textContent = "Generated: " + new Date().toLocaleDateString();

            let pdfEvents = [];
            const yyyy = cDate.getFullYear();
            const mm = cDate.getMonth();

            if (cView === 'daily') {
                const dateStr = document.getElementById('event-date')?.value;
                if (dateStr) {
                    pdfEvents = events.filter(e => e.date === dateStr);
                } else {
                    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                    pdfEvents = events.filter(e => e.date === todayStr);
                }
            } else {
                const prefix = `${yyyy}-${String(mm + 1).padStart(2, '0')}`;
                pdfEvents = events.filter(e => e.date.startsWith(prefix));
            }

            // Function to pad colors dynamically replacing standard class mapping with a real HEX/RGB map for the PDF
            const colorMap = {
                'bg-slate': '#64748b',
                'bg-lavender': '#c084fc',
                'bg-rose-dusty': '#fda4af',
                'bg-mint': '#6ee7b7',
                'bg-teal': '#2dd4bf',
                'bg-sand': '#fcd34d',
                'bg-indigo': '#64748b',
                'bg-emerald': '#6ee7b7',
                'bg-rose': '#fda4af',
                'bg-amber': '#fcd34d',
                'bg-purple': '#c084fc'
            };

            function formatTime(str) {
                if(!str || str === "All Day") return "";
                let [h, m] = str.split(':');
                h = parseInt(h);
                const ampm = h >= 12 ? 'pm' : 'am';
                h = h % 12 || 12;
                return `${h}:${m}${ampm}`;
            }

            pdfEvents.sort((a, b) => a.date.localeCompare(b.date) || ((a.start === 'All Day' ? '00:00' : a.start).localeCompare(b.start === 'All Day' ? '00:00' : b.start)));

            templateContent.innerHTML = '';

            pdfEvents.forEach(ev => {
                const row = document.createElement('div');
                row.className = 'pdf-row';
                
                const sTime = ev.start && ev.start !== "All Day" ? formatTime(ev.start) : "-- : --";
                const eTime = ev.end ? formatTime(ev.end) : "-- : --";
                
                const displayDate = cView !== 'daily' ? `<div class="pdf-date-badge">${ev.date}</div>` : '';
                const baseColor = colorMap[ev.color] || '#6366f1';

                row.innerHTML = `
                    <div class="pdf-color-bar" style="background-color: ${baseColor};"></div>
                    <div class="pdf-check">
                        <div class="pdf-box"></div>
                    </div>
                    <div class="pdf-details">
                        ${displayDate}
                        <h3>${ev.title}</h3>
                    </div>
                    <div class="pdf-timing">
                        <div class="pdf-timing-row">
                            <span class="pdf-time-lbl">Start</span>
                            <span class="pdf-time-val" style="color: ${baseColor};">${sTime}</span>
                        </div>
                        <div class="pdf-timing-row" style="margin-top: 8px;">
                            <span class="pdf-time-lbl">End</span>
                            <span class="pdf-time-val end">${eTime}</span>
                        </div>
                    </div>
                `;
                templateContent.appendChild(row);
            });

            // Fill empty rows if schedule is light
            const emptyRows = Math.max(3, 8 - pdfEvents.length);
            for (let i = 0; i < emptyRows; i++) {
                const row = document.createElement('div');
                row.className = 'pdf-row empty';
                row.innerHTML = `
                    <div class="pdf-color-bar" style="background-color: #cbd5e1;"></div>
                    <div class="pdf-check"><div class="pdf-box" style="border-style: dashed;"></div></div>
                    <div class="pdf-details">
                        <div style="border-bottom: 2px dotted #cbd5e1; width: 100%; height: 16px;"></div>
                    </div>
                    <div class="pdf-timing">
                        <div class="pdf-timing-row">
                            <span class="pdf-time-lbl">Start</span>
                            <span class="pdf-time-val"><div style="border-bottom: 2px dashed #cbd5e1; width: 40px; height: 16px;"></div></span>
                        </div>
                        <div class="pdf-timing-row" style="margin-top: 8px;">
                            <span class="pdf-time-lbl">End</span>
                            <span class="pdf-time-val"><div style="border-bottom: 2px dashed #cbd5e1; width: 40px; height: 16px;"></div></span>
                        </div>
                    </div>
                `;
                templateContent.appendChild(row);
            }

            const templateEl = document.getElementById('pdf-template');
            templateEl.style.left = '0px';
            templateEl.style.zIndex = '100';

            // Wait brief moment for paint
            await new Promise(r => setTimeout(r, 250));

            const canvas = await window.html2canvas(templateEl, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            templateEl.style.left = '-9999px';
            templateEl.style.zIndex = '-1';

            const imgData = canvas.toDataURL('image/png');
            
            // Generate A4 portrait
            const doc = new window.jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            doc.save(`Schedulizer_${cView}_Planner.pdf`);

        } catch (e) {
            console.error("PDF Export Error: ", e);
            alert("Could not generate PDF right now. Check console for details.");
        } finally {
            overlay.classList.add('hidden');
        }
    });

});
