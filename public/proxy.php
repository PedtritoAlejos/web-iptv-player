<?php
/**
 * TV-Altoke High-Performance Smart Proxy
 * Supports: CORS bypass, Range Requests (for seeking), and Custom User-Agent.
 */

// 1. CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Range, Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// 2. Cache Configuration
$cacheDir = __DIR__ . '/cache';
$cacheTime = 86400; // 24 hours
$bypassCache = isset($_GET['bypass_cache']) && $_GET['bypass_cache'] === 'true';

if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// 2. Validate Target URL
$url = isset($_GET['url']) ? $_GET['url'] : null;

if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    exit("URL inválida");
}

// 3. Security: Whitelist allowed domains (IPTV Providers + Common Image Hosts)
$allowedDomains = [
    'chtvpro.com', 
    'novatv.us', 
    'restreamlatam.online', 
    'tmdb.org', 
    'themoviedb.org', 
    'imgur.com'
];
$parsedUrl = parse_url($url);
$host = isset($parsedUrl['host']) ? $parsedUrl['host'] : '';

$isAllowed = false;
foreach ($allowedDomains as $domain) {
    if (strpos($host, $domain) !== false) {
        $isAllowed = true;
        break;
    }
}

if (!$isAllowed) {
    http_response_code(403);
    exit("Acceso denegado: Dominio no permitido en el proxy.");
}

// 4. Cache Check (Only for API metadata, not video streams)
$isApiCall = strpos($url, 'player_api.php') !== false;
$cacheFile = $cacheDir . '/' . md5($url) . '.json';

if ($isApiCall && !$bypassCache && file_exists($cacheFile)) {
    if ((time() - filemtime($cacheFile)) < $cacheTime) {
        header('Content-Type: application/json');
        header('X-Proxy-Cache: HIT');
        readfile($cacheFile);
        exit;
    }
}

// 4. Setup Request
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, false); // Stream directly to output
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");

// 4. Handle Range Header (Crucial for seeking and Safari)
if (isset($_SERVER['HTTP_RANGE'])) {
    curl_setopt($ch, CURLOPT_RANGE, str_replace('bytes=', '', $_SERVER['HTTP_RANGE']));
}

// 5. Forward Response Headers
curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($ch, $header) {
    $len = strlen($header);
    $header_lower = strtolower($header);
    
    // List of headers to forward
    $allowed = ['content-type', 'content-length', 'accept-ranges', 'content-range', 'content-disposition'];
    
    foreach ($allowed as $a) {
        if (strpos($header_lower, $a) === 0) {
            header($header);
            break;
        }
    }
    return $len;
});

// 6. Execute and Handle Caching
if ($isApiCall) {
    ob_start();
}

curl_exec($ch);

if ($isApiCall) {
    $response = ob_get_clean();
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    // Only cache successful JSON responses
    if ($httpCode === 200 && !empty($response)) {
        file_put_contents($cacheFile, $response);
    }
    
    header('Content-Type: application/json');
    header('X-Proxy-Cache: MISS');
    echo $response;
}

curl_close($ch);
