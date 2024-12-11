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

    // Check if Web Share API is available AND if the platform supports sharing
    if (navigator.share && navigator.canShare) {
        const shareData = {
            url: url,
            title: 'Send to Kindle',
            text: `Send this article to Kindle: ${url}`
        };

        // Check if this data can be shared on this platform
        if (navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                showStatus('Share sheet opened successfully', 'success');
            } catch (error) {
                showStatus('Sharing failed: ' + error.message, 'error');
            }
        } else {
            showStatus('Sharing not supported on this platform', 'error');
        }
    } else {
        showStatus('Sharing not available in this browser', 'error');
    }
});

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = type;
    status.classList.remove('hidden');
    setTimeout(() => status.classList.add('hidden'), 3000);
} 