<?php
function getDB(): ?PDO {
    $path = __DIR__ . '/../data/cafetin_db';
    if (!file_exists($path)) return null;

    $pdo = new PDO('sqlite:' . $path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    return $pdo;
}
