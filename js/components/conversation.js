function renderConversation(messages, currentUserId) {
    return messages.map((message) => {
        const own = String(message.authorId ?? '') === String(currentUserId ?? '');
        const initial = message.kind === 'description';
        const resolution = message.kind === 'resolution';
        const heading = resolution ? 'Resolución del técnico' : displayName(message.author);
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

        return `<article class="conversation-row ${own ? 'conversation-row-own' : 'conversation-row-other'}"><div class="conversation-bubble ${classes}"><div class="conversation-meta"><strong>${escapeHtml(heading)}</strong>${messageType}</div><p>${escapeHtml(message.content)}</p><time>${escapeHtml(formatDate(message.createdAt))}</time></div></article>`;
    }).join('');
}
