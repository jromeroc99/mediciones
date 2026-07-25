let API_KEY = '';
let selectedProjectId = null;
let selectedProjectName = null;
let map = null;
let mapLayers = null;

function renderIcons() {
    if (window.lucide) window.lucide.createIcons();
}

function setStatus(elId, kind, message, icon) {
    const iconMap = { success: 'check-circle-2', error: 'alert-circle', info: 'info' };
    const el = document.getElementById(elId);
    if (!message) { el.innerHTML = ''; return; }
    const ic = icon || iconMap[kind] || 'info';
    el.innerHTML = `<span class="status ${kind}"><i data-lucide="${ic}"></i>${message}</span>`;
    renderIcons();
}

function saveConfig() {
    API_KEY = document.getElementById('apiKey').value.trim();
    if (API_KEY) {
        localStorage.setItem('apiKey', API_KEY);
        setStatus('configStatus', 'success', 'Configuración guardada');
    } else {
        setStatus('configStatus', 'error', 'Introduce una API Key');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    renderIcons();
    const savedKey = localStorage.getItem('apiKey');
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
        API_KEY = savedKey;
        setStatus('configStatus', 'info', 'Configuración cargada de la sesión anterior');
    }
});

async function apiRequest(endpoint, options = {}) {
    if (!API_KEY) {
        alert('Configura tu API Key primero');
        return null;
    }
    const isFormData = options.body instanceof FormData;
    const headers = { 'X-API-Key': API_KEY, ...options.headers };
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const response = await fetch(endpoint, { ...options, headers });
    if (!response.ok) {
        let detail = 'Error en la petición';
        try { const err = await response.json(); detail = err.detail || detail; } catch (_) {}
        throw new Error(detail);
    }
    return response.json();
}

async function createProject() {
    const nombre = document.getElementById('newProjectName').value.trim();
    const fechaInput = document.getElementById('newProjectDate').value;
    if (!nombre || !fechaInput) {
        setStatus('createProjectStatus', 'error', 'Nombre y fecha son obligatorios');
        return;
    }
    const fecha = new Date(fechaInput).toISOString();
    try {
        const project = await apiRequest('/proyectos/', {
            method: 'POST',
            body: JSON.stringify({ nombre, fecha })
        });
        setStatus('createProjectStatus', 'success', `Proyecto creado (ID ${project.id})`);
        document.getElementById('newProjectName').value = '';
        document.getElementById('newProjectDate').value = '';
        loadProjects();
    } catch (error) {
        setStatus('createProjectStatus', 'error', error.message);
    }
}

async function loadProjects() {
    const container = document.getElementById('projectsContainer');
    container.innerHTML = '<div class="loader"></div>';
    try {
        const projects = await apiRequest('/proyectos/');
        if (!projects.length) {
            container.innerHTML = '<p class="empty-state">No hay proyectos disponibles.</p>';
            return;
        }
        container.innerHTML = `<div class="projects-grid">${projects.map(p => `
            <div class="project-card ${p.id === selectedProjectId ? 'selected' : ''}"
                 data-id="${p.id}"
                 data-name="${escapeAttr(p.nombre || '')}"
                 onclick="selectProject(${p.id})">
                <div class="project-card__title">
                    <i data-lucide="folder"></i>
                    <span>${escapeHtml(p.nombre) || 'Proyecto ' + p.id}</span>
                </div>
                <div class="project-card__meta">
                    <i data-lucide="calendar"></i>
                    <span>${p.fecha ? new Date(p.fecha).toLocaleString('es-ES') : '—'}</span>
                </div>
                <div class="project-card__id">ID · ${p.id}</div>
            </div>`).join('')}</div>`;
        renderIcons();
    } catch (error) {
        container.innerHTML = `<span class="status error"><i data-lucide="alert-circle"></i>${escapeHtml(error.message)}</span>`;
        renderIcons();
    }
}

function selectProject(projectId) {
    const card = document.querySelector(`.project-card[data-id="${projectId}"]`);
    selectedProjectId = projectId;
    selectedProjectName = card ? card.dataset.name : String(projectId);

    document.querySelectorAll('.project-card').forEach(c => c.classList.remove('selected'));
    if (card) card.classList.add('selected');

    const info = document.getElementById('selectedProjectInfo');
    info.className = 'status info';
    info.innerHTML = `<i data-lucide="check-circle-2"></i>Proyecto seleccionado: ${escapeHtml(selectedProjectName) || 'ID ' + projectId} (ID ${projectId})`;
    renderIcons();

    document.getElementById('uploadCsvForm').style.display = 'flex';
    setStatus('uploadCsvStatus', 'info', '');
    loadMeasurements(projectId);
    loadProjectPolygon(projectId);
}

