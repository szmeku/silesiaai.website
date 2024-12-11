document.addEventListener('DOMContentLoaded', async () => {
    // Check if app was opened from share target
    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get('shared') || urlParams.get('url');
    const sharedTitle = urlParams.get('title');
    
    if (sharedUrl) {
        try {
            showStatus('Fetching article...', 'info');
            const article = await fetchAndParseArticle(sharedUrl, sharedTitle);
            showStatus('Opening email...', 'info');
            shareViaEmail(article);
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    }
});

async function fetchAndParseArticle(url, providedTitle = '') {
    try {
        // Fetch the webpage
        const response = await fetch(url);
        const html = await response.text();
        
        // Create a DOM parser
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Parse with Readability
        const reader = new Readability(doc);
        const article = reader.parse();
        
        // Use provided title if available
        const title = providedTitle || article.title;
        
        // Create clean HTML
        const cleanHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${title}</title>
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
                <h1>${title}</h1>
                ${DOMPurify.sanitize(article.content)}
                <hr>
                <p>Original URL: <a href="${url}">${url}</a></p>
            </body>
            </html>
        `;

        return {
            title: title,
            html: cleanHtml
        };
    } catch (error) {
        // Add better error handling
        console.error('Error fetching article:', error);
        throw new Error('Could not fetch article. CORS might be blocking access.');
    }
}

function shareViaEmail(article) {
    // Try native sharing first
    if (navigator.share && navigator.canShare) {
        const shareData = {
            files: [file],
            title: article.title,
            text: `Kindle version of: ${article.title}`
        };

        if (navigator.canShare(shareData)) {
            navigator.share(shareData)
                .then(() => showStatus('Share sheet opened', 'success'))
                .catch(error => handleFallbackSharing(article));
            return;
        }
    }

    // Fallback for desktop: Create downloadable link
    handleFallbackSharing(article);
}

function handleFallbackSharing(article) {
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
    
    showStatus('Article downloaded. You can email it to your Kindle.', 'success');
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