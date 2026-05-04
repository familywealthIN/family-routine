# Curl Executor Plugin

This plugin allows you to execute curl commands directly in the browser using the Fetch API.

## Installation

The plugin is automatically installed in `main.js` :

```javascript
import './plugins/curl-executor';
```

## Usage

The plugin adds `$curl` to the Vue prototype, making it available in all components.

### Basic Usage

```javascript
// In any Vue component
async executeCurlCommand() {
    try {
        const result = await this.$curl.execute('curl https://api.example.com/data');
        console.log('Response:', result);
    } catch (error) {
        console.error('Error:', error.message);
    }
}
```

### Supported Curl Options

* `-X` or `--request`: HTTP method (GET, POST, PUT, DELETE, etc.)
* `-H` or `--header`: HTTP headers
* `-d` or `--data`: Request body data
* `--data-raw`: Raw request body data
* `--data-binary`: Binary request body data
* `-u` or `--user`: Basic authentication (username:password)
* `-A` or `--user-agent`: User agent string

### Examples

```javascript
// GET request
await this.$curl.execute('curl https://api.example.com/users');

// POST request with JSON data
await this.$curl.execute(`curl -X POST https://api.example.com/users -H "Content-Type: application/json" -d '{"name":"John","email":"john@example.com"}'`);

// Request with authentication
await this.$curl.execute('curl -u username:password https://api.example.com/protected');

// Request with custom headers
await this.$curl.execute('curl -H "Authorization: Bearer token123" -H "Accept: application/json" https://api.example.com/data');
```

### Response Format

The plugin returns a standardized response object:

```javascript
{
    ok: boolean, // True if status code is 200-299
    status: number, // HTTP status code (200, 404, etc.)
    statusText: string, // Status text ("OK", "Not Found", etc.)
    headers: object, // Response headers as key-value pairs
    data: any // Response body (parsed as JSON if possible, otherwise as text)
}
```

### Helper Methods

#### buildCurlCommand(options)

Build a curl command from options object:

```javascript
const curlCommand = this.$curl.buildCurlCommand({
    url: 'https://api.example.com/users',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123'
    },
    body: '{"name":"John"}'
});
// Returns: curl "https://api.example.com/users" -X POST -H "Content-Type: application/json" -H "Authorization: Bearer token123" -d '{"name":"John"}'
```

## CORS Considerations

Since this plugin executes requests directly from the browser, it's subject to CORS (Cross-Origin Resource Sharing) restrictions. The target API must:

1. Include appropriate CORS headers
2. Allow the origin of your application
3. Allow the HTTP methods and headers you're using

For development, you might need to:
* Use a CORS proxy
* Configure your development server to proxy API requests
* Use browser extensions that disable CORS (for testing only)

## Security Note

This plugin executes HTTP requests from the browser, which means:
* Authentication tokens are visible in the browser
* Requests are subject to browser security policies
* Use HTTPS for sensitive data
* Be cautious with authentication credentials in curl commands
