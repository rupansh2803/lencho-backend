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
    const isMobileUA = /android|iphone|ipad|ipod|mobile|opera mini|iemobile/i.test(ua);
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    // treat as mobile only when UA is mobile, or touch device with small viewport
    return isMobileUA || (hasTouch && window.innerWidth < 768);
  }

  let firebaseReady = false;
  let auth = null;
  let provider = null;
  let authStateHandlerAttached = false;

  async function buildAuthResult(result) {
    const user = result && result.user ? result.user : null;
    let credentialIdToken = '';
    let credentialAccessToken = '';

    try {
      const credential = window.firebase.auth.GoogleAuthProvider.credentialFromResult(result);
      credentialIdToken = credential && credential.idToken ? credential.idToken : '';
      credentialAccessToken = credential && credential.accessToken ? credential.accessToken : '';
    } catch (e) {
      console.warn('credentialFromResult failed:', e);
    }

    // Always try to get a fresh Firebase ID token — this is the most reliable approach
    let firebaseIdToken = credentialIdToken;
    if (!firebaseIdToken && user && typeof user.getIdToken === 'function') {
      try {
        firebaseIdToken = await user.getIdToken(true);
        console.log('Firebase ID token obtained via getIdToken()');
      } catch (e) {
        console.warn('user.getIdToken() failed:', e);
      }
    }

    return {
      user,
      googleIdToken: firebaseIdToken,
      googleAccessToken: credentialAccessToken
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

    if (window.firebase.auth && window.firebase.auth.Auth && window.firebase.auth.Auth.Persistence) {
      auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL).catch((error) => {
        console.warn('Firebase persistence setup failed:', error && error.code ? error.code : error);
      });
    }

    if (!authStateHandlerAttached && typeof auth.onAuthStateChanged === 'function') {
      authStateHandlerAttached = true;
      auth.onAuthStateChanged((user) => {
        try {
          console.log('onAuthStateChanged:', user ? { uid: user.uid, email: user.email, name: user.displayName } : null);
          window.__lenchoFirebaseCurrentUser = user || null;
          if (typeof window.handleFirebaseAuthStateChanged === 'function') {
            window.handleFirebaseAuthStateChanged(user || null);
          }
        } catch (error) {
          console.error('onAuthStateChanged handler failed:', error);
        }
      });
    }

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
      console.log('Auth started: popup');
      try {
        const result = await auth.signInWithPopup(provider);
        console.log('Popup result:', result);
        console.log('User:', result && result.user ? { uid: result.user.uid, email: result.user.email, name: result.user.displayName } : null);
        return buildAuthResult(result);
      } catch (err) {
        try {
          const cfg = getConfigFromWindow();
          console.warn('Firebase signInWithPopup failed:', err && err.code ? err.code : err);
          console.info('Current hostname:', window.location.hostname, 'Configured authDomain:', cfg && cfg.authDomain);
        } catch (e) {}
        if (err && (err.code === 'auth/unauthorized-domain' || err.message && err.message.indexOf('unauthorized') !== -1)) {
          const message = 'AUTH_DOMAIN_NOT_AUTHORIZED';
          const friendly = new Error(message);
          friendly.code = 'AUTH_DOMAIN_NOT_AUTHORIZED';
          throw friendly;
        }
        throw err;
      }
    },
    startGoogleRedirectLogin: async function () {
      if (!this.isReady()) throw new Error('Firebase auth is not initialized');
      console.log('Auth started: redirect');
      try {
        await auth.signInWithRedirect(provider);
      } catch (err) {
        try {
          const cfg = getConfigFromWindow();
          console.warn('Firebase signInWithRedirect failed:', err && err.code ? err.code : err);
          console.info('Current hostname:', window.location.hostname, 'Configured authDomain:', cfg && cfg.authDomain);
        } catch (e) {}
        if (err && (err.code === 'auth/unauthorized-domain' || err.message && err.message.indexOf('unauthorized') !== -1)) {
          const friendly = new Error('AUTH_DOMAIN_NOT_AUTHORIZED');
          friendly.code = 'AUTH_DOMAIN_NOT_AUTHORIZED';
          throw friendly;
        }
        throw err;
      }
    },
    consumeRedirectResult: async function () {
      if (!this.isReady()) return null;
      try {
        const result = await auth.getRedirectResult();
        console.log('Redirect result:', result);
        if (!result || !result.user) return null;
        return buildAuthResult(result);
      } catch (err) {
        console.warn('consumeRedirectResult error:', err && err.code ? err.code : err);
        if (err && (err.code === 'auth/unauthorized-domain' || err.message && err.message.indexOf('unauthorized') !== -1)) {
          const friendly = new Error('AUTH_DOMAIN_NOT_AUTHORIZED');
          friendly.code = 'AUTH_DOMAIN_NOT_AUTHORIZED';
          throw friendly;
        }
        throw err;
      }
    },
    signOut: async function () {
      if (!this.isReady()) return;
      await auth.signOut();
    },
    getCurrentUser: function () {
      return auth && auth.currentUser ? auth.currentUser : null;
    }
  };

  // Utility: return basic diagnostics about current domain vs config
  window.lenchoFirebaseAuth.getDomainDiagnostics = function () {
    try {
      const cfg = getConfigFromWindow();
      return {
        currentHostname: window.location.hostname,
        configuredAuthDomain: cfg && cfg.authDomain ? cfg.authDomain : null
      };
    } catch (e) {
      return { currentHostname: window.location.hostname };
    }
  };
})();