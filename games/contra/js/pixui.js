/* Turns the DOM menu text into pixel-font images so the menus match the game art. */
(function (G) {
  'use strict';
  const PX = G.px;
  const OL = '#0b0d1a';
  function img(c, cls) { c.className = cls || ''; c.setAttribute('aria-hidden', 'true'); return c; }
  function logo() {
    const h1 = document.querySelector('.logo');
    if (!h1) return;
    h1.setAttribute('aria-label', 'Space Contra');
    h1.textContent = '';
    h1.appendChild(img(PX.logoImage('SPACE', 6, ['#ffffff', '#dce8ff', '#b0c4f0', '#86a0dc', '#6280c4', '#46629e', '#2e4478'], 2, '#141c44'), 'plogo'));
    h1.appendChild(img(PX.logoImage('CONTRA', 11, ['#fff4d0', '#ffd870', '#ffae34', '#f2741c', '#d04418', '#9a2a14', '#661a10'], 2, '#2a0a08'), 'plogo big'));
  }
  function buttons() {
    document.querySelectorAll('button').forEach((b) => {
      const label = b.textContent.trim();
      if (!label) return;
      b.setAttribute('aria-label', label);
      const prim = b.classList.contains('primary');
      b.textContent = '';
      b.appendChild(img(PX.textImage(label, { s: 2, c: prim ? '#ffe9d0' : '#cfe4ff', o: OL }), 'off'));
      b.appendChild(img(PX.textImage(label, { s: 2, c: '#ffffff', o: prim ? '#7a2a0a' : '#1a3a8a' }), 'on'));
    });
  }
  function headings() {
    document.querySelectorAll('.screen h2').forEach((h) => {
      const label = h.textContent.trim(), over = h.classList.contains('over');
      h.setAttribute('aria-label', label);
      h.textContent = '';
      h.appendChild(img(PX.textImage(label, { s: 5, c: '#ffffff', g: over ? ['#ffe0e0', '#ff5a5a'] : ['#ffffff', '#ffb36a'], o: OL, sh: over ? '#6a0a0a' : '#7a2a0a' }), 'ph'));
    });
  }
  logo(); buttons(); headings();
})((window.SGS = window.SGS || {}));
