// Main site JavaScript
(function () {
    'use strict';

    // DOM Content Loaded
    document.addEventListener('DOMContentLoaded', function () {
        loadHeader();
        initializeYear();
        initializeLastUpdated();
        initializeNavigation();
        initializeAccessibility();
        initializeAnalytics();
    });

    // Load header HTML
    function loadHeader() {
        // Only load header if it doesn't already exist (to avoid duplicate loading)
        if (!document.querySelector('header[role="banner"]')) {
            fetch('/header.html')
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
                });
        } else {
            // Header already exists, just initialize navigation
            setActiveNavLink();
            initializeDropdowns();
        }
    }

    // Set active navigation link
    function setActiveNavLink() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('nav a');

        navLinks.forEach(link => {
            // Remove any existing aria-current attributes
            link.removeAttribute('aria-current');
            link.classList.remove('active');

            // Check if this link matches current page
            if (link.getAttribute('href') === currentPath ||
                (currentPath === '/' && link.getAttribute('href') === '/') ||
                (currentPath === '/index.html' && link.getAttribute('href') === '/')) {
                link.setAttribute('aria-current', 'page');
                link.classList.add('active');
            }
        });
    }

    // Set footer
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
                if (lastScript) {
                    lastScript.insertAdjacentHTML('beforebegin', data);
                } else {
                    document.body.insertAdjacentHTML('beforeend', data);
                }
            })
            .catch(error => {
                console.error('Error loading footer:', error);
            });
    }

    // Initialize dropdown menus
    function initializeDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown > a');

        dropdowns.forEach(dropdown => {
            dropdown.addEventListener('click', function (e) {
                e.preventDefault();
                const expanded = this.getAttribute('aria-expanded') === 'true';

                // Close all other dropdowns
                dropdowns.forEach(otherDropdown => {
                    if (otherDropdown !== this) {
                        otherDropdown.setAttribute('aria-expanded', 'false');
                        otherDropdown.parentElement.classList.remove('open');
                    }
                });

                // Toggle current dropdown
                this.setAttribute('aria-expanded', !expanded);
                this.parentElement.classList.toggle('open');
            });

            // Handle keyboard navigation
            dropdown.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                } else if (e.key === 'Escape') {
                    this.setAttribute('aria-expanded', 'false');
                    this.parentElement.classList.remove('open');
                    this.blur();
                }
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.dropdown')) {
                dropdowns.forEach(dropdown => {
                    dropdown.setAttribute('aria-expanded', 'false');
                    dropdown.parentElement.classList.remove('open');
                });
            }
        });

        // Close dropdowns on escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                dropdowns.forEach(dropdown => {
                    dropdown.setAttribute('aria-expanded', 'false');
                    dropdown.parentElement.classList.remove('open');
                });
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
        // Mobile menu toggle if implemented
        const menuToggle = document.querySelector('.menu-toggle');
        const nav = document.querySelector('nav ul');

        if (menuToggle && nav) {
            menuToggle.addEventListener('click', function () {
                nav.classList.toggle('active');
                const expanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', !expanded);
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
                    targetElement.focus();
                }
            });
        });
    }

    // Accessibility enhancements
    function initializeAccessibility() {
        // Announce page changes for screen readers
        const announcer = document.createElement('div');
        announcer.setAttribute('role', 'status');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        announcer.id = 'live-announcer';
        document.body.appendChild(announcer);

        // Add skip to main content functionality
        const skipLink = document.querySelector('.skip-link');
        if (skipLink) {
            skipLink.addEventListener('click', function (e) {
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    e.preventDefault();
                    target.focus();
                    target.scrollIntoView();
                }
            });
        }

        // Add keyboard navigation hints
        const interactiveElements = document.querySelectorAll('a, button, input, select, textarea');
        interactiveElements.forEach(el => {
            if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
                const text = el.textContent || el.value || el.placeholder;
                if (!text || text.trim() === '') {
                    console.warn('Interactive element without accessible label:', el);
                }
            }
        });

        // Announce page load completion
        setTimeout(() => {
            announcer.textContent = 'Page loaded successfully';
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        }, 500);
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
            announcer.textContent = message;
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        }
    }

    // Make utility function globally available
    window.announceToScreenReader = announceToScreenReader;

    // Utility: Screen reader only class
    const srOnlyStyle = document.createElement('style');
    srOnlyStyle.textContent = `
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
        
        .active {
            font-weight: bold;
        }
        
        .dropdown.open .dropdown-content {
            display: block;
        }
    `;
    document.head.appendChild(srOnlyStyle);

})();
