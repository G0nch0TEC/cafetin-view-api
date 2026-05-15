<?php
function getDB(): ?PDO {
    $path = __DIR__ . '/../data/cafetin_db';
    if (!file_exists($path)) return null;

    $pdo = new PDO('sqlite:' . $path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA busy_timeout = 3000');
    $pdo->exec('PRAGMA journal_mode = WAL');

    return $pdo;
}