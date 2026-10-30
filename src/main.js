import { startApp } from './app.js';

startApp().catch((err) => {
  console.error(err);
  const el = document.getElementById('loading');
  if (el) {
    el.innerHTML = `<div style="max-width:420px;text-align:center;padding:24px">
      <b>Salon yüklenemedi</b><br><small>WebGL desteklenmiyor olabilir.<br>${String(err.message ?? err)}</small></div>`;
  }
});
