import { startApp } from './app.js';

startApp().catch((err) => {
  console.error(err);
  const el = document.getElementById('loading');
  if (!el) return;
  el.replaceChildren();
  const box = document.createElement('div');
  box.style.cssText = 'max-width:420px;text-align:center;padding:24px';
  const title = document.createElement('b');
  title.textContent = 'Salon yüklenemedi';
  const detail = document.createElement('small');
  detail.textContent = `WebGL desteklenmiyor olabilir. ${String(err?.message ?? err).slice(0, 200)}`;
  box.append(title, document.createElement('br'), detail);
  el.append(box);
});
