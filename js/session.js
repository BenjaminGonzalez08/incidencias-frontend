const TOKEN_KEY = 'incidencias_token';
const USER_KEY = 'incidencias_user';

const Session = {
    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    },

    saveToken(token) {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
            return;
        }

        localStorage.removeItem(TOKEN_KEY);
    },

    getUser() {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            localStorage.removeItem(USER_KEY);
            return null;
        }
    },

    saveUser(user) {
        if (user) {
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            return;
        }

        localStorage.removeItem(USER_KEY);
    },

    clear() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },

    userType(user = this.getUser()) {
        const role = user?.tipo ?? user?.role;
        return role === 'cliente' || role === 'tecnico' ? role : null;
    },

    roleHome(user = this.getUser()) {
        const role = this.userType(user);
        return role === 'tecnico' ? 'tecnico.html' : role === 'cliente' ? 'cliente.html' : 'login.html';
    },

    requireRole(requiredRole) {
        const role = this.userType();
        if (requiredRole && role !== requiredRole) {
            window.location.replace(this.roleHome());
            return false;
        }

        return true;
    },
};

window.Session = Session;
