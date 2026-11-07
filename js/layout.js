function renderLayout() {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('incidencias_user') || 'null'); } catch { localStorage.removeItem('incidencias_user'); }
    const savedRole = user?.tipo ?? user?.role;
    const role = document.body.dataset.requiredRole || (savedRole === 'cliente' || savedRole === 'tecnico' ? savedRole : 'usuario');
    const home = role === 'tecnico' ? 'tecnico.html' : 'cliente.html';

    $('#site-header').html(`<nav class="navbar app-navbar"><div class="container-fluid app-container"><a class="navbar-brand" href="${home}"><span>mesa<span class="brand-accent">/</span>técnica</span></a><div class="d-flex align-items-center gap-3"><div class="user-summary d-none d-sm-block"><strong>${escapeLayoutHtml(user?.name ?? user?.nombre ?? 'Usuario')}</strong><small>${escapeLayoutHtml(role)}</small></div><button id="logout-button" class="btn btn-outline-secondary btn-sm" type="button"><i class="bi bi-box-arrow-right"></i><span class="d-none d-sm-inline ms-1">Salir</span></button></div></div></nav>`);
    $('#site-footer').html('<footer class="site-footer"><div class="container-fluid app-container"><span>Mesa técnica escolar</span><span>Desarrollo de software · 2026</span></div></footer>');
}
function escapeLayoutHtml(value) { return $('<div>').text(value ?? '').html(); }
$(renderLayout);
