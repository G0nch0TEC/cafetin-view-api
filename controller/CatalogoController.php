<?php
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class CatalogoController {
    public static function listar(?PDO $db): void {

        require_auth();
        
        if (!$db) {
            json_response(['error' => 'Base de datos no disponible. La app aún no ha sincronizado.'], 503);
            return;
        }

        // Trae categorías con sus productos anidados
        $categorias = $db->query("
            SELECT id, nombre, emoji, orden
            FROM catalogo_categorias
            ORDER BY orden ASC
        ")->fetchAll(PDO::FETCH_ASSOC);

        $productos = $db->query("
            SELECT id, categoriaId, nombre, montoCentavos, orden
            FROM catalogo_productos
            ORDER BY orden ASC
        ")->fetchAll(PDO::FETCH_ASSOC);

        // Agrupa productos dentro de su categoría
        $productosPorCategoria = [];
        foreach ($productos as $p) {
            $productosPorCategoria[$p['categoriaId']][] = $p;
        }

        foreach ($categorias as &$cat) {
            $cat['productos'] = $productosPorCategoria[$cat['id']] ?? [];
        }

        json_response($categorias);
    }
}