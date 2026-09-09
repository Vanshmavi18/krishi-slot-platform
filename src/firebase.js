// src/firebase.js
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from 'firebase/auth';

// Read Firebase Web App configuration from environment variables
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

let app = null;
let auth = null;

export function getFirebaseAuth() {
  if (!isFirebaseConfigured()) return null;
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return auth;
}

let recaptchaVerifier = null;

export function setupRecaptcha(containerId = 'recaptcha-container') {
  const authInstance = getFirebaseAuth();
  if (!authInstance) return null;

  try {
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
      } catch (e) {
        // ignore cleanup error
      }
      recaptchaVerifier = null;
    }
    recaptchaVerifier = new RecaptchaVerifier(authInstance, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        console.warn('reCAPTCHA expired.');
      }
    });
    return recaptchaVerifier;
  } catch (err) {
    console.warn('RecaptchaVerifier setup warning:', err);
    return null;
  }
}

export async function sendFirebaseOtp(phone, containerId = 'recaptcha-container') {
  const authInstance = getFirebaseAuth();
  if (!authInstance) {
    throw new Error('Google Firebase is not configured yet. Add your Firebase keys in .env (VITE_FIREBASE_API_KEY).');
  }

  const verifier = setupRecaptcha(containerId);
  if (!verifier) {
    throw new Error('Could not initialize Google reCAPTCHA.');
  }

  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
  const formattedPhone = `+91${cleanPhone}`;

  try {
    const confirmationResult = await signInWithPhoneNumber(authInstance, formattedPhone, verifier);
    return confirmationResult;
  } catch (err) {
    console.error('Firebase signInWithPhoneNumber error:', err);
    if (verifier) {
      try { verifier.clear(); } catch (e) {}
    }
    if (err.code === 'auth/invalid-phone-number') {
      throw new Error('Invalid mobile number format. Please enter a 10-digit number.');
    } else if (err.code === 'auth/too-many-requests') {
      throw new Error('Too many requests. Please wait a moment and try again.');
    } else if (err.code === 'auth/quota-exceeded') {
      throw new Error('SMS quota exceeded for today.');
    }
    throw new Error(err.message || 'Failed to dispatch SMS via Google Firebase.');
  }
}

export async function confirmFirebaseOtp(confirmationResult, otpCode) {
  if (!confirmationResult) {
    throw new Error('No active OTP request found. Please request a new OTP.');
  }

  try {
    const userCredential = await confirmationResult.confirm(String(otpCode).trim());
    const user = userCredential.user;
    const idToken = await user.getIdToken();
    return { user, idToken };
  } catch (err) {
    console.error('Firebase confirm error:', err);
    throw new Error('Invalid OTP code. Please check your SMS and try again.');
  }
}
