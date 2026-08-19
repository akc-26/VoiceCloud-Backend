type FirebaseUser = { getIdToken: (forceRefresh?: boolean) => Promise<string> };
type FirebaseCredential = { user: FirebaseUser };
type FirebaseAuth = { useDeviceLanguage?: () => void };
type FirebaseGoogleProvider = object;

interface FirebaseCompatGlobal {
  apps: unknown[];
  initializeApp: (config: Record<string, string>) => unknown;
  auth: (() => FirebaseAuth) & {
    GoogleAuthProvider: new () => FirebaseGoogleProvider;
  };
}

declare global {
  interface Window {
    firebase?: FirebaseCompatGlobal;
  }
}

const FIREBASE_APP_URL = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js';
const FIREBASE_AUTH_URL = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing?.dataset.loaded === 'true') return resolve();
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Unable to load Google sign-in provider.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.voicecloudProvider = 'firebase';
    script.addEventListener('load', () => { script.dataset.loaded = 'true'; resolve(); }, { once: true });
    script.addEventListener('error', () => reject(new Error('Unable to load Google sign-in provider.')), { once: true });
    document.head.appendChild(script);
  });
}

function publicFirebaseConfig(): Record<string, string> | null {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  };
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) return null;
  return config as Record<string, string>;
}

export function isGoogleWebSignInConfigured(): boolean {
  return Boolean(publicFirebaseConfig());
}

export async function acquireGoogleFirebaseIdToken(): Promise<string> {
  const config = publicFirebaseConfig();
  if (!config) {
    throw new Error('Google sign-in is not configured for this website environment.');
  }

  await loadScript(FIREBASE_APP_URL);
  await loadScript(FIREBASE_AUTH_URL);

  const firebase = window.firebase;
  if (!firebase) throw new Error('Google sign-in provider did not initialize.');
  if (!firebase.apps.length) firebase.initializeApp(config);

  const auth = firebase.auth();
  auth.useDeviceLanguage?.();
  const provider = new firebase.auth.GoogleAuthProvider();
  const signInWithPopup = (auth as FirebaseAuth & {
    signInWithPopup?: (provider: FirebaseGoogleProvider) => Promise<FirebaseCredential>;
  }).signInWithPopup;

  // Firebase compat exposes signInWithPopup on auth() at runtime.
  if (!signInWithPopup) throw new Error('Google popup sign-in is unavailable in this browser.');
  const credential = await signInWithPopup.call(auth, provider);
  return credential.user.getIdToken(true);
}
