<?php
require_once __DIR__ . '/../helpers/response.php';

class PersonasController {
    public static function listar(?PDO $db): void {
        if (!$db) {
            json_response(['error' => 'Base de datos no disponible. La app aún no ha sincronizado.'], 503);
        }

        $stmt = $db->query("
            SELECT p.id, p.nombre,
                COALESCE(SUM(CASE WHEN m.tipo = 'FIADO' THEN m.monto ELSE -m.monto END), 0) AS saldo
            FROM personas p
            LEFT JOIN movimientos m ON m.personaId = p.id
            GROUP BY p.id
            ORDER BY p.nombre ASC
        ");

        json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}
