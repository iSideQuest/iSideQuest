// Collection detail/editor behavior. UI, callbacks, and state stay feature-scoped.
import { collectionState, saveCollectionRecord, deleteCollectionRecord } from './collection-store.js?v=352';
import { COLLECTION_CATEGORIES, COLLECTION_MECHANICS, renderCollection, starsHTML, formatRating } from './collection-list.js?v=352';

const collectionEditorServices = {
  escapeHtml: value => value == null ? '' : String(value),
  haptic: () => {},
  showAlert: message => { if (window.showAlert) window.showAlert(message); },
  showConfirm: message => window.confirm(message),
  getPendingUPC: () => '',
  setPendingUPC: () => {},
  getPhotoData: () => '',
  setPhotoData: () => {},
  updatePhotoPreview: () => {},
  closePhoto: () => {},
};
export function configureCollectionEditor(services = {}) {
  Object.assign(collectionEditorServices, services);
}

let collectionEditingId = null;
let collectionEditCats = new Set();
let collectionEditMechs = new Set();

window.addGameFromDatabase = function(game) {
  const catMap = { 'cooperative': 'coop', 'co-op': 'coop', 'competitive': 'competitive', 'party': 'party', 'solo': 'solo', 'teams': 'teams' };
  const mechMap = { 'deck-building': 'deck-builder', 'deck builder': 'deck-builder', 'worker-placement': 'worker-placement', 'worker placement': 'worker-placement', 'area-control': 'area-control', 'area control': 'area-control', 'drafting': 'drafting', 'card-game': 'card-game', 'card game': 'card-game', 'dice': 'dice', 'engine-building': 'engine-building', 'engine building': 'engine-building', 'deduction': 'deduction' };
  const cats = new Set();
  const mechs = new Set();
  (game.categories || []).forEach(c => {
    const mapped = catMap[c.toLowerCase()];
    if (mapped) cats.add(mapped);
    const mechMapped = mechMap[c.toLowerCase()];
    if (mechMapped) mechs.add(mechMapped);
  });

  collectionEditingId = null;
  document.getElementById('collection-edit-title').textContent = 'Add Game';
  document.getElementById('ce-name').value = game.name || '';
  document.getElementById('ce-min').value = game.minPlayers || 2;
  document.getElementById('ce-max').value = game.maxPlayers || 4;
  document.getElementById('ce-time').value = game.playTime || '';
  document.getElementById('ce-notes').value = '';
  document.getElementById('collection-edit-error').style.display = 'none';
  collectionEditCats = cats;
  collectionEditMechs = mechs;
  if (game.upc) collectionEditorServices.setPendingUPC(game.upc);
  renderCollectionEditChips();
  // Fresh staging — never inherit a photo/rating from a previously edited game
  collectionEditorServices.setPhotoData('');
  collectionEditorServices.updatePhotoPreview();
  collectionEditRating = 0;
  renderCollectionRating();
  const camEl = document.getElementById('ce-photo-camera');
  if (camEl) camEl.value = '';
  const galEl = document.getElementById('ce-photo-file');
  if (galEl) galEl.value = '';

  document.getElementById('collection-db-search').style.display = 'none';
  document.getElementById('collection-edit-overlay').classList.add('show');
};

let collectionEditRating = 0;
let collectionRatingScrub = false;
function collectionRatingFromEvent(e) {
  const el = document.getElementById('ce-rating-stars');
  if (!el || !e) return collectionEditRating;
  const r = el.getBoundingClientRect();
  if (!r.width) return collectionEditRating;
  const x = Math.min(Math.max(0, e.clientX - r.left), r.width);
  return Math.min(10, Math.max(0, Math.round(x / r.width * 20) / 2));
}
function paintCollectionRating(v) {
  const el = document.getElementById('ce-rating-stars');
  if (!el) return;
  el.querySelectorAll('[data-star]').forEach(b => {
    const i = parseInt(b.getAttribute('data-star'), 10);
    const fill = Math.min(1, Math.max(0, v - (i - 1)));
    const ov = b.querySelector('.ce-star-fill');
    if (ov) ov.style.width = (fill * 100) + '%';
  });
  const num = document.getElementById('ce-rating-num');
  if (num) num.textContent = formatRating(v);
}
function renderCollectionRating() {
  const el = document.getElementById('ce-rating-stars');
  if (!el) return;
  el.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const fill = Math.min(1, Math.max(0, collectionEditRating - (i - 1)));
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-star', String(i));
    b.style.cssText = 'background:none;border:none;padding:0.1rem;cursor:pointer;font-size:1.35rem;line-height:1;color:rgba(255,255,255,0.18);';
    b.innerHTML = '<span style="position:relative;">★<span class="ce-star-fill" style="position:absolute;left:0;top:0;width:' + (fill * 100) + '%;overflow:hidden;color:#fbbf24;">★</span></span>';
    el.appendChild(b);
  }
  const num = document.getElementById('ce-rating-num');
  if (num) num.textContent = formatRating(collectionEditRating);
}
// Tap to set, or drag horizontally across the stars (halves snap automatically)
window.scrubCollectionRatingStart = function(e) {
  collectionRatingScrub = true;
  collectionEditRating = collectionRatingFromEvent(e);
  paintCollectionRating(collectionEditRating);
  collectionEditorServices.haptic(5);
  window._suppressGlobalHapticUntil = Date.now() + 1000;
  try { e.preventDefault(); } catch {}
};
window.scrubCollectionRatingMove = function(e) {
  if (!collectionRatingScrub) return;
  const v = collectionRatingFromEvent(e);
  if (v !== collectionEditRating) {
    collectionEditRating = v;
    paintCollectionRating(v);
    collectionEditorServices.haptic(5);
    window._suppressGlobalHapticUntil = Date.now() + 1000;
  }
  try { e.preventDefault(); } catch {}
};
window.scrubCollectionRatingEnd = function(e) {
  if (!collectionRatingScrub) return;
  collectionRatingScrub = false;
  renderCollectionRating();
};
window.clearCollectionRating = function() {
  collectionEditRating = 0;
  renderCollectionRating();
};

