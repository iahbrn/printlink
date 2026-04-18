export type ColorMode = 'color' | 'grayscale';
export type PaperSize = 'A4' | 'Letter' | 'Legal';
export type OrderStatus = 'pending' | 'ready' | 'completed' | 'cancelled';
export type PaymentMethod = 'GCash' | 'Maya' | 'Cash';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: 'user' | 'shop_owner' | 'admin';
  latitude?: number;
  longitude?: number;
  contactNumber?: string;
  emailNotifications?: boolean;
  msgNotifications?: boolean;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  pricePerPage: number;
  prices?: {
    A4?: number;
    Letter?: number;
    Legal?: number;
  };
  ownerId: string;
  contactNumber?: string;
}

export interface PrintDocument {
  name: string;
  size: number;
  url?: string;
  pages?: number;
}

export interface PrintConfig {
  documents: PrintDocument[];
  copies: number;
  colorMode: ColorMode;
  paperSize: PaperSize;
  totalPages?: number;
}

export interface Order {
  id: string;
  userId: string;
  shopId: string;
  shopName: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: any; // Firestore Timestamp
  paymentMethod: PaymentMethod;
  config: PrintConfig;
}
