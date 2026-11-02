// Collection photo selection, crop, paste, and preview. State is private to this module.
const collectionPhotoServices = {
  showAlert: message => { if (window.showAlert) window.showAlert(message); },
};
export function configureCollectionPhoto(services = {}) {
  Object.assign(collectionPhotoServices, services);
}

// ── COLLECTION PHOTO (camera/gallery + square crop, owner-visible only) ──
let collectionPhotoDataUrl = '';
export function getCollectionPhotoData() { return collectionPhotoDataUrl; }
export function setCollectionPhotoData(value) { collectionPhotoDataUrl = value || ''; }
let collectionPhotoImg = null;
let collectionPhotoCrop = { x: 0, y: 0, w: 0, h: 0 };
let collectionPhotoDrag = null;

window.handleCollectionPhotoFile = function(input) {
  const file = input && input.files && input.files[0];
  if (input) input.value = '';
  if (!file) return;
  if (!file.type || file.type.indexOf('image/') !== 0) { collectionPhotoServices.showAlert('Please choose an image file.'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      // Cap source at 1600px so phone photos don't blow up memory
      const maxDim = Math.max(img.width, img.height);
      if (maxDim > 1600) {
        const c = document.createElement('canvas');
        const k = 1600 / maxDim;
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const small = new Image();
        small.onload = () => openCollectionPhoto(small);
        small.onerror = () => collectionPhotoServices.showAlert('Could not read that photo.');
        small.src = c.toDataURL('image/jpeg', 0.85);
        return;
      }
      openCollectionPhoto(img);
    };
    img.onerror = () => collectionPhotoServices.showAlert('Could not read that photo.');
    img.src = reader.result;
  };
  reader.onerror = () => collectionPhotoServices.showAlert('Could not read that photo.');
  reader.readAsDataURL(file);
};

// ── COLLECTION PHOTO DRAG-DROP + PASTE (desktop: files or cross-tab images) ──
window.cePhotoDragOver = function(e) {
  e.preventDefault();
  try { if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; } catch {}
  const z = document.getElementById('ce-photo-dropzone');
  if (z) z.classList.add('dragover');
};
window.cePhotoDragLeave = function(e) {
  const z = document.getElementById('ce-photo-dropzone');
  if (z) z.classList.remove('dragover');
};
function cePhotoLoadUrl(url) {
  if (!url) return false;
  if (url.indexOf('data:image/') === 0) {
    try {
      const parts = url.split(',');
      const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/png';
      const bin = atob(parts[1]);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      window.handleCollectionPhotoFile({ files: [new Blob([arr], { type: mime })], value: '' });
      return true;
    } catch (err) { collectionPhotoServices.showAlert('Could not read that photo.'); return true; }
  }
  if (url.indexOf('http://') === 0 || url.indexOf('https://') === 0) {
    fetch(url, { mode: 'cors' }).then((r) => {
      if (!r.ok) throw new Error('bad status');
      return r.blob();
    }).then((b) => {
      window.handleCollectionPhotoFile({ files: [b], value: '' });
    }).catch(() => {
      collectionPhotoServices.showAlert('Could not load that image (the other site may block it). Save it first, then use Gallery.');
    });
    return true;
  }
  return false;
}
window.cePhotoDrop = function(e) {
  e.preventDefault();
  const z = document.getElementById('ce-photo-dropzone');
  if (z) z.classList.remove('dragover');
  const dt = e.dataTransfer;
  if (!dt) return;
  if (dt.files && dt.files.length) {
    window.handleCollectionPhotoFile({ files: dt.files, value: '' });
    return;
  }
  // Cross-tab image drag: browsers expose the image as a URL or HTML snippet
  let url = '';
  try { url = dt.getData('text/uri-list') || ''; } catch {}
  if (!url) {
    try {
      const html = dt.getData('text/html') || '';
      const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (m) url = m[1];
    } catch {}
  }
  if (url) url = url.trim().split('\n')[0];
  if (url && cePhotoLoadUrl(url)) return;
  collectionPhotoServices.showAlert('Could not use that drop. Try Gallery instead.');
};
document.addEventListener('paste', function(e) {
  const ov = document.getElementById('collection-edit-overlay');
  if (!ov || !ov.classList.contains('show')) return;
  const items = (e.clipboardData && e.clipboardData.items) || [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].type && items[i].type.indexOf('image/') === 0) {
      const f = items[i].getAsFile();
      if (f) {
        window.handleCollectionPhotoFile({ files: [f], value: '' });
        e.preventDefault();
      }
      return;
    }
  }
});
window.pasteCollectionPhoto = async function() {
  // Explicit clipboard read: works with Ctrl+V-style flow on PC and the
  // system copy menu on mobile, where no text field may be focused.
  try {
    if (!navigator.clipboard || !navigator.clipboard.read) throw new Error('no api');
    const items = await navigator.clipboard.read();
    for (let i = 0; i < items.length; i++) {
      const types = items[i].types || [];
      for (let j = 0; j < types.length; j++) {
        if (types[j].indexOf('image/') === 0) {
          const blob = await items[i].getType(types[j]);
          window.handleCollectionPhotoFile({ files: [blob], value: '' });
          return;
        }
      }
    }
    collectionPhotoServices.showAlert('Clipboard has no image. Copy an image first, then tap Paste.');
  } catch (err) {
    collectionPhotoServices.showAlert('Clipboard is blocked here. Use Gallery instead, or press Ctrl+V on PC.');
  }
};
// Never navigate away if a file is dropped outside the photo zone
document.addEventListener('dragover', function(e) { e.preventDefault(); });
document.addEventListener('drop', function(e) { e.preventDefault(); });

