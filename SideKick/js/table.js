function renderTable(ctx, players, activePlayerId, myIdParam, passDir, isMyTurn) {
  try {
    const svgId = ctx === 'active' ? 'table-svg-active' : 'table-svg-wait';
    const svg = document.getElementById(svgId);
    if (!svg) { console.error('[renderTable] svg not found', svgId); return; }
    if (!players || !players.length) { console.error('[renderTable] no players'); return; }
    const activePlayer = players.find(p => p.id === activePlayerId);
    if (!activePlayer) { console.error('[renderTable] activePlayer not found', activePlayerId); return; }

    const layout = (typeof window._tableLayout !== 'undefined') ? window._tableLayout : null;

    // ── Grid layout: absolute positions, rotated per viewer ──
    if (layout && layout.template === 'grid' && Array.isArray(layout.grid)) {
      const cellSize = 400 / 5;
      const raw = []; // raw {x,y} per slot (in 400x400 coords)
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
        if (layout.grid[r*5+c]) raw.push({ x: c*cellSize + cellSize/2, y: r*cellSize + cellSize/2 });
      }
      if (!raw.length) { svg.innerHTML = ''; return; }
      // map playerId -> raw index
      const slots = Array.isArray(layout.slots) ? layout.slots : [];
      const byId = {};
      players.forEach(p => byId[p.id] = p);
      const slotOf = {};
      slots.forEach((pid, idx) => { if (pid) slotOf[pid] = idx; });
      // assign unassigned players to empty slots
      const assigned = new Set(Object.keys(slotOf));
      players.forEach(p => {
        if (assigned.has(p.id)) return;
        for (let i = 0; i < raw.length; i++) {
          if (!slots[i] || !players.find(pp => pp.id === slots[i])) {
            if (!Object.values(slotOf).includes(i)) { slotOf[p.id] = i; assigned.add(p.id); break; }
          }
        }
      });

      // viewer's slot position
      const mySlotIdx = (myIdParam && slotOf[myIdParam] != null) ? slotOf[myIdParam] : 0;
      const myRaw = raw[mySlotIdx] || raw[0];
      const myAngle = Math.atan2(myRaw.y - 200, myRaw.x - 200);
      const rot = (90 * Math.PI / 180) - myAngle;

      // table surface bounding box (of raw positions, then rotated? keep axis-aligned-ish: use raw bbox)
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      raw.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
      const pad = 24;
      const rx = (maxX - minX) / 2 + pad, ry = (maxY - minY) / 2 + pad;
      const cx0 = (minX + maxX) / 2, cy0 = (minY + maxY) / 2;

      const AVATAR_R = 22;
      let svgContent = '';
      // table surface (rounded rect covering bbox, rotated? keep simple: axis-aligned rect)
      const sx0 = cx0 - (maxX-minX)/2 - pad, sy0 = cy0 - (maxY-minY)/2 - pad;
      const sw = (maxX-minX) + pad*2, sh = (maxY-minY) + pad*2;
      svgContent += '<rect x="' + sx0 + '" y="' + sy0 + '" width="' + sw + '" height="' + sh + '" rx="14" ry="14" fill="rgba(124,92,191,0.12)" stroke="rgba(124,92,191,0.5)" stroke-width="2"/>';
      // pass arrow
      const arrowText = (passDir === 'left' || passDir === 'counterclockwise') ? '↺' : (passDir === 'right' || passDir === 'clockwise') ? '↻' : '↔';
      svgContent += '<text x="200" y="200" text-anchor="middle" dominant-baseline="central" fill="rgba(255,255,255,0.35)" font-family="Inter,sans-serif" font-size="28" font-weight="800">' + arrowText + '</text>';
      players.forEach(p => {
        const si = slotOf[p.id];
        if (si == null) return;
        const rp = raw[si];
        // rotate around center
        const dx = rp.x - 200, dy = rp.y - 200;
        const rx_ = dx * Math.cos(rot) - dy * Math.sin(rot);
        const ry_ = dx * Math.sin(rot) + dy * Math.cos(rot);
        const sx = 200 + rx_, sy = 200 + ry_;
        const color = p.color || '#7c5cbf';
        const name = p.id === myIdParam ? 'You' : (p.name || 'Player');
        const isActive = p.id === activePlayerId;
        const glow = isActive ? ' filter="url(#tableglow)"' : '';
        svgContent += '<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="' + AVATAR_R + '" fill="' + color + '" stroke="' + (isActive ? '#fff' : 'rgba(255,255,255,0.25)') + '" stroke-width="' + (isActive ? 3 : 1.5) + '"' + glow + '/>';
        svgContent += svgAvatar(sx, sy, AVATAR_R - 2, p.avatar, color);
        const shortName = name.length > 10 ? name.substring(0, 9) + '\u2026' : name;
        svgContent += '<text x="' + sx.toFixed(1) + '" y="' + (sy + AVATAR_R + 14).toFixed(1) + '" text-anchor="middle" fill="' + (isActive ? color : 'rgba(255,255,255,0.8)') + '" font-family="Inter,sans-serif" font-size="11" font-weight="700">' + window.esc(shortName) + '</text>';
        if (isActive) svgContent += '<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="' + (AVATAR_R + 6) + '" fill="none" stroke="' + color + '" stroke-width="2" opacity="0.6"/>';
        if (p.knockedOut) {
          const cr = AVATAR_R - 6;
          svgContent += '<line x1="' + (sx-cr) + '" y1="' + (sy-cr) + '" x2="' + (sx+cr) + '" y2="' + (sy+cr) + '" stroke="#ef4444" stroke-width="3" stroke-linecap="round" opacity="0.85"/>';
          svgContent += '<line x1="' + (sx+cr) + '" y1="' + (sy-cr) + '" x2="' + (sx-cr) + '" y2="' + (sy+cr) + '" stroke="#ef4444" stroke-width="3" stroke-linecap="round" opacity="0.85"/>';
        }
      });
      // pass labels for both
      if (ctx === 'active' && isMyTurn && (passDir === 'both' || !passDir)) {
        svgContent += '<text x="30" y="200" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-family="Inter,sans-serif" font-size="12" font-weight="700">Pass Left</text>';
        svgContent += '<text x="370" y="200" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-family="Inter,sans-serif" font-size="12" font-weight="700">Pass Right</text>';
      }
      const defs = '<defs><filter id="tableglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
      svg.innerHTML = defs + svgContent;

      // tap zones
      const ovId = ctx === 'active' ? 'table-overlay-active' : 'table-overlay-wait';
      const ov = document.getElementById(ovId);
      if (ov) {
        ov.querySelectorAll('.wheel-tap-zone, .wheel-full-tap-left, .wheel-full-tap-right').forEach(el => el.remove());
        if (ctx === 'active' && isMyTurn) {
          if (passDir === 'both' || !passDir) {
            const zL = document.createElement('div'); zL.className = 'wheel-full-tap-left'; zL.addEventListener('pointerup', function() { window.passTurn('left'); }); ov.appendChild(zL);
            const zR = document.createElement('div'); zR.className = 'wheel-full-tap-right'; zR.addEventListener('pointerup', function() { window.passTurn('right'); }); ov.appendChild(zR);
          } else {
            const z = document.createElement('div'); z.className = 'wheel-tap-zone'; z.addEventListener('pointerup', function() { window.passTurnSingle(); }); ov.appendChild(z);
          }
        }
      }
      return;
    }

    const N = players.length;
    const CX = 200, CY = 200;
    const AVATAR_R = 26;

    // ── Determine seat positions (layout-aware) ──
    let seatAngles = [];   // angle (deg) for each player slot, indexed by player order in `players`
    let tableRx = 95, tableRy = 55;
    let tableShape = 'round';
    let seatR = 150;

    if (layout && Array.isArray(layout.slots) && layout.slots.length > 0) {
      const tmpl = TABLE_TEMPLATES[layout.template] || TABLE_TEMPLATES.round4;
      tableRx = tmpl.rx; tableRy = tmpl.ry; seatR = tmpl.rx; // use rx as seat radius
      tableShape = tmpl.shape || 'round';
      const nSlots = tmpl.n;
      // base angle for each slot
      const slotAngles = [];
      for (let i = 0; i < nSlots; i++) slotAngles.push((i / nSlots) * 360 - 90);
      // map playerId -> slot index
      const slotOf = {};
      layout.slots.forEach((pid, idx) => { if (pid) slotOf[pid] = idx; });
      // For each player in `players`, find their slot angle (or auto-assign)
      const assigned = new Set();
      players.forEach(p => {
        if (slotOf[p.id] != null) { assigned.add(p.id); return; }
        // unassigned: find first empty slot
        for (let i = 0; i < nSlots; i++) {
          if (!layout.slots[i] || !players.find(pp => pp.id === layout.slots[i])) {
            // empty slot
            if (layout.slots[i] == null || !players.find(pp => pp.id === layout.slots[i])) {
              // check not already taken
              if (!Object.values(slotOf).includes(i)) {
                slotOf[p.id] = i;
                assigned.add(p.id);
                break;
              }
            }
          }
        }
      });
      // Build seatAngles array aligned with players
      players.forEach(p => {
        const si = slotOf[p.id];
        if (si != null && si < nSlots) seatAngles.push(slotAngles[si]);
        else seatAngles.push(null);
      });
      // Fallback for unassigned: evenly space
      let fallbackIdx = 0;
      players.forEach((p, i) => {
        if (seatAngles[i] == null) {
          // find an unused angle
          seatAngles[i] = (fallbackIdx / players.length) * 360 - 90;
          fallbackIdx++;
        }
      });
    } else {
      // Auto-derived (original behavior)
      const SEG_DEG = 360 / N;
      const myIdx = players.findIndex(p => p.id === myIdParam);
      const myAngleDeg = (myIdx >= 0 ? myIdx : 0) * SEG_DEG + SEG_DEG / 2;
      // we'll compute rotationOffset below using seatAngles
      for (let i = 0; i < N; i++) seatAngles.push(i * SEG_DEG + SEG_DEG / 2);
      tableRx = 95; tableRy = 55; seatR = 150;
    }

    // Rotation so viewer (myIdParam) is at bottom (90 deg)
    const mySeatIdx = players.findIndex(p => p.id === myIdParam);
    const mySeatAngle = (mySeatIdx >= 0 && seatAngles[mySeatIdx] != null) ? seatAngles[mySeatIdx] : (seatAngles[0] || 0);
    const rotationOffset = 90 - mySeatAngle;

    // Table surface radii: use template's if layout, else default oval
    if (!layout || !Array.isArray(layout.slots)) {
      tableRx = 95; tableRy = 55; seatR = 150;
    }

    let svgContent = '';

    players.forEach((p, i) => {
      const isActive = p.id === activePlayerId;
      const isSelf = p.id === myIdParam;
      const baseAngle = seatAngles[i];
      const midDeg = baseAngle + rotationOffset;
      const midRad = midDeg * Math.PI / 180;
      const sx = CX + (tableRx + 55) * Math.cos(midRad);
      const sy = CY + (tableRy + 55) * Math.sin(midRad);
      const color = p.color || '#7c5cbf';
      const name = isSelf ? 'You' : (p.name || 'Player');
      const initial = (name || '?').charAt(0).toUpperCase();
      const glow = isActive ? ' filter="url(#tableglow)"' : '';

      // Avatar circle
      svgContent += '<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="' + AVATAR_R + '" fill="' + color + '" stroke="' + (isActive ? '#fff' : 'rgba(255,255,255,0.25)') + '" stroke-width="' + (isActive ? 3 : 1.5) + '"' + glow + '/>';
      // Avatar (image or emoji) instead of initial
      svgContent += svgAvatar(sx, sy, AVATAR_R - 2, p.avatar, color);
      // Name label below avatar
      const labelY = sy + AVATAR_R + 14;
      const displayColor = isActive ? color : 'rgba(255,255,255,0.8)';
      const shortName = name.length > 10 ? name.substring(0, 9) + '\u2026' : name;
      svgContent += '<text x="' + sx.toFixed(1) + '" y="' + labelY.toFixed(1) + '" text-anchor="middle" fill="' + displayColor + '" font-family="Inter,sans-serif" font-size="11" font-weight="700">' + window.esc(shortName) + '</text>';

      // Active indicator ring
      if (isActive) {
        svgContent += '<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="' + (AVATAR_R + 6) + '" fill="none" stroke="' + color + '" stroke-width="2" opacity="0.6"/>';
      }
      // Knocked out cross
      if (p.knockedOut) {
        const cr = AVATAR_R - 6;
        svgContent += '<line x1="' + (sx - cr) + '" y1="' + (sy - cr) + '" x2="' + (sx + cr) + '" y2="' + (sy + cr) + '" stroke="#ef4444" stroke-width="3" stroke-linecap="round" opacity="0.85"/>';
        svgContent += '<line x1="' + (sx + cr) + '" y1="' + (sy - cr) + '" x2="' + (sx - cr) + '" y2="' + (sy + cr) + '" stroke="#ef4444" stroke-width="3" stroke-linecap="round" opacity="0.85"/>';
      }
    });

    // Table surface - round or square based on template shape
    let surfaceSvg = '';
    if (tableShape === 'square') {
      const w = tableRx * 2, h = tableRy * 2;
      const x = CX - tableRx, y = CY - tableRy;
      surfaceSvg = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="18" ry="18" fill="rgba(124,92,191,0.12)" stroke="rgba(124,92,191,0.5)" stroke-width="2"/>' +
        '<rect x="' + (x + 12) + '" y="' + (y + 8) + '" width="' + (w - 24) + '" height="' + (h - 16) + '" rx="12" ry="12" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>';
    } else {
      surfaceSvg = '<ellipse cx="' + CX + '" cy="' + CY + '" rx="' + tableRx + '" ry="' + tableRy + '" fill="rgba(124,92,191,0.12)" stroke="rgba(124,92,191,0.5)" stroke-width="2"/>' +
        '<ellipse cx="' + CX + '" cy="' + (CY - 6) + '" rx="' + (tableRx - 12) + '" ry="' + (tableRy - 8) + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>';
    }
    svgContent = surfaceSvg + svgContent;

    // Pass direction arrow in center
    const arrowText = (passDir === 'left' || passDir === 'counterclockwise') ? '↺' : (passDir === 'right' || passDir === 'clockwise') ? '↻' : '↔';
    svgContent += '<text x="' + CX + '" y="' + CY + '" text-anchor="middle" dominant-baseline="central" fill="rgba(255,255,255,0.35)" font-family="Inter,sans-serif" font-size="28" font-weight="800">' + arrowText + '</text>';

    // Pass direction labels (screen-space, like wheel UI)
    if (ctx === 'active' && isMyTurn && (passDir === 'both' || !passDir)) {
      svgContent += '<text x="30" y="' + CY + '" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-family="Inter,sans-serif" font-size="12" font-weight="700">Pass Left</text>';
      svgContent += '<text x="370" y="' + CY + '" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-family="Inter,sans-serif" font-size="12" font-weight="700">Pass Right</text>';
    }

    // Tap-to-pass zones (only when it's this player's turn on the active screen)
    const ovId = ctx === 'active' ? 'table-overlay-active' : 'table-overlay-wait';
    const ov = document.getElementById(ovId);
    if (ov) {
      ov.querySelectorAll('.wheel-tap-zone, .wheel-full-tap-left, .wheel-full-tap-right').forEach(el => el.remove());
      if (ctx === 'active' && isMyTurn) {
        if (passDir === 'both' || !passDir) {
          const zL = document.createElement('div');
          zL.className = 'wheel-full-tap-left';
          zL.addEventListener('pointerup', function() { window.passTurn('left'); });
          ov.appendChild(zL);
          const zR = document.createElement('div');
          zR.className = 'wheel-full-tap-right';
          zR.addEventListener('pointerup', function() { window.passTurn('right'); });
          ov.appendChild(zR);
        } else {
          const z = document.createElement('div');
          z.className = 'wheel-tap-zone';
          z.addEventListener('pointerup', function() { window.passTurnSingle(); });
          ov.appendChild(z);
        }
      }
    }
  } catch(e) { console.error('[SideKick] renderTable error:', e); }
}

