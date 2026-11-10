const API_BASE_URL = 'http://localhost:8000/api';
const TOKEN_KEY = 'incidencias_token';
const USER_KEY = 'incidencias_user';

const state = {
    user: null,
    categories: [],
    incidents: [],
    detailIncident: null,
    commentSignature: '',
    commentsRequestPending: false,
    commentsRefreshQueued: false,
    forceScrollOnCommentsRefresh: false,
};

const COMMENT_POLL_INTERVAL_MS = 3000;
let commentPollTimer = null;

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
function userType(user = state.user) {
    const role = user?.tipo ?? user?.role;
    return role === 'cliente' || role === 'tecnico' ? role : null;
}
function roleHome(role = userType()) { return role === 'tecnico' ? 'tecnico.html' : role === 'cliente' ? 'cliente.html' : 'login.html'; }
function statusLabel(status) { return ({ abierta: 'Abierta', abierto: 'Abierta', en_proceso: 'En proceso', en_curso: 'En proceso', resuelta: 'Resuelta', finalizado: 'Resuelta' })[status] ?? 'Estado desconocido'; }
function statusClass(status) { return ({ abierta: 'status-abierta', abierto: 'status-abierta', en_proceso: 'status-en-proceso', en_curso: 'status-en-proceso', resuelta: 'status-resuelta', finalizado: 'status-resuelta' })[status] ?? 'status-unknown'; }
function formatDate(date) { return date ? new Date(date).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin fecha'; }
function showAlert(message, type = 'danger', target = '#global-alert') { $(target).removeClass('d-none alert-danger alert-success alert-warning').addClass(`alert-${type}`).text(message); }
function hideAlert(target = '#global-alert') { $(target).addClass('d-none'); }
function setLoading(button, loading) { button.find('.button-label').toggleClass('d-none', loading); button.find('.spinner-border').toggleClass('d-none', !loading); button.prop('disabled', loading); }
function getIncidentIdFromUrl() { return new URLSearchParams(window.location.search).get('incidencia'); }
function detailUrl(id) { return `detalle-incidencia.html?incidencia=${encodeURIComponent(id)}`; }
function renderCategories() {
    const options = state.categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(categoryName(category))}</option>`).join('');
    $('#category-filter, #incident-category').find('option:not(:first)').remove();
    $('#category-filter, #incident-category').append(options);
}
function renderIncidents() {
    const rows = state.incidents.map((incident) => `<tr>
        <td class="incident-id">#${escapeHtml(incident.id)}</td>
        <td><a class="incident-title incident-title-link" href="${detailUrl(incident.id)}">${escapeHtml(incident.title)}</a><div class="incident-id">${formatDate(incident.createdAt)}</div></td>
        <td>${escapeHtml(categoryName(incident.category))}</td>
        <td><span class="status-badge ${statusClass(incident.status)}">${escapeHtml(statusLabel(incident.status))}</span></td>
        <td>${escapeHtml(displayName(incident.technician))}</td>
        <td class="text-end"><a class="btn btn-sm btn-light" href="${detailUrl(incident.id)}" aria-label="Abrir incidencia ${escapeHtml(incident.id)}"><i class="bi bi-bullseye"></i></a></td>
    </tr>`).join('');
    $('#incidents-table-body').html(rows || '<tr><td colspan="6" class="empty-state">No hay incidencias que coincidan con los filtros.</td></tr>');
}
function loadIncidents() {
    const filters = { estado: $('#status-filter').val(), categoria_id: $('#category-filter').val() };
    $('#incidents-table-body').html('<tr><td colspan="6" class="empty-state"><span class="spinner-border spinner-border-sm"></span> Cargando incidencias...</td></tr>');
    api.incidents(filters).done((response) => {
        state.incidents = (unwrap(response) || []).map(normalizeIncident);
        renderIncidents();
    }).fail(() => {
        showAlert('No se pudieron cargar las incidencias. Verificá que la API esté disponible.');
    });
}
function renderConversationMessages(incidentItem, commentsItems) {
    const incident = normalizeIncident(incidentItem);
    const comments = commentsItems.map((comment) => ({
        author: comment.autor ?? comment.user ?? comment.usuario,
        authorId: comment.user_id ?? comment.autor?.id ?? comment.user?.id,
        content: comment.contenido ?? comment.comment ?? comment.comentario,
        createdAt: comment.created_at,
        kind: 'comment',
    }));
    const messages = [
        { author: incident.creator, authorId: incident.creatorId ?? incident.creator?.id, content: incident.description, createdAt: incident.createdAt, kind: 'description' },
        ...comments,
    ];
    if (incident.resolution) {
        messages.push({ author: incident.technician, authorId: incident.technician?.id, content: incident.resolution, createdAt: incident.completedAt, kind: 'resolution' });
    }
    messages.sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0));

    return renderConversation(messages, state.user?.id);
}

function commentsFromResponse(response) {
    const payload = unwrap(response);
    return Array.isArray(payload) ? payload : payload?.comentarios ?? [];
}

function signatureForComments(comments) {
    return JSON.stringify(comments.map((comment) => [
        comment.id,
        comment.user_id,
        comment.contenido ?? comment.comment ?? comment.comentario,
        comment.created_at,
    ]));
}

function updateConversationThread(incidentItem, commentsItems, scrollToLatest = false) {
    const thread = $('.conversation-thread');
    if (!thread.length) return;

    const threadElement = thread[0];
    const wasNearBottom = threadElement.scrollHeight - threadElement.scrollTop - threadElement.clientHeight < 48;
    thread.html(renderConversationMessages(incidentItem, commentsItems));
    if (scrollToLatest || wasNearBottom) threadElement.scrollTop = threadElement.scrollHeight;
}

function refreshComments(id, scrollToLatest = false) {
    if (document.visibilityState === 'hidden') return;
    if (state.commentsRequestPending) {
        state.commentsRefreshQueued = true;
        state.forceScrollOnCommentsRefresh ||= scrollToLatest;
        return;
    }

    state.commentsRequestPending = true;
    api.comments(id).done((response) => {
        const comments = commentsFromResponse(response);
        const signature = signatureForComments(comments);
        if (signature === state.commentSignature) return;

        state.commentSignature = signature;
        updateConversationThread(state.detailIncident, comments, scrollToLatest || state.forceScrollOnCommentsRefresh);
        state.forceScrollOnCommentsRefresh = false;
    }).always(() => {
        state.commentsRequestPending = false;
        if (state.commentsRefreshQueued) {
            const forceScroll = state.forceScrollOnCommentsRefresh;
            state.commentsRefreshQueued = false;
            state.forceScrollOnCommentsRefresh = false;
            refreshComments(id, forceScroll);
        }
    });
}

function startCommentPolling(id) {
    window.clearInterval(commentPollTimer);
    commentPollTimer = window.setInterval(() => refreshComments(id), COMMENT_POLL_INTERVAL_MS);
}

function renderDetail(incidentItem, commentsItems) {
    state.detailIncident = incidentItem;
    state.commentSignature = signatureForComments(commentsItems);
    const incident = normalizeIncident(incidentItem);
    const conversation = renderConversationMessages(incidentItem, commentsItems);

    $('#incident-detail').html(`<div class="detail-header"><p class="eyebrow">Incidencia #${escapeHtml(incident.id)}</p><h1>${escapeHtml(incident.title)}</h1><span class="status-badge ${statusClass(incident.status)}">${escapeHtml(statusLabel(incident.status))}</span></div>
        <section class="incident-facts mt-4" aria-labelledby="incident-facts-title"><h2 id="incident-facts-title" class="h3">Ficha de incidencia</h2><div class="detail-grid"><div class="detail-item"><small>Categoría</small><strong>${escapeHtml(categoryName(incident.category))}</strong></div><div class="detail-item"><small>Creado por</small><strong>${escapeHtml(displayName(incident.creator))}</strong></div><div class="detail-item"><small>Técnico</small><strong>${escapeHtml(displayName(incident.technician))}</strong></div></div></section>
        <section class="conversation mt-4" aria-label="Conversación de la incidencia"><h2 class="h3 conversation-heading">Conversación</h2><div class="conversation-thread">${conversation || '<p class="text-muted">Todavía no hay mensajes.</p>'}</div><form id="comment-form" class="conversation-composer"><label class="form-label" for="comment-text">Agregar comentario</label><div class="input-group"><input id="comment-text" class="form-control" required maxlength="1000" placeholder="Escribí una actualización"><button class="btn btn-primary" type="submit">Enviar</button></div></form></section>`);
    const thread = $('.conversation-thread')[0];
    if (thread) thread.scrollTop = thread.scrollHeight;

    $('#comment-form').on('submit', function (event) {
        event.preventDefault();
        const content = $('#comment-text').val().trim();
        if (!content) return;
        const button = $(this).find('button[type="submit"]');
        button.prop('disabled', true);
        api.addComment(incident.id, content).done(() => {
            $('#comment-text').val('');
            refreshComments(incident.id, true);
        }).fail(() => showAlert('No se pudo agregar el comentario.')).always(() => button.prop('disabled', false));
    });
}

function loadDetail(id) {
    $('#incident-detail').html('<div class="empty-state"><span class="spinner-border spinner-border-sm"></span> Cargando incidencia...</div>');
    $.when(api.incident(id), api.comments(id)).done((incidentResponse, commentsResponse) => {
        const incidentPayload = unwrap(incidentResponse[0]);
        const incidentItem = incidentPayload?.incidencia ?? incidentPayload;
        const comments = commentsFromResponse(commentsResponse[0]);
        renderDetail(incidentItem, comments);
        startCommentPolling(id);
    }).fail((xhr) => {
        if (xhr.status === 404) showAlert('La incidencia solicitada no existe o no está disponible para este usuario.');
        else showAlert('No se pudo cargar el detalle de la incidencia. Verificá que la API esté disponible.');
    });
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && $('#incident-detail').length) {
        refreshComments(getIncidentIdFromUrl());
    }
});

function escapeHtml(value) { return $('<div>').text(value ?? '').html(); }
function logout(callApi = true) {
    const clearSession = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        state.user = null;
        if (!$('#login-form').length) window.location.replace('login.html');
    };
    if (callApi && localStorage.getItem(TOKEN_KEY)) api.logout().always(clearSession);
    else clearSession();
}
function openListing(user) {
    state.user = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if ($('#current-user-name').length) $('#current-user-name').text(displayName(user));
    if ($('#current-user-role').length) $('#current-user-role').text(userType(user));
    const role = userType(user);
    if (!role) {
        logout(false);
        return;
    }
    if (document.body.dataset.requiredRole && document.body.dataset.requiredRole !== role) {
        window.location.replace(roleHome(role));
        return;
    }
    $('#panel-eyebrow').text(role === 'tecnico' ? 'Mesa de soporte' : 'Panel del cliente');
    $('#panel-title').text(role === 'tecnico' ? 'Incidencias asignables' : 'Mis incidencias');
    $('#panel-description').text(role === 'tecnico' ? 'Revisá y seguí los problemas reportados.' : 'Registrá problemas y seguí cada avance.');
    $('#new-incident-button').toggleClass('d-none', role !== 'cliente');
    api.categories().done((response) => { state.categories = unwrap(response) || []; renderCategories(); });
    loadIncidents();
}
function openDetail(user) {
    state.user = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    $('#current-user-name').text(displayName(user));
    $('#current-user-role').text(userType(user));
    const role = userType(user);
    const backLink = $('#back-to-incidents');
    backLink.attr('href', roleHome(role));
    const id = getIncidentIdFromUrl();
    if (!id) {
        showAlert('Falta el identificador de la incidencia en la dirección.');
        return;
    }
    loadDetail(id);
}
function initializeCreationPage(user) {
    state.user = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (userType(user) !== 'cliente') {
        window.location.replace(roleHome(userType(user)));
        return;
    }
    api.categories().done((response) => {
        state.categories = unwrap(response) || [];
        renderCategories();
    }).fail(() => showAlert('No se pudieron cargar las categorías. Verificá que la API esté disponible.'));
}

$('#login-form').on('submit', function (event) {
    event.preventDefault();
    hideAlert('#login-alert');
    const button = $(this).find('button[type="submit"]');
    setLoading(button, true);
    api.login($('#login-email').val(), $('#login-password').val())
        .done((response) => {
            const payload = unwrap(response);
            if (payload?.token) localStorage.setItem(TOKEN_KEY, payload.token);
            const user = payload?.user ?? payload;
            const role = userType(user);
            if (!role) {
                showAlert('La API no devolvió un tipo de usuario reconocido.', 'danger', '#login-alert');
                return;
            }
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            window.location.replace(roleHome(role));
        })
        .fail((xhr) => showAlert(xhr.responseJSON?.message ?? 'No se pudo iniciar sesión.', 'danger', '#login-alert'))
        .always(() => setLoading(button, false));
});

$(document).on('click', '#logout-button', () => logout());
$('#status-filter, #category-filter').on('change', loadIncidents);
$('#clear-filters').on('click', () => { $('#status-filter, #category-filter').val(''); loadIncidents(); });
$('#incident-form').on('submit', function (event) {
    event.preventDefault();
    if (userType() !== 'cliente') return;
    const button = $(this).find('button[type="submit"]');
    setLoading(button, true);
    api.createIncident({ titulo: $('#incident-title').val(), descripcion: $('#incident-description').val(), categoria_id: $('#incident-category').val() })
        .done((response) => {
            const payload = unwrap(response);
            const incident = payload?.incidencia ?? payload;
            if (!incident?.id) {
                showAlert('La API creó la incidencia, pero no devolvió su identificador.');
                return;
            }
            this.reset();
            window.location.assign(detailUrl(incident.id));
        })
        .fail((xhr) => showAlert(xhr.responseJSON?.message ?? 'No se pudo registrar la incidencia.'))
        .always(() => setLoading(button, false));
});

const storedToken = localStorage.getItem(TOKEN_KEY);
if ($('#login-form').length) {
    if (storedToken) api.user().done((response) => {
        const user = unwrap(response);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        window.location.replace(roleHome(userType(user)));
    }).fail(() => logout(false));
} else if ($('#incidents-table-body').length || $('#incident-detail').length || $('#incident-form').length) {
    if (!storedToken) window.location.replace('login.html');
    else api.user().done((response) => {
        const user = unwrap(response);
        if ($('#incidents-table-body').length) openListing(user);
        else if ($('#incident-detail').length) openDetail(user);
        else initializeCreationPage(user);
    }).fail(() => logout(false));
}
