// ============ UTILITIES ============
const el = id => document.getElementById(id);

const setButtonState = (btn, disabled, opacity = '1') => {
  btn.disabled = disabled;
  btn.style.opacity = opacity;
};

function showError(msg) {
  el('weatherContent').innerHTML = `<p class="muted">${msg}</p>`;
}

function updateDateDisplay() {
  const today = new Date();
  const dateStr = today.toLocaleDateString('de-DE', {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'});
  el('locationDate').textContent = dateStr;
}

// Generic card renderer for left/right layout
function renderCard(elementId, leftHTML, rightHTML, containerClass) {
  const rightContent = rightHTML ? `<div class="${containerClass}-right">${rightHTML}</div>` : '';
  el(elementId).innerHTML = `
    <div class="${containerClass}-container">
      <div class="${containerClass}-left">${leftHTML}</div>
      ${rightContent}
    </div>
  `;
}
