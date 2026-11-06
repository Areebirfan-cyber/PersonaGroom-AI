import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  User,
} from '../lib/firebase';
import {
  saveUserProfileToFirestore,
  fetchUserProfileFromFirestore,
  UserProfileRecord,
} from '../lib/firestoreData';
import { Gender, AgeGroup, StylePreference, Language, Theme } from '../types';

export interface GuestUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isGuest: true;
}

export type AuthUser = User | GuestUser;

interface AuthContextType {
  user: User | null;
  guestUser: GuestUser | null;
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  userProfile: Partial<UserProfileRecord> | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signInAsGuest: (customName?: string) => void;
  signOut: () => Promise<void>;
  syncProfilePreferences: (prefs: {
    preferredGender?: Gender;
    ageGroup?: AgeGroup;
    stylePreference?: StylePreference;
    language?: Language;
    theme?: Theme;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  guestUser: null,
  currentUser: null,
  isAuthenticated: false,
  loading: true,
  userProfile: null,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signInAsGuest: () => {},
  signOut: async () => {},
  syncProfilePreferences: async () => {},
});

const GUEST_STORAGE_KEY = 'pg_guest_session_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(() => {
    try {
      const saved = localStorage.getItem(GUEST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<Partial<UserProfileRecord> | null>(null);

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fireUser) => {
      setUser(fireUser);
      if (fireUser) {
        // If logged into Firebase, clear guest session
        setGuestUser(null);
        localStorage.removeItem(GUEST_STORAGE_KEY);

        // Fetch or create profile
        try {
          let profile = await fetchUserProfileFromFirestore(fireUser.uid);
          if (!profile) {
            profile = {
              uid: fireUser.uid,
              email: fireUser.email || 'user@personagroom.ai',
              displayName: fireUser.displayName || 'Pakistani Fashion Connoisseur',
              photoURL: fireUser.photoURL || undefined,
              preferredGender: (localStorage.getItem('persona_gender') as Gender) || 'men',
              ageGroup: (localStorage.getItem('persona_age') as AgeGroup) || 'pro',
              stylePreference: (localStorage.getItem('persona_style_preference') as StylePreference) || 'traditional',
              language: (localStorage.getItem('persona_lang') as Language) || 'roman',
              theme: (localStorage.getItem('persona_theme') as Theme) || 'dark',
              updatedAt: new Date().toISOString(),
            };
            await saveUserProfileToFirestore(fireUser.uid, profile);
          }
          setUserProfile(profile);
        } catch (err) {
          console.warn('Profile bootstrap error:', err);
        }
      } else {
        // If not a Firebase user, check if guest session exists
        try {
          const savedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
          if (savedGuest) {
            const parsed = JSON.parse(savedGuest);
            setGuestUser(parsed);
            const localProf = await fetchUserProfileFromFirestore(parsed.uid);
            setUserProfile(localProf || {
              uid: parsed.uid,
              email: parsed.email,
              displayName: parsed.displayName,
              preferredGender: 'men',
              ageGroup: 'pro',
              stylePreference: 'traditional',
              language: 'roman',
              theme: 'dark',
            });
          } else {
            setUserProfile(null);
          }
        } catch {
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error('Email Sign-In Error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (cred.user) {
        const baseProfile: Partial<UserProfileRecord> = {
          uid: cred.user.uid,
          email: cred.user.email || email,
          displayName: name || 'Pakistani Fashion Enthusiast',
          preferredGender: (localStorage.getItem('persona_gender') as Gender) || 'men',
          ageGroup: (localStorage.getItem('persona_age') as AgeGroup) || 'pro',
          stylePreference: 'traditional',
          language: 'roman',
          theme: 'dark',
          updatedAt: new Date().toISOString(),
        };
        await saveUserProfileToFirestore(cred.user.uid, baseProfile);
        setUserProfile(baseProfile);
      }
    } catch (error: any) {
      console.error('Email Sign-Up Error:', error);
      throw error;
    }
  };

  const signInAsGuest = (customName?: string) => {
    const guestId = 'guest_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const guest: GuestUser = {
      uid: guestId,
      email: 'guest@personagroom.local',
      displayName: customName?.trim() || 'Guest Stylist',
      isGuest: true,
    };
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
    } catch {
      // ignore
    }
    setGuestUser(guest);
    setUser(null);

    const baseProfile: Partial<UserProfileRecord> = {
      uid: guest.uid,
      email: guest.email,
      displayName: guest.displayName,
      preferredGender: (localStorage.getItem('persona_gender') as Gender) || 'men',
      ageGroup: (localStorage.getItem('persona_age') as AgeGroup) || 'pro',
      stylePreference: 'traditional',
      language: 'roman',
      theme: 'dark',
      updatedAt: new Date().toISOString(),
    };
    saveUserProfileToFirestore(guest.uid, baseProfile);
    setUserProfile(baseProfile);
  };

  const signOut = async () => {
    try {
      if (user) {
        await firebaseSignOut(auth);
      }
      setGuestUser(null);
      localStorage.removeItem(GUEST_STORAGE_KEY);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign-Out Error:', error);
    }
  };

  const syncProfilePreferences = async (prefs: {
    preferredGender?: Gender;
    ageGroup?: AgeGroup;
    stylePreference?: StylePreference;
    language?: Language;
    theme?: Theme;
  }) => {
    const activeUid = user?.uid || guestUser?.uid;
    if (!activeUid) return;

    const now = new Date().toISOString();
    const update = {
      ...prefs,
      updatedAt: now,
    };
    try {
      await saveUserProfileToFirestore(activeUid, update);
      setUserProfile((prev) => (prev ? { ...prev, ...update } : update));
    } catch (err) {
      console.warn('Sync profile error:', err);
    }
  };

  const currentUser: AuthUser | null = user || guestUser;
  const isAuthenticated = Boolean(currentUser);

  return (
    <AuthContext.Provider
      value={{
        user,
        guestUser,
        currentUser,
        isAuthenticated,
        loading,
        userProfile,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsGuest,
        signOut,
        syncProfilePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
