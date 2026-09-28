function renderLayout() {
    const user = JSON.parse(localStorage.getItem('incidencias_user') || 'null');
    const role = document.body.dataset.requiredRole || user?.tipo || user?.role || 'cliente';
    const home = role === 'tecnico' ? 'tecnico.html' : 'cliente.html';
    const createLink = role === 'cliente' ? '<a class="btn btn-primary" href="crear-incidencia.html"><i class="bi bi-plus-lg me-1"></i>Nueva incidencia</a>' : '';

    $('#site-header').html(`<nav class="navbar app-navbar"><div class="container-fluid app-container"><a class="navbar-brand" href="${home}"><i class="bi bi-life-preserver"></i><span>mesa<span class="brand-accent">/</span>técnica</span></a><div class="d-flex align-items-center gap-3"><div class="user-summary d-none d-sm-block"><strong>${escapeLayoutHtml(user?.name ?? user?.nombre ?? 'Usuario')}</strong><small>${role}</small></div><button id="logout-button" class="btn btn-outline-secondary btn-sm" type="button"><i class="bi bi-box-arrow-right"></i><span class="d-none d-sm-inline ms-1">Salir</span></button></div></div></nav>`);
    $('#site-footer').html('<footer class="site-footer"><div class="container-fluid app-container"><span>Mesa técnica escolar</span><span>Desarrollo de software · 2026</span></div></footer>');
    $('#new-incident-button').replaceWith(createLink);
    $('#logout-button').on('click', () => logout());
}
function escapeLayoutHtml(value) { return $('<div>').text(value ?? '').html(); }
$(renderLayout);
