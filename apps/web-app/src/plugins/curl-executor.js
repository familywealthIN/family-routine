import Vue from 'vue';

// Curl command parser and executor plugin
const CurlExecutor = {
  install(VueConstructor) {
    // eslint-disable-next-line no-param-reassign
    VueConstructor.prototype.$curl = {
      /**
       * Parse curl command and execute it using fetch API
       * @param {string} curlCommand - The curl command string
       * @returns {Promise} - Fetch response
       */
      async execute(curlCommand) {
        try {
          const parsedOptions = this.parseCurlCommand(curlCommand);
          const response = await fetch(parsedOptions.url, parsedOptions.options);

          // Try to parse response as JSON, fallback to text
          let responseData;
          const contentType = response.headers.get('content-type');

          if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
          } else {
            responseData = await response.text();
          }

          return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data: responseData,
          };
        } catch (error) {
          // Enhanced error handling for CSP and CORS issues
          if (error.name === 'TypeError' && error.message.includes('fetch')) {
            if (error.message.includes('CORS')) {
              const corsMessage = 'CORS Error: The server doesn\'t allow cross-origin requests '
                + 'from this domain. This might be due to missing CORS headers on the target server. '
                + `Original error: ${error.message}`;
              throw new Error(corsMessage);
            }
            if (error.message.includes('CSP') || error.message.includes('Content Security Policy')) {
              const cspMessage = 'CSP Error: The request was blocked by Content Security Policy. '
                + 'You may need to update the CSP headers to allow connections to this domain. '
                + `Original error: ${error.message}`;
              throw new Error(cspMessage);
            }
            const networkMessage = 'Network Error: Unable to fetch the resource. '
              + 'This could be due to network connectivity, DNS issues, or server unavailability. '
              + `Original error: ${error.message}`;
            throw new Error(networkMessage);
          }
          throw new Error(`Curl execution failed: ${error.message}`);
        }
      },

      /**
       * Parse curl command string into fetch options
       * @param {string} curlCommand - The curl command string
       * @returns {Object} - Parsed URL and fetch options
       */
      parseCurlCommand(curlCommand) {
        // Remove 'curl ' from the beginning
        const command = curlCommand.replace(/^curl\s+/, '');

        const options = {
          method: 'GET',
          headers: {},
        };

        let url = '';

        // Split command into tokens, handling quoted strings
        const tokens = this.tokenizeCurlCommand(command);

        for (let i = 0; i < tokens.length; i += 1) {
          const token = tokens[i];

          if (token === '-X' || token === '--request') {
            i += 1;
            options.method = tokens[i];
          } else if (token === '-H' || token === '--header') {
            i += 1;
            const header = tokens[i];
            const [key, ...valueParts] = header.split(':');
            if (key && valueParts.length > 0) {
              options.headers[key.trim()] = valueParts.join(':').trim();
            }
          } else if (token === '-d' || token === '--data') {
            i += 1;
            const data = tokens[i];
            options.body = data;
            if (!options.headers['Content-Type']) {
              options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
          } else if (token === '--data-raw') {
            i += 1;
            options.body = tokens[i];
          } else if (token === '--data-binary') {
            i += 1;
            options.body = tokens[i];
          } else if (token === '-u' || token === '--user') {
            i += 1;
            const userPass = tokens[i];
            const encoded = btoa(userPass);
            options.headers.Authorization = `Basic ${encoded}`;
          } else if (token === '-A' || token === '--user-agent') {
            i += 1;
            options.headers['User-Agent'] = tokens[i];
          } else if (token.startsWith('http://') || token.startsWith('https://')) {
            url = token;
          } else if (!token.startsWith('-') && !url) {
            // Assume it's the URL if no URL has been found yet
            url = token;
          }
        }

        if (!url) {
          throw new Error('No URL found in curl command');
        }

        return { url, options };
      },

      /**
       * Tokenize curl command, properly handling quoted strings
       * @param {string} command - The curl command without 'curl '
       * @returns {Array} - Array of tokens
       */
      tokenizeCurlCommand(command) {
        const tokens = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < command.length; i += 1) {
          const char = command[i];

          if (!inQuotes && (char === '"' || char === "'")) {
            inQuotes = true;
            quoteChar = char;
          } else if (inQuotes && char === quoteChar) {
            inQuotes = false;
            quoteChar = '';
          } else if (!inQuotes && char === ' ') {
            if (current.trim()) {
              tokens.push(current.trim());
              current = '';
            }
          } else {
            current += char;
          }
        }

        if (current.trim()) {
          tokens.push(current.trim());
        }

        return tokens;
      },

      /**
       * Simple curl command builder (helper method)
       * @param {Object} options - Request options
       * @returns {string} - Curl command string
       */
      buildCurlCommand(options) {
        let command = `curl "${options.url}"`;

        if (options.method && options.method !== 'GET') {
          command += ` -X ${options.method}`;
        }

        if (options.headers) {
          Object.entries(options.headers).forEach(([key, value]) => {
            command += ` -H "${key}: ${value}"`;
          });
        }

        if (options.body) {
          command += ` -d '${options.body}'`;
        }

        return command;
      },
    };
  },
};

Vue.use(CurlExecutor);

export default CurlExecutor;
