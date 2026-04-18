import { collection, addDoc, doc, setDoc, Timestamp, query, where, getDocs, limit } from 'firebase/firestore';
import { initializeApp, getApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType, firebaseConfig } from '../firebase';
import { Shop } from '../types';

export async function createShopWithOwner(shopData: Omit<Shop, 'id' | 'ownerId'>, ownerData: { email: string, username: string, password: string }) {
  let secondaryApp;
  let userId: string | undefined;
  let wasLinked = false;

  try {
    // 1. Try to create the user account
    const appName = `SecondaryAdmin-${Date.now()}`;
    secondaryApp = initializeApp(firebaseConfig, appName);
    const secondaryAuth = getAuth(secondaryApp);
    
    const authEmail = `${ownerData.username.toLowerCase().trim()}@user.printlink`;
    
    try {
      // Create account using pseudo-email for username login compatibility
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, authEmail, ownerData.password);
      const user = userCredential.user;
      userId = user.uid;
      await updateProfile(user, { displayName: ownerData.username });
      
      // Save user profile to Firestore
      await setDoc(doc(db, 'users', userId), {
        uid: userId,
        email: ownerData.email, // Store the real email
        displayName: ownerData.username,
        role: 'shop_owner',
        createdAt: Timestamp.now(),
        // Store credentials as requested for reference since this is a demo environment
        _registered_credentials: {
          username: ownerData.username,
          password: ownerData.password,
          login_key: ownerData.username
        }
      });
    } catch (authError: any) {
      console.log("Auth creation failed, checking for existing user identity...");
      // For any auth error (like email-already-in-use), try to find if the user exists in our system
      if (auth.currentUser?.email === authEmail) {
        userId = auth.currentUser.uid;
        wasLinked = true;
      } else {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('displayName', '==', ownerData.username), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          userId = querySnapshot.docs[0].id;
          wasLinked = true;
        }
      }

      // If we still don't have a userId, then the original authError was fatal
      if (!userId) {
        throw authError;
      }
      console.log("Successfully linked to existing identity:", userId);
    }

    // 2. Create the shop document linked to the userId (new or existing)
    if (userId) {
      const shopRef = await addDoc(collection(db, 'shops'), {
        ...shopData,
        ownerId: userId,
        isOpen: true
      });
      
      return {
        id: shopRef.id,
        wasLinked,
        linkedId: userId
      };
    }
    
    throw new Error("Failed to determine owner identity.");
  } catch (error: any) {
    console.error("Shop creation error:", error);
    if (error.code === 'auth/weak-password') {
      throw new Error("Security Alert: The password provided is too weak. It must be at least 6 characters long.", { cause: error });
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error("Validation Error: The owner email address is formatted incorrectly.", { cause: error });
    }
    handleFirestoreError(error, OperationType.CREATE, 'shops');
  } finally {
    if (secondaryApp) {
      await deleteApp(secondaryApp);
    }
  }
}

export async function addShopAdmin(shopData: Omit<Shop, 'id' | 'ownerId'> & { ownerId: string }) {
  try {
    await addDoc(collection(db, 'shops'), shopData);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'shops');
  }
}
