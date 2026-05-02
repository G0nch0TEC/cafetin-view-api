<?php
require_once __DIR__ . '/../helpers/response.php';

class MovimientosController {
    public static function listar(?PDO $db): void {
        if (!$db) {
            json_response(['error' => 'Base de datos no disponible. La app aún no ha sincronizado.'], 503);
        }

        // Acepta ?personaId=5 para filtrar por persona (opcional)
        $personaId = $_GET['personaId'] ?? null;

        if ($personaId) {
            $stmt = $db->prepare("
                SELECT m.id, m.personaId, p.nombre AS persona,
                       m.tipo, m.monto, m.fecha, m.nota
                FROM movimientos m
                JOIN personas p ON p.id = m.personaId
                WHERE m.personaId = :personaId
                ORDER BY m.fecha DESC
            ");
            $stmt->execute([':personaId' => (int)$personaId]);
        } else {
            $stmt = $db->query("
                SELECT m.id, m.personaId, p.nombre AS persona,
                       m.tipo, m.monto, m.fecha, m.nota
                FROM movimientos m
                JOIN personas p ON p.id = m.personaId
                ORDER BY m.fecha DESC
            ");
        }

        json_response($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}