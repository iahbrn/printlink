import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Order, OrderStatus } from '../types';

const ORDERS_COLLECTION = 'orders';

export async function createOrder(orderData: Omit<Order, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, ORDERS_COLLECTION), {
      ...orderData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, ORDERS_COLLECTION);
    return ''; // unreachable
  }
}

export function subscribeToUserOrders(userId: string, callback: (orders: Order[]) => void) {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
    } as Order));
    callback(orders);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, ORDERS_COLLECTION);
  });
}

export function subscribeToAllOrders(callback: (orders: Order[]) => void) {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
    } as Order));
    callback(orders);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, ORDERS_COLLECTION);
  });
}

export function subscribeToShopOrders(shopId: string, callback: (orders: Order[]) => void) {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('shopId', '==', shopId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
    } as Order));
    callback(orders);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, ORDERS_COLLECTION);
  });
}

export async function updateOrder(orderId: string, data: Partial<Order>) {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(orderRef, { ...data, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, ORDERS_COLLECTION);
    throw error; // ensure caller knows about the failure
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  return updateOrder(orderId, { status });
}

export async function deleteOrder(orderId: string) {
  try {
    await deleteDoc(doc(db, ORDERS_COLLECTION, orderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, ORDERS_COLLECTION);
  }
}
