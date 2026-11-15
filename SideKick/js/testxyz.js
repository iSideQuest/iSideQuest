// Xyz Shelf module
import { collectionState, loadCollection, saveCollectionLocal } from './collection-store.js';

const XYZ_KEY_PREFIX = 'sk_xyz_';

let xyzState = { items: [] };

export function configureXyzShelf(services) {
  console.log('configureXyzShelf called');
}

function xyzKey() {
  const user = (window.currentUser || null);
  const uid = user && user.uid ? user.uid : 'guest';
  return XYZ_KEY_PREFIX + uid;
}

function loadXyzLocal() {
  try { return JSON.parse(localStorage.getItem(xyzKey()) || '[]'); } catch (e) { return []; }
}

function saveXyzLocal(list) {
  try { localStorage.setItem(xyzKey(), JSON.stringify(list)); } catch (e) {}
}

export async function loadXyz() {
  xyzState.items = loadXyzLocal();
  return xyzState.items;
}

export function openXyzShelf() {
  if (window.showScreen) window.showScreen('xyz-shelf');
  requestAnimationFrame(function() {
    loadXyz().then(function() { renderXyzShelf(); }).catch(function() { renderXyzShelf(); });
  });
}

export function closeXyzShelf() {
  if (window.showScreen) window.showScreen('profile');
}

export function renderXyzShelf() {
  const container = document.getElementById('xyz-shelf-container');
  if (!container) return;
  const items = xyzState.items || [];
  if (!items.length) {
    container.innerHTML = '<div class="xyz-empty">Your xyz shelf is empty.</div>';
    return;
  }
  const perRow = 3;
  const maxSlots = 12;
  const colors = ['#4a6fa5','#6a8f5a','#a56a4a','#8a5a8f','#5a8fa5','#a5a55a','#a55a6a','#5a5a8f'];
  let html = '<div class="xyz-unit">';
  for (let i = 0; i < maxSlots; i++) {
    const item = items[i] || null;
    if (item) {
      const color = colors[i % colors.length];
      const name = item.name || 'Item';
      const photo = item.photo ? '<img class="xyz-tile-photo" src="' + item.photo + '" alt="">' : '';
      html += '<div class="xyz-tile" style="background:' + color + ';" data-index="' + i + '">';
      html += '<div class="xyz-tile-name">' + name + '</div>';
      html += photo;
      html += '</div>';
    } else {
      html += '<div class="xyz-tile xyz-tile-empty"></div>';
    }
  }
  html += '</div>';
  container.innerHTML = html;
}

function renderXyzRatingStars(rating) {
  var container = document.getElementById('xyz-rating-stars');
  if (!container) return;
  var html = '';
  for (var i = 1; i <= 10; i++) {
    var full = rating >= i;
    var half = rating >= i - 0.5 && rating < i;
    var starColor = full ? '#ffcc00' : half ? '#b8960b' : '#555';
    var opacity = half ? '0.6' : '1';
    var starChar = (full || half) ? '\u2605' : '\u2606';
    html += '<span data-star="' + i + '" style="font-size:1.1rem;cursor:pointer;color:' + starColor + ';opacity:' + opacity + ';">' + starChar + '</span>';
  }
  container.innerHTML = html;
  var valEl = document.getElementById('xyz-rating-value');
  if (valEl) valEl.textContent = rating;
}

window.handleXyzRatingClick = function(e) {
  var star = e.target.closest('[data-star]');
  if (!star) return;
  var starNum = parseInt(star.getAttribute('data-star'));
  var rect = star.getBoundingClientRect();
  var clickX = e.clientX - rect.left;
  var isHalf = clickX < rect.width / 2;
  var rating = isHalf ? starNum - 0.5 : starNum;
  if (rating < 0) rating = 0;
  window._xyzRating = rating;
  renderXyzRatingStars(rating);
};

