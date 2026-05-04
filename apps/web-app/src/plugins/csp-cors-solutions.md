# CSP and CORS Solutions Guide

## Overview

This document provides solutions for Content Security Policy (CSP) and Cross-Origin Resource Sharing (CORS) issues when making external API calls from the browser.

## Content Security Policy (CSP)

### What is CSP?

Content Security Policy is a security standard that helps prevent cross-site scripting (XSS) attacks by controlling which resources the browser is allowed to load for a given page.

### CSP Configuration

The CSP is configured in `public/index.html` with the following directives:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  frame-src 'self' https://accounts.google.com;
  connect-src 'self' https://accounts.google.com https://www.googleapis.com https:;
">
```

### Key Changes for External API Calls

* **connect-src**: Added `https:` to allow connections to any HTTPS endpoint
* This enables the curl executor to make requests to external APIs

### CSP Directives Explained

* `default-src 'self'`: Only allow resources from the same origin by default
* `script-src`: Allow scripts from self, inline scripts, eval, and specific Google domains
* `style-src`: Allow styles from self, inline styles, and Google Fonts
* `font-src`: Allow fonts from self and Google Fonts
* `img-src`: Allow images from self, data URLs, any HTTPS source, and blob URLs
* `frame-src`: Allow frames from self and Google accounts
* `connect-src`: Allow network requests to self, Google APIs, and any HTTPS endpoint

## Cross-Origin Resource Sharing (CORS)

### What is CORS?

CORS is a mechanism that allows restricted resources on a web page to be requested from another domain outside the domain from which the first resource was served.

### CORS Issues and Solutions

#### Common CORS Errors

1. **No 'Access-Control-Allow-Origin' header**
   - The target server doesn't include CORS headers
   - Solution: Contact the API provider or use a proxy server

2. **Method not allowed**
   - The target server doesn't allow the HTTP method being used
   - Solution: Check API documentation for allowed methods

3. **Headers not allowed**
   - The target server doesn't allow specific headers
   - Solution: Remove non-essential headers or check API documentation

#### Browser Limitations

* Browsers enforce the same-origin policy for security
* Some APIs may not support CORS for browser-based requests
* In such cases, consider:
  + Using a backend proxy
  + Server-side API calls
  + JSONP (for GET requests only)

## Error Handling in Curl Executor

The curl executor includes enhanced error handling for CSP and CORS issues:

```javascript
// Enhanced error handling for CSP and CORS issues
if (error.name === 'TypeError' && error.message.includes('fetch')) {
    if (error.message.includes('CORS')) {
        // Provide helpful CORS error message
    }
    if (error.message.includes('CSP') || error.message.includes('Content Security Policy')) {
        // Provide helpful CSP error message
    }
    // Provide general network error message
}
```

## Best Practices

### CSP Best Practices

1. **Principle of Least Privilege**: Only allow what's necessary
2. **Use Specific Domains**: Avoid wildcards when possible
3. **Regular Audits**: Review and update CSP regularly
4. **Test Thoroughly**: Ensure all functionality works with CSP enabled

### CORS Best Practices

1. **Check API Documentation**: Understand CORS support before implementation
2. **Use Proper Headers**: Include necessary headers for API authentication
3. **Handle Errors Gracefully**: Provide meaningful error messages to users
4. **Consider Alternatives**: Use backend proxies for APIs without CORS support

## Troubleshooting

### CSP Violations

1. Check browser console for CSP violation reports
2. Identify the blocked resource
3. Update CSP to allow the resource
4. Test to ensure the fix works

### CORS Errors

1. Check browser network tab for failed requests
2. Examine response headers for CORS information
3. Verify API supports CORS
4. Consider using a backend proxy if CORS is not supported

## Implementation Notes

### Curl Executor Plugin

* Located at `src/plugins/curl-executor.js`
* Provides browser-based curl command execution
* Includes enhanced error handling for CSP and CORS issues
* Supports common curl options like headers, methods, and data

### Usage Example

```javascript
// In Vue component
try {
    const response = await this.$curl.execute(`
    curl -X POST https://api.example.com/data \
    -H "Content-Type: application/json" \
    -d '{"key": "value"}'
  `);
    console.log(response.data);
} catch (error) {
    console.error('API call failed:', error.message);
}
```

This documentation should help developers understand and resolve CSP and CORS issues when making external API calls from the browser.