// ── LOBBY VIEW TOGGLE (circle pie vs table) ──
let lobbyViewMode = localStorage.getItem('sk_lobby_view') === 'table';

window.toggleLobbyView = function() {
  lobbyViewMode = !lobbyViewMode;
  try { localStorage.setItem('sk_lobby_view', lobbyViewMode ? 'table' : 'circle'); } catch {}
  const btn = document.getElementById('lobby-view-toggle');
  if (btn) btn.textContent = lobbyViewMode ? '🎡 Circle' : '🪑 Table';
  const wheelSvg = document.getElementById('lobby-wheel-svg');
  const tableSvg = document.getElementById('lobby-table-svg');
  if (wheelSvg) wheelSvg.style.display = lobbyViewMode ? 'none' : '';
  if (tableSvg) tableSvg.style.display = lobbyViewMode ? '' : 'none';
  if (lobbyViewMode) renderLobbyTable(window.localPlayers || []);
  else window.renderLobbyWheel(window.localPlayers || []);
};

window.lobbyTableTapSeat = function(pid) {
  if (!window.tapArmed || window.firstPlayerOption !== 'spot1') return;
  window.tapFirstId = pid;
  window.tapArmed = false;
  try { if (window.db && window.roomCode) set(ref(window.db, `rooms/${window.roomCode}/window.tapFirstId`), pid).catch(() => {}); } catch {}
  window.haptic(10);
  hideFirstOptHint();
  renderLobbyView(window.localPlayers || []);
  window.updateStartButton();
};

