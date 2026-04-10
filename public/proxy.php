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

// 2. Validate Target URL
$url = isset($_GET['url']) ? $_GET['url'] : null;

if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    exit("URL inválida");
}

// 3. Security: Whitelist allowed domains (Your IPTV Provider)
$allowedDomains = ['chtvpro.com', 'novatv.us', 'restreamlatam.online'];
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

// 6. Execute and Pipe Stream
curl_exec($ch);
curl_close($ch);