async function uploadCsv() {
    const fileInput = document.getElementById('csvFile');
    if (!selectedProjectId) {
        setStatus('uploadCsvStatus', 'error', 'Selecciona un proyecto primero');
        return;
    }
    if (!fileInput.files || !fileInput.files.length) {
        setStatus('uploadCsvStatus', 'error', 'Selecciona un archivo CSV');
        return;
    }
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    document.getElementById('uploadCsvStatus').innerHTML = '<div class="loader"></div>';
    try {
        const result = await apiRequest(`/mediciones/${selectedProjectId}/upload-csv`, {
            method: 'POST',
            body: formData
        });
        setStatus('uploadCsvStatus', 'success',
            `${result.mensaje}${result.poligono_generado ? ' · polígono generado' : ''}`);
        fileInput.value = '';
        loadMeasurements(selectedProjectId);
    } catch (error) {
        setStatus('uploadCsvStatus', 'error', error.message);
    }
}

const MEASUREMENT_COLUMNS = [
    { key: 'numero_medicion', label: 'Nº', kind: 'num', fmt: v => v ?? '—' },
    { key: 'fecha_hora', label: 'Fecha/Hora', fmt: v => v ? new Date(v).toLocaleString('es-ES') : '—' },
    { key: 'observaciones', label: 'Observaciones', fmt: v => v || '—' },
    { key: 'latitud', label: 'Latitud', kind: 'num', fmt: v => v != null ? v.toFixed(6) : '—' },
    { key: 'longitud', label: 'Longitud', kind: 'num', fmt: v => v != null ? v.toFixed(6) : '—' },
    { key: 'x', label: 'X', kind: 'num', fmt: v => v != null ? v.toFixed(3) : '—' },
    { key: 'y', label: 'Y', kind: 'num', fmt: v => v != null ? v.toFixed(3) : '—' },
    { key: 'elevacion', label: 'Elevación', kind: 'num', fmt: v => v != null ? v.toFixed(2) + ' m' : '—' },
    { key: 'altura_ortometrica', label: 'H. Ortom.', kind: 'num', fmt: v => v != null ? v.toFixed(2) + ' m' : '—' },
    { key: 'altura_instrumento', label: 'H. Instr.', kind: 'num', fmt: v => v != null ? v.toFixed(2) + ' m' : '—' },
    { key: 'fix_id', label: 'Fix', kind: 'num', fmt: v => v ?? '—' },
    { key: 'velocidad', label: 'Velocidad', kind: 'num', fmt: v => v != null ? v.toFixed(2) : '—' },
    { key: 'rumbo', label: 'Rumbo', kind: 'num', fmt: v => v != null ? v.toFixed(2) + '°' : '—' },
    { key: 'precision_horizontal', label: 'Prec. H', kind: 'num', fmt: v => v != null ? v.toFixed(3) : '—' },
    { key: 'precision_vertical', label: 'Prec. V', kind: 'num', fmt: v => v != null ? v.toFixed(3) : '—' },
    { key: 'pdop', label: 'PDOP', kind: 'num', fmt: v => v != null ? v.toFixed(2) : '—' },
    { key: 'hdop', label: 'HDOP', kind: 'num', fmt: v => v != null ? v.toFixed(2) : '—' },
    { key: 'vdop', label: 'VDOP', kind: 'num', fmt: v => v != null ? v.toFixed(2) : '—' },
    { key: 'fecha_creacion', label: 'Creación', fmt: v => v ? new Date(v).toLocaleString('es-ES') : '—' },
];

async function loadMeasurements(projectId) {
    const container = document.getElementById('measurementsContainer');
    const countBadge = document.getElementById('measurementsCount');
    container.innerHTML = '<div class="loader"></div>';
    countBadge.style.display = 'none';

    try {
        const measurements = await apiRequest(`/mediciones/${projectId}`);
        renderMapPoints(measurements);
        if (!measurements.length) {
            container.innerHTML = '<p class="empty-state">Este proyecto no tiene mediciones.</p>';
            return;
        }

        countBadge.textContent = `${measurements.length} registros`;
        countBadge.style.display = 'inline-block';

        const headerCells = [
            '<th style="width: 32px;"></th>',
            '<th class="num">ID</th>',
            ...MEASUREMENT_COLUMNS.map(c => `<th class="${c.kind === 'num' ? 'num' : ''}">${c.label}</th>`)
        ].join('');

        const rows = measurements.map((m, idx) => {
            const cells = MEASUREMENT_COLUMNS.map(c => {
                const value = c.fmt(m[c.key]);
                const cls = c.kind === 'num' ? 'num' : (value === '—' ? 'muted' : '');
                return `<td class="${cls}">${escapeHtml(String(value))}</td>`;
            }).join('');

            const extras = m.datos_adicionales && Object.keys(m.datos_adicionales).length
                ? Object.entries(m.datos_adicionales)
                    .map(([k, v]) => `<div><span class="k">${escapeHtml(k)}:</span> <span class="v">${escapeHtml(String(v))}</span></div>`)
                    .join('')
                : '<span class="empty-state" style="padding: 8px;">Sin datos adicionales.</span>';

            return `
                <tr class="expandable" data-row="${idx}" onclick="toggleDetails(${idx})">
                    <td><span class="chevron"><i data-lucide="chevron-right"></i></span></td>
                    <td class="num">${m.id ?? '—'}</td>
                    ${cells}
                </tr>
                <tr class="details-row" data-details="${idx}" style="display: none;">
                    <td colspan="${MEASUREMENT_COLUMNS.length + 2}">
                        <div class="stack-sm">
                            <strong style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--color-text-muted);">Datos adicionales</strong>
                            <div class="details-grid">${extras}</div>
                        </div>
                    </td>
                </tr>`;
        }).join('');

        container.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead><tr>${headerCells}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
        renderIcons();
    } catch (error) {
        container.innerHTML = `<span class="status error"><i data-lucide="alert-circle"></i>${escapeHtml(error.message)}</span>`;
        renderIcons();
    }
}

