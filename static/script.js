let API_KEY = '';
let selectedProjectId = null;

function saveConfig() {
    API_KEY = document.getElementById('apiKey').value;

    const status = document.getElementById('configStatus');
    if (API_KEY) {
        status.innerHTML = '<span class="status success">✓ Configuración guardada</span>';
        localStorage.setItem('apiKey', API_KEY);
    } else {
        status.innerHTML = '<span class="status error">⚠ Por favor ingresa una API Key</span>';
    }
}

window.onload = function() {
    const savedKey = localStorage.getItem('apiKey');
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
        API_KEY = savedKey;
        document.getElementById('configStatus').innerHTML = '<span class="status info">ℹ Configuración cargada desde sesión anterior</span>';
    }
};

async function apiRequest(endpoint, options = {}) {
    if (!API_KEY) {
        alert('Por favor configura tu API Key primero');
        return null;
    }

    const isFormData = options.body instanceof FormData;
    const headers = {
        'X-API-Key': API_KEY,
        ...options.headers
    };
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(endpoint, {
        ...options,
        headers
    });

    if (!response.ok) {
        let detail = 'Error en la petición';
        try {
            const error = await response.json();
            detail = error.detail || detail;
        } catch (_) { /* ignore */ }
        throw new Error(detail);
    }

    return response.json();
}

async function createProject() {
    const nombre = document.getElementById('newProjectName').value.trim();
    const fechaInput = document.getElementById('newProjectDate').value;
    const statusEl = document.getElementById('createProjectStatus');

    if (!nombre || !fechaInput) {
        statusEl.innerHTML = '<span class="status error">⚠ Nombre y fecha son obligatorios</span>';
        return;
    }

    const fecha = new Date(fechaInput).toISOString();

    try {
        const project = await apiRequest('/proyectos/', {
            method: 'POST',
            body: JSON.stringify({ nombre, fecha })
        });
        statusEl.innerHTML = `<span class="status success">✓ Proyecto creado (ID ${project.id})</span>`;
        document.getElementById('newProjectName').value = '';
        document.getElementById('newProjectDate').value = '';
        loadProjects();
    } catch (error) {
        statusEl.innerHTML = `<span class="status error">Error: ${error.message}</span>`;
    }
}

async function loadProjects() {
    const container = document.getElementById('projectsContainer');
    container.innerHTML = '<div class="loader"></div>';

    try {
        const projects = await apiRequest('/proyectos/');

        if (projects.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay proyectos disponibles</p>';
            return;
        }

        container.innerHTML = '<div class="projects-grid">' +
            projects.map(project => `
                <div class="project-card ${project.id === selectedProjectId ? 'selected' : ''}" onclick="selectProject(${project.id}, '${(project.nombre || '').replace(/'/g, "\\'")}')">
                    <h3>${project.nombre || 'Proyecto ' + project.id}</h3>
                    <p><strong>ID:</strong> ${project.id}</p>
                    ${project.fecha ? `<p><strong>Fecha:</strong> ${new Date(project.fecha).toLocaleString('es-ES')}</p>` : ''}
                </div>
            `).join('') +
        '</div>';
    } catch (error) {
        container.innerHTML = `<span class="status error">Error: ${error.message}</span>`;
    }
}

function selectProject(projectId, projectName) {
    selectedProjectId = projectId;

    const info = document.getElementById('selectedProjectInfo');
    info.className = 'status info';
    info.textContent = `Proyecto seleccionado: ${projectName || 'ID ' + projectId} (ID ${projectId})`;

    document.getElementById('uploadCsvForm').style.display = 'flex';
    document.getElementById('uploadCsvStatus').innerHTML = '';

    // Refresh cards to reflect selection state
    document.querySelectorAll('.project-card').forEach(card => card.classList.remove('selected'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected');
    }

    loadMeasurements(projectId);
}

async function uploadCsv() {
    const statusEl = document.getElementById('uploadCsvStatus');
    const fileInput = document.getElementById('csvFile');

    if (!selectedProjectId) {
        statusEl.innerHTML = '<span class="status error">⚠ Selecciona un proyecto primero</span>';
        return;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
        statusEl.innerHTML = '<span class="status error">⚠ Selecciona un archivo CSV</span>';
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    statusEl.innerHTML = '<div class="loader"></div>';

    try {
        const result = await apiRequest(`/mediciones/${selectedProjectId}/upload-csv`, {
            method: 'POST',
            body: formData
        });
        statusEl.innerHTML = `<span class="status success">✓ ${result.mensaje}${result.poligono_generado ? ' (polígono generado)' : ''}</span>`;
        fileInput.value = '';
        loadMeasurements(selectedProjectId);
    } catch (error) {
        statusEl.innerHTML = `<span class="status error">Error: ${error.message}</span>`;
    }
}

async function loadMeasurements(projectId) {
    const container = document.getElementById('measurementsContainer');
    container.innerHTML = '<div class="loader"></div>';

    try {
        const measurements = await apiRequest(`/mediciones/${projectId}`);

        if (measurements.length === 0) {
            container.innerHTML = '<p class="empty-state">Este proyecto no tiene mediciones</p>';
            return;
        }

        container.innerHTML = `
            <h3>Proyecto ID: ${projectId} - ${measurements.length} mediciones</h3>
            <div class="measurements-table">
                <table>
                    <thead>
                        <tr>
                            <th>Nº</th>
                            <th>Fecha/Hora</th>
                            <th>Latitud</th>
                            <th>Longitud</th>
                            <th>Elevación</th>
                            <th>Fix ID</th>
                            <th>Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${measurements.map(m => `
                            <tr>
                                <td>${m.numero_medicion ?? '-'}</td>
                                <td>${m.fecha_hora ? new Date(m.fecha_hora).toLocaleString('es-ES') : '-'}</td>
                                <td>${m.latitud != null ? m.latitud.toFixed(6) : '-'}</td>
                                <td>${m.longitud != null ? m.longitud.toFixed(6) : '-'}</td>
                                <td>${m.elevacion != null ? m.elevacion.toFixed(2) + 'm' : '-'}</td>
                                <td>${m.fix_id ?? '-'}</td>
                                <td>${m.observaciones || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<span class="status error">Error: ${error.message}</span>`;
    }
}
