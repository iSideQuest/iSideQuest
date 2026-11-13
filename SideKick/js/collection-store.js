// Collection persistence/cache boundary. UI and Firebase initialization stay in index.html.
export const collectionState = { games: [] };

let collectionServices = {
  getDb: () => null,
  getCurrentUser: () => null,
};

export function configureCollectionStore(services = {}) {
  collectionServices = { ...collectionServices, ...services };
}

function currentUid() {
  const user = collectionServices.getCurrentUser();
  return user && user.uid ? user.uid : 'guest';
}

export function getCollectionKey() {
  return 'sk_collection_' + currentUid();
}

export function collectionPath() {
  return 'users/' + currentUid() + '/collection';
}

export function loadCollectionLocal() {
  try { return JSON.parse(localStorage.getItem(getCollectionKey()) || '[]'); } catch (e) { return []; }
}

export function saveCollectionLocal(list) {
  try { localStorage.setItem(getCollectionKey(), JSON.stringify(list)); } catch (e) {}
}

// Signed-in users load from Firebase; guests/offline users use the local cache.
// Private photos stay in privatePhotos and legacy inline photos are migrated.
export async function loadCollection() {
  const user = collectionServices.getCurrentUser();
  const uid = user && user.uid ? user.uid : 'guest';
  const db = collectionServices.getDb();
  const { get, ref, set, update } = collectionServices;
  if (db && user) {
    try {
      const snap = await get(ref(db, collectionPath()));
      if (snap.exists()) {
        const obj = snap.val();
        collectionState.games = Object.keys(obj).map(k => Object.assign({ id: k }, obj[k]));
        try {
          const psnap = await get(ref(db, `privatePhotos/${uid}`));
          const photos = (psnap && psnap.val()) || {};
          const localMap = {};
          loadCollectionLocal().forEach(g => { if (g && g.id && g.photo) localMap[g.id] = g.photo; });
          for (const game of collectionState.games) {
            if (game.photo) {
              try {
                await set(ref(db, `privatePhotos/${uid}/${game.id}`), game.photo);
                const strip = {};
                strip[collectionPath() + '/' + game.id + '/photo'] = null;
                await update(ref(db), strip);
              } catch {}
              photos[game.id] = game.photo;
            }
            if (!photos[game.id] && localMap[game.id]) {
              try {
                await set(ref(db, `privatePhotos/${uid}/${game.id}`), localMap[game.id]);
                photos[game.id] = localMap[game.id];
              } catch {}
            }
            if (photos[game.id]) game.photo = photos[game.id];
            else delete game.photo;
          }
        } catch {}
        collectionState.games.sort(function(a, b) { return (a.order != null ? a.order : 0) - (b.order != null ? b.order : 0); });
        saveCollectionLocal(collectionState.games);
        return collectionState.games;
      }
      // Firebase has no collection yet — keep any local cache instead of wiping it.
    } catch (e) {
      // Fall through to local cache, matching the existing offline behavior.
    }
  }
  collectionState.games = loadCollectionLocal();
  collectionState.games.sort(function(a, b) { return (a.order != null ? a.order : 0) - (b.order != null ? b.order : 0); });
  return collectionState.games;
}

export async function saveCollectionRecord(game, photoDataUrl) {
  const index = collectionState.games.findIndex(item => item.id === game.id);
  if (index === -1) collectionState.games.push(game);
  else collectionState.games[index] = game;
  saveCollectionLocal(collectionState.games);
  const user = collectionServices.getCurrentUser();
  const db = collectionServices.getDb();
  if (db && user) {
    try {
      const gameCopy = Object.assign({}, game);
      delete gameCopy.photo;
      await collectionServices.set(collectionServices.ref(db, collectionPath() + '/' + game.id), gameCopy);
      const photoRef = collectionServices.ref(db, `privatePhotos/${user.uid}/${game.id}`);
      if (photoDataUrl) await collectionServices.set(photoRef, photoDataUrl);
      else await collectionServices.remove(photoRef);
    } catch (e) {
      return e;
    }
  }
  return null;
}

export async function deleteCollectionRecord(id) {
  collectionState.games = collectionState.games.filter(game => game.id !== id);
  saveCollectionLocal(collectionState.games);
  const user = collectionServices.getCurrentUser();
  const db = collectionServices.getDb();
  if (db && user) {
    try {
      await collectionServices.remove(collectionServices.ref(db, collectionPath() + '/' + id));
      await collectionServices.remove(collectionServices.ref(db, `privatePhotos/${user.uid}/${id}`));
    } catch (e) {
      return e;
    }
  }
  return null;
}
