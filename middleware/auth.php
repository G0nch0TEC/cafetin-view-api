<?php
require_once __DIR__ . '/../auth/AuthController.php';
require_once __DIR__ . '/../helpers/response.php';

/**
 * Middleware de autenticación por sesión QR
 * Valida el header Authorization contra las sesiones activas
 */
function require_auth(): void{
    $header = getallheaders();
    $sesion = $header['Authorization'] ?? '';

    if (!$sesion) {
        json_response(['error' => 'No autorizado'], 401);
        exit;
    }

    $tokens = AuthController::leer();

    foreach ($tokens as $tokens => $data){
        if (!isset($data['sesion'])) {
            continue;
        }

        // Coincidencia de sesión
        if ($data['sesion'] === $sesion) {

            // Verificar expiración de sesión
            if (($data['sesion_expires'] ?? 0) > time()) {
                return; // ✅ autorizado
            }

            break;
        }
    }

    json_response(['error' => 'Sesión inválida o expirada'], 401);
    exit;
}