function renderLobbyView(players) {
  const wheelSvg = document.getElementById('lobby-wheel-svg');
  const tableSvg = document.getElementById('lobby-table-svg');
  if (lobbyViewMode) {
    if (wheelSvg) wheelSvg.style.display = 'none';
    if (tableSvg) tableSvg.style.display = '';
    renderLobbyTable(players);
  } else {
    if (wheelSvg) wheelSvg.style.display = '';
    if (tableSvg) tableSvg.style.display = 'none';
    window.renderLobbyWheel(players);
  }
  const btn = document.getElementById('lobby-view-toggle');
  if (btn) btn.textContent = lobbyViewMode ? '🎡 Circle' : '🪑 Table';
}
function renderLobbyTable(players) {
  try {
    const svg = document.getElementById('lobby-table-svg');
    if (!svg) { console.error('[renderLobbyTable] svg not found'); return; }
    const list = (players || []).slice();
    if (!list.length) { svg.innerHTML = ''; console.error('[renderLobbyTable] no players'); return; }
    const CX = 200, CY = 200;
    const AVATAR_R = 26;
    const layout = (typeof window._tableLayout !== 'undefined') ? window._tableLayout : null;

    // Grid layout
    if (layout && layout.template === 'grid' && Array.isArray(layout.grid)) {
      const cellSize = 400 / 5;
      const raw = [];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (layout.grid[r*5+c]) raw.push({ x: c*cellSize + cellSize/2, y: r*cellSize + cellSize/2 });
      if (!raw.length) { svg.innerHTML = ''; return; }
      const slots = Array.isArray(layout.slots) ? layout.slots : [];
      const slotOf = {};
      slots.forEach((pid, idx) => { if (pid) slotOf[pid] = idx; });
      const assigned = new Set(Object.keys(slotOf));
      list.forEach(p => {
        if (assigned.has(p.id)) return;
        for (let i = 0; i < raw.length; i++) {
          if (!Object.values(slotOf).includes(i)) { slotOf[p.id] = i; assigned.add(p.id); break; }
        }
      });
      const myIdx = list.findIndex(p => p.id === window.myId);
      const mySlot = (myIdx >= 0 && slotOf[list[myIdx].id] != null) ? slotOf[list[myIdx].id] : 0;
      const myRaw = raw[mySlot] || raw[0];
      const myAngle = Math.atan2(myRaw.y - 200, myRaw.x - 200);
      const rot = (90 * Math.PI / 180) - myAngle;
      let content = '';
      // table surface bbox
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      raw.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
      const pad = 24;
      const sx0 = minX - pad, sy0 = minY - pad, sw = (maxX - minX) + pad*2, sh = (maxY - minY) + pad*2;
      content += '<rect x="' + sx0 + '" y="' + sy0 + '" width="' + sw + '" height="' + sh + '" rx="14" ry="14" fill="rgba(124,92,191,0.12)" stroke="rgba(124,92,191,0.5)" stroke-width="2"/>';
      list.forEach(p => {
        const si = slotOf[p.id];
        if (si == null) return;
        const rp = raw[si];
        const dx = rp.x - 200, dy = rp.y - 200;
        const rx_ = dx * Math.cos(rot) - dy * Math.sin(rot);
        const ry_ = dx * Math.sin(rot) + dy * Math.cos(rot);
        const sx = 200 + rx_, sy = 200 + ry_;
        const color = p.color || '#7c5cbf';
        const name = p.id === window.myId ? 'You' : (p.name || 'Player');
        const tapHandler = (typeof window.tapArmed !== 'undefined' && window.tapArmed && window.firstPlayerOption === 'spot1') ? ' onclick="lobbyTableTapSeat(\'' + p.id + '\')"' : '';
        const cursor = window.tapArmed ? 'cursor:pointer;' : '';
        content += '<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="' + AVATAR_R + '" fill="' + color + '" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" style="pointer-events:all;' + cursor + '"' + tapHandler + '/>';
        content += svgAvatar(sx, sy, AVATAR_R - 2, p.avatar, color);
        const labelY = sy + AVATAR_R + 14;
        const shortName = name.length > 10 ? name.substring(0, 9) + '\u2026' : name;
        content += '<text x="' + sx.toFixed(1) + '" y="' + labelY.toFixed(1) + '" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Inter,sans-serif" font-size="11" font-weight="700" style="pointer-events:none;">' + window.esc(shortName) + '</text>';
      });
      const defs = '<defs><filter id="lobbytableglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
      svg.innerHTML = defs + content;
      return;
    }

    if (layout && Array.isArray(layout.slots) && layout.slots.length > 0) {
      const tmpl = TABLE_TEMPLATES[layout.template] || TABLE_TEMPLATES.r4;
      tableRx = tmpl.rx; tableRy = tmpl.ry;
      tableShape = tmpl.shape || 'round';
      const nSlots = tmpl.n || layout.slots.length;
      const slotAngles = [];
      for (let i = 0; i < nSlots; i++) slotAngles.push((i / nSlots) * 360 - 90);
      const slotOf = {};
      layout.slots.forEach((pid, idx) => { if (pid) slotOf[pid] = idx; });
      list.forEach(p => {
        if (slotOf[p.id] != null) { seatAngles.push(slotAngles[slotOf[p.id]]); return; }
        // unassigned: find empty slot
        for (let i = 0; i < nSlots; i++) {
          if (!Object.values(slotOf).includes(i)) { slotOf[p.id] = i; seatAngles.push(slotAngles[i]); return; }
        }
        seatAngles.push((seatAngles.length / list.length) * 360 - 90);
      });
    } else {
      const SEG = 360 / list.length;
      list.forEach((p, i) => seatAngles.push(i * SEG + SEG / 2));
    }
    const myIdx = list.findIndex(p => p.id === window.myId);
    const myAngle = (myIdx >= 0 && seatAngles[myIdx] != null) ? seatAngles[myIdx] : (seatAngles[0] || 0);
    const rot = 90 - myAngle;
    let content = '';
    if (tableShape === 'square') {
      const w = tableRx * 2, h = tableRy * 2;
      const x = CX - tableRx, y = CY - tableRy;
      content += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="18" ry="18" fill="rgba(124,92,191,0.12)" stroke="rgba(124,92,191,0.5)" stroke-width="2"/>';
    } else {
      content += '<ellipse cx="' + CX + '" cy="' + CY + '" rx="' + tableRx + '" ry="' + tableRy + '" fill="rgba(124,92,191,0.12)" stroke="rgba(124,92,191,0.5)" stroke-width="2"/>';
    }
    list.forEach((p, i) => {
      const ang = (seatAngles[i] + rot) * Math.PI / 180;
      const sx = CX + (tableRx + 55) * Math.cos(ang);
      const sy = CY + (tableRy + 55) * Math.sin(ang);
      const color = p.color || '#7c5cbf';
      const name = p.id === window.myId ? 'You' : (p.name || 'Player');
      const initial = (name || '?').charAt(0).toUpperCase();
      const tapHandler = (typeof window.tapArmed !== 'undefined' && window.tapArmed && window.firstPlayerOption === 'spot1') ? ' onclick="lobbyTableTapSeat(\'' + p.id + '\')"' : '';
      const cursor = window.tapArmed ? 'cursor:pointer;' : '';
      content += '<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="' + AVATAR_R + '" fill="' + color + '" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" style="pointer-events:all;' + cursor + '"' + tapHandler + '/>';
      content += svgAvatar(sx, sy, AVATAR_R - 2, p.avatar, color);
      const labelY = sy + AVATAR_R + 14;
      const shortName = name.length > 10 ? name.substring(0, 9) + '\u2026' : name;
      content += '<text x="' + sx.toFixed(1) + '" y="' + labelY.toFixed(1) + '" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Inter,sans-serif" font-size="11" font-weight="700" style="pointer-events:none;">' + window.esc(shortName) + '</text>';
    });
    const defs = '<defs><filter id="lobbytableglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    svg.innerHTML = defs + content;
  } catch (e) { console.error('[SideKick] renderLobbyTable error:', e); }
}

