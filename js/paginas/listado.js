window.App = window.App || {};
App.pages = App.pages || {};

App.pages.listing = {
    loadCategories(onError) {
        App.api.categories()
            .done((response) => {
                App.state.categories = App.helpers.toList(response, 'categorias');
                this.renderCategories();
            })
            .fail(onError);
    },
    renderCategories() {
        const options = App.state.categories
            .map(
                (category) =>
                    `<option value="${App.helpers.escapeHtml(category.id)}">${App.helpers.escapeHtml(App.helpers.categoryName(category))}</option>`
            )
            .join('');

        $('#category-filter, #incident-category')
            .find('option:not(:first)')
            .remove()
            .end()
            .append(options);
    },
    renderIncidents() {
        const rows = App.state.incidents
            .map((incident) => {
                const status = App.helpers.statusInfo(incident.status);
                const url = App.helpers.detailUrl(incident.id);

                return `<tr>
                    <td class="incident-id">#${App.helpers.escapeHtml(incident.id)}</td>
                    <td>
                        <a class="incident-title incident-title-link" href="${url}">${App.helpers.escapeHtml(incident.title)}</a>
                        <div class="incident-id">${App.helpers.formatDate(incident.createdAt)}</div>
                    </td>
                    <td>${App.helpers.escapeHtml(App.helpers.categoryName(incident.category))}</td>
                    <td><span class="status-badge ${status.css}">${App.helpers.escapeHtml(status.label)}</span></td>
                    <td>${App.helpers.escapeHtml(App.helpers.displayName(incident.technician))}</td>
                    <td class="text-end">
                        <a class="btn btn-sm btn-light" href="${url}" aria-label="Abrir incidencia ${App.helpers.escapeHtml(incident.id)}">
                            <i class="bi bi-bullseye"></i>
                        </a>
                    </td>
                </tr>`;
            })
            .join('');

        $('#incidents-table-body').html(
            rows ||
                '<tr><td colspan="6" class="empty-state">No hay incidencias que coincidan con los filtros.</td></tr>'
        );
    },
    loadIncidents() {
        const filters = {
            estado: $('#status-filter').val(),
            categoria_id: $('#category-filter').val(),
        };

        $('#incidents-table-body').html(
            App.helpers.loadingRow('Cargando incidencias...')
        );
        App.api.incidents(filters)
            .done((response) => {
                App.state.incidents = App.helpers
                    .toList(response, 'incidencias')
                    .map(App.helpers.normalizeIncident);
                this.renderIncidents();
            })
            .fail(() =>
                App.helpers.showAlert(
                    'No se pudieron cargar las incidencias. Verificá que la API esté disponible.'
                )
            );
    },
    initialize(user) {
        const role = App.session.set(user);
        if (!role) return App.session.logout(false);

        if (
            document.body.dataset.requiredRole &&
            document.body.dataset.requiredRole !== role
        ) {
            return window.location.replace(App.helpers.roleHome(role));
        }

        const isTech = role === 'tecnico';
        $('#panel-eyebrow').text(isTech ? 'Mesa de soporte' : 'Panel del cliente');
        $('#panel-title').text(isTech ? 'Incidencias asignables' : 'Mis incidencias');
        $('#panel-description').text(
            isTech
                ? 'Revisá y seguí los problemas reportados.'
                : 'Registrá problemas y seguí cada avance.'
        );
        $('#new-incident-button').toggleClass('d-none', role !== 'cliente');

        this.loadCategories(() =>
            App.helpers.showAlert(
                'No se pudieron cargar las categorías. Verificá que la API esté disponible.'
            )
        );
        this.loadIncidents();
    },
};