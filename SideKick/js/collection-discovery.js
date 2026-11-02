// Collection database search and barcode discovery. Editor/storage are injected modules.
import { collectionState } from './collection-store.js?v=352';

const collectionDiscoveryServices = {
  getDb: () => null,
  get: async () => { throw new Error('Collection discovery is not configured'); },
  ref: () => null,
  escapeHtml: value => value == null ? '' : String(value),
  showAlert: message => { if (window.showAlert) window.showAlert(message); },
  setPendingUPC: () => {},
  addGameFromDatabase: game => { if (window.addGameFromDatabase) window.addGameFromDatabase(game); },
};
export function configureCollectionDiscovery(services = {}) {
  Object.assign(collectionDiscoveryServices, services);
}

let gameDatabaseCache = null;
let gameDatabaseLoading = false;

async function loadGameDatabase() {
  if (gameDatabaseCache) return gameDatabaseCache;
  if (gameDatabaseLoading) return [];
  gameDatabaseLoading = true;
  try {
    if (!collectionDiscoveryServices.getDb()) { gameDatabaseCache = []; gameDatabaseLoading = false; return []; }
    const snap = await collectionDiscoveryServices.get(collectionDiscoveryServices.ref(collectionDiscoveryServices.getDb(), 'games'));
    if (snap.exists()) {
      const obj = snap.val();
      gameDatabaseCache = Object.entries(obj).map(([id, g]) => ({ id, ...g }));
    } else {
      gameDatabaseCache = [];
    }
  } catch (e) {
    console.warn('Could not load game database:', e.message);
    gameDatabaseCache = [];
  }
  gameDatabaseLoading = false;
  return gameDatabaseCache;
}

