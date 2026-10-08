const API_BASE_URL = 'http://localhost:8000/api';
const TOKEN_KEY = 'incidencias_token';
const USER_KEY = 'incidencias_user';

const state = { user: null, categories: [], incidents: [] };

const api = {
    request(options) {
        const token = localStorage.getItem(TOKEN_KEY);
        return $.ajax({
            url: `${API_BASE_URL}${options.path}`,
            method: options.method || 'GET',
            data: options.data ? JSON.stringify(options.data) : undefined,
            contentType: 'application/json',
            headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' },
        }).fail((xhr) => {
            if (xhr.status === 401) logout(false);
        });
    },
    login(email, password) { return this.request({ path: '/login', method: 'POST', data: { email, password } }); },
    user() { return this.request({ path: '/user' }); },
    incidents(filters = {}) {
        const query = $.param(Object.fromEntries(Object.entries(filters).filter(([, value]) => value)));
        return this.request({ path: `/incidencias${query ? `?${query}` : ''}` });
    },
    categories() { return this.request({ path: '/categorias' }); },
    createIncident(data) { return this.request({ path: '/incidencias', method: 'POST', data }); },
    incident(id) { return this.request({ path: `/incidencias/${id}` }); },
    comments(id) { return this.request({ path: `/incidencias/${id}/comentarios` }); },
    addComment(id, contenido) { return this.request({ path: `/incidencias/${id}/comentarios`, method: 'POST', data: { contenido } }); },
    take(id) { return this.request({ path: `/incidencias/${id}/tomar`, method: 'PUT' }); },
    resolve(id, resolucion) { return this.request({ path: `/incidencias/${id}/resolver`, method: 'PUT', data: { resolucion } }); },
    logout() { return this.request({ path: '/logout', method: 'POST' }); },
};

