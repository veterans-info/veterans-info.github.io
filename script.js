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
            initializeDropdowns();
            return Promise.resolve(); // Header already exists, resolve immediately
        }

        return fetch('/header.html') // Ensure header.html is at the root
            .then(response => {
                if (!response.ok) {
                    throw new Error('Header file not found');
                }
                return response.text();
            })
            .then(data => {
                // Insert header after skip link
                const skipLink = document.querySelector('.skip-link');
                if (skipLink) {
                    skipLink.insertAdjacentHTML('afterend', data);
                } else {
                    // Fallback: insert at beginning of body
                    document.body.insertAdjacentHTML('afterbegin', data);
                }

                // Set active page indicator after header is loaded
                setActiveNavLink();

                // Initialize dropdown functionality after header is loaded
                initializeDropdowns();
            })
            .catch(error => {
                console.error('Error loading header:', error);
                // Graceful fallback - site still works without dynamic header
                // Consider re-throwing or returning Promise.reject(error) if Promise.all
                // should definitely fail if the header fails. For now, it logs and continues.
            });
    }

    // Load footer HTML
    function loadFooter() {
        return fetch('/footer.html') // Ensure footer.html is at the root
            .then(response => {
                if (!response.ok) {
                    throw new Error('Footer file not found');
                }
                return response.text();
            })
            .then(data => {
                // Assuming you want to inject it right before the closing </body> tag
                // or into a specific placeholder div if you prefer.
                // For simplicity, let's append it to the body.
                // If you have a main script tag as the last element, inject before it.
                const scripts = document.body.querySelectorAll('script');
                const lastScript = scripts[scripts.length - 1];
                if (lastScript && lastScript.parentNode === document.body) { // Ensure lastScript is a direct child of body
                    lastScript.insertAdjacentHTML('beforebegin', data);
                } else {
                    document.body.insertAdjacentHTML('beforeend', data);
                }
            })
            .catch(error => {
                console.error('Error loading footer:', error);
                // Similar to header, consider error handling impact on Promise.all
            });
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
                (currentPath === '/' && linkHref === '/index.html') || // Handle common index variations
                (currentPath === '/index.html' && linkHref === '/')) {
                link.setAttribute('aria-current', 'page');
                link.classList.add('active');
            }
        });
    }

    // Initialize dropdown menus
    function initializeDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown > a'); // Assumes dropdowns are in loaded header/footer

        dropdowns.forEach(dropdown => {
            dropdown.addEventListener('click', function (e) {
                e.preventDefault();
                const expanded = this.getAttribute('aria-expanded') === 'true';

                // Close all other dropdowns
                dropdowns.forEach(otherDropdown => {
                    if (otherDropdown !== this) {
                        otherDropdown.setAttribute('aria-expanded', 'false');
                        if (otherDropdown.parentElement) {
                           otherDropdown.parentElement.classList.remove('open');
                        }
                    }
                });

                // Toggle current dropdown
                this.setAttribute('aria-expanded', !expanded);
                if (this.parentElement) {
                    this.parentElement.classList.toggle('open');
                }
            });

            // Handle keyboard navigation
            dropdown.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                } else if (e.key === 'Escape') {
                    this.setAttribute('aria-expanded', 'false');
                    if (this.parentElement) {
                        this.parentElement.classList.remove('open');
                    }
                    this.blur();
                }
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.dropdown')) {
                dropdowns.forEach(dropdown => {
                    dropdown.setAttribute('aria-expanded', 'false');
                     if (dropdown.parentElement) {
                        dropdown.parentElement.classList.remove('open');
                    }
                });
            }
        });

        // Close dropdowns on escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                dropdowns.forEach(dropdown => {
                    dropdown.setAttribute('aria-expanded', 'false');
                    if (dropdown.parentElement) {
                        dropdown.parentElement.classList.remove('open');
                    }
                });
            }
        });
    }

    // Update current year
    function initializeYear() {
        // This function might be called before footer (where year might be) is fully processed by browser
        // but after HTML is injected. This is usually fine.
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
            // This would be replaced with actual GitHub API call in production
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
        // Mobile menu toggle if implemented (assuming it's in header/footer)
        const menuToggle = document.querySelector('.menu-toggle');
        const nav = document.querySelector('nav ul'); // Main nav list

        if (menuToggle && nav) {
            menuToggle.addEventListener('click', function () {
                nav.classList.toggle('active');
                const expanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', !expanded);
                // Announce menu state change
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

                    // Focus the target element for accessibility
                    // Use setTimeout to ensure focus happens after scroll
                    setTimeout(() => {
                        targetElement.focus({ preventScroll: true }); // preventScroll if already handled
                        // Announce the jump
                        announceToScreenReader(`Scrolled to ${targetElement.textContent || targetId}`);
                    }, 0); // A small delay can help
                }
            });
        });
    }

    // Accessibility enhancements
    function initializeAccessibility() {
        // Announce page changes for screen readers (ensure it's created only once)
        let announcer = document.getElementById('live-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.setAttribute('role', 'status');
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.className = 'sr-only'; // Use the .sr-only class defined later
            announcer.id = 'live-announcer';
            document.body.appendChild(announcer);
        }


        // Add skip to main content functionality
        const skipLink = document.querySelector('.skip-link');
        if (skipLink) {
            skipLink.addEventListener('click', function (e) {
                const targetSelector = this.getAttribute('href');
                // Ensure targetSelector is a valid selector (e.g., starts with #)
                if (targetSelector && targetSelector.startsWith('#')) {
                    const target = document.querySelector(targetSelector);
                    if (target) {
                        e.preventDefault();
                        target.setAttribute('tabindex', '-1'); // Make it focusable if not already
                        target.focus();
                        target.scrollIntoView();
                        announceToScreenReader(`Skipped to main content`);
                    }
                }
            });
        }

        // Add keyboard navigation hints (consider if this is still needed or how to implement better)
        // This generic check might be too broad or produce too many warnings.
        // const interactiveElements = document.querySelectorAll('a, button, input, select, textarea');
        // interactiveElements.forEach(el => {
        //     if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
        //         const text = el.textContent || el.value || el.placeholder;
        //         if (!text || text.trim() === '') {
        //             // Only warn if it's visible and truly lacks context
        //             if (el.offsetWidth > 0 || el.offsetHeight > 0) {
        //                  console.warn('Interactive element without accessible label:', el);
        //             }
        //         }
        //     }
        // });

        // Announce page load completion (might be better tied to specific content readiness)
        // Wait for a brief moment after DOMContentLoaded and header/footer loading
        setTimeout(() => {
            announceToScreenReader('Page loaded successfully');
        }, 500); // Adjust delay as needed
    }

    // Initialize analytics (placeholder)
    function initializeAnalytics() {
        // This would be replaced with actual analytics code
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            console.log('Analytics would initialize here');
            // Example: Plausible, Umami, or similar privacy-respecting analytics
        }
    }

    // Utility function: Announce message to screen readers
    function announceToScreenReader(message) {
        const announcer = document.getElementById('live-announcer');
        if (announcer) {
            // Clear previous message before setting new one to ensure it's read
            announcer.textContent = '';
            // Slight delay can sometimes help ensure the change is picked up
            setTimeout(() => {
                announcer.textContent = message;
                 // Optionally clear after a while if messages are transient
                 // setTimeout(() => { announcer.textContent = ''; }, 3000);
            }, 50);
        }
    }

    // Make utility function globally available if needed by other scripts or inline event handlers
    // window.announceToScreenReader = announceToScreenReader; // Uncomment if needed globally

    // Utility: Screen reader only class and other common styles (ensure this runs once)
    if (!document.getElementById('common-utility-styles')) {
        const utilityStyles = document.createElement('style');
        utilityStyles.id = 'common-utility-styles';
        utilityStyles.textContent = `
            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border-width: 0;
            }
            
            nav a.active { /* More specific selector if needed */
                font-weight: bold;
                /* text-decoration: underline; */ /* Example active style */
            }
            
            .dropdown.open > .dropdown-content { /* Ensure .dropdown-content exists */
                display: block;
            }

            /* Add other minimal critical CSS needed by JS if any */
        `;
        document.head.appendChild(utilityStyles);
    }

})();