// ── COLLECTION GAME DETAIL (bigger view, Back + Edit) ──
window.openCollectionDetail = function(id) {
  const game = collectionState.games.find(g => g.id === id);
  if (!game) return;
  const ratingVal = typeof game.rating === 'number' ? game.rating : 0;
  const metaBits = [];
  if (game.minPlayers && game.maxPlayers) metaBits.push('👥 ' + game.minPlayers + '–' + game.maxPlayers + ' players');
  if (game.playTime) metaBits.push('⏱ ' + game.playTime);
  const catLabels = (game.categories || []).map(k => {
    const def = COLLECTION_CATEGORIES.find(c => c.key === k);
    return def ? '<span class="collection-game-tag cat">' + def.icon + ' ' + def.label + '</span>' : '';
  }).join('');
  const mechLabels = (game.mechanics || []).map(k => {
    const def = COLLECTION_MECHANICS.find(m => m.key === k);
    return def ? '<span class="collection-game-tag">' + def.icon + ' ' + def.label + '</span>' : '';
  }).join('');
  const tagsHtml = (catLabels || mechLabels) ? '<div class="collection-game-tags" style="justify-content:center;">' + catLabels + mechLabels + '</div>' : '';
  const body = document.getElementById('collection-detail-body');
  body.innerHTML =
    (game.photo ? '<img src="' + game.photo + '" alt="" style="width:100%;height:auto;border-radius:0.75rem;margin-bottom:0.6rem;">' : '') +
    '<div class="collection-game-name" style="font-size:1.2rem;">' + collectionEditorServices.escapeHtml(game.name || 'Untitled') + '</div>' +
    '<div class="collection-game-rating" style="font-size:1rem;">' + starsHTML(ratingVal, '1.05rem') + '<span>' + formatRating(ratingVal) + '</span></div>' +
    (metaBits.length ? '<div class="collection-game-meta" style="text-align:center;">' + metaBits.join(' · ') + '</div>' : '') +
    tagsHtml +
    (game.notes ? '<div style="font-size:0.85rem;color:var(--text);margin-top:0.6rem;white-space:pre-wrap;word-break:break-word;text-align:left;">' + collectionEditorServices.escapeHtml(game.notes) + '</div>' : '') +
    (game.upc ? '<div style="font-size:0.72rem;color:var(--muted);margin-top:0.6rem;">Barcode: ' + collectionEditorServices.escapeHtml(game.upc) + '</div>' : '');
  const editBtn = document.getElementById('collection-detail-edit-btn');
  if (editBtn) editBtn.onclick = () => { window.closeCollectionDetail(); window.openCollectionEdit(id); };
  const delBtn = document.getElementById('collection-detail-delete-btn');
  if (delBtn) delBtn.onclick = async () => { window.closeCollectionDetail(); await window.deleteCollectionGame(id); };
  document.getElementById('collection-library').style.display = 'none';
  document.getElementById('collection-detail').style.display = '';
  const modal = document.querySelector('#collection-overlay .tools-modal');
  if (modal) modal.scrollTop = 0;
};
window.closeCollectionDetail = function() {
  document.getElementById('collection-detail').style.display = 'none';
  document.getElementById('collection-overlay').style.display = 'none';
  if (window._shelfReturn) {
    window._shelfReturn = false;
    if (window.showScreen) window.showScreen('collection-shelf');
    if (window.renderShelf) window.renderShelf();
  } else {
    document.getElementById('collection-library').style.display = '';
  }
};

