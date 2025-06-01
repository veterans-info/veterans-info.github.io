// Main site JavaScript
(function () {
    'use strict';

    // Loading states management
    const loadingStates = new Map();
    
    // Debounce utility
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Fade in element utility
    function fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        element.style.transition = `opacity ${duration}ms ease-in-out`;
        
        // Force reflow
        element.offsetHeight;
        
        element.style.opacity = '1';
        
        return new Promise(resolve => {
            setTimeout(resolve, duration);
        });
    }

    // Fade out element utility
    function fadeOut(element, duration = 300) {
        element.style.transition = `opacity ${duration}ms ease-in-out`;
        element.style.opacity = '0';
        
        return new Promise(resolve => {
            setTimeout(() => {
                element.style.display = 'none';
                resolve();
            }, duration);
        });
    }

    // Add loading indicator
    function showLoading(identifier) {
        loadingStates.set(identifier, true);
        const loader = document.createElement('div');
        loader.className = 'loading-indicator';
        loader.id = `loading-${identifier}`;
        loader.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loader);
        fadeIn(loader, 200);
    }

    // Remove loading indicator
    function hideLoading(identifier) {
        loadingStates.delete(identifier);
        const loader = document.getElementById(`loading-${identifier}`);
        if (loader) {
            fadeOut(loader, 200).then(() => {
                loader.remove();
            });
        }
    }

    // Initialize Intersection Observer for animations
    function initializeIntersectionObserver() {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    
                    // Optional: stop observing after animation
                    if (entry.target.dataset.animateOnce === 'true') {
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, observerOptions);

        // Observe elements with animation classes
        const animatedElements = document.querySelectorAll('.fade-in-up, .fade-in-down, .fade-in-left, .fade-in-right, .scale-in, [data-animate]');
        animatedElements.forEach(el => {
            observer.observe(el);
        });
    }

    // DOM Content Loaded
    document.addEventListener('DOMContentLoaded', async function () {
        showLoading('main');
        
        // Load header and footer first
        await Promise.all([loadHeader(), loadFooter()]);

        // Now initialize scripts that might depend on header/footer content
        initializeYear();
        initializeLastUpdated();
        initializeNavigation(); // If menu toggle is in header/footer, this needs them loaded
        initializeAccessibility();
        initializeAnalytics();
        initializeSmoothScroll();
        initializeIntersectionObserver();
        
        // Hide main loading indicator
        hideLoading('main');
        
        // Fade in main content
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.classList.add('content-loaded');
        }
    });

    // Load header HTML
    function loadHeader() {
        // Check if header already exists (e.g. if JS disabled, or for development)
        if (document.querySelector('header[role="banner"]')) {
            setActiveNavLink();
            initializeDropdowns();
            return Promise.resolve(); // Header already exists, resolve immediately
        }

        // Try multiple possible paths for the header file
        const headerPaths = ['header.html', './header.html', '/header.html'];
        
        return tryLoadFile(headerPaths)
            .then(data => {
                // Look for header placeholder first
                const headerPlaceholder = document.getElementById('header-placeholder');
                if (headerPlaceholder) {
                    // Create temporary container
                    const temp = document.createElement('div');
                    temp.innerHTML = data;
                    temp.style.opacity = '0';
                    headerPlaceholder.appendChild(temp);
                    
                    // Fade in
                    return fadeIn(temp, 300).then(() => {
                        headerPlaceholder.innerHTML = data;
                    });
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

                // Initialize dropdown functionality after header is loaded
                initializeDropdowns();
            })
            .catch(error => {
                console.error('Error loading header:', error);
                console.log('Current location:', window.location.href);
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
                    // Create temporary container
                    const temp = document.createElement('div');
                    temp.innerHTML = data;
                    temp.style.opacity = '0';
                    footerPlaceholder.appendChild(temp);
                    
                    // Fade in
                    return fadeIn(temp, 300).then(() => {
                        footerPlaceholder.innerHTML = data;
                    });
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
                console.log('Current location:', window.location.href);
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
            console.log(`Attempting to load: ${currentPath}`);
            
            return fetch(currentPath)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    console.log(`Successfully loaded: ${currentPath}`);
                    return response.text();
                })
                .catch(error => {
                    console.log(`Failed to load ${currentPath}:`, error.message);
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

    // Initialize dropdown menus with smooth transitions
    function initializeDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown > a');

        dropdowns.forEach(dropdown => {
            dropdown.addEventListener('click', function (e) {
                e.preventDefault();
                const expanded = this.getAttribute('aria-expanded') === 'true';
                const dropdownContent = this.nextElementSibling;

                // Close all other dropdowns with transition
                dropdowns.forEach(otherDropdown => {
                    if (otherDropdown !== this) {
                        otherDropdown.setAttribute('aria-expanded', 'false');
                        const otherContent = otherDropdown.nextElementSibling;
                        if (otherDropdown.parentElement) {
                            otherDropdown.parentElement.classList.remove('open');
                            if (otherContent) {
                                fadeOut(otherContent, 200);
                            }
                        }
                    }
                });

                // Toggle current dropdown with transition
                this.setAttribute('aria-expanded', !expanded);
                if (this.parentElement) {
                    if (!expanded) {
                        this.parentElement.classList.add('open');
                        if (dropdownContent) {
                            fadeIn(dropdownContent, 200);
                        }
                    } else {
                        this.parentElement.classList.remove('open');
                        if (dropdownContent) {
                            fadeOut(dropdownContent, 200);
                        }
                    }
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
                        const dropdownContent = this.nextElementSibling;
                        if (dropdownContent) {
                            fadeOut(dropdownContent, 200);
                        }
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
                        const dropdownContent = dropdown.nextElementSibling;
                        if (dropdownContent) {
                            fadeOut(dropdownContent, 200);
                        }
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
                        const dropdownContent = dropdown.nextElementSibling;
                        if (dropdownContent) {
                            fadeOut(dropdownContent, 200);
                        }
                    }
                });
            }
        });
    }

    // Initialize smooth scrolling
    function initializeSmoothScroll() {
        // Smooth scrolling for anchor links
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    e.preventDefault();
                    
                    // Calculate offset for fixed header
                    const header = document.querySelector('header');
                    const headerHeight = header ? header.offsetHeight : 0;
                    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });

                    setTimeout(() => {
                        targetElement.focus({ preventScroll: true });
                        announceToScreenReader(`Scrolled to ${targetElement.textContent || targetId}`);
                    }, 500);
                }
            });
        });

        // Debounced scroll event for performance
        const handleScroll = debounce(() => {
            const scrolled = window.pageYOffset > 100;
            document.body.classList.toggle('scrolled', scrolled);
            
            // Back to top button visibility
            const backToTopButton = document.querySelector('.back-to-top');
            if (backToTopButton) {
                if (scrolled) {
                    fadeIn(backToTopButton, 200);
                } else {
                    fadeOut(backToTopButton, 200);
                }
            }
        }, 100);

        window.addEventListener('scroll', handleScroll);
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
        // Mobile menu toggle if implemented
        const menuToggle = document.querySelector('.menu-toggle');
        const nav = document.querySelector('nav ul');

        if (menuToggle && nav) {
            menuToggle.addEventListener('click', function () {
                const expanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', !expanded);
                
                if (!expanded) {
                    nav.classList.add('active');
                    fadeIn(nav, 300);
                } else {
                    fadeOut(nav, 300).then(() => {
                        nav.classList.remove('active');
                    });
                }
                
                announceToScreenReader(expanded ? 'Navigation menu collapsed' : 'Navigation menu expanded');
            });
        }
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
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            console.log('Analytics would initialize here');
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

    // Add utility styles
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
            
            nav a.active {
                font-weight: bold;
            }
            
            .dropdown.open > .dropdown-content {
                display: block;
            }

            /* Loading States */
            .loading-indicator {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 9999;
                background: rgba(255, 255, 255, 0.95);
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }

            .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Smooth Transitions */
            * {
                transition: color 0.3s ease, background-color 0.3s ease;
            }

            main {
                opacity: 0;
                transition: opacity 0.5s ease-in-out;
            }

            main.content-loaded {
                opacity: 1;
            }

            /* Animation Classes */
            .fade-in-up,
            .fade-in-down,
            .fade-in-left,
            .fade-in-right,
            .scale-in {
                opacity: 0;
                transition: opacity 0.6s ease, transform 0.6s ease;
            }

            .fade-in-up {
                transform: translateY(30px);
            }

            .fade-in-down {
                transform: translateY(-30px);
            }

            .fade-in-left {
                transform: translateX(-30px);
            }

            .fade-in-right {
                transform: translateX(30px);
            }

            .scale-in {
                transform: scale(0.9);
            }

            .fade-in-up.animate-in,
            .fade-in-down.animate-in,
            .fade-in-left.animate-in,
            .fade-in-right.animate-in,
            .scale-in.animate-in {
                opacity: 1;
                transform: translate(0) scale(1);
            }

            /* Back to Top Button */
            .back-to-top {
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                background: #003366;
                color: #fff;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                display: none;
                align-items: center;
                justify-content: center;
                text-decoration: none;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
                z-index: 1000;
            }

            .back-to-top:hover {
                background: #002244;
                transform: translateY(-3px);
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            }

            /* Header Styles */
            header {
                background-color: #003366;
                color: #fff;
                padding: 1rem 0;
                margin-bottom: 0;
                transition: all 0.3s ease;
            }

            body.scrolled header {
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }

            .header-content {
                max-width: 960px;
                margin: 0 auto;
                padding: 0 20px;
                text-align: center;
            }

            .header-content h1 {
                margin: 0 0 0.5rem 0;
                color: #fff;
                border-bottom: none;
            }

            .tagline {
                margin: 0;
                font-style: italic;
                opacity: 0.9;
            }

            /* Navigation Styles */
            nav {
                background-color: #002244;
                padding: 0;
            }

            nav ul {
                max-width: 960px;
                margin: 0 auto;
                padding: 0 20px;
                list-style: none;
                display: flex;
                flex-wrap: wrap;
            }

            nav li {
                position: relative;
                margin-bottom: 0;
            }

            nav a {
                display: block;
                padding: 1rem 1.5rem;
                color: #fff;
                text-decoration: none;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            nav a::before {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 3px;
                background-color: #0056b3;
                transform: translateX(-100%);
                transition: transform 0.3s ease;
            }

            nav a:hover::before,
            nav a:focus::before,
            nav a.active::before {
                transform: translateX(0);
            }

            nav a:hover,
            nav a:focus {
                background-color: #0056b3;
                text-decoration: none;
                color: #fff;
            }

            /* Dropdown styles */
            .dropdown-content {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                background-color: #002244;
                min-width: 200px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                z-index: 1000;
                opacity: 0;
                transform: translateY(-10px);
            }

            .dropdown:hover .dropdown-content,
            .dropdown:focus-within .dropdown-content {
                display: block;
            }

            .dropdown-content li {
                width: 100%;
            }

            .dropdown-content a {
                padding: 0.75rem 1rem;
                border-bottom: 1px solid #003366;
            }

            .dropdown-content a::before {
                display: none;
            }

            .dropdown-content a:hover {
                background-color: #0056b3;
            }

            /* Footer Styles */
            footer {
                background-color: #333;
                color: #fff;
                padding: 2rem 0 1rem 0;
                margin-top: 2rem;
            }

            .footer-content {
                max-width: 960px;
                margin: 0 auto;
                padding: 0 20px;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 2rem;
            }

            .footer-section h3 {
                color: #fff;
                margin-bottom: 1rem;
            }

            .footer-section ul {
                list-style: none;
                padding: 0;
            }

            .footer-section li {
                margin-bottom: 0.5rem;
            }

            .footer-section a {
                color: #ccc;
                transition: color 0.3s ease;
            }

            .footer-section a:hover {
                color: #fff;
            }

            .footer-bottom {
                max-width: 960px;
                margin: 2rem auto 0 auto;
                padding: 1rem 20px 0 20px;
                border-top: 1px solid #555;
                text-align: center;
                font-size: 0.9rem;
                color: #ccc;
            }

            /* Mobile Navigation */
            @media (max-width: 768px) {
                nav ul {
                    flex-direction: column;
                    padding: 0;
                }
                
                nav li {
                    width: 100%;
                }
                
                .dropdown-content {
                    position: static;
                    display: none;
                    box-shadow: none;
                    background-color: #001122;
                    transform: none;
                }
                
                .dropdown:hover .dropdown-content,
                .dropdown:focus-within .dropdown-content {
                    display: block;
                }
                
                .footer-content {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }

                .back-to-top {
                    bottom: 1rem;
                    right: 1rem;
                }
            }
        `;
        document.head.appendChild(utilityStyles);
    }

})();
