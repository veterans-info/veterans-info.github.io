// Main site JavaScript
(function () {
    'use strict';

    // DOM Content Loaded
    document.addEventListener('DOMContentLoaded', async function () {
        // Load header and footer first
        await Promise.all([loadHeader(), loadFooter()]);

        // Now initialize scripts that might depend on header/footer content
        initializeYear();
        initializeLastUpdated();
        initializeNavigation(); // If menu toggle is in header/footer, this needs them loaded
        initializeAccessibility();
        initializeAnalytics();
        // Any other initializations
    });

    // Load header HTML
    function loadHeader() {
        // Check if header already exists (e.g. if JS disabled, or for development)
        if (document.querySelector('header[role="banner"]')) {
            setActiveNavLink();
            return Promise.resolve(); // Header already exists, resolve immediately
        }

        // Try multiple possible paths for the header file
        const headerPaths = ['header.html', './header.html', '/header.html'];
        
        return tryLoadFile(headerPaths)
            .then(data => {
                // Look for header placeholder first
                const headerPlaceholder = document.getElementById('header-placeholder');
                if (headerPlaceholder) {
                    headerPlaceholder.innerHTML = data;
                } else {
                    // Insert header after skip link
                    const skipLink = document.querySelector('.skip-link');
                    if (skipLink) {
                        skipLink.insertAdjacentHTML('afterend', data);
                    } else {
                        // Fallback: insert at beginning of body
                        document.body.insertAdjacentHTML('afterbegin', data);
                    }
                }

                // Set active page indicator after header is loaded
                setActiveNavLink();
            })
            .catch(error => {
                console.error('Error loading header:', error);
                // console.log('Current location:', window.location.href); // Optional: for debugging
                // Graceful fallback - site still works without dynamic header
            });
    }

    // Load footer HTML
    function loadFooter() {
        // Try multiple possible paths for the footer file
        const footerPaths = ['footer.html', './footer.html', '/footer.html'];
        
        return tryLoadFile(footerPaths)
            .then(data => {
                // Look for footer placeholder first
                const footerPlaceholder = document.getElementById('footer-placeholder');
                if (footerPlaceholder) {
                    footerPlaceholder.innerHTML = data;
                } else {
                    // Fallback: inject before scripts or at end of body
                    const scripts = document.body.querySelectorAll('script');
                    const lastScript = scripts[scripts.length - 1];
                    if (lastScript && lastScript.parentNode === document.body) {
                        lastScript.insertAdjacentHTML('beforebegin', data);
                    } else {
                        document.body.insertAdjacentHTML('beforeend', data);
                    }
                }
            })
            .catch(error => {
                console.error('Error loading footer:', error);
                // console.log('Current location:', window.location.href); // Optional: for debugging
            });
    }

    // Helper function to try loading files from multiple paths
    function tryLoadFile(paths) {
        let currentPathIndex = 0;
        
        function attemptLoad() {
            if (currentPathIndex >= paths.length) {
                return Promise.reject(new Error('All paths failed'));
            }
            
            const currentPath = paths[currentPathIndex];
            // console.log(`Attempting to load: ${currentPath}`); // Optional: for debugging
            
            return fetch(currentPath)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    // console.log(`Successfully loaded: ${currentPath}`); // Optional: for debugging
                    return response.text();
                })
                .catch(error => {
                    // console.log(`Failed to load ${currentPath}:`, error.message); // Optional: for debugging
                    currentPathIndex++;
                    return attemptLoad();
                });
        }
        
        return attemptLoad();
    }

    // Set active navigation link
    function setActiveNavLink() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('nav a'); // Assumes nav is loaded

        navLinks.forEach(link => {
            link.removeAttribute('aria-current');
            link.classList.remove('active');

            const linkHref = link.getAttribute('href');
            if (linkHref === currentPath ||
                (currentPath === '/' && linkHref === '/index.html') ||
                (currentPath === '/index.html' && linkHref === '/')) {
                link.setAttribute('aria-current', 'page');
                link.classList.add('active');
            }
        });
    }

    // Update current year
    function initializeYear() {
        const yearElements = document.querySelectorAll('#current-year');
        const currentYear = new Date().getFullYear();
        yearElements.forEach(el => {
            el.textContent = currentYear;
        });
    }

    // Show last GitHub update
    function initializeLastUpdated() {
        const lastUpdatedEl = document.getElementById('last-updated');
        if (lastUpdatedEl) {
            const lastUpdated = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            lastUpdatedEl.textContent = lastUpdated;
        }
    }

    // Enhanced navigation functionality
    function initializeNavigation() {
        // Mobile menu toggle if implemented (header.html has a search button, not a hamburger menu toggle explicitly)
        // This might be for a different menu toggle pattern.
        const menuToggle = document.querySelector('.menu-toggle'); // Example selector
        const navElement = document.querySelector('nav.main-nav'); // Targeting the main navigation container

        if (menuToggle && navElement) {
            menuToggle.addEventListener('click', function () {
                navElement.classList.toggle('active'); // Assumes an 'active' class handles visibility
                const expanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', !expanded);
                announceToScreenReader(expanded ? 'Navigation menu collapsed' : 'Navigation menu expanded');
            });
        }

        // Smooth scrolling for anchor links
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });

                    setTimeout(() => {
                        targetElement.focus({ preventScroll: true });
                        announceToScreenReader(`Scrolled to ${targetElement.textContent || targetId}`);
                    }, 0);
                }
            });
        });
    }

    // Accessibility enhancements
    function initializeAccessibility() {
        // Announce page changes for screen readers
        let announcer = document.getElementById('live-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.setAttribute('role', 'status');
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.className = 'sr-only';
            announcer.id = 'live-announcer';
            document.body.appendChild(announcer);
        }

        // Add skip to main content functionality
        const skipLink = document.querySelector('.skip-link');
        if (skipLink) {
            skipLink.addEventListener('click', function (e) {
                const targetSelector = this.getAttribute('href');
                if (targetSelector && targetSelector.startsWith('#')) {
                    const target = document.querySelector(targetSelector);
                    if (target) {
                        e.preventDefault();
                        target.setAttribute('tabindex', '-1');
                        target.focus();
                        target.scrollIntoView();
                        announceToScreenReader(`Skipped to main content`);
                    }
                }
            });
        }

        // Announce page load completion
        setTimeout(() => {
            announceToScreenReader('Page loaded successfully');
        }, 500);
    }

    // Initialize analytics (placeholder)
    function initializeAnalytics() {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            // console.log('Analytics would initialize here'); // Optional: for debugging
        }
    }

    // Utility function: Announce message to screen readers
    function announceToScreenReader(message) {
        const announcer = document.getElementById('live-announcer');
        if (announcer) {
            announcer.textContent = '';
            setTimeout(() => {
                announcer.textContent = message;
            }, 50);
        }
    }

    })();
