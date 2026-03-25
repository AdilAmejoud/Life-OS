/**
 * Web Search Module
 * Provides web search capabilities using DuckDuckGo (no API key needed).
 */

const https = require('https');

/**
 * Search the web using DuckDuckGo HTML
 * @param {string} query - Search query
 * @param {number} maxResults - Max results to return (default 5)
 * @returns {Promise<Array>} Array of { title, url, snippet }
 */
async function search(query, maxResults = 5) {
    const encoded = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encoded}`;

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'html.duckduckgo.com',
            path: `/html/?q=${encoded}`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const results = parseResults(body, maxResults);
                    resolve(results);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Search timeout')); });
        req.end();
    });
}

/**
 * Parse DuckDuckGo HTML results
 */
function parseResults(html, maxResults) {
    const results = [];

    // Match result blocks
    const resultBlocks = html.split('result__body');

    for (let i = 1; i < resultBlocks.length && results.length < maxResults; i++) {
        const block = resultBlocks[i];

        // Extract URL
        const urlMatch = block.match(/class="result__a"[^>]*href="([^"]+)"/);
        let url = urlMatch ? urlMatch[1] : '';

        // DuckDuckGo wraps URLs in redirects, extract the actual URL
        if (url.includes('uddg=')) {
            const uddg = url.match(/uddg=([^&]+)/);
            if (uddg) url = decodeURIComponent(uddg[1]);
        }

        // Extract title
        const titleMatch = block.match(/class="result__a"[^>]*>([^<]+)/);
        const title = titleMatch ? titleMatch[1].replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim() : '';

        // Extract snippet
        const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
        let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim() : '';

        if (title && url && !url.includes('duckduckgo.com')) {
            results.push({ title, url, snippet });
        }
    }

    return results;
}

/**
 * Format search results for injection into AI prompt
 */
function formatForPrompt(results, query) {
    if (!results.length) return `No search results found for "${query}".`;

    let formatted = `Web search results for "${query}":\n\n`;
    results.forEach((r, i) => {
        formatted += `[${i + 1}] ${r.title}\n`;
        formatted += `    URL: ${r.url}\n`;
        if (r.snippet) formatted += `    ${r.snippet}\n`;
        formatted += '\n';
    });
    formatted += 'Use these results to provide an informed, up-to-date answer. Cite sources when relevant.';
    return formatted;
}

module.exports = { search, formatForPrompt };
