// Üretim derlemesine Content-Security-Policy ekler (dev sunucusunda devre dışı: HMR satır içi betik kullanır).
export function cspPlugin({ inlineScripts = false } = {}) {
  const script = inlineScripts ? "'self' 'unsafe-inline'" : "'self'";
  const policy = [
    "default-src 'none'",
    `script-src ${script}`,
    "style-src 'self' 'unsafe-inline'", // JS koltuk/ipucu konumlarını stil özniteliğiyle yazar
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src blob:",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
  ].join('; ');
  return {
    name: 'arena-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`);
    },
  };
}
