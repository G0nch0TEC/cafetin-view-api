<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/helpers/response.php';
require_once __DIR__ . '/config/database.php';

$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri    = str_replace('/cafetin-view-api', '', $uri);
$method = $_SERVER['REQUEST_METHOD'];

// POST /upload
if ($method === 'POST' && $uri === '/upload') {
    require_once __DIR__ . '/upload/UploadController.php';
    UploadController::recibir();
    exit;
}

// GET /personas
if ($method === 'GET' && $uri === '/personas') {
    require_once __DIR__ . '/controller/PersonasController.php';
    PersonasController::listar(getDB());
    exit;
}

// GET /movimientos  (también acepta /movimientos?personaId=5)
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
}s

json_response(['error' => 'Endpoint no encontrado'], 404);
