let deferredPrompt;

window.addEventListener('beforeinstallprompt', (event) => {
    // Prevent the mini-infobar from appearing
    event.preventDefault();
    
    // Save the event for later
    deferredPrompt = event;
    
    // Show install button
    const installButton = document.getElementById('install-button');
    installButton.classList.remove('hidden');
    
    installButton.addEventListener('click', async () => {
        // Hide the button
        installButton.classList.add('hidden');
        
        // Show install prompt
        deferredPrompt.prompt();
        
        // Wait for user choice
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User ${outcome} the installation`);
        
        // Clear the saved prompt
        deferredPrompt = null;
    });
});

// Hide button if app is already installed
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    const installButton = document.getElementById('install-button');
    installButton.classList.add('hidden');
});

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get('shared') || urlParams.get('url');
    const sharedTitle = urlParams.get('title');
    
    if (sharedUrl) {
        try {
            showStatus('Fetching article...', 'info');
            const article = await fetchAndParseArticle(sharedUrl, sharedTitle);
            
            // Create file
            const blob = new Blob([article.html], { type: 'text/html' });
            const file = new File([blob], `${article.title.slice(0, 50)}.html`, { type: 'text/html' });

            // Try Gmail intent first
            const emailBody = [
                'Please send this file to one of your Kindle email addresses:',
                'szmeku3@kindle.com',
                'szmeku@kindle.com',
                'szmeku_83@kindle.com'
            ].join('\n');

            const gmailUrl = `googlegmail://co?subject=${encodeURIComponent(`Send to Kindle: ${article.title}`)}&body=${encodeURIComponent(emailBody)}`;
            
            // Try opening Gmail
            window.location.href = gmailUrl;
            
            // If Gmail didn't open after a short delay, show share button
            setTimeout(() => {
                if (!document.hidden) {
                    // Hide fetching status
                    const status = document.getElementById('status');
                    status.classList.add('hidden');

                    // Show share button as fallback
                    const container = document.querySelector('.container');
                    const shareButton = document.createElement('button');
                    shareButton.textContent = 'Send to Kindle via Email';
                    shareButton.className = 'share-button';
                    container.appendChild(shareButton);

                    shareButton.addEventListener('click', async () => {
                        if (navigator.share && navigator.canShare) {
                            const shareData = {
                                files: [file],
                                title: `Send to Kindle: ${article.title}`,
                                text: [
                                    'Please send this file to one of your Kindle email addresses:',
                                    'szmeku3@kindle.com',
                                    'szmeku@kindle.com',
                                    'szmeku_83@kindle.com',
                                    '',
                                    'Make sure to send from your approved email address!'
                                ].join('\n')
                            };

                            try {
                                if (navigator.canShare(shareData)) {
                                    await navigator.share(shareData);
                                    showStatus('Share sheet opened', 'success');
                                    shareButton.remove();
                                } else {
                                    throw new Error('Sharing not supported');
                                }
                            } catch (error) {
                                console.error('Share failed:', error);
                                showStatus('Share failed: ' + error.message, 'error');
                                downloadFile(article);
                            }
                            return;
                        }

                        downloadFile(article);
                    });
                }
            }, 1000);

        } catch (error) {
            console.error('Detailed error:', error);
            showStatus('Error: ' + error.message, 'error');
        }
    }
});

async function fetchAndParseArticle(url, providedTitle = '') {
    try {
        console.log('Starting fetch for:', url);
        
        // Try different sources
        const sources = [
            {
                name: 'Original',
                url: url,
                transform: url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
            },
            {
                name: 'Google Cache',
                url: `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`,
                transform: url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
            }
        ];

        let html = null;
        let error = null;
        let source = null;

        // Try each source
        for (const src of sources) {
            try {
                console.log(`Trying ${src.name}:`, src.url);
                const proxyUrl = src.transform(src.url);
                const response = await fetch(proxyUrl);
                
                if (!response.ok) continue;
                
                const data = await response.json();
                html = data.contents; // allorigins returns content in .contents property
                
                if (html && html.length > 1000) {
                    source = src.name;
                    break;
                }
            } catch (e) {
                error = e;
                continue;
            }
        }

        if (!html) {
            throw error || new Error('Could not fetch content from any source');
        }

        console.log('Successfully fetched from:', source);
        console.log('Parsing HTML...');
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        console.log('Creating Readability instance...', typeof Readability);
        if (typeof Readability === 'undefined') {
            throw new Error('Readability library not loaded properly');
        }

        const reader = new Readability(doc, {
            debug: true,
            charThreshold: 20,
            classesToPreserve: ['article', 'content']
        });

        const article = reader.parse();
        
        if (!article) {
            throw new Error('Could not parse article content');
        }

        console.log('Article parsed successfully:', article.title);
        return {
            title: article.title,
            html: createCleanHtml(article.title, article.content, url)
        };
    } catch (error) {
        console.error('Error details:', error);
        console.error('Response:', error.response);
        throw new Error(`Could not fetch article: ${error.message}`);
    }
}

function createCleanHtml(title, content, url) {
    return `
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
            ${DOMPurify.sanitize(content)}
            <hr>
            <p>Original URL: <a href="${url}">${url}</a></p>
        </body>
        </html>
    `;
}

async function shareViaEmail(article) {
    const blob = new Blob([article.html], { type: 'text/html' });
    const file = new File([blob], `${article.title.slice(0, 50)}.html`, { type: 'text/html' });

    // Check if it's a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        // Show a share button instead of automatically sharing
        const container = document.querySelector('.container');
        const shareButton = document.createElement('button');
        shareButton.textContent = 'Send to Kindle via Email';
        shareButton.className = 'share-button';
        container.appendChild(shareButton);

        shareButton.addEventListener('click', async () => {
            if (navigator.share && navigator.canShare) {
                const shareData = {
                    files: [file],
                    title: `Send to Kindle: ${article.title}`,
                    text: [
                        'Please send this file to one of your Kindle email addresses:',
                        'szmeku3@kindle.com',
                        'szmeku@kindle.com',
                        'szmeku_83@kindle.com',
                        '',
                        'Make sure to send from your approved email address!'
                    ].join('\n')
                };

                try {
                    if (navigator.canShare(shareData)) {
                        await navigator.share(shareData);
                        showStatus('Share sheet opened', 'success');
                    } else {
                        throw new Error('Sharing not supported');
                    }
                } catch (error) {
                    console.error('Share failed:', error);
                    showStatus('Share failed: ' + error.message, 'error');
                    downloadFile(article);
                }
                return;
            }

            downloadFile(article);
        });

        showStatus('Click "Send to Kindle via Email" to share', 'info');
    } else {
        downloadFile(article);
    }
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