// ── BARCODE SCAN TO ADD (EAN-13 / UPC-A via Quagga) ──
let _barcodeQuaggaOn = false;
// Quagga sizes its own video/canvas — force them to fill our fixed frame
function fitBarcodeViewport() {
  const vp = document.querySelector('#barcode-viewport');
  if (!vp) return;
  vp.querySelectorAll('video,canvas').forEach(el => {
    el.style.position = 'absolute';
    el.style.top = '0'; el.style.left = '0';
    el.style.width = '100%'; el.style.height = '100%';
    el.style.objectFit = 'cover';
  });
}
function normUPC(s) {
  return String(s || '').replace(/\D/g, '').replace(/^0+/, '');
}
window.openBarcodeScanner = function() {
  document.getElementById('barcode-scanner-overlay').classList.add('show');
  const vp0 = document.querySelector('#barcode-viewport');
  if (vp0) vp0.querySelectorAll('video,canvas').forEach(el => { try { el.remove(); } catch {} });
  const statusEl = document.getElementById('barcode-status');
  if (typeof window.Quagga === 'undefined') {
    if (statusEl) statusEl.textContent = 'Scanner needs internet on first use — or use Photo Instead.';
    return;
  }
  if (statusEl) statusEl.textContent = 'Starting camera…';
  try {
    window.Quagga.init({
      inputStream: { name: 'Live', type: 'LiveStream', target: document.querySelector('#barcode-viewport'), constraints: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
      decoder: { readers: ['ean_reader', 'upc_reader'] },
      locate: true
    }, (err) => {
      if (err) {
        if (statusEl) statusEl.textContent = 'Camera unavailable — try Photo Instead.';
        return;
      }
      _barcodeQuaggaOn = true;
      window.Quagga.start();
      fitBarcodeViewport();
      setTimeout(fitBarcodeViewport, 500);
      if (statusEl) statusEl.textContent = 'Scanning…';
    });
    try { window.Quagga.offDetected(handleBarcodeDetected); } catch {}
    window.Quagga.onDetected(handleBarcodeDetected);
  } catch (e) {
    if (statusEl) statusEl.textContent = 'Camera unavailable — try Photo Instead.';
  }
};
function handleBarcodeDetected(result) {
  const code = result && result.codeResult && result.codeResult.code;
  if (!code) return;
  stopBarcodeScanner();
  handleScannedUPC(code);
}
function stopBarcodeScanner() {
  try {
    if (typeof window.Quagga !== 'undefined' && _barcodeQuaggaOn) {
      try { window.Quagga.offDetected(handleBarcodeDetected); } catch {}
      window.Quagga.stop();
    }
  } catch {}
  _barcodeQuaggaOn = false;
}
window.closeBarcodeScanner = function() {
  stopBarcodeScanner();
  document.getElementById('barcode-scanner-overlay').classList.remove('show');
  const f = document.getElementById('barcode-file');
  if (f) f.value = '';
};
window.handleBarcodePhoto = function(input) {
  const file = input && input.files && input.files[0];
  if (input) input.value = '';
  if (!file) return;
  if (typeof window.Quagga === 'undefined') { collectionDiscoveryServices.showAlert('Scanner needs internet on first use.'); return; }
  const statusEl = document.getElementById('barcode-status');
  if (statusEl) statusEl.textContent = 'Reading photo…';
  const reader = new FileReader();
  reader.onload = () => {
    try {
      window.Quagga.decodeSingle({
        src: reader.result, numOfWorkers: 0,
        inputStream: { size: 800 },
        decoder: { readers: ['ean_reader', 'upc_reader'] }
      }, (result) => {
        const code = result && result.codeResult && result.codeResult.code;
        if (code) { stopBarcodeScanner(); handleScannedUPC(code); }
        else if (statusEl) statusEl.textContent = 'No barcode found — try again.';
      });
    } catch (e) {
      if (statusEl) statusEl.textContent = 'No barcode found — try again.';
    }
  };
  reader.onerror = () => { if (statusEl) statusEl.textContent = 'Could not read that photo.'; };
  reader.readAsDataURL(file);
};
async function handleScannedUPC(rawCode) {
  const code = String(rawCode || '').replace(/\D/g, '');
  window.closeBarcodeScanner();
  if (!code) return;
  // 1) Already in your library?
  const owned = collectionState.games.find(g => g.upc && normUPC(g.upc) === normUPC(code));
  if (owned) {
    collectionDiscoveryServices.showAlert('You already own this game.');
    window.openCollectionDetail(owned.id);
    return;
  }
  // 2) Match the shared game database
  try { await loadGameDatabase(); } catch {}
  const match = (gameDatabaseCache || []).find(g => g.upc && normUPC(g.upc) === normUPC(code));
  if (match) {
    collectionDiscoveryServices.setPendingUPC(code);
    collectionDiscoveryServices.addGameFromDatabase(match);
    return;
  }
  // 3) Unknown barcode — open the manual form with the UPC stored
  window.openCollectionEdit();
  collectionDiscoveryServices.setPendingUPC(code);
  collectionDiscoveryServices.showAlert('No match found — enter the details (barcode saved).');
}

window.openCollectionSearchDB = async function() {
  document.getElementById('collection-library').style.display = 'none';
  document.getElementById('collection-detail').style.display = 'none';
  document.getElementById('collection-db-search').style.display = '';
  document.getElementById('collection-db-input').value = '';
  document.getElementById('collection-db-results').innerHTML = '<div style="color:var(--muted);font-size:0.82rem;text-align:center;padding:0.5rem;">Loading game database…</div>';
  document.getElementById('collection-overlay').classList.add('show');
  await loadGameDatabase();
  document.getElementById('collection-db-results').innerHTML = '<div style="color:var(--muted);font-size:0.82rem;text-align:center;padding:0.5rem;">Start typing to search…</div>';
};

window.searchGameDatabase = function() {
  const input = document.getElementById('collection-db-input');
  const resultsEl = document.getElementById('collection-db-results');
  const query = (input.value || '').trim().toLowerCase();
  if (!query) {
    resultsEl.innerHTML = '<div style="color:var(--muted);font-size:0.82rem;text-align:center;padding:0.5rem;">Start typing to search…</div>';
    return;
  }
  if (!gameDatabaseCache) {
    resultsEl.innerHTML = '<div style="color:var(--muted);font-size:0.82rem;text-align:center;padding:0.5rem;">Database still loading…</div>';
    return;
  }
  const existingNames = new Set(collectionState.games.map(g => (g.name || '').toLowerCase()));
  const matches = gameDatabaseCache.filter(g => {
    const name = (g.name || '').toLowerCase();
    return name.indexOf(query) !== -1;
  }).slice(0, 30);
  if (!matches.length) {
    resultsEl.innerHTML = '<div style="color:var(--muted);font-size:0.82rem;text-align:center;padding:0.5rem;">No games found. Try a different search.</div>';
    return;
  }
  resultsEl.innerHTML = '';
  matches.forEach(g => {
    const alreadyOwned = existingNames.has((g.name || '').toLowerCase());
    const meta = [];
    if (g.minPlayers && g.maxPlayers) meta.push(g.minPlayers + '–' + g.maxPlayers + ' players');
    if (g.playTime) meta.push(g.playTime);
    if (g.publisher) meta.push(g.publisher);
    const div = document.createElement('div');
    div.style.cssText = 'padding:0.5rem;border:1px solid var(--border);border-radius:0.5rem;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:0.5rem;' + (alreadyOwned ? 'opacity:0.5;' : '');
    div.innerHTML = '<div style="min-width:0;"><div style="font-weight:700;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + collectionDiscoveryServices.escapeHtml(g.name) + '</div>' +
      '<div style="font-size:0.72rem;color:var(--muted);">' + meta.join(' · ') + '</div></div>' +
      (alreadyOwned ? '<span style="font-size:0.72rem;color:var(--muted);white-space:nowrap;">In Library</span>' : '<button class="btn-primary btn-sm" style="padding:0.25rem 0.6rem;font-size:0.75rem;white-space:nowrap;">Add</button>');
    if (!alreadyOwned) {
      div.addEventListener('click', () => collectionDiscoveryServices.addGameFromDatabase(g));
    }
    resultsEl.appendChild(div);
  });
};
