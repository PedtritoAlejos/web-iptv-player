<?php
/**
 * TV-Altoke High-Performance Smart Proxy
 * Supports: PHP 8+, CORS, Range Requests, and strict iOS compatibility.
 */

// Start buffering at the absolute beginning to capture and discard any accidental warnings/whitespace
ob_start();

error_reporting(0);
ini_set('display_errors', 0);

// 1. CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Range, Content-Type, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    exit(0);
}

// 2. Cache Configuration
$cacheDir = __DIR__ . '/cache';
$cacheTime = 86400; // 24 hours
$bypassCache = isset($_GET['bypass_cache']) && $_GET['bypass_cache'] === 'true';

if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}

// 2. Validate Target URL
$url = isset($_GET['url']) ? $_GET['url'] : null;

if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    ob_end_clean();
    exit("URL inválida");
}

// 3. Security: Whitelist allowed domains
$allowedDomains = [
    'chtvpro.com', 'novatv.us', 'restreamlatam.online', 
    'tmdb.org', 'themoviedb.org', 'imgur.com', 'postimg.cc'
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
    ob_end_clean();
    exit("Acceso denegado: Dominio no permitido en el proxy.");
}

// 4. Cache Check (Only for API metadata)
$isApiCall = strpos($url, 'player_api.php') !== false;
$cacheFile = $cacheDir . '/' . md5($url) . '.json';

if ($isApiCall && !$bypassCache && file_exists($cacheFile)) {
    if ((time() - filemtime($cacheFile)) < $cacheTime) {
        ob_end_clean(); // Discard any buffer up to here
        header('Content-Type: application/json');
        header('X-Proxy-Cache: HIT');
        readfile($cacheFile);
        exit;
    }
}

// 5. Setup cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, false); // Steam directly or capture in OB
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1");

if (isset($_SERVER['HTTP_RANGE'])) {
    curl_setopt($ch, CURLOPT_RANGE, str_replace('bytes=', '', $_SERVER['HTTP_RANGE']));
}

// 6. iOS Compatibility: Special Header Handling
curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($ch, $header) use ($url) {
    $len = strlen($header);
    $header_lower = strtolower($header);
    
    // Explicitly handle Video MIME types for Safari
    if (strpos($header_lower, 'content-type') === 0) {
        if (strpos($url, '.m3u8') !== false) {
            header("Content-Type: application/vnd.apple.mpegurl");
        } else if (strpos($url, '.mp4') !== false) {
            header("Content-Type: video/mp4");
        } else {
            header($header);
        }
        return $len;
    }

    // Forward range and seeking headers
    $allowed = ['content-length', 'accept-ranges', 'content-range', 'content-disposition', 'cache-control'];
    foreach ($allowed as $a) {
        if (strpos($header_lower, $a) === 0) {
            header($header);
            break;
        }
    }
    return $len;
});

// 7. Core Execution
if ($isApiCall) {
    // For API: Start a fresh buffer to capture ONLY the JSON
    ob_start();
    curl_exec($ch);
    $response = ob_get_clean();
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    // Discard any accidental output from the primary buffer
    ob_end_clean();
    
    header('Content-Type: application/json');
    if ($httpCode === 200 && !empty($response)) {
        file_put_contents($cacheFile, $response);
        header('X-Proxy-Cache: MISS');
    }
    echo $response;
} else {
    // For Video: Discard primary buffer and stream directly
    ob_end_clean();
    curl_exec($ch);
}

curl_close($ch);
?>
