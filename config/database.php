<?php
function getDB(): ?PDO {
    $path = __DIR__ . '/../data/cafetin_db';
    if (!file_exists($path)) return null;

    $pdo = new PDO('sqlite:' . $path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // FIX: dar hasta 3 segundos de espera si la BD está siendo
    // reemplazada por un upload en ese momento (locked).
    $pdo->exec('PRAGMA busy_timeout = 3000');

    // Modo WAL para lecturas concurrentes más seguras
    $pdo->exec('PRAGMA journal_mode = WAL');

    return $pdo;
}
