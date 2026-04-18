/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { auth } from './firebase';
import { HomeScreen, SetupScreen, ShopSelection, PaymentScreen } from './components/PrintLinkFlow';
import { AdminScreen } from './components/AdminScreen';
import { ShopOwnerScreen } from './components/ShopOwnerScreen';
import { getShops, subscribeToShops } from './services/shopService';
import { createOrder, subscribeToUserOrders } from './services/orderService';
import { saveUserProfile, subscribeToProfile } from './services/userService';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Shop, PrintConfig, Order, PaymentMethod, OrderStatus } from './types';
import { Printer, LogIn, CheckCircle2, Home, Plus, MoreHorizontal, ChevronRight, ChevronDown, LogOut, FileUp, CreditCard, Wallet, Banknote, MapPin, ReceiptText, Eye, EyeOff, User as UserIcon, X, Bell, Phone, Shield, Lock, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatPrice } from './lib/utils';

type Tab = 'home' | 'upload' | 'orders' | 'profile' | 'admin';
type UploadStep = 'setup' | 'shops' | 'payment' | 'success';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [uploadStep, setUploadStep] = useState<UploadStep>('setup');
  const [shops, setShops] = useState<Shop[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previousStatuses, setPreviousStatuses] = useState<Record<string, OrderStatus>>({});
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(['Cash']); // Default available
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const orderRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [shouldScrollToOrder, setShouldScrollToOrder] = useState<boolean>(false);

  useEffect(() => {
    if (shouldScrollToOrder && activeTab === 'orders' && expandedOrderId) {
      setTimeout(() => {
        orderRefs.current[expandedOrderId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setShouldScrollToOrder(false); // Reset so manual clicks in the order tab don't jump around
      }, 400); // Wait for tab switch and expand animation
    }
  }, [shouldScrollToOrder, activeTab, expandedOrderId]);

  const [userLocations, setUserLocations] = useState<{ id: string, lat: number, lng: number, name: string }[]>(() => {
    const saved = localStorage.getItem('printlink_locations_v2');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [pendingLocation, setPendingLocation] = useState<{ id: string, lat: number, lng: number, name: string } | null>(null);

  const [activeLocationId, setActiveLocationId] = useState<string | null>(() => {
    return localStorage.getItem('printlink_active_location_id');
  });

  // Profile management states
  const [isManagingLocations, setIsManagingLocations] = useState(false);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [tempLocationName, setTempLocationName] = useState('');

  const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editContact, setEditContact] = useState('');
  const [profileMessage, setProfileMessage] = useState({ text: '', isError: false });

  const [isEditingNotifications, setIsEditingNotifications] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);

  const [firestoreProfile, setFirestoreProfile] = useState<any>(null);
  const isAdmin = firestoreProfile?.role === 'admin' || user?.email === 'dyalahberania8@gmail.com' || user?.email === 'aubreydnilabelan@gmail.com';
  const isShopOwner = firestoreProfile?.role === 'shop_owner';
// Auth States
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const activeLocation = userLocations.find(l => l.id === activeLocationId) || userLocations[0];

  // Persist locations
  useEffect(() => {
    localStorage.setItem('printlink_locations_v2', JSON.stringify(userLocations));
    if (activeLocationId) {
      localStorage.setItem('printlink_active_location_id', activeLocationId);
    }
  }, [userLocations, activeLocationId]);

  // Initial location fetch if none saved
  useEffect(() => {
    if (userLocations.length === 0 && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const newLoc = { 
          id: Math.random().toString(36).substr(2, 9),
          lat: pos.coords.latitude, 
          lng: pos.coords.longitude,
          name: 'Home' 
        };
        setUserLocations([newLoc]);
        setActiveLocationId(newLoc.id);
      });
    }
  }, []);

  const [config, setConfig] = useState<PrintConfig>({
    documents: [],
    copies: 1,
    colorMode: 'grayscale',
    paperSize: 'A4'
  });

  // Auto-switch to admin tab for admins
  useEffect(() => {
    if (user && isAdmin && activeTab !== 'admin') {
      setActiveTab('admin');
    }
  }, [user, isAdmin]);

  // Scroll to top on navigation change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab, uploadStep]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoading(false);
      if (u) {
        saveUserProfile(u);
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
        }
      } else {
        // Universal cleanup of all sensitive/form fields on sign out
        setFirestoreProfile(null);
        setEmail('');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setAuthError('');
        setEditUsername('');
        setEditEmail('');
        setEditPassword('');
        setEditContact('');
        setProfileMessage({ text: '', isError: false });
        setActiveTab('home');
        setUploadStep('setup');
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to shops in real-time
  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToShops((updatedShops) => {
        setShops(updatedShops);
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Subscribe to orders and handle notifications
  useEffect(() => {
    if (user) {
      const unsubProfile = subscribeToProfile(user.uid, (data) => {
        setFirestoreProfile(data);
        if (data) {
          setEmailNotif(data.emailNotifications !== false);
          setSmsNotif(data.msgNotifications === true);
        }
      });

      const unsubscribe = subscribeToUserOrders(user.uid, (newOrders) => {
        // Handle Notifications for status changes
        newOrders.forEach(order => {
          // Use functional update or ref logic if needed, but for now we'll just check against 
          // a closure variable or state setter logic. 
          // Actually, we can use a local 'prev' check within the state setter or a separate effect.
          // To keep it simple and fix the loop:
          setPreviousStatuses(prev => {
            const currentPrevStatus = prev[order.id];
            if (currentPrevStatus && currentPrevStatus !== order.status) {
              if ("Notification" in window && Notification.permission === "granted") {
                const docLabel = order.config.documents.length > 1 
                  ? `${order.config.documents[0].name} and ${order.config.documents.length - 1} more`
                  : order.config.documents[0]?.name || "Document";
                
                new Notification("PrintLink Status Update", {
                  body: `Your order for "${docLabel}" is now ${order.status.replace('_', ' ')}.`,
                  icon: "/favicon.ico"
                });
              }
            }
            return { ...prev, [order.id]: order.status };
          });
        });

        setOrders(newOrders);
      });
      return () => {
        unsubscribe();
        unsubProfile();
      };
    }
  }, [user]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (isSignUp && password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }

    const _username = username.toLowerCase().trim();
    // Simulate username-only login by translating it to a hidden pseudo-email
    const authEmail = _username.includes('@') ? _username : `${_username}@user.printlink`;

    try {
      if (isSignUp) {
        if (!email.includes('@')) {
          setAuthError("Please provide a valid email address.");
          return;
        }
        // In a real production app, we would use custom auth or a cloud function to map username to email.
        // For this demo, we create the Firebase account using the pseudo-email so username login works smoothly later.
        const cred = await createUserWithEmailAndPassword(auth, authEmail, password);
        // Save the *real* email and username into the firestore user profile instantly
        await saveUserProfile({
          uid: cred.user.uid,
          email: email, // Set the real email
          displayName: username,
          photoURL: cred.user.photoURL
        });
      } else {
        await signInWithEmailAndPassword(auth, authEmail, password);
      }
    } catch (error: any) {
      console.error("Auth failed:", error);
      let errorMsg = error.message.replace('Firebase:', '').trim();
      
      if (errorMsg.includes("email-already-in-use")) {
        errorMsg = "Identity conflict: This username/email is already registered.";
      } else if (errorMsg.includes("invalid-email")) {
        errorMsg = "Invalid format: Check your email or username structure.";
      } else if (errorMsg.indexOf("invalid-credential") !== -1 || errorMsg.indexOf("user-not-found") !== -1 || errorMsg.indexOf("wrong-password") !== -1) {
        errorMsg = "Credential Mismatch: Check your password or use Google Sign-In if you previously used it.";
      } else if (errorMsg.includes("missing-password")) {
        errorMsg = "Security Requirement: Please enter a password.";
      } else if (errorMsg.includes("too-many-requests")) {
        errorMsg = "Access Throttled: Too many failed attempts. Try again later.";
      }
      
      setAuthError(errorMsg);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error && error.code === 'auth/cancelled-popup-request') {
        // Quietly ignore when user closes the Google login popup
        return;
      }
      if (error && error.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error("Login failed:", error);
    }
  };

  const handleSavePersonalInfo = async () => {
    if (!user) return;
    setProfileMessage({ text: 'Syncing profile...', isError: false });
    
    try {
      if (editPassword) {
        if (editPassword.length < 6) {
          setProfileMessage({ text: 'Security Fault: Password must be at least 6 characters.', isError: true });
          return;
        }
        try {
          await updatePassword(user, editPassword);
        } catch (pwError: any) {
          if (pwError.code === 'auth/requires-recent-login') {
            setProfileMessage({ text: 'Sensitive Operation: Please sign out and sign back in to verify your identity before changing your password.', isError: true });
            return;
          }
          throw pwError;
        }
      }
      
      // Update Auth Display Name
      await updateProfile(user, { displayName: editUsername });
      
      // Sync detailed registry in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editUsername,
        contactNumber: editContact,
        email: editEmail,
        updatedAt: Timestamp.now()
      });

      setProfileMessage({ text: 'Registry updated successfully!', isError: false });
      setTimeout(() => { setIsEditingPersonalInfo(false); setProfileMessage({text: '', isError: false}); }, 1500);
    } catch (error: any) {
      console.error("Profile sync failed:", error);
      let msg = error.message.replace('Firebase:', '').trim();
      if (msg.includes('permission')) msg = "Registry Lock: Insufficient permissions to modify this profile.";
      setProfileMessage({ text: msg, isError: true });
    }
  };

  const handleToggleNotification = async (type: 'email' | 'sms', newVal: boolean) => {
    if (!user) return;
    if (type === 'email') setEmailNotif(newVal);
    if (type === 'sms') setSmsNotif(newVal);
    
    await updateDoc(doc(db, 'users', user.uid), {
      emailNotifications: type === 'email' ? newVal : emailNotif,
      msgNotifications: type === 'sms' ? newVal : smsNotif
    });
  };

  const handleReorder = (order: Order) => {
    setConfig({ ...order.config });
    const shop = shops.find(s => s.id === order.shopId) || null;
    setSelectedShop(shop);
    setActiveTab('upload');
    setUploadStep('setup');
  };

  const resetUpload = () => {
    setConfig({ documents: [], copies: 1, colorMode: 'grayscale', paperSize: 'A4' });
    setSelectedShop(null);
    setPaymentMethod(null);
    setUploadStep('setup');
  };

  const handleConfirmOrder = async () => {
    if (!user || !selectedShop || !paymentMethod) return;

    try {
      const pageCount = config.totalPages || config.documents.length || 1;
      const paperPrice = selectedShop.prices?.[config.paperSize] || selectedShop.pricePerPage || 0;
      const printingFee = pageCount * config.copies * paperPrice;

      const orderData: Omit<Order, 'id' | 'createdAt'> = {
        userId: user.uid,
        shopId: selectedShop.id,
        shopName: selectedShop.name,
        status: 'pending',
        totalAmount: printingFee + 5.00,
        paymentMethod,
        config
      };

      await createOrder(orderData);
      setUploadStep('success');
    } catch (error) {
      console.error("Failed to create order:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="flex flex-col items-center gap-4">
          <Printer className="text-primary animate-bounce" size={48} />
          <p className="text-text-muted font-bold animate-pulse">Initializing PrintLink...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 bg-bg-page text-center">
        <div className="mb-4 p-4 bg-white rounded-[32px] text-primary shadow-lg shadow-indigo-100 border border-indigo-50 shrink-0">
          <Printer size={32} />
        </div>
        <h1 className="text-3xl font-black text-text-main tracking-tight mb-4">Print<span className="text-primary">Link</span></h1>
        
        <form onSubmit={handleEmailAuth} className="w-full max-w-xs flex flex-col gap-2 mb-4">
          {isSignUp && (
            <input 
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-100 font-bold text-sm outline-none focus:border-primary transition-colors placeholder:text-slate-300"
              required={isSignUp}
            />
          )}
          <input 
            type="text" 
            placeholder="Username or Email" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-100 font-bold text-sm outline-none focus:border-primary transition-colors placeholder:text-slate-300"
            required
          />
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"}
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-100 font-bold text-sm outline-none focus:border-primary transition-colors placeholder:text-slate-300 pr-12"
              required
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {isSignUp && (
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-100 font-bold text-sm outline-none focus:border-primary transition-colors placeholder:text-slate-300 pr-12"
                required={isSignUp}
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          )}
          {authError && (
            <p className="text-red-500 text-[10px] font-bold mt-1 mb-1">{authError}</p>
          )}
          <button 
            type="submit" 
            className="w-full bg-text-main text-white py-3 mt-1 rounded-2xl font-black shadow-xl border-2 border-transparent transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
          >
            {isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="flex items-center gap-3 w-full max-w-xs mb-4 opacity-60">
          <div className="h-px bg-slate-200 flex-1"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">OR</span>
          <div className="h-px bg-slate-200 flex-1"></div>
        </div>

        <button
          type="button"
          onClick={handleLogin}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-white text-text-main py-3 px-6 rounded-2xl font-black shadow-md border-2 border-slate-100 hover:border-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
          <span className="text-xs uppercase tracking-widest">Sign in with Google</span>
        </button>

        <button 
          onClick={() => {
            setIsSignUp(!isSignUp);
            setAuthError('');
            setUsername('');
            setPassword('');
            setEmail('');
            setConfirmPassword('');
            setShowPassword(false);
            setShowConfirmPassword(false);
          }}
          className="mt-4 text-[11px] font-black text-text-muted hover:text-primary transition-colors tracking-wide"
        >
          {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Register"}
        </button>
        
        <div className="mt-6 text-[10px] text-text-muted opacity-50 font-black tracking-widest text-center uppercase">
          <p>MADE BY IAHBRN</p>
          <p>ALL RIGHTS RESERVED</p>
        </div>
      </div>
    );
  }

  const handleSignOut = () => {
    auth.signOut();
  };

  return (
    <div className="h-screen bg-bg-page font-sans selection:bg-indigo-100 overflow-hidden">
      {isAdmin ? (
        <AdminScreen />
      ) : isShopOwner ? (
        <ShopOwnerScreen user={user} profile={firestoreProfile} />
      ) : (
        <>
          <AnimatePresence mode="wait">
        {activeTab === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.2 }}
            className="h-[calc(100vh-80px)] overflow-hidden flex flex-col"
          >
            <HomeScreen 
              onStart={() => {
                resetUpload();
                setActiveTab('upload');
              }} 
              onViewAll={() => setActiveTab('orders')}
              onReorder={handleReorder}
              onOrderClick={(orderId) => {
                setActiveTab('orders');
                setExpandedOrderId(orderId);
                setShouldScrollToOrder(true);
              }}
              recentOrders={orders.slice(0, 3)} 
            />
          </motion.div>
        )}

        {activeTab === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col h-[calc(100vh-80px)] overflow-hidden"
          >
            {uploadStep === 'setup' && (
              <SetupScreen 
                onNext={() => setUploadStep('shops')} 
                onBack={() => setActiveTab('home')}
                config={config}
                setConfig={setConfig}
              />
            )}
            {uploadStep === 'shops' && (
              <ShopSelection 
                onNext={() => setUploadStep('payment')} 
                onBack={() => setUploadStep('setup')}
                shops={shops}
                selectedShop={selectedShop}
                setSelectedShop={setSelectedShop}
                userLocation={activeLocation}
              />
            )}
            {uploadStep === 'payment' && (
              <PaymentScreen 
                onConfirm={handleConfirmOrder} 
                onBack={() => setUploadStep('shops')}
                config={config}
                shop={selectedShop!}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                availableMethods={paymentMethods}
              />
            )}
            {uploadStep === 'success' && (
              <div className="flex flex-col items-center justify-center p-8 min-h-[80vh] text-center bg-bg-page overflow-hidden">
                <div className="w-20 h-20 bg-success/20 text-success rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <CheckCircle2 size={40} />
                </div>
                <h1 className="text-3xl font-black text-text-main mb-2">Order Confirmed!</h1>
                <p className="text-sm text-text-muted mb-8 max-w-[280px] font-medium leading-relaxed">
                  Your file has been sent to <span className="font-extrabold text-primary">{selectedShop?.name}</span>. You'll receive a notification when it's ready for pickup.
                </p>
                <div className="w-full max-w-sm">
                  <button
                    onClick={() => {
                      resetUpload();
                      setActiveTab('home');
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-text-main text-white py-4 rounded-2xl font-black shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 transition-all active:scale-95"
                  >
                    <Home size={18} />
                    <span>Back to Home</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="h-[calc(100vh-80px)] w-full max-w-2xl mx-auto overflow-hidden flex flex-col p-4 sm:p-6"
          >
            <header className="flex items-center gap-2 pt-4 pb-4 md:pt-6 md:pb-6 shrink-0">
              <ReceiptText size={22} className="text-primary" strokeWidth={2.5} />
              <h1 className="text-xl font-black text-text-main uppercase tracking-tighter">Order History</h1>
            </header>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
              <div className="flex flex-col gap-4">
                {orders.length === 0 ? (
                  <div className="card-base p-20 text-center flex flex-col items-center gap-4 border-dashed">
                    <Printer className="text-slate-100" size={64} />
                    <p className="text-text-muted font-black text-xs uppercase tracking-widest">No orders found yet</p>
                  </div>
                ) : (
                  orders.map((order) => {
                    const isExpanded = expandedOrderId === order.id;
                    return (
                      <div 
                        key={order.id} 
                        ref={(el) => { orderRefs.current[order.id] = el; }}
                        className={cn(
                          "card-base transition-all duration-300 group hover:border-primary/30",
                          isExpanded ? "p-0 border-primary shadow-md" : "p-3"
                        )}
                      >
                        <div 
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className={cn(
                            "flex flex-col gap-2 cursor-pointer",
                            isExpanded && "p-3 pb-0"
                          )}
                        >
                          <div className="flex justify-between items-start gap-2 sm:gap-3">
                            <div className="flex gap-3 min-w-0 flex-1">
                              <div className={cn(
                                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                                isExpanded ? "bg-primary text-white" : "bg-indigo-50 text-primary"
                              )}>
                                <Printer size={20} className="sm:w-[22px]" />
                              </div>
                              <div className="overflow-hidden min-w-0 flex-1">
                                <h3 className="font-black text-text-main truncate text-xs sm:text-sm tracking-tight">
                                  {order.config.documents.length > 1 
                                    ? `${order.config.documents[0].name} + ${order.config.documents.length - 1} more`
                                    : order.config.documents[0]?.name}
                                </h3>
                                <p className="text-[9px] sm:text-[10px] text-text-muted font-black uppercase tracking-tight truncate">{order.shopName}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <p className="text-[8px] sm:text-[9px] text-primary/60 font-black uppercase">Order #{order.id.slice(-6)}</p>
                                  <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    className="text-primary/40"
                                  >
                                    <ChevronDown size={10} className="sm:w-3" strokeWidth={3} />
                                  </motion.div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1.5 items-center shrink-0">
                              <div className={cn(
                                "px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ring-1 shadow-sm whitespace-nowrap",
                                (order.paymentMethod === 'Cash' && order.status !== 'completed') ? "bg-red-50 text-red-600 ring-red-100" : "bg-emerald-50 text-emerald-600 ring-emerald-100"
                              )}>
                                {(order.paymentMethod === 'Cash' && order.status !== 'completed') ? 'UNPAID' : 'PAID'}
                              </div>
                              <div className={cn(
                                "px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ring-1 shadow-sm whitespace-nowrap",
                                order.status === 'pending' && "bg-amber-50 text-amber-700 ring-amber-100",
                                order.status === 'ready' && "bg-success/10 text-success ring-success/20",
                                order.status === 'completed' && "bg-indigo-50 text-primary ring-indigo-100"
                              )}>
                                {order.status.replace('_', ' ')}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-50">
                            <span className="text-[9px] text-text-muted font-black uppercase tracking-widest">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReorder(order);
                              }}
                              className="bg-indigo-50 text-primary px-3 py-1.5 rounded-[10px] font-black text-[9px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center gap-1.5"
                            >
                              <span>Reorder</span>
                              <Plus size={12} strokeWidth={3} />
                            </button>
                          </div>
                        </div>

                        {/* Expandable Receipt */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 pt-2 space-y-3">
                                <div className="h-px bg-slate-100 border-dashed border-t-2" />
                                
                                <div className="space-y-2">
                                  <div className="flex flex-col gap-1">
                                    <h4 className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Document Breakdown</h4>
                                    <div className="bg-slate-50/50 rounded-xl p-2 space-y-1 border border-slate-100">
                                      {order.config.documents.map((doc, i) => (
                                        <div key={i} className="flex justify-between items-center text-[11px]">
                                          <span className="font-bold text-text-main truncate max-w-[200px]">{doc.name}</span>
                                          <span className="text-text-muted font-black uppercase">{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col">
                                      <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Specifications</span>
                                      <p className="text-[10px] font-black text-text-main uppercase">{order.config.paperSize} • {order.config.colorMode} • {order.config.copies} × ({order.config.totalPages || order.config.documents.length || 1} Pgs)</p>
                                    </div>
                                    <div className="flex flex-col text-right">
                                      <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Payment Method</span>
                                      <p className="text-[10px] font-black text-primary uppercase">{order.paymentMethod || 'Cash'}</p>
                                    </div>
                                  </div>

                                  <div className="space-y-0.5 pt-1.5 border-t border-slate-100">
                                    <h4 className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] mb-1.5 mt-1">Amount Summary</h4>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-text-muted font-bold">Printing Cost</span>
                                      <span className="font-black text-text-main tracking-tight uppercase">{formatPrice(order.totalAmount - 5)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-text-muted font-bold">Convenience Fee</span>
                                      <span className="font-black text-text-main tracking-tight uppercase">₱5.00</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1.5 mt-1 border-t-2 border-slate-100 border-dotted">
                                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Total</span>
                                      <span className="text-lg font-black text-primary tracking-tighter tabular-nums">{formatPrice(order.totalAmount)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="h-[calc(100vh-80px)] w-full max-w-2xl mx-auto overflow-hidden flex flex-col pt-0"
          >
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 flex flex-col gap-6">
              <header className="py-4 text-center flex flex-col items-center gap-3 shrink-0">
                <div className="w-24 h-24 rounded-[32px] border-[4px] border-white shadow-xl flex items-center justify-center bg-primary ring-1 ring-primary/20">
                  <UserIcon size={40} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-text-main tracking-tight uppercase leading-none">{user.displayName || 'No Username'}</h1>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-1.5">{firestoreProfile?.email || user.email}</p>
                </div>
              </header>

              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mb-2 ml-4">Account Settings</h2>
                  <div className="card-base p-2 flex flex-col overflow-hidden gap-1">
                    {[
                      { 
                        icon: <UserIcon size={18} />, 
                        label: 'Personal Information', 
                        sub: 'Username, email, password, contact',
                        onClick: () => {
                          setEditUsername(user.displayName || '');
                          setEditEmail(firestoreProfile?.email || user.email || '');
                          setEditContact(firestoreProfile?.contactNumber || '');
                          setEditPassword('');
                          setIsEditingPersonalInfo(true);
                        }
                      },
                      { 
                        icon: <MapPin size={18} />, 
                        label: 'Location Settings', 
                        sub: userLocations.length > 0 
                          ? `${userLocations.length} Saved Locations • Active: ${activeLocation?.name || 'None'}`
                          : 'Set your pickup location',
                        onClick: () => setIsManagingLocations(true)
                      },
                      { 
                        icon: <Bell size={18} />, 
                        label: 'Notification Settings', 
                        sub: 'Control email & msg alerts',
                        onClick: () => setIsEditingNotifications(true)
                      }
                    ].map((item, i) => (
                      <button 
                        key={i} 
                        onClick={item.onClick}
                        className="flex items-center gap-4 p-4 hover:bg-bg-page rounded-[20px] transition-all text-left active:scale-[0.98]"
                      >
                        <div className="p-3 bg-indigo-50 text-primary rounded-2xl">{item.icon}</div>
                        <div className="flex-1 overflow-hidden">
                          <span className="font-black text-text-main text-sm block tracking-tight">{item.label}</span>
                          <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest truncate block opacity-60">
                            {item.sub}
                          </span>
                        </div>
                        <ChevronRight size={18} className="text-slate-200" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mb-3 ml-4">Payment Accounts</h2>
                  <div className="flex flex-col gap-3">
                    {[
                      { id: 'GCash', icon: <Wallet className="text-blue-500" />, label: 'GCash Wallet' },
                      { id: 'Maya', icon: <CreditCard className="text-green-500" />, label: 'Maya Pay' }
                    ].map(method => {
                      const isConnected = paymentMethods.includes(method.id as any);
                      return (
                        <div key={method.id} className="card-base p-4 flex items-center justify-between border-2 transition-all">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="p-3 bg-slate-50 rounded-2xl shrink-0">{method.icon}</div>
                            <div className="min-w-0">
                              <span className="font-black text-text-main text-sm block tracking-tight truncate">{method.label}</span>
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest truncate block",
                                isConnected ? "text-success" : "text-text-muted opacity-40"
                              )}>
                                {isConnected ? "Linked" : "Not Linked"}
                              </span>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              if (isConnected) {
                                setPaymentMethods(paymentMethods.filter(m => m !== method.id));
                              } else {
                                setPaymentMethods([...paymentMethods, method.id as any]);
                              }
                            }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 shrink-0",
                              isConnected ? "border-slate-100 text-text-muted hover:text-red-500 hover:border-red-100" : "border-primary bg-primary text-white shadow-lg shadow-primary/20"
                            )}
                          >
                            {isConnected ? "Disconnect" : "Connect"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-text-muted font-black uppercase tracking-[0.1em] mt-4 ml-4 leading-relaxed opacity-60">
                    Link your e-wallet accounts to enable digital payments during checkout. Cash on Pickup is always enabled.
                  </p>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-3 bg-red-50 text-red-600 py-4 rounded-[20px] font-black border-2 border-red-100 hover:bg-red-100 transition-all active:scale-[0.98] uppercase tracking-widest text-[10px]"
                  >
                    <LogOut size={16} />
                    <span>Sign Out Account</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Bottom Nav Simulation */}
      {firestoreProfile?.role !== 'admin' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around py-4 px-2 z-50 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <button onClick={() => setActiveTab('home')} className={cn("flex flex-col items-center gap-1 transition-all duration-300 px-4", activeTab === 'home' ? "text-primary scale-110" : "text-slate-300")}>
            <Home size={22} strokeWidth={activeTab === 'home' ? 3 : 2} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Home</span>
          </button>
          <button onClick={() => { setActiveTab('upload'); setUploadStep('setup'); }} className={cn("flex flex-col items-center gap-1 transition-all duration-300 px-4", activeTab === 'upload' ? "text-primary scale-110" : "text-slate-300")}>
            <FileUp size={22} strokeWidth={activeTab === 'upload' ? 3 : 2} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Upload</span>
          </button>
          <button onClick={() => setActiveTab('orders')} className={cn("flex flex-col items-center gap-1 transition-all duration-300 px-4", activeTab === 'orders' ? "text-primary scale-110" : "text-slate-300")}>
            <Printer size={22} strokeWidth={activeTab === 'orders' ? 3 : 2} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Orders</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={cn("flex flex-col items-center gap-1 transition-all duration-300 px-4", activeTab === 'profile' ? "text-primary scale-110" : "text-slate-300")}>
            <UserIcon size={22} strokeWidth={activeTab === 'profile' ? 3 : 2} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Profile</span>
          </button>
        </nav>
      )}
      {/* Multiple Locations Manager Modal */}
      <AnimatePresence>
        {isManagingLocations && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden"
            >
              <div className="p-6 pb-2 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-black text-text-main uppercase tracking-tighter">My Locations</h3>
                  <button 
                    onClick={() => setIsManagingLocations(false)}
                    className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-text-main hover:bg-slate-100 transition-colors"
                  >
                    <X size={18} strokeWidth={3} />
                  </button>
                </div>
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest border-b border-slate-50 pb-4">Manage multiple pickup spots</p>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar px-6 space-y-3 pb-6">
                {userLocations.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center gap-4">
                    <MapPin size={48} className="text-slate-100" />
                    <p className="text-xs font-black text-text-muted uppercase tracking-widest leading-relaxed">No locations saved yet.<br/>Add your current spot below.</p>
                  </div>
                ) : (
                  userLocations.map((loc) => (
                    <div 
                      key={loc.id} 
                      onClick={() => setActiveLocationId(loc.id)}
                      className={cn(
                        "p-4 rounded-[24px] border-2 transition-all cursor-pointer flex items-center gap-4 relative group",
                        loc.id === activeLocationId ? "border-primary bg-indigo-50/30" : "border-slate-50 bg-white hover:border-slate-200"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        loc.id === activeLocationId ? "bg-primary text-white" : "bg-slate-50 text-slate-300"
                      )}>
                        <MapPin size={18} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <span className="font-black text-xs block tracking-tight text-text-main truncate">{loc.name}</span>
                        <span className="text-[8px] text-text-muted font-bold uppercase tracking-widest block opacity-60">
                          {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserLocations(userLocations.filter(l => l.id !== loc.id));
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                      >
                        <X size={16} strokeWidth={3} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 pt-2 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        const newLoc = { 
                          id: Math.random().toString(36).substr(2, 9),
                          lat: pos.coords.latitude, 
                          lng: pos.coords.longitude,
                          name: 'New Location' 
                        };
                        setPendingLocation(newLoc);
                        setTempLocationName('New Location');
                        setIsAddingLocation(true);
                      });
                    }
                  }}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
                >
                  <Plus size={16} strokeWidth={3} />
                  <span>Add New Location</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Location Naming Modal */}
      <AnimatePresence>
        {isAddingLocation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-sm p-6 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => { setIsAddingLocation(false); setPendingLocation(null); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-text-main transition-colors p-2"
              >
                <X size={20} strokeWidth={3} />
              </button>
              <h3 className="text-lg font-black text-text-main uppercase tracking-tighter mb-1">Name this Location</h3>
              <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mb-6 border-b border-slate-100 pb-3">Personalize your pickup spot</p>
              
              <div className="flex flex-col gap-4">
                <input 
                  type="text"
                  value={tempLocationName}
                  onChange={(e) => setTempLocationName(e.target.value)}
                  placeholder="e.g. Home, Office"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2 font-bold text-xs text-text-main placeholder:text-slate-300 focus:border-primary focus:outline-none transition-all"
                  autoFocus
                />

                <button 
                  onClick={() => {
                    if (pendingLocation) {
                      setUserLocations([...userLocations, { ...pendingLocation, name: tempLocationName || 'My Location' }]);
                      setActiveLocationId(pendingLocation.id);
                      setPendingLocation(null);
                    }
                    setIsAddingLocation(false);
                  }}
                  className="w-full bg-primary text-white py-3 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-98 transition-all uppercase tracking-widest text-[10px]"
                >
                  Save & Set Active
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
              {/* Personal Info Modal */}
      <AnimatePresence>
        {isEditingPersonalInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-[32px] sm:rounded-[32px] w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl relative"
            >
              <div className="p-6 pb-2 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-black text-text-main uppercase tracking-tighter">Personal Info</h3>
                  <button 
                    onClick={() => { setIsEditingPersonalInfo(false); setProfileMessage({text:'', isError:false}); }}
                    className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-text-main hover:bg-slate-100 transition-colors"
                  >
                    <X size={18} strokeWidth={3} />
                  </button>
                </div>
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest border-b border-slate-50 pb-4">Update your profile details</p>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar px-6 space-y-4 pb-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest pl-2">Username</label>
                  <input 
                    type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-text-main placeholder:text-slate-300 focus:border-primary focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest pl-2">Email Address</label>
                  <input 
                    type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-text-main placeholder:text-slate-300 focus:border-primary focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest pl-2">Contact Number</label>
                  <div className="flex bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus-within:border-primary transition-all">
                    <span className="text-sm font-bold text-text-muted mr-2">+63</span>
                    <input 
                      type="tel" value={editContact} onChange={e => setEditContact(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="912 345 6789"
                      className="w-full bg-transparent text-sm font-bold text-text-main placeholder:text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest pl-2">Change Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'} value={editPassword} onChange={e => setEditPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-text-main placeholder:text-slate-300 focus:border-primary focus:outline-none transition-all pr-12"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3 text-slate-300">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest pl-2">Confirm Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-text-main placeholder:text-slate-300 focus:border-primary focus:outline-none transition-all pr-12"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3 text-slate-300">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {profileMessage.text && (
                  <p className={cn("text-[10px] font-bold mt-2", profileMessage.isError ? "text-red-500" : "text-success")}>
                    {profileMessage.text}
                  </p>
                )}
              </div>
              <div className="p-6 pt-2 bg-slate-50 border-t border-slate-100 rounded-b-[32px]">
                <button 
                  onClick={handleSavePersonalInfo}
                  className="w-full bg-primary text-white py-4 rounded-xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Settings Modal */}
      <AnimatePresence>
        {isEditingNotifications && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-sm flex flex-col shadow-2xl relative"
            >
              <div className="p-6 pb-2 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-black text-text-main uppercase tracking-tighter">Notifications</h3>
                  <button 
                    onClick={() => setIsEditingNotifications(false)}
                    className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-text-main hover:bg-slate-100 transition-colors"
                  >
                    <X size={18} strokeWidth={3} />
                  </button>
                </div>
                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest border-b border-slate-50 pb-4">Manage app alerts</p>
              </div>

              <div className="px-6 space-y-4 pb-8">
                <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-50 hover:border-slate-100 transition-colors cursor-pointer" onClick={() => handleToggleNotification('email', !emailNotif)}>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-50 text-primary rounded-xl">
                      <ReceiptText size={18} />
                    </div>
                    <div>
                      <span className="font-black text-sm block tracking-tight text-text-main">Email Alerts</span>
                    </div>
                  </div>
                  <div className={cn("w-10 h-6 flex items-center bg-slate-200 rounded-full p-1 cursor-pointer transition-colors duration-300", emailNotif ? "bg-primary" : "")}>
                    <div className={cn("bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300", emailNotif ? "translate-x-4" : "")} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-50 hover:border-slate-100 transition-colors cursor-pointer" onClick={() => handleToggleNotification('sms', !smsNotif)}>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-50 text-primary rounded-xl">
                      <Phone size={18} />
                    </div>
                    <div>
                      <span className="font-black text-sm block tracking-tight text-text-main">SMS Alerts</span>
                    </div>
                  </div>
                  <div className={cn("w-10 h-6 flex items-center bg-slate-200 rounded-full p-1 cursor-pointer transition-colors duration-300", smsNotif ? "bg-primary" : "")}>
                    <div className={cn("bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300", smsNotif ? "translate-x-4" : "")} />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )}
</div>
);
}
