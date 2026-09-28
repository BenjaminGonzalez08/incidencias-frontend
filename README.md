# Frontend - Sistema de Gestion de Incidencias

Aplicacion frontend independiente para la mesa tecnica de la ESET-UNQ. La interfaz esta inspirada en una mesa de ayuda tipo GLPI y consume la API REST del backend mediante AJAX, JSON y jQuery.

## Tecnologias

- HTML5 y CSS3
- Bootstrap 5.3
- JavaScript y jQuery 3.7
- API REST Laravel Sanctum

## Requisitos

- Backend Laravel ejecutandose en `http://127.0.0.1:8000`.
- Un navegador moderno.
- PHP, Node.js o cualquier servidor HTTP estatico.

## Instalacion y ejecucion local

Clonar la rama de trabajo:

```bash
git clone -b main-2 https://github.com/BenjaminGonzalez08/incidencias-frontend.git
cd incidencias-frontend
```

El backend debe estar iniciado por separado. Luego servir este directorio:

```bash
php -S localhost:5500 -t .
```

Abrir `http://localhost:5500/login.html` en el navegador.

La URL de la API se configura en `js/app.js`:

```javascript
const API_BASE_URL = 'http://localhost:8000/api';
```

Si el backend usa otro dominio o puerto, actualizar ese valor y agregar el origen del frontend a `CORS_ALLOWED_ORIGINS` en el `.env` del backend.

## Usuarios de prueba

```text
Cliente: cliente@test.com / 123
Tecnico: tecnico@test.com / 123
```

## Funcionalidades

- Inicio y cierre de sesion con token Sanctum.
- Listado de incidencias segun el rol autenticado.
- Filtros por estado y categoria.
- Creacion de incidencias.
- Detalle con creador, tecnico, categoria, estado y resolucion.
- Comentarios cronologicos.
- El tecnico puede tomar incidencias y registrar resoluciones.

## Flujo de trabajo

```text
Cliente crea incidencia -> estado abierto
Tecnico la toma -> estado en_curso
Tecnico asignado la resuelve -> estado finalizado
```

El frontend no contiene Blade, modelos ni acceso directo a la base de datos. Toda la informacion se obtiene de la API del backend.

## Despliegue

El frontend puede publicarse en cualquier servidor estatico, como Apache, Nginx, GitHub Pages o un hosting estatico. Publicar `login.html`, `cliente.html`, `tecnico.html`, `crear-incidencia.html`, `css/` y `js/` en el directorio publico y configurar `API_BASE_URL` para apuntar al backend publicado. `login.html` es la entrada de la aplicacion.

El backend debe permitir el dominio final del frontend mediante `CORS_ALLOWED_ORIGINS`. Si el frontend y el backend se publican con HTTPS, ambos deben utilizar HTTPS.