function toggleDetails(idx) {
    const detailsRow = document.querySelector(`tr.details-row[data-details="${idx}"]`);
    const parentRow = document.querySelector(`tr.expandable[data-row="${idx}"]`);
    if (!detailsRow || !parentRow) return;
    const visible = detailsRow.style.display !== 'none';
    detailsRow.style.display = visible ? 'none' : 'table-row';
    parentRow.classList.toggle('expanded', !visible);
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
}

/* --- Map --- */
function ensureMap() {
    if (map) return map;
    document.getElementById('mapEmpty').style.display = 'none';
    const mapEl = document.getElementById('map');
    mapEl.style.display = 'block';

    map = L.map('map', { zoomControl: true, attributionControl: true })
        .setView([40.4168, -3.7038], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    mapLayers = {
        points: L.layerGroup().addTo(map),
        polygon: L.layerGroup().addTo(map)
    };
    return map;
}

function renderMapPoints(measurements) {
    ensureMap();
    mapLayers.points.clearLayers();

    const valid = measurements.filter(m => Number.isFinite(m.latitud) && Number.isFinite(m.longitud));
    const meta = document.getElementById('mapMeta');

    if (!valid.length) {
        meta.style.display = 'none';
        setTimeout(() => map.invalidateSize(), 50);
        return;
    }

    const latlngs = valid.map(m => [m.latitud, m.longitud]);

    valid.forEach(m => {
        const marker = L.circleMarker([m.latitud, m.longitud], {
            radius: 5,
            color: '#ffffff',
            weight: 1.5,
            fillColor: '#111827',
            fillOpacity: 0.9
        });
        marker.bindPopup(popupHtml(m));
        marker.addTo(mapLayers.points);
    });

    meta.textContent = `${valid.length} puntos`;
    meta.style.display = 'inline-block';

    const bounds = L.latLngBounds(latlngs);
    setTimeout(() => {
        map.invalidateSize();
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 19 });
    }, 50);
}

async function loadProjectPolygon(projectId) {
    try {
        const project = await apiRequest(`/proyectos/${projectId}`);
        renderPolygon(project.poligono);
    } catch (_) {
        renderPolygon(null);
    }
}

function renderPolygon(poligono) {
    if (!mapLayers) return;
    mapLayers.polygon.clearLayers();
    const coords = parsePolygon(poligono);
    if (!coords) return;
    L.polygon(coords, {
        color: '#2563eb',
        weight: 2,
        fillColor: '#2563eb',
        fillOpacity: 0.08
    }).addTo(mapLayers.polygon);
}

function parsePolygon(poligono) {
    if (!poligono) return null;
    // GeoJSON object
    if (typeof poligono === 'object' && poligono.type === 'Polygon' && poligono.coordinates) {
        return poligono.coordinates[0].map(([lon, lat]) => [lat, lon]);
    }
    // WKT: "POLYGON((lon lat, lon lat, ...))"
    if (typeof poligono === 'string') {
        const wkt = poligono.match(/POLYGON\s*\(\(([^)]+)\)\)/i);
        if (wkt) {
            return wkt[1].split(',').map(pair => {
                const [lon, lat] = pair.trim().split(/\s+/).map(Number);
                return [lat, lon];
            });
        }
    }
    return null;
}

function popupHtml(m) {
    const rows = [
        ['Nº', m.numero_medicion],
        ['Fecha', m.fecha_hora ? new Date(m.fecha_hora).toLocaleString('es-ES') : null],
        ['Lat / Lon', `${m.latitud.toFixed(6)}, ${m.longitud.toFixed(6)}`],
        ['Elevación', m.elevacion != null ? m.elevacion.toFixed(2) + ' m' : null],
        ['Fix', m.fix_id],
        ['HDOP / VDOP', (m.hdop != null || m.vdop != null) ? `${m.hdop ?? '—'} / ${m.vdop ?? '—'}` : null],
        ['Obs.', m.observaciones]
    ].filter(([, v]) => v != null && v !== '');
    return `<div><strong>Medición ${escapeHtml(String(m.id ?? ''))}</strong></div>` +
        rows.map(([k, v]) => `<div><span class="k">${escapeHtml(k)}:</span> ${escapeHtml(String(v))}</div>`).join('');
}
