window.App = window.App || {};
App.pages = App.pages || {};

App.pages.detail = {
    threadHtml(incident, commentItems) {
        const messages = [
            {
                author: incident.creator,
                authorId: incident.creatorId,
                content: incident.description,
                createdAt: incident.createdAt,
                kind: 'description',
            },
            ...commentItems.map((comment) => ({
                author: comment.autor ?? comment.user ?? comment.usuario,
                authorId: comment.user_id ?? comment.autor?.id ?? comment.user?.id,
                content: comment.contenido ?? comment.comment ?? comment.comentario,
                createdAt: comment.created_at,
                kind: 'comment',
            })),
        ];

        if (incident.resolution) {
            messages.push({
                author: incident.technician,
                authorId: incident.technician?.id,
                content: incident.resolution,
                createdAt: incident.completedAt,
                kind: 'resolution',
            });
        }

        messages.sort(
            (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        );

        return (
            App.components.renderConversation(messages, App.state.user?.id) ||
            '<p class="text-muted">Todavía no hay mensajes.</p>'
        );
    },
    render(incidentItem, commentItems) {
        const incident = App.helpers.normalizeIncident(incidentItem);
        const status = App.helpers.statusInfo(incident.status);
        const canTake =
            App.helpers.userType() === 'tecnico' &&
            incident.status === 'abierta' &&
            !incident.technician;
        const canResolve =
            App.helpers.userType() === 'tecnico' &&
            incident.status === 'en_proceso' &&
            String(incident.technician?.id) === String(App.state.user?.id) &&
            !incident.resolution;

        $('#incident-detail').html(`
            <div class="detail-header">
                <p class="eyebrow">Incidencia #${App.helpers.escapeHtml(incident.id)}</p>
                <h1>${App.helpers.escapeHtml(incident.title)}</h1>
                <span class="status-badge ${status.css}">${App.helpers.escapeHtml(status.label)}</span>
                ${
                    canTake
                        ? '<button id="take-incident" type="button" class="btn btn-primary btn-sm ms-2">Tomar incidencia</button>'
                        : ''
                }
            </div>
            <div class="detail-grid">
                <div class="detail-item"><small>Categoría</small><strong>${App.helpers.escapeHtml(App.helpers.categoryName(incident.category))}</strong></div>
                <div class="detail-item"><small>Creada por</small><strong>${App.helpers.escapeHtml(App.helpers.displayName(incident.creator))}</strong></div>
                <div class="detail-item"><small>Técnico</small><strong>${App.helpers.escapeHtml(App.helpers.displayName(incident.technician))}</strong></div>
            </div>
            ${
                canResolve
                    ? `<form id="resolution-form" class="mt-4">
                        <label class="form-label" for="resolution-text">Registrar resolución</label>
                        <textarea id="resolution-text" class="form-control" required rows="3" placeholder="Describí cómo se resolvió la incidencia"></textarea>
                        <button class="btn btn-success mt-2" type="submit">Resolver incidencia</button>
                    </form>`
                    : ''
            }
            <section class="conversation mt-4" aria-label="Conversación de la incidencia">
                <h2 class="h3">Conversación</h2>
                <div class="conversation-thread">${this.threadHtml(incident, commentItems)}</div>
            </section>
            <form id="comment-form" class="mt-4">
                <label class="form-label" for="comment-text">Agregar comentario</label>
                <div class="input-group">
                    <input id="comment-text" class="form-control" required maxlength="1000" placeholder="Escribí una actualización">
                    <button class="btn btn-primary" type="submit">Enviar</button>
                </div>
            </form>
        `);

        $('#comment-form').on('submit', (event) => {
            event.preventDefault();
            const content = $('#comment-text').val().trim();
            if (!content) return;

            const button = $('#comment-form')
                .find('button[type="submit"]')
                .prop('disabled', true);
            App.api.addComment(incident.id, content)
                .done(() => {
                    $('#comment-text').val('');
                    App.api.comments(incident.id)
                        .done((response) => {
                            const thread = $('.conversation-thread');
                            const scrollTop = thread.scrollTop();
                            thread
                                .html(
                                    this.threadHtml(
                                        incident,
                                        App.helpers.toList(response, 'comentarios')
                                    )
                                )
                                .scrollTop(scrollTop);
                        })
                        .fail(() =>
                            App.helpers.showAlert(
                                'El comentario se guardó, pero no se pudo actualizar la conversación.',
                                'warning'
                            )
                        );
                })
                .fail(() =>
                    App.helpers.showAlert('No se pudo agregar el comentario.')
                )
                .always(() => button.prop('disabled', false));
        });

        $('#take-incident').on('click', (event) => {
            const button = $(event.currentTarget).prop('disabled', true);
            App.api.takeIncident(incident.id)
                .done((response) => {
                    const updated = App.helpers.toItem(response, 'incidencia');
                    if (updated?.id) {
                        App.helpers.showAlert(
                            'Tomaste la incidencia. Ahora está en curso.',
                            'success'
                        );
                        this.render(updated, commentItems);
                    } else {
                        this.load(incident.id);
                    }
                })
                .fail((xhr) => {
                    App.helpers.showAlert(
                        xhr.responseJSON?.message ?? 'No se pudo tomar la incidencia.'
                    );
                    button.prop('disabled', false);
                });
        });

        $('#resolution-form').on('submit', (event) => {
            event.preventDefault();
            const resolucion = $('#resolution-text').val().trim();
            if (!resolucion) return;

            const button = $('#resolution-form')
                .find('button[type="submit"]')
                .prop('disabled', true);
            App.api.resolveIncident(incident.id, resolucion)
                .done(() => {
                    App.helpers.showAlert(
                        'Resolución registrada. La incidencia fue finalizada.',
                        'success'
                    );
                    this.load(incident.id);
                })
                .fail((xhr) => {
                    App.helpers.showAlert(
                        xhr.responseJSON?.message ?? 'No se pudo registrar la resolución.'
                    );
                    button.prop('disabled', false);
                });
        });
    },
    load(id) {
        $('#incident-detail').html(
            '<div class="empty-state"><span class="spinner-border spinner-border-sm"></span> Cargando incidencia...</div>'
        );
        $.when(App.api.incident(id), App.api.comments(id))
            .done((incidentResponse, commentsResponse) => {
                this.render(
                    App.helpers.toItem(incidentResponse[0], 'incidencia'),
                    App.helpers.toList(commentsResponse[0], 'comentarios')
                );
            })
            .fail((xhr) => {
                App.helpers.showAlert(
                    xhr.status === 404
                        ? 'La incidencia solicitada no existe o no está disponible para este usuario.'
                        : 'No se pudo cargar el detalle de la incidencia. Verificá que la API esté disponible.'
                );
            });
    },
    initialize(user) {
        const role = App.session.set(user);
        $('#back-to-incidents').attr('href', App.helpers.roleHome(role));

        const id = App.helpers.incidentIdFromUrl();
        if (!id) {
            return App.helpers.showAlert(
                'Falta el identificador de la incidencia en la dirección.'
            );
        }

        this.load(id);
    },
};