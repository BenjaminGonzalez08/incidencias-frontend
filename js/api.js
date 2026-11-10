window.App = window.App || {};

App.api = {
    request({ path, method = 'GET', data }) {
        const token = localStorage.getItem(App.config.tokenKey);
        return $.ajax({
            url: `${App.config.apiBaseUrl}${path}`,
            method,
            data: data && JSON.stringify(data),
            contentType: 'application/json',
            headers: {
                Accept: 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        }).fail((xhr) => {
            if (xhr.status === 401) App.session.logout(false);
        });
    },
    login: (email, password) =>
        App.api.request({ path: '/login', method: 'POST', data: { email, password } }),
    user: () => App.api.request({ path: '/user' }),
    logout: () => App.api.request({ path: '/logout', method: 'POST' }),
    categories: () => App.api.request({ path: '/categorias' }),
    incidents(filters = {}) {
        const query = $.param(
            Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
        );
        return App.api.request({ path: `/incidencias${query ? `?${query}` : ''}` });
    },
    incident: (id) => App.api.request({ path: `/incidencias/${id}` }),
    createIncident: (data) =>
        App.api.request({ path: '/incidencias', method: 'POST', data }),
    comments: (id) => App.api.request({ path: `/incidencias/${id}/comentarios` }),
    addComment: (id, contenido) =>
        App.api.request({
            path: `/incidencias/${id}/comentarios`,
            method: 'POST',
            data: { contenido },
        }),
    takeIncident: (id) =>
        App.api.request({ path: `/incidencias/${id}/tomar`, method: 'PUT' }),
    resolveIncident: (id, resolucion) =>
        App.api.request({
            path: `/incidencias/${id}/resolver`,
            method: 'PUT',
            data: { resolucion },
        }),
};
