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
    
    // Show install button by default
    const installButton = document.getElementById('install-button');
    installButton.classList.remove('hidden');
    
    // Create Gmail button
    const container = document.querySelector('.container');
    const gmailButton = document.createElement('button');
    gmailButton.textContent = 'Send to Kindle via Gmail';
    gmailButton.className = 'share-button';
    gmailButton.disabled = true; // Disabled until we have content
    
    // Create test buttons for different intent formats
    const intentTests = [
        {
            name: 'Gmail 1',
            url: 'intent://compose/#Intent;' +
                 'scheme=gmail;' +
                 'package=com.google.android.gm;' +
                 'type=text/plain;' +
                 'S.android.intent.extra.SUBJECT=Test Subject;' +
                 'S.android.intent.extra.TEXT=Test body;' +
                 'S.browser_fallback_url=https://mail.google.com;' +
                 'end'
        },
        {
            name: 'Gmail 2',
            url: 'intent://send/#Intent;' +
                 'action=android.intent.action.SEND;' +
                 'type=text/plain;' +
                 'package=com.google.android.gm;' +
                 'S.android.intent.extra.SUBJECT=Test Subject;' +
                 'S.android.intent.extra.TEXT=Test body;' +
                 'category=android.intent.category.BROWSABLE;' +
                 'end'
        },
        {
            name: 'Gmail 3',
            url: 'intent://send/#Intent;' +
                 'action=android.intent.action.SEND;' +
                 'type=text/plain;' +
                 'S.subject=Send to Kindle;' +
                 'S.body=Here is the article;' +
                 'package=com.google.android.gm;' +
                 'end'
        }
    ];

    // Add test buttons
    intentTests.forEach(test => {
        const button = document.createElement('button');
        button.textContent = test.name;
        button.className = 'share-button';
        
        // Create an anchor element (as per documentation)
        const a = document.createElement('a');
        a.href = test.url;
        a.style.display = 'none';
        document.body.appendChild(a);
        
        button.addEventListener('click', () => {
            // Trigger click on anchor (simulating user gesture)
            a.click();
        });
        
        container.appendChild(button);
    });
    
    // Set up Gmail button handler right away
    gmailButton.addEventListener('click', () => {
        console.log('Gmail button clicked, title:', gmailButton.dataset.title);
        
        const emailBody = [
            'Please send this file to one of your Kindle email addresses:',
            'szmeku3@kindle.com',
            'szmeku@kindle.com',
            'szmeku_83@kindle.com'
        ].join('\n');

        // Try multiple approaches
        const gmailUrl = `googlegmail://co?subject=${encodeURIComponent(gmailButton.dataset.title)}&body=${encodeURIComponent(emailBody)}`;
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(gmailButton.dataset.title)}&body=${encodeURIComponent(emailBody)}`;
        
        // Create and submit a form (might work better than location.href)
        const form = document.createElement('form');
        form.method = 'GET';
        form.action = gmailUrl;
        document.body.appendChild(form);
        
        try {
            form.submit();
            showStatus('Opening Gmail...', 'success');
        } catch (e) {
            console.error('Form submit failed, trying location.href:', e);
            window.location.href = gmailUrl;
            
            // If that fails too, try mailto
            setTimeout(() => {
                if (!document.hidden) {
                    console.log('Falling back to mailto');
                    window.location.href = mailtoUrl;
                }
            }, 1000);
        }
    });
    
    container.appendChild(gmailButton);
    
    if (sharedUrl) {
        try {
            showStatus('Fetching article...', 'info');
            console.log('Starting article fetch...');
            const article = await fetchAndParseArticle(sharedUrl, sharedTitle);
            console.log('Article fetched successfully:', article);
            
            // Create file
            const blob = new Blob([article.html], { type: 'text/html' });
            const file = new File([blob], `${article.title.slice(0, 50)}.html`, { type: 'text/html' });
            console.log('File created');

            // Hide fetching status
            const status = document.getElementById('status');
            status.classList.add('hidden');

            // Enable Gmail button and store article title
            console.log('Enabling Gmail button with title:', article.title);
            gmailButton.disabled = false;
            gmailButton.dataset.title = `Send to Kindle: ${article.title}`;

        } catch (error) {
            console.error('Detailed error:', error);
            showStatus('Error: ' + error.message, 'error');
        }
    } else {
        showStatus('Share an article to get started', 'info');
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