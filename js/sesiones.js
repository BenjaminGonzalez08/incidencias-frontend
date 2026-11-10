window.App = window.App || {};

App.session = {
    set(user) {
        App.state.user = user;
        localStorage.setItem(App.config.userKey, JSON.stringify(user));
        $('#current-user-name').text(App.helpers.displayName(user));
        $('#current-user-role').text(App.helpers.userType(user));
        return App.helpers.userType(user);
    },
    logout(callApi = true) {
        const clearSession = () => {
            localStorage.removeItem(App.config.tokenKey);
            localStorage.removeItem(App.config.userKey);
            App.state.user = null;
            if (!$('#login-form').length) window.location.replace('login.html');
        };

        if (callApi && localStorage.getItem(App.config.tokenKey)) {
            App.api.logout().always(clearSession);
        } else {
            clearSession();
        }
    },
};