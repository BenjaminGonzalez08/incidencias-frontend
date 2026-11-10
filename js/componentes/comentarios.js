window.App = window.App || {};
App.components = App.components || {};

App.components.renderConversation = function (messages, currentUserId) {
    return messages.map((message) => {
        const own = String(message.authorId ?? '') === String(currentUserId ?? '');
        const initial = message.kind === 'description';
        const resolution = message.kind === 'resolution';
        const heading = resolution
            ? 'Resolución del técnico'
            : App.helpers.displayName(message.author);
        const messageType = initial
            ? '<span class="initial-marker">Reporte inicial</span>'
            : resolution
                ? '<span class="resolution-marker"><i class="bi bi-check2-circle"></i> Resolución</span>'
                : '';
        const classes = [
            own ? 'conversation-bubble-own' : 'conversation-bubble-other',
            initial ? 'conversation-bubble-initial' : '',
            resolution ? 'conversation-bubble-resolution' : '',
        ].filter(Boolean).join(' ');

        return `<article class="conversation-row ${own ? 'conversation-row-own' : 'conversation-row-other'}"><div class="conversation-bubble ${classes}"><div class="conversation-meta"><strong>${App.helpers.escapeHtml(heading)}</strong>${messageType}</div><p>${App.helpers.escapeHtml(message.content)}</p><time>${App.helpers.escapeHtml(App.helpers.formatDate(message.createdAt))}</time></div></article>`;
    }).join('');
};