function unwrap(response) { return response?.data ?? response; }
function normalizeIncident(item) {
    return {
        id: item.id,
        title: item.title ?? item.titulo ?? 'Sin título',
        description: item.description ?? item.descripcion ?? '',
        status: String(item.status ?? item.estado ?? 'abierta').toLowerCase().replaceAll(' ', '_'),
        category: item.categoria ?? item.category ?? { nombre: item.categoria_nombre ?? 'Sin categoría' },
        creator: item.cliente ?? item.user ?? item.usuario ?? item.creador,
        creatorId: item.usuario_id ?? item.cliente_id ?? item.cliente?.id ?? item.user?.id,
        technician: item.tecnico ?? item.technician,
        resolution: item.resolucion ?? item.resolution,
        createdAt: item.created_at ?? item.fecha_creacion,
        completedAt: item.fecha_finalizacion ?? item.completed_at,
    };
}
function displayName(person) { return person?.name ?? person?.nombre ?? 'Sin asignar'; }
function categoryName(category) { return typeof category === 'string' ? category : category?.name ?? category?.nombre ?? 'Sin categoría'; }
function userType() {
    const role = state.user?.tipo ?? state.user?.role;
    return role === 'cliente' || role === 'tecnico' ? role : null;
}
function roleHome(role = userType()) { return role === 'tecnico' ? 'tecnico.html' : role === 'cliente' ? 'cliente.html' : 'login.html'; }
function requireRole() {
    const requiredRole = document.body.dataset.requiredRole;
    if (requiredRole && userType() !== requiredRole) { window.location.replace(roleHome()); return false; }
    return true;
}
function statusLabel(status) { return ({ abierta: 'Abierta', abierto: 'Abierta', en_proceso: 'En proceso', en_curso: 'En proceso', resuelta: 'Resuelta', finalizado: 'Finalizada' })[status] ?? 'Estado desconocido'; }
function statusClass(status) { return ({ abierta: 'status-abierta', abierto: 'status-abierta', en_proceso: 'status-en-proceso', en_curso: 'status-en-proceso', resuelta: 'status-resuelta', finalizado: 'status-resuelta' })[status] ?? 'status-unknown'; }
function formatDate(date) { return date ? new Date(date).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin fecha'; }
function showAlert(message, type = 'danger', target = '#global-alert') { $(target).removeClass('d-none alert-danger alert-success alert-warning').addClass(`alert-${type}`).text(message); }
function hideAlert(target = '#global-alert') { $(target).addClass('d-none'); }
function setLoading(button, loading) { button.find('.button-label').toggleClass('d-none', loading); button.find('.spinner-border').toggleClass('d-none', !loading); button.prop('disabled', loading); }

function navigate(view, id = null) {
    $('.sub-view, #incidents-view').addClass('d-none');
    if (view === 'incidents') { $('#incidents-view').removeClass('d-none'); loadIncidents(); }
    if (view === 'new') { $('#new-incident-view').removeClass('d-none'); }
    if (view === 'detail') { $('#detail-view').removeClass('d-none'); loadDetail(id); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCategories() {
    const options = state.categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(categoryName(category))}</option>`).join('');
    $('#category-filter, #incident-category').append(options);
}
function renderIncidents() {
    const rows = state.incidents.map((incident) => `<tr>
        <td class="incident-id">#${incident.id}</td>
        <td><div class="incident-title">${escapeHtml(incident.title)}</div><div class="incident-id">${formatDate(incident.createdAt)}</div></td>
        <td>${escapeHtml(categoryName(incident.category))}</td>
        <td><span class="status-badge ${statusClass(incident.status)}">${escapeHtml(statusLabel(incident.status))}</span></td>
        <td>${escapeHtml(displayName(incident.technician))}</td>
        <td class="text-end"><button class="btn btn-sm btn-light view-detail" data-id="${escapeHtml(incident.id)}" type="button" aria-label="Ver detalle"><i class="bi bi-arrow-up-right"></i></button></td>
    </tr>`).join('');
    $('#incidents-table-body').html(rows || '<tr><td colspan="6" class="empty-state">No hay incidencias que coincidan con los filtros.</td></tr>');
}
function loadIncidents() {
    const filters = { estado: $('#status-filter').val(), categoria_id: $('#category-filter').val() };
    $('#incidents-table-body').html('<tr><td colspan="6" class="empty-state"><span class="spinner-border spinner-border-sm"></span> Cargando incidencias...</td></tr>');
    api.incidents(filters).done((response) => { state.incidents = (unwrap(response) || []).map(normalizeIncident); renderIncidents(); }).fail(() => showAlert('No se pudieron cargar las incidencias. Verificá que la API esté disponible.'));
}
function loadDetail(id) {
    $('#incident-detail').html('<div class="empty-state"><span class="spinner-border spinner-border-sm"></span> Cargando detalle...</div>');
    $.when(api.incident(id), api.comments(id)).done((incidentResponse, commentsResponse) => {
        const incident = normalizeIncident(unwrap(incidentResponse[0]));
        const comments = (unwrap(commentsResponse[0]) || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const canTake = userType() === 'tecnico' && incident.status === 'abierto';
        const canResolve = userType() === 'tecnico' && incident.status === 'en_curso' && String(incident.technician?.id) === String(state.user.id);
        const messages = [
            { author: incident.creator, authorId: incident.creatorId ?? incident.creator?.id, content: incident.description, createdAt: incident.createdAt, kind: 'description' },
            ...comments.map((comment) => ({ author: comment.autor ?? comment.user ?? comment.usuario, authorId: comment.user_id ?? comment.autor?.id ?? comment.user?.id, content: comment.contenido ?? comment.comment ?? comment.comentario, createdAt: comment.created_at, kind: 'comment' })),
        ];
        if (incident.resolution) {
            messages.push({ author: incident.technician, authorId: incident.technician?.id, content: incident.resolution, createdAt: incident.completedAt, kind: 'resolution' });
        }
        messages.sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0));
        const conversation = renderConversation(messages, state.user?.id);
        $('#incident-detail').html(`<div class="detail-header"><p class="eyebrow">Incidencia #${incident.id}</p><h1>${escapeHtml(incident.title)}</h1><span class="status-badge ${statusClass(incident.status)}">${statusLabel(incident.status)}</span></div>
            <div class="detail-grid"><div class="detail-item"><small>Categoría</small><strong>${escapeHtml(categoryName(incident.category))}</strong></div><div class="detail-item"><small>Creada por</small><strong>${escapeHtml(displayName(incident.creator))}</strong></div><div class="detail-item"><small>Técnico</small><strong>${escapeHtml(displayName(incident.technician))}</strong></div></div>
            <div class="d-flex gap-2 mt-4">${canTake ? '<button id="take-incident" class="btn btn-primary" type="button">Tomar incidencia</button>' : ''}${canResolve ? '<button id="resolve-incident" class="btn btn-primary" type="button">Registrar resolución</button>' : ''}</div>
            <section class="conversation mt-4" aria-label="Conversación de la incidencia"><h2 class="h3">Conversación</h2><div class="conversation-thread">${conversation || '<p class="text-muted">Todavía no hay mensajes.</p>'}</div></section>
            <form id="comment-form" class="mt-4"><label class="form-label" for="comment-text">Agregar comentario</label><div class="input-group"><input id="comment-text" class="form-control" required maxlength="1000" placeholder="Escribí una actualización"><button class="btn btn-primary" type="submit">Enviar</button></div></form>`);
        $('#comment-form').on('submit', function (event) { event.preventDefault(); api.addComment(id, $('#comment-text').val()).done(() => loadDetail(id)).fail(() => showAlert('No se pudo agregar el comentario.')); });
        $('#take-incident').on('click', () => api.take(id).done(() => loadDetail(id)).fail(() => showAlert('No se pudo tomar la incidencia.')));
        $('#resolve-incident').on('click', () => { const resolution = window.prompt('Escribí la resolución de la incidencia:'); if (resolution?.trim()) api.resolve(id, resolution.trim()).done(() => loadDetail(id)).fail(() => showAlert('No se pudo registrar la resolución.')); });
    }).fail(() => showAlert('No se pudo cargar el detalle de la incidencia.'));
}
function escapeHtml(value) { return $('<div>').text(value ?? '').html(); }
function logout(callApi = true) { if (callApi) api.logout().always(() => logout(false)); localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); state.user = null; if (document.body.dataset.requiredRole) window.location.replace('login.html'); else $('#login-view').removeClass('d-none'); }
function openApp(user) { state.user = user; localStorage.setItem(USER_KEY, JSON.stringify(user)); if (!document.body.dataset.requiredRole) { window.location.replace(roleHome()); return; } if (!requireRole()) return; $('#current-user-name').text(displayName(user)); $('#current-user-role').text(userType()); api.categories().done((response) => { state.categories = unwrap(response) || []; renderCategories(); }).always(() => { if ($('#incidents-view').length) loadIncidents(); }); }

$('#login-form').on('submit', function (event) { event.preventDefault(); hideAlert('#login-alert'); const button = $(this).find('button[type="submit"]'); setLoading(button, true); api.login($('#login-email').val(), $('#login-password').val()).done((response) => { const data = unwrap(response); if (data.token) localStorage.setItem(TOKEN_KEY, data.token); openApp(data.user ?? data); }).fail((xhr) => showAlert(xhr.responseJSON?.message ?? 'No se pudo iniciar sesión.', 'danger', '#login-alert')).always(() => setLoading(button, false)); });
$('#logout-button').on('click', () => logout());
$('#new-incident-button').on('click', () => navigate('new'));
$('[data-view]').on('click', function () { navigate($(this).data('view')); });
$('#status-filter, #category-filter').on('change', loadIncidents);
$('#clear-filters').on('click', () => { $('#status-filter, #category-filter').val(''); loadIncidents(); });
$(document).on('click', '.view-detail', function () { navigate('detail', $(this).data('id')); });
$('#incident-form').on('submit', function (event) { event.preventDefault(); if (userType() !== 'cliente') return; const button = $(this).find('button[type="submit"]'); setLoading(button, true); api.createIncident({ titulo: $('#incident-title').val(), descripcion: $('#incident-description').val(), categoria_id: $('#incident-category').val() }).done(() => window.location.replace('cliente.html')).fail((xhr) => showAlert(xhr.responseJSON?.message ?? 'No se pudo registrar la incidencia.')).always(() => setLoading(button, false)); });

const storedToken = localStorage.getItem(TOKEN_KEY);
if (storedToken) api.user().done((response) => openApp(unwrap(response))).fail(() => logout(false));
else if (document.body.dataset.requiredRole) window.location.replace('login.html');
