<?php
function getDB(): ?PDO {
    // Obtener deviceId de la sesión activa
    $deviceId = _getDeviceIdDeSesion();
    if (!$deviceId) return null;

    // Sanitizar — solo alfanumérico
    $deviceId = preg_replace('/[^a-zA-Z0-9]/', '', $deviceId);
    if (!$deviceId) return null;

    $path = __DIR__ . '/../data/cafetin_db_' . $deviceId;
    if (!file_exists($path)) return null;

    $pdo = new PDO('sqlite:' . $path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA busy_timeout = 3000');
    $pdo->exec('PRAGMA journal_mode = WAL');

    return $pdo;
}

function _getDeviceIdDeSesion(): ?string {
    $headers = getallheaders();
    $sesion  = $headers['Authorization'] ?? '';
    if (!$sesion) return null;

    require_once __DIR__ . '/../auth/AuthController.php';
    $tokens = AuthController::leer();

    foreach ($tokens as $data) {
        if (isset($data['sesion']) && $data['sesion'] === $sesion) {
            return $data['device_id'] ?? null;
        }
    }
    return null;
}