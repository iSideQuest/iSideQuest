// Static feature catalog and explanatory copy; handlers remain in index.html.

export const FEATURE_DEFS_GRID = [
  { key: 'awards',  icon: '🏆', name: 'Awards',         hasSettings: false, var: 'featureAwardsEnabled' },
  { key: 'nudge',   icon: '👉', name: 'Nudge',          hasSettings: true,  settingKey: 'nudge',   var: 'featureNudgeEnabled' },
  { key: 'vp',      icon: '🏅', name: 'Victory Points',  hasSettings: false, var: 'featureVPEnabled' },
  { key: 'rounds',  icon: '🔢', name: 'Rounds',         hasSettings: true,  settingKey: 'rounds',  var: 'featureRoundsEnabled' , creatorOnly: true },
  { key: 'undo',    icon: '↩️', name: 'Undo Pass',      hasSettings: false, var: 'featureUndoEnabled' },
  { key: 'timers',  icon: '⏱️', name: 'Timers',         hasSettings: true,  settingKey: 'timers',  var: 'featureTimersEnabled' },
  { key: 'status',  icon: '🩹', name: 'Status Effects',  hasSettings: false, var: 'featureStatusEffectsEnabled' },
  { key: 'dnd',     icon: '⚔️', name: 'D&D',            hasSettings: false, var: 'featureDndEnabled' },
  { key: 'playerSkip', icon: '⏭️', name: 'Player Skip', hasSettings: false, var: 'featurePlayerSkipEnabled' }
];
// Shelved for now — hidden from Step 3 and presets for every account
export const HIDDEN_FEATURES = ['timers', 'status', 'dnd'];

export const FEATURE_INFO = {
  nudge: {
    title: 'Nudge',
    body: `When it's not your turn, you can tap the Nudge button to nudge the active player and let them know you're waiting.\n\nThe nudge button unlocks after a set number of seconds (you choose before the game). Once unlocked, tap as many times as you like — every tap adds to the nudge count shown on the active player's screen.\n\nNudge counts reset each time the turn passes. At the end of the game, the player who received the most nudges gets a special award!`
  },
  timers: {
    title: 'Timers',
    body: `Track how long players take during the game.\n\n• Turn Timer — counts up while it's your turn. Resets each turn. Used for Achievement Awards.\n• Round Timer — counts up across the whole round. Reset by the host using End Round.\n• Game Timer — counts up for the entire session.\n• Countdown Timer — counts down per turn from a set time. A buzzer sounds when it hits zero.\n\nEach timer can be shown or hidden from everyone using the Visible toggle.`
  },
  awards: {
    title: 'Achievement Awards',
    body: `After the host ends the game, an awards ceremony plays out on everyone's phones.\n\nA voice announces each award category, then pauses for drama... and reveals the winner. Only the winner's phone lights up with a celebration while everyone else sees a dark standby screen.\n\nAwards are based on stats collected during the game — like who got nudged the most. More awards will be added as new features are introduced!`
  },
  vp: {
    title: 'Victory Points',
    body: `When the host ends the game, every player is prompted to enter their final Victory Point total.\n\nOnce all players have submitted their scores, the host starts the Achievement Awards. The player with the most Victory Points receives a special announcement during the ceremony!\n\nPerfect for any game that tracks points — like Wingspan, Ticket to Ride, or Catan.`
  },
  status: {
    title: 'Status Effects',
    body: `Players can apply status effects to themselves at any time using the Status button in the bottom-left corner of the game screen.\n\nWhen a player with an active status becomes the active player, an alert appears describing the effect. They can choose to Keep or Remove the status, then tap OK to begin their turn normally.\n\nAvailable statuses:\n• Paralyzed — Your turn must be skipped.\n• Poisoned — Lose a set number of HP this turn.\n\nMore status effects can be added in future updates!`
  },
  rounds: {
    title: 'Rounds',
    body: `Track the current round of your game.\n\nSet how many total rounds you'll play before the game starts. The current round is shown at the top-center of the screen for all players.\n\nThe host advances the round by opening the crown menu and tapping End Round. The final round is highlighted in gold so everyone knows it's the last one.`
  },
  undo: {
    title: 'Undo Pass',
    body: `Allow players to undo their last turn pass.\n\nAfter a player passes their turn, an "Undo Pass" button appears on their screen. They can tap it to take their turn back and become the active player again.\n\nThe button disappears once the next player ends their turn. Great for accidental taps!`
  },
  dnd: {
    title: 'D&D',
    body: `Add D&D-style turn components to your game.\n\nWhen enabled, each player's turn includes structured phases like Actions, Bonus Actions, Movement, and Reactions — just like in Dungeons & Dragons.\n\nPerfect for tabletop RPG sessions where you want to track turn structure alongside your board game night.`
  },
  playerSkip: {
    title: 'Skip Player',
    body: `Temporarily skip a player's turn.\n\nWhen enabled, the host can skip a player's turn. The skipped player is marked and their turn is passed to the next player.\n\nGreat for players who need to step away or are eliminated from the game.`
  }
};
