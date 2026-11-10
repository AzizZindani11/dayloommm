import assert from 'node:assert/strict';

const container = { innerHTML: '' };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
globalThis.document = {
  getElementById: (id) => (id === 'arena-view-content' ? container : null),
  querySelectorAll: () => []
};
globalThis.Image = class { };

const { ArenaController } = await import('../js/arena.js');
const { createDefaultState } = await import('../js/storage.js');

for (const ch of ['traveler', 'meliodas']) {
  const state = createDefaultState();
  state.profile.selectedCharacter = ch;
  const ctrl = new ArenaController({ getState: () => state, onSaveState() {}, onNotify() {} });
  container.innerHTML = '';
  ctrl.render();
  const h = container.innerHTML;
  assert.ok(h.includes('arena-character-carousel'), ch + ': carousel');
  assert.ok(h.includes('data-select-character="meliodas"'), ch + ': Meliodas card');
  assert.ok(h.includes('data-select-character="traveler"'), ch + ': Traveler card');
  assert.ok(h.includes('arena-prep-panel'), ch + ': prep panel');
  assert.ok(h.includes('btn-start-arena-battle'), ch + ': focus challenge');
  assert.ok(h.includes('btn-open-pvp-preview'), ch + ': PvP entry');
  assert.ok(h.includes('arena-room-box'), ch + ': training room');
  console.log('  [LULUS] Arena render lengkap untuk ' + ch + ' (' + h.length + ' chars)');
}

