document.addEventListener('DOMContentLoaded', function() {
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
    console.log("Website script loaded. Site: Veterans Info");
    // Future interactive tool logic will be primarily in tool.js
});
