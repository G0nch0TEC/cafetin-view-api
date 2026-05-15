<?php
require_once __DIR__ . '/../helpers/response.php';

class AuthController {

    private static string $archivoTokens  = '/tmp/auth_tokens.json';
    private const TOKEN_TTL    = 300;
    private const SESION_TTL   = 86400;

    public static function leer(): array {
        if (!file_exists(self::$archivoTokens)) return [];
        return json_decode(file_get_contents(self::$archivoTokens), true) ?? [];
    }

    private static function guardar(array $data): void {
        file_put_contents(self::$archivoTokens, json_encode($data, JSON_PRETTY_PRINT));
    }

    private static function limpiarExpirados(array $tokens): array {
        $ahora = time();
        return array_filter($tokens, fn($t) => $t['expires'] > $ahora);
    }

    public static function generar(): void {
        $tokens = self::limpiarExpirados(self::leer());
        $token = bin2hex(random_bytes(16));
        $tokens[$token] = [
            'status'  => 'pendiente',
            'expires' => time() + self::TOKEN_TTL,
            'sesion'  => null,
        ];
        self::guardar($tokens);
        json_response(['token' => $token, 'expires_in' => self::TOKEN_TTL]);
    }

    public static function confirmar(): void {
        $body  = json_decode(file_get_contents('php://input'), true) ?? [];
        $token = trim($body['token'] ?? '');

        if (!$token) { json_response(['error' => 'Token requerido'], 400); return; }

        $tokens = self::leer();

        if (!isset($tokens[$token])) { json_response(['error' => 'Token inválido o expirado'], 404); return; }

        if ($tokens[$token]['expires'] < time()) {
            unset($tokens[$token]);
            self::guardar($tokens);
            json_response(['error' => 'Token expirado. Recarga la página web.'], 410);
            return;
        }

        if ($tokens[$token]['status'] === 'confirmado') {
            json_response(['ok' => true, 'mensaje' => 'Ya confirmado']);
            return;
        }

        $sesion = bin2hex(random_bytes(24));
        $tokens[$token]['status']         = 'confirmado';
        $tokens[$token]['sesion']         = $sesion;
        $tokens[$token]['sesion_expires'] = time() + self::SESION_TTL;

        self::guardar($tokens);
        json_response(['ok' => true]);
    }

    public static function verificar(): void {
        $token = trim($_GET['token'] ?? '');

        if (!$token) { json_response(['error' => 'Token requerido'], 400); return; }

        $tokens = self::leer();

        if (!isset($tokens[$token])) { json_response(['status' => 'invalido']); return; }

        if ($tokens[$token]['expires'] < time()) {
            unset($tokens[$token]);
            self::guardar($tokens);
            json_response(['status' => 'expirado']);
            return;
        }

        if ($tokens[$token]['status'] === 'confirmado') {
            $sesion        = $tokens[$token]['sesion'];
            $sesionExpires = $tokens[$token]['sesion_expires'];

            // Marcar consumido pero NO borrar — dar 10s de gracia
            $tokens[$token]['consumido_at'] = time();
            self::guardar($tokens);

            json_response([
                'status'         => 'confirmado',
                'sesion'         => $sesion,
                'sesion_expires' => $sesionExpires,
            ]);
            return;
        }

        // Ya consumido — ventana de gracia de 10s
        if (isset($tokens[$token]['consumido_at'])) {
            if ((time() - $tokens[$token]['consumido_at']) < 10) {
                json_response([
                    'status'         => 'confirmado',
                    'sesion'         => $tokens[$token]['sesion'],
                    'sesion_expires' => $tokens[$token]['sesion_expires'],
                ]);
            } else {
                unset($tokens[$token]);
                self::guardar($tokens);
                json_response(['status' => 'invalido']);
            }
            return;
        }

        json_response(['status' => 'pendiente']);
    }
}