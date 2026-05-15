<?php
require_once __DIR__ . '/../helpers/response.php';

/**
 * Sistema de autenticación QR — un solo usuario (dueño del cafetín).
 *
 * Flujo:
 *  1. Web llama GET /auth/generar → recibe un token temporal
 *  2. Web muestra ese token como QR
 *  3. App escanea el QR → llama POST /auth/confirmar con el token
 *  4. Web hace polling GET /auth/verificar?token=XXX
 *  5. Cuando el servidor responde "confirmado" → web guarda la sesión
 *     en localStorage y redirige al dashboard.
 *
 * Almacenamiento: archivo JSON en data/ (no toca la BD SQLite de la app).
 */
class AuthController {

    private static string $archivoTokens  = __DIR__ . '/../data/auth_tokens.json';
    private const TOKEN_TTL    = 300;       // 5 minutos para escanear
    private const SESION_TTL   = 86400;     // 24 horas de sesión web


    // ── Helpers de almacenamiento ─────────────────────

    public static function leer(): array {
        if (!file_exists(self::$archivoTokens)) return [];
        return json_decode(file_get_contents(self::$archivoTokens), true) ?? [];
    }

    private static function guardar(array $data): void {
        $dir = dirname(self::$archivoTokens);
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        file_put_contents(self::$archivoTokens, json_encode($data, JSON_PRETTY_PRINT));
    }

    private static function limpiarExpirados(array $tokens): array {
        $ahora = time();
        return array_filter($tokens, fn($t) => $t['expires'] > $ahora);
    }


    // ── Endpoints ─────────────────────────────────────

    /**
     * GET /auth/generar
     * Genera un token único y lo guarda como "pendiente".
     * La web usa este token para dibujar el QR.
     */
    public static function generar(): void {
        $tokens = self::limpiarExpirados(self::leer());

        $token = bin2hex(random_bytes(16)); // 32 chars
        $tokens[$token] = [
            'status'  => 'pendiente',
            'expires' => time() + self::TOKEN_TTL,
            'sesion'  => null,
        ];

        self::guardar($tokens);
        json_response([
            'token'      => $token,
            'expires_in' => self::TOKEN_TTL,
        ]);
    }

    /**
     * POST /auth/confirmar
     * La app manda el token escaneado.
     * El servidor lo marca como "confirmado" y genera la clave de sesión.
     */
    public static function confirmar(): void {
        $body  = json_decode(file_get_contents('php://input'), true) ?? [];
        $token = trim($body['token'] ?? '');

        if (!$token) {
            json_response(['error' => 'Token requerido'], 400);
            return;
        }

        $tokens = self::leer();

        if (!isset($tokens[$token])) {
            json_response(['error' => 'Token inválido o expirado'], 404);
            return;
        }

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

        // Generar clave de sesión
        $sesion = bin2hex(random_bytes(24)); // 48 chars
        $tokens[$token]['status']         = 'confirmado';
        $tokens[$token]['sesion']         = $sesion;
        $tokens[$token]['sesion_expires'] = time() + self::SESION_TTL;

        self::guardar($tokens);
        json_response(['ok' => true]);
    }

    /**
     * GET /auth/verificar?token=XXX
     * La web hace polling cada 2 s para saber si la app ya escaneó.
     * Cuando el estado es "confirmado", devuelve la clave de sesión
     * y borra el token (ya fue consumido).
     */
    public static function verificar(): void {
        $token = trim($_GET['token'] ?? '');

        if (!$token) {
            json_response(['error' => 'Token requerido'], 400);
            return;
        }

        $tokens = self::leer();

        if (!isset($tokens[$token])) {
            json_response(['status' => 'invalido']);
            return;
        }

        if ($tokens[$token]['expires'] < time()) {
            unset($tokens[$token]);
            self::guardar($tokens);
            json_response(['status' => 'expirado']);
            return;
        }

        if ($tokens[$token]['status'] === 'confirmado') {
            $sesion        = $tokens[$token]['sesion'];
            $sesionExpires = $tokens[$token]['sesion_expires'];

            // Consumir el token — ya no se necesita
            unset($tokens[$token]);
            self::guardar($tokens);

            json_response([
                'status'          => 'confirmado',
                'sesion'          => $sesion,
                'sesion_expires'  => $sesionExpires,
            ]);
            return;
        }

        json_response(['status' => 'pendiente']);
    }
}
