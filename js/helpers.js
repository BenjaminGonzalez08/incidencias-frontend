window.App = window.App || {};

App.config = {
    apiBaseUrl: 'http://localhost:8000/api',
    tokenKey: 'incidencias_token',
    userKey: 'incidencias_user',
};

App.state = { user: null, categories: [], incidents: [] };

App.helpers = {
    unwrap: (response) => response?.data ?? response,
    toList(response, key) {
        const payload = App.helpers.unwrap(response);
        return Array.isArray(payload) ? payload : payload?.[key] ?? [];
    },
    toItem(response, key) {
        const payload = App.helpers.unwrap(response);
        return payload?.[key] ?? payload;
    },
    normalizeStatus(value) {
        const key = String(value ?? 'abierta').toLowerCase().replaceAll(' ', '_');
        const aliases = {
            abierto: 'abierta',
            en_curso: 'en_proceso',
            finalizado: 'resuelta',
        };
        return aliases[key] ?? key;
    },
    statusInfo(status) {
        const statuses = {
            abierta: { label: 'Abierta', css: 'status-abierta' },
            en_proceso: { label: 'En proceso', css: 'status-en-proceso' },
            resuelta: { label: 'Resuelta', css: 'status-resuelta' },
        };
        return statuses[status] ?? {
            label: 'Estado desconocido',
            css: 'status-unknown',
        };
    },
    normalizeIncident(item) {
        const creator = item.cliente ?? item.user ?? item.usuario ?? item.creador;
        return {
            id: item.id,
            title: item.title ?? item.titulo ?? 'Sin título',
            description: item.description ?? item.descripcion ?? '',
            status: App.helpers.normalizeStatus(item.status ?? item.estado),
            category: item.categoria ?? item.category ?? {
                nombre: item.categoria_nombre ?? 'Sin categoría',
            },
            creator,
            creatorId: item.usuario_id ?? item.cliente_id ?? creator?.id,
            technician: item.tecnico ?? item.technician,
            resolution: item.resolucion ?? item.resolution,
            createdAt: item.created_at ?? item.fecha_creacion,
            completedAt: item.fecha_finalizacion ?? item.completed_at,
        };
    },
    displayName: (person) => person?.name ?? person?.nombre ?? 'Sin asignar',
    categoryName(category) {
        return typeof category === 'string'
            ? category
            : category?.name ?? category?.nombre ?? 'Sin categoría';
    },
    formatDate(date) {
        return date
            ? new Date(date).toLocaleString('es-AR', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
              })
            : 'Sin fecha';
    },
    escapeHtml: (value) => $('<div>').text(value ?? '').html(),
    userType(user = App.state.user) {
        const role = user?.tipo ?? user?.role;
        return role === 'cliente' || role === 'tecnico' ? role : null;
    },
    roleHome(role = App.helpers.userType()) {
        return ({ tecnico: 'tecnico.html', cliente: 'cliente.html' })[role] ?? 'login.html';
    },
    detailUrl: (id) => `detalle-incidencia.html?incidencia=${encodeURIComponent(id)}`,
    incidentIdFromUrl: () => new URLSearchParams(window.location.search).get('incidencia'),
    showAlert(message, type = 'danger', target = '#global-alert') {
        $(target)
            .removeClass('d-none alert-danger alert-success alert-warning')
            .addClass(`alert-${type}`)
            .text(message);
    },
    hideAlert: (target = '#global-alert') => $(target).addClass('d-none'),
    setLoading(button, loading) {
        button.find('.button-label').toggleClass('d-none', loading);
        button.find('.spinner-border').toggleClass('d-none', !loading);
        button.prop('disabled', loading);
    },
    loadingRow: (text, cols = 6) =>
        `<tr><td colspan="${cols}" class="empty-state"><span class="spinner-border spinner-border-sm"></span> ${text}</td></tr>`,
};