// also update the tap-swap callback to re-render lobby view
// (patched: line window.renderLobbyWheel(window.localPlayers) -> renderLobbyView(window.localPlayers))
// Helper: render an avatar (emoji or image) inside an SVG circle at (cx,cy) radius r
function svgAvatar(cx, cy, r, avatar, color) {
  avatar = avatar || '👤';
  if (window.isImageAvatar(avatar)) {
    const d = r * 2;
    const x = cx - r, y = cy - r;
    return '<defs><clipPath id="avclip-' + Math.round(cx) + '-' + Math.round(cy) + '"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"/></clipPath></defs>'
      + '<image href="' + avatar + '" x="' + x + '" y="' + y + '" width="' + d + '" height="' + d + '" clip-path="url(#avclip-' + Math.round(cx) + '-' + Math.round(cy) + ')" preserveAspectRatio="xMidYMid slice"/>';
  }
  return '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central" fill="#fff" font-family="Inter,sans-serif" font-size="' + Math.round(r * 0.7) + '" font-weight="800">' + window.esc(avatar) + '</text>';
}
const TABLE_TEMPLATES = {
  // Round
  r3: { name: '3', n: 3, rx: 95, ry: 95, shape: 'round' },
  r4: { name: '4', n: 4, rx: 95, ry: 95, shape: 'round' },
  r5: { name: '5', n: 5, rx: 95, ry: 95, shape: 'round' },
  r6: { name: '6', n: 6, rx: 95, ry: 95, shape: 'round' },
  r7: { name: '7', n: 7, rx: 95, ry: 95, shape: 'round' },
  r8: { name: '8', n: 8, rx: 95, ry: 95, shape: 'round' },
  // Square
  s3: { name: '3', n: 3, rx: 95, ry: 95, shape: 'square' },
  s4: { name: '4', n: 4, rx: 95, ry: 95, shape: 'square' },
  s5: { name: '5', n: 5, rx: 95, ry: 95, shape: 'square' },
  s6: { name: '6', n: 6, rx: 95, ry: 95, shape: 'square' },
  s7: { name: '7', n: 7, rx: 95, ry: 95, shape: 'square' },
  s8: { name: '8', n: 8, rx: 95, ry: 95, shape: 'square' },
  // Custom Grid
  grid: { name: 'Custom Grid', n: 0, rx: 0, ry: 0, shape: 'grid' }
};
let tableSetupState = { template: 'r4', slots: [], selected: null };