window.previewXyzGamePhoto = function(input) {
  if (!input || !input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var preview = document.getElementById('xyz-game-photo-preview');
    var img = document.getElementById('xyz-game-photo-img');
    if (preview) preview.style.display = 'block';
    if (img) img.src = e.target.result;
    window._xyzPhotoData = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
};

export function openXyzAddGame() {
  var overlay = document.getElementById('xyz-add-game-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'xyz-add-game-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '1rem';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:0.75rem;padding:1rem;max-width:90vw;max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;gap:0.6rem;width:100%;">' +
    '<div style="font-size:1.1rem;font-weight:800;color:var(--text);text-align:center;">Add Game</div>' +
    '<input id="xyz-game-name" placeholder="Game name" maxlength="40" style="width:100%;margin-bottom:0.3rem;">' +
    '<div style="font-size:0.72rem;color:var(--muted);text-align:center;margin-bottom:0.2rem;">Upload Image</div>' +
    '<div style="display:flex;gap:0.4rem;justify-content:center;margin-bottom:0.3rem;">' +
    '<button class="btn-secondary btn-sm" onclick="document.getElementById('xyz-game-photo').click()">Choose Image</button>' +
    '</div>' +
    '<input type="file" id="xyz-game-photo" accept="image/*" style="display:none;" onchange="previewXyzGamePhoto(this)">' +
    '<div id="xyz-game-photo-preview" style="display:none;text-align:center;margin-bottom:0.3rem;">' +
    '<img id="xyz-game-photo-img" alt="" style="width:6rem;height:6rem;object-fit:cover;border-radius:0.5rem;border:1px solid var(--border);margin:0 auto;">' +
    '</div>' +
    '<div style="font-size:0.72rem;color:var(--muted);text-align:center;margin-bottom:0.2rem;">Rating (0-10)</div>' +
    '<div id="xyz-rating-stars" style="display:flex;gap:0.15rem;justify-content:center;cursor:pointer;" onclick="handleXyzRatingClick(event)"></div>' +
    '<div style="text-align:center;font-size:0.85rem;color:var(--text);margin-bottom:0.3rem;"><span id="xyz-rating-value">0</span>/10</div>' +
    '<button class="btn-primary" style="width:100%;margin-top:0.5rem;" onclick="submitXyzGame()">Add</button>' +
    '<button class="btn-secondary btn-sm" style="width:100%;margin-top:0.3rem;" onclick="closeXyzAddGame()">Back</button>' +
    '</div>';
  overlay.style.display = 'flex';
  window._xyzRating = 0;
  window._xyzPhotoData = null;
  renderXyzRatingStars(0);
}

export function closeXyzAddGame() {
  var overlay = document.getElementById('xyz-add-game-overlay');
  if (overlay) overlay.style.display = 'none';
}

window.submitXyzGame = function() {
  var nameEl = document.getElementById('xyz-game-name');
  var name = nameEl ? nameEl.value.trim() : '';
  if (!name) {
    if (window.showAlert) window.showAlert('Enter a game name.');
    return;
  }
  var game = {
    id: 'xyz_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name,
    photo: window._xyzPhotoData || null,
    rating: window._xyzRating || 0,
    order: xyzState.items.length,
    createdAt: Date.now()
  };
  xyzState.items.push(game);
  try { localStorage.setItem(xyzKey(), JSON.stringify(xyzState.items)); } catch (e) {}
  window._xyzPhotoData = null;
  window._xyzRating = 0;
  closeXyzAddGame();
  renderXyzShelf();
  if (window.showAlert) window.showAlert('Game added!');
};

window.openXyzShelf = openXyzShelf;
window.closeXyzShelf = closeXyzShelf;
window.renderXyzShelf = renderXyzShelf;
window.openXyzAddGame = openXyzAddGame;
window.closeXyzAddGame = closeXyzAddGame;
window.closeXyzShelf = closeXyzShelf;
window.renderXyzShelf = renderXyzShelf;