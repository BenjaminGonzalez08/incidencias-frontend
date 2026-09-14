# Frontend - Sistema de Gestion de Incidencias

Aplicacion frontend independiente para el Sistema de Gestion de Incidencias Tecnicas. Consume la API REST del backend Laravel mediante AJAX, JSON y jQuery.

## Tecnologias

- HTML5 y CSS3
- Bootstrap 5.3
- JavaScript y jQuery 3.7
- API REST Laravel Sanctum

## Requisitos

- Backend Laravel ejecutandose, por defecto en `http://localhost:8000`.
- Un navegador moderno.
- Para desarrollo local se recomienda un servidor estatico, por ejemplo la extension Live Server de VS Code.

## Ejecucion

1. Ejecutar el backend desde su propio repositorio:

   ```bash
   php artisan serve
   ```

2. Abrir este proyecto con Live Server o servirlo con cualquier servidor HTTP estatico.
3. Si la API usa otra URL, cambiar `API_BASE_URL` al comienzo de `js/app.js`.

El frontend no contiene Blade, modelos ni acceso directo a la base de datos.

## Pantallas

- Login mediante `POST /api/login`.
- Listado de incidencias con filtros por estado y categoria.
- Alta de incidencias.
- Detalle, comentarios, toma y resolucion segun el rol.

## Contrato esperado de la API

El frontend consume los endpoints definidos en la documentacion: login, logout, usuario autenticado, incidencias, toma, resolucion y comentarios. Tambien acepta temporalmente nombres equivalentes en espanol e ingles para facilitar la integracion con el backend actual.
