<?php
require_once __DIR__ . '/../helpers/response.php';

class UploadController {

    public static function recibir(): void {

        // Leer JSON del body
        $raw = file_get_contents('php://input');
        if (!$raw) {
            json_response(['error' => 'No se recibió ningún dato'], 400);
            return;
        }

        $data = json_decode($raw, true);
        if (!$data) {
            json_response(['error' => 'JSON inválido'], 400);
            return;
        }

        $personas    = $data['personas']    ?? [];
        $movimientos = $data['movimientos'] ?? [];
        $categorias  = $data['categorias']  ?? [];
        $productos   = $data['productos']   ?? [];

        $destino = __DIR__ . '/../data/cafetin_db';

        try {
            $pdo = new PDO('sqlite:' . $destino);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->exec('PRAGMA journal_mode = WAL');
            $pdo->exec('PRAGMA foreign_keys = OFF');

            // Crear tablas si no existen
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS personas (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre       TEXT NOT NULL,
                    descripcion  TEXT NOT NULL DEFAULT '',
                    enviadoHasta INTEGER NOT NULL DEFAULT 0,
                    UNIQUE(nombre, descripcion)
                );
                CREATE TABLE IF NOT EXISTS movimientos (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    personaId  INTEGER NOT NULL,
                    tipo       TEXT NOT NULL,
                    monto      INTEGER NOT NULL,
                    fecha      INTEGER NOT NULL,
                    nota       TEXT NOT NULL DEFAULT '',
                    FOREIGN KEY(personaId) REFERENCES personas(id) ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS catalogo_categorias (
                    id     INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL,
                    emoji  TEXT NOT NULL DEFAULT '📦',
                    orden  INTEGER NOT NULL DEFAULT 0
                );
                CREATE TABLE IF NOT EXISTS catalogo_productos (
                    id             INTEGER PRIMARY KEY AUTOINCREMENT,
                    categoriaId    INTEGER NOT NULL,
                    nombre         TEXT NOT NULL,
                    montoCentavos  INTEGER NOT NULL,
                    orden          INTEGER NOT NULL DEFAULT 0,
                    FOREIGN KEY(categoriaId) REFERENCES catalogo_categorias(id) ON DELETE CASCADE
                );
            ");

            $pdo->beginTransaction();

            // Limpiar y reemplazar datos
            $pdo->exec("DELETE FROM movimientos");
            $pdo->exec("DELETE FROM personas");
            $pdo->exec("DELETE FROM catalogo_productos");
            $pdo->exec("DELETE FROM catalogo_categorias");

            // Insertar personas
            $stmtP = $pdo->prepare("
                INSERT INTO personas (id, nombre, descripcion, enviadoHasta)
                VALUES (:id, :nombre, :descripcion, :enviadoHasta)
            ");
            foreach ($personas as $p) {
                $stmtP->execute([
                    ':id'           => $p['id'],
                    ':nombre'       => $p['nombre'],
                    ':descripcion'  => $p['descripcion'] ?? '',
                    ':enviadoHasta' => $p['enviadoHasta'] ?? 0,
                ]);
            }

            // Insertar movimientos
            $stmtM = $pdo->prepare("
                INSERT INTO movimientos (id, personaId, tipo, monto, fecha, nota)
                VALUES (:id, :personaId, :tipo, :monto, :fecha, :nota)
            ");
            foreach ($movimientos as $m) {
                $stmtM->execute([
                    ':id'        => $m['id'],
                    ':personaId' => $m['personaId'],
                    ':tipo'      => $m['tipo'],
                    ':monto'     => $m['monto'],
                    ':fecha'     => $m['fecha'],
                    ':nota'      => $m['nota'] ?? '',
                ]);
            }

            // Insertar categorías
            $stmtC = $pdo->prepare("
                INSERT INTO catalogo_categorias (id, nombre, emoji, orden)
                VALUES (:id, :nombre, :emoji, :orden)
            ");
            foreach ($categorias as $c) {
                $stmtC->execute([
                    ':id'     => $c['id'],
                    ':nombre' => $c['nombre'],
                    ':emoji'  => $c['emoji'] ?? '📦',
                    ':orden'  => $c['orden'] ?? 0,
                ]);
            }

            // Insertar productos
            $stmtPr = $pdo->prepare("
                INSERT INTO catalogo_productos (id, categoriaId, nombre, montoCentavos, orden)
                VALUES (:id, :categoriaId, :nombre, :montoCentavos, :orden)
            ");
            foreach ($productos as $pr) {
                $stmtPr->execute([
                    ':id'            => $pr['id'],
                    ':categoriaId'   => $pr['categoriaId'],
                    ':nombre'        => $pr['nombre'],
                    ':montoCentavos' => $pr['montoCentavos'],
                    ':orden'         => $pr['orden'] ?? 0,
                ]);
            }

            $pdo->commit();
            $pdo->exec('PRAGMA foreign_keys = ON');

            json_response([
                'mensaje'     => 'Sincronizado correctamente',
                'personas'    => count($personas),
                'movimientos' => count($movimientos),
                'categorias'  => count($categorias),
                'productos'   => count($productos),
            ]);

        } catch (Exception $e) {
            if (isset($pdo) && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            json_response(['error' => 'Error al guardar: ' . $e->getMessage()], 500);
        }
    }
}