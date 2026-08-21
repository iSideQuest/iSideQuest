
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update, remove, push, serverTimestamp, runTransaction }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, linkWithCredential, linkWithPopup, fetchSignInMethodsForEmail, EmailAuthProvider }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── STATE ──────────────────────────────────────
let db = null;
let serverTimeOffset = 0; // ms difference between Firebase server clock and this device's clock

// Returns the current time synced to the Firebase server clock. Two different
// phones' local clocks can be seconds apart, which made buzz-in reaction
// times inconsistent between devices — this keeps all tap timestamps on one
// shared clock instead of each device's own (possibly skewed) Date.now().
function serverNow() {
  return Date.now() + serverTimeOffset;
}
// ── HAPTIC FEEDBACK ──────────────────────────
function haptic(ms) { try { navigator.vibrate && navigator.vibrate(ms || 10); } catch {} }

let myId = null;
let roomCode = null;
let isHost = false;
let unsubscribers = [];
let localPlayers = [];
let myName = '';

// ── I18N (LANGUAGE) ──────────────────────────
const I18N_STRINGS = {
  en: {
    tagline: 'Pass the turn. Keep the vibe.',
    hey: 'Hey',
    hostRoom: 'Host Room',
    joinRoom: 'Join Room',
    tools: 'Tools',
    rng: 'RNG',
    teams: 'Teams',
    speedRound: 'Speed Round',
    timers: 'Timers',
    login: 'Login',
    roomSettings: 'Room Settings',
    step: 'Step',
    playerNamePh: 'Type Player Or Team Name',
    chooseColor: 'Choose<br>Color',
    chooseAvatar: 'Choose<br>Avatar',
    chooseColor2: 'Choose Color',
    chooseAvatar2: 'Choose Avatar',
    plsColor: '⚠️ Please choose a color.',
    plsAvatar: '⚠️ Please select an avatar.',
    confirm: 'Confirm <span class="play-tri">▶</span>',
    player: 'Player',
    noColor: 'No color',
    turnDirTitle: 'Choose the turn direction for your game',
    left: 'Left',
    right: 'Right',
    leftRight: 'Left & Right',
    clockwise: 'Clockwise',
    counterclockwise: 'Counterclockwise',
    leftRightDesc: 'If turn direction changes, use this option (games like UNO)',
    plsTurnMode: '⚠️ Please choose a turn mode.',
    noMode: 'No mode',
    tapToAdd: 'Tap To Add Game Feature(s)',
    featNudge: 'Nudge',
    featAwards: 'Awards',
    featTimers: 'Timers',
    featVP: 'Victory Points',
    featStatus: 'Status Effects',
    featRounds: 'Rounds',
    featDnD: 'D&D',
    featUndo: 'Undo Pass',
    settings: '⚙ Settings',
    createRoom: 'Create Room',
    allFeaturesOff: 'All features off',
    home: '<span class="play-tri">◀</span> Home',
    joinLobby: 'Join Room',
    scanRoom: 'Scan Room',
    qrCode: 'QR Code',
    or: 'Or',
    typeCode: 'Type Code',
    enterCode: 'Enter Code',
    playerLobby: 'Player Lobby',
    playerListDrag: 'Player List (Drag to Reorder)',
    randomFirst: '🎲 Pick A Random First Player',
    duel1st: 'Duel For 1st Player',
    startGame: 'Start Game <span class="play-tri">▶</span>',
    backToRoomSet: '<span class="play-tri">◀</span> Back To Room Settings',
    chooseFirst: 'Choose Option For First Player',
    spot1Opt: 'Spot 1',
    randomOpt: 'Random',
    duelOpt: 'Duel',
    joinedRoom: 'Joined room',
    waitingHost: 'Waiting for host to start…',
    leave: 'Leave',
    hosted: 'Hosted',
    awards: 'Awards',
    rooms: 'Rooms',
    editProfile: 'Edit Profile',
    editProfileDesc: 'Change your avatar and preferred name',
    myCollection: 'My Collection',
    myCollectionDesc: 'Board games you own',
    mySavedGames: 'My Saved Games',
    mySavedGamesDesc: 'View and resume your saved sessions',
    themes: 'Themes',
    themesDesc: 'Customize your visual experience',
    acctSettings: 'Account Settings',
    acctSettingsDesc: 'Manage your account details',
    backToHome: 'Back to Home',
    signOut: 'Sign Out',
    welcomeBack: 'Welcome Back',
    welcomeSub: 'Sign in to access your host account',
    createAccount: 'Create Account',
    createAccountSub: 'Set up a host account to create rooms',
    logIn: 'Log In',
    signUp: 'Sign Up',
    signUpFree: 'Sign Up Free',
    continueGoogle: 'Continue with Google',
    emailPh: 'Email address',
    passwordPh: 'Password',
    forgotPass: 'Forgot password?',
    close: 'Close',
    goToProfile: '👤 Go to Profile',
    linkGoogle: 'Link Google account',
    email: 'Email',
    changePassword: 'Change Password',
    play: 'Play',
    buzz: 'Buzz'
  },
  es: {
    tagline: 'Pasa el turno. Mantén la energía.',
    hey: 'Hola',
    hostRoom: 'Crear Sala',
    joinRoom: 'Unirse a Sala',
    tools: 'Herramientas',
    rng: 'RNG',
    teams: 'Equipos',
    speedRound: 'Ronda Rápida',
    timers: 'Temporizadores',
    login: 'Iniciar Sesión',
    roomSettings: 'Configuración de Sala',
    step: 'Paso',
    playerNamePh: 'Escribe el nombre del jugador o equipo',
    chooseColor: 'Elegir<br>Color',
    chooseAvatar: 'Elegir<br>Avatar',
    chooseColor2: 'Elegir Color',
    chooseAvatar2: 'Elegir Avatar',
    plsColor: '⚠️ Por favor, elige un color.',
    plsAvatar: '⚠️ Por favor, selecciona un avatar.',
    confirm: 'Confirmar <span class="play-tri">▶</span>',
    player: 'Jugador',
    noColor: 'Sin color',
    turnDirTitle: 'Elige la dirección del turno para tu juego',
    left: 'Izquierda',
    right: 'Derecha',
    leftRight: 'Izquierda y Derecha',
    clockwise: 'En el sentido de las agujas del reloj',
    counterclockwise: 'En sentido contrario',
    leftRightDesc: 'Si el juego cambia de dirección de turno, usa esta opción (juegos como UNO)',
    plsTurnMode: '⚠️ Por favor, elige un modo de turno.',
    noMode: 'Sin modo',
    tapToAdd: 'Toca para Añadir Función(es) del Juego',
    featNudge: 'Empujón',
    featAwards: 'Premios',
    featTimers: 'Temporizadores',
    featVP: 'Puntos de Victoria',
    featStatus: 'Efectos de Estado',
    featRounds: 'Rondas',
    featDnD: 'D&D',
    featUndo: 'Deshacer Pase',
    settings: '⚙ Ajustes',
    createRoom: 'Crear Sala',
    allFeaturesOff: 'Todas las funciones desactivadas',
    home: '<span class="play-tri">◀</span> Inicio',
    joinLobby: 'Unirse a Sala',
    scanRoom: 'Escanear Sala',
    qrCode: 'Código QR',
    or: 'O',
    typeCode: 'Escribe el Código',
    enterCode: 'Ingresar Código',
    playerLobby: 'Sala de Jugadores',
    playerListDrag: 'Lista de Jugadores (Arrastra para Reordenar)',
    randomFirst: '🎲 Elegir Primer Jugador al Azar',
    duel1st: 'Duelo por el 1er Jugador',
    startGame: 'Iniciar Juego <span class="play-tri">▶</span>',
    backToRoomSet: '<span class="play-tri">◀</span> Volver a la Configuración de la Sala',
    chooseFirst: 'Elige Opción Para el Primer Jugador',
    spot1Opt: 'Puesto 1',
    randomOpt: 'Aleatorio',
    duelOpt: 'Duelo',
    joinedRoom: 'Sala unida',
    waitingHost: 'Esperando a que el anfitrión comience…',
    leave: 'Salir',
    hosted: 'Organizadas',
    awards: 'Premios',
    rooms: 'Salas',
    editProfile: 'Editar Perfil',
    editProfileDesc: 'Cambia tu avatar y nombre preferido',
    myCollection: 'Mi Colección',
    myCollectionDesc: 'Juegos de mesa que posees',
    mySavedGames: 'Mis Juegos Guardados',
    mySavedGamesDesc: 'Ver y retomar tus sesiones guardadas',
    themes: 'Temas',
    themesDesc: 'Personaliza tu experiencia visual',
    acctSettings: 'Configuración de Cuenta',
    acctSettingsDesc: 'Gestiona los detalles de tu cuenta',
    backToHome: 'Volver al Inicio',
    signOut: 'Cerrar Sesión',
    welcomeBack: 'Bienvenido de Nuevo',
    welcomeSub: 'Inicia sesión para acceder a tu cuenta de anfitrión',
    createAccount: 'Crear Cuenta',
    createAccountSub: 'Crea una cuenta de anfitrión para crear salas',
    logIn: 'Iniciar Sesión',
    signUp: 'Registrarse',
    signUpFree: 'Regístrate Gratis',
    continueGoogle: 'Continuar con Google',
    emailPh: 'Dirección de correo',
    passwordPh: 'Contraseña',
    forgotPass: '¿Olvidaste tu contraseña?',
    close: 'Cerrar',
    goToProfile: '👤 Ir al Perfil',
    linkGoogle: 'Vincular cuenta de Google',
    email: 'Correo electrónico',
    changePassword: 'Cambiar Contraseña',
    play: 'Jugar',
    buzz: 'Zumbido'
  },
  zh: {
    tagline: '传递回合。保持气氛。',
    hey: '嗨',
    hostRoom: '创建房间',
    joinRoom: '加入房间',
    tools: '工具',
    rng: 'RNG',
    teams: '团队',
    speedRound: '快速回合',
    timers: '计时器',
    login: '登录',
    roomSettings: '房间设置',
    step: '步骤',
    playerNamePh: '输入玩家或团队名称',
    chooseColor: '选择<br>颜色',
    chooseAvatar: '选择<br>头像',
    chooseColor2: '选择颜色',
    chooseAvatar2: '选择头像',
    plsColor: '⚠️ 请选择一种颜色。',
    plsAvatar: '⚠️ 请选择一个头像。',
    confirm: '确认 <span class="play-tri">▶</span>',
    player: '玩家',
    noColor: '无颜色',
    turnDirTitle: '为你的游戏选择回合方向',
    left: '左',
    right: '右',
    leftRight: '左右',
    clockwise: '顺时针',
    counterclockwise: '逆时针',
    leftRightDesc: '如果游戏改变回合方向，请使用此选项（如 UNO 等游戏）',
    plsTurnMode: '⚠️ 请选择回合模式。',
    noMode: '无模式',
    tapToAdd: '点击添加游戏功能',
    featNudge: '轻推',
    featAwards: '奖项',
    featTimers: '计时器',
    featVP: '胜利点数',
    featStatus: '状态效果',
    featRounds: '回合',
    featDnD: 'D&D',
    featUndo: '撤销传递',
    settings: '⚙ 设置',
    createRoom: '创建房间',
    allFeaturesOff: '所有功能已关闭',
    home: '<span class="play-tri">◀</span> 主页',
    joinLobby: '加入房间',
    scanRoom: '扫描房间',
    qrCode: '二维码',
    or: '或',
    typeCode: '输入代码',
    enterCode: '输入代码',
    playerLobby: '玩家大厅',
    playerListDrag: '玩家列表（拖动重新排序）',
    randomFirst: '🎲 随机选择第一位玩家',
    duel1st: '争夺第一位玩家',
    startGame: '开始游戏 <span class="play-tri">▶</span>',
    backToRoomSet: '<span class="play-tri">◀</span> 返回房间设置',
    chooseFirst: '为第一位玩家选择选项',
    spot1Opt: '位置 1',
    randomOpt: '随机',
    duelOpt: '决斗',
    joinedRoom: '已加入房间',
    waitingHost: '正在等待房主开始…',
    leave: '离开',
    hosted: '主持',
    awards: '奖项',
    rooms: '房间',
    editProfile: '编辑个人资料',
    editProfileDesc: '更改你的头像和首选名称',
    myCollection: '我的收藏',
    myCollectionDesc: '你拥有的桌游',
    mySavedGames: '我保存的游戏',
    mySavedGamesDesc: '查看并继续你保存的会话',
    themes: '主题',
    themesDesc: '自定义你的视觉体验',
    acctSettings: '账户设置',
    acctSettingsDesc: '管理你的账户详情',
    backToHome: '返回主页',
    signOut: '退出登录',
    welcomeBack: '欢迎回来',
    welcomeSub: '登录以访问你的房主账户',
    createAccount: '创建账户',
    createAccountSub: '设置房主账户以创建房间',
    logIn: '登录',
    signUp: '注册',
    signUpFree: '免费注册',
    continueGoogle: '继续使用 Google',
    emailPh: '电子邮箱地址',
    passwordPh: '密码',
    forgotPass: '忘记密码？',
    close: '关闭',
    goToProfile: '👤 前往个人资料',
    linkGoogle: '关联 Google 账户',
    email: '电子邮箱',
    changePassword: '更改密码',
    play: '游戏',
    buzz: '抢答'
  },
  de: {
    tagline: 'Gib den Zug weiter. Bleib in der Stimmung.',
    hey: 'Hallo',
    hostRoom: 'Raum erstellen',
    joinRoom: 'Raum beitreten',
    tools: 'Werkzeuge',
    rng: 'RNG',
    teams: 'Teams',
    speedRound: 'Schnelle Runde',
    timers: 'Timer',
    login: 'Anmelden',
    roomSettings: 'Raumeinstellungen',
    step: 'Schritt',
    playerNamePh: 'Spieler- oder Teamname eingeben',
    chooseColor: 'Farbe<br>wählen',
    chooseAvatar: 'Avatar<br>wählen',
    chooseColor2: 'Farbe wählen',
    chooseAvatar2: 'Avatar wählen',
    plsColor: '⚠️ Bitte wähle eine Farbe.',
    plsAvatar: '⚠️ Bitte wähle einen Avatar.',
    confirm: 'Bestätigen <span class="play-tri">▶</span>',
    player: 'Spieler',
    noColor: 'Keine Farbe',
    turnDirTitle: 'Wähle die Zugrichtung für dein Spiel',
    left: 'Links',
    right: 'Rechts',
    leftRight: 'Links & Rechts',
    clockwise: 'Im Uhrzeigersinn',
    counterclockwise: 'Gegen den Uhrzeigersinn',
    leftRightDesc: 'Wenn das Spiel die Zugrichtung ändert, nutze diese Option (Spiele wie UNO)',
    plsTurnMode: '⚠️ Bitte wähle einen Zugmodus.',
    noMode: 'Kein Modus',
    tapToAdd: 'Tippe, um Spielfunktion(en) hinzuzufügen',
    featNudge: 'Anstoß',
    featAwards: 'Auszeichnungen',
    featTimers: 'Timer',
    featVP: 'Siegpunkte',
    featStatus: 'Statuseffekte',
    featRounds: 'Runden',
    featDnD: 'D&D',
    featUndo: 'Zug rückgängig',
    settings: '⚙ Einstellungen',
    createRoom: 'Raum erstellen',
    allFeaturesOff: 'Alle Funktionen aus',
    home: '<span class="play-tri">◀</span> Start',
    joinLobby: 'Raum beitreten',
    scanRoom: 'Raum scannen',
    qrCode: 'QR-Code',
    or: 'Oder',
    typeCode: 'Code eingeben',
    enterCode: 'Code eingeben',
    playerLobby: 'Spieler-Lobby',
    playerListDrag: 'Spielerliste (Ziehen zum Sortieren)',
    randomFirst: '🎲 Zufälligen ersten Spieler wählen',
    duel1st: 'Duell um den 1. Spieler',
    startGame: 'Spiel starten <span class="play-tri">▶</span>',
    backToRoomSet: '<span class="play-tri">◀</span> Zurück zu den Raumeinstellungen',
    chooseFirst: 'Option für den ersten Spieler wählen',
    spot1Opt: 'Platz 1',
    randomOpt: 'Zufällig',
    duelOpt: 'Duell',
    joinedRoom: 'Raum beigetreten',
    waitingHost: 'Warten auf den Gastgeber…',
    leave: 'Verlassen',
    hosted: 'Gehostet',
    awards: 'Auszeichnungen',
    rooms: 'Räume',
    editProfile: 'Profil bearbeiten',
    editProfileDesc: 'Ändere deinen Avatar und bevorzugten Namen',
    myCollection: 'Meine Sammlung',
    myCollectionDesc: 'Brettspiele, die du besitzt',
    mySavedGames: 'Meine gespeicherten Spiele',
    mySavedGamesDesc: 'Gespeicherte Sitzungen ansehen und fortsetzen',
    themes: 'Themen',
    themesDesc: 'Passe dein visuelles Erlebnis an',
    acctSettings: 'Kontoeinstellungen',
    acctSettingsDesc: 'Verwalte deine Kontodaten',
    backToHome: 'Zurück zum Start',
    signOut: 'Abmelden',
    welcomeBack: 'Willkommen zurück',
    welcomeSub: 'Melde dich an, um auf dein Gastgeberkonto zuzugreifen',
    createAccount: 'Konto erstellen',
    createAccountSub: 'Richte ein Gastgeberkonto ein, um Räume zu erstellen',
    logIn: 'Anmelden',
    signUp: 'Registrieren',
    signUpFree: 'Kostenlos registrieren',
    continueGoogle: 'Mit Google fortfahren',
    emailPh: 'E-Mail-Adresse',
    passwordPh: 'Passwort',
    forgotPass: 'Passwort vergessen?',
    close: 'Schließen',
    goToProfile: '👤 Zum Profil',
    linkGoogle: 'Google-Konto verknüpfen',
    email: 'E-Mail',
    changePassword: 'Passwort ändern',
    play: 'Spielen',
    buzz: 'Buzz'
  },
  fr: {
    tagline: 'Passez le tour. Gardez le rythme.',
    hey: 'Salut',
    hostRoom: 'Créer une salle',
    joinRoom: 'Rejoindre une salle',
    tools: 'Outils',
    rng: 'RNG',
    teams: 'Équipes',
    speedRound: 'Tour rapide',
    timers: 'Minuteurs',
    login: 'Connexion',
    roomSettings: 'Paramètres de la salle',
    step: 'Étape',
    playerNamePh: 'Saisissez le nom du joueur ou de l\'équipe',
    chooseColor: 'Choisir<br>la couleur',
    chooseAvatar: 'Choisir<br>un avatar',
    chooseColor2: 'Choisir la couleur',
    chooseAvatar2: 'Choisir un avatar',
    plsColor: '⚠️ Veuillez choisir une couleur.',
    plsAvatar: '⚠️ Veuillez sélectionner un avatar.',
    confirm: 'Confirmer <span class="play-tri">▶</span>',
    player: 'Joueur',
    noColor: 'Aucune couleur',
    turnDirTitle: 'Choisissez la direction du tour pour votre jeu',
    left: 'Gauche',
    right: 'Droite',
    leftRight: 'Gauche & Droite',
    clockwise: 'Dans le sens des aiguilles',
    counterclockwise: 'Dans le sens inverse',
    leftRightDesc: 'Si le jeu change de direction de tour, utilisez cette option (jeux comme UNO)',
    plsTurnMode: '⚠️ Veuillez choisir un mode de tour.',
    noMode: 'Aucun mode',
    tapToAdd: 'Touchez pour ajouter des fonctionnalités',
    featNudge: 'Coup de pouce',
    featAwards: 'Récompenses',
    featTimers: 'Minuteurs',
    featVP: 'Points de victoire',
    featStatus: 'Effets de statut',
    featRounds: 'Manches',
    featDnD: 'D&D',
    featUndo: 'Annuler le passage',
    settings: '⚙ Réglages',
    createRoom: 'Créer une salle',
    allFeaturesOff: 'Toutes les fonctions désactivées',
    home: '<span class="play-tri">◀</span> Accueil',
    joinLobby: 'Rejoindre une salle',
    scanRoom: 'Scanner la salle',
    qrCode: 'Code QR',
    or: 'Ou',
    typeCode: 'Saisir le code',
    enterCode: 'Saisir le code',
    playerLobby: 'Hall des joueurs',
    playerListDrag: 'Liste des joueurs (glisser pour réorganiser)',
    randomFirst: '🎲 Choisir un premier joueur au hasard',
    duel1st: 'Duel pour le 1er joueur',
    startGame: 'Démarrer le jeu <span class="play-tri">▶</span>',
    backToRoomSet: '<span class="play-tri">◀</span> Retour aux paramètres de la salle',
    chooseFirst: 'Choisissez une option pour le premier joueur',
    spot1Opt: 'Place 1',
    randomOpt: 'Aléatoire',
    duelOpt: 'Duel',
    joinedRoom: 'Salle rejointe',
    waitingHost: 'En attente de l\'hôte…',
    leave: 'Quitter',
    hosted: 'Hébergées',
    awards: 'Récompenses',
    rooms: 'Salles',
    editProfile: 'Modifier le profil',
    editProfileDesc: 'Changez votre avatar et votre nom préféré',
    myCollection: 'Ma collection',
    myCollectionDesc: 'Jeux de société que vous possédez',
    mySavedGames: 'Mes jeux enregistrés',
    mySavedGamesDesc: 'Voir et reprendre vos sessions enregistrées',
    themes: 'Thèmes',
    themesDesc: 'Personnalisez votre expérience visuelle',
    acctSettings: 'Paramètres du compte',
    acctSettingsDesc: 'Gérez les détails de votre compte',
    backToHome: 'Retour à l\'accueil',
    signOut: 'Se déconnecter',
    welcomeBack: 'Bon retour',
    welcomeSub: 'Connectez-vous pour accéder à votre compte d\'hôte',
    createAccount: 'Créer un compte',
    createAccountSub: 'Créez un compte d\'hôte pour créer des salles',
    logIn: 'Se connecter',
    signUp: 'S\'inscrire',
    signUpFree: 'S\'inscrire gratuitement',
    continueGoogle: 'Continuer avec Google',
    emailPh: 'Adresse e-mail',
    passwordPh: 'Mot de passe',
    forgotPass: 'Mot de passe oublié ?',
    close: 'Fermer',
    goToProfile: '👤 Aller au profil',
    linkGoogle: 'Associer un compte Google',
    email: 'E-mail',
    changePassword: 'Changer le mot de passe',
    play: 'Jouer',
    buzz: 'Buzz'
  },
  ja: {
    tagline: 'ターンを回そう。雰囲気を保とう。',
    hey: 'こんにちは',
    hostRoom: 'ルームを作成',
    joinRoom: 'ルームに参加',
    tools: 'ツール',
    rng: 'RNG',
    teams: 'チーム',
    speedRound: 'スピードラウンド',
    timers: 'タイマー',
    login: 'ログイン',
    roomSettings: 'ルーム設定',
    step: 'ステップ',
    playerNamePh: 'プレイヤー名またはチーム名を入力',
    chooseColor: '色を<br>選択',
    chooseAvatar: 'アバターを<br>選択',
    chooseColor2: '色を選択',
    chooseAvatar2: 'アバターを選択',
    plsColor: '⚠️ 色を選択してください。',
    plsAvatar: '⚠️ アバターを選択してください。',
    confirm: '確認 <span class="play-tri">▶</span>',
    player: 'プレイヤー',
    noColor: '色なし',
    turnDirTitle: 'ゲームのターンの向きを選択してください',
    left: '左',
    right: '右',
    leftRight: '左右',
    clockwise: '時計回り',
    counterclockwise: '反時計回り',
    leftRightDesc: 'ゲームがターンの向きを変える場合は、このオプションを使ってください（UNOなどのゲーム）',
    plsTurnMode: '⚠️ ターンモードを選択してください。',
    noMode: 'モードなし',
    tapToAdd: 'タップしてゲーム機能を追加',
    featNudge: 'ナッジ',
    featAwards: 'アワード',
    featTimers: 'タイマー',
    featVP: '勝利ポイント',
    featStatus: 'ステータス効果',
    featRounds: 'ラウンド',
    featDnD: 'D&D',
    featUndo: 'パスを元に戻す',
    settings: '⚙ 設定',
    createRoom: 'ルームを作成',
    allFeaturesOff: 'すべての機能オフ',
    home: '<span class="play-tri">◀</span> ホーム',
    joinLobby: 'ルームに参加',
    scanRoom: 'ルームをスキャン',
    qrCode: 'QRコード',
    or: 'または',
    typeCode: 'コードを入力',
    enterCode: 'コードを入力',
    playerLobby: 'プレイヤーロビー',
    playerListDrag: 'プレイヤーリスト（ドラッグで並べ替え）',
    randomFirst: '🎲 最初のプレイヤーをランダムに選ぶ',
    duel1st: '最初のプレイヤーを決めるデュエル',
    startGame: 'ゲーム開始 <span class="play-tri">▶</span>',
    backToRoomSet: '<span class="play-tri">◀</span> ルーム設定に戻る',
    chooseFirst: '最初のプレイヤーのオプションを選択',
    spot1Opt: 'スポット 1',
    randomOpt: 'ランダム',
    duelOpt: '決闘',
    joinedRoom: 'ルームに参加しました',
    waitingHost: 'ホストの開始を待っています…',
    leave: '退出',
    hosted: 'ホスト',
    awards: 'アワード',
    rooms: 'ルーム',
    editProfile: 'プロフィール編集',
    editProfileDesc: 'アバターと表示名を変更',
    myCollection: 'マイコレクション',
    myCollectionDesc: '所有しているボードゲーム',
    mySavedGames: '保存したゲーム',
    mySavedGamesDesc: '保存したセッションを表示・再開',
    themes: 'テーマ',
    themesDesc: 'ビジュアル体験をカスタマイズ',
    acctSettings: 'アカウント設定',
    acctSettingsDesc: 'アカウントの詳細を管理',
    backToHome: 'ホームに戻る',
    signOut: 'サインアウト',
    welcomeBack: 'おかえりなさい',
    welcomeSub: 'ホストアカウントにアクセスするにはログインしてください',
    createAccount: 'アカウント作成',
    createAccountSub: 'ルームを作成するためのホストアカウントを設定',
    logIn: 'ログイン',
    signUp: 'サインアップ',
    signUpFree: '無料でサインアップ',
    continueGoogle: 'Googleで続行',
    emailPh: 'メールアドレス',
    passwordPh: 'パスワード',
    forgotPass: 'パスワードをお忘れですか？',
    close: '閉じる',
    goToProfile: '👤 プロフィールへ',
    linkGoogle: 'Googleアカウントをリンク',
    email: 'メール',
    changePassword: 'パスワードを変更',
    play: 'プレイ',
    buzz: 'バズ'
  },
  it: {
    tagline: 'Passa il turno. Mantieni l\'atmosfera.',
    hey: 'Ciao',
    hostRoom: 'Crea Sala',
    joinRoom: 'Entra in Sala',
    tools: 'Strumenti',
    rng: 'RNG',
    teams: 'Squadre',
    speedRound: 'Round Rapido',
    timers: 'Timer',
    login: 'Accedi',
    roomSettings: 'Impostazioni Sala',
    step: 'Passo',
    playerNamePh: 'Inserisci il nome del giocatore o della squadra',
    chooseColor: 'Scegli<br>Colore',
    chooseAvatar: 'Scegli<br>Avatar',
    chooseColor2: 'Scegli Colore',
    chooseAvatar2: 'Scegli Avatar',
    plsColor: '⚠️ Per favore scegli un colore.',
    plsAvatar: '⚠️ Per favore seleziona un avatar.',
    confirm: 'Conferma <span class="play-tri">▶</span>',
    player: 'Giocatore',
    noColor: 'Nessun colore',
    turnDirTitle: 'Scegli la direzione del turno per il tuo gioco',
    left: 'Sinistra',
    right: 'Destra',
    leftRight: 'Sinistra e Destra',
    clockwise: 'In senso orario',
    counterclockwise: 'In senso antiorario',
    leftRightDesc: 'Se il gioco cambia direzione del turno, usa questa opzione (giochi come UNO)',
    plsTurnMode: '⚠️ Per favore scegli una modalità di turno.',
    noMode: 'Nessuna modalità',
    tapToAdd: 'Tocca per aggiungere funzionalità di gioco',
    featNudge: 'Spinta',
    featAwards: 'Premi',
    featTimers: 'Timer',
    featVP: 'Punti Vittoria',
    featStatus: 'Effetti di Stato',
    featRounds: 'Round',
    featDnD: 'D&D',
    featUndo: 'Annulla Passaggio',
    settings: '⚙ Impostazioni',
    createRoom: 'Crea Sala',
    allFeaturesOff: 'Tutte le funzionalità disattivate',
    home: '<span class="play-tri">◀</span> Home',
    joinLobby: 'Entra in Sala',
    scanRoom: 'Scansiona Sala',
    qrCode: 'Codice QR',
    or: 'O',
    typeCode: 'Digita Codice',
    enterCode: 'Inserisci Codice',
    playerLobby: 'Lobby Giocatori',
    playerListDrag: 'Elenco Giocatori (Trascina per Riordinare)',
    randomFirst: '🎲 Scegli un Primo Giocatore a Caso',
    duel1st: 'Duello per il 1° Giocatore',
    startGame: 'Inizia Gioco <span class="play-tri">▶</span>',
    backToRoomSet: '<span class="play-tri">◀</span> Torna alle Impostazioni della Sala',
    chooseFirst: 'Scegli un\'opzione per il Primo Giocatore',
    spot1Opt: 'Posto 1',
    randomOpt: 'Casuale',
    duelOpt: 'Duello',
    joinedRoom: 'Sala a cui ti sei unito',
    waitingHost: 'In attesa che l\'host inizi…',
    leave: 'Esci',
    hosted: 'Organizzate',
    awards: 'Premi',
    rooms: 'Sale',
    editProfile: 'Modifica Profilo',
    editProfileDesc: 'Cambia avatar e nome preferito',
    myCollection: 'La Mia Collezione',
    myCollectionDesc: 'Giochi da tavolo che possiedi',
    mySavedGames: 'I Miei Giochi Salvati',
    mySavedGamesDesc: 'Visualizza e riprendi le sessioni salvate',
    themes: 'Temi',
    themesDesc: 'Personalizza la tua esperienza visiva',
    acctSettings: 'Impostazioni Account',
    acctSettingsDesc: 'Gestisci i dettagli del tuo account',
    backToHome: 'Torna alla Home',
    signOut: 'Esci',
    welcomeBack: 'Bentornato',
    welcomeSub: 'Accedi per usare il tuo account host',
    createAccount: 'Crea Account',
    createAccountSub: 'Crea un account host per creare sale',
    logIn: 'Accedi',
    signUp: 'Registrati',
    signUpFree: 'Registrati Gratis',
    continueGoogle: 'Continua con Google',
    emailPh: 'Indirizzo email',
    passwordPh: 'Password',
    forgotPass: 'Password dimenticata?',
    close: 'Chiudi',
    goToProfile: '👤 Vai al Profilo',
    linkGoogle: 'Collega account Google',
    email: 'Email',
    changePassword: 'Cambia Password',
    play: 'Gioca',
    buzz: 'Buzz'
  },
  pt: {
    tagline: 'Passe o turno. Mantenha a energia.',
    hey: 'Olá',
    hostRoom: 'Criar Sala',
    joinRoom: 'Entrar na Sala',
    tools: 'Ferramentas',
    rng: 'RNG',
    teams: 'Equipes',
    speedRound: 'Round Rápido',
    timers: 'Cronômetros',
    login: 'Entrar',
    roomSettings: 'Configurações da Sala',
    step: 'Etapa',
    playerNamePh: 'Digite o nome do jogador ou da equipe',
    chooseColor: 'Escolher<br>Cor',
    chooseAvatar: 'Escolher<br>Avatar',
    chooseColor2: 'Escolher Cor',
    chooseAvatar2: 'Escolher Avatar',
    plsColor: '⚠️ Por favor, escolha uma cor.',
    plsAvatar: '⚠️ Por favor, selecione um avatar.',
    confirm: 'Confirmar <span class="play-tri">▶</span>',
    player: 'Jogador',
    noColor: 'Sem cor',
    turnDirTitle: 'Escolha a direção do turno para o seu jogo',
    left: 'Esquerda',
    right: 'Direita',
    leftRight: 'Esquerda e Direita',
    clockwise: 'No sentido horário',
    counterclockwise: 'No sentido anti-horário',
    leftRightDesc: 'Se o jogo mudar a direção do turno, use esta opção (jogos como UNO)',
    plsTurnMode: '⚠️ Por favor, escolha um modo de turno.',
    noMode: 'Sem modo',
    tapToAdd: 'Toque para adicionar recurso(s) do jogo',
    featNudge: 'Cutucada',
    featAwards: 'Prêmios',
    featTimers: 'Cronômetros',
    featVP: 'Pontos de Vitória',
    featStatus: 'Efeitos de Status',
    featRounds: 'Rounds',
    featDnD: 'D&D',
    featUndo: 'Desfazer Passagem',
    settings: '⚙ Configurações',
    createRoom: 'Criar Sala',
    allFeaturesOff: 'Todos os recursos desativados',
    home: '<span class="play-tri">◀</span> Início',
    joinLobby: 'Entrar na Sala',
    scanRoom: 'Escanear Sala',
    qrCode: 'Código QR',
    or: 'Ou',
    typeCode: 'Digite o Código',
    enterCode: 'Inserir Código',
    playerLobby: 'Lobby de Jogadores',
    playerListDrag: 'Lista de Jogadores (Arraste para Reordenar)',
    randomFirst: '🎲 Escolher Primeiro Jogador Aleatório',
    duel1st: 'Duelo pelo 1º Jogador',
    startGame: 'Iniciar Jogo <span class="play-tri">▶</span>',
    backToRoomSet: '<span class="play-tri">◀</span> Voltar às Configurações da Sala',
    chooseFirst: 'Escolha uma opção para o Primeiro Jogador',
    spot1Opt: 'Lugar 1',
    randomOpt: 'Aleatório',
    duelOpt: 'Duelo',
    joinedRoom: 'Sala ingressada',
    waitingHost: 'Aguardando o anfitrião começar…',
    leave: 'Sair',
    hosted: 'Organizadas',
    awards: 'Prêmios',
    rooms: 'Salas',
    editProfile: 'Editar Perfil',
    editProfileDesc: 'Altere seu avatar e nome preferido',
    myCollection: 'Minha Coleção',
    myCollectionDesc: 'Jogos de tabuleiro que você possui',
    mySavedGames: 'Meus Jogos Salvos',
    mySavedGamesDesc: 'Ver e retomar suas sessões salvas',
    themes: 'Temas',
    themesDesc: 'Personalize sua experiência visual',
    acctSettings: 'Configurações da Conta',
    acctSettingsDesc: 'Gerencie os detalhes da sua conta',
    backToHome: 'Voltar ao Início',
    signOut: 'Sair',
    welcomeBack: 'Bem-vindo de Volta',
    welcomeSub: 'Entre para acessar sua conta de host',
    createAccount: 'Criar Conta',
    createAccountSub: 'Crie uma conta de host para criar salas',
    logIn: 'Entrar',
    signUp: 'Cadastrar',
    signUpFree: 'Cadastre-se Grátis',
    continueGoogle: 'Continuar com Google',
    emailPh: 'Endereço de e-mail',
    passwordPh: 'Senha',
    forgotPass: 'Esqueceu a senha?',
    close: 'Fechar',
    goToProfile: '👤 Ir para o Perfil',
    linkGoogle: 'Vincular conta do Google',
    email: 'E-mail',
    changePassword: 'Alterar Senha',
    play: 'Jogar',
    buzz: 'Buzz'
  }
};
let lang = 'en';
let loadedLang = null;
function t(key) {
  const dict = I18N_STRINGS[lang] || I18N_STRINGS.en;
  return dict[key] !== undefined ? dict[key] : I18N_STRINGS.en[key] !== undefined ? I18N_STRINGS.en[key] : key;
}
function flagFor(l) {
  switch (l) {
    case 'es': return 'ES';
    case 'zh': return 'ZH';
    case 'de': return 'DE';
    case 'fr': return 'FR';
    case 'ja': return 'JA';
    case 'it': return 'IT';
    case 'pt': return 'PT';
    default: return 'EN';
  }
}
window.toggleLangMenu = function() {
  const m = document.getElementById('lang-menu');
  if (!m) return;
  const show = m.style.display !== 'flex';
  m.style.display = show ? 'flex' : 'none';
};
window.setLang = function(l) {
  lang = l;
  try { localStorage.setItem('sk_lang', l); } catch {}
  const flag = document.getElementById('lang-btn');
  if (flag) flag.textContent = flagFor(l);
  const menu = document.getElementById('lang-menu');
  if (menu) menu.style.display = 'none';
  applyLang();
};
document.addEventListener('click', (e) => {
  const menu = document.getElementById('lang-menu');
  if (!menu || menu.style.display !== 'flex') return;
  if (!e.target.closest('#lang-btn-wrap')) menu.style.display = 'none';
});
function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    el.textContent = val;
    if (val.indexOf('<') !== -1) el.innerHTML = val;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    el.placeholder = t(key);
  });
  const acctBtn = document.getElementById('account-btn');
  if (acctBtn && !acctBtn.dataset.i18nLocked) updateAccountButtonUI();
  if (typeof renderAccountMode === 'function') renderAccountMode();
  if (typeof updateJoinCollapseSummary === 'function') updateJoinCollapseSummary();
  if (typeof updateCreateCollapseSummary === 'function') updateCreateCollapseSummary();
}

// ── CREATOR / USER ROLE ──────────────────────────
// Add your Firebase Auth UIDs here to grant Creator access.
// Creator accounts see all features; User accounts see a stripped-down UI.
const CREATOR_UIDS = [
  'VD8hwPkOLTUN2Dsn1KsIBvUD65p1',
];
let isCreator = false;

// ── SESSION PERSISTENCE (silent auto-resume) ────
// Remembers which room/player this device was last part of, so closing
// the app (or stepping out for food) and coming back drops you right
// back in without rejoining as a new player.
const SK_SESSION_KEY = 'sk_session';
function saveSession() {
  if (!roomCode || !myId) return;
  try {
    localStorage.setItem(SK_SESSION_KEY, JSON.stringify({ roomCode, myId, myName, isHost }));
  } catch {}
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SK_SESSION_KEY) || 'null'); } catch { return null; }
}
function clearSession() {
  try { localStorage.removeItem(SK_SESSION_KEY); } catch {}
}

// ── HOST IDENTITY ──────────────────────────────
// Hosting requires a signed-in account. Saved games are filed under the
// real Firebase Auth UID. Call requireHostAccount() before any host-only
// action to make sure someone's actually logged in first.
function getHostId() {
  return currentUser ? currentUser.uid : null;
}
function requireHostAccount() {
  if (currentUser) return true;
  openAccountOverlay('login');
  return false;
}

// ── ACCOUNT UI ───────────────────────────────────
let accountMode = 'login'; // 'login' | 'signup'

window.openAccountOverlay = function(mode) {
  if (!requireDb()) return;
  accountMode = mode || 'login';
  document.getElementById('account-email').value = '';
  document.getElementById('account-password').value = '';
  status('account-status', '');

  if (currentUser) {
    document.getElementById('account-form-step').style.display = 'none';
    document.getElementById('account-signedin-step').style.display = 'block';
    document.getElementById('account-signedin-email').textContent = currentUser.email || '';
    const hasGoogle = (currentUser.providerData || []).some(p => p.providerId === 'google.com');
    const linkBtn = document.getElementById('google-link-btn');
    if (linkBtn) linkBtn.style.display = hasGoogle ? 'none' : '';
  } else {
    document.getElementById('account-form-step').style.display = 'block';
    document.getElementById('account-signedin-step').style.display = 'none';
    renderAccountMode();
  }
  document.getElementById('account-overlay').classList.add('show');
};
window.closeAccountOverlay = function() {
  document.getElementById('account-overlay').classList.remove('show');
};

function renderAccountMode() {
  const isLogin = accountMode === 'login';
  document.getElementById('account-modal-title').textContent = isLogin ? t('welcomeBack') : t('createAccount');
  document.getElementById('account-modal-subtitle').textContent = isLogin ? t('welcomeSub') : t('createAccountSub');
  document.getElementById('account-submit-btn').textContent = isLogin ? t('logIn') : t('signUpFree');
  const forgotRow = document.getElementById('auth-forgot-link');
  if (forgotRow) forgotRow.style.display = isLogin ? '' : 'none';
  document.getElementById('auth-tab-login').classList.toggle('active', isLogin);
  document.getElementById('auth-tab-signup').classList.toggle('active', !isLogin);
}
window.setAccountTab = function(tab) {
  accountMode = tab;
  status('account-status', '');
  renderAccountMode();
};

document.getElementById('account-email').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); submitAccountForm(); }
});
document.getElementById('account-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); submitAccountForm(); }
});

window.submitAccountForm = async function() {
  if (!auth) { status('account-status', 'Not connected to Firebase yet.', 'error'); return; }
  const email = document.getElementById('account-email').value.trim();
  const password = document.getElementById('account-password').value;
  if (!email || !password) { status('account-status', 'Enter an email and password.', 'error'); return; }
  if (password.length < 6) { status('account-status', 'Password must be at least 6 characters.', 'error'); return; }

  try {
    if (accountMode === 'signup') {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    // If the user started with Google but that email already had a password
    // account, signInWithPopup returned an error carrying a pending credential.
    // Now that they've proven ownership via password, link Google so both
    // sign-in methods point to the same account.
    if (pendingGoogleCredential && auth.currentUser) {
      try {
        await linkWithCredential(auth.currentUser, pendingGoogleCredential);
      } catch (e) {
        // Already linked or linking failed — still signed in, don't block.
      } finally {
        pendingGoogleCredential = null;
      }
    }
    closeAccountOverlay();
  } catch (err) {
    // If signup failed because the email already belongs to a Google account,
    // tell the user to use Google instead of a confusing "email already in use."
    if (accountMode === 'signup' && err && (err.code === 'auth/email-already-in-use')) {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods && methods.includes('google.com')) {
          status('account-status', 'That email is already linked to a Google account — tap "Continue with Google" to sign in.', 'error');
          return;
        }
      } catch (e) {}
    }
    status('account-status', friendlyAuthError(err), 'error');
  }
};

let pendingGoogleCredential = null;

window.continueWithGoogle = async function() {
  if (!auth) { status('account-status', 'Not connected to Firebase yet.', 'error'); return; }
  status('account-status', '');
  const btn = document.getElementById('google-signin-btn');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    closeAccountOverlay();
  } catch (err) {
    const code = err && err.code || '';
    if (code === 'auth/account-exists-with-different-credential') {
      // A password account already exists for this Google email. Save the
      // Google credential and ask the user to sign in with their password —
      // submitAccountForm links the two together on success.
      pendingGoogleCredential = err.credential || null;
      const email = err.email || '';
      if (email) document.getElementById('account-email').value = email;
      setAccountTab('login');
      status('account-status', 'An account already exists with ' + email + '. Sign in with your password to link your Google account.', 'error');
    } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      status('account-status', '');
    } else {
      status('account-status', friendlyAuthError(err), 'error');
    }
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = ''; }
  }
};

window.linkGoogleAccount = async function() {
  if (!auth || !currentUser) return;
  status('account-status', '');
  const btn = document.getElementById('google-link-btn');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
  try {
    await linkWithPopup(currentUser, new GoogleAuthProvider());
    showAlert('Google account linked. You can now sign in with either method.');
  } catch (err) {
    const code = err && err.code || '';
    if (code === 'auth/credential-already-in-use') {
      showAlert('That Google account is already linked to another SideKick account.');
    } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      // cancelled — do nothing
    } else {
      showAlert('Could not link Google: ' + friendlyAuthError(err));
    }
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = ''; }
  }
};

function friendlyAuthError(err) {
  const code = err && err.code || '';
  if (code.includes('email-already-in-use')) return 'That email already has an account — try logging in instead.';
  if (code.includes('invalid-email')) return 'That email address looks invalid.';
  if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) return 'Incorrect email or password.';
  if (code.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (code.includes('network-request-failed')) return 'Network error — check your connection and try again.';
  if (code.includes('popup-blocked')) return 'Popup was blocked — allow popups for this site, or use email instead.';
  if (code.includes('unauthorized-domain')) return 'Google sign-in is not enabled for this domain yet. Enable it in Firebase console ▶ Authentication ▶ Sign-in method ▶ Google ▶ Authorized domains.';
  return (err && err.message) ? err.message : 'Something went wrong. Please try again.';
}

window.resetPassword = async function() {
  if (!auth) { status('account-status', 'Not connected to Firebase yet.', 'error'); return; }
  const email = document.getElementById('account-email').value.trim();
  if (!email) { status('account-status', 'Enter your email above, then click Forgot password.', 'error'); return; }
  try {
    await sendPasswordResetEmail(auth, email);
    status('account-status', 'Reset link sent — check your inbox.', '');
  } catch (err) {
    const code = err && err.code || '';
    if (code.includes('user-not-found')) { status('account-status', 'No account found with that email.', 'error'); return; }
    status('account-status', friendlyAuthError(err), 'error');
  }
};

window.doSignOut = async function() {
  if (!auth) return;
  try {
    await signOut(auth);
    showScreen('home');
  } catch (err) {
    showAlert('Sign out failed: ' + (err && err.message ? err.message : err));
  }
};

window.confirmSignOut = async function() {
  if (await showConfirm('Sign out of your host account?')) {
    doSignOut();
  }
};

// Defensively closes any overlay that might still be showing (e.g. if My
// Saved Games or Account was left open) before switching screens, so the
// button always visibly takes you home.
window.backToHomeFromProfile = function() {
  ['my-saves-overlay','account-overlay','resume-overlay','tools-overlay','rng-overlay','timer-overlay','picker-overlay','status-menu-overlay','status-alert-overlay','features-config-overlay','settings-overlay','themes-overlay','avatar-overlay','name-overlay','edit-profile-overlay','room-avatar-overlay','tutorial-overlay','my-awards-overlay','features-help-overlay','collection-overlay','collection-edit-overlay','duel-mode-overlay','duel-setup-overlay','duel-live-overlay','duel-score-overlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
  showScreen('home');
};

function getSavedAvatar() {
  try {
    const uid = currentUser?.uid || '';
    if (uid) {
      const key = 'sk_avatar_' + uid;
      const val = localStorage.getItem(key);
      if (val) return val;
      const legacy = localStorage.getItem('sk_avatar');
      if (legacy) { localStorage.setItem(key, legacy); return legacy; }
      return '';
    }
    return localStorage.getItem('sk_avatar') || '';
  } catch { return ''; }
}

function saveAvatar(emoji) {
  try {
    const uid = currentUser?.uid || '';
    if (uid) localStorage.setItem('sk_avatar_' + uid, emoji);
    else localStorage.setItem('sk_avatar', emoji);
    // Sync to Firebase
    if (uid && db) set(ref(db, `users/${uid}/avatar`), emoji).catch(() => {});
  } catch {}
  if (roomCode && myId) {
    set(ref(db, `rooms/${roomCode}/players/${myId}/avatar`), emoji).catch(() => {});
  }
}

function getSavedName() {
  try {
    const uid = currentUser?.uid || '';
    if (uid) {
      const key = 'sk_preferred_name_' + uid;
      const val = localStorage.getItem(key);
      if (val) return val;
      const legacy = localStorage.getItem('sk_preferred_name');
      if (legacy) { localStorage.setItem(key, legacy); return legacy; }
      return '';
    }
    return localStorage.getItem('sk_preferred_name') || '';
  } catch { return ''; }
}

function saveName(name) {
  try {
    const uid = currentUser?.uid || '';
    if (uid) localStorage.setItem('sk_preferred_name_' + uid, name);
    else localStorage.setItem('sk_preferred_name', name);
    // Sync to Firebase
    if (uid && db) set(ref(db, `users/${uid}/preferredName`), name).catch(() => {});
  } catch {}
}

function getSavedColor() {
  try {
    const uid = currentUser?.uid || '';
    if (uid) {
      const key = 'sk_color_' + uid;
      const val = localStorage.getItem(key);
      if (val) return val;
      return '';
    }
    return localStorage.getItem('sk_color') || '';
  } catch { return ''; }
}

function saveColor(hex) {
  try {
    const uid = currentUser?.uid || '';
    if (uid) localStorage.setItem('sk_color_' + uid, hex);
    else localStorage.setItem('sk_color', hex);
    if (uid && db) set(ref(db, `users/${uid}/color`), hex).catch(() => {});
  } catch {}
}

// Applies the preferred color as the ring around the profile avatar
function applyProfileRingColor() {
  const ring = document.querySelector('.profile-avatar-ring');
  if (!ring) return;
  const color = getSavedColor();
  if (color) {
    ring.style.background = color;
    ring.style.boxShadow = `0 0 24px ${color}66, 0 0 48px ${color}33`;
  } else {
    ring.style.background = '';
    ring.style.boxShadow = '';
  }
}

// ── FIREBASE USER PROFILE SYNC ───────────────────
// Saves per-user data to Firebase so it survives uninstall/reinstall
function syncProfileToFirebase(uid, data) {
  if (!db || !uid) return;
  set(ref(db, `users/${uid}`), data).catch(() => {});
}

async function loadProfileFromFirebase(uid) {
  if (!db || !uid) return null;
  try {
    const snap = await get(ref(db, `users/${uid}`));
    return snap.exists() ? snap.val() : null;
  } catch { return null; }
}

// Call on login to pull Firebase data into localStorage
async function syncProfileFromFirebase() {
  const uid = currentUser?.uid;
  if (!uid) return;
  const profile = await loadProfileFromFirebase(uid);
  // If Firebase has data, pull it into localStorage
  if (profile) {
    if (profile.preferredName) localStorage.setItem('sk_preferred_name_' + uid, profile.preferredName);
    if (profile.avatar) localStorage.setItem('sk_avatar_' + uid, profile.avatar);
    if (profile.color) localStorage.setItem('sk_color_' + uid, profile.color);
    if (profile.hostedCount != null) localStorage.setItem('sk_hosted_count', String(profile.hostedCount));
    if (profile.roomsCount != null) localStorage.setItem('sk_rooms_count', String(profile.roomsCount));
    if (profile.awards) localStorage.setItem('sk_awards_' + uid, JSON.stringify(profile.awards));
    if (profile.theme) localStorage.setItem('sk_theme', profile.theme);
    if (profile.namedTheme) localStorage.setItem('sk_named_theme', profile.namedTheme);
    if (profile.namedTheme || profile.theme) {
      applyFullTheme(profile.namedTheme || 'default', profile.theme === 'light');
    }
  }
  // Migrate legacy localStorage data to Firebase if Firebase is empty
  if (!profile || (!profile.preferredName && !profile.avatar)) {
    const legacyName = localStorage.getItem('sk_preferred_name') || '';
    const legacyAvatar = localStorage.getItem('sk_avatar') || '';
    const legacyColor = localStorage.getItem('sk_color') || '';
    if (legacyName || legacyAvatar || legacyColor) {
      const data = {};
      if (legacyName) { data.preferredName = legacyName; localStorage.setItem('sk_preferred_name_' + uid, legacyName); }
      if (legacyAvatar) { data.avatar = legacyAvatar; localStorage.setItem('sk_avatar_' + uid, legacyAvatar); }
      if (legacyColor) { data.color = legacyColor; localStorage.setItem('sk_color_' + uid, legacyColor); }
      syncProfileToFirebase(uid, data);
    }
  }
  // Refresh UI now that localStorage is populated
  updateAccountButtonUI();
}

// ── AVATAR CATEGORIES ────────────────────────────
// Image sets referenced in multiple categories
const AVATAR_IMG_SET = [
  'img/avatars/1.png', 'img/avatars/2.png', 'img/avatars/3.png', 'img/avatars/4.png',
  'img/avatars/A1.png', 'img/avatars/A2.png', 'img/avatars/A3.png', 'img/avatars/A4.png', 'img/avatars/A5.png', 'img/avatars/A6.png',
  'img/avatars/B1.png', 'img/avatars/B2.png', 'img/avatars/B3.png', 'img/avatars/B4.png',
  'img/avatars/Barbarian.png'
];

const AVATAR_CATEGORIES = [
  {
    key: 'free', label: 'Free',
    avatars: ['😀', '😄', '😊', '😎', '🦊', '🐼', '🌟', '🎲']
  },
  {
    key: 'fantasy', label: 'Fantasy',
    avatars: [
      '🧙', '🧝', '🧛', '🧜', '🧞', '🐉', '🦄', '🐺', '⚔️', '🛡️', '🏹', '🔮', '🗡️', '👑',
      ...AVATAR_IMG_SET
    ]
  },
  {
    key: 'scifi', label: 'Sci-Fi',
    avatars: [
      '👽', '🤖', '🛸', '🚀', '👾', '🧬', '⚙️', '💫', '🌌',
      ...AVATAR_IMG_SET
    ]
  },
  {
    key: 'nature', label: 'Nature',
    avatars: [
      '🌲', '🌳', '🌵', '🍄', '🌸', '🌻', '🍀', '🐻', '🦅', '🦉', '🐸', '🦋', '🌊', '⛰️',
      ...AVATAR_IMG_SET
    ]
  },
  {
    key: 'modern', label: 'Modern',
    avatars: [
      '😎', '🧢', '🕶️', '💼', '📱', '💻', '🎧', '⌚', '🏃', '🚗',
      ...AVATAR_IMG_SET
    ]
  },
  {
    key: 'special', label: 'Special',
    avatars: [
      '💎', '🌟', '🔥', '🎲', '🏆', '⚡', '🎁', '🎯', '💰', '🍀',
      ...AVATAR_IMG_SET
    ]
  },
  {
    key: 'emoji', label: 'Emoji',
    avatars: [
      '😀', '😃', '😄', '😁', '😆', '😊', '😍', '🤩', '😎', '🥳', '😜', '🤪', '😈', '👻', '💀', '🤡',
      '🙂', '😇', '🤠', '🤑', '🤗', '😺', '🙈', '💩',
      ...AVATAR_IMG_SET
    ]
  }
];

// "All" category = every unique avatar across all categories
(function() {
  const seen = new Set();
  const all = [];
  AVATAR_CATEGORIES.forEach(cat => {
    cat.avatars.forEach(a => {
      if (!seen.has(a)) { seen.add(a); all.push(a); }
    });
  });
  AVATAR_CATEGORIES.push({ key: 'all', label: 'All', avatars: all });
})();

// Preload all avatar images once so tab switching is instant
(function() {
  const seen = new Set();
  AVATAR_CATEGORIES.forEach(cat => {
    cat.avatars.forEach(a => {
      if (isImageAvatar(a) && !seen.has(a)) {
        seen.add(a);
        const img = new Image();
        img.src = a;
      }
    });
  });
})();

function isImageAvatar(val) {
  return val && (val.endsWith('.png') || val.endsWith('.jpg') || val.endsWith('.jpeg') || val.endsWith('.webp') || val.endsWith('.gif') || val.startsWith('img/'));
}

function avatarHTML(val, size) {
  if (!val) val = '👤';
  size = size || 28;
  if (isImageAvatar(val)) {
    return '<img src="' + val + '" alt="avatar" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;display:inline-block;vertical-align:middle;">';
  }
  return val;
}

function setAvatarEl(el, val, size) {
  if (!el) return;
  if (!val) val = '👤';
  size = size || parseInt(el.style.fontSize) || 28;
  if (isImageAvatar(val)) {
    el.innerHTML = '';
    var img = document.createElement('img');
    img.src = val; img.alt = 'avatar';
    img.style.cssText = 'width:' + size + 'px;height:' + size + 'px;border-radius:12px;object-fit:cover;display:inline-block;';
    el.appendChild(img);
  } else {
    el.textContent = val;
  }
}

// Shared state for which tab is active per picker
const avatarTabState = {};

function getCategoryAvatars(key) {
  const cat = AVATAR_CATEGORIES.find(c => c.key === key);
  return cat ? cat.avatars : [];
}

// Render a single avatar option button
function makeAvatarOption(avatar, isSelected, onClick) {
  const btn = document.createElement('button');
  btn.className = 'avatar-option' + (isSelected ? ' selected' : '');
  if (isImageAvatar(avatar)) {
    var img = document.createElement('img');
    img.src = avatar; img.alt = 'avatar';
    btn.appendChild(img);
  } else {
    btn.textContent = avatar;
  }
  btn.setAttribute('data-avatar', avatar);
  btn.onclick = onClick;
  return btn;
}

// Render tabs + grid into a picker (all three pickers share this)
function renderAvatarPicker(pickerId, current, onPick) {
  const tabsEl = document.getElementById(pickerId + '-tabs');
  const gridEl = document.getElementById(pickerId + '-grid');
  if (!tabsEl || !gridEl) return;
  if (!avatarTabState[pickerId]) avatarTabState[pickerId] = 'free';

  const activeKey = avatarTabState[pickerId];

  // Tabs
  tabsEl.innerHTML = '';
  AVATAR_CATEGORIES.forEach(cat => {
    const tab = document.createElement('button');
    tab.className = 'avatar-tab' + (cat.key === activeKey ? ' active' : '');
    tab.textContent = cat.label;
    tab.onclick = () => {
      avatarTabState[pickerId] = cat.key;
      renderAvatarPicker(pickerId, current, onPick);
      haptic(5);
    };
    tabsEl.appendChild(tab);
  });

  // Grid
  gridEl.innerHTML = '';
  getCategoryAvatars(activeKey).forEach(avatar => {
    gridEl.appendChild(makeAvatarOption(avatar, avatar === current, () => onPick(avatar)));
  });
}

window.openAvatarOverlay = function() {
  const current = getSavedAvatar();
  renderAvatarPicker('avatar', current, avatar => {
    document.querySelectorAll('#avatar-grid .avatar-option').forEach(el => el.classList.remove('selected'));
    const active = document.querySelector(`#avatar-grid .avatar-option[data-avatar="${CSS.escape(avatar)}"]`);
    if (active) active.classList.add('selected');
    haptic(5);
  });
  document.getElementById('avatar-overlay').classList.add('show');
};

window.confirmAvatarOverlay = function() {
  const grid = document.getElementById('avatar-grid');
  const selected = grid?.querySelector('.avatar-option.selected');
  if (selected) selectAvatar(selected.getAttribute('data-avatar'));
  closeAvatarOverlay();
};

window.closeAvatarOverlay = function() {
  document.getElementById('avatar-overlay').classList.remove('show');
};

let nameOverlayVHListener = null;
function cleanupNameOverlayPosition() {
  if (nameOverlayVHListener) { window.visualViewport.removeEventListener('resize', nameOverlayVHListener); nameOverlayVHListener = null; }
  const m = document.getElementById('name-modal');
  if (m) { m.style.position = ''; m.style.top = ''; m.style.left = ''; m.style.transform = ''; }
}
window.openNameOverlay = function() {
  document.getElementById('preferred-name-input').value = getSavedName();
  document.getElementById('save-name-btn').onclick = function() {
    var val = document.getElementById('preferred-name-input').value.trim();
    saveName(val);
    updateAccountButtonUI();
    const profileNameEl = document.getElementById('profile-name');
    if (profileNameEl) profileNameEl.textContent = val || 'User';
    document.getElementById('name-overlay').classList.remove('show');
    cleanupNameOverlayPosition();
  };
  document.getElementById('name-overlay').classList.add('show');
  setTimeout(function() { document.getElementById('preferred-name-input').focus(); }, 100);
  const nameModal = document.getElementById('name-modal');
  nameOverlayVHListener = function() {
    const vh = window.visualViewport.height;
    if (vh < window.innerHeight * 0.75) {
      nameModal.style.position = 'fixed';
      nameModal.style.top = Math.max(16, vh * 0.3) + 'px';
      nameModal.style.left = '50%';
      nameModal.style.transform = 'translateX(-50%)';
    } else {
      nameModal.style.position = '';
      nameModal.style.top = '';
      nameModal.style.left = '';
      nameModal.style.transform = '';
    }
  };
  window.visualViewport.addEventListener('resize', nameOverlayVHListener);
  nameOverlayVHListener();
};

window.closeNameOverlay = function() {
  document.getElementById('name-overlay').classList.remove('show');
  cleanupNameOverlayPosition();
};

window.openEditProfileOverlay = function() {
  const current = getSavedAvatar();
  editProfileColorSelection = getSavedColor() || '';
  renderAvatarPicker('edit-profile-avatar', current, avatar => {
    document.querySelectorAll('#edit-profile-avatar-grid .avatar-option').forEach(el => el.classList.remove('selected'));
    const active = document.querySelector(`#edit-profile-avatar-grid .avatar-option[data-avatar="${CSS.escape(avatar)}"]`);
    if (active) active.classList.add('selected');
    haptic(5);
  });
  document.getElementById('edit-profile-name-input').value = getSavedName();
  updateEditProfileColorButton();
  document.getElementById('edit-profile-overlay').classList.add('show');
};

function updateEditProfileColorButton() {
  const btn = document.getElementById('edit-profile-color-btn');
  const label = document.getElementById('edit-profile-color-label');
  if (!btn || !label) return;
  const color = editProfileColorSelection;
  if (color) {
    btn.style.background = color;
    btn.style.borderColor = color;
    btn.classList.toggle('light-fill', isLightColor(color));
    const colorName = PLAYER_COLORS.find(c => c.hex === color)?.name || 'Custom';
    label.textContent = colorName;
    label.style.color = isLightColor(color) ? '#000' : '#fff';
    label.style.fontSize = '0.66rem';
  } else {
    btn.style.background = '';
    btn.style.borderColor = '';
    btn.classList.remove('light-fill');
    label.textContent = 'Choose\nColor';
    label.style.color = '';
    label.style.fontSize = '0.66rem';
  }
}

window.openEditProfileColorOverlay = function() {
  const grid = document.getElementById('edit-profile-color-grid');
  grid.innerHTML = '';
  const cur = editProfileColorSelection;
  PLAYER_COLORS.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (c.hex === cur ? ' selected' : '') + (isLightColor(c.hex) ? ' light-fill' : '');
    sw.style.background = c.hex;
    sw.title = c.name;
    sw.setAttribute('role', 'button');
    sw.setAttribute('tabindex', '0');
    sw.onclick = () => {
      grid.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      editProfileColorSelection = c.hex;
      haptic(5);
    };
    grid.appendChild(sw);
  });
  document.getElementById('edit-profile-color-overlay').classList.add('show');
};

window.confirmEditProfileColor = function() {
  document.getElementById('edit-profile-color-overlay').classList.remove('show');
  updateEditProfileColorButton();
  haptic(5);
};

window.closeEditProfileOverlay = function() {
  document.getElementById('edit-profile-overlay').classList.remove('show');
};

window.saveEditProfile = function() {
  const grid = document.getElementById('edit-profile-avatar-grid');
  const selectedBtn = grid?.querySelector('.avatar-option.selected');
  if (selectedBtn) {
    const emoji = selectedBtn.getAttribute('data-avatar');
    saveAvatar(emoji);
    setAvatarEl(document.getElementById('profile-avatar'), emoji, 90);
  }
  const name = document.getElementById('edit-profile-name-input').value.trim();
  saveName(name);
  // Preferred color
  if (editProfileColorSelection) {
    saveColor(editProfileColorSelection);
    editProfileColorSelection = '';
  }
  applyProfileRingColor();
  updateAccountButtonUI();
  const profileNameEl = document.getElementById('profile-name');
  if (profileNameEl) profileNameEl.textContent = name || 'User';
  document.getElementById('edit-profile-overlay').classList.remove('show');
};

window.openAccountSettingsOverlay = function() {
  const email = currentUser?.email || 'Not signed in';
  document.getElementById('acct-settings-email').textContent = email;
  document.getElementById('account-settings-overlay').classList.add('show');
};

window.selectAvatar = function(emoji) {
  saveAvatar(emoji);
  document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
  const active = document.querySelector(`.avatar-option[data-avatar="${emoji}"]`);
  if (active) active.classList.add('selected');
  setAvatarEl(document.getElementById('profile-avatar'), emoji, 90);
  const hostAvLabel = document.getElementById('host-avatar-label');
  setAvatarLabel(hostAvLabel, emoji);
  updateAccountButtonUI();
};

// ── ROOM AVATAR PICKER (Standalone, no auth required) ──
let roomAvatarSelection = '';
let editProfileColorSelection = '';

window.openRoomAvatarOverlay = function() {
  const current = roomAvatarSelection || getSavedAvatar();
  renderAvatarPicker('room-avatar', current, avatar => {
    roomAvatarSelection = avatar;
    document.querySelectorAll('#room-avatar-grid .avatar-option').forEach(s => s.classList.remove('selected'));
    const active = document.querySelector(`#room-avatar-grid .avatar-option[data-avatar="${CSS.escape(avatar)}"]`);
    if (active) active.classList.add('selected');
    haptic(5);
  });
  document.getElementById('room-avatar-overlay').classList.add('show');
};

window.confirmRoomAvatar = function() {
  if (!roomAvatarSelection) {
    const saved = getSavedAvatar();
    if (saved) roomAvatarSelection = saved;
    else return;
  }
  const hostAvLabel = document.getElementById('host-avatar-label');
  const joinAvLabel = document.getElementById('join-avatar-label');
  setAvatarLabel(hostAvLabel, roomAvatarSelection);
  setAvatarLabel(joinAvLabel, roomAvatarSelection);
  const avatarNote = document.getElementById('avatar-required-note');
  if (avatarNote) avatarNote.style.display = 'none';
  closeRoomAvatarOverlay();
  updateJoinCollapseSummary();
  haptic(5);
};

window.closeRoomAvatarOverlay = function() {
  document.getElementById('room-avatar-overlay').classList.remove('show');
};

// Renders the avatar label for the Choose Avatar buttons in Host/Join Room.
// Shows just the avatar (image preview or emoji) once one is picked, filling the button.
function setAvatarLabel(el, avatar) {
  if (!el) return;
  const btn = el.closest('.color-picker-btn');
  if (!avatar) {
    const avatarFallback = { en: 'Choose\nAvatar', es: 'Elegir\nAvatar', zh: '选择\n头像', de: 'Avatar\nwählen', fr: 'Choisir un\navatar', ja: 'アバターを\n選択', it: 'Scegli\nAvatar', pt: 'Escolher\nAvatar' };
    el.textContent = avatarFallback[lang] || 'Choose\nAvatar';
    if (btn) btn.classList.remove('avatar-filled');
    return;
  }
  if (btn) btn.classList.add('avatar-filled');
  if (isImageAvatar(avatar)) {
    el.textContent = '';
    const img = document.createElement('img');
    img.src = avatar; img.alt = 'avatar';
    img.className = 'avatar-btn-preview';
    el.appendChild(img);
  } else {
    el.textContent = avatar;
  }
}

window.openProfileScreen = function() {
  if (!currentUser) { openAccountOverlay('login'); return; }
  const email = currentUser.email || '';

  const avatar = getSavedAvatar();
  const avatarEl = document.getElementById('profile-avatar');
  setAvatarEl(avatarEl, avatar || email.charAt(0).toUpperCase(), 90);

  const name = getSavedName();
  const nameEl = document.getElementById('profile-name');
  nameEl.textContent = name || email.split('@')[0] || 'User';

  applyProfileRingColor();

  const isHost = CREATOR_UIDS.includes(currentUser.uid);
  const badge = document.getElementById('profile-role-badge');
  const roleText = document.getElementById('profile-role-text');
  if (badge && roleText) {
    badge.style.display = isHost ? 'inline-flex' : 'none';
    roleText.textContent = isHost ? 'Host Account' : 'Player Account';
  }

  const hostedEl = document.getElementById('profile-games-hosted');
  const awardsEl = document.getElementById('profile-awards-count');
  const roomsEl = document.getElementById('profile-rooms-created');
  const hostedCount = localStorage.getItem('sk_hosted_count') || '0';
  const roomsCount = localStorage.getItem('sk_rooms_count') || '0';
  const awardsList = currentUser ? JSON.parse(localStorage.getItem('sk_awards_' + currentUser.uid) || '[]') : [];
  if (hostedEl) hostedEl.textContent = hostedCount;
  if (awardsEl) awardsEl.textContent = String(awardsList.length);
  if (roomsEl) roomsEl.textContent = roomsCount;

  showScreen('profile');
};

// Reflects sign-in state on the home screen's account button
function updateAccountButtonUI() {
  const btn = document.getElementById('account-btn');
  if (!btn) return;
  if (currentUser) {
    const name = getSavedName();
    const initial = (currentUser.email || '?').charAt(0).toUpperCase();
    btn.textContent = t('hey') + ' ' + (name || initial) + '!';
    btn.onclick = () => openProfileScreen();
  } else {
    btn.textContent = t('login');
    btn.onclick = () => openAccountOverlay('login');
  }
}

// ── TURN MODE SELECTION ─────────────────────────

let _selectedClassicDir = '';
let _selectedSpeedMode  = '';
let _speedRoundFromTool = false;

// ── Inline direction picker on Step 2
window.selectInlineDir = function(dir) {
  _selectedClassicDir = dir;
  document.querySelectorAll('#tm-inline-cw, #tm-inline-ccw, #tm-inline-both').forEach(el => el.classList.remove('selected'));
  const opt = document.getElementById('tm-inline-' + dir);
  if (opt) opt.classList.add('selected');
  document.getElementById('tm-required-note').style.display = 'none';
  turnMode = 'classic';
  passDirection = dir;
  const labels = { cw: '↻ Left', both: '↔ Left & Right', ccw: '↺ Right' };
  const selTxt = document.getElementById('tm-summary');
  if (selTxt) selTxt.innerHTML = 'Turn Direction — <span>' + (labels[dir] || dir) + '</span>';
};

// ── Classic Direction picker
window.selectClassicDir = function(dir) {
  _selectedClassicDir = dir;
  document.querySelectorAll('#classic-dir-overlay .dir-option').forEach(el => el.classList.remove('selected'));
  const opt = document.getElementById('tmdir-' + dir);
  if (opt) opt.classList.add('selected');
};

window.confirmClassicDir = function() {
  if (!_selectedClassicDir) return;
  turnMode = 'classic';
  passDirection = _selectedClassicDir;
  document.getElementById('classic-dir-overlay').classList.remove('show');
  const labels = { cw: '↻ Left', both: '↔ Left & Right', ccw: '↺ Right' };
  const selTxt = document.getElementById('tm-summary');
  if (selTxt) selTxt.innerHTML = `Turn Direction — <span>${labels[passDirection] || passDirection}</span>`;
};

window.closeClassicDirOverlay = function() {
  document.getElementById('classic-dir-overlay').classList.remove('show');
};

// ── Speed Mode picker
window.selectSpeedMode = function(mode) {
  _selectedSpeedMode = mode;
  document.querySelectorAll('#speed-mode-overlay .dir-option').forEach(el => el.classList.remove('selected'));
  const opt = document.getElementById(mode === 'firstToTap' ? 'tmspeed-first' : 'tmspeed-line');
  if (opt) opt.classList.add('selected');
  document.getElementById('speed-mode-required').style.display = 'none';
};

window.confirmSpeedMode = function() {
  if (!_selectedSpeedMode) {
    document.getElementById('speed-mode-required').style.display = 'block';
    return;
  }
  const rounds = parseInt(document.getElementById('speed-rounds-total').value) || 3;
  turnMode = 'speedRound';
  speedMode = _selectedSpeedMode;
  speedRoundsTotal = rounds;
  document.getElementById('speed-mode-overlay').classList.remove('show');

  if (_speedRoundFromTool) {
    _speedRoundFromTool = false;
    const tov = document.getElementById('tools-overlay');
    if (tov) tov.classList.remove('show');
    createSpeedRoundRoom();
    return;
  }

  const modeLabels = { firstToTap: '🥇 1st To Tap', downTheLine: '📋 Down The Line' };
  const selTxt2 = document.getElementById('tm-summary');
  if (selTxt2) selTxt2.innerHTML = '⚡ Speed Round — <span>' + modeLabels[speedMode] + '</span> · ' + rounds + ' rounds';
};

window.closeSpeedModeOverlay = function() {
  document.getElementById('speed-mode-overlay').classList.remove('show');
  _speedRoundFromTool = false;
};

// ── Speed Round from Tools: create room immediately
window.openSpeedRoundFromTool = function() {
  _speedRoundFromTool = true;
  document.getElementById('speed-mode-overlay').classList.add('show');
  rdDialInit('speed-rd-dial-outer','speed-rd-dial-knob','speed-rd-dial-value','speed-rounds-total', parseInt(document.getElementById('speed-rounds-total').value) || 3);
};

async function createSpeedRoundRoom() {
  if (!requireDb()) return;
  const name = document.getElementById('host-name')?.value?.trim() || myName || '';
  if (!name) { status('create-status','Enter your name first.','error'); return; }

  isHost = true;
  if (!myId) myId = uid();
  myName = name;
  roomCode = genCode();

  let roomRef = ref(db, 'rooms/' + roomCode);
  const existing = await get(roomRef);
  if (existing.exists()) { roomCode = genCode(); roomRef = ref(db, 'rooms/' + roomCode); }

  await set(roomRef, {
    host: myId,
    status: 'lobby',
    activePlayerIndex: 0,
    lastActivity: Date.now(),
    features: {
      passDirection: '',
      nudge: featureNudgeEnabled,
      nudgeDelay: 0,
      nudgeMode: 'multi',
      awards: featureAwardsEnabled,
      victoryPoints: featureVPEnabled,
      statusEffects: featureStatusEffectsEnabled,
      dndTurnComponents: featureDndEnabled,
      timers: featureTimersEnabled,
      timerTurnOn: false,
      timerTurnVisible: false,
      timerRoundOn: false,
      timerRoundVisible: false,
      timerGameOn: false,
      timerGameVisible: false,
      timerCountdownOn: false,
      timerCountdownVisible: false,
      timerCountdownSecs: 30,
      rounds: featureRoundsEnabled,
      roundsTotal: featureRoundsEnabled ? 3 : 0,
      turnMode: 'speedRound',
      speedMode: speedMode,
      speedRoundsTotal: speedRoundsTotal,
      undo: featureUndoEnabled
    },
    currentRound: featureRoundsEnabled ? 1 : 0,
    buzzCurrentRound: 1,
    buzzPhase: 'waiting',
    buzzScores: {},
    buzzTapOrder: {},
    players: {
      [myId]: { name, order: 0, joinedAt: Date.now(), color: myColor, avatar: roomAvatarSelection || '👤' }
    }
  });
  haptic(20);
  document.getElementById('display-code').textContent = roomCode;
  saveSession();
  showScreen('lobby');
  generateLobbyQR();
  listenLobby();
}

// ══════════════════════════════════════════════
// SPEED ROUND GAME ENGINE
// ══════════════════════════════════════════════

// Start listening to the buzz node in Firebase for this room
function startBuzzListener() {
  if (buzzListener) return; // already listening
  const buzzRef = ref(db, `rooms/${roomCode}/buzz`);
  buzzListener = onValue(buzzRef, snap => {
    if (!snap.exists()) return;
    renderBuzzScreen(snap.val());
  });
}

function stopBuzzListener() {
  if (buzzListener) { buzzListener(); buzzListener = null; }
}

// Render the buzz screen from Firebase state
function renderBuzzScreen(buzz) {
  if (!buzz) return;
  buzzPhase       = buzz.phase       || 'waiting';
  buzzCurrentRound= buzz.currentRound|| 1;
  buzzScores      = buzz.scores      || {};
  buzzTapOrder    = buzz.tapOrder    || {};
  buzzWinner      = buzz.winner      || null;
  buzzDtlIndex    = buzz.dtlIndex    || 0;
  buzzRoundStartTime = buzz.roundStartTime || null;

  // Build ordered tap list for Down The Line
  buzzDtlOrder = Object.entries(buzzTapOrder)
    .sort((a,b) => a[1] - b[1])
    .map(e => e[0]);

  const total = buzz.totalRounds || speedRoundsTotal;

  // Round label
  const isFinal = buzzCurrentRound >= total;
  const rl = document.getElementById('buzz-round-label');
  const rf = document.getElementById('buzz-round-fraction');
  if (rl) { rl.textContent = isFinal ? 'Final Round' : `Round ${buzzCurrentRound}`; rl.classList.toggle('final', isFinal); }
  if (rf) rf.textContent = `${buzzCurrentRound}/${total}`;

  // Scores row
  renderBuzzScoreChips();

  // Host crown and manage buttons
  const crownDiv = document.getElementById('host-crown-buzz');
  const crownBtn = document.getElementById('host-crown-btn-buzz');
  const mngBtn   = document.getElementById('host-manage-btn-buzz');
  if (crownDiv) crownDiv.style.display = isHost ? 'flex' : 'none';
  if (crownBtn) crownBtn.classList.toggle('visible', isHost);
  if (mngBtn)   {
    if (isHost) {
      mngBtn.classList.add('visible');
      mngBtn.style.display = '';
    } else {
      mngBtn.style.display = 'none';
    }
  }

  if (buzzPhase === 'complete') {
    showBuzzComplete();
    return;
  }

  // Left the "complete" phase (e.g. host hit Play Again) — make sure the
  // final-scores overlay is hidden on every client, not just the host's.
  const buzzCompleteEl = document.getElementById('buzz-complete');
  if (buzzCompleteEl) buzzCompleteEl.classList.remove('show');

  // Route ALL players to buzz screen
  showScreen('buzz');

  if (buzzPhase === 'waiting') {
    renderBuzzWaiting();
  } else if (buzzPhase === 'locked') {
    renderBuzzLocked();
  } else if (buzzPhase === 'downtheline') {
    renderBuzzDownTheLine();
  }
}

function renderBuzzWaiting() {
  const btnWrap = document.getElementById('buzz-btn-wrap');
  const tapLbl  = document.getElementById('buzz-tap-label');
  const winDisp = document.getElementById('buzz-winner-display');
  const ordList = document.getElementById('buzz-order-list');
  const hostAct = document.getElementById('buzz-host-actions');
  const tapZone = document.getElementById('buzz-tap-zone');
  const buzzBtn = document.getElementById('buzz-btn');

  if (btnWrap) btnWrap.style.display = 'flex';
  if (tapLbl)  { tapLbl.style.display = ''; tapLbl.textContent = 'Tap anywhere to buzz in!'; }
  if (winDisp) winDisp.style.display = 'none';
  if (ordList) ordList.style.display = 'none';
  if (hostAct) hostAct.classList.remove('show');
  if (tapZone) tapZone.style.display = 'block';
  if (buzzBtn) { buzzBtn.classList.remove('locked', 'tapped'); }
}

function renderBuzzLocked() {
  const btnWrap = document.getElementById('buzz-btn-wrap');
  const tapLbl  = document.getElementById('buzz-tap-label');
  const winDisp = document.getElementById('buzz-winner-display');
  const ordList = document.getElementById('buzz-order-list');
  const hostAct = document.getElementById('buzz-host-actions');
  const tapZone = document.getElementById('buzz-tap-zone');
  const buzzBtn = document.getElementById('buzz-btn');

  // Disable tap zone — round is locked
  if (tapZone) tapZone.style.display = 'none';
  if (btnWrap) btnWrap.style.display = 'none';
  if (tapLbl)  tapLbl.style.display = 'none';
  if (ordList) ordList.style.display = 'none';
  if (buzzBtn) buzzBtn.classList.add('locked');

  // Winner info
  if (winDisp && buzzWinner) {
    winDisp.style.display = 'flex';
    const winner = localPlayers.find(p => p.id === buzzWinner);
    const nameEl = document.getElementById('buzz-winner-name');
    const subEl  = document.getElementById('buzz-winner-sub');
    const statEl = document.getElementById('buzz-status-label');
    const timeStr = buzzFormatTime(buzzWinner);
    if (nameEl) { nameEl.textContent = winner ? winner.name : '?'; nameEl.style.color = winner?.color || '#f43f5e'; }
    if (subEl)  subEl.textContent = timeStr ? `buzzed in first — ${timeStr}` : 'buzzed in first!';
    if (statEl) statEl.textContent = buzzWinner === myId ? '⚡ You Were The Fastest!' : 'Fastest Finger!';
  }

  // Host action buttons
  if (isHost) {
    if (hostAct) hostAct.classList.add('show');
    const nextBtn = document.getElementById('buzz-next-btn');
    if (nextBtn) nextBtn.textContent = '↩ No Point';
  } else {
    if (hostAct) hostAct.classList.remove('show');
  }
}

function renderBuzzDownTheLine() {
  const btnWrap = document.getElementById('buzz-btn-wrap');
  const tapLbl  = document.getElementById('buzz-tap-label');
  const winDisp = document.getElementById('buzz-winner-display');
  const ordList = document.getElementById('buzz-order-list');
  const hostAct = document.getElementById('buzz-host-actions');
  const tapZone = document.getElementById('buzz-tap-zone');

  if (tapZone) tapZone.style.display = 'none';
  if (btnWrap) btnWrap.style.display = 'none';
  if (tapLbl)  tapLbl.style.display = 'none';

  // Show ordered list
  if (ordList) {
    ordList.style.display = 'flex';
    ordList.innerHTML = '';
    buzzDtlOrder.forEach((uid, i) => {
      const p = localPlayers.find(pl => pl.id === uid);
      const timeStr = buzzFormatTime(uid);
      const row = document.createElement('div');
      row.className = 'buzz-order-row' + (i === buzzDtlIndex ? ' active-row' : '');
      row.innerHTML = `<span class="buzz-order-pos">#${i+1}</span><span class="buzz-order-dot" style="background:${p?.color||'#888'}"></span><span style="flex:1">${esc(p?.name||'?')}</span><span class="buzz-order-time">${timeStr}</span>`;
      ordList.appendChild(row);
    });
  }

  // Active candidate info
  const activeUid = buzzDtlOrder[buzzDtlIndex];
  if (activeUid) {
    const activeP = localPlayers.find(p => p.id === activeUid);
    const statEl = document.getElementById('buzz-status-label');
    const nameEl = document.getElementById('buzz-winner-name');
    const subEl  = document.getElementById('buzz-winner-sub');
    const timeStr = buzzFormatTime(activeUid);
    if (winDisp) winDisp.style.display = 'flex';
    if (statEl) statEl.textContent = activeUid === myId ? '⚡ You Were The Fastest!' : `Player #${buzzDtlIndex+1}`;
    if (nameEl) { nameEl.textContent = activeP?.name || '?'; nameEl.style.color = activeP?.color || '#f43f5e'; }
    if (subEl)  subEl.textContent = timeStr ? `is up (${timeStr}) — did they get it right?` : 'is up — did they get it right?';
  }

  // Host buttons
  if (isHost && hostAct) {
    hostAct.classList.add('show');
    const nextBtn = document.getElementById('buzz-next-btn');
    const hasNext = buzzDtlIndex < buzzDtlOrder.length - 1;
    if (nextBtn) nextBtn.textContent = hasNext ? '⬇ Next Player' : '↩ No Winner';
  } else if (hostAct) {
    hostAct.classList.remove('show');
  }
}

function renderBuzzScoreChips() {
  const container = document.getElementById('buzz-scores');
  if (!container) return;
  container.innerHTML = '';
  localPlayers.forEach(p => {
    const pts = buzzScores[p.id] || 0;
    const chip = document.createElement('div');
    chip.className = 'buzz-score-chip';
    chip.innerHTML = `<span class="buzz-score-dot" style="background:${p.color||'#888'}"></span>${esc(p.name)}<span class="buzz-score-pts">${pts}</span>`;
    container.appendChild(chip);
  });
}

// Format a player's buzz-in reaction time relative to round start, e.g. "0.42s"
function buzzFormatTime(uid) {
  if (!buzzRoundStartTime || !uid) return '';
  const tap = buzzTapOrder[uid];
  if (tap === undefined || tap === null) return '';
  const ms = tap - buzzRoundStartTime;
  if (ms < 0) return '';
  return (ms / 1000).toFixed(2) + 's';
}

// Player taps the buzz button / anywhere on screen
window.playerBuzzIn = async function() {
  if (!db || !roomCode) return;
  if (buzzPhase !== 'waiting') return;

  // Immediate visual feedback — disable tap zone so double-tap can't happen
  const tapZone = document.getElementById('buzz-tap-zone');
  const buzzBtn = document.getElementById('buzz-btn');
  if (tapZone) tapZone.style.display = 'none';
  if (buzzBtn) buzzBtn.classList.add('tapped');

  const ts = serverNow();
  const isModeDownTheLine = speedMode === 'downTheLine';

  if (isModeDownTheLine) {
    // Record tap time — only write if not already tapped
    const myTapRef = ref(db, `rooms/${roomCode}/buzz/tapOrder/${myId}`);
    const existing = await get(myTapRef);
    if (existing.exists()) return;
    await set(myTapRef, ts);

    // Re-read the authoritative tap list straight from Firebase rather than
    // relying on the locally cached buzzTapOrder — that cache can be stale
    // (e.g. left over from the previous round) and either miss real taps or
    // falsely report everyone tapped, which is why later rounds could get stuck.
    const tapOrderRef = ref(db, `rooms/${roomCode}/buzz/tapOrder`);
    const tapSnap = await get(tapOrderRef);
    const freshTapOrder = tapSnap.exists() ? tapSnap.val() : {};

    const activePlayers = localPlayers.filter(p => !p.knockedOut);
    const allTapped = activePlayers.every(p => freshTapOrder[p.id] !== undefined);

    if (allTapped) {
      // Whichever player completes the last tap triggers the phase change —
      // not just the host — otherwise a round never advances if a guest
      // (rather than the host) happens to be the last one to tap.
      await update(ref(db), {
        [`rooms/${roomCode}/buzz/phase`]: 'downtheline',
        [`rooms/${roomCode}/buzz/dtlIndex`]: 0,
        [`rooms/${roomCode}/lastActivity`]: Date.now()
      });
    } else {
      // Show waiting feedback to this player
      const lbl = document.getElementById('buzz-tap-label');
      if (lbl) lbl.textContent = '✓ Tapped! Waiting for others...';
    }
  } else {
    // 1st To Tap: check if someone already won before writing
    const winnerRef = ref(db, `rooms/${roomCode}/buzz/winner`);
    const snap = await get(winnerRef);
    if (snap.exists() && snap.val()) return; // someone beat us

    await update(ref(db), {
      [`rooms/${roomCode}/buzz/winner`]: myId,
      [`rooms/${roomCode}/buzz/phase`]: 'locked',
      [`rooms/${roomCode}/buzz/tapOrder/${myId}`]: ts,
      [`rooms/${roomCode}/lastActivity`]: Date.now()
    });
  }
};

// Host: award a point to the current active candidate
window.buzzAwardPoint = async function() {
  if (!isHost || !db || !roomCode) return;
  const winnerUid = speedMode === 'downTheLine' ? buzzDtlOrder[buzzDtlIndex] : buzzWinner;
  if (!winnerUid) return;

  const newScores = { ...buzzScores };
  newScores[winnerUid] = (newScores[winnerUid] || 0) + 1;
  const total = speedRoundsTotal;
  const nextRound = buzzCurrentRound + 1;
  const isComplete = nextRound > total;

  await update(ref(db), {
    [`rooms/${roomCode}/buzz/scores`]: newScores,
    [`rooms/${roomCode}/buzz/phase`]: isComplete ? 'complete' : 'waiting',
    [`rooms/${roomCode}/buzz/winner`]: null,
    [`rooms/${roomCode}/buzz/tapOrder`]: {},
    [`rooms/${roomCode}/buzz/dtlIndex`]: 0,
    [`rooms/${roomCode}/buzz/currentRound`]: isComplete ? buzzCurrentRound : nextRound,
    [`rooms/${roomCode}/buzz/roundStartTime`]: serverNow(),
    [`rooms/${roomCode}/lastActivity`]: Date.now()
  });
};

// Host: no point — either go to next DTL player or reset
window.buzzNoPoint = async function() {
  if (!isHost || !db || !roomCode) return;

  if (speedMode === 'downTheLine') {
    const hasNext = buzzDtlIndex < buzzDtlOrder.length - 1;
    if (hasNext) {
      await update(ref(db), {
        [`rooms/${roomCode}/buzz/dtlIndex`]: buzzDtlIndex + 1,
        [`rooms/${roomCode}/lastActivity`]: Date.now()
      });
    } else {
      // Nobody won — reset round without incrementing round counter
      await buzzResetRound(false);
    }
  } else {
    // 1st To Tap — no point, reset
    await buzzResetRound(false);
  }
};

// Internal: reset to next round. advanceRound=true increments counter
async function buzzResetRound(advanceRound) {
  const total = speedRoundsTotal;
  const nextRound = advanceRound ? buzzCurrentRound + 1 : buzzCurrentRound;
  const isComplete = nextRound > total;
  await update(ref(db), {
    [`rooms/${roomCode}/buzz/phase`]: isComplete ? 'complete' : 'waiting',
    [`rooms/${roomCode}/buzz/winner`]: null,
    [`rooms/${roomCode}/buzz/tapOrder`]: {},
    [`rooms/${roomCode}/buzz/dtlIndex`]: 0,
    [`rooms/${roomCode}/buzz/currentRound`]: isComplete ? buzzCurrentRound : nextRound,
    [`rooms/${roomCode}/buzz/roundStartTime`]: serverNow(),
    [`rooms/${roomCode}/lastActivity`]: Date.now()
  });
}

// Show the Speed Round complete screen
function showBuzzComplete() {
  // NOTE: we intentionally do NOT stop the buzz listener here. The room is
  // still on the buzz screen and the host may hit "Play Again", which just
  // writes new buzz state to Firebase — if the listener were stopped here,
  // nobody (including guests) would ever hear about that update and their
  // screens would be stuck on "Waiting for host...". The listener is only
  // stopped in showScreen() once someone actually leaves the buzz screens.
  const screen = document.getElementById('buzz-complete');
  if (!screen) return;

  // Build final scores sorted by points desc
  const sorted = [...localPlayers].sort((a,b) =>
    (buzzScores[b.id]||0) - (buzzScores[a.id]||0)
  );
  const container = document.getElementById('buzz-final-scores');
  if (container) {
    container.innerHTML = '';
    sorted.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'buzz-final-row' + (i === 0 ? ' winner-row' : '');
      row.innerHTML = `<span class="buzz-final-pos">${i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</span><span class="buzz-final-dot" style="background:${p.color||'#888'}"></span><span class="buzz-final-name">${esc(p.name)}</span><span class="buzz-final-pts">${buzzScores[p.id]||0} pts</span>`;
      container.appendChild(row);
    });
  }

  const hostBtns = document.getElementById('buzz-complete-host-btns');
  const waitMsg  = document.getElementById('buzz-complete-wait');
  if (hostBtns) hostBtns.style.display = isHost ? 'flex' : 'none';
  if (waitMsg)  waitMsg.style.display  = isHost ? 'none' : 'block';

  screen.classList.add('show');
}

window.buzzPlayAgain = async function() {
  if (!isHost || !db || !roomCode) return;
  // Reset all buzz state for a new game
  await update(ref(db), {
    [`rooms/${roomCode}/buzz/phase`]: 'waiting',
    [`rooms/${roomCode}/buzz/currentRound`]: 1,
    [`rooms/${roomCode}/buzz/scores`]: {},
    [`rooms/${roomCode}/buzz/winner`]: null,
    [`rooms/${roomCode}/buzz/tapOrder`]: {},
    [`rooms/${roomCode}/buzz/dtlIndex`]: 0,
    [`rooms/${roomCode}/buzz/roundStartTime`]: serverNow(),
    [`rooms/${roomCode}/lastActivity`]: Date.now()
  });
  const screen = document.getElementById('buzz-complete');
  if (screen) screen.classList.remove('show');
};

// ── FEATURE STATE ──────────────────────────────
let featureNudgeEnabled = false;
let featureAwardsEnabled = false;
let featureVPEnabled = false;
let vpHighestWins = true; // true = highest wins, false = lowest wins
let featureStatusEffectsEnabled = false;
let featureDndEnabled = false;
let featureRoundsEnabled = false;
let featureUndoEnabled = false;
let roundsTotal = 3;     // total rounds configured by host
let currentRound = 1;    // current round, stored in Firebase as rooms/{code}/currentRound
let passDirection = '';         // 'ccw' | 'both' | 'cw' — mandatory before room creation
let ceremonyAborted = false;    // set by host Skip Awards button
let featureTimersEnabled = false;

// ── SPEED ROUND state ─────────────────────────
let turnMode = 'classic';       // 'classic' | 'speedRound'
let speedMode = 'firstToTap';   // 'firstToTap' | 'downTheLine'
let speedRoundsTotal = 10;
let buzzCurrentRound = 1;
let buzzPhase = 'waiting';      // 'waiting'|'locked'|'downtheline'|'complete'
let buzzScores = {};            // { uid: points }
let buzzTapOrder = {};          // { uid: timestamp }
let buzzWinner = null;          // uid of current round candidate
let buzzDtlIndex = 0;           // Down The Line: current position
let buzzDtlOrder = [];          // ordered uids by tap time
let buzzRoundStartTime = null;  // ms timestamp when the current round started (for reaction times)
let buzzListener = null;        // Firebase realtime listener for buzz node

// Timer config (read from Firebase)
let timerCfg = {
  turn: false, turnVisible: true,
  round: false, roundVisible: true,
  game: false, gameVisible: true,
  countdown: false, countdownVisible: true,
  countdownSecs: 30
};

// Timer runtime state (all in seconds)
let timerTurn = 0;       // current turn elapsed
let timerRound = 0;      // current round elapsed
let timerGame = 0;       // entire game elapsed
let timerCountdown = 0;  // seconds remaining
let timerInterval = null;
let timerIsActive = false; // true only when this device is the active player

// Per-player cumulative turn time (local mirror of Firebase nudgeTotals equiv)
// Stored in Firebase as rooms/{code}/playerTimes/{id} in seconds
let nudgeDelaySeconds = 30;
let nudgeMode = 'multi';       // 'multi' or 'single'
let suppressNextTurnSound = false; // set after mid-game settings save to avoid spurious chime
let nudgeCountdownTimer = null;
let nudgeUnlocked = false;
let nudgeUsedThisTurn = false;  // for single nudge mode
let activeNudgeCount = 0;    // nudges received by active player this turn (shown on active screen)
const NUDGE_CAP = 50;        // max nudges per sender per active player per turn
let nudgeSentToActive = {};   // {senderId: count} for current active player
let nudgeCapTargetId = null;  // active player ID the cap is tied to

// ── HELPERS ──────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2,10); }
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({length:4}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
}
function showScreen(id) {
  document.body.classList.toggle('in-game', ['active','waiting','buzz'].includes(id));
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
  if (id !== 'join') requestAnimationFrame(rescaleCurrentScreen);
  // Hide D&D overlay whenever leaving the active turn screen
  if (id !== 'active') {
    const dndOv = document.getElementById('dnd-overlay');
    const dndCf = document.getElementById('dnd-confirm-overlay');
    if (dndOv) dndOv.style.display = 'none';
    if (dndCf) dndCf.style.display = 'none';
  }
  // Stop buzz listener when leaving game screens entirely
  if (id !== 'buzz' && id !== 'active' && id !== 'waiting') {
    stopBuzzListener();
    const buzzComplete = document.getElementById('buzz-complete');
    if (buzzComplete) buzzComplete.classList.remove('show');
  }
}

// ── AUTO-SCALE TO FIT (no scrolling) ────────────
// Setup/menu screens wrap their content in .screen-content-scaler. If that
// content would be taller than the available viewport height, shrink it
// with transform:scale() so everything is visible at once on any phone,
// with no scrolling and no clipping. Screens whose content already fits
// are left at scale(1) — completely unaffected, still centered normally.
// The live Active Turn / Waiting screens have no scaler and are untouched.
function rescaleCurrentScreen() {
  const activeScreen = document.querySelector('.screen.active');
  if (!activeScreen) return;
  const scaler = activeScreen.querySelector(':scope > .screen-content-scaler');
  if (!scaler) return;

  const origHeight = scaler.style.height;
  scaler.style.transform = 'none';
  scaler.style.height = 'auto';
  const natural = scaler.scrollHeight;
  scaler.style.height = origHeight || '';
  const available = scaler.clientHeight;

  if (natural > available && natural > 0) {
    const factor = Math.max(0.55, available / natural);
    scaler.style.transform = `scale(${factor})`;
  }
}

let rescaleResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(rescaleResizeTimer);
  rescaleResizeTimer = setTimeout(rescaleCurrentScreen, 120);
});
window.addEventListener('orientationchange', () => {
  setTimeout(rescaleCurrentScreen, 200);
});

function status(id, msg, type='') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'status' + (type ? ' '+type : '');
}

// ── PERSIST CONFIG ──────────────────────────────
window.saveConfig = function() {
  const cfg = {
    apiKey: document.getElementById('cfg-apiKey').value.trim(),
    authDomain: document.getElementById('cfg-authDomain').value.trim(),
    databaseURL: document.getElementById('cfg-databaseURL').value.trim(),
    projectId: document.getElementById('cfg-projectId').value.trim(),
    appId: document.getElementById('cfg-appId').value.trim(),
  };
  if (!cfg.apiKey || !cfg.databaseURL || !cfg.projectId) {
    status('config-status', 'Please fill in at least API Key, Database URL, and Project ID.', 'error');
    return;
  }
  localStorage.setItem('gr_config', JSON.stringify(cfg));
  initFirebase(cfg);
  document.getElementById('setup-overlay').classList.remove('show');
};

let auth = null;
let currentUser = null; // Firebase Auth user object, or null if signed out

function initFirebase(cfg) {
  try {
    const app = initializeApp(cfg, cfg.projectId);
    db = getDatabase(app);
    onValue(ref(db, '.info/serverTimeOffset'), snap => {
      serverTimeOffset = snap.val() || 0;
    });
    auth = getAuth(app);
    onAuthStateChanged(auth, user => {
      currentUser = user;
      isCreator = user ? CREATOR_UIDS.includes(user.uid) : false;
      document.body.classList.toggle('user-mode', !!user && !isCreator);
      updateAccountButtonUI();
      // Sync profile from Firebase into localStorage on login
      if (user) syncProfileFromFirebase();
    });
  } catch(e) {
    status('home-status', 'Firebase error: ' + e.message, 'error');
  }
}

// ── AUTO-JOIN FROM QR URL PARAM ──────────────
const urlParams = new URLSearchParams(window.location.search);
const autoJoinCode = urlParams.get('join');
if (autoJoinCode) {
  showScreen('join');
  setTimeout(() => {
    const codeEl = document.getElementById('join-code');
    if (codeEl) codeEl.value = autoJoinCode.toUpperCase();
  }, 100);
}

// ── BOOT ──────────────────────────────────────
// Keys are hardcoded — no setup needed on any device
const hardcodedCfg = {
  apiKey: "AIzaSyDeaNT7B8KAt-X9jZHnlKX2XEQ2gF6t4rY",
  authDomain: "sidekick-tracker.firebaseapp.com",
  databaseURL: "https://sidekick-tracker-default-rtdb.firebaseio.com",
  projectId: "sidekick-tracker",
  appId: "1:84234153779:web:0afd3d49cff20f616b9846"
};
(function() {
  try {
    const saved = localStorage.getItem('sk_lang');
    if (['en','es','zh','de','fr','ja','it','pt'].includes(saved)) lang = saved;
  } catch {}
  const flag = document.getElementById('lang-btn');
  if (flag) flag.textContent = flagFor(lang);
  applyLang();
})();
initFirebase(hardcodedCfg);

// ── PASSWORD GATE (Firebase-backed) ──────────────
// The password is never hardcoded in the HTML — it lives in
// config/playtest/password in Firebase Realtime Database.
// Returning users have it cached in localStorage; the module
// re-validates it against Firebase every load and every 5 min.
const PW_STORAGE_KEY = 'sk_password';
let _sidekickPassword = null;   // current Firebase password (plaintext, module-scope only)

window.checkPassword = function() {
  const input = document.getElementById('pw-input');
  const error = document.getElementById('pw-error');
  const gate  = document.getElementById('password-gate');
  if (!input || !gate) return;
  if (!_sidekickPassword) { error.textContent = 'Still loading — try again in a moment.'; return; }
  if (input.value === _sidekickPassword) {
    localStorage.setItem(PW_STORAGE_KEY, input.value);
    gate.classList.add('hidden');
    input.value = '';
    error.textContent = '';
  } else {
    error.textContent = 'Incorrect code. Try again.';
    input.value = '';
    input.focus();
  }
};

document.getElementById('pw-submit').addEventListener('click', window.checkPassword);
document.getElementById('pw-input').addEventListener('keydown', e => { if (e.key === 'Enter') window.checkPassword(); });

// Fetch the current password from Firebase and re-validate stored copy.
async function syncPassword() {
  try {
    const snap = await get(ref(db, 'config/playtest/password'));
    const pw = snap.val() || 'test1';
    _sidekickPassword = pw;

    // Creator bypass — always let the developer in
    if (currentUser && isCreator) {
      localStorage.setItem(PW_STORAGE_KEY, pw);
      document.getElementById('password-gate').classList.add('hidden');
      return;
    }

    // Re-validate the stored password
    const stored = localStorage.getItem(PW_STORAGE_KEY);
    if (stored !== pw) {
      // Password changed or first load — clear and show gate
      localStorage.removeItem(PW_STORAGE_KEY);
      document.getElementById('password-gate').classList.remove('hidden');
    }
  } catch (e) {
    // Network issue — keep current state, will retry on interval
  }
}

// On auth state change, also check creator bypass
onAuthStateChanged(auth, user => {
  if (user && CREATOR_UIDS.includes(user.uid)) {
    localStorage.setItem(PW_STORAGE_KEY, _sidekickPassword || 'bypass');
    document.getElementById('password-gate').classList.add('hidden');
  }
});

// Initial check + periodic re-validation every 5 minutes
syncPassword();
setInterval(syncPassword, 300000);

function requireDb() {
  if (!db) {
    document.getElementById('setup-overlay').classList.add('show');
    return false;
  }
  return true;
}

// ── SILENT AUTO-RESUME ──────────────────────────
// If this device has a saved session (it created/joined a room before),
// and the room + player still exist in Firebase, drop straight back in
// instead of showing the home screen. Handles "we stepped out for food"
// automatically — no code to remember, nothing to tap.
async function tryAutoResume() {
  if (autoJoinCode) return;           // explicit QR join link always wins
  let session = loadSession();
  if (!session || !session.roomCode || !session.myId) return;

  try {
    let snap = await get(ref(db, `rooms/${session.roomCode}`));
    if (!snap.exists()) { clearSession(); return; }
    let room = snap.val();

    // Idle-room cleanup: treat as abandoned if untouched for 24h+
    if (room.lastActivity && Date.now() - room.lastActivity > 24 * 60 * 60 * 1000) {
      await remove(ref(db, `rooms/${session.roomCode}`));
      clearSession();
      return;
    }

    const players = room.players || {};
    if (!players[session.myId]) { clearSession(); return; } // player isn't in this room (e.g. resumed as someone else)

    // Restore identity
    roomCode = session.roomCode;
    myId = session.myId;
    myName = session.myName || players[session.myId].name || '';
    isHost = !!session.isHost;

    if (room.status === 'lobby') {
      if (isHost) {
        document.getElementById('display-code').textContent = roomCode;
        showScreen('lobby');
        generateLobbyQR();
        listenLobby();
      } else {
        document.getElementById('wl-code').textContent = roomCode;
        showScreen('waiting-lobby');
        listenWaitingLobby();
      }
    } else if (room.status === 'playing' || room.status === 'ceremony' || room.status === 'vp-entry' || room.status === 'vp-ceremony') {
      listenGameState();
    } else if (room.status === 'gameover') {
      showGameOver();
    } else if (room.status === 'saved') {
      document.getElementById('saved-screen-code').textContent = roomCode;
      document.getElementById('saved-screen-name').textContent = '';
      if (isHost) {
        document.getElementById('saved-screen-host-view').style.display = 'block';
        document.getElementById('saved-screen-player-view').style.display = 'none';
        document.getElementById('saved-screen').classList.add('show');
      } else {
        showSavedScreenForPlayer(room.savedAction || null);
      }
    } else {
      // 'closed' or unrecognized — nothing to resume into
      clearSession();
    }
  } catch {
    // Network hiccup etc. — fall through to normal home screen, don't clear session
  }
}
tryAutoResume();

// ── NAV ──────────────────────────────────────
// Fully resets all create-wizard state (turn mode, direction/speed overlays, features).
function resetCreateWizardState() {
  turnMode = '';
  passDirection = '';
  speedMode = 'firstToTap';
  speedRoundsTotal = 10;
  _selectedClassicDir = '';
  _selectedSpeedMode  = '';
  ['feature-nudge-toggle','feature-awards-toggle','feature-timers-toggle','feature-vp-toggle','feature-status-toggle','feature-dnd-toggle','feature-rounds-toggle'].forEach(id => {
    const el = document.getElementById(id); if (el) el.checked = false;
  });
  featureNudgeEnabled  = false;
  featureAwardsEnabled = false;
  featureVPEnabled     = false;
  vpHighestWins = true;
  featureStatusEffectsEnabled = false;
  featureDndEnabled    = false;
  featureTimersEnabled = false;
  featureRoundsEnabled = false;
  featureUndoEnabled   = false;
  // isFeatureEnabled() reads these from window — clear the window mirrors too
  FEATURE_DEFS_GRID.forEach(def => { window[def.var] = false; });
  const tmTxt = document.getElementById('tm-summary');
  if (tmTxt) tmTxt.innerHTML = 'No direction selected';
  const tmNote = document.getElementById('tm-required-note');
  if (tmNote) tmNote.style.display = 'none';
  document.querySelectorAll('#tm-inline-cw, #tm-inline-ccw, #tm-inline-both').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('#speed-mode-overlay .dir-option').forEach(el => el.classList.remove('selected'));
  const cdOv = document.getElementById('classic-dir-overlay');
  if (cdOv) cdOv.classList.remove('show');
  const sdOv = document.getElementById('speed-mode-overlay');
  if (sdOv) sdOv.classList.remove('show');
  ['nudge-edit-btn','timers-edit-btn'].forEach(id => {
    const el = document.getElementById(id); if (el) el.classList.remove('visible');
  });
  ['nudge-settings-overlay','timers-settings-overlay','rounds-settings-overlay','mg-nudge-settings-overlay','mg-rounds-settings-overlay'].forEach(id => {
    const el = document.getElementById(id); if (el) el.classList.remove('show');
  });
  const cdCb = document.getElementById('timer-countdown-on');
  if (cdCb) cdCb.checked = false;
  const cdInputs = document.getElementById('countdown-inputs');
  if (cdInputs) cdInputs.style.display = 'none';
  const featGrid = document.getElementById('features-available-grid');
  if (featGrid) { featGrid.innerHTML = ''; renderFeatureGrid(); }
}

window.showCreateRoom = function() {
  if (!requireHostAccount()) return;
  editingRoom = false;
  startingNewGame = false;
  // Auto-fill color from profile (host is always logged in)
  myColor = getSavedColor() || '';
  // Auto-fill avatar from profile (host is always logged in)
  const profileAv = getSavedAvatar();
  roomAvatarSelection = profileAv || '';
  const colorLabel = document.getElementById('host-color-label');
  if (colorLabel) colorLabel.textContent = 'Choose\nColor';
  const colorBtn = document.getElementById('host-color-btn');
  if (myColor && colorBtn) {
    colorBtn.style.background = myColor;
    colorBtn.style.borderColor = myColor;
    colorBtn.classList.toggle('light-fill', isLightColor(myColor));
    const colorName = PLAYER_COLORS.find(c => c.hex === myColor)?.name || 'Custom';
    if (colorLabel) { colorLabel.textContent = colorName; colorLabel.style.color = isLightColor(myColor) ? '#000' : '#fff'; }
  }
  const colorNote = document.getElementById('color-required-note');
  if (colorNote) colorNote.style.display = 'none';
  const avatarNote = document.getElementById('avatar-required-note');
  if (avatarNote) avatarNote.style.display = 'none';
  const hostAvLabel = document.getElementById('host-avatar-label');
  setAvatarLabel(hostAvLabel, profileAv || '');
  resetCreateWizardState();
  createStep = 1;
  renderCreateStep();
  showScreen('create');
  const nameEl = document.getElementById('host-name');
  if (nameEl && !nameEl.value) {
    const saved = getSavedName();
    if (saved) nameEl.value = saved;
  }
  updateFeaturesSummary();
  // Reset wizard to step 1
  createStep = 1;
  renderCreateStep();
  renderEditRoomButtons();
};
window.showJoinRoom = function() {
  joinStep = 1;
  showScreen('join');
  renderJoinStep();
  const nameEl = document.getElementById('join-name');
  if (nameEl && !nameEl.value) {
    const saved = currentUser ? getSavedName() : '';
    if (saved) nameEl.value = saved;
  }
  // Auto-fill avatar from profile only if logged in
  const profileAv = currentUser ? getSavedAvatar() : '';
  roomAvatarSelection = profileAv || '';
  const joinAvLabel = document.getElementById('join-avatar-label');
  setAvatarLabel(joinAvLabel, profileAv || '');
  // Auto-fill color from profile only if logged in
  const prefColor = currentUser ? getSavedColor() : '';
  myColor = prefColor || '';
  if (prefColor) {
    myColor = prefColor;
    const joinColorBtn = document.getElementById('join-color-btn');
    const joinColorLabel = document.getElementById('join-color-label');
    if (joinColorBtn) { joinColorBtn.style.background = prefColor; joinColorBtn.style.borderColor = prefColor; joinColorBtn.classList.toggle('light-fill', isLightColor(prefColor)); }
    if (joinColorLabel) {
      const colorName = PLAYER_COLORS.find(c => c.hex === prefColor)?.name || 'Custom';
      joinColorLabel.textContent = colorName;
      joinColorLabel.style.color = isLightColor(prefColor) ? '#000' : '#fff';
    }
  }
};

// ── JOIN ROOM WIZARD ──
let joinStep = 1;

window.updateJoinCollapseSummary = function() {
  const name = document.getElementById('join-name')?.value.trim() || '';
  const avatar = roomAvatarSelection || getSavedAvatar() || '👤';
  const colorName = myColor ? (PLAYER_COLORS.find(c => c.hex === myColor)?.name || 'Custom') : t('noColor');
  const collapseName = document.getElementById('join-collapse-name');
  const collapseColorText = document.getElementById('join-collapse-color-text');
  const collapseAvatarText = document.getElementById('join-collapse-avatar-text');
  const collapseSwatch = document.getElementById('join-collapse-swatch-inline');
  if (collapseName) collapseName.textContent = name || t('player');
  if (collapseColorText) collapseColorText.textContent = colorName;
  if (collapseAvatarText) {
    collapseAvatarText.textContent = '';
    if (isImageAvatar(avatar)) {
      const img = document.createElement('img');
      img.src = avatar; img.alt = 'avatar';
      img.className = 'step-collapse-avatar-img';
      collapseAvatarText.appendChild(img);
    } else {
      collapseAvatarText.textContent = avatar;
    }
  }
  if (collapseSwatch) {
    collapseSwatch.style.background = myColor || 'var(--border)';
    collapseSwatch.classList.toggle('light-fill', !!(myColor && isLightColor(myColor)));
  }
  const code = document.getElementById('join-code')?.value.toUpperCase().trim() || '';
  const collapseCode = document.getElementById('join-collapse-code');
  if (collapseCode) collapseCode.textContent = code || t('enterCode');
}

function renderJoinStep() {
  const area = document.getElementById('join-cards-area');
  updateJoinCollapseSummary();
  document.querySelectorAll('.join-step').forEach(el => {
    const step = parseInt(el.dataset.step);
    const card = el.querySelector('.card');
    if (card) {
      card.classList.remove('step-enter');
      card.style.transition = 'none';
    }
    el.classList.remove('collapsed', 'revealed');
    if (joinStep === 1) {
      el.classList.toggle('revealed', step === 1);
    } else {
      el.classList.toggle('revealed', step <= 2);
      el.classList.toggle('collapsed', step < joinStep);
    }
    if (card) void card.offsetWidth;
    if (card) card.style.transition = '';
  });
  const currentCard = document.querySelector(`.join-step[data-step="${joinStep}"] .card`);
  if (currentCard) {
    currentCard.style.transition = 'none';
    currentCard.style.transform = 'scale(0.85)';
    void currentCard.offsetWidth;
    currentCard.style.transition = 'transform 1s cubic-bezier(0.22,1,0.36,1)';
    currentCard.style.transform = '';
  }
  if (joinStep === 1) {
    area.className = 'step-mode';
  } else {
    area.className = 'stack-mode';
  }
}

window.expandJoinStep = function(step) {
  joinStep = step;
  renderJoinStep();
  haptic(5);
};

window.joinNextStep = function() {
  if (joinStep === 1) {
    const name = document.getElementById('join-name').value.trim();
    if (!name) { status('join-status', 'Enter your name.', 'error'); return; }
    if (!myColor) { status('join-status', 'Please choose a color.', 'error'); return; }
    if (!currentUser && !roomAvatarSelection) { document.getElementById('avatar-required-note').style.display = 'block'; return; }
    document.getElementById('avatar-required-note').style.display = 'none';
  }
  status('join-status', '', '');
  if (joinStep < 2) {
    joinStep++;
    renderJoinStep();
    haptic(5);
  }
};

// ── CREATE ROOM WIZARD ──
let createStep = 1;
let editingRoom = false;
let startingNewGame = false;

window.updateCreateCollapseSummary = function() {
  const name = document.getElementById('host-name')?.value.trim() || '';
  const avatar = roomAvatarSelection || getSavedAvatar() || '👤';
  const colorName = myColor ? (PLAYER_COLORS.find(c => c.hex === myColor)?.name || 'Custom') : t('noColor');
  const collapseName = document.getElementById('create-collapse-name');
  const collapseColorText = document.getElementById('create-collapse-color-text');
  const collapseAvatarText = document.getElementById('create-collapse-avatar-text');
  const collapseSwatch = document.getElementById('create-collapse-swatch-inline');
  if (collapseName) collapseName.textContent = name || t('player');
  if (collapseColorText) collapseColorText.textContent = colorName;
  if (collapseAvatarText) {
    collapseAvatarText.textContent = '';
    if (isImageAvatar(avatar)) {
      const img = document.createElement('img');
      img.src = avatar; img.alt = 'avatar';
      img.className = 'step-collapse-avatar-img';
      collapseAvatarText.appendChild(img);
    } else {
      collapseAvatarText.textContent = avatar;
    }
  }
  if (collapseSwatch) {
    collapseSwatch.style.background = myColor || 'var(--border)';
    collapseSwatch.classList.toggle('light-fill', !!(myColor && isLightColor(myColor)));
  }
  const modeLabel = document.getElementById('create-collapse-mode');
  if (modeLabel) {
    if (turnMode === 'speedRound') {
      const modeLabels = { firstToTap: '1st To Tap', downTheLine: 'Down The Line' };
      modeLabel.textContent = '⚡ ' + (modeLabels[speedMode] || speedMode) + ' · ' + speedRoundsTotal + ' rounds';
    } else if (turnMode === 'classic' && passDirection) {
      const dirLabels = { cw: t('left'), both: t('leftRight'), ccw: t('right') };
      modeLabel.textContent = 'Turn Direction · ' + (dirLabels[passDirection] || passDirection);
    } else {
      modeLabel.textContent = t('noMode');
    }
  }
  const featLabel = document.getElementById('create-collapse-features');
  if (featLabel) {
    const visibleDefs = FEATURE_DEFS_GRID.filter(f => !f.creatorOnly || isCreator);
    const enabled = visibleDefs.filter(f => isFeatureEnabled(f.key));
    featLabel.textContent = enabled.length ? '⚙️ ' + enabled.length + ' feature' + (enabled.length > 1 ? 's' : '') : t('allFeaturesOff');
  }
}

function renderCreateStep() {
  const area = document.getElementById('create-cards-area');
  updateCreateCollapseSummary();
  document.querySelectorAll('.create-step').forEach(el => {
    const step = parseInt(el.dataset.step);
    const card = el.querySelector('.card');
    if (card) {
      card.classList.remove('step-enter');
      card.style.transition = 'none';
    }
    el.classList.remove('collapsed', 'revealed');
    if (createStep === 1) {
      el.classList.toggle('revealed', step === 1);
    } else {
      el.classList.toggle('revealed', step <= createStep);
      el.classList.toggle('collapsed', step < createStep);
    }
    if (card) void card.offsetWidth;
    if (card) card.style.transition = '';
  });
  const currentCard = document.querySelector(`.create-step[data-step="${createStep}"] .card`);
  if (currentCard) {
    currentCard.style.transition = 'none';
    currentCard.style.transform = 'scale(0.85)';
    void currentCard.offsetWidth;
    currentCard.style.transition = 'transform 1s cubic-bezier(0.22,1,0.36,1)';
    currentCard.style.transform = '';
  }
  if (createStep === 1) {
    area.className = 'step-mode';
  } else {
    area.className = 'stack-mode';
  }
  if (createStep === 3) renderFeatureGrid();
  renderEditRoomButtons();
  requestAnimationFrame(rescaleCurrentScreen);
}

window.expandCreateStep = function(step) {
  createStep = step;
  renderCreateStep();
  haptic(5);
};

window.createNextStep = function() {
  if (createStep === 1) {
    const name = document.getElementById('host-name').value.trim();
    if (!name) { status('create-status', 'Enter your name.', 'error'); return; }
    if (!myColor) { document.getElementById('color-required-note').style.display = 'block'; return; }
    document.getElementById('color-required-note').style.display = 'none';
    const savedAvatar = roomAvatarSelection || getSavedAvatar();
    if (!savedAvatar) { document.getElementById('avatar-required-note').style.display = 'block'; return; }
    document.getElementById('avatar-required-note').style.display = 'none';
  }
  if (createStep === 2) {
    if (!turnMode || (turnMode === 'classic' && !passDirection)) {
      document.getElementById('tm-required-note').style.display = 'block';
      return;
    }
    document.getElementById('tm-required-note').style.display = 'none';
  }
  status('create-status', '', '');
  if (createStep < 3) {
    createStep++;
    renderCreateStep();
    haptic(5);
  }
};

// ── TOOLS COLLAPSE TOGGLE ──
window.toggleTools = function() {
  const body = document.getElementById('tools-body');
  const arrow = document.getElementById('tools-arrow');
  if (!body || !arrow) return;
  const isOpen = body.style.maxHeight && body.style.maxHeight !== '0px';
  if (isOpen) {
    body.style.maxHeight = '0px';
    body.style.opacity = '0';
    arrow.style.transform = 'rotate(0deg)';
  } else {
    body.style.maxHeight = '300px';
    body.style.opacity = '1';
    arrow.style.transform = 'rotate(90deg)';
  }
  haptic(5);
};

// ── TOOLS ────────────────────────────────────────
// Reachable from the home screen card and from the in-game host menu (Tools).
// Timers / Player Picker / Status Effects are placeholders for now;
// Random Number is fully functional.
const TOOL_LABELS = {
  timers: 'Timers',
  picker: 'Random Player Picker',
  status: 'Status Effects'
};

let toolsSource = 'host'; // 'host' or 'home'

window.openToolsOverlay = function(fromHome) {
  toolsSource = fromHome ? 'home' : 'host';
  document.getElementById('tools-overlay').classList.add('show');
};
window.closeToolsOverlay = function() {
  document.getElementById('tools-overlay').classList.remove('show');
  if (toolsSource === 'host') openHostCrownMenu();
};

// ── TUTORIAL OVERLAY ──
let tutorialSlide = 0;
let tutorialSwipeX = 0;
let tutorialSwiping = false;

function tutorialUpdateDots() {
  const dots = document.querySelectorAll('#tutorial-dots .tutorial-dot');
  dots.forEach((d, i) => d.classList.toggle('active', i === tutorialSlide));
  const prev = document.getElementById('tutorial-prev');
  const next = document.getElementById('tutorial-next');
  if (prev) prev.style.visibility = tutorialSlide === 0 ? 'hidden' : 'visible';
  if (next) next.innerHTML = tutorialSlide === dots.length - 1 ? 'Done ✓' : 'Next <span class="play-tri">▶</span>';
}

function tutorialGoTo(idx) {
  const vp = document.getElementById('tutorial-viewport');
  const slides = vp.querySelectorAll('.tutorial-slide');
  tutorialSlide = Math.max(0, Math.min(idx, slides.length - 1));
  vp.scrollTo({ left: tutorialSlide * vp.clientWidth, behavior: 'smooth' });
  tutorialUpdateDots();
}

window.openTutorial = function() {
  tutorialSlide = 0;
  const overlay = document.getElementById('tutorial-overlay');
  overlay.classList.add('show');
  // Build dots
  const vp = document.getElementById('tutorial-viewport');
  const count = vp.querySelectorAll('.tutorial-slide').length;
  const dotsEl = document.getElementById('tutorial-dots');
  dotsEl.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    dot.className = 'tutorial-dot' + (i === 0 ? ' active' : '');
    dot.onclick = () => tutorialGoTo(i);
    dotsEl.appendChild(dot);
  }
  vp.scrollTo({ left: 0, behavior: 'instant' });
  tutorialUpdateDots();
  // Touch/swipe handling
  vp.ontouchstart = (e) => {
    tutorialSwipeX = e.touches[0].clientX;
    tutorialSwiping = true;
  };
  vp.ontouchend = (e) => {
    if (!tutorialSwiping) return;
    tutorialSwiping = false;
    const dx = e.changedTouches[0].clientX - tutorialSwipeX;
    if (Math.abs(dx) > 40) {
      if (dx < 0) tutorialGoTo(tutorialSlide + 1);
      else tutorialGoTo(tutorialSlide - 1);
    }
  };
  // Also update dots on manual scroll (for desktop mouse drag)
  vp.onscroll = () => {
    if (tutorialSwiping) return;
    const idx = Math.round(vp.scrollLeft / vp.clientWidth);
    if (idx !== tutorialSlide) { tutorialSlide = idx; tutorialUpdateDots(); }
  };
};

window.closeTutorial = function() {
  document.getElementById('tutorial-overlay').classList.remove('show');
};

window.tutorialNext = function() {
  const count = document.querySelectorAll('#tutorial-dots .tutorial-dot').length;
  if (tutorialSlide >= count - 1) { closeTutorial(); return; }
  tutorialGoTo(tutorialSlide + 1);
};

window.tutorialPrev = function() {
  tutorialGoTo(tutorialSlide - 1);
};

window.openTool = function(toolId, fromHome) {
  toolsSource = fromHome ? 'home' : 'host';
  closeToolsOverlay();
  if (toolId === 'rng') {
    openRngOverlay();
    return;
  }
  if (toolId === 'timers') {
    openTimerOverlay();
    return;
  }
  if (toolId === 'picker') {
    openPickerOverlay();
    return;
  }
  if (toolId === 'status') {
    openStatusMenu();
    return;
  }

  const label = TOOL_LABELS[toolId] || toolId;
  showAlert(label + ' is coming soon!');
};

// ── RANDOM NUMBER TOOL ───────────────────────────
window.openRngOverlay = function() {
  document.getElementById('rng-result-value').textContent = '—';
  document.getElementById('rng-result-sub').textContent = 'Pick a range or roll a die';
  document.getElementById('rng-overlay').classList.add('show');
};
window.closeRngOverlay = function() {
  document.getElementById('rng-overlay').classList.remove('show');
};

window.rollRangeNumber = function() {
  let min = parseInt(document.getElementById('rng-min').value);
  let max = parseInt(document.getElementById('rng-max').value);
  if (isNaN(min) || isNaN(max)) {
    document.getElementById('rng-result-value').textContent = '—';
    document.getElementById('rng-result-sub').textContent = 'Enter valid numbers for both fields';
    return;
  }
  if (min > max) { const t = min; min = max; max = t; }
  const result = Math.floor(Math.random() * (max - min + 1)) + min;
  document.getElementById('rng-result-value').textContent = result;
  document.getElementById('rng-result-sub').textContent = `Range ${min}–${max}`;
};

window.rollDie = function(sides) {
  const result = Math.floor(Math.random() * sides) + 1;
  document.getElementById('rng-result-value').textContent = result;
  document.getElementById('rng-result-sub').textContent = `d${sides} roll`;
};

// ── TIMER TOOL ───────────────────────────────────
// Fully standalone — independent of the in-game turn/round/game timer
// system (timerCfg/timerInterval). Usable from the home screen or as a
// host overlay mid-game, with no effect on turn-taking whatsoever.
window.openTimerOverlay = function() {
  document.getElementById('timer-overlay').classList.add('show');
};
window.closeTimerOverlay = function() {
  document.getElementById('timer-overlay').classList.remove('show');
};

window.switchTimerTab = function(tab) {
  ['countdown','stopwatch','lap'].forEach(t => {
    document.getElementById('timer-tab-' + t).classList.toggle('active', t === tab);
    document.getElementById('timer-pane-' + t).classList.toggle('active', t === tab);
  });
};

function formatClock(totalSeconds, withHours, withMs) {
  const sign = totalSeconds < 0 ? '-' : '';
  const abs = Math.abs(totalSeconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = Math.floor(abs % 60);
  const ms = Math.floor((abs - Math.floor(abs)) * 1000);
  let out;
  if (withHours && h > 0) {
    out = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  } else {
    out = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  if (withMs) out += `.${String(ms).padStart(3,'0').slice(0,2)}`;
  return sign + out;
}

// ── Countdown ──
let cdTargetTime = 0;   // Date.now() timestamp when countdown reaches zero
let cdRemainingAtPause = 0; // seconds left, saved when paused
let toolCdInterval = null;
let cdRunning = false;

window.setCountdownPreset = function(minutes) {
  document.getElementById('cd-min').value = minutes;
  document.getElementById('cd-sec').value = 0;
};

window.startCountdown = function() {
  if (cdRunning) {
    // Acts as Pause
    cdRemainingAtPause = (cdTargetTime - Date.now()) / 1000;
    clearInterval(toolCdInterval);
    toolCdInterval = null;
    cdRunning = false;
    document.getElementById('cd-start-btn').innerHTML = 'Resume <span class="play-tri">▶</span>';
    return;
  }
  let secondsLeft = cdRemainingAtPause;
  if (secondsLeft <= 0) {
    const min = parseInt(document.getElementById('cd-min').value) || 0;
    const sec = parseInt(document.getElementById('cd-sec').value) || 0;
    secondsLeft = (min * 60) + sec;
    if (secondsLeft <= 0) return;
  }
  cdTargetTime = Date.now() + (secondsLeft * 1000);
  cdRunning = true;
  document.getElementById('cd-start-btn').textContent = '⏸ Pause';
  document.getElementById('cd-display').classList.remove('alarm');
  document.getElementById('cd-input-row').style.display = 'none';
  toolCdInterval = setInterval(() => {
    const remaining = (cdTargetTime - Date.now()) / 1000;
    if (remaining <= 0) {
      document.getElementById('cd-display').textContent = formatClock(0, true, true);
      clearInterval(toolCdInterval);
      toolCdInterval = null;
      cdRunning = false;
      cdRemainingAtPause = 0;
      document.getElementById('cd-start-btn').innerHTML = 'Start <span class="play-tri">▶</span>';
      document.getElementById('cd-display').classList.add('alarm');
      playBuzzerSound();
      return;
    }
    document.getElementById('cd-display').textContent = formatClock(remaining, true, true);
  }, 30);
};

window.resetCountdown = function() {
  clearInterval(toolCdInterval);
  toolCdInterval = null;
  cdRunning = false;
  cdRemainingAtPause = 0;
  cdTargetTime = 0;
  document.getElementById('cd-display').textContent = '00:00.00';
  document.getElementById('cd-display').classList.remove('alarm');
  document.getElementById('cd-start-btn').innerHTML = 'Start <span class="play-tri">▶</span>';
  document.getElementById('cd-input-row').style.display = 'flex';
};

// ── Stopwatch ──
let swStartTime = 0;    // Date.now() when current run segment started
let swAccumulated = 0;  // seconds accumulated from previous run segments
let toolSwInterval = null;
let swRunning = false;

window.toggleStopwatch = function() {
  if (swRunning) {
    swAccumulated += (Date.now() - swStartTime) / 1000;
    clearInterval(toolSwInterval);
    toolSwInterval = null;
    swRunning = false;
    document.getElementById('sw-start-btn').innerHTML = 'Resume <span class="play-tri">▶</span>';
    return;
  }
  swStartTime = Date.now();
  swRunning = true;
  document.getElementById('sw-start-btn').textContent = '⏸ Pause';
  toolSwInterval = setInterval(() => {
    const elapsed = swAccumulated + (Date.now() - swStartTime) / 1000;
    document.getElementById('sw-display').textContent = formatClock(elapsed, true, true);
  }, 30);
};

window.resetStopwatch = function() {
  clearInterval(toolSwInterval);
  toolSwInterval = null;
  swRunning = false;
  swAccumulated = 0;
  swStartTime = 0;
  document.getElementById('sw-display').textContent = '00:00.00';
  document.getElementById('sw-start-btn').innerHTML = 'Start <span class="play-tri">▶</span>';
};

// ── Lap Timer ──
let lapStartTime = 0;
let lapAccumulated = 0; // seconds accumulated from previous run segments
let toolLapInterval = null;
let lapRunning = false;
let lapLastMark = 0;    // elapsed value (seconds) at the last recorded lap
let lapCount = 0;

function currentLapElapsed() {
  return lapAccumulated + (lapRunning ? (Date.now() - lapStartTime) / 1000 : 0);
}

window.toggleLapTimer = function() {
  if (lapRunning) {
    lapAccumulated += (Date.now() - lapStartTime) / 1000;
    clearInterval(toolLapInterval);
    toolLapInterval = null;
    lapRunning = false;
    document.getElementById('lap-start-btn').innerHTML = 'Resume <span class="play-tri">▶</span>';
    return;
  }
  lapStartTime = Date.now();
  lapRunning = true;
  document.getElementById('lap-start-btn').textContent = '⏸ Pause';
  toolLapInterval = setInterval(() => {
    document.getElementById('lap-display').textContent = formatClock(currentLapElapsed(), true, true);
  }, 30);
};

window.recordLap = function() {
  lapCount++;
  const now = currentLapElapsed();
  const lapDuration = now - lapLastMark;
  lapLastMark = now;
  const listEl = document.getElementById('lap-list');
  const row = document.createElement('div');
  row.className = 'lap-row';
  row.innerHTML = `<span class="lap-num">Lap ${lapCount}</span><span>${formatClock(lapDuration, true, true)} <span style="color:var(--muted);">(total ${formatClock(now, true, true)})</span></span>`;
  listEl.insertBefore(row, listEl.firstChild); // most recent lap on top
};

window.resetLapTimer = function() {
  clearInterval(toolLapInterval);
  toolLapInterval = null;
  lapRunning = false;
  lapAccumulated = 0;
  lapStartTime = 0;
  lapLastMark = 0;
  lapCount = 0;
  document.getElementById('lap-display').textContent = '00:00.00';
  document.getElementById('lap-start-btn').innerHTML = 'Start <span class="play-tri">▶</span>';
  document.getElementById('lap-list').innerHTML = '';
};

// ── PLAYER PICKER TOOL ───────────────────────────
// Fully standalone — just text in, random selection out. No connection
// to the live room's player list, turn order, or any synced state.
const TEAM_COLORS = ['#cc0000', '#005ee7', '#0a5d00', '#FF7900', '#4c00a4', '#ff32c3', '#999999', '#542a0e'];

window.openPickerOverlay = function() {
  document.getElementById('picker-results').innerHTML = '';
  if (toolsSource === 'host' && localPlayers.length > 0) {
    const names = localPlayers.map(p => p.name).join('\n');
    document.getElementById('picker-names').value = names;
  }
  document.getElementById('picker-overlay').classList.add('show');
};
window.closePickerOverlay = function() {
  document.getElementById('picker-overlay').classList.remove('show');
};


window.switchPickerTab = function(tab) {
  ['list','teams'].forEach(t => {
    document.getElementById('picker-tab-' + t).classList.toggle('active', t === tab);
  });
  document.getElementById('picker-pane-list').style.display  = tab === 'list'  ? 'block' : 'none';
  document.getElementById('picker-pane-teams').style.display = tab === 'teams' ? 'block' : 'none';
  document.getElementById('picker-results').innerHTML = '';
};

function getPickerNames() {
  const raw = document.getElementById('picker-names').value;
  return raw.split('\n').map(s => s.trim()).filter(s => s.length > 0);
}

// Fisher-Yates shuffle — unbiased, standard approach for "randomly order this list"
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

window.runPlayerPick = function() {
  const names = getPickerNames();
  const resultsEl = document.getElementById('picker-results');
  if (names.length === 0) {
    resultsEl.innerHTML = '<p class="status error">Enter at least one name first.</p>';
    return;
  }
  let count = parseInt(document.getElementById('picker-pick-count').value) || 1;
  count = Math.max(1, Math.min(count, names.length));

  const shuffled = shuffleArray(names);
  const picked = new Set(shuffled.slice(0, count));

  const row = document.createElement('div');
  row.className = 'picker-chip-row';
  names.forEach(name => {
    const chip = document.createElement('span');
    chip.className = 'picker-name-chip' + (picked.has(name) ? ' picked' : '');
    chip.textContent = name;
    row.appendChild(chip);
  });
  resultsEl.innerHTML = '';
  resultsEl.appendChild(row);
};

window.runTeamMaker = function() {
  const names = getPickerNames();
  const resultsEl = document.getElementById('picker-results');
  if (names.length === 0) {
    resultsEl.innerHTML = '<p class="status error">Enter at least one name first.</p>';
    return;
  }
  let teamCount = parseInt(document.getElementById('picker-team-count').value) || 2;
  teamCount = Math.max(2, Math.min(teamCount, names.length));

  const shuffled = shuffleArray(names);
  const teams = Array.from({length: teamCount}, () => []);
  shuffled.forEach((name, i) => teams[i % teamCount].push(name));

  resultsEl.innerHTML = '';
  teams.forEach((team, i) => {
    const color = TEAM_COLORS[i % TEAM_COLORS.length];
    const group = document.createElement('div');
    group.className = 'picker-team-group';
    group.style.borderColor = color;
    const title = document.createElement('div');
    title.className = 'picker-team-title';
    title.style.color = color;
    title.textContent = `Team ${i + 1} (${team.length})`;
    const chipRow = document.createElement('div');
    chipRow.className = 'picker-chip-row';
    team.forEach(name => {
      const chip = document.createElement('span');
      chip.className = 'picker-name-chip picked';
      chip.style.background = color;
      chip.style.borderColor = color;
      chip.textContent = name;
      chipRow.appendChild(chip);
    });
    group.appendChild(title);
    group.appendChild(chipRow);
    resultsEl.appendChild(group);
  });
};

// ── STATUS EFFECTS ────────────────────────────────
// Status data lives under rooms/{code}/players/{myId}/statusEffects
// Each connected client can write their own player's status at any time.
// The turn-start check fires inside listenGameState when isMe && turnChanged,
// reading the active player's stored statuses from the room snapshot.

const STATUS_DEFS = {
  paralyzed: {
    icon: '😵',
    name: 'Paralyzed',
    desc: 'Your turn must be skipped. Pass your turn without taking any action.'
  },
  poisoned: {
    icon: '☠️',
    name: 'Poisoned',
    desc: 'You are poisoned! Apply the listed HP loss to your character this turn.'
  }
};

let pendingStatusAlerts = []; // queue of statuses to alert through, one at a time
let currentStatusAlertKey = null;

window.openStatusMenu = function() {
  if (!featureStatusEffectsEnabled) {
    showAlert('Status Effects is not enabled for this room. The host can turn it on in Room Settings.');
    return;
  }
  refreshStatusMenuUI();
  document.getElementById('status-menu-overlay').classList.add('show');
};
window.closeStatusMenu = function() {
  document.getElementById('status-menu-overlay').classList.remove('show');
  document.getElementById('poison-hp-row').style.display = 'none';
};

function refreshStatusMenuUI() {
  if (!db || !roomCode || !myId) return;
  get(ref(db, `rooms/${roomCode}/players/${myId}/statusEffects`)).then(snap => {
    const effects = snap.exists() ? snap.val() : {};
    const pBtn  = document.getElementById('status-opt-paralyzed');
    const pLbl  = document.getElementById('status-opt-paralyzed-label');
    const poBtn = document.getElementById('status-opt-poisoned');
    const poLbl = document.getElementById('status-opt-poisoned-label');
    const hasParalyzed = !!effects.paralyzed;
    const hasPoisoned  = !!(effects.poisoned?.active);
    pBtn.classList.toggle('active', hasParalyzed);
    pLbl.textContent = hasParalyzed ? 'ON' : 'OFF';
    poBtn.classList.toggle('active', hasPoisoned);
    poLbl.textContent = hasPoisoned ? 'ON' : 'OFF';
    // Update the corner button indicators
    updateStatusButtonIndicator(effects);
  }).catch(() => {});
}

window.toggleMyStatus = function(key) {
  if (!db || !roomCode || !myId) return;
  get(ref(db, `rooms/${roomCode}/players/${myId}/statusEffects`)).then(snap => {
    const effects = snap.exists() ? snap.val() : {};
    if (key === 'paralyzed') {
      const nowOn = !effects.paralyzed;
      update(ref(db, `rooms/${roomCode}/players/${myId}/statusEffects`), { paralyzed: nowOn })
        .then(() => refreshStatusMenuUI());
    } else if (key === 'poisoned') {
      const nowActive = !(effects.poisoned?.active);
      if (nowActive) {
        // Show HP input row so player can set the amount before applying
        document.getElementById('poison-hp-row').style.display = 'flex';
        document.getElementById('poison-hp-input').value = effects.poisoned?.hpLoss || 5;
      } else {
        update(ref(db, `rooms/${roomCode}/players/${myId}/statusEffects/poisoned`), { active: false, hpLoss: 0 })
          .then(() => { document.getElementById('poison-hp-row').style.display = 'none'; refreshStatusMenuUI(); });
      }
    }
  }).catch(() => {});
};

window.confirmPoisonHP = function() {
  const hp = parseInt(document.getElementById('poison-hp-input').value) || 5;
  update(ref(db, `rooms/${roomCode}/players/${myId}/statusEffects/poisoned`), { active: true, hpLoss: hp })
    .then(() => { document.getElementById('poison-hp-row').style.display = 'none'; refreshStatusMenuUI(); });
};

function updateStatusButtonIndicator(effects) {
  const hasAny = !!effects.paralyzed || !!(effects.poisoned?.active);
  ['status-btn-active','status-btn-wait'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('has-status', hasAny);
  });
}

// Called from listenGameState when the local player's turn just started.
// Reads their active statuses and queues up alerts for each one.
function checkStatusEffectsOnTurnStart(room) {
  if (!featureStatusEffectsEnabled) return;
  const effects = room.players?.[myId]?.statusEffects || {};
  pendingStatusAlerts = [];
  if (effects.paralyzed) pendingStatusAlerts.push('paralyzed');
  if (effects.poisoned?.active) pendingStatusAlerts.push('poisoned');
  if (pendingStatusAlerts.length > 0) showNextStatusAlert();
}

function showNextStatusAlert() {
  if (pendingStatusAlerts.length === 0) return;
  currentStatusAlertKey = pendingStatusAlerts.shift();
  const def = STATUS_DEFS[currentStatusAlertKey];
  if (!def) { showNextStatusAlert(); return; }

  document.getElementById('status-alert-icon').textContent = def.icon;
  document.getElementById('status-alert-name').textContent = def.name;

  // For poison, augment the description with the actual HP amount
  let desc = def.desc;
  if (currentStatusAlertKey === 'poisoned') {
    get(ref(db, `rooms/${roomCode}/players/${myId}/statusEffects/poisoned`)).then(snap => {
      const hp = snap.exists() ? (snap.val()?.hpLoss || 5) : 5;
      document.getElementById('status-alert-desc').textContent = `You lose ${hp} HP this turn. Apply this to your character now.`;
    });
  } else {
    document.getElementById('status-alert-desc').textContent = desc;
  }

  document.getElementById('status-alert-overlay').classList.add('show');
}

window.resolveStatusAlert = function(choice) {
  if (choice === 'remove' && currentStatusAlertKey && db && roomCode && myId) {
    if (currentStatusAlertKey === 'paralyzed') {
      update(ref(db, `rooms/${roomCode}/players/${myId}/statusEffects`), { paralyzed: false });
    } else if (currentStatusAlertKey === 'poisoned') {
      update(ref(db, `rooms/${roomCode}/players/${myId}/statusEffects/poisoned`), { active: false, hpLoss: 0 });
    }
  }
  // 'keep': do nothing, status stays; 'remove': already written above
  // Either way, move to the next status in the queue (if any)
  if (pendingStatusAlerts.length > 0) {
    document.getElementById('status-alert-overlay').classList.remove('show');
    showNextStatusAlert();
  }
  // If no more statuses, the OK button reveals itself for the final close
};

window.closeStatusAlert = function() {
  document.getElementById('status-alert-overlay').classList.remove('show');
  currentStatusAlertKey = null;
};

window.continueSavedGame = async function() {
  if (!db || !roomCode) return;
  try {
    await update(ref(db, `rooms/${roomCode}`), { status: 'playing', savedAction: 'continue' });
    document.getElementById('saved-screen').classList.remove('show');
  } catch(e) {
    showAlert('Could not resume: ' + (e.message || e));
  }
};

window.leaveSavedScreen = function() {
  cleanupListeners();
  stopTimerTick();
  clearNudgeTimer();
  document.getElementById('saved-screen').classList.remove('show');
  goHome();
};

window.hostLeaveGame = function() {
  if (db && roomCode) {
    update(ref(db, `rooms/${roomCode}`), { savedAction: 'leave' }).catch(() => {});
  }
  leaveSavedScreen();
};

window.goHome = function() {
  // If there's an active room, close it and clear the session
  if (roomCode) {
    cleanupListeners();
    if (isHost && db) {
      remove(ref(db, `rooms/${roomCode}`)).catch(() => {});
    }
    roomCode = null; myId = null; isHost = false;
    clearSession();
  }
  editingRoom = false;
  startingNewGame = false;
  // Reset QR (inline lobby card)
  const qrBox = document.getElementById('qr-code-lobby');
  if (qrBox) qrBox.innerHTML = '';
  // Clear any inputs and errors when going back
  document.getElementById('host-name').value = '';
  document.getElementById('join-name').value = '';
  document.getElementById('join-code').value = '';
  document.getElementById('create-status').textContent = '';
  document.getElementById('join-status').textContent = '';
  // Reset all room settings selections
  myColor = '';
  roomAvatarSelection = '';
  resetCreateWizardState();
  createStep = 1;
  joinStep = 1;
  // Reset color picker button
  const colorLabel = document.getElementById('host-color-label');
  if (colorLabel) colorLabel.textContent = 'Choose\nColor';
  const joinColorLabel = document.getElementById('join-color-label');
  if (joinColorLabel) joinColorLabel.textContent = 'Choose\nColor';
  const colorBtn = document.getElementById('host-color-btn');
  if (colorBtn) { colorBtn.style.background = ''; colorBtn.style.borderColor = ''; colorBtn.classList.remove('light-fill'); }
  const joinColorBtn = document.getElementById('join-color-btn');
  if (joinColorBtn) { joinColorBtn.style.background = ''; joinColorBtn.style.borderColor = ''; joinColorBtn.classList.remove('light-fill'); }
  // Reset avatar button
  const hostAvLabel = document.getElementById('host-avatar-label');
  setAvatarLabel(hostAvLabel, '');
  const joinAvLabel = document.getElementById('join-avatar-label');
  setAvatarLabel(joinAvLabel, '');
  // Reset required notes
  const colorNote = document.getElementById('color-required-note');
  if (colorNote) colorNote.style.display = 'none';
  const avatarNote = document.getElementById('avatar-required-note');
  if (avatarNote) avatarNote.style.display = 'none';
  // Reset wizard steps
  renderCreateStep();
  renderJoinStep();
  showScreen('home');
};

window.goBackToCreate = async function() {
  if (!roomCode) return;
  // Navigate back to create wizard in edit mode — room stays alive
  cleanupListeners();
  resetFirstPlayerOption();
  editingRoom = true;
  const nameEl = document.getElementById('host-name');
  if (nameEl && myName) nameEl.value = myName;
  // Color button
  if (myColor) {
    const colorBtn = document.getElementById('host-color-btn');
    const colorLabel = document.getElementById('host-color-label');
    if (colorBtn) { colorBtn.style.background = myColor; colorBtn.style.borderColor = myColor; colorBtn.classList.toggle('light-fill', isLightColor(myColor)); }
    const colorName = PLAYER_COLORS.find(c => c.hex === myColor)?.name || myColor;
    if (colorLabel) { colorLabel.textContent = colorName; colorLabel.style.color = isLightColor(myColor) ? '#000' : '#fff'; }
  }
  // Avatar button
  const savedAv = roomAvatarSelection || getSavedAvatar();
  if (savedAv) {
    const avLabel = document.getElementById('host-avatar-label');
    setAvatarLabel(avLabel, savedAv);
  }
  // Turn mode
  if (turnMode) {
    if (turnMode === 'classic' && passDirection) {
      const dirEl = document.getElementById('tm-inline-' + passDirection);
      if (dirEl) dirEl.classList.add('selected');
    }
    const selTxt = document.getElementById('tm-summary');
    const dirLabels = { cw: '↻ Left', both: '↔ Left & Right', ccw: '↺ Right' };
    if (selTxt) {
      if (turnMode === 'classic') {
        selTxt.innerHTML = 'Turn Direction — <span>' + (dirLabels[passDirection] || passDirection) + '</span>';
      } else {
        selTxt.innerHTML = '⚡ Speed Round — <span>' + (speedMode === 'firstToTap' ? '1st To Tap' : 'Down The Line') + '</span> · ' + speedRoundsTotal + ' rounds';
      }
    }
    document.getElementById('tm-required-note').style.display = 'none';
  }
  // Sync feature toggle checkboxes with the JS variables
  const toggleMap = {
    'feature-nudge-toggle': featureNudgeEnabled,
    'feature-awards-toggle': featureAwardsEnabled,
    'feature-vp-toggle': featureVPEnabled,
    'feature-status-toggle': featureStatusEffectsEnabled,
    'feature-dnd-toggle': featureDndEnabled,
    'feature-rounds-toggle': featureRoundsEnabled,
    'feature-timers-toggle': featureTimersEnabled
  };
  Object.entries(toggleMap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.checked = val;
  });
  // Sync VP mode row visibility and radio selection
  const vpModeRow = document.getElementById('vp-mode-row');
  if (vpModeRow) {
    vpModeRow.style.display = featureVPEnabled ? 'flex' : 'none';
    const vpRadio = document.querySelector('input[name="vp-mode"][value="' + (vpHighestWins ? 'highest' : 'lowest') + '"]');
    if (vpRadio) vpRadio.checked = true;
  }
  // Sync edit buttons visibility
  const nudgeEditBtn = document.getElementById('nudge-edit-btn');
  if (nudgeEditBtn) nudgeEditBtn.classList.toggle('visible', featureNudgeEnabled);
  const timersEditBtn = document.getElementById('timers-edit-btn');
  if (timersEditBtn) timersEditBtn.classList.toggle('visible', featureTimersEnabled);
  const roundsEditBtn = document.getElementById('rounds-edit-btn');
  if (roundsEditBtn) roundsEditBtn.classList.toggle('visible', featureRoundsEnabled);
  document.getElementById('nudge-delay').value = nudgeDelaySeconds;
  document.getElementById('rounds-total').value = roundsTotal || 3;
  updateFeaturesSummary();
  createStep = 3;
  renderCreateStep();
  renderEditRoomButtons();
  showScreen('create');
};

window.onCreateFinalBtn = function() {
  if (startingNewGame) { startNewGame(); } else if (editingRoom) { returnToLobby(); } else { createRoom(); }
};

function renderEditRoomButtons() {
  const finalBtn = document.getElementById('create-final-btn');
  if (finalBtn) {
    if (startingNewGame) { finalBtn.innerHTML = 'Start Game <span class="play-tri">▶</span>'; }
    else if (editingRoom) { finalBtn.innerHTML = 'Back to Lobby <span class="play-tri">▶</span>'; }
    else { finalBtn.textContent = 'Create Room'; }
  }
}

window.saveRoomChanges = async function() {
  if (!db || !roomCode) return;
  const name = document.getElementById('host-name').value.trim();
  if (!name) { status('create-status', 'Enter your name.', 'error'); return; }
  if (!turnMode || (turnMode === 'classic' && !passDirection)) {
    document.getElementById('tm-required-note').style.display = 'block';
    status('create-status', 'Choose a turn mode to continue.', 'error');
    return;
  }
  document.getElementById('tm-required-note').style.display = 'none';
  myName = name;
  const av = roomAvatarSelection || '👤';
  const updates = {};
  updates[`rooms/${roomCode}/players/${myId}/name`] = name;
  updates[`rooms/${roomCode}/players/${myId}/color`] = myColor;
  updates[`rooms/${roomCode}/players/${myId}/avatar`] = av;
  updates[`rooms/${roomCode}/features/passDirection`] = passDirection;
  updates[`rooms/${roomCode}/features/turnMode`] = turnMode;
  updates[`rooms/${roomCode}/features/speedMode`] = turnMode === 'speedRound' ? speedMode : '';
  updates[`rooms/${roomCode}/features/speedRoundsTotal`] = turnMode === 'speedRound' ? speedRoundsTotal : 0;
  updates[`rooms/${roomCode}/features/nudge`] = featureNudgeEnabled;
  updates[`rooms/${roomCode}/features/nudgeDelay`] = featureNudgeEnabled ? (parseInt(document.getElementById('nudge-delay').value) || 30) : 0;
  updates[`rooms/${roomCode}/features/nudgeMode`] = featureNudgeEnabled ? (document.querySelector('input[name="nudge-mode"]:checked')?.value || 'multi') : 'multi';
  updates[`rooms/${roomCode}/features/awards`] = featureAwardsEnabled;
  updates[`rooms/${roomCode}/features/victoryPoints`] = featureVPEnabled;
  updates[`rooms/${roomCode}/features/vpHighestWins`] = vpHighestWins;
  updates[`rooms/${roomCode}/features/statusEffects`] = featureStatusEffectsEnabled;
  updates[`rooms/${roomCode}/features/dndTurnComponents`] = featureDndEnabled;
  updates[`rooms/${roomCode}/features/timers`] = featureTimersEnabled;
  updates[`rooms/${roomCode}/features/timerTurnOn`] = featureTimersEnabled && document.getElementById('timer-turn-on').checked;
  updates[`rooms/${roomCode}/features/timerTurnVisible`] = document.getElementById('timer-turn-visible').checked;
  updates[`rooms/${roomCode}/features/timerRoundOn`] = featureTimersEnabled && document.getElementById('timer-round-on').checked;
  updates[`rooms/${roomCode}/features/timerRoundVisible`] = document.getElementById('timer-round-visible').checked;
  updates[`rooms/${roomCode}/features/timerGameOn`] = featureTimersEnabled && document.getElementById('timer-game-on').checked;
  updates[`rooms/${roomCode}/features/timerGameVisible`] = document.getElementById('timer-game-visible').checked;
  updates[`rooms/${roomCode}/features/timerCountdownOn`] = featureTimersEnabled && document.getElementById('timer-countdown-on').checked;
  updates[`rooms/${roomCode}/features/timerCountdownVisible`] = document.getElementById('timer-countdown-visible').checked;
  updates[`rooms/${roomCode}/features/timerCountdownSecs`] = (parseInt(document.getElementById('timer-countdown-min').value)||0)*60 + (parseInt(document.getElementById('timer-countdown-sec').value)||30);
  updates[`rooms/${roomCode}/features/rounds`] = featureRoundsEnabled;
  updates[`rooms/${roomCode}/features/roundsTotal`] = featureRoundsEnabled ? (parseInt(document.getElementById('rounds-total').value) || 3) : 0;
  await update(ref(db), updates);
  haptic(20);
  editingRoom = false;
  document.getElementById('display-code').textContent = roomCode;
  showScreen('lobby');
  generateLobbyQR();
  listenLobby();
};

window.returnToLobby = function() {
  editingRoom = false;
  startingNewGame = false;
  document.getElementById('display-code').textContent = roomCode;
  showScreen('lobby');
  generateLobbyQR();
  listenLobby();
};

window.confirmLeave = async function() {
  if (await showConfirm('Leave the room?')) {
    resetOrientation();
    if (isHost) { closeRoom(); } else { leaveRoom(); }
  }
};

// ── QR CODE ──────────────────────────────────
let qrVisible = false;

window.closeQROverlay = function() {
  document.getElementById('qr-overlay').style.display = 'none';
  qrVisible = false;
};

// ── QR SCANNER (Camera) ──
let scannerStream = null;
let scannerAnimFrame = null;

window.openQRScanner = async function() {
  const overlay = document.getElementById('scanner-overlay');
  const video = document.getElementById('scanner-video');
  const statusEl = document.getElementById('scanner-status');
  overlay.style.display = 'flex';
  statusEl.textContent = 'Requesting camera access...';
  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    video.srcObject = scannerStream;
    await video.play();
    statusEl.textContent = 'Point camera at QR code';
    startQRDetection(video, statusEl);
  } catch (e) {
    statusEl.textContent = 'Camera access denied. Type code instead.';
    setTimeout(() => closeQRScanner(), 2000);
  }
};

function startQRDetection(video, statusEl) {
  if ('BarcodeDetector' in window) {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const detect = async () => {
      if (!scannerStream) return;
      try {
        const codes = await detector.detect(video);
        if (codes.length > 0) {
          handleScannedQR(codes[0].rawValue);
          return;
        }
      } catch (e) {}
      scannerAnimFrame = requestAnimationFrame(detect);
    };
    detect();
  } else if (typeof jsQR === 'function') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const detect = () => {
      if (!scannerStream) return;
      if (video.readyState >= video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleScannedQR(code.data);
            return;
          }
        } catch (e) {}
      }
      scannerAnimFrame = requestAnimationFrame(detect);
    };
    detect();
  } else {
    statusEl.textContent = 'QR scanning not supported. Type code instead.';
  }
}

function handleScannedQR(value) {
  haptic(10);
  let code = '';
  const joinMatch = value.match(/[?&]join=([A-Z]{4})/i);
  if (joinMatch) {
    code = joinMatch[1].toUpperCase();
  } else {
    const clean = value.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (clean.length === 4) code = clean;
  }
  if (code) {
    const joinInput = document.getElementById('join-code');
    if (joinInput) joinInput.value = code;
    status('join-status', 'Code scanned: ' + code, '');
    closeQRScanner();
  } else {
    document.getElementById('scanner-status').textContent = 'Invalid QR code. Try again.';
    if (scannerStream) {
      scannerAnimFrame = requestAnimationFrame(() => startQRDetection(video, document.getElementById('scanner-status')));
    }
  }
}

window.closeQRScanner = function() {
  const video = document.getElementById('scanner-video');
  if (scannerAnimFrame) { cancelAnimationFrame(scannerAnimFrame); scannerAnimFrame = null; }
  if (scannerStream) {
    scannerStream.getTracks().forEach(t => t.stop());
    scannerStream = null;
  }
  if (video) video.srcObject = null;
  document.getElementById('scanner-overlay').style.display = 'none';
};

function generateQR() {
  const box = document.getElementById('qr-code-overlay');
  if (!box) return;
  box.innerHTML = '';
  const base = window.location.href.split('?')[0].split('#')[0];
  const joinUrl = base + '?join=' + roomCode;
  new QRCode(box, {
    text: joinUrl,
    width: 130,
    height: 130,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
}

// Generate QR into the always-visible lobby card
function generateLobbyQR() {
  const box = document.getElementById('qr-code-lobby');
  if (!box) return;
  box.innerHTML = '';
  const base = window.location.href.split('?')[0].split('#')[0];
  const joinUrl = base + '?join=' + roomCode;
  new QRCode(box, {
    text: joinUrl,
    width: 67,
    height: 67,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
}



// ── COLOR UTILITY ──────────────────────────────
// Returns true for colors bright enough to need black text
function isLightColor(hex) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return false;
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  // Perceived luminance (ITU-R BT.709)
  const luminance = 0.2126*r + 0.7152*g + 0.0722*b;
  return luminance > 160;
}

function adjustBrightness(hex, factor) {
  // factor: -1 to 1, negative = darker
  let r = parseInt(hex.slice(1,3),16);
  let g = parseInt(hex.slice(3,5),16);
  let b = parseInt(hex.slice(5,7),16);
  if (factor < 0) {
    r = Math.round(r * (1 + factor));
    g = Math.round(g * (1 + factor));
    b = Math.round(b * (1 + factor));
  } else {
    r = Math.round(r + (255 - r) * factor);
    g = Math.round(g + (255 - g) * factor);
    b = Math.round(b + (255 - b) * factor);
  }
  return `rgb(${r},${g},${b})`;
}

// ── HOST GAME MENU ──────────────────────────────
window.openHostCrownMenu = function() {
  const codeEl = document.getElementById('host-crown-room-code');
  if (codeEl) codeEl.textContent = roomCode || '----';
  const erBtn = document.getElementById('host-crown-endround-btn');
  if (erBtn) erBtn.style.display = featureRoundsEnabled ? '' : 'none';
  document.getElementById('host-crown-overlay').classList.add('show');
};

window.closeHostCrownMenu = function() {
  document.getElementById('host-crown-overlay').classList.remove('show');
};

// Keep toggleHostMenu as no-op for any lingering references
window.toggleHostMenu = function() {};

window.hostMenuAction = async function(action) {
  if (action === 'open-tools') {
    openToolsOverlay();
  } else if (action === 'end-round') {
    const doEndRound = async () => {
      // If both Rounds and VP are enabled, collect VP for this round first
      if (featureRoundsEnabled && featureVPEnabled) {
        if (await showConfirm(`End Round ${currentRound} and collect Victory Points?`)) {
          // Close host menu
          closeHostCrownMenu();
          // Set status to round-vp-entry so all players see the VP input overlay
          await update(ref(db, `rooms/${roomCode}`), {
            status: 'round-vp-entry',
            vpRoundReady: null,
            vpRoundDraft: null
          });
        }
        return;
      }
      // Original logic: just advance the round
      const updates = {};
      if (featureRoundsEnabled) {
        const nextRound = Math.min(currentRound + 1, roundsTotal);
        currentRound = nextRound;
        updates[`rooms/${roomCode}/currentRound`] = nextRound;
      }
      if (featureTimersEnabled && timerCfg.round) {
        timerRound = 0;
        updates[`rooms/${roomCode}/timerRound`] = 0;
        renderTimers();
      }
      if (Object.keys(updates).length && db && roomCode) {
        await update(ref(db), updates);
      }
      if (!featureRoundsEnabled && !featureTimersEnabled) {
        showAlert('No round-based features are currently enabled.');
      }
    };
    doEndRound();
  } else if (action === 'save-game') {
    if (await showConfirm('Save the game? Everyone will be paused until you resume with the save code.')) {
      saveCurrentGame();
    }
  } else if (action === 'end-game') {
    let msg = 'End the game';
    if (featureVPEnabled && featureRoundsEnabled) {
      msg += ' and show the final Victory Point results?';
    } else if (featureAwardsEnabled) {
      msg += ' and start the Achievement Awards?';
    } else if (featureVPEnabled) {
      msg += ' and start the Victory Point ceremony?';
    } else {
      msg += '?';
    }
    if (await showConfirm(msg)) {
      triggerEndGame();
    }
  }
};

// ── MID-GAME ROOM SETTINGS ────────────────────
let mgCountdownWasActive = false;

window.openMidGameSettings = function() {
  if (!db || !roomCode) return;

  // Sync hidden inputs for nudge/rounds
  document.getElementById('mg-nudge-delay').value = nudgeDelaySeconds;
  document.getElementById('mg-rounds-total').value = roundsTotal || 3;
  const modeRadio = document.querySelector(`input[name="mg-nudge-mode"][value="${nudgeMode}"]`);
  if (modeRadio) modeRadio.checked = true;

  // Track countdown state for detecting newly enabled
  mgCountdownWasActive = timerCfg.countdown;

  // Highlight current direction
  mgHighlightDirection(passDirection);

  // Render feature grid
  renderMGFeatureGrid();

  document.getElementById('mg-status').textContent = '';
  document.getElementById('midgame-settings-overlay').classList.add('show');
};

window.closeMidGameSettings = function() {
  document.getElementById('midgame-settings-overlay').classList.remove('show');
  openHostCrownMenu();
};

// ── HOST MENU FEATURE GRID ──
const MG_KEY_MAP = {
  nudge: 'nudge', awards: 'awards', vp: 'victoryPoints',
  timers: 'timers', status: 'statusEffects', rounds: 'rounds',
  dnd: 'dndTurnComponents', undo: 'undo'
};
const MG_VAR_MAP = {
  nudge: 'featureNudgeEnabled', awards: 'featureAwardsEnabled', vp: 'featureVPEnabled',
  timers: 'featureTimersEnabled', status: 'featureStatusEffectsEnabled', rounds: 'featureRoundsEnabled',
  dnd: 'featureDndEnabled', undo: 'featureUndoEnabled'
};

function isMGFeatureEnabled(key) {
  switch (key) {
    case 'nudge':  return featureNudgeEnabled;
    case 'awards': return featureAwardsEnabled;
    case 'vp':     return featureVPEnabled;
    case 'timers': return featureTimersEnabled;
    case 'status': return featureStatusEffectsEnabled;
    case 'rounds': return featureRoundsEnabled;
    case 'dnd':    return featureDndEnabled;
    case 'undo':   return featureUndoEnabled;
  }
  return !!window[MG_VAR_MAP[key]];
}

function setMGFeatureState(key, enabled) {
  switch (key) {
    case 'nudge':  featureNudgeEnabled = enabled; break;
    case 'awards': featureAwardsEnabled = enabled; break;
    case 'vp':     featureVPEnabled = enabled; break;
    case 'timers': featureTimersEnabled = enabled; break;
    case 'status': featureStatusEffectsEnabled = enabled; break;
    case 'rounds': featureRoundsEnabled = enabled; break;
    case 'dnd':    featureDndEnabled = enabled; break;
    case 'undo':   featureUndoEnabled = enabled; break;
  }
  window[MG_VAR_MAP[key]] = enabled;
}

window.toggleMGFeature = function(key) {
  const def = FEATURE_DEFS_GRID.find(f => f.key === key);
  if (!def) return;
  const wasEnabled = isMGFeatureEnabled(key);
  if (!wasEnabled) {
    setMGFeatureState(key, true);
    haptic(5);
    if (def.hasSettings && def.settingKey) openMGFeatureSettings(def.settingKey);
  } else {
    setMGFeatureState(key, false);
    haptic(3);
  }
  renderMGFeatureGrid();
};

function renderMGFeatureGrid() {
  const grid = document.getElementById('mg-features-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const visibleDefs = FEATURE_DEFS_GRID.filter(f => !f.creatorOnly || isCreator);
  visibleDefs.forEach(def => {
    const enabled = isMGFeatureEnabled(def.key);
    const card = document.createElement('div');
    card.className = 'feature-card' + (enabled ? ' added' : '');
    card.onclick = () => toggleMGFeature(def.key);
    if (enabled && def.hasSettings) {
      let detail = '⚙ Settings';
      if (def.key === 'nudge') {
        const delay = parseInt(document.getElementById('mg-nudge-delay')?.value) || 60;
        const mode = document.querySelector('input[name="mg-nudge-mode"]:checked')?.value || 'multi';
        const mins = Math.floor(delay / 60);
        const secs = delay % 60;
        const timeStr = mins > 0 ? mins + 'm' + (secs > 0 ? ' ' + secs + 's' : '') : delay + 's';
        detail = timeStr + ' · ' + (mode === 'single' ? 'Single' : 'Multi');
      } else if (def.key === 'rounds') {
        const total = parseInt(document.getElementById('mg-rounds-total')?.value) || 3;
        detail = total + ' rounds';
      }
      card.innerHTML = '<div class="fc-left" onclick="event.stopPropagation(); toggleMGFeature(\'' + def.key + '\')"><span class="fc-name">' + def.name + '</span></div><div class="fc-divider"></div><div class="fc-right" onclick="event.stopPropagation(); openMGFeatureSettings(\'' + def.settingKey + '\')"><span class="fc-edit-label">Edit</span><span class="fc-settings">' + detail + '</span></div>';
    } else if (enabled) {
      card.innerHTML = '<div class="fc-left" onclick="event.stopPropagation(); toggleMGFeature(\'' + def.key + '\')"><span class="fc-name">' + def.name + '</span></div>';
    } else {
      card.innerHTML = '<span class="fc-name">' + def.name + '</span>';
    }
    grid.appendChild(card);
  });
}

window.mgHighlightDirection = function(dir) {
  document.querySelectorAll('.mg-dir-btn').forEach(btn => {
    const active = btn.dataset.dir === dir;
    btn.style.background = active ? 'var(--accent)' : 'rgba(255,255,255,0.06)';
    btn.style.borderColor = active ? 'var(--accent)' : 'var(--border)';
    btn.style.color = active ? '#fff' : 'var(--text)';
  });
};

window.mgSetDirection = function(dir) {
  passDirection = dir;
  mgHighlightDirection(dir);
};

window.onMidGameToggle = function(key, checked) {
  // These functions are legacy stubs from when the overlay used checkboxes.
  // Feature toggling is now handled by toggleMGFeature() via the card grid.
};

window.mgSyncNudgeMin = function() {};

window.mgCountdownToggle = function(checked) {
  // Legacy stub — countdown is now managed via timerCfg
};

window.openNudgeOverlay = function() {
  document.getElementById('mg-nudge-settings-overlay').classList.add('show');
  ndDialInit('mg-nd-dial-outer','mg-nd-dial-knob','mg-nd-dial-value','mg-nudge-delay', parseInt(document.getElementById('mg-nudge-delay').value) || 30);
  const cur = document.querySelector('input[name="mg-nudge-mode"]:checked')?.value || nudgeMode || 'multi';
  selectNdMode(cur, true);
};
window.closeNudgeOverlay = function() {
  document.getElementById('mg-nudge-settings-overlay').classList.remove('show');
  // Live-apply nudge settings to the active game
  nudgeDelaySeconds = parseInt(document.getElementById('mg-nudge-delay').value) || 0;
  nudgeMode = document.querySelector('input[name="mg-nudge-mode"]:checked')?.value || 'multi';
  renderMGFeatureGrid();
  if (db && roomCode) {
    const updates = {
      [`rooms/${roomCode}/features/nudgeDelay`]: nudgeDelaySeconds,
      [`rooms/${roomCode}/features/nudgeMode`]: nudgeMode
    };
    update(ref(db), updates).catch(() => {});
  }
};
window.openRoundsOverlay = function() {
  document.getElementById('mg-rounds-settings-overlay').classList.add('show');
  rdDialInit('mg-rd-dial-outer','mg-rd-dial-knob','mg-rd-dial-value','mg-rounds-total', parseInt(document.getElementById('mg-rounds-total').value) || 3);
};
window.closeRoundsOverlay = function() {
  document.getElementById('mg-rounds-settings-overlay').classList.remove('show');
  // Live-apply rounds total to the active game
  const total = parseInt(document.getElementById('mg-rounds-total').value) || 3;
  roundsTotal = total;
  renderMGFeatureGrid();
  if (typeof renderRoundIndicator === 'function') renderRoundIndicator(currentRound, roundsTotal);
  if (db && roomCode && featureRoundsEnabled) {
    const updates = {
      [`rooms/${roomCode}/features/roundsTotal`]: total,
      [`rooms/${roomCode}/currentRound`]: 1
    };
    update(ref(db), updates).catch(() => {});
  }
};

window.openMGFeatureSettings = function(key) {
  if (key === 'nudge')   { openNudgeOverlay(); return; }
  if (key === 'rounds')  { openRoundsOverlay(); return; }
  if (key === 'timers')  { openFeatureSettings('timers'); return; }
};

window.saveMidGameSettings = async function() {
  if (!db || !roomCode) return;
  const statusEl = document.getElementById('mg-status');
  statusEl.textContent = 'Saving…';

  const nudgeOn       = featureNudgeEnabled;
  const awardsOn      = featureAwardsEnabled;
  const vpOn          = featureVPEnabled;
  const timersOn      = featureTimersEnabled;
  const statusOn      = featureStatusEffectsEnabled;
  const dndOn         = featureDndEnabled;
  const roundsOn      = featureRoundsEnabled;
  const undoOn        = featureUndoEnabled;
  const roundsTotalMg = roundsOn ? (parseInt(document.getElementById('mg-rounds-total').value) || 3) : 0;
  const countdownOn   = timersOn && timerCfg.countdown;
  const countdownNewlyEnabled = countdownOn && !mgCountdownWasActive;

  const newFeatures = {
    passDirection,
    nudge:                 nudgeOn,
    nudgeDelay:            nudgeOn ? (parseInt(document.getElementById('mg-nudge-delay').value) || 30) : 0,
    nudgeMode:             nudgeOn ? (document.querySelector('input[name="mg-nudge-mode"]:checked')?.value || 'multi') : 'multi',
    awards:                awardsOn,
    victoryPoints:         vpOn,
    statusEffects:         statusOn,
    dndTurnComponents:     dndOn,
    rounds:                roundsOn,
    roundsTotal:           roundsTotalMg,
    timers:                timersOn,
    undo:                  undoOn,
    timerTurnOn:           timersOn && timerCfg.turn,
    timerTurnVisible:      timerCfg.turnVisible,
    timerRoundOn:          timersOn && timerCfg.round,
    timerRoundVisible:     timerCfg.roundVisible,
    timerGameOn:           timersOn && timerCfg.game,
    timerGameVisible:      timerCfg.gameVisible,
    timerCountdownOn:      countdownOn,
    timerCountdownVisible: timerCfg.countdownVisible,
    timerCountdownSecs:    timerCfg.countdownSecs || 30
  };

  try {
    const updates = { [`rooms/${roomCode}/features`]: newFeatures };
    if (countdownNewlyEnabled) {
      updates[`rooms/${roomCode}/timerCountdown`] = newFeatures.timerCountdownSecs;
    }
    // If rounds was just enabled or total changed, reset currentRound to 1
    if (roundsOn) {
      updates[`rooms/${roomCode}/currentRound`] = 1;
    }
    await update(ref(db), updates);
    suppressNextTurnSound = true;
    // Update local state immediately
    nudgeDelaySeconds = newFeatures.nudgeDelay;
    nudgeMode = newFeatures.nudgeMode;
    statusEl.textContent = '✓ Applied!';
    closeMidGameSettings();
  } catch(e) {
    statusEl.textContent = 'Error: ' + e.message;
  }
};
window.onNudgeToggle = function(checked) {
  featureNudgeEnabled = checked;
  const editBtn = document.getElementById('nudge-edit-btn');
  if (editBtn) editBtn.classList.toggle('visible', checked);
  if (checked) openFeatureSettings('nudge');
  updateFeaturesSummary();
};

window.onAwardsToggle = function(checked) {
  featureAwardsEnabled = checked;
  updateFeaturesSummary();
};

window.onVPToggle = function(checked) {
  featureVPEnabled = checked;
  const modeRow = document.getElementById('vp-mode-row');
  if (modeRow) modeRow.style.display = checked ? 'flex' : 'none';
  updateFeaturesSummary();
};

window.onVPModeChange = function(val) {
  vpHighestWins = (val === 'highest');
};

window.onStatusEffectsToggle = function(checked) {
  featureStatusEffectsEnabled = checked;
  updateFeaturesSummary();
};

window.onDndToggle = function(checked) {
  featureDndEnabled = checked;
  updateFeaturesSummary();
};

window.onRoundsToggle = function(checked) {
  featureRoundsEnabled = checked;
  const editBtn = document.getElementById('rounds-edit-btn');
  if (editBtn) editBtn.classList.toggle('visible', checked);
  if (checked) openFeatureSettings('rounds');
  updateFeaturesSummary();
};

window.onUndoToggle = function(checked) {
  featureUndoEnabled = checked;
  updateFeaturesSummary();
};

// ── STEP 3 FEATURE GRID TOGGLE ──
const FEATURE_DEFS_GRID = [
  { key: 'awards',  icon: '🏆', name: 'Awards',         hasSettings: false, var: 'featureAwardsEnabled' },
  { key: 'nudge',   icon: '👉', name: 'Nudge',          hasSettings: true,  settingKey: 'nudge',   var: 'featureNudgeEnabled' },
  { key: 'vp',      icon: '🏅', name: 'Victory Points',  hasSettings: false, var: 'featureVPEnabled' },
  { key: 'rounds',  icon: '🔢', name: 'Rounds',         hasSettings: true,  settingKey: 'rounds',  var: 'featureRoundsEnabled' },
  { key: 'undo',    icon: '↩️', name: 'Undo Pass',      hasSettings: false, var: 'featureUndoEnabled' },
  { key: 'timers',  icon: '⏱️', name: 'Timers',         hasSettings: true,  settingKey: 'timers',  var: 'featureTimersEnabled',  creatorOnly: true },
  { key: 'status',  icon: '🩹', name: 'Status Effects',  hasSettings: false, var: 'featureStatusEffectsEnabled', creatorOnly: true },
  { key: 'dnd',     icon: '⚔️', name: 'D&D',            hasSettings: false, var: 'featureDndEnabled',           creatorOnly: true }
];

function isFeatureEnabled(key) {
  const def = FEATURE_DEFS_GRID.find(f => f.key === key);
  if (!def) return false;
  return !!window[def.var];
}

function setFeatureEnabled(key, enabled) {
  const def = FEATURE_DEFS_GRID.find(f => f.key === key);
  if (!def) return;
  window[def.var] = enabled;
  // Also sync the old overlay checkboxes so save logic still works
  const toggleMap = {
    nudge: 'feature-nudge-toggle', awards: 'feature-awards-toggle',
    timers: 'feature-timers-toggle', vp: 'feature-vp-toggle',
    status: 'feature-status-toggle', rounds: 'feature-rounds-toggle',
    dnd: 'feature-dnd-toggle', undo: 'feature-undo-toggle'
  };
  const cb = document.getElementById(toggleMap[key]);
  if (cb) cb.checked = enabled;
  // Run existing side-effect handlers
  if (key === 'nudge')   window.onNudgeToggle(enabled);
  if (key === 'awards')  window.onAwardsToggle(enabled);
  if (key === 'timers')  window.onTimersToggle(enabled);
  if (key === 'vp')      window.onVPToggle(enabled);
  if (key === 'status')  window.onStatusEffectsToggle(enabled);
  if (key === 'rounds')  window.onRoundsToggle(enabled);
  if (key === 'dnd')     window.onDndToggle(enabled);
  if (key === 'undo')    window.onUndoToggle(enabled);
}

window.toggleFeature = function(key) {
  const def = FEATURE_DEFS_GRID.find(f => f.key === key);
  if (!def) return;
  const wasEnabled = isFeatureEnabled(key);
  if (!wasEnabled) {
    // Enable and move to added
    setFeatureEnabled(key, true);
    haptic(5);
    // Open settings overlay if it has one
    if (def.hasSettings && def.settingKey) {
      openFeatureSettings(def.settingKey);
    }
  } else {
    // Disable and move back to available
    setFeatureEnabled(key, false);
    haptic(3);
  }
  renderFeatureGrid();
  updateCreateCollapseSummary();
};

function renderFeatureGrid() {
  const map = { vp: 'featVP', dnd: 'featDnD' };
  const featT = k => map[k] || ('feat' + k[0].toUpperCase() + k.slice(1));
  const avail = document.getElementById('features-available-grid');
  if (!avail) return;
  avail.innerHTML = '';
  const visibleDefs = FEATURE_DEFS_GRID.filter(f => !f.creatorOnly || isCreator);
  visibleDefs.forEach(def => {
    const enabled = isFeatureEnabled(def.key);
    const card = document.createElement('div');
    card.className = 'feature-card' + (enabled ? ' added' : '');
    card.setAttribute('data-feature', def.key);
    card.onclick = () => toggleFeature(def.key);
    if (enabled && def.hasSettings) {
      let detail = '⚙ Settings';
      if (def.key === 'nudge') {
        const delay = parseInt(document.getElementById('nudge-delay')?.value) || 60;
        const mode = document.querySelector('input[name="nudge-mode"]:checked')?.value || 'multi';
        const mins = Math.floor(delay / 60);
        const secs = delay % 60;
        const timeStr = mins > 0 ? mins + 'm' + (secs > 0 ? ' ' + secs + 's' : '') : delay + 's';
        detail = timeStr + ' · ' + (mode === 'single' ? 'Single' : 'Multi');
      } else if (def.key === 'rounds') {
        const total = parseInt(document.getElementById('rounds-total')?.value) || 3;
        detail = total + ' rounds';
      } else if (def.key === 'timers') {
        detail = '⚙ Settings';
      }
      card.innerHTML = '<div class="fc-left" onclick="event.stopPropagation(); toggleFeature(\'' + def.key + '\')"><span class="fc-name">' + t(featT(def.key)) + '</span></div><div class="fc-divider"></div><div class="fc-right" onclick="event.stopPropagation(); openFeatureSettings(\'' + def.settingKey + '\')"><span class="fc-edit-label">Edit</span><span class="fc-settings">' + detail + '</span></div>';
    } else if (enabled) {
      card.innerHTML = '<div class="fc-left" onclick="event.stopPropagation(); toggleFeature(\'' + def.key + '\')"><span class="fc-name">' + t(featT(def.key)) + '</span></div>';
    } else {
      card.innerHTML = '<span class="fc-name">' + t(featT(def.key)) + '</span>';
    }
    avail.appendChild(card);
  });
}

window.closeFeaturesOverlay = function() {
  document.getElementById('features-config-overlay').classList.remove('show');
  updateFeaturesSummary();
};

function updateFeaturesSummary() {
  const el = document.getElementById('features-summary');
  if (!el) return;
  const active = [];
  if (featureNudgeEnabled)         active.push(t('featNudge'));
  if (featureAwardsEnabled)        active.push(t('featAwards'));
  if (featureTimersEnabled)        active.push(t('featTimers'));
  if (featureVPEnabled)            active.push(t('featVP'));
  if (featureStatusEffectsEnabled) active.push(t('featStatus'));
  if (featureDndEnabled)           active.push(t('featDnD'));
  if (featureRoundsEnabled)        active.push(t('featRounds'));
  if (featureUndoEnabled)          active.push(t('featUndo'));
  el.textContent = active.length ? active.join(' · ') : t('allFeaturesOff');
  // Also update the Step 3 grid if it exists
  if (document.getElementById('features-available-grid')) renderFeatureGrid();
}

window.openFeatureSettings = function(key) {
  document.getElementById(key + '-settings-overlay').classList.add('show');
  if (key === 'nudge') {
    ndDialInit('nd-dial-outer','nd-dial-knob','nd-dial-value','nudge-delay', parseInt(document.getElementById('nudge-delay').value) || 30);
    const cur = document.querySelector('input[name="nudge-mode"]:checked')?.value || nudgeMode || 'multi';
    selectNdMode(cur);
  }
  if (key === 'rounds') rdDialInit('rd-dial-outer','rd-dial-knob','rd-dial-value','rounds-total', parseInt(document.getElementById('rounds-total').value) || 3);
};

window.selectNdMode = function(mode, isMg) {
  const prefix = isMg ? 'mg-nd' : 'nd';
  document.getElementById(prefix + '-mode-multi').classList.toggle('selected', mode === 'multi');
  document.getElementById(prefix + '-mode-single').classList.toggle('selected', mode === 'single');
  // Sync hidden radio state for save logic
  const radioName = isMg ? 'mg-nudge-mode' : 'nudge-mode';
  document.querySelectorAll('input[name="' + radioName + '"]').forEach(r => r.checked = (r.value === mode));
};

window.closeFeatureSettings = function(key) {
  document.getElementById(key + '-settings-overlay').classList.remove('show');
  renderFeatureGrid();
};

// ── ROUND INDICATOR ──────────────────────────
function renderRoundIndicator(round, total) {
  const isFinal = round >= total;
  ['active','wait'].forEach(screen => {
    const wrap  = document.getElementById(`round-indicator-${screen}`);
    const label = document.getElementById(`round-label-${screen}`);
    const frac  = document.getElementById(`round-fraction-${screen}`);
    if (!wrap) return;
    if (!featureRoundsEnabled) {
      wrap.classList.remove('visible');
      return;
    }
    wrap.classList.add('visible');
    label.textContent = isFinal ? 'Final Round' : `Round ${round}`;
    label.classList.toggle('final', isFinal);
    frac.textContent  = `${round}/${total}`;
    frac.classList.toggle('final', isFinal);
  });
}

// ── FEATURE INFO OVERLAY ──────────────────────
const FEATURE_INFO = {
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
  }
};

window.showFeatureInfo = function(key) {
  const info = FEATURE_INFO[key];
  if (!info) return;
  document.getElementById('info-title').textContent = info.title;
  document.getElementById('info-body').innerHTML = info.body.replace(/\n/g, '<br>');
  document.getElementById('info-overlay').classList.add('show');
};
window.closeFeatureInfo = function() {
  document.getElementById('info-overlay').classList.remove('show');
};

// ── STEP 3 FEATURES HELP OVERLAY ──
function buildFeatureHelpList() {
  const container = document.getElementById('features-help-list');
  if (!container) return;
  const visibleDefs = FEATURE_DEFS_GRID.filter(f => !f.creatorOnly || isCreator);
  container.innerHTML = visibleDefs.map(def => {
    const info = FEATURE_INFO[def.key];
    if (!info) return '';
    return '<div class="feature-help-card" onclick="showFeatureInfo(\'' + def.key + '\')" style="'
      + 'background:rgba(255,255,255,0.04);border:2px solid var(--border);border-radius:12px;'
      + 'padding:0.75rem 0.5rem;cursor:pointer;text-align:center;'
      + 'display:flex;flex-direction:column;align-items:center;gap:4px;'
      + 'transition:border-color 0.15s,background 0.15s;min-height:70px;justify-content:center;">'
      + '<div style="font-size:0.82rem;font-weight:700;color:var(--text);line-height:1.2;">' + info.title + '</div>'
      + '</div>';
  }).join('');
}
window.openFeaturesHelpOverlay = function() {
  buildFeatureHelpList();
  document.getElementById('features-help-overlay').classList.add('show');
};
window.closeFeaturesHelpOverlay = function() {
  document.getElementById('features-help-overlay').classList.remove('show');
};
document.getElementById('features-help-overlay').addEventListener('click', function(e) {
  if (e.target === this) this.classList.remove('show');
});
document.getElementById('info-overlay').addEventListener('click', function(e) {
  if (e.target === this) this.classList.remove('show');
});
document.getElementById('midgame-settings-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeMidGameSettings();
});

// ── NUDGE LOGIC ────────────────────────────────
function startNudgeCountdown(seconds) {
  clearNudgeTimer();
  nudgeUnlocked = false;
  nudgeUsedThisTurn = false;
  const btn = document.getElementById('nudge-btn');
  const lockedLabel = document.getElementById('nudge-locked-label');
  const countdownEl = document.getElementById('nudge-countdown');
  if (btn) { btn.style.opacity = '0.35'; btn.disabled = false; }
  let remaining = seconds;
  if (countdownEl) countdownEl.textContent = remaining;
  if (lockedLabel) lockedLabel.style.display = 'block';
  nudgeCountdownTimer = setInterval(() => {
    remaining--;
    if (countdownEl) countdownEl.textContent = remaining;
    if (remaining <= 0) {
      clearNudgeTimer();
      nudgeUnlocked = true;
      if (btn) btn.style.opacity = '1';
      if (lockedLabel) lockedLabel.style.display = 'none';
    }
  }, 1000);
}

function clearNudgeTimer() {
  if (nudgeCountdownTimer) { clearInterval(nudgeCountdownTimer); nudgeCountdownTimer = null; }
}

window.sendNudge = async function() {
  if (!nudgeUnlocked || !featureNudgeEnabled) return;
  if (!db || !roomCode) return;
  if (nudgeMode === 'single' && nudgeUsedThisTurn) return;

  // Read who is currently active directly from Firebase to avoid stale localPlayers
  const snap = await get(ref(db, `rooms/${roomCode}`));
  if (!snap.exists()) return;
  const room = snap.val();
  const activeIdx = room.activePlayerIndex ?? 0;
  const players = buildOrderedPlayers(room.players || {});
  const player = players[activeIdx];
  if (!player) return;

  // Reset cap tracking if active player changed
  if (nudgeCapTargetId !== player.id) {
    nudgeSentToActive = {};
    nudgeCapTargetId = player.id;
  }

  // Check per-sender cap (50 nudges per active player per turn)
  const sent = nudgeSentToActive[myId] || 0;
  if (sent >= NUDGE_CAP) {
    const limitMsg = document.getElementById('nudge-limit-msg');
    if (limitMsg) { limitMsg.style.display = ''; }
    return;
  }

  nudgeUsedThisTurn = true;
  if (nudgeMode === 'single') {
    const btn = document.getElementById('nudge-btn');
    if (btn) { btn.style.opacity = '0.35'; btn.disabled = true; }
  }

  // Track locally
  nudgeSentToActive[myId] = sent + 1;

  // Use separate keys per-turn keyed to the player ID to avoid cross-turn bleed
  const nudgeRef = ref(db, `rooms/${roomCode}/nudges/${player.id}`);
  const totalRef = ref(db, `rooms/${roomCode}/nudgeTotals/${player.id}`);

  // Atomic increment for turn nudges
  await runTransaction(nudgeRef, current => (current || 0) + 1);
  // Atomic increment for total nudges received (lifetime)
  await runTransaction(totalRef, current => (current || 0) + 1);
  // Track nudges sent by this player
  const sentRef = ref(db, `rooms/${roomCode}/nudgeSentTotals/${myId}`);
  await runTransaction(sentRef, current => (current || 0) + 1);
  haptic(10);
};

function syncNudgeToActiveScreen(room) {
  const floatContainer = document.getElementById('nudge-float-container');
  if (!floatContainer) return;

  // Always use the player whose turn it actually is right now
  const activeIdx = room.activePlayerIndex ?? 0;
  const player = localPlayers[activeIdx];
  if (!player || player.id !== myId) return; // Only run on the actual active player's device

  const newCount = (room.nudges && room.nudges[player.id]) ? room.nudges[player.id] : 0;
  if (newCount > activeNudgeCount) {
    const diff = newCount - activeNudgeCount;
    activeNudgeCount = newCount;
    if (soundEnabled) playNudgeSound();
    for (let i = 0; i < Math.min(diff, 6); i++) {
      setTimeout(() => spawnNudgeFloat(floatContainer), i * 100);
    }
    // Squish animation
    const screen = document.getElementById('screen-active');
    if (screen) {
      screen.classList.remove('nudge-squish');
      void screen.offsetWidth;
      screen.classList.add('nudge-squish');
    }
  }
}

function spawnNudgeFloat(container, color) {
  const el = document.createElement('div');
  el.className = 'nudge-float';
  el.textContent = '👉';
  el.style.left = (10 + Math.random() * 80) + '%';
  container.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

function resetNudgesForNewTurn() {
  // Reset local count immediately so syncNudgeToActiveScreen doesn't fire stale diffs
  activeNudgeCount = 0;
  nudgeSentToActive = {};
  nudgeCapTargetId = null;
  const limitMsg = document.getElementById('nudge-limit-msg');
  if (limitMsg) limitMsg.style.display = 'none';
  const floatContainer = document.getElementById('nudge-float-container');
  if (floatContainer) floatContainer.innerHTML = '';
  // Host clears the entire nudges map so no stale counts bleed into the new turn
  if (isHost && db && roomCode) {
    update(ref(db, `rooms/${roomCode}`), { nudges: null });
  }
}

// ── TIMER FEATURE ─────────────────────────────

// Toggle handlers
window.onTimersToggle = function(checked) {
  featureTimersEnabled = checked;
  const editBtn = document.getElementById('timers-edit-btn');
  if (editBtn) editBtn.classList.toggle('visible', checked);
  if (checked) openFeatureSettings('timers');
  updateFeaturesSummary();
};
window.onCountdownToggle = function(checked) {
  document.getElementById('countdown-inputs').style.display = checked ? 'flex' : 'none';
};

// Format seconds ▶ MM:SS
function fmtTime(s) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

// Start the tick interval on the active player's device
function startTimerTick(isActive) {
  stopTimerTick();
  timerIsActive = isActive;
  if (!featureTimersEnabled) return;
  timerInterval = setInterval(() => {
    if (timerCfg.turn)  timerTurn++;
    if (timerCfg.round) timerRound++;
    if (timerCfg.game)  timerGame++;
    if (timerCfg.countdown && timerIsActive) {
      timerCountdown = Math.max(0, timerCountdown - 1);
      if (timerCountdown === 0) playBuzzerSound();
    }
    renderTimers();
    // Active player pushes their current turn time to Firebase every 5s
    if (isActive && timerCfg.turn && timerTurn % 5 === 0 && db && roomCode) {
      update(ref(db, `rooms/${roomCode}`), { timerRound, timerGame });
    }
  }, 1000);
}

function stopTimerTick() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

// Called when turn changes — save this player's turn time, reset turn clock
async function commitTurnTime(playerId, elapsed) {
  if (!db || !roomCode || !featureTimersEnabled || !timerCfg.turn) return;
  const snap = await get(ref(db, `rooms/${roomCode}/playerTimes/${playerId}`));
  const prev = snap.exists() ? (snap.val() || 0) : 0;
  await update(ref(db, `rooms/${roomCode}`), {
    [`playerTimes/${playerId}`]: prev + elapsed,
    timerRound,
    timerGame
  });
}

// Called when a new turn starts — reset turn/countdown clocks, load round/game from Firebase
function initTimersForTurn(room, isActive) {
  if (!featureTimersEnabled) return;
  timerTurn = 0;
  timerCountdown = timerCfg.countdownSecs;
  timerRound = room.timerRound || 0;
  timerGame  = room.timerGame  || 0;
  startTimerTick(isActive);
  renderTimers();
}

// Called by host when End Round fires — reset round timer in Firebase
async function resetRoundTimer() {
  timerRound = 0;
  if (db && roomCode) await update(ref(db, `rooms/${roomCode}`), { timerRound: 0 });
  renderTimers();
}

// Render all timer pills into both screens
function renderTimers() {
  const slots = [
    { key: 'turn',      label: '🙋',  value: fmtTime(timerTurn),      visible: timerCfg.turnVisible,      enabled: timerCfg.turn      },
    { key: 'round',     label: '🔁',  value: fmtTime(timerRound),     visible: timerCfg.roundVisible,     enabled: timerCfg.round     },
    { key: 'game',      label: '🎮',  value: fmtTime(timerGame),      visible: timerCfg.gameVisible,      enabled: timerCfg.game      },
    { key: 'countdown', label: '⏳',  value: fmtTime(timerCountdown), visible: timerCfg.countdownVisible, enabled: timerCfg.countdown  },
  ];

  ['active','wait'].forEach(screen => {
    slots.forEach(slot => {
      const row = document.getElementById(`timer-row-${slot.key}-${screen}`);
      if (!row) return;
      if (!featureTimersEnabled || !slot.enabled || !slot.visible) {
        row.innerHTML = '';
        return;
      }
      const warning = slot.key === 'countdown' && timerCountdown <= 10 && timerCountdown > 0;
      row.innerHTML = `<div class="timer-pill${warning ? ' countdown-warning' : ''}">
        <span class="timer-pill-label">${slot.label}</span>${slot.value}
      </div>`;
    });
  });
}

// Sync non-active devices' round/game timers from Firebase (they don't tick locally)
function syncTimersFromRoom(room) {
  if (!featureTimersEnabled) return;
  timerRound = room.timerRound || 0;
  timerGame  = room.timerGame  || 0;
  renderTimers();
}

// Buzzer sound for countdown reaching zero
function playBuzzerSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch(e) {}
}

async function triggerEndGame() {
  if (!db || !roomCode) return;

  // If both Rounds and VP are enabled, compute totals from per-round scores
  if (featureVPEnabled && featureRoundsEnabled) {
    const snap = await get(ref(db, `rooms/${roomCode}`));
    const room = snap.val() || {};
    const roundScores = room.vpRoundScores || {};
    // Include any scores from the current round if we're mid-collection
    const finalScores = {};
    localPlayers.forEach(p => { finalScores[p.id] = 0; });
    Object.values(roundScores).forEach(roundData => {
      Object.entries(roundData).forEach(([pid, score]) => {
        if (finalScores[pid] == null) finalScores[pid] = 0;
        finalScores[pid] += (parseInt(score) || 0);
      });
    });
    // Also include vpRoundDraft if players submitted for current round but didn't advance yet
    const draft = room.vpRoundDraft || {};
    if (room.vpRoundReady) {
      Object.entries(room.vpRoundReady).forEach(([pid, ready]) => {
        if (ready && draft[pid] != null) {
          finalScores[pid] = (finalScores[pid] || 0) + (parseInt(draft[pid]) || 0);
        }
      });
    }

    const updates = {};
    updates[`rooms/${roomCode}/vpScores`] = finalScores;
    updates[`rooms/${roomCode}/vpReady`] = null;
    updates[`rooms/${roomCode}/vpRoundScores`] = null;
    updates[`rooms/${roomCode}/vpRoundReady`] = null;
    updates[`rooms/${roomCode}/vpRoundDraft`] = null;

    if (featureAwardsEnabled) {
      updates[`rooms/${roomCode}/status`] = 'ceremony';
      updates[`rooms/${roomCode}/ceremonyStep`] = 'standby';
      await update(ref(db), updates);
      runCeremonyAsHost();
    } else {
      updates[`rooms/${roomCode}/status`] = 'vp-ceremony';
      updates[`rooms/${roomCode}/vpCeremonyStep`] = 'standby';
      await update(ref(db), updates);
      runVPCeremonyAsHost();
    }
    return;
  }

  if (featureVPEnabled) {
    // Push vp-entry status — all players see the score entry overlay
    await update(ref(db, `rooms/${roomCode}`), { status: 'vp-entry', vpScores: null, vpReady: null });
  } else if (featureAwardsEnabled) {
    await update(ref(db, `rooms/${roomCode}`), { status: 'ceremony', ceremonyStep: 'standby' });
    runCeremonyAsHost();
  } else {
    await update(ref(db, `rooms/${roomCode}`), { status: 'gameover' });
    showGameOver();
  }
}

// Host runs the ceremony timeline and pushes state to Firebase
async function runCeremonyAsHost() {
  if (!db || !roomCode) return;
  ceremonyAborted = false;
  const snap = await get(ref(db, `rooms/${roomCode}`));
  if (!snap.exists()) return;
  const room = snap.val();

  const players = buildOrderedPlayers(room.players || {});
  const nudgeTotals = room.nudgeTotals || {};
  const vpScores = room.vpScores || {};

  // Read features fresh from room — don't rely on local state
  const roomFeatures = room.features || {};
  const nudgeOn  = !!roomFeatures.nudge;
  const timersOn = !!roomFeatures.timers && !!roomFeatures.timerTurnOn;
  const vpOn     = !!roomFeatures.victoryPoints;

  // Build award list
  const awards = [];

  // Victory Points award (first, if enabled)
  if (vpOn && Object.keys(vpScores).length > 0) {
    const byVP = players
      .map(p => ({ ...p, vp: vpScores[p.id] ?? 0 }))
      .sort((a, b) => b.vp - a.vp);
    if (byVP.length > 0) {
      const winner = byVP[0];
      awards.push({
        key: 'most-vp',
        category: 'Most Victory Points',
        trophy: '🏅',
        winner,
        stat: `${winner.vp} point${winner.vp !== 1 ? 's' : ''}`,
        customSpeech: `The player with the most Victory Points is...`
      });
    }
  }

  if (nudgeOn) {
    // Award: Most Nudged (most nudges received)
    const nudgeTotals = room.nudgeTotals || {};
    const byMostNudged = players
      .map(p => ({ ...p, total: nudgeTotals[p.id] || 0 }))
      .sort((a, b) => b.total - a.total);

    if (byMostNudged.length > 0) {
      const winner = byMostNudged[0];
      awards.push({
        key: 'most-nudged',
        category: 'Most Nudged Player',
        trophy: '👉',
        winner,
        stat: `${winner.total} nudge${winner.total !== 1 ? 's' : ''} received`
      });
    }

    // Award: Least Nudged (fewest received — zero qualifies)
    const byLeastNudged = [...byMostNudged].reverse();
    if (byLeastNudged.length > 0) {
      const winner = byLeastNudged[0];
      awards.push({
        key: 'least-nudged',
        category: 'Least Nudged Player',
        trophy: '😇',
        winner,
        stat: winner.total === 0 ? 'Never nudged!' : `Only ${winner.total} nudge${winner.total !== 1 ? 's' : ''} received`
      });
    }

    // Award: Most Nudges Sent (the nudger)
    const nudgeSent = room.nudgeSentTotals || {};
    const bySent = players
      .map(p => ({ ...p, sent: nudgeSent[p.id] || 0 }))
      .filter(p => p.sent > 0)
      .sort((a, b) => b.sent - a.sent);
    if (bySent.length > 0) {
      const winner = bySent[0];
      awards.push({
        key: 'most-sent',
        category: 'Most Nudges Sent',
        trophy: '👊',
        winner,
        stat: `${winner.sent} nudge${winner.sent !== 1 ? 's' : ''} sent`
      });
    }
  }

  if (timersOn) {
    const playerTimes = room.playerTimes || {};
    const byTime = players
      .map(p => ({ ...p, secs: playerTimes[p.id] || 0 }))
      .filter(p => p.secs > 0)
      .sort((a, b) => b.secs - a.secs);

    if (byTime.length > 0) {
      // Most time taken (slowest)
      const slowest = byTime[0];
      awards.push({
        key: 'most-time',
        category: 'Most Time Taken',
        trophy: '🐢',
        winner: slowest,
        stat: `${fmtTime(slowest.secs)} total turn time`
      });

      // Least time taken (fastest)
      const fastest = byTime[byTime.length - 1];
      awards.push({
        key: 'least-time',
        category: 'Least Time Taken',
        trophy: '⚡',
        winner: fastest,
        stat: `${fmtTime(fastest.secs)} total turn time`
      });
    }
  }

  // Present each award
  for (const award of awards) {
    if (ceremonyAborted) return;
    await presentAward(award);
    if (ceremonyAborted) return;
  }

  // All done — push gameover
  await update(ref(db, `rooms/${roomCode}`), { status: 'gameover', ceremonyStep: 'gameover' });
}

// Sleep that resolves early if ceremonyAborted is set (polls every 200ms)
function sleepAbortable(ms) {
  return new Promise(resolve => {
    const end = Date.now() + ms;
    const check = () => {
      if (ceremonyAborted || Date.now() >= end) resolve();
      else setTimeout(check, 200);
    };
    setTimeout(check, 200);
  });
}

// Host can skip remaining awards — aborts loop and sends everyone to game-over
window.skipAwards = async function() {
  if (!db || !roomCode || !isHost) return;
  ceremonyAborted = true;
  window.speechSynthesis && window.speechSynthesis.cancel();
  stopFireworks();
  await update(ref(db, `rooms/${roomCode}`), { status: 'gameover', ceremonyStep: 'gameover' });
};

async function presentAward(award) {
  if (!db || !roomCode) return;

  await update(ref(db, `rooms/${roomCode}`), {
    ceremonyStep: 'announcing',
    ceremonyAward: {
      key: award.key,
      category: award.category,
      trophy: award.trophy,
      winnerId: award.winner.id,
      winnerName: award.winner.name,
      winnerColor: award.winner.color || '#7c3aed',
      stat: award.stat
    }
  });

  speakText(award.customSpeech || `The achievement award for ${award.category} goes to...`);
  await sleepAbortable(4500);
  if (ceremonyAborted) return;

  await update(ref(db, `rooms/${roomCode}`), { ceremonyStep: 'reveal' });
  speakText(award.winner.name);
  await sleepAbortable(5000);
  if (ceremonyAborted) return;

  await update(ref(db, `rooms/${roomCode}`), { ceremonyStep: 'standby', ceremonyAward: null });
  await sleepAbortable(1500);
}

// All devices react to ceremony state from Firebase
function handleCeremonyState(room) {
  const step = room.ceremonyStep || 'standby';
  const award = room.ceremonyAward || null;

  if (step === 'gameover') {
    hideAllAwardOverlays();
    showGameOver();
    return;
  }

  if (step === 'standby' || step === 'announcing') {
    hideAllAwardOverlays();
    showStandby();
    return;
  }

  if (step === 'reveal' && award) {
    const isWinner = award.winnerId === myId;
    hideAllAwardOverlays();

    if (isWinner) {
      showWinnerReveal(award);
    } else {
      showStandby();
    }
  }
}

function hideAllAwardOverlays() {
  document.getElementById('awards-standby').classList.remove('show');
  document.getElementById('awards-reveal').classList.remove('show');
  document.getElementById('awards-gameover').classList.remove('show');
  const vpOv = document.getElementById('vp-overlay');
  if (vpOv) vpOv.classList.remove('show');
  const vpStandby = document.getElementById('vp-standby');
  if (vpStandby) vpStandby.classList.remove('show');
  const vpWinner = document.getElementById('vp-reveal-winner');
  if (vpWinner) vpWinner.classList.remove('show');
  const vpSpectator = document.getElementById('vp-reveal-spectator');
  if (vpSpectator) vpSpectator.classList.remove('show');
  const vpRankings = document.getElementById('vp-rankings');
  if (vpRankings) vpRankings.classList.remove('show');
  // Remove non-winner blackout from whatever screen is active
  const sa = document.querySelector('.screen.active');
  if (sa) {
    sa.classList.remove('vp-ceremony-blackout');
    sa.style.zIndex = '';
    sa.style.background = '';
    sa.querySelectorAll(':scope > *').forEach(ch => {
      ch.style.removeProperty('display');
      ch.style.removeProperty('visibility');
      ch.style.removeProperty('opacity');
    });
  }
  // Also clean up any screen-active that might have blackout (in case it became active)
  const saFixed = document.getElementById('screen-active');
  if (saFixed && saFixed !== sa) {
    saFixed.classList.remove('vp-ceremony-blackout');
    saFixed.style.zIndex = '';
    saFixed.style.background = '';
    saFixed.querySelectorAll(':scope > *').forEach(ch => {
      ch.style.removeProperty('display');
      ch.style.removeProperty('visibility');
      ch.style.removeProperty('opacity');
    });
  }
  // Remove full-screen blackout cover
  const cover = document.getElementById('vp-blackout-cover');
  if (cover) cover.remove();
  stopFireworks();
}

function showWinnerReveal(award) {
  try {
    const uid = currentUser?.uid || '';
    if (uid) {
      const key = 'sk_awards_' + uid;
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.push({ key: award.key, category: award.category, trophy: award.trophy, stat: award.stat, date: Date.now() });
      localStorage.setItem(key, JSON.stringify(list));
      // Sync to Firebase
      if (db) set(ref(db, `users/${uid}/awards`), list).catch(() => {});
    }
  } catch {}
  const reveal = document.getElementById('awards-reveal');
  document.getElementById('awards-category-label').textContent = award.category;
  document.getElementById('awards-trophy').textContent = award.trophy;
  document.getElementById('awards-winner-name').textContent = award.winnerName;
  document.getElementById('awards-winner-name').style.color = award.winnerColor;
  document.getElementById('awards-winner-stat').textContent = award.stat;
  reveal.classList.add('show');
  startFireworks(award.winnerColor);
}

function showGameOver() {
  hideAllAwardOverlays();
  // Set text dynamically so cached SW doesn't serve stale strings.
  // Only brand this as "Achievement Awards" when that feature was actually
  // on — otherwise show a plain, feature-neutral game-over message.
  const iconEl  = document.getElementById('awards-gameover-icon');
  const titleEl = document.getElementById('awards-gameover-title-text');
  const subEl   = document.getElementById('awards-gameover-sub-text');
  if (featureAwardsEnabled) {
    if (iconEl)  iconEl.textContent = '🎉';
    if (titleEl) titleEl.textContent = 'Achievement Awards';
    if (subEl)   subEl.textContent = "That's a wrap — great game!";
  } else {
    if (iconEl)  iconEl.textContent = '🏁';
    if (titleEl) titleEl.textContent = 'Game Over';
    if (subEl)   subEl.textContent = "That's a wrap — great game!";
  }
  // Show correct options based on role
  const hostOpts = document.getElementById('awards-host-options');
  const waitMsg  = document.getElementById('awards-wait-msg');
  if (hostOpts) hostOpts.style.display = isHost ? 'flex' : 'none';
  if (waitMsg)  waitMsg.style.display  = isHost ? 'none' : 'block';
  document.getElementById('awards-gameover').classList.add('show');
}

// Also set standby text dynamically at ceremony start to avoid SW cache issues
function showStandby() {
  const el = document.getElementById('awards-standby-text');
  if (el) el.textContent = 'Achievement Awards';
  const skipBtn = document.getElementById('awards-skip-btn');
  if (skipBtn) skipBtn.style.display = isHost ? 'block' : 'none';
  document.getElementById('awards-standby').classList.add('show');
}

// Play Again — resets nudge stats, keeps players & order, goes back to playing
window.playAgain = async function() {
  if (!db || !roomCode || !isHost) return;
  hideAllAwardOverlays();
  stopFireworks();
  window.speechSynthesis && window.speechSynthesis.cancel();

  // Reset nudge stats, ceremony state, push back to playing
  const snap = await get(ref(db, `rooms/${roomCode}`));
  if (!snap.exists()) return;
  const room = snap.val();
  const players = buildOrderedPlayers(room.players || {});

  const updates = {};
  updates[`rooms/${roomCode}/status`] = 'playing';
  updates[`rooms/${roomCode}/activePlayerIndex`] = 0;
  updates[`rooms/${roomCode}/currentRound`] = 1;
  updates[`rooms/${roomCode}/previousPlayerId`] = null;
  updates[`rooms/${roomCode}/previousPlayerIndex`] = null;
  updates[`rooms/${roomCode}/nudges`] = null;
  updates[`rooms/${roomCode}/nudgeTotals`] = null;
  updates[`rooms/${roomCode}/nudgeSentTotals`] = null;
  updates[`rooms/${roomCode}/playerTimes`] = null;
  updates[`rooms/${roomCode}/vpScores`] = null;
  updates[`rooms/${roomCode}/vpReady`] = null;
  updates[`rooms/${roomCode}/vpRoundScores`] = null;
  updates[`rooms/${roomCode}/vpRoundReady`] = null;
  updates[`rooms/${roomCode}/vpRoundDraft`] = null;
  updates[`rooms/${roomCode}/timerRound`] = 0;
  updates[`rooms/${roomCode}/timerGame`] = 0;
  updates[`rooms/${roomCode}/ceremonyStep`] = null;
  updates[`rooms/${roomCode}/ceremonyAward`] = null;

  // Reset speed round buzz state so scores don't carry over
  const roomFeatures = room.features || {};
  if (roomFeatures.turnMode === 'speedRound') {
    updates[`rooms/${roomCode}/buzz/phase`] = 'waiting';
    updates[`rooms/${roomCode}/buzz/currentRound`] = 1;
    updates[`rooms/${roomCode}/buzz/scores`] = {};
    updates[`rooms/${roomCode}/buzz/winner`] = null;
    updates[`rooms/${roomCode}/buzz/tapOrder`] = {};
    updates[`rooms/${roomCode}/buzz/dtlIndex`] = 0;
    updates[`rooms/${roomCode}/buzz/roundStartTime`] = serverNow();
  }

  await update(ref(db), updates);

  lastActivePlayerId = null;
};

// Close Room — deletes room, everyone goes to game over then home
window.closeRoomFinal = async function() {
  if (!db || !roomCode || !isHost) return;
  hideAllAwardOverlays();
  stopFireworks();
  window.speechSynthesis && window.speechSynthesis.cancel();
  // Push a 'closed' status so non-hosts know to go home
  await update(ref(db, `rooms/${roomCode}`), { status: 'closed' });
  await remove(ref(db, `rooms/${roomCode}`));
  lastActivePlayerId = null;
  featureAwardsEnabled = false;
  featureNudgeEnabled = false;
  roomCode = null; myId = null;
  clearSession();
  releaseWakeLock();
  resetOrientation();
  cleanupListeners();
  showScreen('home');
};

// Non-host taps home from gameover screen
window.endGameFinal = async function() {
  try {
    const prevHosted = parseInt(localStorage.getItem('sk_hosted_count') || '0', 10);
    const newHosted = prevHosted + 1;
    localStorage.setItem('sk_hosted_count', String(newHosted));
    const prevRooms = parseInt(localStorage.getItem('sk_rooms_count') || '0', 10);
    const newRooms = prevRooms + 1;
    localStorage.setItem('sk_rooms_count', String(newRooms));
    // Sync to Firebase
    const uid = currentUser?.uid;
    if (uid && db) {
      set(ref(db, `users/${uid}/hostedCount`), newHosted).catch(() => {});
      set(ref(db, `users/${uid}/roomsCount`), newRooms).catch(() => {});
    }
  } catch {}
  hideAllAwardOverlays();
  stopFireworks();
  window.speechSynthesis && window.speechSynthesis.cancel();
  lastActivePlayerId = null;
  roomCode = null; myId = null;
  clearSession();
  releaseWakeLock();
  resetOrientation();
  cleanupListeners();
  showScreen('home');
};

// ── SPEECH SYNTHESIS ────────────────────────────
function speakText(text) {
  // If a custom awards voice MP3 is set, play it instead of TTS
  const customVoice = getCustomAudio('awardsVoice');
  if (customVoice) {
    customVoice.currentTime = 0;
    customVoice.play().catch(() => _speakTextTTS(text));
    return;
  }
  _speakTextTTS(text);
}

function _speakTextTTS(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.88;
  utt.pitch = 1.0;
  utt.volume = 1.0;
  // Pick a natural voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    /samantha|google us|zira|david|karen/i.test(v.name)
  ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
  if (preferred) utt.voice = preferred;
  window.speechSynthesis.speak(utt);
}

// ── FIREWORKS + CONFETTI CANVAS ──────────────────
let fireworksRAF = null;
let fireworksParticles = [];
let confettiParticles = [];

function startFireworks(playerColor) {
  startFireworksForCanvas('awards-canvas', playerColor, true);
}

function startFireworksForCanvas(canvasId, playerColor, intense) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  fireworksParticles = [];
  confettiParticles = [];
  stopFireworks();

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return { r, g, b };
  }

  const base = hexToRgb(playerColor || '#7c3aed');
  const palette = [
    playerColor, '#ffffff', '#FFD700', '#FF69B4',
    `rgb(${Math.min(base.r+80,255)},${Math.min(base.g+80,255)},${Math.min(base.b+80,255)})`
  ];
  const confettiColors = [
    playerColor, '#FFD700', '#FF69B4', '#00e5ff', '#76ff03', '#ff6e40', '#e040fb', '#ffffff'
  ];

  function spawnBurst(x, y) {
    const count = intense ? (35 + Math.floor(Math.random() * 20)) : (15 + Math.floor(Math.random() * 10));
    for (let i = 0; i < count; i++) {
      const angle  = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed  = intense ? (4 + Math.random() * 7) : (2 + Math.random() * 4);
      fireworksParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size: intense ? (3 + Math.random() * 4) : (2 + Math.random() * 3),
        color: palette[Math.floor(Math.random() * palette.length)],
        gravity: 0.12 + Math.random() * 0.08,
        decay: 0.012 + Math.random() * 0.01
      });
    }
  }

  function spawnConfettiBurst(x, y) {
    const count = intense ? (45 + Math.floor(Math.random() * 25)) : (20 + Math.floor(Math.random() * 12));
    for (let i = 0; i < count; i++) {
      const angle  = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const speed  = intense ? (3 + Math.random() * 8) : (2 + Math.random() * 5);
      confettiParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        alpha: 1,
        w: 4 + Math.random() * 6,
        h: 8 + Math.random() * 12,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        gravity: 0.15 + Math.random() * 0.1,
        decay: 0.006 + Math.random() * 0.005,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.05 + Math.random() * 0.08
      });
    }
  }

  function launchRandom() {
    const x = canvas.width  * (0.15 + Math.random() * 0.7);
    const y = canvas.height * (0.1  + Math.random() * 0.45);
    spawnBurst(x, y);
    spawnConfettiBurst(x, y);
  }

  function rainConfetti() {
    const count = intense ? (10 + Math.floor(Math.random() * 6)) : (5 + Math.floor(Math.random() * 4));
    for (let i = 0; i < count; i++) {
      confettiParticles.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 2 + Math.random() * 3,
        alpha: 0.9 + Math.random() * 0.1,
        w: 4 + Math.random() * 5,
        h: 8 + Math.random() * 10,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        gravity: 0.02 + Math.random() * 0.02,
        decay: 0.003 + Math.random() * 0.003,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.03 + Math.random() * 0.06
      });
    }
  }

  // Initial volley
  const initBursts = intense ? 5 : 2;
  for (let i = 0; i < initBursts; i++) setTimeout(launchRandom, i * 250);
  rainConfetti();
  const confettiRainInterval = setInterval(rainConfetti, intense ? 300 : 600);
  const launchInterval = setInterval(launchRandom, intense ? 700 : 1400);

  const ctx = canvas.getContext('2d');
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    fireworksParticles = fireworksParticles.filter(p => p.alpha > 0.02);
    for (const p of fireworksParticles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.alpha -= p.decay;
      p.size  *= 0.993;
    }

    confettiParticles = confettiParticles.filter(p => p.alpha > 0.02);
    for (const p of confettiParticles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      p.wobble += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.wobble) * 1.2;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.99;
      p.rotation += p.rotSpeed;
      p.alpha -= p.decay;
    }

    fireworksRAF = requestAnimationFrame(draw);
  }
  draw();

  setTimeout(() => clearInterval(launchInterval), intense ? 5000 : 3000);
  setTimeout(() => clearInterval(confettiRainInterval), intense ? 5000 : 3000);
}

function stopFireworks() {
  if (fireworksRAF) { cancelAnimationFrame(fireworksRAF); fireworksRAF = null; }
  fireworksParticles = [];
  confettiParticles = [];
  ['awards-canvas', 'vp-canvas', 'vp-canvas-winner', 'vp-canvas-spectator'].forEach(id => {
    const c = document.getElementById(id);
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
  });
}

// ── SETTINGS PANEL TOGGLE ──────────────────────
const PLAYER_COLORS = [
  { name: 'Red',        hex: '#cc0000' },
  { name: 'Orange',     hex: '#FF7900' },
  { name: 'Yellow',     hex: '#fffb05' },
  { name: 'Dark Green', hex: '#0a5d00' },
  { name: 'Mint',       hex: '#6effac' },
  { name: 'Blue',       hex: '#005ee7' },
  { name: 'Light Blue', hex: '#50b8e7' },
  { name: 'Purple',     hex: '#4c00a4' },
  { name: 'Lavender',   hex: '#cc91ff' },
  { name: 'Pink',       hex: '#ff32c3' },
  { name: 'Brown',      hex: '#542a0e' },
  { name: 'White',      hex: '#FFFFFF' },
  { name: 'Grey',       hex: '#999999' },
  { name: 'Black',      hex: '#000000' },
];

let myColor = '';         // no default — must be chosen
let colorPickerContext = 'host';
let tempSelectedColor = '#cc0000';

window.openColorPicker = function(context) {
  colorPickerContext = context;
  tempSelectedColor = myColor;
  const grid = document.getElementById('color-grid');
  grid.innerHTML = '';
  PLAYER_COLORS.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (c.hex === tempSelectedColor ? ' selected' : '') + (isLightColor(c.hex) ? ' light-fill' : '');
    sw.style.background = c.hex;
    sw.title = c.name;
    sw.setAttribute('role', 'button');
    sw.setAttribute('tabindex', '0');
    sw.onclick = () => {
      grid.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      tempSelectedColor = c.hex;
    };
    grid.appendChild(sw);
  });
  document.getElementById('color-picker-overlay').classList.add('show');
};

window.confirmColor = function() {
  myColor = tempSelectedColor;
  const colorName = PLAYER_COLORS.find(c => c.hex === myColor)?.name || 'Custom';
  const isLight = ['#FFFFFF','#ffffff','#F5F5F5','#f5f5f5','#fffb05','#6effac'].includes(myColor);
  ['host','join'].forEach(ctx => {
    const btn = document.getElementById(ctx + '-color-btn');
    const label  = document.getElementById(ctx + '-color-label');
    if (btn) {
      btn.style.background = myColor; btn.style.borderColor = myColor;
      btn.classList.toggle('light-fill', isLightColor(myColor));
    }
    if (label)  { label.textContent = colorName; label.style.color = isLight ? '#000' : '#fff'; }
  });
  const colorNote = document.getElementById('color-required-note');
  if (colorNote) colorNote.style.display = 'none';
  document.getElementById('color-picker-overlay').classList.remove('show');
  updateJoinCollapseSummary();
};

// Close overlay on background tap
document.getElementById('color-picker-overlay').addEventListener('click', function(e) {
  if (e.target === this) this.classList.remove('show');
});
document.getElementById('edit-profile-color-overlay').addEventListener('click', function(e) {
  if (e.target === this) this.classList.remove('show');
});
window.openSettingsOverlay = function() {
  // Sync room code display
  const rc = document.getElementById('settings-overlay-room-code');
  if (rc) rc.textContent = roomCode || '----';
  document.getElementById('settings-overlay').classList.add('show');
};
window.closeSettingsOverlay = function() {
  document.getElementById('settings-overlay').classList.remove('show');
};

// ── SOUND TOGGLE ──────────────────────────────
let soundEnabled = true;
window.toggleSound = function() {
  soundEnabled = !soundEnabled;
  const icon = soundEnabled ? '🔊' : '🔇';
  const btn = document.getElementById('sound-toggle');
  if (btn) { btn.textContent = icon; btn.classList.toggle('active-ctrl', soundEnabled); }
  const activeBtn = document.getElementById('active-sound-btn');
  if (activeBtn) activeBtn.textContent = icon;
  const waitBtn = document.getElementById('active-sound-btn-wait');
  if (waitBtn) waitBtn.textContent = icon;
};

// ── ORIENTATION CONTROL ──────────────────────
function resetOrientation() {
  try { screen.orientation.lock('portrait-primary').catch(()=>{}); } catch(e) {}
}

// ── WAKE LOCK (keep screen on during game) ──────────────
let wakeLock = null;
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch(e) {}
}
async function releaseWakeLock() {
  try { if (wakeLock) { await wakeLock.release(); wakeLock = null; } } catch(e) {}
}
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && wakeLock === null) {
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && (activeScreen.id === 'screen-active' || activeScreen.id === 'screen-waiting')) {
      await requestWakeLock();
    }
  }
});


// ── CUSTOM SOUND FILES ────────────────────────
// Place your .mp3 files in the same folder as sidekick.html.
// Set the path below to enable each sound. Leave as null to use the
// built-in synthesized sound instead.
//
//   sounds/pass-turn.mp3   — plays when it becomes your turn
//   sounds/nudge.mp3       — plays on the active player's screen when nudged
//   sounds/awards-voice.mp3 — plays instead of Web Speech API during awards ceremony
//
const CUSTOM_SOUNDS = {
  turnPass:    null,  // e.g. 'sounds/pass-turn.mp3'
  nudge:       'sounds/notif11.mp3',  // e.g. 'sounds/nudge.mp3'
  awardsVoice: null,   // e.g. 'sounds/awards-voice.mp3'
};

// Preload Audio objects once paths are set
const _audioCache = {};
function getCustomAudio(key) {
  if (!CUSTOM_SOUNDS[key]) return null;
  if (!_audioCache[key]) {
    _audioCache[key] = new Audio(CUSTOM_SOUNDS[key]);
    _audioCache[key].load();
  }
  return _audioCache[key];
}

function playCustomOrFallback(key, fallbackFn) {
  const audio = getCustomAudio(key);
  if (audio) {
    audio.volume = 1.0;
    audio.currentTime = 0;
    audio.play().catch(() => fallbackFn());
  } else {
    fallbackFn();
  }
}

// ── iOS AUDIO UNLOCK ──────────────────────────
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}
document.addEventListener('touchstart', () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: false });

// ── SOUND ──────────────────────────────────
function playTurnSound() {
  playCustomOrFallback('turnPass', _playTurnSoundSynth);
}

function _playTurnSoundSynth() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [[220, 0, 0.12], [440, 0.13, 0.25], [660, 0.22, 0.4]].forEach(([freq, start, end]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.5, now + start + 0.04);
      gain.gain.linearRampToValueAtTime(0, now + end);
      osc.start(now + start);
      osc.stop(now + end + 0.05);
    });
  } catch(e) {}
}

function playNudgeSound() {
  playCustomOrFallback('nudge', _playNudgeSoundSynth);
}

function _playNudgeSoundSynth() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [[400, 0, 0.08], [300, 0.1, 0.18]].forEach(([freq, start, end]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.6, now + start);
      gain.gain.linearRampToValueAtTime(0, now + end);
      osc.start(now + start);
      osc.stop(now + end + 0.02);
    });
  } catch(e) {}
}


// ── WHEEL UI MODE ──────────────────────────────
let wheelUIMode = localStorage.getItem('sk_ui_mode') === 'wheel';

window.toggleUIMode = function() {
  wheelUIMode = !wheelUIMode;
  try { localStorage.setItem('sk_ui_mode', wheelUIMode ? 'wheel' : 'classic'); } catch(e) {}
  applyUIMode();
  if (wheelUIMode && window._currentActivePlayerId && localPlayers && localPlayers.length && myId) {
    try {
      var dir = passDirection || 'both';
      var isAct = document.getElementById('screen-active') && document.getElementById('screen-active').classList.contains('active');
      var isWait = document.getElementById('screen-waiting') && document.getElementById('screen-waiting').classList.contains('active');
      if (isAct) renderWheel('active', localPlayers, window._currentActivePlayerId, myId, dir, true);
      else if (isWait) renderWheel('wait', localPlayers, window._currentActivePlayerId, myId, dir, false);
    } catch(e) { console.error('[SK] wheel render:', e); }
  }
};

function applyUIMode() {
  try {
    const ab = document.getElementById('active-ui-btn');
    const wb = document.getElementById('active-ui-btn-wait');
    if (ab) ab.textContent = wheelUIMode ? 'Classic' : 'UI';
    if (wb) wb.textContent = wheelUIMode ? 'Classic' : 'UI';

    const isWheel = wheelUIMode;

    // Active screen classic buttons
    const btnL = document.getElementById('btn-left');
    const btnR = document.getElementById('btn-right');
    const divd = document.getElementById('active-divider');
    const actC = document.getElementById('active-center');
    const tapB = document.getElementById('pass-tap-btn');
    const showBoth = isWheel ? false : (!passDirection || passDirection === 'both');
    const showTap  = isWheel ? false : (!!passDirection && passDirection !== 'both');
    if (btnL) btnL.style.display = showBoth ? '' : 'none';
    if (btnR) btnR.style.display = showBoth ? '' : 'none';
    if (divd) divd.style.display = showBoth ? '' : 'none';
    if (actC) actC.style.display = showBoth ? '' : 'none';
    if (tapB) tapB.style.display = showTap ? '' : 'none';

    // Wheel overlays
    const wOvA = document.getElementById('wheel-overlay-active');
    const wOvW = document.getElementById('wheel-overlay-wait');
    if (wOvA) wOvA.classList.toggle('visible', isWheel);
    if (wOvW) wOvW.classList.toggle('visible', isWheel);

    // Hide waiting screen text behind wheel overlay
    const waitWrap = document.getElementById('wait-content-wrap');
    if (waitWrap) waitWrap.style.display = isWheel ? 'none' : '';
  } catch(e) { console.error('[SideKick] applyUIMode error:', e); }
}

// Build SVG arc path for a donut wedge (single closed subpath)
function wheelArcPath(cx, cy, rIn, rOut, startDeg, endDeg) {
  const s = startDeg * Math.PI / 180;
  const e = endDeg * Math.PI / 180;
  const steps = 40;
  let d = 'M ' + (cx + rOut * Math.cos(s)).toFixed(2) + ',' + (cy + rOut * Math.sin(s)).toFixed(2);
  for (let i = 1; i <= steps; i++) {
    const a = s + (e - s) * (i / steps);
    d += ' L ' + (cx + rOut * Math.cos(a)).toFixed(2) + ',' + (cy + rOut * Math.sin(a)).toFixed(2);
  }
  d += ' L ' + (cx + rIn * Math.cos(e)).toFixed(2) + ',' + (cy + rIn * Math.sin(e)).toFixed(2);
  for (let i = steps - 1; i >= 0; i--) {
    const a = s + (e - s) * (i / steps);
    d += ' L ' + (cx + rIn * Math.cos(a)).toFixed(2) + ',' + (cy + rIn * Math.sin(a)).toFixed(2);
  }
  d += ' Z';
  return d;
}

// Render the wheel for a given context ('active' or 'wait')
function renderWheel(ctx, players, activePlayerId, myIdParam, passDir, isMyTurn) {
  try {
  const svgId = ctx === 'active' ? 'wheel-svg-active' : 'wheel-svg-wait';
  const centerAvatarId = ctx === 'active' ? 'wheel-center-avatar-active' : 'wheel-center-avatar-wait';
  const centerCircleId = ctx === 'active' ? 'wheel-center-active' : 'wheel-center-wait';
  const dirAreaId = ctx === 'active' ? 'wheel-dir-active' : 'wheel-dir-wait';
  const svg = document.getElementById(svgId);
  const centerAvatar = document.getElementById(centerAvatarId);
  const centerCircle = document.getElementById(centerCircleId);
  const dirArea = document.getElementById(dirAreaId);
  if (!svg || !players || !players.length) return;

  const activePlayer = players.find(p => p.id === activePlayerId);
  if (!activePlayer) return;

  const N = players.length;
  const CX = 200, CY = 200;
  const OUTER_R = 190, INNER_R = 62;
  const GAP_DEG = 0;
  const SEG_DEG = 360 / N;

  // "You" player is always at the bottom (90 degrees = 6 o'clock in SVG coords)
  const myIdx = players.findIndex(p => p.id === myIdParam);
  const myAngleDeg = (myIdx >= 0 ? myIdx : 0) * SEG_DEG + SEG_DEG / 2;
  const rotationOffset = 90 - myAngleDeg;

  const glowId = 'glow-' + ctx;
  let svgContent = '<defs><filter id="' + glowId + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';

  let activeBorderPath = '';
  let activeBorderColor = '';

  players.forEach((p, i) => {
    const isActive = p.id === activePlayerId;
    const isSelf   = p.id === myIdParam;
    const startDeg = rotationOffset + i * SEG_DEG;
    const endDeg   = rotationOffset + (i + 1) * SEG_DEG;
    const nameColor = p.color || '#aaa';
    const displayName = isSelf ? 'You' : (p.name || 'Player');

    const path = wheelArcPath(CX, CY, INNER_R, OUTER_R, startDeg, endDeg);
    const strokeColor = 'rgba(255,255,255,0.18)';
    svgContent += '<path d="' + path + '" fill="#0a0a0f" stroke="' + strokeColor + '" stroke-width="1"/>';

    // Save active player's path for drawing border on top
    if (isActive) {
      activeBorderPath = path;
      activeBorderColor = (nameColor || '').toLowerCase() === '#000000' ? '#ffffff' : nameColor;
    }

    // Truncate long names (max 10 chars)
    let label = displayName;
    if (label.length > 10) label = label.substring(0, 9) + '\u2026';
    const midDeg = rotationOffset + (i + 0.5) * SEG_DEG;
    const midRad = midDeg * Math.PI / 180;
    const labelR = (INNER_R + OUTER_R) / 2;
    const lx = CX + labelR * Math.cos(midRad);
    const ly = CY + labelR * Math.sin(midRad);
    const displayColor = ((nameColor || '').toLowerCase() === '#000000' && isActive) ? '#ffffff' : (isActive ? nameColor : 'rgba(255,255,255,0.8)');
    const fontSize = N > 7 ? 15 : (N > 5 ? 16 : (N > 3 ? 17 : 18));
    const glowFilter = isActive ? ' filter="url(#' + glowId + ')"' : '';
    // Split name into words for multi-line
    const words = label.split(' ');
    if (words.length > 1) {
      const lineH = fontSize + 2;
      const startY = ly - ((words.length - 1) * lineH) / 2;
      svgContent += '<text x="' + lx.toFixed(2) + '" text-anchor="middle" fill="' + displayColor + '" font-family="Inter,sans-serif" font-size="' + fontSize + '" font-weight="700"' + glowFilter + '>';
      words.forEach(function(w, wi) {
        svgContent += '<tspan x="' + lx.toFixed(2) + '" y="' + (startY + wi * lineH).toFixed(2) + '">' + esc(w) + '</tspan>';
      });
      svgContent += '</text>';
    } else {
      svgContent += '<text x="' + lx.toFixed(2) + '" y="' + ly.toFixed(2) + '" text-anchor="middle" dominant-baseline="central" fill="' + displayColor + '" font-family="Inter,sans-serif" font-size="' + fontSize + '" font-weight="700"' + glowFilter + '>' + esc(label) + '</text>';
    }
  });

  // Draw active player's colored border on top of everything
  if (activeBorderPath) {
    svgContent += '<path d="' + activeBorderPath + '" fill="none" stroke="' + activeBorderColor + '" stroke-width="3"/>';
  }

  svg.innerHTML = svgContent;

  const activeColor = activePlayer.color || '#aaa';
  const centerBorderColor = (activeColor.toLowerCase() === '#000000') ? '#ffffff' : activeColor;
  if (centerCircle) centerCircle.style.borderColor = centerBorderColor;
  if (centerAvatar) {
    setAvatarEl(centerAvatar, activePlayer.avatar || '👤', 40);
  }

  if (dirArea) {
    if (ctx === 'active' && isMyTurn) {
      const nextCW  = players[(players.indexOf(activePlayer) + 1) % N];
      const nextCCW = players[(players.indexOf(activePlayer) - 1 + N) % N];
      if (passDir === 'both' || !passDir) {
        const leftName  = nextCW  ? (nextCW.id === myIdParam ? 'You' : (nextCW.name || '')) : '';
        const rightName = nextCCW ? (nextCCW.id === myIdParam ? 'You' : (nextCCW.name || '')) : '';
        dirArea.innerHTML = '<div class="wheel-both-area" id="wheel-tap-both-' + ctx + '">'
          + '<div class="wheel-both-half wheel-both-left"><div class="wheel-both-label">Pass Left</div><div class="wheel-both-arrow">&#8592;</div><div class="wheel-both-player">to ' + esc(leftName) + '</div></div>'
          + '<div class="wheel-both-half wheel-both-right"><div class="wheel-both-label">Pass Right</div><div class="wheel-both-arrow">&#8594;</div><div class="wheel-both-player">to ' + esc(rightName) + '</div></div>'
          + '</div>';
        const tapBoth = document.getElementById('wheel-tap-both-' + ctx);
        if (tapBoth) {
          const ovId = ctx === 'active' ? 'wheel-overlay-active' : 'wheel-overlay-wait';
          const ov = document.getElementById(ovId);
          if (ov) {
            const zL = document.createElement('div');
            zL.className = 'wheel-full-tap-left';
            zL.addEventListener('pointerup', function() { passTurn('left'); });
            ov.appendChild(zL);
            const zR = document.createElement('div');
            zR.className = 'wheel-full-tap-right';
            zR.addEventListener('pointerup', function() { passTurn('right'); });
            ov.appendChild(zR);
          }
        }
      } else {
        const arrow = passDir === 'cw' ? '&#8635;' : '&#8634;';
        const nextP = passDir === 'cw' ? nextCW : nextCCW;
        const nextName = nextP ? (nextP.id === myIdParam ? 'You' : (nextP.name || '')) : '';
        dirArea.innerHTML = '<div class="wheel-tap-label">It\'s Your Turn</div>'
          + '<div class="wheel-pass-arrow">' + arrow + '</div>'
          + '<div class="wheel-pass-to">Pass to ' + esc(nextName) + '</div>';
        var tapZone = document.createElement('div');
        tapZone.className = 'wheel-tap-zone';
        tapZone.addEventListener('pointerup', function() { passTurnSingle(); });
        dirArea.parentElement.appendChild(tapZone);
      }
    } else {
      dirArea.innerHTML = '';
    }
  }
  } catch(e) { console.error('[SideKick] renderWheel error:', e); }
}

// Clean up old tap zones from wheel overlays
function clearWheelTapZones(ctx) {
  const ovId = ctx === 'active' ? 'wheel-overlay-active' : 'wheel-overlay-wait';
  const ov = document.getElementById(ovId);
  if (!ov) return;
  ov.querySelectorAll('.wheel-tap-zone, .wheel-tap-zone-left, .wheel-tap-zone-right, .wheel-full-tap-left, .wheel-full-tap-right').forEach(el => el.remove());
  // Also clear direction area content
  const dirId = ctx === 'active' ? 'wheel-dir-active' : 'wheel-dir-wait';
  const dir = document.getElementById(dirId);
  if (dir) dir.innerHTML = '';
}


// ── HOST MANAGE PLAYERS PANEL ──────────────────
let manageUnsub = null;
window.openManagePanel = function() {
  if (!db || !roomCode) return;
  document.getElementById('manage-overlay').classList.add('show');
  // Subscribe to live updates
  if (manageUnsub) manageUnsub();
  const playersRef = ref(db, `rooms/${roomCode}/players`);
  manageUnsub = onValue(playersRef, snap => {
    if (!snap.exists()) return;
    renderManageList(buildOrderedPlayers(snap.val()), snap.val());
  });
};

window.closeManagePanel = function() {
  document.getElementById('manage-overlay').classList.remove('show');
  if (manageUnsub) { manageUnsub(); manageUnsub = null; }
  if (isHost) openHostCrownMenu();
};

function renderManageList(players, rawPlayers) {
  const el = document.getElementById('manage-player-list');
  el.innerHTML = '';
  players.forEach((p, i) => {
    const dotColor = p.color || 'var(--accent)';
    const dotText  = p.color && isLightColor(p.color) ? '#000' : '#fff';
    const avatarDotStyle = p.color ? `style="border-color:${p.color};"` : '';
    const div = document.createElement('div');
    div.className = 'player-item';
    div.setAttribute('draggable', 'false');
    div.dataset.dragId = p.id;
    div.innerHTML = `
      <div class="player-tile-top">
        <div class="player-num" style="background:${dotColor};color:${dotText};">${i+1}</div>
        <div class="player-avatar-wrap">
          <div class="player-avatar" ${avatarDotStyle}>${avatarHTML(p.avatar || '👤', 24)}</div>
          ${p.id === myId ? '<span class="player-badge host">Host</span>' : ''}
        </div>
      </div>
      <div class="player-name">${esc(p.name)}</div>`;
    if (p.id !== myId) {
      const kickBtn = document.createElement('button');
      kickBtn.className = 'lobby-kick-btn';
      kickBtn.textContent = '×';
      kickBtn.title = 'Remove ' + p.name;
      kickBtn.addEventListener('click', (e) => { e.stopPropagation(); kickPlayer(p.id, p.name); });
      div.appendChild(kickBtn);
    }
    el.appendChild(div);
  });
  makeDraggable(el, async (srcId, destId) => {
    const snap = await get(ref(db, `rooms/${roomCode}/players`));
    if (!snap.exists()) return;
    const ps = buildOrderedPlayers(snap.val());
    const srcIdx  = ps.findIndex(p => p.id === srcId);
    const destIdx = ps.findIndex(p => p.id === destId);
    if (srcIdx < 0 || destIdx < 0) return;
    const updates = {};
    updates[`rooms/${roomCode}/players/${ps[srcIdx].id}/order`] = destIdx;
    updates[`rooms/${roomCode}/players/${ps[destIdx].id}/order`] = srcIdx;
    await update(ref(db), updates);
  });
}

// Permanently removes a player from the room. Unlike the temporary
// skip-turn toggle above, this deletes their record entirely — they'd
// need to rejoin with the room code as a new player if they come back.
// If the kicked player was currently active, the turn is advanced first
// using the exact same passTurn() logic the app already uses for normal
// turns, so direction handling can't drift out of sync between the two.
// Only after that does this function recompute activePlayerIndex against
// the player list with the kicked player actually removed.
window.kickPlayer = async function(playerId, playerName) {
  if (!db || !roomCode) return;
  if (!await showConfirm(`Remove ${playerName} from the room? They can rejoin later with the room code, but as a new player.`)) return;

  let snap = await get(ref(db, `rooms/${roomCode}`));
  if (!snap.exists()) return;
  let room = snap.val();
  const allPlayersBefore = buildOrderedPlayers(room.players || {});
  if (allPlayersBefore.length <= 1) {
    showAlert("Can't remove the last player in the room.");
    return;
  }

  const activeIdxBefore = room.activePlayerIndex ?? 0;
  const activePlayerBefore = allPlayersBefore[activeIdxBefore] || allPlayersBefore[0];
  const kickingActivePlayer = activePlayerBefore.id === playerId;

  if (kickingActivePlayer) {
    // Reuse the exact same direction logic the app already uses for a
    // normal turn pass — same mapping passTurnSingle uses (cw -> 'left',
    // ccw -> 'right'); Both mode has no single forced direction, so
    // default to 'left' there, same as the app's own 'both' fallback.
    const dir = (room.features?.passDirection || passDirection || 'both') === 'ccw' ? 'right' : 'left';
    await passTurn(dir);
    // Re-read the room now that passTurn has moved the turn off the
    // player we're about to remove.
    snap = await get(ref(db, `rooms/${roomCode}`));
    if (!snap.exists()) return;
    room = snap.val();
  }

  const allPlayersNow = buildOrderedPlayers(room.players || {});
  const activeIdxNow = room.activePlayerIndex ?? 0;
  const stillActivePlayer = allPlayersNow[activeIdxNow];
  const newActivePlayerId = stillActivePlayer ? stillActivePlayer.id : null;

  const updates = {};
  updates[`rooms/${roomCode}/players/${playerId}`] = null; // delete this player's record
  // The just-kicked player may now be sitting in previousPlayerId (e.g. if
  // passTurn() above just moved off them) — clear it since that ID is
  // about to be deleted and undoTurn() should never resolve to a ghost.
  updates[`rooms/${roomCode}/previousPlayerId`] = null;
  updates[`rooms/${roomCode}/previousPlayerIndex`] = null;

  const allPlayersAfter = allPlayersNow.filter(p => p.id !== playerId);
  const newActiveIdx = newActivePlayerId ? allPlayersAfter.findIndex(p => p.id === newActivePlayerId) : 0;
  updates[`rooms/${roomCode}/activePlayerIndex`] = newActiveIdx === -1 ? 0 : newActiveIdx;

  await update(ref(db), updates);
};

// Kick a player from the lobby (no active turn to handle)
window.kickPlayerLobby = async function(playerId, playerName) {
  if (!db || !roomCode) return;
  if (!await showConfirm(`Remove ${playerName} from the room? They can rejoin later with the room code, but as a new player.`)) return;

  const snap = await get(ref(db, `rooms/${roomCode}`));
  if (!snap.exists()) return;
  const room = snap.val();
  const allPlayers = buildOrderedPlayers(room.players || {});
  if (allPlayers.length <= 1) {
    showAlert("Can't remove the last player in the room.");
    return;
  }

  const updates = {};
  updates[`rooms/${roomCode}/players/${playerId}`] = null;
  // Recompute order for remaining players
  const remaining = allPlayers.filter(p => p.id !== playerId);
  remaining.forEach((p, i) => { updates[`rooms/${roomCode}/players/${p.id}/order`] = i; });
  await update(ref(db), updates);
};

// ── CREATE ROOM ──────────────────────────────
window.createRoom = async function() {
  if (!requireDb()) return;
  const name = document.getElementById('host-name').value.trim();
  if (!name) { status('create-status','Enter your name.','error'); return; }

  // Validate turn mode — mandatory
  if (!turnMode || (turnMode === 'classic' && !passDirection)) {
    document.getElementById('tm-required-note').style.display = 'block';
    status('create-status','Choose a turn mode to continue.','error');
    return;
  }
  document.getElementById('tm-required-note').style.display = 'none';

  isHost = true;
  myId = uid();
  myName = name;
  roomCode = genCode();

  let roomRef = ref(db, `rooms/${roomCode}`);
  const existing = await get(roomRef);
  if (existing.exists()) {
    roomCode = genCode();
    roomRef = ref(db, `rooms/${roomCode}`);
  }

  await set(roomRef, {
    host: myId,
    status: 'lobby',
    activePlayerIndex: 0,
    lastActivity: Date.now(),
    features: {
      passDirection,
      nudge: featureNudgeEnabled,
      nudgeDelay: featureNudgeEnabled ? (parseInt(document.getElementById('nudge-delay').value) || 30) : 0,
      nudgeMode: featureNudgeEnabled ? (document.querySelector('input[name="nudge-mode"]:checked')?.value || 'multi') : 'multi',
      awards: featureAwardsEnabled,
      victoryPoints: featureVPEnabled,
      statusEffects: featureStatusEffectsEnabled,
      dndTurnComponents: featureDndEnabled,
      timers: featureTimersEnabled,
      timerTurnOn:          featureTimersEnabled && document.getElementById('timer-turn-on').checked,
      timerTurnVisible:     document.getElementById('timer-turn-visible').checked,
      timerRoundOn:         featureTimersEnabled && document.getElementById('timer-round-on').checked,
      timerRoundVisible:    document.getElementById('timer-round-visible').checked,
      timerGameOn:          featureTimersEnabled && document.getElementById('timer-game-on').checked,
      timerGameVisible:     document.getElementById('timer-game-visible').checked,
      timerCountdownOn:     featureTimersEnabled && document.getElementById('timer-countdown-on').checked,
      timerCountdownVisible:document.getElementById('timer-countdown-visible').checked,
      timerCountdownSecs:   (parseInt(document.getElementById('timer-countdown-min').value)||0)*60
                          + (parseInt(document.getElementById('timer-countdown-sec').value)||30),
      rounds:               featureRoundsEnabled,
      roundsTotal:          featureRoundsEnabled ? (parseInt(document.getElementById('rounds-total').value) || 3) : 0,
      turnMode:             turnMode,
      speedMode:            turnMode === 'speedRound' ? speedMode : '',
      speedRoundsTotal:     turnMode === 'speedRound' ? speedRoundsTotal : 0,
      undo:                 featureUndoEnabled
    },
    currentRound: featureRoundsEnabled ? 1 : 0,
    // Speed Round initial state
    buzzCurrentRound: turnMode === 'speedRound' ? 1 : 0,
    buzzPhase: turnMode === 'speedRound' ? 'waiting' : '',
    buzzScores: {},
    buzzTapOrder: {},
    players: {
      [myId]: { name, order: 0, joinedAt: Date.now(), color: myColor, avatar: roomAvatarSelection || '👤' }
    }
  });
  haptic(20);

  document.getElementById('display-code').textContent = roomCode;
  saveSession();
  showScreen('lobby');
  generateLobbyQR();
  listenLobby();
};

// ── JOIN ROOM ──────────────────────────────
window.joinRoom = async function() {
  if (!requireDb()) return;
  const code = document.getElementById('join-code').value.toUpperCase().trim();
  const name = document.getElementById('join-name').value.trim();
  if (!code || code.length !== 4) { status('join-status','Enter a 4-character room code.','error'); return; }
  if (!name) { status('join-status','Enter your name.','error'); return; }

  const roomRef = ref(db, `rooms/${code}`);
  const snap = await get(roomRef);
  if (!snap.exists()) { status('join-status','Room not found.','error'); return; }
  const room = snap.val();
  // Idle-room cleanup: rooms with no recorded activity in 24h are treated as abandoned
  if (room.lastActivity && Date.now() - room.lastActivity > 24 * 60 * 60 * 1000) {
    await remove(roomRef);
    status('join-status','That room expired (rooms idle 24+ hours are cleared).','error');
    return;
  }
  if (room.status !== 'lobby' && room.status !== 'playing') { status('join-status','Room is not available.','error'); return; }

  // Check for an existing player with this exact name (case-insensitive) —
  // most likely a returning guest, not someone brand new.
  const players = room.players || {};
  const match = Object.entries(players).find(([id, p]) => (p.name || '').trim().toLowerCase() === name.toLowerCase());

  if (match) {
    pendingRejoinCode = code;
    pendingRejoinName = name;
    pendingRejoinPlayerId = match[0];
    document.getElementById('rejoin-confirm-text').textContent = `Someone named "${match[1].name}" is already in this room.`;
    document.getElementById('rejoin-confirm-overlay').classList.add('show');
    return;
  }

  await joinAsNewPlayer(code, room, name);
};

// Joins fresh — used for genuinely new players, and for "No, I'm a
// different person" when a name happens to match an existing player.
async function joinAsNewPlayer(code, room, name) {
  isHost = false;
  myId = uid();
  myName = name;
  roomCode = code;

  const players = room.players || {};
  const order = Object.keys(players).length;
  await update(ref(db, `rooms/${code}/players/${myId}`), { name, order, joinedAt: Date.now(), knockedOut: false, color: myColor, avatar: roomAvatarSelection || '👤' });
  await update(ref(db, `rooms/${code}`), { lastActivity: Date.now() });
  haptic(15);
  saveSession();

    if (room.status === 'playing') {
      cleanupListeners();
      listenGameState();
      return;
    }

    // Non-host players: show reconfiguring screen while host sets up new game
    if (room.status === 'reconfiguring' && !isHost) {
      showScreen('reconfiguring');
      return;
    }

  document.getElementById('wl-code').textContent = code;
  showScreen('waiting-lobby');
  listenWaitingLobby();
}

let pendingRejoinCode = null;
let pendingRejoinName = null;
let pendingRejoinPlayerId = null;

window.confirmRejoinAsExisting = async function() {
  document.getElementById('rejoin-confirm-overlay').classList.remove('show');
  isHost = false;
  myId = pendingRejoinPlayerId;
  myName = pendingRejoinName;
  roomCode = pendingRejoinCode;
  await update(ref(db, `rooms/${roomCode}`), { lastActivity: Date.now() });
  saveSession();

  const snap = await get(ref(db, `rooms/${roomCode}`));
  const room = snap.exists() ? snap.val() : {};
  if (room.status === 'playing') {
    document.getElementById('wl-code').textContent = roomCode;
    listenGameState();
  } else {
    document.getElementById('wl-code').textContent = roomCode;
    showScreen('waiting-lobby');
    listenWaitingLobby();
  }
};

window.confirmRejoinAsNew = async function() {
  document.getElementById('rejoin-confirm-overlay').classList.remove('show');
  const snap = await get(ref(db, `rooms/${pendingRejoinCode}`));
  if (!snap.exists()) { status('join-status', 'Room not found.', 'error'); return; }
  await joinAsNewPlayer(pendingRejoinCode, snap.val(), pendingRejoinName);
};

window.cancelRejoinConfirm = function() {
  document.getElementById('rejoin-confirm-overlay').classList.remove('show');
};

// ── LOBBY LISTENER (host) ──────────────────────────
function listenLobby() {
  cleanupListeners();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const unsub = onValue(roomRef, snap => {
    if (!snap.exists()) { showScreen('home'); return; }
    const room = snap.val();

    if (room.status === 'playing') {
      cleanupListeners();
      listenGameState();
      return;
    }

    const players = room.players || {};
    localPlayers = buildOrderedPlayers(players);

    // One-time sync: push avatar to Firebase if missing
    if (players[myId] && !players[myId].avatar) {
      const myAvatar = roomAvatarSelection || getSavedAvatar() || '👤';
      set(ref(db, `rooms/${roomCode}/players/${myId}/avatar`), myAvatar).catch(() => {});
    }

    // Track duel winner for crown display in lobby
    if (room.duel && room.duel.winnerId) {
      duelWinnerId = room.duel.winnerId;
    } else if (room.duel && room.duel.status === 'countdown') {
      duelWinnerId = null;
    }
    // If duel was removed (Continue clicked), keep duelWinnerId for crown

    renderLobbyList(localPlayers);
    updateStartButton();
  });
  unsubscribers.push(() => unsub());
}

// ── WAITING LOBBY LISTENER (non-host) ──────────────
function listenWaitingLobby() {
  cleanupListeners();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const unsub = onValue(roomRef, snap => {
    if (!snap.exists()) { showScreen('home'); return; }
    const room = snap.val();

    if (room.status === 'playing') {
      cleanupListeners();
      listenGameState();
      return;
    }

    const players = room.players || {};
    localPlayers = buildOrderedPlayers(players);

    // One-time sync: push avatar to Firebase if missing
    if (players[myId] && !players[myId].avatar) {
      const myAvatar = roomAvatarSelection || getSavedAvatar() || '👤';
      set(ref(db, `rooms/${roomCode}/players/${myId}/avatar`), myAvatar).catch(() => {});
    }

    renderWaitingLobbyList(localPlayers);

    // Listen for duel in lobby
    if (room.duel && room.duel.status && room.duel.status !== 'finished') {
      if (room.duel.status === 'countdown') duelWinnerId = null;
      handleDuelState(room.duel);
    } else if (room.duel && room.duel.winnerId) {
      duelWinnerId = room.duel.winnerId;
    } else if (!room.duel || !room.duel.status) {
      const scoreOverlay = document.getElementById('duel-score-overlay');
      if (scoreOverlay && scoreOverlay.classList.contains('show')) {
        scoreOverlay.classList.remove('show');
        if (duelListenUnsub) { duelListenUnsub(); duelListenUnsub = null; }
        if (duelResultsUnsub) { duelResultsUnsub(); duelResultsUnsub = null; }
        duelStateVersion = 0;
      }
    }
    // Keep duelWinnerId for crown even after duel removed

    renderWaitingLobbyList(localPlayers);
  });
  unsubscribers.push(() => unsub());
}

// ── FIRST PLAYER OPTION SELECTION ──────────────
let firstPlayerOption = null; // 'spot1' | 'random' | 'duel'
window.selectFirstPlayerOption = function(opt) {
  firstPlayerOption = opt;
  ['spot1', 'random', 'duel'].forEach(o => {
    const b = document.getElementById('first-opt-' + o);
    if (b) b.classList.toggle('selected', o === opt);
  });
  if (opt === 'duel') openDuelSetup();
  updateStartButton();
  renderLobbyList(localPlayers);
};

function updateStartButton() {
  const btn = document.getElementById('start-btn');
  if (!btn) return;
  const count = localPlayers.length;
  let allowed = count >= 2;
  if (allowed) {
    if (firstPlayerOption === 'spot1' || firstPlayerOption === 'random') {
      allowed = true;
    } else if (firstPlayerOption === 'duel') {
      allowed = !!duelWinnerId;
    } else {
      allowed = false;
    }
  }
  btn.disabled = !allowed;
}

function resetFirstPlayerOption() {
  firstPlayerOption = null;
  duelWinnerId = null;
  ['spot1', 'random', 'duel'].forEach(o => {
    const b = document.getElementById('first-opt-' + o);
    if (b) b.classList.remove('selected');
  });
  updateStartButton();
  const btn = document.getElementById('start-btn');
  if (btn) btn.disabled = true;
}

// ── START GAME ──────────────────────────────
window.startGame = async function() {
  if (!db || !roomCode) return;
  const roomRef = ref(db, `rooms/${roomCode}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return;
  const roomData = snap.val();
  const players = roomData.players || {};
  localPlayers = buildOrderedPlayers(players);

  const firstIdx = firstPlayerOption === 'random'
    ? Math.floor(Math.random() * localPlayers.length)
    : 0;

  // If Duel was chosen and there's a duel winner, use their index instead
  let actualFirstIdx = firstIdx;
  if (firstPlayerOption === 'duel' && duelWinnerId) {
    const winnerIdx = localPlayers.findIndex(p => p.id === duelWinnerId);
    if (winnerIdx >= 0) actualFirstIdx = winnerIdx;
  }

  const roomFeatures = roomData.features || {};
  const isBuzz = (roomFeatures.turnMode || 'classic') === 'speedRound';

  // Save final order
  const updates = {};
  localPlayers.forEach((p, i) => { updates[`rooms/${roomCode}/players/${p.id}/order`] = i; });
  updates[`rooms/${roomCode}/status`] = 'playing';
  updates[`rooms/${roomCode}/activePlayerIndex`] = actualFirstIdx;
  updates[`rooms/${roomCode}/previousPlayerId`] = null;
  updates[`rooms/${roomCode}/previousPlayerIndex`] = null;

  // Initialize Speed Round buzz node
  if (isBuzz) {
    updates[`rooms/${roomCode}/buzz`] = {
      phase: 'waiting',
      currentRound: 1,
      totalRounds: roomFeatures.speedRoundsTotal || 10,
      scores: {},
      tapOrder: {},
      winner: null,
      dtlIndex: 0,
      roundStartTime: serverNow()
    };
  }

  await update(ref(db), updates);
  haptic(20);
};

// ── DUEL FOR 1ST PLAYER ──────────────────────────
let duelWinnerId = null;
let duelTapCount = 0;
let duelTapActive = false;
let duelCountdownInterval = null;
let duelEndTimer = null;
let duelListenUnsub = null;
let duelStateVersion = 0; // track which state we've already reacted to

// ── DUEL TIMER DIAL (reuses nd-dial pattern) ──
let duelDialVal = 10;
let duelDialDragging = false;
let duelDialLastAngle = 0;
let duelDialAccum = 0;

function initDuelDial() {
  const outer = document.getElementById('duel-dial-outer');
  const knob = document.getElementById('duel-dial-knob');
  const display = document.getElementById('duel-timer-display');
  const hidden = document.getElementById('duel-duration-input');
  if (!outer || !knob) return;

  duelDialVal = Math.max(5, Math.min(60, parseInt(hidden.value) || 10));

  function updateDisplay() {
    display.textContent = duelDialVal + 's';
    display.style.color = 'var(--accent-light)';
    const angle = (duelDialVal - 5) * 6;
    knob.style.transform = 'translateX(-50%) rotate(' + angle + 'deg)';
    knob.style.transformOrigin = '50% 100%';
  }

  function getAngle(e) {
    const rect = outer.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  }

  function onStart(e) { e.preventDefault(); e.stopPropagation(); duelDialDragging = true; duelDialLastAngle = getAngle(e); duelDialAccum = 0; }
  function onMove(e) {
    if (!duelDialDragging) return;
    e.preventDefault();
    const angle = getAngle(e);
    let delta = angle - duelDialLastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    duelDialLastAngle = angle;
    duelDialAccum += delta;
    const step = 15;
    if (duelDialAccum >= step) {
      const ticks = Math.floor(duelDialAccum / step);
      duelDialVal = Math.min(60, duelDialVal + ticks);
      duelDialAccum -= ticks * step;
      hidden.value = duelDialVal;
      updateDisplay();
    } else if (duelDialAccum <= -step) {
      const ticks = Math.floor(duelDialAccum / -step);
      duelDialVal = Math.max(5, duelDialVal - ticks);
      duelDialAccum += ticks * step;
      hidden.value = duelDialVal;
      updateDisplay();
    }
  }
  function onEnd() { duelDialDragging = false; duelDialAccum = 0; }

  outer.addEventListener('mousedown', onStart);
  outer.addEventListener('touchstart', onStart, { passive: false });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchend', onEnd);

  updateDisplay();
}

window.openDuelSetup = function() {
  if (!isHost) return;
  if (localPlayers.length < 2) { showErrorToast('There needs to be 2 or more players in order to duel.'); return; }
  document.getElementById('duel-mode-overlay').classList.add('show');
};

window.closeDuelModeSelect = function() {
  document.getElementById('duel-mode-overlay').classList.remove('show');
};

let duelMode = 'fastest';
let duelTargetTime = 10;
let duelTapStartTime = 0;
let duelTapTime = 0;
let duelHostStartedActive = false;

window.selectDuelMode = function(mode) {
  duelMode = mode;
  document.getElementById('duel-mode-overlay').classList.remove('show');
  if (mode === 'fastest') {
    document.getElementById('duel-setup-title').textContent = '⚔️ Fastest Tapper';
    document.getElementById('duel-setup-subtitle').textContent = 'Set the tap duration';
    document.getElementById('duel-dial-label').textContent = 'Seconds';
  } else {
    document.getElementById('duel-setup-title').textContent = '⏱️ Time Tap';
    document.getElementById('duel-setup-subtitle').textContent = 'Set the target time';
    document.getElementById('duel-dial-label').textContent = 'Seconds';
  }
  duelDialVal = 10;
  document.getElementById('duel-duration-input').value = 10;
  document.getElementById('duel-timer-display').textContent = '10s';
  initDuelDial();
  document.getElementById('duel-setup-overlay').classList.add('show');
};

window.closeDuelSetup = function() {
  document.getElementById('duel-setup-overlay').classList.remove('show');
};

window.startDuelFromSetup = async function() {
  if (!db || !roomCode) return;
  if (localPlayers.length < 2) { closeDuelSetup(); showErrorToast('There needs to be 2 or more players in order to duel.'); return; }
  const duration = Math.max(5, Math.min(60, parseInt(document.getElementById('duel-duration-input').value) || 10));
  closeDuelSetup();
  duelWinnerId = null;
  duelStateVersion = 0;
  duelHostStartedActive = false;

  const now = Date.now();
  const duelData = {
    status: 'countdown',
    mode: duelMode,
    duration: duration,
    startTime: now + 4500,
    countdownEnd: now + 3000,
    createdAt: now
  };
  if (duelMode === 'timetap') {
    duelData.targetTime = duration;
  }

  await update(ref(db), {
    [`rooms/${roomCode}/duel`]: duelData,
    [`rooms/${roomCode}/lastActivity`]: now
  });

  listenDuel();
};

function listenDuel() {
  if (!db || !roomCode) return;
  if (duelListenUnsub) duelListenUnsub();
  const duelRef = ref(db, `rooms/${roomCode}/duel`);
  duelListenUnsub = onValue(duelRef, snap => {
    if (!snap.exists()) return;
    const d = snap.val();
    handleDuelState(d);
  });
}

function handleDuelState(d) {
  const overlay = document.getElementById('duel-live-overlay');
  const mainEl = document.getElementById('duel-live-main');
  const subEl = document.getElementById('duel-live-sub');
  const titleEl = document.getElementById('duel-live-title');
  const tapBtn = document.getElementById('duel-tap-btn');

  // Create a simple version key so we don't re-trigger the same phase
  const stateKey = d.status + '_' + (d.createdAt || 0);

  if (d.status === 'countdown') {
    if (duelStateVersion === stateKey) return;
    duelStateVersion = stateKey;
    // Close setup overlay if it was open
    document.getElementById('duel-setup-overlay').classList.remove('show');
    overlay.classList.add('show');
    tapBtn.style.display = 'block';
    tapBtn.disabled = true;
    tapBtn.style.opacity = '0.4';
    duelTapActive = false;
    titleEl.textContent = '⚔️ DUEL!';
    titleEl.style.fontSize = '1.2rem';
    mainEl.style.fontSize = '6rem';
    mainEl.style.color = '#fff';
    subEl.textContent = 'Get Ready!';

    // Clear any prior timers
    if (duelCountdownInterval) clearInterval(duelCountdownInterval);

    // Count down to the shared absolute startTime so every device hits GO at the same instant
    const goTime = d.startTime || (Date.now() + 4500);
    let lastShownSecs = -1;
    const renderCountdown = () => {
      const remain = goTime - Date.now();
      if (remain > 0) {
        const secsLeft = Math.max(1, Math.min(3, Math.ceil(remain / 1000)));
        if (secsLeft !== lastShownSecs) {
          lastShownSecs = secsLeft;
          mainEl.textContent = secsLeft;
          haptic(10);
        }
      } else {
        clearInterval(duelCountdownInterval);
        duelCountdownInterval = null;
        // Show DUEL!! flash
        mainEl.textContent = 'DUEL!!';
        mainEl.style.color = '#fbbf24';
        mainEl.style.fontSize = '3.5rem';
        titleEl.style.fontSize = '0';
        subEl.textContent = '';
        haptic(50);
        // Host transitions to active phase immediately at GO (startTime preserved, so all devices measure from the same instant)
        if (isHost && !duelHostStartedActive) {
          duelHostStartedActive = true;
          setTimeout(async () => {
            if (!db || !roomCode) return;
            await update(ref(db), {
              [`rooms/${roomCode}/duel/status`]: 'active'
            });
          }, 100);
        }
      }
    };
    renderCountdown();
    duelCountdownInterval = setInterval(renderCountdown, 100);

  } else if (d.status === 'active') {
    if (duelStateVersion === stateKey) return;
    duelStateVersion = stateKey;
    if (duelCountdownInterval) { clearInterval(duelCountdownInterval); duelCountdownInterval = null; }
    const activeMode = d.mode || 'fastest';
    duelMode = activeMode;
    duelTapCount = 0;
    duelTapActive = true;
    tapBtn.style.display = 'block';
    tapBtn.disabled = false;
    tapBtn.style.opacity = '1';
    haptic(20);

    if (activeMode === 'timetap') {
      duelTargetTime = d.targetTime || d.duration || 10;
      duelTapStartTime = d.startTime;
      duelTapTime = 0;
      mainEl.textContent = '';
      mainEl.style.color = '#4ade80';
      mainEl.style.fontSize = '4rem';
      titleEl.textContent = '⏱️ TAP WHEN TIME IS UP!';
      titleEl.style.fontSize = '1rem';
      subEl.textContent = '';
      tapBtn.querySelector('.front').textContent = 'TAP';

      // Auto-end after targetTime + 5s, DQ anyone who didn't tap
      const autoEnd = d.startTime + (duelTargetTime + 5) * 1000;
      if (duelEndTimer) { clearInterval(duelEndTimer); duelEndTimer = null; }
      duelEndTimer = setInterval(() => {
        if (Date.now() >= autoEnd) {
          clearInterval(duelEndTimer);
          duelEndTimer = null;
          clearInterval(duelCountdownInterval);
          duelCountdownInterval = null;
          duelTapActive = false;
          tapBtn.style.display = 'none';
          if (duelTapTime === 0) duelTapTime = (autoEnd - d.startTime);
          mainEl.textContent = 'TIME!';
          mainEl.style.color = '#e74c3c';
          mainEl.style.fontSize = '3rem';
          titleEl.textContent = '';
          subEl.textContent = 'Submitting score...';
          haptic(50);
          submitTimeTapScore(duelTapTime);
        }
      }, 50);
    } else {
      // Fastest Tapper mode
      tapBtn.querySelector('.front').textContent = 'TAP';
      mainEl.textContent = '0';
      mainEl.style.color = '#4ade80';
      mainEl.style.fontSize = '5rem';
      titleEl.textContent = '⚔️ TAP AS FAST AS YOU CAN!';
      titleEl.style.fontSize = '1rem';
      subEl.textContent = '';

      const endTime = d.startTime + d.duration * 1000;
      if (duelEndTimer) { clearInterval(duelEndTimer); duelEndTimer = null; }
      duelEndTimer = setInterval(() => {
        if (Date.now() >= endTime) {
          clearInterval(duelEndTimer);
          duelEndTimer = null;
          duelTapActive = false;
          tapBtn.style.display = 'none';
          mainEl.textContent = 'TIME!';
          mainEl.style.color = '#e74c3c';
          mainEl.style.fontSize = '3rem';
          titleEl.textContent = '';
          subEl.textContent = 'Submitting score...';
          haptic(50);
          submitDuelScore(duelTapCount);
        }
      }, 50);
    }

  } else if (d.status === 'finished') {
    if (duelStateVersion === stateKey) return;
    duelStateVersion = stateKey;
    if (duelCountdownInterval) { clearInterval(duelCountdownInterval); duelCountdownInterval = null; }
    if (duelEndTimer) { clearInterval(duelEndTimer); duelEndTimer = null; }
    duelTapActive = false;
    tapBtn.style.display = 'none';
    overlay.classList.remove('show');
    const results = d.results || {};
    const names = d.resultNames || {};
    const finishedMode = d.mode || 'fastest';
    if (finishedMode === 'timetap') {
      duelTargetTime = d.targetTime || d.duration || 10;
      const sorted = Object.entries(results)
        .map(([id, ms]) => ({ id, name: names[id] || 'Player', tapMs: ms }))
        .sort((a, b) => Math.abs(a.tapMs - duelTargetTime * 1000) - Math.abs(b.tapMs - duelTargetTime * 1000));
      if (sorted.length > 0) {
        const dqThresh = (duelTargetTime + 4.5) * 1000;
        const realPlayers = sorted.filter(p => p.tapMs < dqThresh);
        duelWinnerId = (realPlayers.length > 0 && d.winnerId) ? d.winnerId : null;
        renderTimeTapScoreboard(sorted);
        document.getElementById('duel-continue-btn').style.display = isHost ? '' : 'none';
        document.getElementById('duel-waiting-text').style.display = isHost ? 'none' : '';
        document.getElementById('duel-score-overlay').classList.add('show');
      }
    } else {
      const sorted = Object.entries(results)
        .map(([id, taps]) => ({ id, name: names[id] || 'Player', taps }))
        .sort((a, b) => b.taps - a.taps);
      if (sorted.length > 0) {
        duelWinnerId = d.winnerId || null;
        renderDuelScoreboard(sorted);
        document.getElementById('duel-continue-btn').style.display = isHost ? '' : 'none';
        document.getElementById('duel-waiting-text').style.display = isHost ? 'none' : '';
        document.getElementById('duel-score-overlay').classList.add('show');
      }
    }
  }
}

window.onDuelTap = function(e) {
  if (!duelTapActive) return;
  e.preventDefault();
  e.stopPropagation();

  if (duelMode === 'timetap') {
    // Time Tap: record the exact timestamp of the single tap
    duelTapTime = Date.now() - duelTapStartTime;
    duelTapActive = false;
    const mainEl = document.getElementById('duel-live-main');
    if (mainEl) {
      mainEl.textContent = (duelTapTime / 1000).toFixed(2) + 's';
      mainEl.style.color = '#fbbf24';
    }
    const titleEl = document.getElementById('duel-live-title');
    if (titleEl) titleEl.textContent = '⏱️ TIME RECORDED!';
    const tapBtn = document.getElementById('duel-tap-btn');
    if (tapBtn) { tapBtn.disabled = true; tapBtn.style.opacity = '0.4'; }
    haptic(20);
    // Clear end timer and submit immediately
    if (duelEndTimer) { clearInterval(duelEndTimer); duelEndTimer = null; }
    if (duelCountdownInterval) { clearInterval(duelCountdownInterval); duelCountdownInterval = null; }
    setTimeout(() => {
      const subEl = document.getElementById('duel-live-sub');
      if (subEl) subEl.textContent = 'Submitting score...';
      submitTimeTapScore(duelTapTime);
    }, 500);
  } else {
    // Fastest Tapper: count taps
    duelTapCount++;
    duelTapActive = false;
    requestAnimationFrame(() => { if (duelTapCount >= 0) duelTapActive = true; });
    const mainEl = document.getElementById('duel-live-main');
    if (mainEl) mainEl.textContent = duelTapCount;
    haptic(5);
  }
};

let duelResultsUnsub = null; // live listener on duel/results for scoreboard

function submitDuelScore(count) {
  // Show scoreboard immediately with own score — no waiting
  const liveOverlay = document.getElementById('duel-live-overlay');
  liveOverlay.classList.remove('show');

  // Show own score right away
  renderDuelScoreboard([{ id: myId, name: myName, taps: count }]);
  document.getElementById('duel-continue-btn').style.display = isHost ? '' : 'none';
  document.getElementById('duel-waiting-text').style.display = isHost ? 'none' : '';
  document.getElementById('duel-score-overlay').classList.add('show');

  // Fire-and-forget: write score to Firebase
  if (db && roomCode && myId) {
    update(ref(db), {
      [`rooms/${roomCode}/duel/results/${myId}`]: count,
      [`rooms/${roomCode}/duel/resultNames/${myId}`]: myName
    }).catch(() => {});

    // Immediately fetch all current results so non-host doesn't wait for listener
    const resultsRef2 = ref(db, `rooms/${roomCode}/duel/results`);
    const namesRef2 = ref(db, `rooms/${roomCode}/duel/resultNames`);
    Promise.all([get(resultsRef2), get(namesRef2)]).then(([rSnap, nSnap]) => {
      const rData = rSnap.exists() ? rSnap.val() : {};
      const nData = nSnap.exists() ? nSnap.val() : {};
      rData[myId] = count;
      nData[myId] = myName;
      const sorted = Object.entries(rData)
        .map(([id, taps]) => ({ id, name: nData[id] || 'Player', taps }))
        .sort((a, b) => b.taps - a.taps);
      if (sorted.length > 0) renderDuelScoreboard(sorted);
    }).catch(() => {});

    // Set up live listener on results to update scoreboard as others submit
    if (duelResultsUnsub) duelResultsUnsub();
    const resultsRef = ref(db, `rooms/${roomCode}/duel/results`);
    const namesRef = ref(db, `rooms/${roomCode}/duel/resultNames`);
    let resultsData = {};
    let namesData = {};

    function updateScoreboard() {
      const sorted = Object.entries(resultsData)
        .map(([id, taps]) => ({ id, name: namesData[id] || 'Player', taps }))
        .sort((a, b) => b.taps - a.taps);
      if (sorted.length > 0) renderDuelScoreboard(sorted);

      // If host and all submitted, write finished + set winner
      if (isHost) {
        const activeCount = localPlayers.length;
        if (Object.keys(resultsData).length >= activeCount) {
          const winner = sorted[0];
          duelWinnerId = winner.id;
          update(ref(db), {
            [`rooms/${roomCode}/duel/status`]: 'finished',
            [`rooms/${roomCode}/duel/winnerId`]: winner.id,
            [`rooms/${roomCode}/duel/winnerName`]: winner.name
          }).catch(() => {});
        }
      }
    }

    const unsubR = onValue(resultsRef, snap => {
      resultsData = snap.exists() ? snap.val() : {};
      // Ensure own score is always included
      resultsData[myId] = count;
      updateScoreboard();
    });
    const unsubN = onValue(namesRef, snap => {
      namesData = snap.exists() ? snap.val() : {};
      namesData[myId] = myName;
      updateScoreboard();
    });
    duelResultsUnsub = () => { unsubR(); unsubN(); };
  }
}

function renderDuelScoreboard(sorted) {
  if (sorted.length === 0) return;
  const winner = sorted[0];
  document.getElementById('duel-score-winner').textContent =
    '🏆 ' + winner.name + ' wins with ' + winner.taps + ' taps!';
  const listEl = document.getElementById('duel-score-list');
  listEl.innerHTML = '';
  sorted.forEach((p, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const row = document.createElement('div');
    row.className = 'duel-scoreboard-row' + (i === 0 ? ' winner' : '');
    row.innerHTML = '<span class="duel-rank ' + rankClass + '">' + (i + 1) + '</span>'
      + '<span class="duel-score-name">' + esc(p.name) + '</span>'
      + '<span class="duel-score-taps">' + p.taps + '</span>';
    listEl.appendChild(row);
  });
  // 3-second delay before Continue button is clickable
  const continueBtn = document.getElementById('duel-continue-btn');
  continueBtn.style.display = isHost ? '' : 'none';
  continueBtn.disabled = true;
  continueBtn.style.opacity = '0.4';
  setTimeout(() => { continueBtn.disabled = false; continueBtn.style.opacity = '1'; }, 3000);
}

// showDuelScoreboard removed — replaced by renderDuelScoreboard in submitDuelScore

function submitTimeTapScore(tapTimeMs) {
  const liveOverlay = document.getElementById('duel-live-overlay');
  liveOverlay.classList.remove('show');

  renderTimeTapScoreboard([{ id: myId, name: myName, tapMs: tapTimeMs }]);
  document.getElementById('duel-continue-btn').style.display = isHost ? '' : 'none';
  document.getElementById('duel-waiting-text').style.display = isHost ? 'none' : '';
  document.getElementById('duel-score-overlay').classList.add('show');

  if (db && roomCode && myId) {
    update(ref(db), {
      [`rooms/${roomCode}/duel/results/${myId}`]: tapTimeMs,
      [`rooms/${roomCode}/duel/resultNames/${myId}`]: myName
    }).catch(() => {});

    const resultsRef2 = ref(db, `rooms/${roomCode}/duel/results`);
    const namesRef2 = ref(db, `rooms/${roomCode}/duel/resultNames`);
    Promise.all([get(resultsRef2), get(namesRef2)]).then(([rSnap, nSnap]) => {
      const rData = rSnap.exists() ? rSnap.val() : {};
      const nData = nSnap.exists() ? nSnap.val() : {};
      rData[myId] = tapTimeMs;
      nData[myId] = myName;
      const sorted = Object.entries(rData)
        .map(([id, ms]) => ({ id, name: nData[id] || 'Player', tapMs: ms }))
        .sort((a, b) => Math.abs(a.tapMs - duelTargetTime * 1000) - Math.abs(b.tapMs - duelTargetTime * 1000));
      if (sorted.length > 0) renderTimeTapScoreboard(sorted);
    }).catch(() => {});

    if (duelResultsUnsub) duelResultsUnsub();
    const resultsRef = ref(db, `rooms/${roomCode}/duel/results`);
    const namesRef = ref(db, `rooms/${roomCode}/duel/resultNames`);
    let resultsData = {};
    let namesData = {};

    function updateScoreboard() {
      const sorted = Object.entries(resultsData)
        .map(([id, ms]) => ({ id, name: namesData[id] || 'Player', tapMs: ms }))
        .sort((a, b) => Math.abs(a.tapMs - duelTargetTime * 1000) - Math.abs(b.tapMs - duelTargetTime * 1000));
      if (sorted.length > 0) renderTimeTapScoreboard(sorted);

      if (isHost) {
        const activeCount = localPlayers.length;
        if (Object.keys(resultsData).length >= activeCount) {
          const winner = sorted[0];
          duelWinnerId = winner.id;
          update(ref(db), {
            [`rooms/${roomCode}/duel/status`]: 'finished',
            [`rooms/${roomCode}/duel/winnerId`]: winner.id,
            [`rooms/${roomCode}/duel/winnerName`]: winner.name
          }).catch(() => {});
        }
      }
    }

    const unsubR = onValue(resultsRef, snap => {
      resultsData = snap.exists() ? snap.val() : {};
      resultsData[myId] = tapTimeMs;
      updateScoreboard();
    });
    const unsubN = onValue(namesRef, snap => {
      namesData = snap.exists() ? snap.val() : {};
      namesData[myId] = myName;
      updateScoreboard();
    });
    duelResultsUnsub = () => { unsubR(); unsubN(); };
  }
}

function renderTimeTapScoreboard(sorted) {
  if (sorted.length === 0) return;
  const targetMs = duelTargetTime * 1000;
  const dqThreshold = (duelTargetTime + 4.5) * 1000;
  const dqPlayers = sorted.filter(p => p.tapMs >= dqThreshold);
  const realPlayers = sorted.filter(p => p.tapMs < dqThreshold);
  const winner = realPlayers.length > 0 ? realPlayers[0] : sorted[0];
  const winnerDQ = dqPlayers.length === sorted.length;
  document.getElementById('duel-score-winner').textContent = winnerDQ
    ? '🏆 No one tapped in time!'
    : '🏆 ' + winner.name + ' wins! (' + (Math.abs(winner.tapMs - targetMs) / 1000).toFixed(2) + 's off)';
  const listEl = document.getElementById('duel-score-list');
  listEl.innerHTML = '';
  const targetLabel = document.createElement('div');
  targetLabel.style.cssText = 'text-align:center;font-size:0.75rem;color:var(--muted);margin-bottom:0.3rem;';
  targetLabel.textContent = 'Target: ' + duelTargetTime + 's';
  listEl.appendChild(targetLabel);
  const displayList = realPlayers.concat(dqPlayers);
  displayList.forEach((p, i) => {
    const isDQ = p.tapMs >= dqThreshold;
    const diff = p.tapMs - targetMs;
    const absDiff = Math.abs(diff);
    const sign = diff >= 0 ? '+' : '-';
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const row = document.createElement('div');
    row.className = 'duel-scoreboard-row' + (i === 0 && !isDQ ? ' winner' : '');
    if (isDQ) {
      row.style.opacity = '0.5';
      row.innerHTML = '<span class="duel-rank">' + (i + 1) + '</span>'
        + '<span class="duel-score-name">' + esc(p.name) + '</span>'
        + '<span style="font-size:0.75rem;color:#e74c3c;min-width:60px;text-align:right;">DQ</span>'
        + '<span style="font-size:0.75rem;color:var(--muted);">No tap</span>';
    } else {
      row.innerHTML = '<span class="duel-rank ' + rankClass + '">' + (i + 1) + '</span>'
        + '<span class="duel-score-name">' + esc(p.name) + '</span>'
        + '<span style="font-size:0.8rem;color:var(--muted);min-width:60px;text-align:right;">' + sign + (absDiff / 1000).toFixed(2) + 's</span>'
        + '<span class="duel-score-taps">' + (p.tapMs / 1000).toFixed(2) + 's</span>';
    }
    listEl.appendChild(row);
  });
  const continueBtn = document.getElementById('duel-continue-btn');
  continueBtn.style.display = isHost ? '' : 'none';
  continueBtn.disabled = true;
  continueBtn.style.opacity = '0.4';
  setTimeout(() => { continueBtn.disabled = false; continueBtn.style.opacity = '1'; }, 3000);
}

window.duelContinue = function() {
  closeDuelScore();
  // Clean up duel node in Firebase — non-host players listen for removal
  if (db && roomCode) {
    remove(ref(db, `rooms/${roomCode}/duel`)).catch(() => {});
  }
  if (duelListenUnsub) { duelListenUnsub(); duelListenUnsub = null; }
  if (duelResultsUnsub) { duelResultsUnsub(); duelResultsUnsub = null; }
  duelStateVersion = 0;
};

window.closeDuelScore = function() {
  document.getElementById('duel-score-overlay').classList.remove('show');
  if (duelResultsUnsub) { duelResultsUnsub(); duelResultsUnsub = null; }
};

// ── START NEW GAME ──────────────────────────
window.startNewGameSetup = async function() {
  if (!db || !roomCode) return;
  const confirmed = await showConfirm('Start a new game? All players will return to the lobby and settings can be reconfigured.');
  if (!confirmed) return;
  // Set room status to reconfiguring so non-host players see the wait screen
  await update(ref(db), {
    [`rooms/${roomCode}/status`]: 'reconfiguring'
  });
  // Clean up listeners and take host to the wizard (starting from step 1)
  cleanupListeners();
  startingNewGame = true;
  editingRoom = false;
  // Pre-fill wizard with current settings (like goBackToCreate)
  const nameEl = document.getElementById('host-name');
  if (nameEl && myName) nameEl.value = myName;
  if (myColor) {
    const colorBtn = document.getElementById('host-color-btn');
    const colorLabel = document.getElementById('host-color-label');
    if (colorBtn) { colorBtn.style.background = myColor; colorBtn.style.borderColor = myColor; colorBtn.classList.toggle('light-fill', isLightColor(myColor)); }
    const colorName = PLAYER_COLORS.find(c => c.hex === myColor)?.name || myColor;
    if (colorLabel) { colorLabel.textContent = colorName; colorLabel.style.color = isLightColor(myColor) ? '#000' : '#fff'; }
  }
  const savedAv = roomAvatarSelection || getSavedAvatar();
  if (savedAv) {
    const avLabel = document.getElementById('host-avatar-label');
    setAvatarLabel(avLabel, savedAv);
  }
  if (turnMode) {
    if (turnMode === 'classic' && passDirection) {
      const dirEl = document.getElementById('tm-inline-' + passDirection);
      if (dirEl) dirEl.classList.add('selected');
    }
    const selTxt = document.getElementById('tm-summary');
    const dirLabels = { cw: '↻ Left', both: '↔ Left & Right', ccw: '↺ Right' };
    if (selTxt) {
      if (turnMode === 'classic') {
        selTxt.innerHTML = 'Turn Direction — <span>' + (dirLabels[passDirection] || passDirection) + '</span>';
      } else {
        selTxt.innerHTML = '⚡ Speed Round — <span>' + (speedMode === 'firstToTap' ? '1st To Tap' : 'Down The Line') + '</span> · ' + speedRoundsTotal + ' rounds';
      }
    }
    document.getElementById('tm-required-note').style.display = 'none';
  }
  const toggleMap = {
    'feature-nudge-toggle': featureNudgeEnabled,
    'feature-awards-toggle': featureAwardsEnabled,
    'feature-vp-toggle': featureVPEnabled,
    'feature-status-toggle': featureStatusEffectsEnabled,
    'feature-dnd-toggle': featureDndEnabled,
    'feature-rounds-toggle': featureRoundsEnabled,
    'feature-timers-toggle': featureTimersEnabled
  };
  Object.entries(toggleMap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.checked = val;
  });
  const nudgeEditBtn = document.getElementById('nudge-edit-btn');
  if (nudgeEditBtn) nudgeEditBtn.classList.toggle('visible', featureNudgeEnabled);
  const timersEditBtn = document.getElementById('timers-edit-btn');
  if (timersEditBtn) timersEditBtn.classList.toggle('visible', featureTimersEnabled);
  const roundsEditBtn = document.getElementById('rounds-edit-btn');
  if (roundsEditBtn) roundsEditBtn.classList.toggle('visible', featureRoundsEnabled);
  document.getElementById('nudge-delay').value = nudgeDelaySeconds;
  document.getElementById('rounds-total').value = roundsTotal || 3;
  updateFeaturesSummary();
  // Start from step 1 so host can redo all steps
  createStep = 1;
  renderCreateStep();
  renderEditRoomButtons();
  showScreen('create');
};

window.startNewGame = async function() {
  if (!db || !roomCode) return;
  const name = document.getElementById('host-name').value.trim();
  if (!name) { status('create-status', 'Enter your name.', 'error'); return; }
  if (!turnMode || (turnMode === 'classic' && !passDirection)) {
    document.getElementById('tm-required-note').style.display = 'block';
    status('create-status', 'Choose a turn mode to continue.', 'error');
    return;
  }
  document.getElementById('tm-required-note').style.display = 'none';
  myName = name;
  const av = roomAvatarSelection || '👤';
  const updates = {};
  // Update host player info
  updates[`rooms/${roomCode}/players/${myId}/name`] = name;
  updates[`rooms/${roomCode}/players/${myId}/color`] = myColor;
  updates[`rooms/${roomCode}/players/${myId}/avatar`] = av;
  // Update all features
  updates[`rooms/${roomCode}/features/passDirection`] = passDirection;
  updates[`rooms/${roomCode}/features/turnMode`] = turnMode;
  updates[`rooms/${roomCode}/features/speedMode`] = turnMode === 'speedRound' ? speedMode : '';
  updates[`rooms/${roomCode}/features/speedRoundsTotal`] = turnMode === 'speedRound' ? speedRoundsTotal : 0;
  updates[`rooms/${roomCode}/features/nudge`] = featureNudgeEnabled;
  updates[`rooms/${roomCode}/features/nudgeDelay`] = featureNudgeEnabled ? (parseInt(document.getElementById('nudge-delay').value) || 30) : 0;
  updates[`rooms/${roomCode}/features/nudgeMode`] = featureNudgeEnabled ? (document.querySelector('input[name="nudge-mode"]:checked')?.value || 'multi') : 'multi';
  updates[`rooms/${roomCode}/features/awards`] = featureAwardsEnabled;
  updates[`rooms/${roomCode}/features/victoryPoints`] = featureVPEnabled;
  updates[`rooms/${roomCode}/features/vpHighestWins`] = vpHighestWins;
  updates[`rooms/${roomCode}/features/statusEffects`] = featureStatusEffectsEnabled;
  updates[`rooms/${roomCode}/features/dndTurnComponents`] = featureDndEnabled;
  updates[`rooms/${roomCode}/features/timers`] = featureTimersEnabled;
  updates[`rooms/${roomCode}/features/timerTurnOn`] = featureTimersEnabled && document.getElementById('timer-turn-on').checked;
  updates[`rooms/${roomCode}/features/timerTurnVisible`] = document.getElementById('timer-turn-visible').checked;
  updates[`rooms/${roomCode}/features/timerRoundOn`] = featureTimersEnabled && document.getElementById('timer-round-on').checked;
  updates[`rooms/${roomCode}/features/timerRoundVisible`] = document.getElementById('timer-round-visible').checked;
  updates[`rooms/${roomCode}/features/timerGameOn`] = featureTimersEnabled && document.getElementById('timer-game-on').checked;
  updates[`rooms/${roomCode}/features/timerGameVisible`] = document.getElementById('timer-game-visible').checked;
  updates[`rooms/${roomCode}/features/timerCountdownOn`] = featureTimersEnabled && document.getElementById('timer-countdown-on').checked;
  updates[`rooms/${roomCode}/features/timerCountdownVisible`] = document.getElementById('timer-countdown-visible').checked;
  updates[`rooms/${roomCode}/features/timerCountdownSecs`] = (parseInt(document.getElementById('timer-countdown-min').value)||0)*60 + (parseInt(document.getElementById('timer-countdown-sec').value)||30);
  updates[`rooms/${roomCode}/features/rounds`] = featureRoundsEnabled;
  updates[`rooms/${roomCode}/features/roundsTotal`] = featureRoundsEnabled ? (parseInt(document.getElementById('rounds-total').value) || 3) : 0;
  updates[`rooms/${roomCode}/features/undo`] = featureUndoEnabled;
  // Reset game state — keep players and room code
  updates[`rooms/${roomCode}/status`] = 'lobby';
  updates[`rooms/${roomCode}/activePlayerIndex`] = 0;
  updates[`rooms/${roomCode}/previousPlayerId`] = null;
  updates[`rooms/${roomCode}/previousPlayerIndex`] = null;
  updates[`rooms/${roomCode}/currentRound`] = featureRoundsEnabled ? 1 : 0;
  updates[`rooms/${roomCode}/timerRound`] = 0;
  updates[`rooms/${roomCode}/timerGame`] = 0;
  updates[`rooms/${roomCode}/timerCountdown`] = featureTimersEnabled && document.getElementById('timer-countdown-on').checked ? (parseInt(document.getElementById('timer-countdown-min').value)||0)*60 + (parseInt(document.getElementById('timer-countdown-sec').value)||30) : 0;
  // Reset buzz state if speed round
  if (turnMode === 'speedRound') {
    updates[`rooms/${roomCode}/buzz`] = {
      phase: 'waiting',
      currentRound: 1,
      totalRounds: speedRoundsTotal || 10,
      scores: {},
      tapOrder: {},
      winner: null,
      dtlIndex: 0,
      roundStartTime: serverNow()
    };
  }
  await update(ref(db), updates);
  haptic(20);
  startingNewGame = false;
  document.getElementById('display-code').textContent = roomCode;
  showScreen('lobby');
  generateLobbyQR();
  listenLobby();
};

// ── GAME STATE LISTENER ──────────────────────────
let lastActivePlayerId = null;
function listenGameState() {
  const roomRef = ref(db, `rooms/${roomCode}`);
  const unsub = onValue(roomRef, snap => {
    if (!snap.exists()) {
      // Room deleted by host — non-hosts get a home button
      hideAllAwardOverlays();
      const iconEl  = document.getElementById('awards-gameover-icon');
      const titleEl = document.getElementById('awards-gameover-title-text');
      const subEl   = document.getElementById('awards-gameover-sub-text');
      if (iconEl)  iconEl.textContent = '🚪';
      if (titleEl) titleEl.textContent = 'Room Closed';
      if (subEl)   subEl.textContent = 'The host closed this room.';
      const hostOpts = document.getElementById('awards-host-options');
      const waitMsg  = document.getElementById('awards-wait-msg');
      if (hostOpts) hostOpts.style.display = 'none';
      if (waitMsg) {
        waitMsg.style.display = 'block';
        waitMsg.innerHTML = '<button class="btn-secondary btn-sm" style="margin-top:0.5rem;width:auto;padding:0.5rem 1.5rem;" onclick="endGameFinal()">🏠 Back to Home</button>';
      }
      document.getElementById('awards-gameover').classList.add('show');
      return;
    }
    const room = snap.val();
    // Room closed by host — send everyone home immediately
    if (room.status === 'closed') { hideAllAwardOverlays(); showScreen('home'); return; }
    // Host starting new game — show reconfiguring screen
    if (room.status === 'reconfiguring') {
      hideAllAwardOverlays();
      showScreen('reconfiguring');
      return;
    }
    // Host saved the game — pause everyone on the Game Saved screen
    if (room.status === 'saved') {
      hideAllAwardOverlays();
      if (!isHost) showSavedScreenForPlayer(room.savedAction || null);
      return;
    }
    // Gameover — show the end screen
    if (room.status === 'gameover') { showGameOver(); return; }
    // Playing — if we were on the saved screen, hide it and resume
    if (room.status === 'playing') {
      hideAllAwardOverlays();
      document.getElementById('saved-screen').classList.remove('show');
      // fall through to normal game rendering below
    }
    // Non-host players: stay on reconfiguring screen while host is in lobby setting up new game
    if (room.status === 'lobby' && !isHost) {
      showScreen('reconfiguring');
      return;
    }
    if (room.status !== 'playing' && room.status !== 'ceremony' && room.status !== 'vp-entry' && room.status !== 'vp-ceremony' && room.status !== 'round-vp-entry') { showScreen('home'); return; }

    localPlayers = buildOrderedPlayers(room.players || {});
    const activeIdx = room.activePlayerIndex || 0;
    const activePlayer = localPlayers[activeIdx];
    if (!activePlayer) return;

    // Read feature settings from Firebase
    const roomFeatures = room.features || {};
    featureNudgeEnabled = !!roomFeatures.nudge;
    nudgeDelaySeconds = roomFeatures.nudgeDelay || 30;
    nudgeMode = roomFeatures.nudgeMode || 'multi';
    featureAwardsEnabled = !!roomFeatures.awards;
    featureVPEnabled              = !!roomFeatures.victoryPoints;
    vpHighestWins                 = roomFeatures.vpHighestWins !== false;
    featureStatusEffectsEnabled   = !!roomFeatures.statusEffects;
    featureDndEnabled             = !!roomFeatures.dndTurnComponents;
    featureTimersEnabled          = !!roomFeatures.timers;
    featureRoundsEnabled          = !!roomFeatures.rounds;
    roundsTotal                   = roomFeatures.roundsTotal || 3;
    featureUndoEnabled            = !!roomFeatures.undo;
    currentRound                  = room.currentRound || 1;
    passDirection = roomFeatures.passDirection || 'both';
    turnMode      = roomFeatures.turnMode      || 'classic';
    speedMode     = roomFeatures.speedMode     || 'firstToTap';
    speedRoundsTotal = roomFeatures.speedRoundsTotal || 10;
    renderRoundIndicator(currentRound, roundsTotal);

    // Speed Round mode — hand off to buzz listener and stop classic rendering
    if (turnMode === 'speedRound') {
      startBuzzListener();
      if (room.buzz) renderBuzzScreen(room.buzz);
      return;
    }
    stopBuzzListener();
    if (featureTimersEnabled) {
      timerCfg = {
        turn:             !!roomFeatures.timerTurnOn,
        turnVisible:      roomFeatures.timerTurnVisible !== false,
        round:            !!roomFeatures.timerRoundOn,
        roundVisible:     roomFeatures.timerRoundVisible !== false,
        game:             !!roomFeatures.timerGameOn,
        gameVisible:      roomFeatures.timerGameVisible !== false,
        countdown:        !!roomFeatures.timerCountdownOn,
        countdownVisible: roomFeatures.timerCountdownVisible !== false,
        countdownSecs:    roomFeatures.timerCountdownSecs || 30
      };
    }

    // VP entry phase — show score input overlay to all players
    if (room.status === 'vp-entry') {
      stopTimerTick();
      showVPEntryOverlay(room);
      return;
    }

    // Per-round VP entry (Rounds + VP combined)
    if (room.status === 'round-vp-entry') {
      stopTimerTick();
      showRoundVPEntryOverlay(room);
      return;
    }

    // Handle ceremony state pushed by host
    if (room.status === 'ceremony') {
      handleCeremonyState(room);
      return;
    }

    // Handle VP-only ceremony state
    if (room.status === 'vp-ceremony') {
      handleVPCeremonyState(room);
      return;
    }

    // Detect turn change (or first turn)
    const turnChanged = lastActivePlayerId !== null && lastActivePlayerId !== activePlayer.id;
    const firstTurn = lastActivePlayerId === null;
    if (turnChanged) {
      resetNudgesForNewTurn();
    }
    lastActivePlayerId = activePlayer.id;

    const isMe = activePlayer.id === myId;

    // Show/hide host manage button and host game menu
    const hmb = document.getElementById('host-manage-btn');
    const hmbw = document.getElementById('host-manage-btn-wait');
    const hgma = document.getElementById('host-game-menu-btn-active');
    const hgmw = document.getElementById('host-game-menu-btn-wait');
    if (hmb) hmb.classList.toggle('visible', isHost);
    if (hmbw) hmbw.classList.toggle('visible', isHost);
    if (hgma) hgma.classList.toggle('visible', isHost);
    if (hgmw) hgmw.classList.toggle('visible', isHost);

    if (isMe) {
      // Show active screen
      const activePlayers = localPlayers.filter(p => !p.knockedOut);
      const activeActiveIdx = activePlayers.findIndex(p => p.id === activePlayer.id);
      const n = activePlayers.length;
      const leftIdx2 = activePlayers[(activeActiveIdx + 1) % n];
      const rightIdx2 = activePlayers[(activeActiveIdx - 1 + n) % n];
      document.getElementById('active-player-display').textContent = myName;
      document.getElementById('left-player-name').textContent  = leftIdx2 ? 'to ' + leftIdx2.name : '';
      document.getElementById('right-player-name').textContent = rightIdx2 ? 'to ' + rightIdx2.name : '';
      // Apply neighbor colors to buttons (semi-transparent so player bg gradient shows through)
      const leftColor  = leftIdx2?.color  || '#2563eb';
      const rightColor = rightIdx2?.color || '#c05e00';
      const myPlayerColor = activePlayer.color || '#7c3aed';
      const toRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        return `rgba(${r},${g},${b},${alpha})`;
      };
      // Background: player's own color at full brightness at center, feathering to dark
      const myColorFull = myPlayerColor;
      const myColorMid  = adjustBrightness(myPlayerColor, -0.30);
      const myColorEdge = adjustBrightness(myPlayerColor, -0.68);
      document.getElementById('screen-active').style.background =
        `radial-gradient(ellipse 140% 140% at 50% 50%, ${myColorFull} 0%, ${myColorMid} 30%, ${myColorEdge} 65%, #050508 100%)`;

      // Both mode: buttons are transparent overlays — neighbor color shows only as subtle arrow/label tint, not bg
      document.getElementById('btn-left').style.background  = 'transparent';
      document.getElementById('btn-right').style.background = 'transparent';
      const arcEl = document.getElementById('settings-overlay-room-code');
      if (arcEl) arcEl.textContent = roomCode;

      // Apply pass direction UI mode
      const isBoth = passDirection === 'both' || !passDirection;
      const hideClassicForWheel = wheelUIMode;
      document.getElementById('btn-left').style.display        = hideClassicForWheel ? 'none' : (isBoth ? '' : 'none');
      document.getElementById('btn-right').style.display       = hideClassicForWheel ? 'none' : (isBoth ? '' : 'none');
      document.getElementById('active-divider').style.display  = hideClassicForWheel ? 'none' : (isBoth ? '' : 'none');
      document.getElementById('active-center').style.display   = hideClassicForWheel ? 'none' : (isBoth ? '' : 'none');
      const tapBtn    = document.getElementById('pass-tap-btn');
      const tapArrow  = document.getElementById('pass-tap-arrow');
      const tapPlayer = document.getElementById('pass-tap-player');
      if (hideClassicForWheel || isBoth) {
        tapBtn.style.display = 'none';
      } else {
        tapBtn.style.display = '';
        tapArrow.textContent = passDirection === 'cw' ? '↻' : '↺';
        const nextNeighbor = passDirection === 'cw' ? leftIdx2 : rightIdx2;
        tapPlayer.textContent = nextNeighbor ? 'to ' + nextNeighbor.name : '';
        // Keep background based on MY color — don't let neighbor color override it
      }
      // Nudge: sync floating counter on active player screen
      if (featureNudgeEnabled) syncNudgeToActiveScreen(room);
      // Timers: init/restart for this turn
      if (turnChanged || firstTurn) initTimersForTurn(room, true);
      else syncTimersFromRoom(room);
      clearNudgeTimer();
      showScreen('active');
      const activeRC = document.getElementById('active-room-code-val');
      if (activeRC && roomCode) activeRC.textContent = roomCode;
      const activeSB = document.getElementById('active-sound-btn');
      if (activeSB) { activeSB.textContent = soundEnabled ? '🔊' : '🔇'; }
      // Wheel UI: apply mode if needed
      window._currentActivePlayerId = activePlayer.id;
      if (wheelUIMode) { clearWheelTapZones('active'); applyUIMode(); renderWheel('active', localPlayers, activePlayer.id, myId, passDirection, true); }
      requestWakeLock();
      if (soundEnabled && !suppressNextTurnSound && (turnChanged || firstTurn)) playTurnSound();
      suppressNextTurnSound = false;
      // Status Effects: alert this player of any active statuses at turn start
      if (turnChanged || firstTurn) checkStatusEffectsOnTurnStart(room);
      // D&D Turn Components: show action tracker overlay on turn start
      if (featureDndEnabled && (turnChanged || firstTurn)) showDndOverlay();
      // Status Effects button — visible for all players when feature is on
      ['status-btn-active'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.classList.toggle('visible', featureStatusEffectsEnabled);
          btn.classList.toggle('host-offset', isHost);
        }
      });
    } else {
      // Show waiting screen
      const myPlayer = localPlayers.find(p => p.id === myId);
      const myIdx = localPlayers.indexOf(myPlayer);
      const waitNameEl = document.getElementById('waiting-active-name');
      const waitAvatarEl = document.getElementById('waiting-active-avatar');
      waitNameEl.textContent = activePlayer.name;
      setAvatarEl(waitAvatarEl, activePlayer.avatar || '👤', 28);
      // Color the active player's name with their chosen color
      const apColor = activePlayer.color || '#4ade80';
      // If the player chose black, their name would be invisible on the dark bg — use white instead
      const apDisplayColor = (apColor.toLowerCase() === '#000000') ? '#ffffff' : apColor;
      const apR = parseInt(apDisplayColor.slice(1,3),16);
      const apG = parseInt(apDisplayColor.slice(3,5),16);
      const apB = parseInt(apDisplayColor.slice(5,7),16);
      waitNameEl.style.setProperty('--wait-active-color', apDisplayColor);
      waitNameEl.style.setProperty('--wait-active-glow',  `rgba(${apR},${apG},${apB},0.5)`);
      waitNameEl.style.setProperty('--wait-active-glow2', `rgba(${apR},${apG},${apB},0.18)`);
      // Tint nudge button border to active player's color
      const nudgeBtn = document.getElementById('nudge-btn');
      if (nudgeBtn) {
        nudgeBtn.style.borderColor = `rgba(${apR},${apG},${apB},0.55)`;
        nudgeBtn.style.boxShadow   = `0 0 18px rgba(${apR},${apG},${apB},0.2)`;
      }
      // Nudge area
      const nudgeArea = document.getElementById('nudge-area');
      if (nudgeArea) nudgeArea.classList.toggle('visible', featureNudgeEnabled);
      if (featureNudgeEnabled && (turnChanged || firstTurn)) startNudgeCountdown(nudgeDelaySeconds);
      // Undo Turn — visible only to whoever was active immediately before
      // the current player. Disappears the moment anyone else's turn ends
      // too, since previousPlayerId moves on at that point.
      const undoBtn = document.getElementById('undo-turn-btn');
      if (undoBtn) {
        const canUndo = featureUndoEnabled && room.previousPlayerId === myId;
        undoBtn.classList.toggle('visible', canUndo);
        const hostBtnVisible = isHost && document.getElementById('host-manage-btn-wait')?.classList.contains('visible');
        undoBtn.classList.toggle('stacked', canUndo && hostBtnVisible);
      }
      // Status Effects button — visible for all players when feature is on
      const statusBtnWait = document.getElementById('status-btn-wait');
      if (statusBtnWait) {
        statusBtnWait.classList.toggle('visible', featureStatusEffectsEnabled);
        statusBtnWait.classList.toggle('host-offset', isHost);
      }
      // Also refresh the status button indicator in case statuses changed
      if (featureStatusEffectsEnabled) {
        const effects = room.players?.[myId]?.statusEffects || {};
        updateStatusButtonIndicator(effects);
      }
      // Timers: sync from Firebase (don't tick locally on waiting screen)
      if (turnChanged || firstTurn) initTimersForTurn(room, false);
      else syncTimersFromRoom(room);
      showScreen('waiting');
      const waitRC = document.getElementById('active-room-code-wait-val');
      if (waitRC && roomCode) waitRC.textContent = roomCode;
      const waitSB = document.getElementById('active-sound-btn-wait');
      if (waitSB) waitSB.textContent = soundEnabled ? '🔊' : '🔇';
      // Wheel UI: apply mode if needed
      window._currentActivePlayerId = activePlayer.id;
      if (wheelUIMode) { clearWheelTapZones('wait'); applyUIMode(); renderWheel('wait', localPlayers, activePlayer.id, myId, passDirection, false); }
      // Reset the active screen background so it doesn't persist for next turn
      document.getElementById('screen-active').style.background = '';
      requestWakeLock();
    }
  });
  unsubscribers.push(() => unsub());
}

// ── PASS TURN ──────────────────────────────
// Single-tap pass for CW/CCW mode — always moves in the fixed direction
window.passTurnSingle = async function() {
  // CW passes to the left neighbor (same as 'left' direction in both mode)
  // CCW passes to the right neighbor
  const dir = passDirection === 'cw' ? 'left' : 'right';
  await passTurn(dir);
};

window.passTurn = async function(direction) {
  if (!db || !roomCode) return;
  const snap = await get(ref(db, `rooms/${roomCode}`));
  if (!snap.exists()) return;
  const room = snap.val();
  const allPlayers = buildOrderedPlayers(room.players || {});
  const activePlayers = allPlayers.filter(p => !p.knockedOut);
  if (activePlayers.length === 0) return;
  const current = room.activePlayerIndex || 0;
  const currentActive = activePlayers.findIndex(p => p.order === allPlayers[current]?.order);
  const n = activePlayers.length;
  const nextActiveIdx = direction === 'left'
    ? (currentActive + 1) % n
    : (currentActive - 1 + n) % n;
  const nextPlayer = activePlayers[nextActiveIdx];
  const nextIdx = allPlayers.findIndex(p => p.id === nextPlayer.id);
  const outgoingPlayer = allPlayers[current];

  // Commit this player's turn time before passing
  await commitTurnTime(myId, timerTurn);
  stopTimerTick();

  await update(ref(db, `rooms/${roomCode}`), {
    activePlayerIndex: nextIdx,
    // Records who was just active, so they get a one-time Undo Turn option
    // on their waiting screen. Overwritten on every pass, so only the
    // single most recent outgoing player ever has it — the moment anyone
    // else's turn ends too, this player's chance to undo is gone.
    previousPlayerId: outgoingPlayer ? outgoingPlayer.id : null,
    previousPlayerIndex: current
  });
};

// Brings the turn back to whoever was active immediately before the
// current player — a one-time "I forgot something" correction. Only
// works for the single most recent outgoing player; once anyone else's
// turn ends too, previousPlayerId has moved on and this is no longer
// available to them. Works identically regardless of pass direction
// (CW/CCW/Both), since it restores by player ID rather than replaying
// any direction-specific math.
window.undoTurn = async function() {
  if (!db || !roomCode || !featureUndoEnabled) return;
  const snap = await get(ref(db, `rooms/${roomCode}`));
  if (!snap.exists()) return;
  const room = snap.val();
  if (!room.previousPlayerId || room.previousPlayerId !== myId) return;

  const allPlayers = buildOrderedPlayers(room.players || {});
  const restoredIdx = allPlayers.findIndex(p => p.id === room.previousPlayerId);
  if (restoredIdx === -1) return;

  await update(ref(db, `rooms/${roomCode}`), {
    activePlayerIndex: room.previousPlayerIndex ?? restoredIdx,
    previousPlayerId: null,
    previousPlayerIndex: null
  });
  haptic(15);
};

// ── SAVE GAME / RESUME ──────────────────────────
// Host-triggered: snapshots the live room into savedGames/{code}, freezes
// the live room so non-host players see a "saved" screen, and pauses
// timers. Anyone can later use the save code from the home screen to
// spin up a fresh live room pre-loaded with everything as it was.
function genSaveCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
}

window.saveCurrentGame = async function() {
  if (!db || !roomCode || !isHost) return;
  if (!requireHostAccount()) return;

  const name = await showPrompt('Name this save (e.g. "Friday D&D — Session 12"):', '');
  if (name === null) return; // cancelled
  const saveName = name.trim() || `Saved Game — ${new Date().toLocaleDateString()}`;

  try {
    const roomRef = ref(db, `rooms/${roomCode}`);
    const snap = await get(roomRef);
    if (!snap.exists()) { showAlert('Could not save: room not found.'); return; }
    const room = snap.val();

    const hostUserId = getHostId();
    const saveCode = genSaveCode();
    const snapshot = JSON.parse(JSON.stringify(room)); // deep copy
    snapshot.name = saveName;
    snapshot.savedAt = Date.now();
    snapshot._originalRoomCode = roomCode;
    snapshot._hostUserId = hostUserId;

    await update(ref(db), {
      [`savedGames/${hostUserId}/${saveCode}`]: snapshot,
      [`saveCodeIndex/${saveCode}`]: hostUserId,   // lets a different device resolve a shared code
      [`rooms/${roomCode}/status`]: 'saved',
      [`rooms/${roomCode}/savedAction`]: null
    });

    stopTimerTick();
    clearNudgeTimer();

    document.getElementById('saved-screen-code').textContent = roomCode;
    document.getElementById('saved-screen-name').textContent = saveName;
    document.getElementById('saved-screen-host-view').style.display = 'block';
    document.getElementById('saved-screen-player-view').style.display = 'none';
    document.getElementById('saved-screen').classList.add('show');
  } catch (err) {
    showAlert('Save failed: ' + (err && err.message ? err.message : err));
  }
};

// Called by the non-host listener when room.status becomes 'saved'
function showSavedScreenForPlayer(savedAction) {
  stopTimerTick();
  clearNudgeTimer();
  document.getElementById('saved-screen-host-view').style.display = 'none';
  document.getElementById('saved-screen-player-view').style.display = 'block';
  const waitingEl = document.getElementById('saved-screen-player-waiting');
  const actionEl = document.getElementById('saved-screen-player-action');
  const actionText = document.getElementById('saved-screen-player-action-text');
  const continueBtn = document.getElementById('saved-screen-player-continue-btn');
  if (savedAction === 'continue') {
    if (waitingEl) waitingEl.style.display = 'none';
    if (actionEl) actionEl.style.display = 'block';
    if (actionText) actionText.textContent = 'The host resumed the game!';
    if (continueBtn) continueBtn.style.display = 'inline-block';
  } else if (savedAction === 'leave') {
    if (waitingEl) waitingEl.style.display = 'none';
    if (actionEl) actionEl.style.display = 'block';
    if (actionText) actionText.textContent = 'The host left the game.';
    if (continueBtn) continueBtn.style.display = 'none';
  } else {
    if (waitingEl) waitingEl.style.display = 'block';
    if (actionEl) actionEl.style.display = 'none';
  }
  document.getElementById('saved-screen').classList.add('show');
};

window.playerContinueGame = function() {
  document.getElementById('saved-screen').classList.remove('show');
};

let pendingResumeCode = null;
let pendingResumeHostId = null;
let pendingResumeData = null;

window.resumeFromSaveCode = async function() {
  if (!requireDb()) return;
  const codeInput = document.getElementById('resume-code');
  const code = codeInput ? codeInput.value.toUpperCase().trim() : '';
  if (!code) { status('resume-status', 'Enter a save code.', 'error'); return; }

  const indexSnap = await get(ref(db, `saveCodeIndex/${code}`));
  if (!indexSnap.exists()) { status('resume-status', 'Save code not found.', 'error'); return; }
  const hostUserId = indexSnap.val();

  const saveRef = ref(db, `savedGames/${hostUserId}/${code}`);
  const snap = await get(saveRef);
  if (!snap.exists()) { status('resume-status', 'Save code not found.', 'error'); return; }
  const saved = snap.val();

  // Show a "who are you" picker so the resuming device reattaches to the
  // correct existing player rather than joining as a stranger.
  pendingResumeCode = code;
  pendingResumeHostId = hostUserId;
  pendingResumeData = saved;
  document.getElementById('resume-as-host').checked = false;
  const players = buildOrderedPlayers(saved.players || {});
  const listEl = document.getElementById('resume-who-list');
  listEl.innerHTML = '';
  players.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'tool-list-btn';
    btn.textContent = p.name;
    btn.onclick = () => finishResume(p.id);
    listEl.appendChild(btn);
  });
  const newBtn = document.createElement('button');
  newBtn.className = 'tool-list-btn';
  newBtn.style.marginTop = '0.5rem';
  newBtn.textContent = "🆕 I'm not on this list (spectating)";
  newBtn.onclick = () => finishResume(null);
  listEl.appendChild(newBtn);

  document.getElementById('resume-code-step').style.display = 'none';
  document.getElementById('resume-who-step').style.display = 'block';
};

async function finishResume(existingPlayerId) {
  const restored = JSON.parse(JSON.stringify(pendingResumeData));
  const originalCode = restored._originalRoomCode || null;
  if (!originalCode) { showAlert('This save is missing its original room code and cannot be restored.'); return; }

  delete restored.savedAt;
  delete restored._originalRoomCode;
  delete restored._hostUserId;
  delete restored.name;
  restored.status = 'playing';
  restored.lastActivity = Date.now();

  // Safety check: don't clobber a room if someone else is already using
  // this exact code for an unrelated live game (extremely unlikely with a
  // 4-character code, but cheap to guard against).
  const existingSnap = await get(ref(db, `rooms/${originalCode}`));
  if (existingSnap.exists() && existingSnap.val().status !== 'saved') {
    showAlert('That room code is currently in use by another game. Please try again in a moment.');
    return;
  }

  await update(ref(db), { [`rooms/${originalCode}`]: restored });

  const wantsHost = !!document.getElementById('resume-as-host').checked;
  roomCode = originalCode;
  if (existingPlayerId) {
    // Reattach to an existing player record — same seat, color, score, turn position
    myId = existingPlayerId;
    myName = restored.players[existingPlayerId]?.name || '';
    isHost = wantsHost; // can be both: occupying a seat AND running the host menu
  } else {
    // Not on the player list — spectating only, host status from the checkbox
    myId = uid();
    myName = 'Host';
    isHost = wantsHost;
  }
  saveSession();

  closeResumeOverlay();
  closeMySavedGames();
  listenGameState();
}

// ── MY SAVED GAMES (list, scoped to this device's host ID) ──
window.openMySavedGames = async function() {
  if (!requireDb()) return;
  document.getElementById('my-saves-overlay').classList.add('show');
  const listEl = document.getElementById('my-saves-list');
  listEl.innerHTML = '<div style="color:var(--muted); font-size:0.85rem; text-align:center; padding:0.5rem;">Loading…</div>';

  try {
    const hostUserId = getHostId();
    const snap = await get(ref(db, `savedGames/${hostUserId}`));
    if (!snap.exists()) {
      listEl.innerHTML = '<div style="color:var(--muted); font-size:0.85rem; text-align:center; padding:0.5rem;">No saved games yet.</div>';
      return;
    }
    const saves = snap.val();
    const codes = Object.keys(saves).sort((a,b) => (saves[b].savedAt||0) - (saves[a].savedAt||0));
    listEl.innerHTML = '';
    codes.forEach(code => renderSaveRow(listEl, code, saves[code]));
  } catch (err) {
    listEl.innerHTML = '<div style="color:#ff5c5c; font-size:0.85rem; text-align:center; padding:0.5rem;">Could not load saves: ' + (err && err.message ? err.message : err) + '</div>';
  }
};
window.closeMySavedGames = function() {
  document.getElementById('my-saves-overlay').classList.remove('show');
};

function renderSaveRow(listEl, code, save) {
  const row = document.createElement('div');
  row.className = 'save-row';
  const dateStr = save.savedAt ? new Date(save.savedAt).toLocaleString() : '';
  row.innerHTML = `
    <div class="save-row-name">${escapeHtml(save.name || 'Untitled Save')}</div>
    <div class="save-row-date">${escapeHtml(dateStr)} · code ${escapeHtml(code)}</div>
    <div class="save-row-actions">
      <button data-act="resume">Resume <span class="play-tri">▶</span></button>
      <button data-act="rename">✎ Rename</button>
      <button data-act="delete" class="danger">🗑 Delete</button>
    </div>
  `;
  row.querySelector('[data-act="resume"]').onclick = () => resumeFromList(code, save);
  row.querySelector('[data-act="rename"]').onclick = () => renameSave(code, save, row);
  row.querySelector('[data-act="delete"]').onclick = () => deleteSave(code, row);
  listEl.appendChild(row);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

async function resumeFromList(code, save) {
  closeMySavedGames();
  pendingResumeCode = code;
  pendingResumeHostId = getHostId();
  pendingResumeData = save;
  document.getElementById('resume-as-host').checked = true; // resuming from your own saved list — most likely you're the host

  const players = buildOrderedPlayers(save.players || {});
  const listEl = document.getElementById('resume-who-list');
  listEl.innerHTML = '';
  players.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'tool-list-btn';
    btn.textContent = p.name;
    btn.onclick = () => finishResume(p.id);
    listEl.appendChild(btn);
  });
  const newBtn = document.createElement('button');
  newBtn.className = 'tool-list-btn';
  newBtn.style.marginTop = '0.5rem';
  newBtn.textContent = "🆕 I'm not on this list (spectating)";
  newBtn.onclick = () => finishResume(null);
  listEl.appendChild(newBtn);

  document.getElementById('resume-code-step').style.display = 'none';
  document.getElementById('resume-who-step').style.display = 'block';
  document.getElementById('resume-overlay').classList.add('show');
}

async function renameSave(code, save, row) {
  const newName = await showPrompt('Rename this save:', save.name || '');
  if (newName === null || !newName.trim()) return;
  try {
    await update(ref(db, `savedGames/${getHostId()}/${code}`), { name: newName.trim() });
    row.querySelector('.save-row-name').textContent = newName.trim();
    save.name = newName.trim();
  } catch (err) {
    showAlert('Rename failed: ' + (err && err.message ? err.message : err));
  }
}

async function deleteSave(code, row) {
  if (!await showConfirm('Delete this saved game? This cannot be undone.')) return;
  try {
    await remove(ref(db, `savedGames/${getHostId()}/${code}`));
    await remove(ref(db, `saveCodeIndex/${code}`));
    row.remove();
  } catch (err) {
    showAlert('Delete failed: ' + (err && err.message ? err.message : err));
  }
}


// ── MY COLLECTION (board game library) ──
const COLLECTION_CATEGORIES = [
  { key: 'coop',        icon: '🤝', label: 'Co-op' },
  { key: 'competitive', icon: '⚔️', label: 'Competitive' },
  { key: 'teams',       icon: '👥', label: 'Teams' },
  { key: 'solo',        icon: '🧍', label: 'Solo' },
  { key: 'party',       icon: '🎉', label: 'Party' }
];
const COLLECTION_MECHANICS = [
  { key: 'deck-builder',     icon: '🃏', label: 'Deck Builder' },
  { key: 'worker-placement', icon: '🧱', label: 'Worker Placement' },
  { key: 'area-control',     icon: '🗺️', label: 'Area Control' },
  { key: 'drafting',         icon: '🔄', label: 'Drafting' },
  { key: 'card-game',        icon: '🎴', label: 'Card Game' },
  { key: 'dice',             icon: '🎲', label: 'Dice' },
  { key: 'engine-building',  icon: '🏗️', label: 'Engine Building' },
  { key: 'deduction',        icon: '🕵️', label: 'Deduction' }
];
const COLLECTION_DEFS = {};
COLLECTION_CATEGORIES.forEach(c => COLLECTION_DEFS[c.key] = c);
COLLECTION_MECHANICS.forEach(m => COLLECTION_DEFS[m.key] = m);
const COLLECTION_FILTER_GROUPS = [
  { label: 'Play Style',      type: 'cat',  keys: ['coop','competitive','teams','solo','party'] },
  { label: 'Deck & Draft',    type: 'mech', keys: ['deck-builder','engine-building','drafting'] },
  { label: 'Board Strategy',  type: 'mech', keys: ['worker-placement','area-control'] },
  { label: 'Cards & Dice',    type: 'mech', keys: ['card-game','dice'] },
  { label: 'Deduction',       type: 'mech', keys: ['deduction'] }
];

let collectionFilter = { search: '', players: 0, cats: new Set(), mechs: new Set() };
let collectionPickId = null;
let collectionEditingId = null;
let collectionEditCats = new Set();
let collectionEditMechs = new Set();
let collectionGames = []; // in-memory cache of the user's games

function getCollectionKey() {
  return 'sk_collection_' + (currentUser && currentUser.uid ? currentUser.uid : 'guest');
}
function collectionPath() {
  return 'users/' + (currentUser && currentUser.uid ? currentUser.uid : 'guest') + '/collection';
}
function loadCollectionLocal() {
  try { return JSON.parse(localStorage.getItem(getCollectionKey()) || '[]'); } catch (e) { return []; }
}
function saveCollectionLocal(list) {
  try { localStorage.setItem(getCollectionKey(), JSON.stringify(list)); } catch (e) {}
}
// Loads the collection into the in-memory cache. Signed in hosts read from
// Firebase; guests fall back to localStorage. Always mirrors to localStorage
// so the list still works offline / while signed out.
async function loadCollection() {
  const uid = currentUser && currentUser.uid ? currentUser.uid : 'guest';
  if (db && currentUser) {
    try {
      const snap = await get(ref(db, collectionPath()));
      if (snap.exists()) {
        const obj = snap.val();
        collectionGames = Object.keys(obj).map(k => Object.assign({ id: k }, obj[k]));
        saveCollectionLocal(collectionGames);
        return collectionGames;
      }
      // Firebase has no collection yet — keep any local cache instead of wiping it
    } catch (e) {
      // fall through to local cache
    }
  }
  collectionGames = loadCollectionLocal();
  return collectionGames;
}

window.openMyCollection = function() {
  document.getElementById('collection-main-menu').style.display = '';
  document.getElementById('collection-library').style.display = 'none';
  document.getElementById('collection-overlay').classList.add('show');
};
window.openCollectionLibrary = async function() {
  document.getElementById('collection-main-menu').style.display = 'none';
  document.getElementById('collection-library').style.display = '';
  renderCollectionFilters();
  await loadCollection();
  renderCollection();
};
window.showCollectionMenu = function() {
  document.getElementById('collection-library').style.display = 'none';
  document.getElementById('collection-main-menu').style.display = '';
};
window.closeCollection = function() {
  document.getElementById('collection-overlay').classList.remove('show');
};

function renderCollectionFilters() {
  const groupsEl = document.getElementById('collection-filter-groups');
  if (groupsEl) {
    groupsEl.innerHTML = COLLECTION_FILTER_GROUPS.map(group => {
      const set = group.type === 'cat' ? collectionFilter.cats : collectionFilter.mechs;
      const chips = group.keys.map(key => {
        const def = COLLECTION_DEFS[key];
        if (!def) return '';
        return '<button class="collection-chip' + (set.has(key) ? ' active' : '') + '" onclick="toggleCollectionFilter(\'' + group.type + '\',\'' + key + '\')">' + def.icon + ' ' + def.label + '</button>';
      }).join('');
      return '<div class="collection-filter-subtitle">' + group.label + '</div>' +
             '<div class="collection-chip-row">' + chips + '</div>';
    }).join('');
  }
  const playersEl = document.getElementById('collection-players');
  if (playersEl) playersEl.textContent = collectionFilter.players || 'Any';
}

window.toggleCollectionFilter = function(type, key) {
  const set = type === 'cat' ? collectionFilter.cats : collectionFilter.mechs;
  set.has(key) ? set.delete(key) : set.add(key);
  renderCollectionFilters(); renderCollection();
};
window.collectionPlayers = function(delta) {
  collectionFilter.players = Math.max(0, Math.min(30, (collectionFilter.players || 0) + delta));
  renderCollectionFilters(); renderCollection();
};
window.clearCollectionFilters = function() {
  collectionFilter = { search: '', players: 0, cats: new Set(), mechs: new Set() };
  collectionPickId = null;
  const searchEl = document.getElementById('collection-search');
  if (searchEl) searchEl.value = '';
  renderCollectionFilters(); renderCollection();
};

window.pickRandomGame = function() {
  const searchEl = document.getElementById('collection-search');
  collectionFilter.search = (searchEl && searchEl.value || '').trim().toLowerCase();
  const matches = collectionGames.filter(game => {
    if (collectionFilter.search && (game.name || '').toLowerCase().indexOf(collectionFilter.search) === -1) return false;
    if (collectionFilter.players) {
      const p = collectionFilter.players;
      if (game.maxPlayers && game.maxPlayers < p) return false;
      if (game.minPlayers && game.minPlayers > p) return false;
    }
    if (collectionFilter.cats.size && ![...collectionFilter.cats].some(k => (game.categories || []).indexOf(k) !== -1)) return false;
    if (collectionFilter.mechs.size && ![...collectionFilter.mechs].some(k => (game.mechanics || []).indexOf(k) !== -1)) return false;
    return true;
  });
  if (!matches.length) {
    showAlert('No games match your current filters.');
    return;
  }
  collectionPickId = matches[Math.floor(Math.random() * matches.length)].id;
  renderCollection();
};

window.renderCollection = function() {
  const listEl = document.getElementById('collection-list');
  if (!listEl) return;
  const searchEl = document.getElementById('collection-search');
  collectionFilter.search = (searchEl && searchEl.value || '').trim().toLowerCase();
  const all = collectionGames;
  const matches = all.filter(game => {
    if (collectionFilter.search && (game.name || '').toLowerCase().indexOf(collectionFilter.search) === -1) return false;
    if (collectionFilter.players) {
      const p = collectionFilter.players;
      if (game.maxPlayers && game.maxPlayers < p) return false;
      if (game.minPlayers && game.minPlayers > p) return false;
    }
    if (collectionFilter.cats.size && ![...collectionFilter.cats].some(k => (game.categories || []).indexOf(k) !== -1)) return false;
    if (collectionFilter.mechs.size && ![...collectionFilter.mechs].some(k => (game.mechanics || []).indexOf(k) !== -1)) return false;
    return true;
  });
  if (!matches.length) {
    listEl.innerHTML = '<div style="color:var(--muted);font-size:0.82rem;text-align:center;padding:0.75rem 0;">No games match your filters.</div>';
    return;
  }
  const ordered = [...matches];
  if (collectionPickId) {
    const idx = ordered.findIndex(g => g.id === collectionPickId);
    if (idx !== -1) {
      const picked = ordered.splice(idx, 1)[0];
      ordered.unshift(picked);
    }
  }
  listEl.innerHTML = '';
  ordered.forEach(game => {
    const row = buildCollectionGameRow(game);
    if (game.id === collectionPickId) row.classList.add('collection-pick');
    listEl.appendChild(row);
  });
};

function buildCollectionGameRow(game) {
  const row = document.createElement('div');
  row.className = 'collection-game';
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
  const tagsHtml = (catLabels || mechLabels) ? '<div class="collection-game-tags">' + catLabels + mechLabels + '</div>' : '';
  const notesHtml = game.notes ? '<div style="font-size:0.72rem;color:var(--muted);margin-top:0.3rem;">' + escapeHtml(game.notes) + '</div>' : '';
  row.innerHTML =
    '<div class="collection-game-name">' + escapeHtml(game.name || 'Untitled') + '</div>' +
    (metaBits.length ? '<div class="collection-game-meta">' + metaBits.join(' · ') + '</div>' : '') +
    tagsHtml + notesHtml +
    '<div class="collection-game-actions">' +
      '<button onclick="openCollectionEdit(\'' + game.id + '\')">✎ Edit</button>' +
      '<button class="danger" onclick="deleteCollectionGame(\'' + game.id + '\')">🗑 Delete</button>' +
    '</div>';
  return row;
}

window.openCollectionEdit = function(id) {
  collectionEditingId = id || null;
  const game = id ? collectionGames.find(g => g.id === id) : null;
  document.getElementById('collection-edit-title').textContent = game ? 'Edit Game' : 'Add Game';
  document.getElementById('ce-name').value = game ? game.name : '';
  document.getElementById('ce-min').value = game ? (game.minPlayers || 2) : 2;
  document.getElementById('ce-max').value = game ? (game.maxPlayers || 4) : 4;
  document.getElementById('ce-time').value = game ? (game.playTime || '') : '';
  document.getElementById('ce-notes').value = game ? (game.notes || '') : '';
  document.getElementById('collection-edit-error').style.display = 'none';
  collectionEditCats = new Set(game ? (game.categories || []) : []);
  collectionEditMechs = new Set(game ? (game.mechanics || []) : []);
  renderCollectionEditChips();
  document.getElementById('collection-edit-overlay').classList.add('show');
};
window.closeCollectionEdit = function() {
  document.getElementById('collection-edit-overlay').classList.remove('show');
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
  const game = {
    id: collectionEditingId || ('cg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    name: name,
    minPlayers: Math.min(minP, maxP),
    maxPlayers: Math.max(minP, maxP),
    playTime: (document.getElementById('ce-time').value || '').trim(),
    notes: (document.getElementById('ce-notes').value || '').trim(),
    categories: [...collectionEditCats],
    mechanics: [...collectionEditMechs]
  };
  if (collectionEditingId) {
    const idx = collectionGames.findIndex(g => g.id === collectionEditingId);
    if (idx !== -1) collectionGames[idx] = game; else collectionGames.push(game);
  } else {
    collectionGames.push(game);
  }
  saveCollectionLocal(collectionGames);
  const uid = currentUser && currentUser.uid ? currentUser.uid : null;
  if (db && uid) {
    try {
      await set(ref(db, collectionPath() + '/' + game.id), game);
    } catch (e) {
      showAlert('Could not sync this game to your account. It is saved on this device only.');
    }
  }
  closeCollectionEdit();
  renderCollection();
};

window.deleteCollectionGame = async function(id) {
  if (!await showConfirm('Remove this game from your collection?')) return;
  collectionGames = collectionGames.filter(g => g.id !== id);
  saveCollectionLocal(collectionGames);
  const uid = currentUser && currentUser.uid ? currentUser.uid : null;
  if (db && uid) {
    try {
      await remove(ref(db, collectionPath() + '/' + id));
    } catch (e) {
      showAlert('Could not remove this game from your account. It was removed on this device only.');
    }
  }
  renderCollection();
};

document.getElementById('collection-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeCollection();
});
document.getElementById('collection-edit-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeCollectionEdit();
});


window.openResumeOverlay = function() {
  document.getElementById('resume-code').value = '';
  document.getElementById('resume-code-step').style.display = 'block';
  document.getElementById('resume-who-step').style.display = 'none';
  status('resume-status', '');
  document.getElementById('resume-overlay').classList.add('show');
};
window.closeResumeOverlay = function() {
  document.getElementById('resume-overlay').classList.remove('show');
};

window.leaveRoom = async function() {
  if (!db || !roomCode || !myId) { showScreen('home'); return; }
  releaseWakeLock();
  resetOrientation();
  cleanupListeners();
  resetFirstPlayerOption();
  clearNudgeTimer();
  stopTimerTick();
  lastActivePlayerId = null;
  await remove(ref(db, `rooms/${roomCode}/players/${myId}`));
  roomCode = null; myId = null;
  clearSession();
  showScreen('home');
};

window.closeRoom = async function() {
  if (!db || !roomCode) return;
  releaseWakeLock();
  resetOrientation();
  cleanupListeners();
  resetFirstPlayerOption();
  clearNudgeTimer();
  lastActivePlayerId = null;
  await remove(ref(db, `rooms/${roomCode}`));
  roomCode = null; myId = null;
  clearSession();
  showScreen('home');
};

// ── HELPERS ──────────────────────────────────────
function buildOrderedPlayers(players) {
  return Object.entries(players)
    .map(([id, p]) => ({ id, name: p.name, order: p.order ?? 999, joinedAt: p.joinedAt ?? 0, knockedOut: p.knockedOut ?? false, color: p.color ?? null, avatar: p.avatar || '👤' }))
    .sort((a, b) => a.order - b.order || a.joinedAt - b.joinedAt);
}


function renderLobbyList(players) {
  const el = document.getElementById('lobby-player-list');
  el.innerHTML = '';
  players.forEach((p, i) => {
    const dotColor = p.color || 'var(--accent)';
    const dotText  = p.color && isLightColor(p.color) ? '#000' : '#fff';
    const avatarDotStyle = p.color ? `style="border-color:${p.color};"` : '';
    const isDuelWinner = firstPlayerOption === 'duel' && duelWinnerId && p.id === duelWinnerId;
    const isSpot1First = firstPlayerOption === 'spot1' && i === 0;
    const hasCrown = isDuelWinner || isSpot1First;
    const div = document.createElement('div');
    div.className = 'player-item';
    div.setAttribute('draggable', 'false');
    div.dataset.dragId = p.id;
    div.innerHTML = `
      <div class="player-tile-top">
        <div class="player-num" style="background:${dotColor};color:${dotText};">${i+1}</div>
        <div class="player-avatar-wrap">
          <div class="player-avatar" ${avatarDotStyle}>${avatarHTML(p.avatar || '👤', 24)}</div>
          ${p.id === myId ? '<span class="player-badge host">Host</span>' : ''}
        </div>
      </div>
      <div class="player-name">${esc(p.name)}${hasCrown ? ' <span style="font-size:0.85em;">👑</span>' : ''}</div>`;
    // Add kick button for host (can't kick self)
    if (isHost && p.id !== myId) {
      const kickBtn = document.createElement('button');
      kickBtn.className = 'lobby-kick-btn';
      kickBtn.textContent = '×';
      kickBtn.title = 'Remove ' + p.name;
      kickBtn.addEventListener('click', (e) => { e.stopPropagation(); kickPlayerLobby(p.id, p.name); });
      div.appendChild(kickBtn);
    }
    el.appendChild(div);
  });
  makeDraggable(el, async (srcId, destId) => {
    const snap = await get(ref(db, `rooms/${roomCode}/players`));
    if (!snap.exists()) return;
    const ps = buildOrderedPlayers(snap.val());
    const srcIdx  = ps.findIndex(p => p.id === srcId);
    const destIdx = ps.findIndex(p => p.id === destId);
    if (srcIdx < 0 || destIdx < 0) return;
    const updates = {};
    // Simple swap: exchange orders of just these two players
    updates[`rooms/${roomCode}/players/${ps[srcIdx].id}/order`] = destIdx;
    updates[`rooms/${roomCode}/players/${ps[destIdx].id}/order`] = srcIdx;
    await update(ref(db), updates);
  });
  requestAnimationFrame(rescaleCurrentScreen);
  // Sync custom side scrollbars
  requestAnimationFrame(() => initCustomScrollbars());
}

// ── CUSTOM SIDE SCROLLBARS ──────────────────────
let _scrollInited = false;
function initCustomScrollbars() {
  const list = document.getElementById('lobby-player-list');
  const trackL = document.getElementById('scroll-track-left');
  const trackR = document.getElementById('scroll-track-right');
  const thumbL = document.getElementById('scroll-thumb-left');
  const thumbR = document.getElementById('scroll-thumb-right');
  if (!list || !trackL || !trackR) return;

  function updateVisibility() {
    const needsScroll = list.scrollHeight > list.clientHeight + 2;
    trackL.style.display = needsScroll ? '' : 'none';
    trackR.style.display = needsScroll ? '' : 'none';
    if (!needsScroll) return;
    const trackH = list.clientHeight;
    const ratio = list.clientHeight / list.scrollHeight;
    const thumbH = Math.max(30, trackH * ratio);
    [thumbL, thumbR].forEach(t => { t.style.height = thumbH + 'px'; });
    positionThumbs();
  }

  function positionThumbs() {
    const trackH = list.clientHeight;
    const scrollH = list.scrollHeight - list.clientHeight;
    if (scrollH <= 0) return;
    const ratio = list.scrollTop / scrollH;
    const trackAvail = trackH - thumbL.offsetHeight;
    const top = ratio * trackAvail;
    thumbL.style.top = top + 'px';
    thumbR.style.top = top + 'px';
  }

  list.addEventListener('scroll', positionThumbs);
  window.addEventListener('resize', updateVisibility);

  // Drag thumb to scroll
  [thumbL, thumbR].forEach(thumb => {
    let startY = 0, startScroll = 0;
    thumb.addEventListener('touchstart', e => {
      e.preventDefault();
      startY = e.touches[0].clientY;
      startScroll = list.scrollTop;
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onEnd);
      function onMove(ev) {
        ev.preventDefault();
        const dy = ev.touches[0].clientY - startY;
        const trackH = list.clientHeight;
        const scrollH = list.scrollHeight - list.clientHeight;
        const trackAvail = trackH - thumb.offsetHeight;
        if (trackAvail <= 0) return;
        const scrollDelta = (dy / trackAvail) * scrollH;
        list.scrollTop = startScroll + scrollDelta;
      }
      function onEnd() {
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
      }
    });
    // Mouse drag for desktop
    thumb.addEventListener('mousedown', e => {
      e.preventDefault();
      startY = e.clientY;
      startScroll = list.scrollTop;
      document.addEventListener('mousemove', onMMove);
      document.addEventListener('mouseup', onMEnd);
      function onMMove(ev) {
        const dy = ev.clientY - startY;
        const trackH = list.clientHeight;
        const scrollH = list.scrollHeight - list.clientHeight;
        const trackAvail = trackH - thumb.offsetHeight;
        if (trackAvail <= 0) return;
        const scrollDelta = (dy / trackAvail) * scrollH;
        list.scrollTop = startScroll + scrollDelta;
      }
      function onMEnd() {
        document.removeEventListener('mousemove', onMMove);
        document.removeEventListener('mouseup', onMEnd);
      }
    });
  });

  // Click track to page scroll
  [trackL, trackR].forEach(track => {
    track.addEventListener('click', e => {
      if (e.target === track) {
        const rect = track.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const thumbRect = thumbR.getBoundingClientRect();
        const thumbMid = thumbRect.top + thumbRect.height / 2 - rect.top;
        const dir = clickY > thumbMid ? 1 : -1;
        list.scrollTop += dir * list.clientHeight * 0.8;
      }
    });
  });

  updateVisibility();
  if (!_scrollInited) {
    _scrollInited = true;
  }
}

function renderWaitingLobbyList(players) {
  const el = document.getElementById('wl-player-list');
  el.innerHTML = '';
  players.forEach((p, i) => {
    const dotColor = p.color || 'var(--accent)';
    const dotText  = p.color && isLightColor(p.color) ? '#000' : '#fff';
    const avatarDotStyle = p.color ? `style="border-color:${p.color};"` : '';
    const isDuelWinner = duelWinnerId && p.id === duelWinnerId;
    const div = document.createElement('div');
    div.className = 'player-item';
    div.innerHTML = `
      <div class="player-tile-top">
        <div class="player-num" style="background:${dotColor};color:${dotText};">${i+1}</div>
        <div class="player-avatar-wrap">
          <div class="player-avatar" ${avatarDotStyle}>${avatarHTML(p.avatar || '👤', 24)}</div>
          ${p.id === myId ? '<span class="player-badge host">You</span>' : ''}
        </div>
      </div>
      <div class="player-name">${esc(p.name)}${isDuelWinner ? ' <span style="font-size:0.85em;">👑</span>' : ''}</div>`;
    el.appendChild(div);
  });
  requestAnimationFrame(rescaleCurrentScreen);
}

function cleanupListeners() {
  unsubscribers.forEach(fn => fn());
  unsubscribers = [];
}

// ── VICTORY POINTS ENTRY ──────────────────────
let vpSubmitted = false;

let vpDialReady = false;

function showVPEntryOverlay(room) {
  const overlay = document.getElementById('vp-overlay');
  if (!overlay) return;
  overlay.classList.add('show');
  vpSubmitted = false;

  // Reset submit button to end-game VP function
  const submitBtn = overlay.querySelector('.vp-submit-btn');
  if (submitBtn) submitBtn.setAttribute('onclick', 'submitVP()');
  // Reset title
  const titleEl = overlay.querySelector('.vp-overlay-title');
  if (titleEl) titleEl.textContent = 'Enter Your Points';

  const vpReady  = room.vpReady  || {};
  const vpScores = room.vpScores || {};
  const myReady  = vpReady[myId];

  const inputSection   = document.getElementById('vp-input-section');
  const waitingSection = document.getElementById('vp-waiting-section');

  if (myReady) {
    inputSection.style.display   = 'none';
    waitingSection.style.display = 'flex';
    vpDialReady = false;
  } else {
    inputSection.style.display   = '';
    waitingSection.style.display = 'none';
    if (!vpDialReady) {
      vpDialReset();
      vpDialInit();
      vpDialReady = true;
    }
  }

  // Show back buttons for host only (input section or waiting section depending on state)
  const backBtnInput   = document.getElementById('vp-back-btn');
  const backBtnWaiting = document.getElementById('vp-back-btn-waiting');
  if (backBtnInput)   backBtnInput.style.display   = (isHost && !myReady) ? 'block' : 'none';
  if (backBtnWaiting) backBtnWaiting.style.display = (isHost && myReady)  ? 'block' : 'none';

  // Render waiting list
  const waitList = document.getElementById('vp-waiting-list');
  if (waitList) {
    waitList.innerHTML = '';
    localPlayers.forEach(p => {
      const ready = vpReady[p.id];
      const score = vpScores[p.id];
      const dotColor = p.color || 'var(--accent)';
      const div = document.createElement('div');
      div.className = 'vp-waiting-item';
      div.innerHTML = `
        <div class="vp-waiting-dot" style="background:${ready ? '#4ade80' : 'rgba(255,255,255,0.2)'}"></div>
        <span style="color:${ready ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)'}">
          ${esc(p.name)}${ready ? ' ✓' : ' (waiting…)'}
        </span>`;
      waitList.appendChild(div);
    });
  }

  // Host sees Begin button once all ready
  const beginBtn = document.getElementById('vp-begin-btn');
  if (beginBtn && isHost) {
    // Reset onclick to end-game VP ceremony
    beginBtn.setAttribute('onclick', 'beginAfterVP()');
    const allReady = localPlayers.length > 0 && localPlayers.every(p => vpReady[p.id]);
    beginBtn.classList.toggle('show', allReady);
    // Update button text based on what's enabled
    if (featureAwardsEnabled) {
      beginBtn.textContent = '🏆 Begin Achievement Awards';
    } else {
      beginBtn.textContent = '🏆 Begin Victory Ceremony';
    }
  } else if (beginBtn && !isHost) {
    beginBtn.classList.remove('show');
  }
}

window.confirmVPBack = async function() {
  const confirmed = await showConfirm('Go back to room? Players won\'t be able to submit their Victory Points if you leave this screen.');
  if (confirmed) {
    document.getElementById('vp-overlay').classList.remove('show');
    if (db && roomCode) {
      update(ref(db, `rooms/${roomCode}`), { status: 'playing', vpScores: null, vpReady: null });
    }
  }
};

// ── VP ROTARY DIAL ──────────────────────────────
let vpDialValue = 0;
let vpDialDragging = false;
let vpDialLastAngle = 0;
let vpDialAccumulator = 0;

function vpDialInit() {
  const outer = document.getElementById('vp-dial-outer');
  const knob  = document.getElementById('vp-dial-knob');
  const valueEl = document.getElementById('vp-dial-value');
  const center = document.getElementById('vp-dial-center');
  if (!outer || !knob || !valueEl) return;

  vpDialValue = 0;
  vpDialUpdateDisplay();

  function getAngle(e) {
    const rect = outer.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  }

  function onStart(e) {
    e.preventDefault();
    vpDialDragging = true;
    vpDialLastAngle = getAngle(e);
    vpDialAccumulator = 0;
  }

  function onMove(e) {
    if (!vpDialDragging) return;
    e.preventDefault();
    const angle = getAngle(e);
    let delta = angle - vpDialLastAngle;

    // Handle wrap-around at ±180°
    if (delta > 180)  delta -= 360;
    if (delta < -180) delta += 360;

    vpDialLastAngle = angle;

    // Accumulate sub-degree movement — every 7.2 degrees = 1 point (50 per rotation)
    vpDialAccumulator += delta;
    const step = 7.2;
    if (vpDialAccumulator >= step) {
      const pts = Math.floor(vpDialAccumulator / step);
      vpDialValue += pts;
      vpDialAccumulator -= pts * step;
      vpDialUpdateDisplay();
      vpDialFeedback();
    } else if (vpDialAccumulator <= -step) {
      const pts = Math.ceil(vpDialAccumulator / step);
      vpDialValue += pts;
      vpDialAccumulator -= pts * step;
      vpDialUpdateDisplay();
      vpDialFeedback();
    }
  }

  function onEnd() {
    vpDialDragging = false;
    vpDialAccumulator = 0;
  }

  outer.addEventListener('mousedown', onStart);
  outer.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);

  // OK button submits
  if (center) {
    center.addEventListener('click', () => {
      if (vpDialValue !== 0 || document.getElementById('vp-input-section').style.display !== 'none') {
        window.submitVP();
      }
    });
  }
}

function vpDialUpdateDisplay() {
  const valueEl = document.getElementById('vp-dial-value');
  const knob = document.getElementById('vp-dial-knob');
  if (!valueEl) return;

  // Update value text
  valueEl.textContent = (vpDialValue >= 0 ? '+' : '') + vpDialValue;
  valueEl.style.color = vpDialValue > 0 ? '#4ade80' : vpDialValue < 0 ? '#e74c3c' : '#fff';

  // Rotate knob around the track
  // Knob is 38px, top:-19px ▶ knob center at outer circle top edge (y=0)
  // Outer circle center at y=110 ▶ transform-origin Y = 110 - (-19) = 129px
  const angle = vpDialValue * 7.2; // 7.2 degrees per point (50 per rotation)
  knob.style.transform = `translateX(-50%) rotate(${angle}deg)`;
  knob.style.transformOrigin = '50% 129px';
}

function vpDialFeedback() {
  // Mobile: short vibrate. Desktop: short click sound.
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    haptic(5);
  } else {
    vpDialClick();
  }
}

let _vpDialAudioCtx = null;
function vpDialClick() {
  try {
    if (!_vpDialAudioCtx) _vpDialAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _vpDialAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch {}
}

// Reset dial when VP overlay opens
function vpDialReset() {
  vpDialValue = 0;
  vpDialUpdateDisplay();
  const inputSection = document.getElementById('vp-input-section');
  const waitSection  = document.getElementById('vp-waiting-section');
  if (inputSection) inputSection.style.display = '';
  if (waitSection)  waitSection.style.display  = 'none';
}

window.submitVP = async function() {
  if (!db || !roomCode) return;
  const val = vpDialValue;
  const updates = {};
  updates[`rooms/${roomCode}/vpScores/${myId}`]  = val;
  updates[`rooms/${roomCode}/vpReady/${myId}`]   = true;
  await update(ref(db), updates);
  document.getElementById('vp-input-section').style.display   = 'none';
  document.getElementById('vp-waiting-section').style.display = 'flex';
  vpSubmitted = true;
};

window.beginAfterVP = async function() {
  if (!db || !roomCode || !isHost) return;
  if (featureVPEnabled) {
    // Always run VP ceremony first when VP is enabled
    await update(ref(db, `rooms/${roomCode}`), { status: 'vp-ceremony', vpCeremonyStep: 'standby' });
    document.getElementById('vp-overlay').classList.remove('show');
    runVPCeremonyAsHost();
  } else if (featureAwardsEnabled) {
    await update(ref(db, `rooms/${roomCode}`), { status: 'ceremony', ceremonyStep: 'standby' });
    document.getElementById('vp-overlay').classList.remove('show');
    runCeremonyAsHost();
  } else {
    await update(ref(db, `rooms/${roomCode}`), { status: 'gameover' });
    document.getElementById('vp-overlay').classList.remove('show');
    showGameOver();
  }
};

// ── NUDGE DIAL ──────────────────────────────
function ndDialFormatTime(secs) {
  const neg = secs < 0 ? '-' : '';
  const abs = Math.abs(secs);
  if (abs < 60) return neg + abs + 's';
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return neg + (s > 0 ? m + 'm ' + s + 's' : m + 'm');
}

function ndDialInit(outerId, knobId, valueId, hiddenId, initialSecs) {
  const outer = document.getElementById(outerId);
  const knob = document.getElementById(knobId);
  const valueEl = document.getElementById(valueId);
  const hidden = document.getElementById(hiddenId);
  if (!outer || !knob || !valueEl || !hidden) return;

  let val = Math.max(0, Math.min(3600, parseInt(hidden.value) || initialSecs || 60));
  let dragging = false;
  let lastAngle = 0;
  let accumulator = 0;

  function updateDisplay() {
    valueEl.textContent = ndDialFormatTime(val);
    valueEl.style.color = val > 0 ? 'var(--accent)' : '#666';
    const angle = (val - 60) * 12;
    knob.style.transform = 'translateX(-50%) rotate(' + angle + 'deg)';
    knob.style.transformOrigin = '50% 101px';
  }

  function getAngle(e) {
    const rect = outer.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  }

  function onStart(e) {
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    lastAngle = getAngle(e);
    accumulator = 0;
  }

  function onMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const angle = getAngle(e);
    let delta = angle - lastAngle;
    if (delta > 180)  delta -= 360;
    if (delta < -180) delta += 360;
    lastAngle = angle;
    accumulator += delta;
    const step = 60;
    if (accumulator >= step) {
      const ticks = Math.floor(accumulator / step);
      val = Math.min(3600, val + ticks * 5);
      accumulator -= ticks * step;
      hidden.value = val;
      updateDisplay();
      ndDialFeedback();
    } else if (accumulator <= -step) {
      const ticks = Math.floor(accumulator / -step);
      val = Math.max(0, val - ticks * 5);
      accumulator += ticks * step;
      hidden.value = val;
      updateDisplay();
      ndDialFeedback();
    }
  }

  function onEnd() {
    dragging = false;
    accumulator = 0;
  }

  // Clear any previous listeners by removing and re-adding
  outer.removeEventListener('mousedown', outer._ndDown);
  outer.removeEventListener('touchstart', outer._ndDown);
  knob.removeEventListener('mousedown', knob._ndDown);
  knob.removeEventListener('touchstart', knob._ndDown);

  outer._ndDown = onStart;
  knob._ndDown = onStart;
  outer.addEventListener('mousedown', onStart);
  outer.addEventListener('touchstart', onStart, { passive: false });
  knob.addEventListener('mousedown', onStart);
  knob.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);

  updateDisplay();
}

let _ndDialAudioCtx = null;
function ndDialFeedback() {
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    haptic(5);
  } else {
    try {
      if (!_ndDialAudioCtx) _ndDialAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = _ndDialAudioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  }
}

// ── ROUNDS DIAL ──────────────────────────────
function rdDialInit(outerId, knobId, valueId, hiddenId, initialVal) {
  const outer = document.getElementById(outerId);
  const knob = document.getElementById(knobId);
  const valueEl = document.getElementById(valueId);
  const hidden = document.getElementById(hiddenId);
  if (!outer || !knob || !valueEl || !hidden) return;

  const defaultVal = 3;
  let val = Math.max(1, Math.min(99, parseInt(hidden.value) || initialVal || defaultVal));
  let dragging = false;
  let lastAngle = 0;
  let accumulator = 0;

  function updateDisplay() {
    valueEl.textContent = val;
    const angle = (val - defaultVal) * 30;
    knob.style.transform = 'translateX(-50%) rotate(' + angle + 'deg)';
    knob.style.transformOrigin = '50% 101px';
  }

  function getAngle(e) {
    const rect = outer.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  }

  function onStart(e) {
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    lastAngle = getAngle(e);
    accumulator = 0;
  }

  function onMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const angle = getAngle(e);
    let delta = angle - lastAngle;
    if (delta > 180)  delta -= 360;
    if (delta < -180) delta += 360;
    lastAngle = angle;
    accumulator += delta;
    const step = 30;
    if (accumulator >= step) {
      val = Math.min(99, val + 1);
      accumulator -= step;
      hidden.value = val;
      updateDisplay();
      ndDialFeedback();
    } else if (accumulator <= -step) {
      val = Math.max(1, val - 1);
      accumulator += step;
      hidden.value = val;
      updateDisplay();
      ndDialFeedback();
    }
  }

  function onEnd() {
    dragging = false;
    accumulator = 0;
  }

  outer.removeEventListener('mousedown', outer._rdDown);
  outer.removeEventListener('touchstart', outer._rdDown);
  knob.removeEventListener('mousedown', knob._rdDown);
  knob.removeEventListener('touchstart', knob._rdDown);

  outer._rdDown = onStart;
  knob._rdDown = onStart;
  outer.addEventListener('mousedown', onStart);
  outer.addEventListener('touchstart', onStart, { passive: false });
  knob.addEventListener('mousedown', onStart);
  knob.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);

  updateDisplay();
}

// ── PER-ROUND VP ENTRY (Rounds + VP combined) ─────
let roundVPSubmitted = false;

function showRoundVPEntryOverlay(room) {
  const overlay = document.getElementById('vp-overlay');
  if (!overlay) return;
  overlay.classList.add('show');
  roundVPSubmitted = false;

  // Update title to show round number
  const titleEl = overlay.querySelector('.vp-overlay-title');
  if (titleEl) titleEl.textContent = `Round ${currentRound} — Enter Your Points`;

  // Swap submit button to round VP function
  const submitBtn = overlay.querySelector('.vp-submit-btn');
  if (submitBtn) submitBtn.setAttribute('onclick', 'submitRoundVP()');

  const vpRoundReady  = room.vpRoundReady  || {};
  const myReady  = vpRoundReady[myId];

  const inputSection   = document.getElementById('vp-input-section');
  const waitingSection = document.getElementById('vp-waiting-section');

  if (myReady) {
    inputSection.style.display   = 'none';
    waitingSection.style.display = 'flex';
    vpDialReady = false;
  } else {
    inputSection.style.display   = '';
    waitingSection.style.display = 'none';
    if (!vpDialReady) {
      vpDialReset();
      vpDialInit();
      vpDialReady = true;
    }
  }

  // Show back buttons for host only (input section or waiting section depending on state)
  const backBtnInput   = document.getElementById('vp-back-btn');
  const backBtnWaiting = document.getElementById('vp-back-btn-waiting');
  if (backBtnInput)   backBtnInput.style.display   = (isHost && !myReady) ? 'block' : 'none';
  if (backBtnWaiting) backBtnWaiting.style.display = (isHost && myReady)  ? 'block' : 'none';

  // Render waiting list
  const waitList = document.getElementById('vp-waiting-list');
  if (waitList) {
    waitList.innerHTML = '';
    localPlayers.forEach(p => {
      const ready = vpRoundReady[p.id];
      const dotColor = p.color || 'var(--accent)';
      const div = document.createElement('div');
      div.className = 'vp-waiting-item';
      div.innerHTML = `
        <div class="vp-waiting-dot" style="background:${ready ? '#4ade80' : 'rgba(255,255,255,0.2)'}"></div>
        <span style="color:${ready ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)'}">
          ${esc(p.name)}${ready ? ' ✓' : ' (waiting…)'}
        </span>`;
      waitList.appendChild(div);
    });
  }

  // Host sees "Next Round" or "Final Results" button once all ready
  const beginBtn = document.getElementById('vp-begin-btn');
  if (beginBtn && isHost) {
    const allReady = localPlayers.length > 0 && localPlayers.every(p => vpRoundReady[p.id]);
    beginBtn.classList.toggle('show', allReady);
    const isFinalRound = currentRound >= roundsTotal;
    beginBtn.textContent = isFinalRound ? '🏆 Final Results' : '➡️ Next Round';
    beginBtn.onclick = isFinalRound ? () => nextRoundAfterVP(true) : () => nextRoundAfterVP(false);
  } else if (beginBtn && !isHost) {
    beginBtn.classList.remove('show');
  }
}

window.submitRoundVP = async function() {
  if (!db || !roomCode) return;
  const val = vpDialValue;
  const updates = {};
  updates[`rooms/${roomCode}/vpRoundDraft/${myId}`] = val;
  updates[`rooms/${roomCode}/vpRoundReady/${myId}`]  = true;
  await update(ref(db), updates);
  document.getElementById('vp-input-section').style.display   = 'none';
  document.getElementById('vp-waiting-section').style.display = 'flex';
  roundVPSubmitted = true;
};

window.nextRoundAfterVP = async function(isFinalRound) {
  if (!db || !roomCode || !isHost) return;

  // Collect all round scores from Firebase
  const snap = await get(ref(db, `rooms/${roomCode}`));
  if (!snap.exists()) return;
  const room = snap.val();
  const vpRoundDraft = room.vpRoundDraft || {};

  // Save this round's scores into vpRoundScores/{roundNumber}
  const updates = {};
  updates[`rooms/${roomCode}/vpRoundScores/${currentRound}`] = vpRoundDraft;
  updates[`rooms/${roomCode}/vpRoundReady`] = null;
  updates[`rooms/${roomCode}/vpRoundDraft`] = null;

  if (isFinalRound) {
    // Compute final VP totals from all rounds
    const roundScores = room.vpRoundScores || {};
    // Include the round we just saved
    roundScores[currentRound] = vpRoundDraft;

    const finalScores = {};
    localPlayers.forEach(p => { finalScores[p.id] = 0; });
    Object.values(roundScores).forEach(roundData => {
      Object.entries(roundData).forEach(([pid, score]) => {
        if (finalScores[pid] == null) finalScores[pid] = 0;
        finalScores[pid] += (parseInt(score) || 0);
      });
    });

    // Write final totals to vpScores and transition to ceremony
    updates[`rooms/${roomCode}/vpScores`] = finalScores;
    updates[`rooms/${roomCode}/vpReady`] = null;
    updates[`rooms/${roomCode}/status`] = featureAwardsEnabled ? 'ceremony' : 'vp-ceremony';
    if (!featureAwardsEnabled) {
      updates[`rooms/${roomCode}/vpCeremonyStep`] = 'standby';
    } else {
      updates[`rooms/${roomCode}/ceremonyStep`] = 'standby';
    }

    await update(ref(db), updates);
    document.getElementById('vp-overlay').classList.remove('show');

    if (featureAwardsEnabled) {
      runCeremonyAsHost();
    } else {
      runVPCeremonyAsHost();
    }
  } else {
    // Advance to next round
    const nextRound = currentRound + 1;
    updates[`rooms/${roomCode}/currentRound`] = nextRound;
    updates[`rooms/${roomCode}/status`] = 'playing';

    // Reset round timer if Timers feature is on
    if (featureTimersEnabled && timerCfg.round) {
      timerRound = 0;
      updates[`rooms/${roomCode}/timerRound`] = 0;
      renderTimers();
    }

    await update(ref(db), updates);
    document.getElementById('vp-overlay').classList.remove('show');
  }
};

// ── VP-ONLY CEREMONY ──────────────────────────────
async function runVPCeremonyAsHost() {
  if (!db || !roomCode) return;
  ceremonyAborted = false;
  const snap = await get(ref(db, `rooms/${roomCode}`));
  if (!snap.exists()) return;
  const room = snap.val();
  const players = buildOrderedPlayers(room.players || {});
  const vpScores = room.vpScores || {};

  // Sort players by VP (highest or lowest wins)
  const sorted = players
    .map(p => ({ ...p, vp: vpScores[p.id] ?? 0 }))
    .sort((a, b) => vpHighestWins ? (b.vp - a.vp) : (a.vp - b.vp));

  if (sorted.length === 0) {
    await update(ref(db, `rooms/${roomCode}`), { status: 'gameover', vpCeremonyStep: 'gameover' });
    return;
  }

  const winner = sorted[0];

  // Phase 1: Standby — "And the winner is..."
  await update(ref(db, `rooms/${roomCode}`), {
    vpCeremonyStep: 'announce',
    vpCeremonyWinner: {
      name: winner.name, color: winner.color || '#7c3aed', id: winner.id
    }
  });
  speakText('And the winner is...');
  await sleepAbortable(4500);
  if (ceremonyAborted) return;

  // Phase 2: Reveal — show winner name + fireworks
  await update(ref(db, `rooms/${roomCode}`), { vpCeremonyStep: 'reveal' });
  speakText('Player ' + (players.findIndex(p => p.id === winner.id) + 1) + '! ' + winner.name);
  await sleepAbortable(5000);
  if (ceremonyAborted) return;

  // Phase 3: Rankings board — stays until host closes
  await update(ref(db, `rooms/${roomCode}`), {
    vpCeremonyStep: 'rankings',
    vpCeremonyRankings: sorted.map((p, i) => ({
      place: i + 1, name: p.name, color: p.color || 'var(--accent)',
      avatar: p.avatar || '👤', vp: p.vp
    }))
  });
  // No auto-transition — host clicks Done to end game
}

// Handle VP ceremony state on non-host devices
function handleVPCeremonyState(room) {
  const step = room.vpCeremonyStep || 'standby';
  const winner = room.vpCeremonyWinner || null;
  const rankings = room.vpCeremonyRankings || [];

  if (step === 'gameover') {
    hideAllAwardOverlays();
    showGameOver();
    return;
  }

  if (step === 'standby' || step === 'announce') {
    hideAllAwardOverlays();
    showVPStandby(step === 'announce');
    return;
  }

  if (step === 'reveal' && winner) {
    hideAllAwardOverlays();
    if (winner.id === myId) {
      showVPWinnerReveal(winner);
    } else {
      // Non-winners: black out whatever screen is currently active
      const sa = document.querySelector('.screen.active');
      if (sa) {
        sa.classList.add('vp-ceremony-blackout');
        sa.style.zIndex = '8000';
        sa.style.background = '#000';
        sa.querySelectorAll(':scope > *').forEach(ch => {
          ch.style.setProperty('display', 'none', 'important');
          ch.style.setProperty('visibility', 'hidden', 'important');
          ch.style.setProperty('opacity', '0', 'important');
        });
      }
      // Full-screen black cover on <html> to avoid body stacking issues
      let cover = document.getElementById('vp-blackout-cover');
      if (!cover) {
        cover = document.createElement('div');
        cover.id = 'vp-blackout-cover';
        cover.className = 'vp-blackout-cover';
        document.documentElement.appendChild(cover);
      }
    }
    return;
  }

  if (step === 'rankings' && rankings.length > 0) {
    hideAllAwardOverlays();
    showVPRankings(rankings);
    return;
  }
}

function showVPStandby(announcing) {
  const el = document.getElementById('vp-standby');
  const txt = document.getElementById('vp-standby-text');
  const skipBtn = document.getElementById('vp-skip-btn');
  if (txt) {
    txt.textContent = announcing ? 'And the winner is...' : 'Victory Ceremony';
    if (announcing) {
      txt.style.animation = 'vpPulse 1.2s ease-in-out infinite alternate';
    } else {
      txt.style.animation = '';
    }
  }
  if (skipBtn) skipBtn.style.display = isHost ? 'block' : 'none';
  el.classList.add('show');
}

function showVPWinnerReveal(winner) {
  const reveal = document.getElementById('vp-reveal-winner');
  const nameEl = document.getElementById('vp-win-name');
  const numEl = document.getElementById('vp-win-num');
  const idx = localPlayers.findIndex(p => p.id === winner.id);
  if (nameEl) {
    nameEl.textContent = winner.name;
    nameEl.style.color = winner.color;
  }
  if (numEl) numEl.textContent = 'Player ' + (idx >= 0 ? idx + 1 : '?');
  // Light up the entire background with winner's color
  reveal.style.background = `radial-gradient(ellipse at center, ${winner.color}cc 0%, ${winner.color}55 35%, ${winner.color}18 60%, #050510 100%)`;
  // Hide game UI behind the overlay
  const sa = document.querySelector('.screen.active');
  if (sa) {
    sa.classList.add('vp-ceremony-blackout');
    sa.style.zIndex = '0';
    sa.style.background = '#000';
    sa.querySelectorAll(':scope > *').forEach(ch => {
      ch.style.setProperty('display', 'none', 'important');
      ch.style.setProperty('visibility', 'hidden', 'important');
      ch.style.setProperty('opacity', '0', 'important');
    });
  }
  reveal.classList.add('show');
  startFireworksForCanvas('vp-canvas-winner', winner.color, true);
}

function showVPSpectatorReveal(winner) {
  const reveal = document.getElementById('vp-reveal-spectator');
  const nameEl = document.getElementById('vp-spec-name');
  const numEl = document.getElementById('vp-spec-num');
  const idx = localPlayers.findIndex(p => p.id === winner.id);
  if (nameEl) {
    nameEl.textContent = winner.name;
    nameEl.style.color = winner.color;
  }
  if (numEl) numEl.textContent = 'Player ' + (idx >= 0 ? idx + 1 : '?');
  reveal.classList.add('show');
}

function showVPRankings(rankings) {
  const el = document.getElementById('vp-rankings');
  const list = document.getElementById('vp-rankings-list');
  if (!list) return;
  list.innerHTML = '';
  const medals = ['🥇', '🥈', '🥉'];
  const placeLabels = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
  rankings.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'vp-rankings-item';
    div.style.animationDelay = (i * 0.12) + 's';
    div.innerHTML = `
      <div class="vp-rankings-place">${medals[i] || placeLabels[i] || (i+1)+'th'}</div>
      <div class="vp-rankings-avatar" style="border-color:${p.color};">${avatarHTML(p.avatar, 28)}</div>
      <div class="vp-rankings-name" style="color:${p.color};">${esc(p.name)}</div>
      <div class="vp-rankings-score">${p.vp} pt${p.vp !== 1 ? 's' : ''}</div>`;
    list.appendChild(div);
  });
  const closeBtn = document.getElementById('vp-rankings-close');
  const waitMsg = document.getElementById('vp-rankings-wait');
  if (closeBtn) closeBtn.style.display = isHost ? 'block' : 'none';
  if (waitMsg) waitMsg.style.display = isHost ? 'none' : 'block';
  el.classList.add('show');
}

window.skipVPCeremony = async function() {
  if (!db || !roomCode || !isHost) return;
  ceremonyAborted = true;
  window.speechSynthesis && window.speechSynthesis.cancel();
  stopFireworks();
  await update(ref(db, `rooms/${roomCode}`), { status: 'gameover', vpCeremonyStep: 'gameover' });
};

window.closeVPRankings = async function() {
  if (!db || !roomCode || !isHost) return;
  hideAllAwardOverlays();
  if (featureAwardsEnabled) {
    // After VP ceremony, run Awards ceremony
    await update(ref(db, `rooms/${roomCode}`), { status: 'ceremony', ceremonyStep: 'standby' });
    runCeremonyAsHost();
  } else {
    await update(ref(db, `rooms/${roomCode}`), { status: 'gameover', vpCeremonyStep: 'gameover' });
  }
};

// ── DRAG-TO-REORDER ──────────────────────────────
// Shared drag logic for both lobby list and manage list
function makeDraggable(listEl, onReorder) {
  let dragSrc = null;
  let touchDragSrc = null;
  let ghostEl = null;

  function createGhost(item, x, y) {
    const rect = item.getBoundingClientRect();
    ghostEl = item.cloneNode(true);
    ghostEl.classList.add('drag-ghost');
    ghostEl.style.width = rect.width + 'px';
    ghostEl.style.left = (x - rect.width / 2) + 'px';
    ghostEl.style.top = (y - rect.height / 2) + 'px';
    document.body.appendChild(ghostEl);
  }

  function moveGhost(x, y) {
    if (!ghostEl) return;
    const rect = ghostEl.getBoundingClientRect();
    ghostEl.style.left = (x - rect.width / 2) + 'px';
    ghostEl.style.top = (y - rect.height / 2) + 'px';
  }

  function removeGhost() {
    if (ghostEl) { ghostEl.remove(); ghostEl = null; }
  }

  listEl.querySelectorAll('[data-drag-id]').forEach(item => {
    const handle = item.querySelector('.drag-handle, .manage-drag-handle') || item;

    // ── HTML5 drag (desktop/mouse) ──
    handle.addEventListener('mousedown', () => { item.setAttribute('draggable', 'true'); });
    document.addEventListener('mouseup', () => {
      listEl.querySelectorAll('[data-drag-id]').forEach(i => i.setAttribute('draggable', 'false'));
    }, { once: false });

    item.addEventListener('dragstart', e => {
      dragSrc = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      listEl.querySelectorAll('[data-drag-id]').forEach(i => i.classList.remove('drag-over'));
      dragSrc = null;
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragSrc && dragSrc !== item) {
        listEl.querySelectorAll('[data-drag-id]').forEach(i => i.classList.remove('drag-over'));
        item.classList.add('drag-over');
      }
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (dragSrc && dragSrc !== item) {
        const srcId  = dragSrc.dataset.dragId;
        const destId = item.dataset.dragId;
        dragSrc = null;
        onReorder(srcId, destId);
      }
    });

    // ── Touch drag (immediate, with ghost) ──
    handle.addEventListener('touchstart', e => {
      if (touchDragSrc) return; // already dragging another tile
      touchDragSrc = item;
      item.classList.add('dragging');
      const t = e.touches[0];
      createGhost(item, t.clientX, t.clientY);
    }, { passive: true });

    handle.addEventListener('touchmove', e => {
      if (!touchDragSrc) return;
      e.preventDefault();
      const touch = e.touches[0];
      moveGhost(touch.clientX, touch.clientY);
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const target = el && el.closest('[data-drag-id]');
      listEl.querySelectorAll('[data-drag-id]').forEach(i => i.classList.remove('drag-over'));
      if (target && target !== touchDragSrc && listEl.contains(target)) {
        target.classList.add('drag-over');
      }
    }, { passive: false });

    handle.addEventListener('touchend', e => {
      removeGhost();
      if (!touchDragSrc) return;
      const touch = e.changedTouches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const target = el && el.closest('[data-drag-id]');
      listEl.querySelectorAll('[data-drag-id]').forEach(i => {
        i.classList.remove('drag-over');
        i.classList.remove('dragging');
      });
      if (target && target !== touchDragSrc && listEl.contains(target)) {
        const srcId  = touchDragSrc.dataset.dragId;
        const destId = target.dataset.dragId;
        touchDragSrc = null;
        onReorder(srcId, destId);
      } else {
        touchDragSrc = null;
      }
    }, { passive: true });

    handle.addEventListener('touchcancel', () => {
      removeGhost();
      touchDragSrc = null;
      listEl.querySelectorAll('[data-drag-id]').forEach(i => {
        i.classList.remove('drag-over');
        i.classList.remove('dragging');
      });
    });
  });
}

// ── THEME SYSTEM ─────────────────────────────
const NAMED_THEMES = ['default','8bit','cyberpunk','fantasy','galaxy','forest','ocean','sunset','steampunk','vaporwave','nord','dracula','gothic','halloween'];

function applyTheme(isLight) {
  document.body.classList.toggle('light-mode', isLight);
  const knob = document.getElementById('theme-knob');
  if (knob) knob.style.transform = isLight ? 'translateX(40px)' : 'translateX(0)';
  updateDirArrows();
}

function updateDirArrows() {
  const isLight = document.body.classList.contains('light-mode');
  const prefix = isLight ? 'Black' : 'White';
  document.querySelectorAll('.dir-arrow').forEach(img => {
    const name = img.getAttribute('data-arrow');
    if (!name) return;
    const target = 'img/svg/' + prefix + name + '.svg';
    if (img.getAttribute('src') !== target) img.setAttribute('src', target);
  });
}

function applyFullTheme(themeName, isLight) {
  NAMED_THEMES.forEach(t => document.body.classList.remove('theme-' + t));
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (themeName && themeName !== 'default') {
    document.body.classList.add('theme-' + themeName);
    applyTheme(false);
    if (toggleBtn) toggleBtn.style.display = 'none';
  } else {
    applyTheme(isLight);
    if (toggleBtn) toggleBtn.style.display = '';
  }
}

window.toggleTheme = function() {
  const isLight = !document.body.classList.contains('light-mode');
  localStorage.setItem('sk_theme', isLight ? 'light' : 'dark');
  const namedTheme = localStorage.getItem('sk_named_theme') || 'default';
  if (namedTheme === 'default') applyFullTheme('default', isLight);
  // Sync to Firebase
  const uid = currentUser?.uid;
  if (uid && db) {
    set(ref(db, `users/${uid}/theme`), isLight ? 'light' : 'dark').catch(() => {});
    set(ref(db, `users/${uid}/namedTheme`), namedTheme).catch(() => {});
  }
};

window.openThemesOverlay = function() {
  const current = localStorage.getItem('sk_named_theme') || 'default';
  document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('selected'));
  const activeOpt = document.getElementById('theme-opt-' + current);
  if (activeOpt) {
    activeOpt.classList.add('selected');
    const radio = activeOpt.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  }
  document.getElementById('themes-overlay').classList.add('show');
};

window.closeThemesOverlay = function() {
  document.getElementById('themes-overlay').classList.remove('show');
};

window.openMyAwards = function() {
  const list = document.getElementById('awards-history-list');
  if (!list) return;
  list.innerHTML = '';
  const uid = currentUser?.uid || '';
  const awards = uid ? JSON.parse(localStorage.getItem('sk_awards_' + uid) || '[]') : [];
  if (awards.length === 0) {
    list.innerHTML = '<div class="awards-history-empty">No awards yet — play a game with Achievement Awards enabled to earn some!</div>';
  } else {
    awards.slice().reverse().forEach(a => {
      const dateStr = a.date ? new Date(a.date).toLocaleDateString() : '';
      list.innerHTML += '<div class="awards-history-item">' +
        '<div class="awards-history-trophy">' + (a.trophy || '🏆') + '</div>' +
        '<div class="awards-history-info">' +
          '<div class="awards-history-category">' + esc(a.category || 'Award') + '</div>' +
          '<div class="awards-history-stat">' + esc(a.stat || '') + '</div>' +
        '</div>' +
        '<div class="awards-history-date">' + dateStr + '</div>' +
      '</div>';
    });
  }
  document.getElementById('my-awards-overlay').classList.add('show');
};

window.closeMyAwards = function() {
  document.getElementById('my-awards-overlay').classList.remove('show');
};

window.selectTheme = function(themeName) {
  localStorage.setItem('sk_named_theme', themeName);
  const isLight = document.body.classList.contains('light-mode');
  applyFullTheme(themeName, isLight);
  document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('selected'));
  const activeOpt = document.getElementById('theme-opt-' + themeName);
  if (activeOpt) {
    activeOpt.classList.add('selected');
    const radio = activeOpt.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  }
  // Sync to Firebase
  const uid = currentUser?.uid;
  if (uid && db) set(ref(db, `users/${uid}/namedTheme`), themeName).catch(() => {});
};

// Apply saved theme on load
(function() {
  const saved = localStorage.getItem('sk_theme');
  const namedTheme = localStorage.getItem('sk_named_theme') || 'default';
  applyFullTheme(namedTheme, saved === 'light');
})();

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── D&D TURN COMPONENTS ──────────────────────
const DND_CELLS = ['movement','action','bonus','object'];

window.showDndOverlay = function() {
  // Reset all cells to green (unused)
  DND_CELLS.forEach(id => {
    const el = document.getElementById('dnd-' + id);
    if (el) el.classList.remove('used');
  });
  const overlay = document.getElementById('dnd-overlay');
  if (overlay) overlay.style.display = '';
  const confirm = document.getElementById('dnd-confirm-overlay');
  if (confirm) confirm.style.display = 'none';
};

window.dndToggle = function(id) {
  const el = document.getElementById('dnd-' + id);
  if (!el) return;
  el.classList.toggle('used');
  // Check if all 4 are used
  const allUsed = DND_CELLS.every(k => document.getElementById('dnd-' + k)?.classList.contains('used'));
  if (allUsed) {
    // Show confirmation dialog
    const confirm = document.getElementById('dnd-confirm-overlay');
    if (confirm) confirm.style.display = 'flex';
  }
};

window.dndConfirmNo = function() {
  // Dismiss confirm, go back to the grid
  const confirm = document.getElementById('dnd-confirm-overlay');
  if (confirm) confirm.style.display = 'none';
};

window.dndConfirmYes = function() {
  // Hide both overlays — player is done, normal pass turn screen shows
  const overlay = document.getElementById('dnd-overlay');
  const confirm = document.getElementById('dnd-confirm-overlay');
  if (overlay) overlay.style.display = 'none';
  if (confirm) confirm.style.display = 'none';
};

// ── GLOBAL ERROR HANDLER ─────────────────────────
function showErrorToast(msg) {
  const t = document.getElementById('error-toast');
  if (!t) return;
  t.textContent = msg || 'Something went wrong. Try refreshing.';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 5000);
}
window.showErrorToast = showErrorToast;

window.onerror = function(msg, src, line, col, err) {
  console.error('[SideKick Error]', msg, src, line, col, err);
  showErrorToast('Something went wrong. Try refreshing.');
  return false;
};
window.addEventListener('unhandledrejection', function(e) {
  console.error('[SideKick Unhandled]', e.reason);
  showErrorToast('Connection issue. Check your network and try again.');
});

// ── REUSABLE DIALOG SYSTEM ───────────────────────
let appDialogResolve = null;
let appDialogType = 'alert';
window.appDialogResolve = function(val) {
  const overlay = document.getElementById('app-dialog-overlay');
  if (overlay) overlay.classList.remove('show');
  if (appDialogResolve) {
    let out = val;
    if (appDialogType === 'prompt') {
      const input = document.getElementById('app-dialog-input');
      out = val ? (input ? input.value : '') : null;
    }
    appDialogResolve(out);
    appDialogResolve = null;
  }
};

function showDialog(type, message, defaultVal) {
  return new Promise(resolve => {
    appDialogResolve = resolve;
    appDialogType = type;
    const overlay = document.getElementById('app-dialog-overlay');
    const msgEl = document.getElementById('app-dialog-msg');
    const input = document.getElementById('app-dialog-input');
    const cancelBtn = document.getElementById('app-dialog-cancel');
    const okBtn = document.getElementById('app-dialog-ok');
    if (!overlay || !msgEl) { resolve(null); return; }
    msgEl.textContent = message;
    if (type === 'prompt') {
      input.style.display = '';
      input.value = defaultVal || '';
      input.focus();
    } else {
      input.style.display = 'none';
    }
    cancelBtn.style.display = type === 'alert' ? 'none' : '';
    okBtn.textContent = type === 'prompt' ? 'Save' : 'OK';
    overlay.classList.add('show');
    if (type === 'prompt') setTimeout(() => input.focus(), 100);
  });
}
window.showAlert = function(msg) { return showDialog('alert', msg); };
window.showConfirm = function(msg) { return showDialog('confirm', msg); };
window.showPrompt = function(msg, def) { return showDialog('prompt', msg, def); };
</script>

<script>
// Password gate — classic script runs during parse for instant hide
(function() {
  var gate = document.getElementById('password-gate');
  if (!gate) return;
  var stored = null;
  try { stored = localStorage.getItem('sk_password'); } catch {}
  if (stored) gate.classList.add('hidden');
})();
</script>

<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
      // Periodically check for updates while the app is open (every 30s)
      setInterval(() => { reg.update().catch(() => {}); }, 30000);

      let refreshing = false;
      // When the new worker takes control, reload to apply the update.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      const promptUpdate = () => {
        showConfirm('A new version of SideKick is available. Reload now?').then(ok => {
          if (ok && reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      };

      // If a new worker is already waiting (e.g. page opened before we attached)
      if (reg.waiting) {
        promptUpdate();
        return;
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            promptUpdate();
          }
        });
      });
    }).catch(() => {});
  });
}

// PWA install prompt
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  try { if (localStorage.getItem('sk_install_dismissed') === '1') return; } catch {}
  document.getElementById('install-banner').style.display = 'flex';
});

window.installPWA = function() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(() => {
    deferredPrompt = null;
    document.getElementById('install-banner').style.display = 'none';
  });
};

window.dismissInstall = function() {
  document.getElementById('install-banner').style.display = 'none';
  try { localStorage.setItem('sk_install_dismissed', '1'); } catch {}
};

</script>



<!-- ═══════════════════════════════════════════ -->
<!--  HOST MANAGE PLAYERS PANEL                  -->
<!-- ═══════════════════════════════════════════ -->
<!-- SETTINGS OVERLAY (⚙️ gear — all players) -->
<div class="manage-overlay" id="settings-overlay">
  <div class="manage-card" style="max-width:300px; padding:1.25rem;">
    <div style="font-size:1rem; font-weight:800; color:var(--text); text-align:center; margin-bottom:1.1rem;">⚙️ Settings</div>

    <!-- Sound -->
    <div class="ctrl-row" style="justify-content:space-between; margin-bottom:0.75rem;">
      <span style="font-size:0.9rem; font-weight:600; color:var(--text);">Sound</span>
      <button class="ctrl-btn active-ctrl" id="sound-toggle" onclick="toggleSound()" title="Toggle Sound" style="width:48px;height:48px;font-size:1.1rem;">🔊</button>
    </div>
    <div style="height:1px; background:var(--border); margin-bottom:0.75rem;"></div>

    <!-- Room Code -->
    <div style="text-align:center; margin-bottom:1.1rem;">
      <div style="font-size:0.72rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.25rem;">Room Code</div>
      <span id="settings-overlay-room-code" style="font-family:'Courier New',monospace;font-size:1.6rem;font-weight:800;color:var(--accent-light);letter-spacing:0.2em;">----</span>
    </div>

    <button class="btn-secondary" style="width:100%;" onclick="closeSettingsOverlay()">✕ Close</button>
  </div>
</div>

<div class="manage-overlay" id="manage-overlay">
  <div class="manage-card" style="max-width:480px; padding:1.25rem;">
    <div style="text-align:center; margin-bottom:0.75rem;">
      <div style="font-size:1.05rem; font-weight:800; color:var(--text);">👥 Manage Players</div>
    </div>
    <div id="manage-player-list" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(115px, 1fr)); gap:0.5rem;"></div>
    <div style="margin-top:1rem;">
      <button class="btn-secondary btn-sm" onclick="closeManagePanel()" style="width:100%;">Done</button>
    </div>
  </div>
</div>

<!-- HOST CROWN MENU OVERLAY -->
<div class="manage-overlay" id="host-crown-overlay">
  <div class="manage-card" style="max-width:300px; padding:1.25rem;">
    <div style="text-align:center; padding-bottom:0.75rem; border-bottom:1px solid var(--border); margin-bottom:0.75rem;">
      <div style="font-size:0.68rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em;">Room Code</div>
      <div style="font-family:'Courier New',monospace; font-size:1.5rem; font-weight:800; color:var(--accent-light); letter-spacing:0.15em;" id="host-crown-room-code">----</div>
    </div>
    <button class="host-menu-item" style="width:100%; border-radius:10px; margin-bottom:0.4rem;" onclick="closeHostCrownMenu(); openManagePanel()">👥 Manage Players</button>
    <button class="host-menu-item" style="width:100%; border-radius:10px; margin-bottom:0.4rem;" onclick="closeHostCrownMenu(); openMidGameSettings()">⚙️ Room Settings</button>
    <button class="host-menu-item" style="width:100%; border-radius:10px; margin-bottom:0.4rem;" onclick="closeHostCrownMenu(); openToolsOverlay()">🧰 Tools</button>
    <button class="host-menu-item" id="host-crown-endround-btn" style="width:100%; border-radius:10px; margin-bottom:0.4rem;" onclick="closeHostCrownMenu(); hostMenuAction('end-round')">🔁 End Round</button>
    <button class="host-menu-item" style="width:100%; border-radius:10px; margin-bottom:0.4rem;" onclick="closeHostCrownMenu(); hostMenuAction('save-game')">💾 Save Game</button>
    <button class="host-menu-item" style="width:100%; border-radius:10px; margin-bottom:0.4rem;" onclick="closeHostCrownMenu(); startNewGameSetup()">🔄 Start New Game</button>
    <button class="host-menu-item danger" style="width:100%; border-radius:10px; margin-bottom:0.75rem;" onclick="closeHostCrownMenu(); hostMenuAction('end-game')">🏆 End Game</button>
    <button class="btn-secondary btn-sm" style="width:100%;" onclick="closeHostCrownMenu()">✕ Close</button>
  </div>
</div>
<!-- Nudge Settings Overlay (mid-game) -->
<div class="feature-settings-overlay" id="mg-nudge-settings-overlay">
  <div class="manage-card" style="max-width:320px; padding:1.25rem;">
    <div style="font-size:1rem; font-weight:800; color:var(--text); text-align:center; margin-bottom:1rem;">👉 Nudge Settings</div>
    <div style="font-size:0.75rem;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:0.07em;">Unlock After</div>
    <div class="nd-dial-wrapper">
      <div class="nd-dial-value" id="mg-nd-dial-value">1m</div>
      <div class="nd-dial-outer" id="mg-nd-dial-outer">
        <div class="nd-dial-track" id="mg-nd-dial-track">
          <div class="nd-dial-knob" id="mg-nd-dial-knob"></div>
          <div class="nd-dial-minus">−</div>
          <div class="nd-dial-plus">+</div>
        </div>
        <div class="nd-dial-center" id="mg-nd-dial-center"></div>
      </div>
      <div class="nd-dial-label">rotate to adjust</div>
    </div>
    <input type="hidden" id="mg-nudge-delay" value="60">
    <div style="font-size:0.75rem;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:0.07em;text-align:center;">Nudge Mode</div>
    <div class="turn-mode-btns" style="margin-top:0.5rem;">
      <button class="turn-mode-btn selected" id="mg-nd-mode-multi" onclick="selectNdMode('multi', true)">
        <span class="tm-icon">👉</span>
        Multi Nudge
        <span style="font-size:0.72rem;color:var(--muted);font-weight:400;margin-top:2px;">Tap as many times as you want</span>
      </button>
      <button class="turn-mode-btn" id="mg-nd-mode-single" onclick="selectNdMode('single', true)">
        <span class="tm-icon">☝️</span>
        Single Nudge
        <span style="font-size:0.72rem;color:var(--muted);font-weight:400;margin-top:2px;">One nudge per turn per player</span>
      </button>
    </div>
    <input type="radio" name="mg-nudge-mode" value="multi" checked style="display:none;">
    <input type="radio" name="mg-nudge-mode" value="single" style="display:none;">
    <button class="info-modal-close" onclick="closeNudgeOverlay()" style="width:100%;">Done</button>
  </div>
</div>
<!-- Rounds Settings Overlay (mid-game) -->
<div class="feature-settings-overlay" id="mg-rounds-settings-overlay">
  <div class="manage-card" style="max-width:320px; padding:1.25rem;">
    <div style="font-size:1rem; font-weight:800; color:var(--text); text-align:center; margin-bottom:1rem;">🔢 Rounds Settings</div>
    <div style="font-size:0.75rem;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:0.07em;">Total Rounds</div>
    <div class="nd-dial-wrapper">
      <div class="nd-dial-value" id="mg-rd-dial-value" style="color:var(--accent);">3</div>
      <div class="nd-dial-outer" id="mg-rd-dial-outer">
        <div class="nd-dial-track" id="mg-rd-dial-track">
          <div class="nd-dial-knob" id="mg-rd-dial-knob"></div>
          <div class="nd-dial-minus">−</div>
          <div class="nd-dial-plus">+</div>
        </div>
        <div class="nd-dial-center" id="mg-rd-dial-center"></div>
      </div>
      <div class="nd-dial-label">rotate to adjust</div>
    </div>
    <input type="hidden" id="mg-rounds-total" value="3">
    <div style="font-size:0.72rem;color:var(--muted);line-height:1.4;margin-bottom:1rem;">Current round resets to 1. This will restart the round count.</div>
    <button class="info-modal-close" onclick="closeRoundsOverlay()" style="width:100%;">Done</button>
  </div>
</div>
<div id="error-toast"></div>
<div id="app-dialog-overlay">
  <div id="app-dialog-box">
    <div id="app-dialog-msg"></div>
    <input type="text" id="app-dialog-input" style="display:none;">
    <div id="app-dialog-btns">
      <button class="btn-secondary btn-sm" id="app-dialog-cancel" onclick="appDialogResolve(false)">Cancel</button>
      <button class="btn-primary btn-sm" id="app-dialog-ok" onclick="appDialogResolve(true)">OK</button>
    </div>
  </div>
</div>

<!-- PWA INSTALL BANNER -->
<div id="install-banner" style="display:none; position:fixed; bottom:0; left:0; right:0; background:#1a1a2e; border-top:1px solid #2a2a3a; padding:0.85rem 1.25rem; align-items:center; justify-content:space-between; gap:1rem; z-index:500;">
  <div>
    <div style="font-size:0.9rem; font-weight:600; color:#f0eeff;">Add to Home Screen</div>
    <div style="font-size:0.75rem; color:#7a7a9a;">Install SideKick for quick access</div>
  </div>
  <div style="display:flex; gap:0.5rem; flex-shrink:0;">
    <button onclick="dismissInstall()" style="width:auto; padding:0.4rem 0.8rem; font-size:0.8rem; background:transparent; border:1px solid #2a2a3a; border-radius:8px; color:#7a7a9a;">Not now</button>
    <button onclick="installPWA()" style="width:auto; padding:0.4rem 0.9rem; font-size:0.8rem; background:#7c5cbf; border:none; border-radius:8px; color:#fff; font-weight:600;">Install</button>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js" defer>