function tableLayoutSlots(layout) {
  // Returns array of {x, y} positions for each slot given a template
  if (layout && layout.template === 'grid' && Array.isArray(layout.grid)) {
    const out = [];
    const cellSize = 400 / 5; // 80
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (layout.grid[r * 5 + c]) {
          out.push({ x: c * cellSize + cellSize / 2, y: r * cellSize + cellSize / 2 });
        }
      }
    }
    return out;
  }
  const t = TABLE_TEMPLATES[layout && layout.template] || TABLE_TEMPLATES.r4;
  const n = t.n || (layout && Array.isArray(layout.slots) ? layout.slots.length : 4);
  const out = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * 2 * Math.PI - Math.PI / 2;
    out.push({ x: 200 + t.rx * Math.cos(ang), y: 200 + t.ry * Math.sin(ang) });
  }
  return out;
}

window.openTableSetup = function() {
  const ov = document.getElementById('table-setup-overlay');
  if (!ov) { console.error('[TS] overlay not found'); return; }
  ov.classList.add('show'); // show immediately so user sees feedback
  try {
  // Initialize state from existing layout or auto
  let layout = null;
  try { layout = (window._tableLayout) || null; } catch {}
  if (!layout) layout = { template: 'r4', slots: [] };
  tableSetupState.template = layout.template || 'r4';
  // migrate old template names
  if (!TABLE_TEMPLATES[tableSetupState.template]) tableSetupState.template = 'r4';
  const t = TABLE_TEMPLATES[tableSetupState.template];
  const n = (tableSetupState.template === 'grid') ? 0 : t.n;
  if (tableSetupState.template !== 'grid') {
    tableSetupState.slots = new Array(n).fill(null);
    if (Array.isArray(layout.slots)) {
      for (let i = 0; i < Math.min(n, layout.slots.length); i++) tableSetupState.slots[i] = layout.slots[i];
    }
    autoFillTableSlots(false);
  } else {
    if (!Array.isArray(tableSetupState.grid) || tableSetupState.grid.length !== 25) {
      tableSetupState.grid = new Array(25).fill(false);
      for (let r = 1; r <= 2; r++) for (let c = 1; c <= 3; c++) tableSetupState.grid[r*5+c] = true;
    }
    const gn = tableSetupState.grid.filter(x => x).length;
    if (!Array.isArray(tableSetupState.slots) || tableSetupState.slots.length !== gn) {
      const old = tableSetupState.slots || [];
      const ns = new Array(gn).fill(null);
      for (let i = 0; i < Math.min(old.length, gn); i++) ns[i] = old[i];
      tableSetupState.slots = ns;
      autoFillTableSlots(false);
    }
  }
  tableSetupState.selected = null;
  renderTableSetup();
  try { window.haptic(5); } catch {}
  } catch (e) { console.error('[TS] openTableSetup error:', e); }
};

