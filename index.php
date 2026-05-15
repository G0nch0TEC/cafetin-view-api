<?php
// ── Redirección raíz → login ──────────────────────────
$rawUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$rawUri = rtrim($rawUri, '/');
if ($rawUri === '' || $rawUri === '/') {
    header('Location: /Public/login.html', true, 302);
    exit;
}

// ── Bypass archivos estáticos ─────────────────────────
// FrankenPHP enruta todo por index.php — dejar pasar
// imágenes, CSS, JS, fuentes y favicon sin autenticación
$ext = strtolower(pathinfo($rawUri, PATHINFO_EXTENSION));
$staticExts = ['css','js','png','jpg','jpeg','gif','svg','ico','woff','woff2','ttf','webp','map'];
if (in_array($ext, $staticExts, true)) {
    $file = __DIR__ . $rawUri;
    if (is_file($file)) {
        $mime = [
            'css'  => 'text/css',
            'js'   => 'application/javascript',
            'png'  => 'image/png',
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif'  => 'image/gif',
            'svg'  => 'image/svg+xml',
            'ico'  => 'image/x-icon',
            'woff' => 'font/woff',
            'woff2'=> 'font/woff2',
            'ttf'  => 'font/ttf',
            'webp' => 'image/webp',
            'map'  => 'application/json',
        ];
        header('Content-Type: ' . ($mime[$ext] ?? 'application/octet-stream'));
        readfile($file);
        exit;
    }
}


// ── Favicon — responder vacío para evitar 401 ───────────
if ($rawUri === '/favicon.ico') {
    header('Content-Type: image/x-icon');
    http_response_code(204);
    exit;
}

// ── Bypass páginas HTML públicas ──────────────────────
if ($ext === 'html') {
    $file = __DIR__ . $rawUri;
    if (is_file($file)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($file);
        exit;
    }
}

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/helpers/response.php';

// Leer la ruta desde el parámetro ?_route=  (estrategia sin mod_rewrite)
// Ejemplo: /cafetin-view-api/index.php?_route=upload
$uri = '';

if (isset($_GET['_route'])) {
    $uri = '/' . ltrim($_GET['_route'], '/');
} else {
    $raw = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $uri = preg_replace('#^/cafetin-view-api#', '', $raw);
    $uri = rtrim($uri, '/');
    $uri = preg_replace('#^/index\\.php#', '', $uri);
    if ($uri === '') $uri = '/';
}

$method = $_SERVER['REQUEST_METHOD'];

// ── Auth ──────────────────────────────────────────────

// GET /auth/generar
if ($method === 'GET' && $uri === '/auth/generar') {
    require_once __DIR__ . '/auth/AuthController.php';
    AuthController::generar();
    exit;
}

// POST /auth/confirmar  (llamado por la app Android)
if ($method === 'POST' && $uri === '/auth/confirmar') {
    require_once __DIR__ . '/auth/AuthController.php';
    AuthController::confirmar();
    exit;
}

// GET /auth/verificar  (polling desde la web)
if ($method === 'GET' && $uri === '/auth/verificar') {
    require_once __DIR__ . '/auth/AuthController.php';
    AuthController::verificar();
    exit;
}

// ── POST /upload — protegido por X-Api-Key ───────────
// La app Android usa este endpoint para sincronizar el SQLite.
// No usa sesión web sino una clave de API fija.
if ($method === 'POST' && $uri === '/upload') {
    $headers   = getallheaders();
    $apiKey    = $headers['X-Api-Key'] ?? $headers['x-api-key'] ?? '';
    $esperada  = getenv('UPLOAD_API_KEY') ?: '';

    if (!$esperada || $apiKey !== $esperada) {
        json_response(['error' => 'No autorizado'], 401);
        exit;
    }

    require_once __DIR__ . '/upload/UploadController.php';
    UploadController::recibir();
    exit;
}

// ── Rutas protegidas por sesión web ───────────────────
require_once __DIR__ . '/middleware/auth.php';
require_auth();

require_once __DIR__ . '/config/database.php';

// GET /personas
if ($method === 'GET' && $uri === '/personas') {
    require_once __DIR__ . '/controller/PersonasController.php';
    PersonasController::listar(getDB());
    exit;
}

// GET /movimientos
if ($method === 'GET' && $uri === '/movimientos') {
    require_once __DIR__ . '/controller/MovimientosController.php';
    MovimientosController::listar(getDB());
    exit;
}

// GET /catalogo
if ($method === 'GET' && $uri === '/catalogo') {
    require_once __DIR__ . '/controller/CatalogoController.php';
    CatalogoController::listar(getDB());
    exit;
}

json_response([
    'error'        => 'Endpoint no encontrado',
    'uri_recibida' => $uri,
    'method'       => $method
], 404);