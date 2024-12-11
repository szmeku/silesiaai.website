document.addEventListener('DOMContentLoaded', async () => {
    // Check if app was opened from share target
    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get('shared') || urlParams.get('url');
    const sharedTitle = urlParams.get('title');
    
    console.log('Received URL:', sharedUrl);
    
    if (sharedUrl) {
        try {
            showStatus('Fetching article...', 'info');
            console.log('Using CORS proxy for:', sharedUrl);
            const article = await fetchAndParseArticle(sharedUrl, sharedTitle);
            showStatus('Opening email...', 'info');
            shareViaEmail(article);
        } catch (error) {
            console.error('Detailed error:', error);
            showStatus('Error: ' + error.message, 'error');
        }
    }
});

async function fetchAndParseArticle(url, providedTitle = '') {
    try {
        console.log('Starting fetch for:', url);
        const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
        console.log('Using proxy URL:', proxyUrl);
        const response = await fetch(proxyUrl, {
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        
        // Check if this is likely an SPA
        if (html.includes('react') || html.includes('chunk.js') || !html.includes('<article')) {
            throw new Error('This appears to be a dynamic website. Please try sharing a direct article URL instead of the homepage.');
        }
        
        console.log('Parsing HTML...');
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        console.log('Received HTML length:', html.length);
        console.log('First 500 chars of HTML:', html.substring(0, 500));
        
        console.log('Creating Readability instance...', typeof Readability);
        if (typeof Readability === 'undefined') {
            throw new Error('Readability library not loaded properly');
        }

        // Create a clone of the document to avoid modifications
        const docClone = doc.cloneNode(true);
        console.log('Document cloned');

        // Initialize Readability with more options
        const reader = new Readability(docClone, {
            debug: true,
            charThreshold: 20,
            classesToPreserve: ['article', 'content']
        });
        console.log('Readability instance created');

        const article = reader.parse();
        console.log('Parse result:', article);
        
        if (!article) {
            console.error('Readability failed to parse article');
            throw new Error('Could not parse article content');
        }

        console.log('Article parsed successfully:', article.title);
        
        // Create clean HTML
        const cleanHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${article.title}</title>
                <style>
                    body { 
                        max-width: 800px; 
                        margin: 0 auto; 
                        padding: 20px;
                        font-family: Georgia, serif;
                        line-height: 1.6;
                    }
                    img { max-width: 100%; height: auto; }
                </style>
            </head>
            <body>
                <h1>${article.title}</h1>
                ${DOMPurify.sanitize(article.content)}
                <hr>
                <p>Original URL: <a href="${url}">${url}</a></p>
            </body>
            </html>
        `;

        return {
            title: article.title,
            html: cleanHtml
        };
    } catch (error) {
        console.error('Error details:', error);
        console.error('Response:', error.response);
        throw new Error(`Could not fetch article: ${error.message}`);
    }
}

function shareViaEmail(article) {
    const blob = new Blob([article.html], { type: 'text/html' });
    const file = new File([blob], 'article.html', { type: 'text/html' });

    // Try native sharing first (mobile)
    if (navigator.share && navigator.canShare) {
        const shareData = {
            files: [file],
            title: article.title,
            text: `Kindle version of: ${article.title}`
        };

        if (navigator.canShare(shareData)) {
            navigator.share(shareData)
                .then(() => showStatus('Share sheet opened', 'success'))
                .catch(() => downloadFile(article))
                .catch(error => showStatus('Share failed: ' + error.message, 'error'));
            return;
        }
    }

    // If native sharing not available, download the file
    downloadFile(article);
}

function downloadFile(article) {
    const blob = new Blob([article.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.title.slice(0, 50)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus('Article saved. Send it to your Kindle email.', 'success');
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    if (message.includes('CORS')) {
        status.innerHTML = message + '<br><small>Try using a CORS proxy or extension</small>';
    } else {
        status.textContent = message;
    }
    status.className = type;
    status.classList.remove('hidden');
    setTimeout(() => status.classList.add('hidden'), 5000);
} 