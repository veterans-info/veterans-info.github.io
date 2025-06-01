// main.js - Core functionality
import { Utils, ContentManager } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize navigation
  initializeNavigation();
  
  // Initialize collapsibles
  initializeCollapsibles();
  
  // Track page views (privacy-friendly)
  trackPageView();

  // Initialize content loading
  initializeContentLoading();

  // Initialize copy buttons
  initializeCopyButtons();
});

function trackPageView() {
  // Placeholder for privacy-friendly page view tracking
  console.log('Page view tracked.');
}

function initializeNavigation() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav-links');
  
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', !isOpen);
      nav.classList.toggle('nav-links--open');
    });
  }
}

function initializeCopyButtons() {
  document.querySelectorAll('[data-copy-target]').forEach(button => {
    button.addEventListener('click', async (e) => {
      const targetId = e.currentTarget.dataset.copyTarget;
      const target = document.getElementById(targetId);
      
      if (target) {
        const content = target.querySelector('[data-copyable]');
        if (content) {
          await Utils.copyToClipboard(content.innerText);
          
          // Visual feedback
          button.classList.add('copy-button--success');
          button.querySelector('.copy-text').textContent = 'Copied!';
          
          setTimeout(() => {
            button.classList.remove('copy-button--success');
            button.querySelector('.copy-text').textContent = 'Copy Section';
          }, 2000);
        }
      }
    });
  });
}

function initializeCollapsibles() {
  document.querySelectorAll('.collapsible__header').forEach(header => {
    header.addEventListener('click', () => {
      const collapsible = header.closest('.collapsible');
      collapsible.classList.toggle('collapsible--open');
      
      // Update aria-expanded
      const isOpen = collapsible.classList.contains('collapsible--open');
      header.setAttribute('aria-expanded', isOpen);
    });
  });
}

async function initializeContentLoading() {
  const contentManager = new ContentManager();
  const mainElement = document.getElementById('main'); // Assuming 'main' is the ID of your main content area

  if (!mainElement) {
    console.error('Main content area not found.');
    return;
  }

  // Determine which section to load based on the current page URL
  const path = window.location.pathname;
  let sectionIdToLoad = null;

  if (path.includes('eligibility.html')) {
    sectionIdToLoad = 'eligibility';
  } else if (path.includes('preferences.html')) {
    sectionIdToLoad = 'preferences';
  } else if (path.includes('documentation.html')) {
    sectionIdToLoad = 'documentation';
  } else if (path.includes('faq.html')) {
    sectionIdToLoad = 'faq';
  } else if (path === '/' || path === '/index.html') {
    // For the index page, load multiple sections or a default one
    // For now, let's assume index.html might display 'overview' or similar
    sectionIdToLoad = 'overview'; // Example, adjust as per content.json
  }

  if (sectionIdToLoad) {
    const sectionData = await contentManager.loadSection(sectionIdToLoad);
    if (sectionData) {
      // Use innerHTML to append the rendered string
      mainElement.innerHTML += contentManager.renderSection(sectionData);
      // Re-initialize copy buttons after new content is added
      initializeCopyButtons();
    }
  }
}
