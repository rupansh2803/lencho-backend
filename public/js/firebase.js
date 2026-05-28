(function initializeLenchoFirebaseAuth() {
  'use strict';

  const fallbackConfig = {
    apiKey: 'AIzaSyAgqw5Eeb8sJkZ2r1P2BNGI22vcJsR0ypk',
    authDomain: 'lencho-b556e.firebaseapp.com',
    projectId: 'lencho-b556e',
    storageBucket: 'lencho-b556e.firebasestorage.app',
    messagingSenderId: '469541009266',
    appId: '1:469541009266:web:90cb789195bc31f18d8feb'
  };

  function sanitizeConfig(input) {
    if (!input || typeof input !== 'object') return null;
    const cfg = {
      apiKey: String(input.apiKey || '').trim(),
      authDomain: String(input.authDomain || '').trim(),
      projectId: String(input.projectId || '').trim(),
      storageBucket: String(input.storageBucket || '').trim(),
      messagingSenderId: String(input.messagingSenderId || '').trim(),
      appId: String(input.appId || '').trim()
    };

    if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.appId) {
      return null;
    }
    return cfg;
  }

  function getConfigFromWindow() {
    const fromWindow = sanitizeConfig(window.__LENCHO_FIREBASE_CONFIG);
    if (fromWindow) return fromWindow;

    const fromGlobal = sanitizeConfig(window.LENCHO_FIREBASE_CONFIG);
    if (fromGlobal) return fromGlobal;

    return fallbackConfig;
  }

  function isMobileDevice() {
    const ua = navigator.userAgent || '';
    return /android|iphone|ipad|ipod|mobile|opera mini|iemobile/i.test(ua) || window.innerWidth < 768;
  }

  let firebaseReady = false;
  let auth = null;
  let provider = null;

  function buildAuthResult(result) {
    const user = result && result.user ? result.user : null;
    const credential = window.firebase.auth.GoogleAuthProvider.credentialFromResult(result);
    return {
      user,
      googleIdToken: credential && credential.idToken ? credential.idToken : '',
      googleAccessToken: credential && credential.accessToken ? credential.accessToken : ''
    };
  }

  try {
    if (!window.firebase || !window.firebase.initializeApp || !window.firebase.auth) {
      throw new Error('Firebase SDK is not loaded');
    }

    const app = window.firebase.apps && window.firebase.apps.length
      ? window.firebase.app()
      : window.firebase.initializeApp(getConfigFromWindow());

    auth = window.firebase.auth(app);
    provider = new window.firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    firebaseReady = true;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    firebaseReady = false;
  }

  window.lenchoFirebaseAuth = {
    isReady: function () {
      return firebaseReady && !!auth && !!provider;
    },
    isMobileDevice: isMobileDevice,
    signInWithGooglePopup: async function () {
      if (!this.isReady()) throw new Error('Firebase auth is not initialized');
      const result = await auth.signInWithPopup(provider);
      return buildAuthResult(result);
    },
    startGoogleRedirectLogin: async function () {
      if (!this.isReady()) throw new Error('Firebase auth is not initialized');
      await auth.signInWithRedirect(provider);
    },
    consumeRedirectResult: async function () {
      if (!this.isReady()) return null;
      const result = await auth.getRedirectResult();
      if (!result || !result.user) return null;
      return buildAuthResult(result);
    },
    signOut: async function () {
      if (!this.isReady()) return;
      await auth.signOut();
    }
  };
})();