function renderTableSetup() {
  // Templates
  const tplContainer = document.getElementById('table-setup-templates');
  if (tplContainer) {
    const groups = { round: [], square: [], grid: [] };
    Object.keys(TABLE_TEMPLATES).forEach(k => {
      const t = TABLE_TEMPLATES[k];
      const shape = t.shape || 'round';
      if (shape === 'grid') return; // handled separately
      if (!groups[shape]) groups[shape] = [];
      groups[shape].push(k);
    });
    let html = '';
    html += '<div style="width:100%;font-size:0.7rem;font-weight:700;color:var(--muted);margin-bottom:0.2rem;">Round</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:0.3rem;justify-content:center;margin-bottom:0.5rem;">';
    groups.round.forEach(k => {
      const t = TABLE_TEMPLATES[k];
      const active = k === tableSetupState.template;
      html += '<button class="btn-secondary btn-sm" style="padding:0.25rem 0.5rem;font-size:0.72rem;min-width:2rem;' + (active ? 'background:var(--accent);border-color:var(--accent);color:#fff;' : '') + '" onclick="selectTableTemplate(\'' + k + '\')">' + t.name + '</button>';
    });
    html += '</div>';
    html += '<div style="width:100%;font-size:0.7rem;font-weight:700;color:var(--muted);margin-bottom:0.2rem;">Square</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:0.3rem;justify-content:center;">';
    groups.square.forEach(k => {
      const t = TABLE_TEMPLATES[k];
      const active = k === tableSetupState.template;
      html += '<button class="btn-secondary btn-sm" style="padding:0.25rem 0.5rem;font-size:0.72rem;min-width:2rem;' + (active ? 'background:var(--accent);border-color:var(--accent);color:#fff;' : '') + '" onclick="selectTableTemplate(\'' + k + '\')">' + t.name + '</button>';
    });
    html += '<div style="width:100%;font-size:0.7rem;font-weight:700;color:var(--muted);margin-bottom:0.2rem;">Custom</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:0.3rem;justify-content:center;margin-bottom:0.5rem;">';
    const gActive = tableSetupState.template === 'grid';
    html += '<button class="btn-secondary btn-sm" style="padding:0.25rem 0.5rem;font-size:0.72rem;min-width:6rem;' + (gActive ? 'background:var(--accent);border-color:var(--accent);color:#fff;' : '') + '" onclick="selectTableTemplate(\'grid\')">Custom Grid</button>';
    html += '</div>';
  // SVG
  const svg = document.getElementById('table-setup-svg');
  if (!svg) return;
  // Grid mode: show a 5x5 cell editor instead of the oval preview
  if (tableSetupState.template === 'grid') {
    if (!Array.isArray(tableSetupState.grid) || tableSetupState.grid.length !== 25) {
      tableSetupState.grid = new Array(25).fill(false);
      // default: a 2x3 rectangle in the middle
      for (let r = 1; r <= 2; r++) for (let c = 1; c <= 3; c++) tableSetupState.grid[r*5+c] = true;
    }
    const cellSize = 400 / 5;
    let content = '';
    // grid lines
    for (let i = 0; i <= 5; i++) {
      content += '<line x1="0" y1="' + (i*cellSize) + '" x2="400" y2="' + (i*cellSize) + '" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>';
      content += '<line x1="' + (i*cellSize) + '" y1="0" x2="' + (i*cellSize) + '" y2="400" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>';
    }
    const players = (typeof window.localPlayers !== 'undefined' && Array.isArray(window.localPlayers)) ? window.localPlayers : [];
    const byId = {};
    players.forEach(p => { byId[p.id] = p; });
    // seats = true cells in row-major order
    const seatCells = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (tableSetupState.grid[r*5+c]) seatCells.push({r, c, idx: seatCells.length});
    // reconcile slots length
    const n = seatCells.length;
    if (!Array.isArray(tableSetupState.slots) || tableSetupState.slots.length !== n) {
      const old = tableSetupState.slots || [];
      const ns = new Array(n).fill(null);
      for (let i = 0; i < Math.min(old.length, n); i++) ns[i] = old[i];
      tableSetupState.slots = ns;
      autoFillTableSlots(false);
    }
    // render cells
    seatCells.forEach((sc, i) => {
      const cx = sc.c * cellSize + cellSize/2;
      const cy = sc.r * cellSize + cellSize/2;
      const pid = tableSetupState.slots[i];
      const p = pid ? byId[pid] : null;
      const color = p ? (p.color || '#7c5cbf') : 'rgba(255,255,255,0.15)';
      const sel = tableSetupState.selected === i;
      content += '<rect x="' + (sc.c*cellSize+4) + '" y="' + (sc.r*cellSize+4) + '" width="' + (cellSize-8) + '" height="' + (cellSize-8) + '" rx="8" ry="8" fill="' + color + '" stroke="' + (sel ? '#fff' : 'rgba(255,255,255,0.3)') + '" stroke-width="' + (sel ? 3 : 1.5) + '" style="cursor:pointer;pointer-events:all;" onclick="selectTableSlot(' + i + ')" onpointerdown="tableSetupPointerDown(event,' + i + ')"/>';
      if (p) {
        content += svgAvatar(cx, cy, 16, p.avatar, color);
      } else {
        content += '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central" fill="rgba(255,255,255,0.5)" font-family="Inter,sans-serif" font-size="20" font-weight="800" style="pointer-events:none;">+</text>';
      }
    });
    // also render toggle cells (empty grid cells) as faint tappable
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      if (tableSetupState.grid[r*5+c]) continue;
      const cx = c*cellSize + cellSize/2;
      const cy = r*cellSize + cellSize/2;
      content += '<rect x="' + (c*cellSize+12) + '" y="' + (r*cellSize+12) + '" width="' + (cellSize-24) + '" height="' + (cellSize-24) + '" rx="6" ry="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-dasharray="4 3" style="cursor:pointer;pointer-events:all;" onclick="toggleGridCell(' + r + ',' + c + ')"/>';
      content += '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central" fill="rgba(255,255,255,0.25)" font-family="Inter,sans-serif" font-size="18" font-weight="800" style="pointer-events:none;">+</text>';
    }
    svg.innerHTML = content;
    const legend = document.getElementById('table-setup-legend');
    if (legend) {
      const assigned = tableSetupState.slots.filter(s => s).length;
      legend.textContent = assigned + ' of ' + tableSetupState.slots.length + ' seats filled · tap empty cells to add seats';
    }
    return;
  }
  const t = TABLE_TEMPLATES[tableSetupState.template];
  const positions = tableLayoutSlots({ template: tableSetupState.template });
  const players = (typeof window.localPlayers !== 'undefined' && Array.isArray(window.localPlayers)) ? window.localPlayers : [];
  const byId = {};
  players.forEach(p => { byId[p.id] = p; });
  let content = '';
  // table surface
  content += '<ellipse cx="200" cy="200" rx="' + t.rx + '" ry="' + t.ry + '" fill="rgba(124,92,191,0.12)" stroke="rgba(124,92,191,0.5)" stroke-width="2"/>';
  positions.forEach((pos, i) => {
    const pid = tableSetupState.slots[i];
    const p = pid ? byId[pid] : null;
    const name = p ? (p.name || 'Player') : 'empty';
    const color = p ? (p.color || '#7c5cbf') : 'rgba(255,255,255,0.15)';
    const initial = p ? (name.charAt(0).toUpperCase()) : '+';
    const sel = tableSetupState.selected === i;
    content += '<circle cx="' + pos.x.toFixed(1) + '" cy="' + pos.y.toFixed(1) + '" r="24" fill="' + color + '" stroke="' + (sel ? '#fff' : 'rgba(255,255,255,0.3)') + '" stroke-width="' + (sel ? 3 : 1.5) + '" style="cursor:pointer;pointer-events:all;" onclick="selectTableSlot(' + i + ')" onpointerdown="tableSetupPointerDown(event,' + i + ')"/>';
    content += svgAvatar(pos.x, pos.y, 20, p ? p.avatar : null, color);
    content += '<text x="' + pos.x.toFixed(1) + '" y="' + (pos.y + 34).toFixed(1) + '" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Inter,sans-serif" font-size="10" font-weight="700" style="pointer-events:none;">' + (p ? (name.length > 8 ? name.substring(0,7) + '\u2026' : name) : 'empty') + '</text>';
  });
  svg.innerHTML = content;
  // Legend
  const legend = document.getElementById('table-setup-legend');
  if (legend) {
    const assigned = tableSetupState.slots.filter(s => s).length;
    legend.textContent = assigned + ' of ' + tableSetupState.slots.length + ' seats filled';
  }
}