function openCollectionPhoto(img) {
  collectionPhotoImg = img;
  // Start with a centered square covering the smaller side
  const side = Math.min(img.width, img.height);
  collectionPhotoCrop = {
    x: Math.round((img.width - side) / 2),
    y: Math.round((img.height - side) / 2),
    w: side, h: side
  };
  drawCollectionPhoto();
  document.getElementById('collection-photo-overlay').classList.add('show');
}
// Map between image pixels and canvas pixels (image is contain-fit)
function collectionPhotoView() {
  const S = 480;
  const img = collectionPhotoImg;
  const k = S / Math.max(img.width, img.height);
  return { S, k, dw: img.width * k, dh: img.height * k, ox: (S - img.width * k) / 2, oy: (S - img.height * k) / 2 };
}
export function closeCollectionPhoto() {
  document.getElementById('collection-photo-overlay').classList.remove('show');
  collectionPhotoDrag = null;
}
window.closeCollectionPhoto = closeCollectionPhoto;
function drawCollectionPhoto() {
  const canvas = document.getElementById('collection-photo-canvas');
  if (!canvas || !collectionPhotoImg) return;
  const ctx = canvas.getContext('2d');
  const v = collectionPhotoView();
  const img = collectionPhotoImg;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, v.S, v.S);
  ctx.drawImage(img, v.ox, v.oy, v.dw, v.dh);
  const r = collectionPhotoCrop;
  const rx = v.ox + r.x * v.k, ry = v.oy + r.y * v.k, rw = r.w * v.k, rh = r.h * v.k;
  // Dim everything outside the crop
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, v.S, ry);
  ctx.fillRect(0, ry + rh, v.S, v.S - ry - rh);
  ctx.fillRect(0, ry, rx, rh);
  ctx.fillRect(rx + rw, ry, v.S - rx - rw, rh);
  // Crop outline + edge/corner handles
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(rx, ry, rw, rh);
  ctx.fillStyle = '#fff';
  [[rx, ry], [rx + rw / 2, ry], [rx + rw, ry],
   [rx, ry + rh / 2], [rx + rw, ry + rh / 2],
   [rx, ry + rh], [rx + rw / 2, ry + rh], [rx + rw, ry + rh]
  ].forEach(([hx, hy]) => { ctx.beginPath(); ctx.arc(hx, hy, 13, 0, Math.PI * 2); ctx.fill(); });
}
window.confirmCollectionPhoto = function() {
  if (!collectionPhotoImg) return;
  const r = collectionPhotoCrop;
  const k = Math.min(1, 640 / Math.max(r.w, r.h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(r.w * k));
  c.height = Math.max(1, Math.round(r.h * k));
  c.getContext('2d').drawImage(collectionPhotoImg, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
  collectionPhotoDataUrl = c.toDataURL('image/jpeg', 0.85);
  updateCollectionPhotoPreview();
  closeCollectionPhoto();
};
window.removeCollectionPhoto = function() {
  collectionPhotoDataUrl = '';
  updateCollectionPhotoPreview();
};
window.recropCollectionPhoto = function() {
  if (!collectionPhotoDataUrl) return;
  const img = new Image();
  img.onload = () => openCollectionPhoto(img);
  img.onerror = () => collectionPhotoServices.showAlert('Could not reload that photo.');
  img.src = collectionPhotoDataUrl;
};
export function updateCollectionPhotoPreview() {
  const wrap = document.getElementById('ce-photo-preview-wrap');
  const img = document.getElementById('ce-photo-preview');
  if (!wrap || !img) return;
  if (collectionPhotoDataUrl) { img.src = collectionPhotoDataUrl; wrap.style.display = 'block'; }
  else { img.removeAttribute('src'); wrap.style.display = 'none'; }
}
// Drag edges/corners to resize, drag inside to move (mouse + touch)
(function initCollectionPhotoDrag() {
  const canvas = document.getElementById('collection-photo-canvas');
  if (!canvas) return;
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
  };
  const rectCanvas = () => {
    const v = collectionPhotoView();
    const r = collectionPhotoCrop;
    return { x: v.ox + r.x * v.k, y: v.oy + r.y * v.k, w: r.w * v.k, h: r.h * v.k };
  };
  const hitHandle = (p) => {
    const rc = rectCanvas();
    const pts = [
      ['nw', rc.x, rc.y], ['n', rc.x + rc.w / 2, rc.y], ['ne', rc.x + rc.w, rc.y],
      ['w', rc.x, rc.y + rc.h / 2], ['e', rc.x + rc.w, rc.y + rc.h / 2],
      ['sw', rc.x, rc.y + rc.h], ['s', rc.x + rc.w / 2, rc.y + rc.h], ['se', rc.x + rc.w, rc.y + rc.h]
    ];
    for (const [mode, hx, hy] of pts) {
      if (Math.abs(p.x - hx) <= 30 && Math.abs(p.y - hy) <= 30) return mode;
    }
    if (p.x >= rc.x && p.x <= rc.x + rc.w && p.y >= rc.y && p.y <= rc.y + rc.h) return 'move';
    return null;
  };
  const CURSORS = { move: 'move', e: 'ew-resize', w: 'ew-resize', n: 'ns-resize', s: 'ns-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize' };
  canvas.addEventListener('pointerdown', (e) => {
    if (!collectionPhotoImg) return;
    const p = pos(e);
    const mode = hitHandle(p);
    if (!mode) return;
    e.preventDefault();
    const v = collectionPhotoView();
    const ix = (p.x - v.ox) / v.k, iy = (p.y - v.oy) / v.k;
    const r = collectionPhotoCrop;
    collectionPhotoDrag = { mode, gx: ix - r.x, gy: iy - r.y };
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!collectionPhotoImg) return;
    const p = pos(e);
    if (!collectionPhotoDrag) {
      const mode = hitHandle(p);
      canvas.style.cursor = (mode && CURSORS[mode]) || 'default';
      return;
    }
    const v = collectionPhotoView();
    const img = collectionPhotoImg;
    const ix = (p.x - v.ox) / v.k, iy = (p.y - v.oy) / v.k;
    const r = collectionPhotoCrop;
    const MIN = 40;
    const m = collectionPhotoDrag.mode;
    const hasE = m === 'e' || m === 'ne' || m === 'se';
    const hasS = m === 's' || m === 'se' || m === 'sw';
    const hasW = m === 'w' || m === 'nw' || m === 'sw';
    const hasN = m === 'n' || m === 'ne' || m === 'nw';
    if (hasE) r.w = Math.min(img.width - r.x, Math.max(MIN, ix - r.x));
    if (hasS) r.h = Math.min(img.height - r.y, Math.max(MIN, iy - r.y));
    if (hasW) {
      const nx = Math.min(Math.max(0, ix), r.x + r.w - MIN);
      r.w += r.x - nx; r.x = nx;
    }
    if (hasN) {
      const ny = Math.min(Math.max(0, iy), r.y + r.h - MIN);
      r.h += r.y - ny; r.y = ny;
    }
    if (m === 'move') {
      r.x = Math.min(Math.max(0, ix - collectionPhotoDrag.gx), img.width - r.w);
      r.y = Math.min(Math.max(0, iy - collectionPhotoDrag.gy), img.height - r.h);
    }
    // Round to whole pixels and repaint
    r.x = Math.round(r.x); r.y = Math.round(r.y); r.w = Math.round(r.w); r.h = Math.round(r.h);
    drawCollectionPhoto();
  });
  const end = () => { collectionPhotoDrag = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
})();
