window.App = window.App || {};
App.pages = App.pages || {};

App.pages.creation = {
    initialize(user) {
        const role = App.session.set(user);
        if (role !== 'cliente') {
            return window.location.replace(App.helpers.roleHome(role));
        }

        App.pages.listing.loadCategories(() =>
            App.helpers.showAlert(
                'No se pudieron cargar las categorías. Verificá que la API esté disponible.'
            )
        );
    },
    bindForm() {
        $('#incident-form').on('submit', function (event) {
            event.preventDefault();
            if (App.helpers.userType() !== 'cliente') return;

            const button = $(this).find('button[type="submit"]');
            App.helpers.setLoading(button, true);

            App.api.createIncident({
                titulo: $('#incident-title').val(),
                descripcion: $('#incident-description').val(),
                categoria_id: $('#incident-category').val(),
            })
                .done((response) => {
                    const incident = App.helpers.toItem(response, 'incidencia');
                    if (!incident?.id) {
                        return App.helpers.showAlert(
                            'La API creó la incidencia, pero no devolvió su identificador.'
                        );
                    }

                    this.reset();
                    window.location.assign(App.helpers.detailUrl(incident.id));
                })
                .fail((xhr) =>
                    App.helpers.showAlert(
                        xhr.responseJSON?.message ?? 'No se pudo registrar la incidencia.'
                    )
                )
                .always(() => App.helpers.setLoading(button, false));
        });
    },
}