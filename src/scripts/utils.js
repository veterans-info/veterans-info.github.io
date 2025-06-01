// utils.js - Shared utilities
export const Utils = {
  // Copy to clipboard with fallback
  async copyToClipboard(text) {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  },
  
  // Save progress to localStorage
  saveProgress(key, data) {
    try {
      localStorage.setItem(`vets-pref-${key}`, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('Could not save progress:', e);
      return false;
    }
  },
  
  // Load progress from localStorage
  loadProgress(key) {
    try {
      const data = localStorage.getItem(`vets-pref-${key}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Could not load progress:', e);
      return null;
    }
  },
  
  // Format date consistently
  formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }
};

export class ContentManager {
  constructor() {
    this.cache = new Map();
  }
  
  async loadSection(sectionId) {
    if (this.cache.has(sectionId)) {
      return this.cache.get(sectionId);
    }
    
    try {
      const response = await fetch('/data/content.json');
      const data = await response.json();
      
      if (data.sections[sectionId]) {
        this.cache.set(sectionId, data.sections[sectionId]);
        return data.sections[sectionId];
      }
    } catch (error) {
      console.error('Failed to load content:', error);
    }
    
    return null;
  }
  
  renderSection(sectionData) {
    if (!sectionData) return '';

    const lastUpdated = sectionData.lastUpdated ? `<p class="section-updated">Last updated: <time datetime="${sectionData.lastUpdated}">${Utils.formatDate(new Date(sectionData.lastUpdated))}</time></p>` : '';

    return `
      <section id="${sectionData.id || ''}" class="section" data-section="${sectionData.id || ''}">
        <div class="container">
          <header class="section-header">
            <h2 class="section-title">${sectionData.title || ''}</h2>
            ${lastUpdated}
          </header>
          
          <div class="section-content" data-copyable="true">
            ${this.renderContent(sectionData.content)}
          </div>
          
          <footer class="section-footer">
            <button class="copy-button" data-copy-target="${sectionData.id || ''}">
              <span class="copy-icon">📋</span>
              <span class="copy-text">Copy Section</span>
            </button>
          </footer>
        </div>
      </section>
    `;
  }

  renderContent(content) {
    let html = '';

    if (typeof content === 'string') {
      html += `<p>${content}</p>`;
    } else if (Array.isArray(content)) {
      content.forEach(item => {
        if (typeof item === 'string') {
          html += `<p>${item}</p>`;
        } else if (typeof item === 'object') {
          if (item.title) {
            html += `<h4>${item.title}</h4>`;
          }
          if (item.description) {
            html += `<p>${item.description}</p>`;
          }
          if (item.details && Array.isArray(item.details)) {
            html += '<ul>';
            item.details.forEach(detail => {
              html += `<li>${this.renderContent(detail)}</li>`;
            });
            html += '</ul>';
          }
          if (item.q && item.a) { // For FAQ items
            html += `<div class="faq-item"><h5>${item.q}</h5><p>${item.a}</p></div>`;
          }
          if (item.url && item.text) { // For related links
            html += `<p><a href="${item.url}" target="_blank" rel="noopener">${item.text}</a></p>`;
          }
        }
      });
    } else if (typeof content === 'object') {
      // Handle overview, requirements, exceptions, relatedLinks
      if (content.overview) {
        html += `<p>${content.overview}</p>`;
      }
      if (content.requirements && Array.isArray(content.requirements)) {
        html += '<h3>Requirements:</h3>';
        content.requirements.forEach(req => {
          html += this.renderContent(req);
        });
      }
      if (content.exceptions && Array.isArray(content.exceptions)) {
        html += '<h3>Exceptions:</h3>';
        content.exceptions.forEach(exc => {
          html += this.renderContent(exc);
        });
      }
      if (content.relatedLinks && Array.isArray(content.relatedLinks)) {
        html += '<h3>Related Links:</h3><ul>';
        content.relatedLinks.forEach(link => {
          html += `<li><a href="${link.url}" target="_blank" rel="noopener">${link.text}</a></li>`;
        });
        html += '</ul>';
      }
    }
    return html;
  }
}
