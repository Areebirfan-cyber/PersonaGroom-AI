import {
  db,
  doc,
  collection,
  setDoc,
  getDocFromServer,
  getDocs,
  deleteDoc,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { SavedLook, AdviceRating, ChatMessage, Gender, AgeGroup, Language, Theme, StylePreference } from '../types';

export interface UserProfileRecord {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  preferredGender: Gender;
  ageGroup: AgeGroup;
  stylePreference: StylePreference;
  language: Language;
  theme: Theme;
  updatedAt: string;
}

export interface ChatSessionRecord {
  sessionId: string;
  userId: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface StudioItemRecord {
  id: string;
  userId: string;
  type: 'runway_look' | 'darzi_slip' | 'lookbook';
  title: string;
  data: any;
  createdAt: string;
}

export interface GeneratedImageRecord {
  id: string;
  userId: string;
  prompt: string;
  editInstruction?: string;
  imageUrl: string;
  modelUsed: string;
  createdAt: string;
}

/**
 * Recursively strips `undefined` keys and cleans arrays for Firestore compatibility.
 * Firestore `setDoc()` and `updateDoc()` strictly reject payloads containing any `undefined` value.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    if (data instanceof Date) {
      return data.toISOString() as unknown as T;
    }
    const cleanObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleanObj[key] = sanitizeForFirestore(val);
      }
    }
    return cleanObj as T;
  }
  return data;
}

// ==========================================
// 1. User Profiles Persistence
// ==========================================
export async function saveUserProfileToFirestore(userId: string, profile: Partial<UserProfileRecord>) {
  // Always mirror to localStorage for instant F5 restoration
  try {
    localStorage.setItem(`pg_user_profile_${userId}`, JSON.stringify(profile));
  } catch {
    // ignore
  }

  if (userId.startsWith('guest_')) return;

  const path = `users/${userId}`;
  try {
    const payload = sanitizeForFirestore({
      ...profile,
      uid: userId,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', userId), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchUserProfileFromFirestore(userId: string): Promise<Partial<UserProfileRecord> | null> {
  // Check LocalStorage cache first
  try {
    const cached = localStorage.getItem(`pg_user_profile_${userId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (userId.startsWith('guest_')) return parsed;
    }
  } catch {
    // ignore
  }

  if (userId.startsWith('guest_')) return null;

  const path = `users/${userId}`;
  try {
    const snap = await getDocFromServer(doc(db, 'users', userId));
    if (snap.exists()) {
      const data = snap.data() as Partial<UserProfileRecord>;
      try {
        localStorage.setItem(`pg_user_profile_${userId}`, JSON.stringify(data));
      } catch {
        // ignore
      }
      return data;
    }
  } catch (err) {
    console.warn('Could not fetch user profile from Firestore, using local cache:', err);
  }
  return null;
}

// ==========================================
// 2. Chat Sessions Persistence (Real-Time Auto-Sync)
// ==========================================
export async function saveChatSessionToFirestore(userId: string, messages: ChatMessage[], sessionId: string = 'default_session') {
  // Instant LocalStorage mirror
  try {
    localStorage.setItem(`pg_chat_session_${userId}_${sessionId}`, JSON.stringify(messages));
    localStorage.setItem(`pg_last_active_session_${userId}`, sessionId);
  } catch {
    // ignore
  }

  if (userId.startsWith('guest_')) return;

  const path = `users/${userId}/chat_sessions/${sessionId}`;
  try {
    const payload = sanitizeForFirestore({
      sessionId,
      userId,
      messages,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', userId, 'chat_sessions', sessionId), payload);
  } catch (err) {
    console.warn('Chat session Firestore sync warning:', err);
  }
}

export async function saveChatMessageToFirestore(
  userId: string,
  message: ChatMessage,
  modelUsed?: string,
  groundingSources?: any[]
) {
  if (userId.startsWith('guest_')) return;
  const path = `users/${userId}/chats/${message.id}`;
  try {
    const payload = sanitizeForFirestore({
      id: String(message.id),
      userId,
      role: message.role,
      text: message.text,
      modelUsed: modelUsed || 'gemini-3.8-flash',
      groundingSources: groundingSources || [],
      timestamp: message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', userId, 'chats', String(message.id)), payload);
  } catch (err) {
    console.warn('saveChatMessageToFirestore warning:', err);
  }
}

export async function fetchChatSessionFromFirestore(userId: string, sessionId: string = 'default_session'): Promise<ChatMessage[]> {
  // Check LocalStorage cache
  try {
    const cached = localStorage.getItem(`pg_chat_session_${userId}_${sessionId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (userId.startsWith('guest_')) return parsed;
      }
    }
  } catch {
    // ignore
  }

  if (userId.startsWith('guest_')) return [];

  const path = `users/${userId}/chat_sessions/${sessionId}`;
  try {
    const snap = await getDocFromServer(doc(db, 'users', userId, 'chat_sessions', sessionId));
    if (snap.exists()) {
      const data = snap.data() as ChatSessionRecord;
      if (data && Array.isArray(data.messages)) {
        try {
          localStorage.setItem(`pg_chat_session_${userId}_${sessionId}`, JSON.stringify(data.messages));
        } catch {
          // ignore
        }
        return data.messages;
      }
    }
  } catch (err) {
    console.warn('Could not fetch chat session from Firestore, using local:', err);
  }

  // Fallback to local storage if network offline
  try {
    const cached = localStorage.getItem(`pg_chat_session_${userId}_${sessionId}`);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }
  return [];
}

// ==========================================
// 3. Saved Studio Persistence (3D Runway, Darzi Slips, Lookbook)
// ==========================================
export async function saveStudioItemToFirestore(userId: string, item: StudioItemRecord) {
  // Mirror to localStorage
  try {
    const key = `pg_studio_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = existing.filter((i: StudioItemRecord) => i.id !== item.id);
    localStorage.setItem(key, JSON.stringify([item, ...filtered]));
  } catch {
    // ignore
  }

  if (userId.startsWith('guest_')) return;

  const path = `users/${userId}/saved_studio/${item.id}`;
  try {
    const payload = sanitizeForFirestore(item);
    await setDoc(doc(db, 'users', userId, 'saved_studio', item.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteStudioItemFromFirestore(userId: string, itemId: string) {
  // Remove from localStorage
  try {
    const key = `pg_studio_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(existing.filter((i: StudioItemRecord) => i.id !== itemId)));
  } catch {
    // ignore
  }

  if (userId.startsWith('guest_')) return;

  const path = `users/${userId}/saved_studio/${itemId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'saved_studio', itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function fetchStudioItemsFromFirestore(userId: string): Promise<StudioItemRecord[]> {
  try {
    const local = JSON.parse(localStorage.getItem(`pg_studio_${userId}`) || '[]');
    if (userId.startsWith('guest_')) return local;
  } catch {
    // ignore
  }

  if (userId.startsWith('guest_')) return [];

  const path = `users/${userId}/saved_studio`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'saved_studio'));
    const items = snap.docs.map((d) => d.data() as StudioItemRecord);
    try {
      localStorage.setItem(`pg_studio_${userId}`, JSON.stringify(items));
    } catch {
      // ignore
    }
    return items;
  } catch (err) {
    console.warn('Fetch studio items from Firestore warning:', err);
    try {
      return JSON.parse(localStorage.getItem(`pg_studio_${userId}`) || '[]');
    } catch {
      return [];
    }
  }
}

// ==========================================
// 4. Saved Looks & Wardrobe
// ==========================================
export async function saveLookToFirestore(userId: string, look: SavedLook) {
  // Mirror to LocalStorage
  try {
    const key = `pg_saved_looks_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = existing.filter((l: SavedLook) => l.id !== look.id);
    localStorage.setItem(key, JSON.stringify([look, ...filtered]));
  } catch {
    // ignore
  }

  if (userId.startsWith('guest_')) return;

  const path = `users/${userId}/saved_looks/${look.id}`;
  try {
    const payload = sanitizeForFirestore({
      ...look,
      userId,
    });
    await setDoc(doc(db, 'users', userId, 'saved_looks', look.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteLookFromFirestore(userId: string, lookId: string) {
  try {
    const key = `pg_saved_looks_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(existing.filter((l: SavedLook) => l.id !== lookId)));
  } catch {
    // ignore
  }

  if (userId.startsWith('guest_')) return;

  const path = `users/${userId}/saved_looks/${lookId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'saved_looks', lookId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function fetchSavedLooksFromFirestore(userId: string): Promise<SavedLook[]> {
  try {
    const local = JSON.parse(localStorage.getItem(`pg_saved_looks_${userId}`) || '[]');
    if (userId.startsWith('guest_')) return local;
  } catch {
    // ignore
  }

  if (userId.startsWith('guest_')) return [];

  const path = `users/${userId}/saved_looks`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'saved_looks'));
    const items = snap.docs.map((d) => d.data() as SavedLook);
    try {
      localStorage.setItem(`pg_saved_looks_${userId}`, JSON.stringify(items));
    } catch {
      // ignore
    }
    return items;
  } catch (err) {
    console.warn('Could not fetch saved looks from Firestore, falling back to local:', err);
    try {
      return JSON.parse(localStorage.getItem(`pg_saved_looks_${userId}`) || '[]');
    } catch {
      return [];
    }
  }
}

// ==========================================
// 5. Ratings & Stylist Feedback
// ==========================================
export async function saveRatingToFirestore(userId: string, rating: AdviceRating) {
  try {
    const key = `pg_ratings_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = existing.filter((r: AdviceRating) => r.id !== rating.id);
    localStorage.setItem(key, JSON.stringify([rating, ...filtered]));
  } catch {
    // ignore
  }

  if (userId.startsWith('guest_')) return;

  const path = `users/${userId}/ratings/${rating.id}`;
  try {
    const payload = sanitizeForFirestore({
      ...rating,
      userId,
    });
    await setDoc(doc(db, 'users', userId, 'ratings', rating.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchRatingsFromFirestore(userId: string): Promise<AdviceRating[]> {
  try {
    const local = JSON.parse(localStorage.getItem(`pg_ratings_${userId}`) || '[]');
    if (userId.startsWith('guest_')) return local;
  } catch {
    // ignore
  }

  if (userId.startsWith('guest_')) return [];

  const path = `users/${userId}/ratings`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'ratings'));
    const items = snap.docs.map((d) => d.data() as AdviceRating);
    try {
      localStorage.setItem(`pg_ratings_${userId}`, JSON.stringify(items));
    } catch {
      // ignore
    }
    return items;
  } catch (err) {
    console.warn('Could not fetch ratings from Firestore:', err);
    try {
      return JSON.parse(localStorage.getItem(`pg_ratings_${userId}`) || '[]');
    } catch {
      return [];
    }
  }
}

// ==========================================
// 6. Generated Images Record
// ==========================================
export async function saveGeneratedImageToFirestore(userId: string, img: GeneratedImageRecord) {
  try {
    const key = `pg_images_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([img, ...existing.slice(0, 30)]));
  } catch {
    // ignore
  }

  if (userId.startsWith('guest_')) return;

  const path = `users/${userId}/images/${img.id}`;
  try {
    const payload = sanitizeForFirestore({
      id: img.id,
      userId,
      prompt: img.prompt || '',
      ...(img.editInstruction ? { editInstruction: img.editInstruction } : {}),
      imageUrl: img.imageUrl,
      modelUsed: img.modelUsed || 'gemini-nano-banana-2.1',
      createdAt: img.createdAt || new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', userId, 'images', img.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchGeneratedImagesFromFirestore(userId: string): Promise<GeneratedImageRecord[]> {
  try {
    const local = JSON.parse(localStorage.getItem(`pg_images_${userId}`) || '[]');
    if (userId.startsWith('guest_')) return local;
  } catch {
    // ignore
  }

  if (userId.startsWith('guest_')) return [];

  const path = `users/${userId}/images`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'images'));
    return snap.docs.map((d) => d.data() as GeneratedImageRecord);
  } catch (err) {
    return [];
  }
}