window.openCollectionEdit = function(id) {
  collectionEditingId = id || null;
  const game = id ? collectionState.games.find(g => g.id === id) : null;
  document.getElementById('collection-edit-title').textContent = game ? 'Edit Game' : 'Add Game';
  document.getElementById('ce-name').value = game ? game.name : '';
  document.getElementById('ce-min').value = game ? (game.minPlayers || 2) : 2;
  document.getElementById('ce-max').value = game ? (game.maxPlayers || 4) : 4;
  document.getElementById('ce-time').value = game ? (game.playTime || '') : '';
  document.getElementById('ce-notes').value = game ? (game.notes || '') : '';
  document.getElementById('collection-edit-error').style.display = 'none';
  collectionEditCats = new Set(game ? (game.categories || []) : []);
  collectionEditMechs = new Set(game ? (game.mechanics || []) : []);
  collectionEditorServices.setPhotoData(game && game.photo ? game.photo : '');
  collectionEditorServices.updatePhotoPreview();
  collectionEditorServices.setPendingUPC(game && game.upc ? game.upc : '');
  collectionEditRating = game && typeof game.rating === 'number' ? game.rating : 0;
  renderCollectionRating();
  const camEl = document.getElementById('ce-photo-camera');
  if (camEl) camEl.value = '';
  const galEl = document.getElementById('ce-photo-file');
  if (galEl) galEl.value = '';
  renderCollectionEditChips();
  document.getElementById('collection-edit-overlay').classList.add('show');
};
window.closeCollectionEdit = function() {
  collectionEditorServices.closePhoto();
  document.getElementById('collection-edit-overlay').classList.remove('show');
  document.getElementById('collection-detail').style.display = 'none';
  document.getElementById('collection-db-search').style.display = 'none';
  document.getElementById('collection-library').style.display = '';
  renderCollection();
};

function renderCollectionEditChips() {
  const catEl = document.getElementById('ce-categories');
  if (catEl) {
    catEl.innerHTML = COLLECTION_CATEGORIES.map(c =>
      '<button class="collection-chip' + (collectionEditCats.has(c.key) ? ' active' : '') + '" onclick="toggleEditCat(\'' + c.key + '\')">' + c.icon + ' ' + c.label + '</button>'
    ).join('');
  }
  const mechEl = document.getElementById('ce-mechanics');
  if (mechEl) {
    mechEl.innerHTML = COLLECTION_MECHANICS.map(m =>
      '<button class="collection-chip' + (collectionEditMechs.has(m.key) ? ' active' : '') + '" onclick="toggleEditMech(\'' + m.key + '\')">' + m.icon + ' ' + m.label + '</button>'
    ).join('');
  }
}
window.toggleEditCat = function(key) {
  collectionEditCats.has(key) ? collectionEditCats.delete(key) : collectionEditCats.add(key);
  renderCollectionEditChips();
};
window.toggleEditMech = function(key) {
  collectionEditMechs.has(key) ? collectionEditMechs.delete(key) : collectionEditMechs.add(key);
  renderCollectionEditChips();
};

window.saveCollectionGame = async function() {
  const name = (document.getElementById('ce-name').value || '').trim();
  if (!name) {
    const errEl = document.getElementById('collection-edit-error');
    errEl.style.display = 'block';
    errEl.textContent = 'Please enter a game name.';
    return;
  }
  const minP = parseInt(document.getElementById('ce-min').value, 10) || 2;
  const maxP = parseInt(document.getElementById('ce-max').value, 10) || minP;
  const photoDataUrl = collectionEditorServices.getPhotoData();
  const pendingUPC = collectionEditorServices.getPendingUPC();
  const game = {
    id: collectionEditingId || ('cg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    name: name,
    minPlayers: Math.min(minP, maxP),
    maxPlayers: Math.max(minP, maxP),
    playTime: (document.getElementById('ce-time').value || '').trim(),
    notes: (document.getElementById('ce-notes').value || '').trim(),
    categories: [...collectionEditCats],
    mechanics: [...collectionEditMechs],
    rating: collectionEditRating,
    ...(photoDataUrl ? { photo: photoDataUrl } : {}),
    ...(pendingUPC ? { upc: pendingUPC } : {})
  };
  const syncError = await saveCollectionRecord(game, photoDataUrl);
  if (syncError) collectionEditorServices.showAlert('Could not sync this game to your account. It is saved on this device only.');
  window.closeCollectionEdit();
  renderCollection();
};

window.deleteCollectionGame = async function(id) {
  if (!await collectionEditorServices.showConfirm('Remove this game from your collection?')) return;
  const syncError = await deleteCollectionRecord(id);
  if (syncError) collectionEditorServices.showAlert('Could not remove this game from your account. It was removed on this device only.');
  renderCollection();
};
