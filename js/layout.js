function renderLayout() {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('incidencias_user') || 'null'); } catch { localStorage.removeItem('incidencias_user'); }
    const savedRole = user?.tipo ?? user?.role;
    const role = document.body.dataset.requiredRole || (savedRole === 'cliente' || savedRole === 'tecnico' ? savedRole : 'usuario');
    const isDetailPage = $('#incident-detail').length > 0;
    const backButton = isDetailPage
        ? '<a id="back-to-incidents" class="btn btn-primary" href="cliente.html"><i class="bi bi-arrow-left me-2"></i>Volver al listado</a>'
        : '';

    $('#site-header').html(`<nav class="navbar app-navbar"><div class="container-fluid app-container ${isDetailPage ? 'detail-nav' : ''}">${backButton}<div class="header-actions"><div class="user-summary"><strong id="current-user-name">${escapeLayoutHtml(user?.name ?? user?.nombre ?? 'Usuario')}</strong><small id="current-user-role">${escapeLayoutHtml(role)}</small></div><button id="logout-button" class="btn btn-outline-secondary" type="button"><i class="bi bi-box-arrow-right me-1"></i>Salir</button></div></div></nav>`);
    $('#site-footer').html('<footer class="site-footer"><div class="container-fluid app-container"><span>Desarrollo de Software · 2026</span></div></footer>');
}
function escapeLayoutHtml(value) { return $('<div>').text(value ?? '').html(); }
$(renderLayout);