window.selectTableTemplate = function(key) {
  if (!TABLE_TEMPLATES[key] && key !== 'grid') return;
  const oldN = (tableSetupState.slots || []).length;
  tableSetupState.template = key;
  if (key === 'grid') {
    if (!Array.isArray(tableSetupState.grid) || tableSetupState.grid.length !== 25) {
      tableSetupState.grid = new Array(25).fill(false);
      for (let r = 1; r <= 2; r++) for (let c = 1; c <= 3; c++) tableSetupState.grid[r*5+c] = true;
    }
    const n = tableSetupState.grid.filter(x => x).length;
    const newSlots = new Array(n).fill(null);
    const old = tableSetupState.slots || [];
    for (let i = 0; i < Math.min(old.length, n); i++) newSlots[i] = old[i];
    tableSetupState.slots = newSlots;
    autoFillTableSlots(false);
    tableSetupState.selected = null;
    renderTableSetup();
    try { window.haptic(5); } catch {}
    return;
  }
  const newN = TABLE_TEMPLATES[key].n;
  // Preserve existing assignments into new slot array
  const newSlots = new Array(newN).fill(null);
  const old = tableSetupState.slots || [];
  for (let i = 0; i < Math.min(old.length, newN); i++) newSlots[i] = old[i];
  tableSetupState.slots = newSlots;
  autoFillTableSlots(false);
  tableSetupState.selected = null;
  renderTableSetup();
  try { window.haptic(5); } catch {}
};

window.selectTableSlot = function(i) {
  if (tableSetupState.selected === null) {
    tableSetupState.selected = i;
  } else if (tableSetupState.selected === i) {
    tableSetupState.selected = null;
  } else {
    // swap
    const a = tableSetupState.selected;
    const tmp = tableSetupState.slots[a];
    tableSetupState.slots[a] = tableSetupState.slots[i];
    tableSetupState.slots[i] = tmp;
    tableSetupState.selected = null;
  }
  renderTableSetup();
  try { window.haptic(5); } catch {}
};

window.toggleGridCell = function(r, c) {
  if (!tableSetupState.grid) tableSetupState.grid = new Array(25).fill(false);
  tableSetupState.grid[r*5+c] = !tableSetupState.grid[r*5+c];
  // rebuild slots
  autoFillTableSlots(false);
  renderTableSetup();
  try { window.haptic(5); } catch {}
};
  const players = (typeof window.localPlayers !== 'undefined' && Array.isArray(window.localPlayers)) ? window.localPlayers : [];
  const assigned = new Set(tableSetupState.slots.filter(s => s));
  // Fill empty slots with unassigned players in join order
  let pi = 0;
  for (let i = 0; i < tableSetupState.slots.length; i++) {
    if (tableSetupState.slots[i]) continue;
    // find next unassigned player
    while (pi < players.length && assigned.has(players[pi].id)) pi++;
    if (pi < players.length) {
      tableSetupState.slots[i] = players[pi].id;
      assigned.add(players[pi].id);
      pi++;
    }
  }
  if (show !== false) renderTableSetup();
};

window.applyTableSetup = async function() {
  const layout = { template: tableSetupState.template, slots: tableSetupState.slots.slice() };
  window._tableLayout = layout;
  // Persist to Firebase
  if (window.db && window.roomCode) {
    try { await update(ref(window.db, `rooms/${window.roomCode}`), { tableLayout: layout }); } catch(e) { console.error('tableLayout save failed', e); }
  }
  closeTableSetup();
  // Re-render table view if active
  try {
    if (window.uiMode === 'table' && window._currentActivePlayerId && window.localPlayers && window.localPlayers.length && window.myId) {
      const isAct = document.getElementById('screen-active') && document.getElementById('screen-active').classList.contains('active');
      const isWait = document.getElementById('screen-waiting') && document.getElementById('screen-waiting').classList.contains('active');
      if (isAct) renderCurrentUI('active', window.localPlayers, window._currentActivePlayerId, window.myId, window.passDirection || 'both', true);
      else if (isWait) renderCurrentUI('wait', window.localPlayers, window._currentActivePlayerId, window.myId, window.passDirection || 'both', false);
    }
  } catch(e) {}
  try { window.haptic(10); } catch {}
};

