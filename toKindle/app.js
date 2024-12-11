const KINDLE_EMAILS = [
    'szmeku3@kindle.com',
    'szmeku_83@kindle.com',
    'szmeku@kindle.com'
];

document.addEventListener('DOMContentLoaded', () => {
    // Check if app was opened from share target
    const urlParams = new URLSearchParams(window.location.search);
    const sharedContent = urlParams.get('shared');
    
    if (sharedContent) {
        document.getElementById('websiteUrl').value = decodeURIComponent(sharedContent);
    }
});

document.getElementById('shareButton').addEventListener('click', async () => {
    const url = document.getElementById('websiteUrl').value;
    if (!url) {
        showStatus('Please enter a URL', 'error');
        return;
    }

    if (navigator.share) {
        try {
            await navigator.share({
                url: url,
                title: 'Send to Kindle',
                text: `Send this article to Kindle: ${url}`
            });
            showStatus('Share sheet opened successfully', 'success');
        } catch (error) {
            showStatus('Sharing failed. Please try again.', 'error');
        }
    } else {
        showStatus('Sharing is only available on mobile devices', 'error');
    }
});

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = type;
    status.classList.remove('hidden');
    setTimeout(() => status.classList.add('hidden'), 3000);
} 