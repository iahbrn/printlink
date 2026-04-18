import { collection, getDocs, addDoc, query, where, limit, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Shop } from '../types';

const SHOPS_COLLECTION = 'shops';

export function subscribeToShops(callback: (shops: Shop[]) => void) {
  const shopRef = collection(db, SHOPS_COLLECTION);
  return onSnapshot(shopRef, (snapshot) => {
    const shops = snapshot.docs.map(doc => {
      const data = doc.data();
      const isOpen = typeof data.isOpen === 'boolean' ? data.isOpen : data.status === 'open';
      return { id: doc.id, ...data, isOpen } as Shop;
    });
    callback(shops);
  });
}

export async function updateShop(shopId: string, updates: Partial<Shop>) {
  try {
    const shopRef = doc(db, SHOPS_COLLECTION, shopId);
    await updateDoc(shopRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, SHOPS_COLLECTION);
  }
}

const PARTNER_SHOPS = [
  {
    name: "PrintLink Central",
    address: "Central Square, Manila",
    latitude: 14.5995,
    longitude: 120.9842,
    isOpen: true,
    pricePerPage: 2.50,
    contactNumber: "09170000001"
  },
  {
    name: "PrintLink QC Express",
    address: "Campus Walk, Quezon City",
    latitude: 14.6760,
    longitude: 121.0437,
    isOpen: true,
    pricePerPage: 3.50,
    contactNumber: "09170000002"
  },
  {
    name: "PrintLink Makati Budget",
    address: "Heritage Row, Makati",
    latitude: 14.5547,
    longitude: 121.0244,
    isOpen: true,
    pricePerPage: 1.50,
    contactNumber: "09170000003"
  },
  {
    name: "PrintLink BGC Cyber",
    address: "Silicon Park, Taguig",
    latitude: 14.5486,
    longitude: 121.0494,
    isOpen: true,
    pricePerPage: 5.00,
    contactNumber: "09170000004"
  }
];

export async function getShops(): Promise<Shop[]> {
  const shopRef = collection(db, SHOPS_COLLECTION);
  let snapshot;
  try {
    snapshot = await getDocs(shopRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SHOPS_COLLECTION);
    return [];
  }
  
  if (snapshot.empty) {
    console.log("Synchronizing constant partner shops for the first time...");

    const shops: Shop[] = [];
    try {
      for (const mock of PARTNER_SHOPS) {
        const docRef = await addDoc(shopRef, mock);
        shops.push({ id: docRef.id, ...mock } as Shop);
      }
      return shops;
    } catch (error) {
      console.warn("Seeding failed, falling back to mock IDs:", error);
      return PARTNER_SHOPS.map((s, i) => ({ ...s, id: `mock-${i}` } as Shop));
    }
  }

  return snapshot.docs.map(doc => {
    const data = doc.data();
    // Normalize legacy 'status' to 'isOpen'
    const isOpen = typeof data.isOpen === 'boolean' ? data.isOpen : data.status === 'open';
    
    return { 
      id: doc.id, 
      ...data,
      isOpen
    } as Shop;
  });
}
