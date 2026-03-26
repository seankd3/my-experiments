import themeCSS from "./theme.css?raw";

interface SrcdocOptions {
  html: string;
  css: string;
  js: string;
  libraryComponents?: Array<{ name: string; html: string; css: string; js: string }>;
}

export function buildSrcdoc({ html, css, js, libraryComponents }: SrcdocOptions): string {
  // Collect library CSS and JS
  const libCSS = (libraryComponents || []).map((c) => c.css).filter(Boolean).join("\n");
  const libJS = (libraryComponents || [])
    .map(
      (c) =>
        `/* Component: ${c.name} */\n${c.js || ""}`
    )
    .filter((s) => s.trim())
    .join("\n");
  const libHTML = (libraryComponents || [])
    .map((c) => `<template id="component-${c.name}">${c.html}</template>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
${themeCSS}
</style>
<style>
${libCSS}
</style>
<style>
${css}
</style>
</head>
<body>
${libHTML}
${html}
<script>
// Auto-resize: report height to parent
function reportHeight() {
  const height = document.documentElement.scrollHeight;
  window.parent.postMessage({ type: 'resize', height }, '*');
}

// Observe DOM changes for resize
const resizeObserver = new ResizeObserver(() => reportHeight());
resizeObserver.observe(document.body);

// Report on load
window.addEventListener('load', () => {
  reportHeight();
  setTimeout(reportHeight, 100);
  setTimeout(reportHeight, 500);
  setTimeout(reportHeight, 1500);
});

// Error reporting
window.onerror = function(msg, src, line, col, err) {
  window.parent.postMessage({
    type: 'error',
    message: msg + (line ? ' (line ' + line + ')' : '')
  }, '*');
};

// Library JS
${libJS}
</script>
<script>
// Claude's generated JS
try {
  ${js}
} catch(e) {
  window.parent.postMessage({ type: 'error', message: e.message }, '*');
}
</script>
</body>
</html>`;
}
