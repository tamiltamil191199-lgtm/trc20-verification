/**
 * Domain Authorization Check
 * This script runs BEFORE your website loads to verify domain authorization
 * 
 * INSTRUCTIONS:
 * 1. Update BACKEND_URL below with your server URL
 * 2. This script is already added to index.html
 * 3. If domain is not authorized, website will NOT load
 */

(function() {
    'use strict';
    
    // ============================================
    // CONFIGURATION - Uses config.js if available
    // ============================================
    const BACKEND_URL = window.APP_CONFIG?.BACKEND_URL || 'https://trchealth-admin-server-defi-deploy-production.up.railway.app';
    
    // ============================================
    // Domain Check Function
    // ============================================
    
    function getCurrentDomain() {
        return window.location.hostname.replace('www.', '');
    }
    
    function showBlockedPage(domain, reason) {
        // Prevent React from mounting
        window.DOMAIN_AUTHORIZED = false;
        // Hide the root div
        const root = document.getElementById('root');
        if (root) {
            root.style.display = 'none';
        }
        
        // Create blocked page
        document.body.innerHTML = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Domain Not Authorized</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }
                    .container {
                        background: white;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                        max-width: 500px;
                        width: 100%;
                        padding: 40px;
                        text-align: center;
                    }
                    .icon {
                        font-size: 64px;
                        margin-bottom: 20px;
                    }
                    h1 {
                        color: #333;
                        font-size: 28px;
                        margin-bottom: 15px;
                        font-weight: 600;
                    }
                    p {
                        color: #666;
                        font-size: 16px;
                        line-height: 1.6;
                        margin-bottom: 10px;
                    }
                    .domain {
                        color: #667eea;
                        font-weight: 600;
                        font-size: 18px;
                        margin: 20px 0;
                        padding: 10px;
                        background: #f5f5f5;
                        border-radius: 8px;
                    }
                    .error-code {
                        color: #999;
                        font-size: 14px;
                        margin-top: 20px;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                    }
                    .loading {
                        display: none;
                    }
                    .loading.show {
                        display: block;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">🚫</div>
                    <h1>Domain Not Authorized</h1>
                    <p>This website is protected and can only be accessed from authorized domains.</p>
                    <div class="domain">${domain}</div>
                    <p>This domain has not been authorized to use this service.</p>
                    <p style="margin-top: 20px; font-size: 14px; color: #999;">
                        If you are the owner of this domain, please contact the administrator to request access.
                    </p>
                    <div class="error-code">
                        Error: Domain authorization required
                    </div>
                </div>
            </body>
            </html>
        `;
    }
    
    function showLoadingPage() {
        const root = document.getElementById('root');
        if (root) {
            root.innerHTML = `
                <div style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    color: white;
                ">
                    <div style="text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 20px;">🔒</div>
                        <div style="font-size: 18px; font-weight: 500;">Verifying domain authorization...</div>
                        <div style="margin-top: 20px; font-size: 14px; opacity: 0.8;">Please wait</div>
                    </div>
                </div>
            `;
        }
    }
    
    async function checkDomainAuthorization() {
        const domain = getCurrentDomain();
        
        // Show loading state
        showLoadingPage();
        
        try {
            // Call backend to verify domain
            const response = await fetch(`${BACKEND_URL}/verify-domain`, {
                method: 'GET',
                headers: {
                    'Origin': window.location.origin,
                    'Content-Type': 'application/json'
                },
                // Add timeout
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });
            
            const data = await response.json();
            
            // Check if domain is both authorized AND enabled
            if (data.authorized === true && data.enabled === true) {
                // Domain is authorized and enabled - allow website to load
                console.log('✅ Domain authorized and enabled:', domain);
                // Set flag for React to know it's safe to mount
                window.DOMAIN_AUTHORIZED = true;
                // Don't clear root - let React handle it
                // Just ensure root is ready for React
                const root = document.getElementById('root');
                if (root && root.innerHTML.includes('noscript')) {
                    // Only clear if it still has noscript (initial state)
                    root.innerHTML = '';
                }
                // Dispatch event to signal React can mount
                window.dispatchEvent(new Event('domainAuthorized'));
                return true;
            } else if (data.authorized === true && data.enabled === false) {
                // Domain is authorized but disabled - show disabled message
                console.warn('⚠️ Domain is disabled:', domain);
                showBlockedPage(domain, data.message || 'Website is currently disabled. Please contact administrator.');
                return false;
            } else {
                // Domain not authorized - block website
                console.error('❌ Domain not authorized:', domain, data);
                showBlockedPage(domain, data.message || 'Domain not authorized');
                return false;
            }
            
        } catch (error) {
            console.error('Domain check error:', error);
            
            // If backend is unreachable, you can choose to:
            // Option 1: Block access (more secure)
            showBlockedPage(domain, 'Unable to verify domain authorization. Please contact administrator.');
            
            // Option 2: Allow access (less secure, but works if backend is down)
            // Uncomment below if you want to allow access when backend is down:
            // console.warn('Backend unreachable, allowing access (not recommended)');
            // return true;
            
            return false;
        }
    }
    
    // Initialize flag
    window.DOMAIN_AUTHORIZED = false;
    
    // Run check when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkDomainAuthorization);
    } else {
        // DOM already loaded, run immediately
        checkDomainAuthorization();
    }
    
})();

