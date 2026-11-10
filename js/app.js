window.App = window.App || {};
App.pages = App.pages || {};

if ($('#login-form').length) {
    $('#login-form').on('submit', function (event) {
        event.preventDefault();
        App.helpers.hideAlert('#login-alert');

        const button = $(this).find('button[type="submit"]');
        App.helpers.setLoading(button, true);

        App.api.login($('#login-email').val(), $('#login-password').val())
            .done((response) => {
                const payload = App.helpers.unwrap(response);
                const user = payload?.user ?? payload;
                const role = App.helpers.userType(user);

                if (!role) {
                    App.helpers.showAlert(
                        'La API no devolvió un tipo de usuario reconocido.',
                        'danger',
                        '#login-alert'
                    );
                    return;
                }

                if (payload?.token) {
                    localStorage.setItem(App.config.tokenKey, payload.token);
                }

                localStorage.setItem(App.config.userKey, JSON.stringify(user));
                window.location.replace(App.helpers.roleHome(role));
            })
            .fail((xhr) =>
                App.helpers.showAlert(
                    xhr.responseJSON?.message ?? 'No se pudo iniciar sesión.',
                    'danger',
                    '#login-alert'
                )
            )
            .always(() => App.helpers.setLoading(button, false));
    });

    if (localStorage.getItem(App.config.tokenKey)) {
        App.api.user()
            .done((response) => {
                const user = App.helpers.unwrap(response);
                const role = App.helpers.userType(user);
                if (!role) return App.session.logout(false);

                localStorage.setItem(App.config.userKey, JSON.stringify(user));
                window.location.replace(App.helpers.roleHome(role));
            })
            .fail(() => App.session.logout(false));
    }
}

$(document).on(
    'click',
    '#logout-button, #detail-logout-button',
    () => App.session.logout()
);

$('#status-filter, #category-filter').on('change', () =>
    App.pages.listing.loadIncidents()
);

$('#clear-filters').on('click', () => {
    $('#status-filter, #category-filter').val('');
    App.pages.listing.loadIncidents();
});

if ($('#incidents-table-body').length) {
    window.addEventListener('pageshow', (event) => {
        if (event.persisted && localStorage.getItem(App.config.tokenKey)) {
            App.pages.listing.loadIncidents();
        }
    });
}

if ($('#incident-form').length) {
    App.pages.creation.bindForm();
}

const pageInitializer = $('#incidents-table-body').length
    ? (user) => App.pages.listing.initialize(user)
    : $('#incident-detail').length
      ? (user) => App.pages.detail.initialize(user)
      : $('#incident-form').length
        ? (user) => App.pages.creation.initialize(user)
        : null;

if (pageInitializer) {
    if (!localStorage.getItem(App.config.tokenKey)) {
        window.location.replace('login.html');
    } else {
        App.api.user()
            .done((response) => pageInitializer(App.helpers.unwrap(response)))
            .fail(() => App.session.logout(false));
    }
}
