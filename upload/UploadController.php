<?php
require_once __DIR__ . '/../helpers/response.php';

class UploadController {
    public static function recibir(): void {
        if (empty($_FILES['db'])) {
            json_response(['error' => 'No se recibió ningún archivo'], 400);
        }

        $tmp = $_FILES['db']['tmp_name'];

        // Validar firma SQLite (primeros 16 bytes)
        $handle = fopen($tmp, 'rb');
        $header = fread($handle, 16);
        fclose($handle);

        if (strpos($header, 'SQLite format 3') === false) {
            json_response(['error' => 'El archivo no es una base de datos SQLite válida'], 400);
        }

        $destino = __DIR__ . '/../data/cafetin_db';
        if (!is_dir(dirname($destino))) {
            mkdir(dirname($destino), 0755, true);
        }

        if (move_uploaded_file($tmp, $destino)) {
            json_response(['ok' => true, 'mensaje' => 'Base de datos sincronizada correctamente']);
        } else {
            json_response(['error' => 'No se pudo guardar el archivo'], 500);
        }
    }
}