window.closeTableSetup = function() {
  const ov = document.getElementById('table-setup-overlay');
  if (ov) ov.classList.remove('show');
};

// Load table layout from Firebase room data (called when room updates)
function syncTableLayoutFromRoom(room) {
  if (room && room.tableLayout) {
    window._tableLayout = room.tableLayout;
    // Reconcile: remove departed players, auto-add new ones to empty slots
    reconcileTableLayout(room);
  } else {
    window._tableLayout = null;
  }
}

function reconcileTableLayout(room) {
  const layout = window._tableLayout;
  if (!layout || !Array.isArray(layout.slots)) return;
  const players = (typeof window.localPlayers !== 'undefined' && Array.isArray(window.localPlayers)) ? window.localPlayers : [];
  const ids = new Set(players.map(p => p.id));
  // Remove departed
  for (let i = 0; i < layout.slots.length; i++) {
    if (layout.slots[i] && !ids.has(layout.slots[i])) layout.slots[i] = null;
  }
  // Auto-add new players to empty slots
  const assigned = new Set(layout.slots.filter(s => s));
  players.forEach(p => {
    if (assigned.has(p.id)) return;
    const emptyIdx = layout.slots.indexOf(null);
    if (emptyIdx >= 0) { layout.slots[emptyIdx] = p.id; assigned.add(p.id); }
  });
  window._tableLayout = layout;
}

// ── make renderTable use layout when available ──
// (patched below: renderTable checks window._tableLayout)

// ── Phase 3: drag-and-drop in table setup ──
let tableDrag = { from: null, ghost: null };

// Called from seat onclick's pointerdown (we hook via renderTableSetup injecting onpointerdown)
window.tableSetupPointerDown = function(e, slotIdx) {
  const pid = tableSetupState.slots[slotIdx];
  if (!pid) return; // only drag filled seats
  try { e.preventDefault(); } catch {}
  tableDrag.from = slotIdx;
  // create ghost
  const ghost = document.createElement('div');
  ghost.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;width:48px;height:48px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1rem;box-shadow:0 4px 12px rgba(0,0,0,0.4);transform:translate(-50%,-50%);';
  const players = (typeof window.localPlayers !== 'undefined' && Array.isArray(window.localPlayers)) ? window.localPlayers : [];
  const p = players.find(pp => pp.id === pid);
  ghost.textContent = p ? (p.name || '?').charAt(0).toUpperCase() : '?';
  document.body.appendChild(ghost);
  tableDrag.ghost = ghost;
  moveGhost(e);
  try { window.haptic(5); } catch {}
};

function moveGhost(e) {
  if (!tableDrag.ghost) return;
  const pt = e.touches ? e.touches[0] : e;
  tableDrag.ghost.style.left = pt.clientX + 'px';
  tableDrag.ghost.style.top = pt.clientY + 'px';
}

function endDrag(e) {
  if (tableDrag.from === null) return;
  const pt = (e && e.changedTouches) ? e.changedTouches[0] : e;
  // find nearest slot
  const svg = document.getElementById('table-setup-svg');
  if (svg && pt) {
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const sx = (pt.clientX - rect.left) / rect.width * vb.width;
    const sy = (pt.clientY - rect.top) / rect.height * vb.height;
    const positions = tableLayoutSlots({ template: tableSetupState.template });
    let best = -1, bestD = Infinity;
    positions.forEach((pos, i) => {
      const d = Math.hypot(pos.x - sx, pos.y - sy);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best >= 0 && best !== tableDrag.from && bestD < 60) {
      // swap
      const tmp = tableSetupState.slots[tableDrag.from];
      tableSetupState.slots[tableDrag.from] = tableSetupState.slots[best];
      tableSetupState.slots[best] = tmp;
      renderTableSetup();
      try { window.haptic(5); } catch {}
    }
  }
  // cleanup
  if (tableDrag.ghost) { try { tableDrag.ghost.remove(); } catch {} }
  tableDrag = { from: null, ghost: null };
}

// Hook global move/up
document.addEventListener('pointermove', function(e) { if (tableDrag.from !== null) moveGhost(e); });
document.addEventListener('pointerup', function(e) { if (tableDrag.from !== null) endDrag(e); });
document.addEventListener('touchmove', function(e) { if (tableDrag.from !== null) { moveGhost(e); e.preventDefault(); } }, { passive: false });
document.addEventListener('touchend', function(e) { if (tableDrag.from !== null) endDrag(e); });


// Expose table module API to main
if (typeof renderTable !== 'undefined') window.renderTable = renderTable;
if (typeof renderLobbyTable !== 'undefined') window.renderLobbyTable = renderLobbyTable;
if (typeof renderLobbyView !== 'undefined') window.renderLobbyView = renderLobbyView;
if (typeof toggleLobbyView !== 'undefined') window.toggleLobbyView = toggleLobbyView;
if (typeof lobbyTableTapSeat !== 'undefined') window.lobbyTableTapSeat = lobbyTableTapSeat;
if (typeof openTableSetup !== 'undefined') window.openTableSetup = openTableSetup;
if (typeof syncTableLayoutFromRoom !== 'undefined') window.syncTableLayoutFromRoom = syncTableLayoutFromRoom;
if (typeof reconcileTableLayout !== 'undefined') window.reconcileTableLayout = reconcileTableLayout;
if (typeof svgAvatar !== 'undefined') window.svgAvatar = svgAvatar;
if (typeof TABLE_TEMPLATES !== 'undefined') window.TABLE_TEMPLATES = TABLE_TEMPLATES;
if (typeof tableLayoutSlots !== 'undefined') window.tableLayoutSlots = tableLayoutSlots;
if (typeof tableSetupState !== 'undefined') window.tableSetupState = tableSetupState;
