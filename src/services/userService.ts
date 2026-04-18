import { doc, getDoc, setDoc, updateDoc, onSnapshot, Timestamp, collection, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const USERS_COLLECTION = 'users';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'user' | 'admin' | 'shop_owner';
  createdAt: any;
  emailNotifications?: boolean;
  msgNotifications?: boolean;
  contactNumber?: string;
}

export function subscribeToAllUsers(callback: (users: UserProfile[]) => void) {
  const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    callback(users);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, USERS_COLLECTION);
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() } as any;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, USERS_COLLECTION);
  }
  return null;
}

export function subscribeToProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  return onSnapshot(doc(db, USERS_COLLECTION, uid), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as any);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, USERS_COLLECTION);
  });
}
export async function saveUserProfile(user: any) {
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  try {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: 'user', // Default role
        createdAt: Timestamp.now(),
      };
      await setDoc(userRef, profile);
    } else {
      // Update existing
      await updateDoc(userRef, {
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    }
  } catch (error) {
    // If it's the first time and rules block initial creation, this might fail
    // But usually auth'd users can create their own doc
    console.warn("Could not sync user profile:", error);
    // Don't throw for now, let the app proceed
  }
}
