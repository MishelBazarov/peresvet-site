<?php
// Обработчик заявок с сайта «Пересвет» для хостинга Timeweb (PHP 8.1+).
// 1) проверяет данные, 2) сохраняет заявку на сервере в России (152-ФЗ),
// 3) отправляет полную заявку на почту, 4) по желанию шлёт в Telegram сигнал без личных данных.
// Настройки лежат в config.php рядом (в репозиторий не попадает). Образец: config.example.php.
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function respond(int $code, array $data): never
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'method']);
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    respond(500, ['ok' => false, 'error' => 'config']);
}
$config = require $configFile;

// Ловушка для ботов: люди это поле не видят
if (!empty($_POST['website'])) {
    respond(200, ['ok' => true]);
}

$field = static function (string $key, int $max): string {
    $value = (string)($_POST[$key] ?? '');
    $value = strip_tags($value);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $value) ?? '';
    return trim(mb_substr($value, 0, $max));
};

$name = $field('name', 80);
$phoneRaw = $field('phone', 40);
$digits = preg_replace('/\D+/', '', $phoneRaw) ?? '';
$age = $field('age', 20);
$hall = $field('hall', 40);
$comment = $field('comment', 1000);
$consent = ($_POST['consent'] ?? '') === 'on';

if (mb_strlen($name) < 2) respond(422, ['ok' => false, 'error' => 'name']);
if (strlen($digits) !== 11) respond(422, ['ok' => false, 'error' => 'phone']);
if (!$consent) respond(422, ['ok' => false, 'error' => 'consent']);

$storage = rtrim((string)$config['storage_dir'], '/');
if (!is_dir($storage) && !mkdir($storage, 0700, true) && !is_dir($storage)) {
    respond(500, ['ok' => false, 'error' => 'storage']);
}

// Не больше 5 заявок с одного адреса в час
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
$ipKey = hash('sha256', $ip . '|' . ($config['salt'] ?? 'peresvet'));
$rlFile = $storage . '/ratelimit.json';
$now = time();
$fh = fopen($rlFile, 'c+');
if ($fh && flock($fh, LOCK_EX)) {
    $rl = json_decode((string)stream_get_contents($fh), true) ?: [];
    foreach ($rl as $k => $times) {
        $rl[$k] = array_values(array_filter((array)$times, static fn($t) => $now - (int)$t < 3600));
        if (!$rl[$k]) unset($rl[$k]);
    }
    if (count($rl[$ipKey] ?? []) >= 5) {
        flock($fh, LOCK_UN);
        fclose($fh);
        respond(429, ['ok' => false, 'error' => 'rate']);
    }
    $rl[$ipKey][] = $now;
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($rl));
    flock($fh, LOCK_UN);
    fclose($fh);
}

// Защита от формул при открытии CSV в Excel
$cell = static fn(string $v): string => preg_match('/^[=+\-@]/', $v) ? "'" . $v : $v;

$id = date('ymd-His') . '-' . bin2hex(random_bytes(2));
$ages = ['5-7' => 'Ребёнок 5–7 лет', '8-11' => 'Ребёнок 8–11 лет', '12-15' => 'Подросток 12–15 лет', '16+' => 'Старше 16 / взрослый'];
$halls = (array)($config['halls'] ?? []);
$ageText = $ages[$age] ?? $age;
$hallText = $halls[$hall] ?? $hall;
$page = mb_substr((string)($_SERVER['HTTP_REFERER'] ?? ''), 0, 300);

$csv = $storage . '/leads.csv';
$isNew = !is_file($csv);
$out = fopen($csv, 'a');
if (!$out || !flock($out, LOCK_EX)) {
    respond(500, ['ok' => false, 'error' => 'save']);
}
if ($isNew) {
    fwrite($out, "\xEF\xBB\xBF"); // BOM, чтобы Excel открыл кириллицу
    fputcsv($out, ['Номер', 'Дата', 'Имя', 'Телефон', 'Кто занимается', 'Зал', 'Комментарий', 'Страница', 'IP', 'Версия согласия'], ';');
}
fputcsv($out, [
    $id, date('Y-m-d H:i:s'), $cell($name), '+' . $digits, $ageText, $hallText, $cell($comment), $page, $ip,
    (string)($config['consent_version'] ?? ''),
], ';');
flock($out, LOCK_UN);
fclose($out);

// Письмо с полной заявкой
$to = (string)($config['mail_to'] ?? '');
if ($to !== '') {
    $body = "Новая заявка с сайта «Пересвет»\n\n"
        . "Номер: $id\n"
        . "Имя: $name\n"
        . 'Телефон: +' . $digits . "\n"
        . "Кто занимается: $ageText\n"
        . "Зал: $hallText\n"
        . ($comment !== '' ? "Комментарий: $comment\n" : '')
        . "\nОтправлено со страницы: $page\n";
    $subject = '=?UTF-8?B?' . base64_encode("Заявка на тренировку: $name") . '?=';
    $headers = implode("\r\n", [
        'From: ' . (string)$config['mail_from'],
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'MIME-Version: 1.0',
    ]);
    @mail($to, $subject, $body, $headers);
}

// Сигнал в Telegram — без имени и телефона
$token = (string)($config['telegram_token'] ?? '');
$chat = (string)($config['telegram_chat_id'] ?? '');
if ($token !== '' && $chat !== '') {
    $ctx = stream_context_create(['http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/x-www-form-urlencoded',
        'content' => http_build_query(['chat_id' => $chat, 'text' => "Новая заявка с сайта № $id. Подробности на почте."]),
        'timeout' => 4,
    ]]);
    @file_get_contents('https://api.telegram.org/bot' . $token . '/sendMessage', false, $ctx);
}

respond(200, ['ok' => true, 'id' => $id]);
