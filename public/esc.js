// Escape HTML — un punto solo per tutte e tre le superfici (§2.3).
// In chat il testo arriva da novanta telefoni: nessun innerHTML con testo
// utente non escapato, mai, nemmeno "tanto è solo un nome".
function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
