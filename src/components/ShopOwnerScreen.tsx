import React, { useState, useEffect } from 'react';
import { Shop, Order, PrintConfig } from '../types';
import { subscribeToShopOrders, updateOrder } from '../services/orderService';
import { auth, db } from '../firebase';
import { 
  Home, ClipboardList, User, Store, Clock, CheckCircle2, 
  Package, LogOut, Printer, X, ChevronRight, Settings, CreditCard, Lock,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatPrice } from '../lib/utils';
import { doc, updateDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { updatePassword, updateProfile } from 'firebase/auth';

interface ShopOwnerScreenProps {
  user: any;
  profile: any;
}

export function ShopOwnerScreen({ user, profile }: ShopOwnerScreenProps) {
  const [myShops, setMyShops] = useState<Shop[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'profile'>('home');
  const [orderFilter, setOrderFilter] = useState<'active' | 'completed'>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{text: string, isError: boolean} | null>(null);
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Profile Edit States
  const [extUsername, setExtUsername] = useState(user.displayName || '');
  const [extPassword, setExtPassword] = useState('');
  const [extShopName, setExtShopName] = useState('');
  const [extAddress, setExtAddress] = useState('');
  const [extLat, setExtLat] = useState(0);
  const [extLng, setExtLng] = useState(0);
  const [extPriceA4, setExtPriceA4] = useState<number>(0);
  const [extPriceLetter, setExtPriceLetter] = useState<number>(0);
  const [extPriceLegal, setExtPriceLegal] = useState<number>(0);

  useEffect(() => {
    const q = query(collection(db, 'shops'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const owned = snapshot.docs.map(document => {
        const data = document.data();
        const isOpen = typeof data.isOpen === 'boolean' ? data.isOpen : data.status === 'open';
        return { id: document.id, ...data, isOpen } as Shop;
      });
      
      setMyShops(owned);
      if (owned.length > 0 && !activeShopId) {
        setActiveShopId(owned[0].id);
      }
    });
    return () => unsubscribe();
  }, [user.uid]);

  const activeShop = myShops.find(s => s.id === activeShopId);

  useEffect(() => {
    if (activeShop) {
      setExtShopName(activeShop.name);
      setExtAddress(activeShop.address);
      setExtLat(activeShop.latitude);
      setExtLng(activeShop.longitude);
      setExtUsername(user.displayName || '');
      setExtPriceA4(activeShop.prices?.A4 || activeShop.pricePerPage || 0);
      setExtPriceLetter(activeShop.prices?.Letter || activeShop.pricePerPage || 0);
      setExtPriceLegal(activeShop.prices?.Legal || activeShop.pricePerPage || 0);
    }
  }, [activeShop, user]);

  useEffect(() => {
    if (activeShopId) {
      const unsubscribe = subscribeToShopOrders(activeShopId, (newOrders) => {
        setOrders(newOrders);
        setSelectedOrder(prev => {
          if (!prev) return null;
          return newOrders.find(o => o.id === prev.id) || null;
        });
      });
      return () => unsubscribe();
    }
  }, [activeShopId]);

  const stats = {
    pending: orders.filter(o => o.status === 'pending').length,
    ready: orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
    customers: new Set(orders.map(o => o.userId)).size,
    revenue: orders.filter(o => o.status === 'completed').reduce((acc, o) => acc + o.totalAmount, 0),
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateOrder(orderId, { status });
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handlePrintAndReady = async (order: Order) => {
    alert("Simulating Download & Print sequence. Connecting to local printer...");
    await handleUpdateOrderStatus(order.id, 'ready');
  };

  const toggleShopStatus = async () => {
    if (!activeShop) return;
    setIsSubmitting(true);
    try {
      const newState = !activeShop.isOpen;
      await updateDoc(doc(db, 'shops', activeShop.id), { 
        isOpen: newState,
        status: newState ? 'open' : 'closed' 
      });
    } catch (err: any) {
      setMessage({text: "Update failed: Check connection or permissions.", isError: true});
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!activeShop || !user) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      if (extPassword) {
        await updatePassword(user, extPassword);
      }
      if (extUsername !== user.displayName) {
        await updateProfile(user, { displayName: extUsername });
        await updateDoc(doc(db, 'users', user.uid), { displayName: extUsername });
      }
      
      await updateDoc(doc(db, 'shops', activeShop.id), {
        name: extShopName,
        address: extAddress,
        latitude: Number(extLat),
        longitude: Number(extLng),
        prices: {
          A4: Number(extPriceA4),
          Letter: Number(extPriceLetter),
          Legal: Number(extPriceLegal)
        }
      });
      
      setExtPassword('');
      setMessage({text: "Profile updated successfully.", isError: false});
    } catch (err: any) {
      let emsg = err.message || "Failed to update profile.";
      if (err.code === 'auth/requires-recent-login') {
        emsg = "Please sign out and sign back in to change your password.";
      }
      setMessage({text: emsg, isError: true});
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-bg-page w-full mx-auto overflow-hidden">
      {/* Header matching User Dashboard style */}
      <header className="flex justify-between items-center px-4 sm:px-6 pt-6 pb-2 shrink-0 max-w-5xl mx-auto w-full">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11">
              <div className="absolute inset-0 bg-primary/15 rounded-[14px] rotate-6"></div>
              <div className="absolute inset-0 bg-white border border-primary/20 shadow-sm rounded-[14px] flex items-center justify-center -rotate-3">
                <Store size={20} className="text-primary" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase text-text-main leading-none">
                {activeShop?.name || 'Shop Central'}
              </h1>
              <p className="text-[10px] font-black uppercase tracking-widest mt-1 flex items-center gap-1">
                <span className={cn("w-1.5 h-1.5 rounded-full block", activeShop?.isOpen ? "bg-success animate-pulse" : "bg-red-500")} />
                <span className={activeShop?.isOpen ? "text-success" : "text-red-500"}>
                  {activeShop?.isOpen ? 'Open' : 'Closed'}
                </span>
              </p>
            </div>
          </div>
        </div>
        <button onClick={() => auth.signOut()} className="p-2.5 bg-white hover:bg-red-50 hover:text-red-500 hover:border-red-200 border rounded-full text-text-muted transition-colors border-slate-200">
          <LogOut size={16} strokeWidth={3} />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative pb-24">
        
        {/* --- HOME TAB --- */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="card-base p-5 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-amber-50 text-amber-500 rounded-xl"><Clock size={16} strokeWidth={3} /></div>
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.1em]">Pending</span>
                </div>
                <p className="text-3xl font-black text-text-main tracking-tighter tabular-nums">{stats.pending}</p>
              </div>
              <div className="card-base p-5 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-success/10 text-success rounded-xl"><CheckCircle2 size={16} strokeWidth={3} /></div>
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.1em]">Completed</span>
                </div>
                <p className="text-3xl font-black text-text-main tracking-tighter tabular-nums">{stats.completed}</p>
              </div>
              <div className="card-base p-5 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-indigo-50 text-primary rounded-xl"><User size={16} strokeWidth={3} /></div>
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.1em]">Users</span>
                </div>
                <p className="text-3xl font-black text-text-main tracking-tighter tabular-nums">{stats.customers}</p>
              </div>
              <div className="card-base p-5 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-accent/10 text-accent rounded-xl"><CreditCard size={16} strokeWidth={3} /></div>
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.1em]">Revenue</span>
                </div>
                <p className="text-xl font-black text-text-main tracking-tighter tabular-nums truncate">{formatPrice(stats.revenue)}</p>
              </div>
            </div>

            {/* Recent Orders Preview */}
            <section className="flex flex-col gap-4 mt-2">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-60">Recent Orders</h2>
                <button 
                  onClick={() => setActiveTab('orders')} 
                  className="text-[10px] font-black text-primary uppercase transition-all hover:translate-x-1"
                >
                  View All
                </button>
              </div>
              
              <div className="flex flex-col gap-3">
                {orders.length === 0 ? (
                  <div className="card-base p-12 text-center flex flex-col items-center gap-4 border-dashed border-2 md:col-span-2">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                      <ClipboardList size={32} />
                    </div>
                    <p className="text-text-muted font-black text-[10px] uppercase tracking-widest">No order history found</p>
                  </div>
                ) : (
                  orders.sort((a,b) => b.createdAt - a.createdAt).slice(0, 5).map(order => (
                    <div 
                      key={order.id} 
                      className="card-base p-4 flex flex-col gap-4 group transition-all hover:border-primary/30 cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className={cn(
                            "p-2.5 rounded-2xl transition-colors",
                            order.status === 'pending' ? "bg-amber-100 text-amber-600" :
                            order.status === 'ready' ? "bg-indigo-50 text-primary group-hover:bg-primary group-hover:text-white" :
                            "bg-emerald-50 text-success"
                          )}>
                            <Package size={20} className={order.status === 'ready' ? "group-hover:text-white" : ""} />
                          </div>
                          <div className="overflow-hidden">
                            <h3 className="font-black text-text-main truncate max-w-[140px] sm:max-w-xs tracking-tight">
                              {order.config.documents[0].name} {order.config.documents.length > 1 && `+${order.config.documents.length - 1} more`}
                            </h3>
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-tighter truncate">
                              ID: {order.id.slice(-6)} • {formatPrice(order.totalAmount)}
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ring-1 shrink-0",
                          order.status === 'pending' && "bg-amber-50 text-amber-600 ring-amber-200",
                          order.status === 'ready' && "bg-indigo-50 text-indigo-600 ring-indigo-200",
                          order.status === 'cancelled' && "bg-red-50 text-red-600 ring-red-200",
                          order.status === 'completed' && "bg-success/20 text-success ring-success/30"
                        )}>
                          {order.status}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {/* --- ORDERS TAB --- */}
        {activeTab === 'orders' && (
          <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
            <header className="flex justify-between items-end px-1 pt-2 shrink-0">
              <h1 className="text-xl font-black text-text-main uppercase tracking-tighter">All Orders</h1>
            </header>

            <div className="flex p-1 bg-white border border-slate-100 rounded-xl shadow-sm md:w-fit md:min-w-[400px]">
              <button
                onClick={() => setOrderFilter('active')}
                className={cn("flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", orderFilter === 'active' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-muted hover:text-text-main")}
              >
                Active ({stats.pending + stats.ready})
              </button>
              <button
                onClick={() => setOrderFilter('completed')}
                className={cn("flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", orderFilter === 'completed' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-muted hover:text-text-main")}
              >
                History ({stats.completed})
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {orders
                .filter(o => orderFilter === 'active' ? (o.status === 'pending' || o.status === 'ready') : (o.status === 'completed' || o.status === 'cancelled'))
                .sort((a,b) => b.createdAt - a.createdAt)
                .map(order => (
                <div 
                  key={order.id} 
                  className="card-base p-4 flex flex-col gap-4 group transition-all hover:border-primary/30 cursor-pointer"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className={cn(
                         "p-2.5 rounded-2xl transition-colors",
                         order.status === 'pending' ? "bg-amber-100 text-amber-600" :
                         order.status === 'ready' ? "bg-indigo-50 text-primary group-hover:bg-primary group-hover:text-white" :
                         order.status === 'cancelled' ? "bg-red-50 text-red-600" :
                         "bg-emerald-50 text-success"
                      )}>
                        {order.status === 'completed' ? <CheckCircle2 size={20} /> : <Package size={20} />}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-black text-text-main truncate max-w-[140px] sm:max-w-xs tracking-tight">
                          {order.config.documents[0].name} {order.config.documents.length > 1 && `+${order.config.documents.length - 1} more`}
                        </h3>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-tighter truncate">
                          ID: {order.id.slice(-6)} • {configSummary(order.config)} • {formatPrice(order.totalAmount)}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ring-1 shrink-0",
                      order.status === 'pending' && "bg-amber-50 text-amber-600 ring-amber-200",
                      order.status === 'ready' && "bg-indigo-50 text-indigo-600 ring-indigo-200",
                      order.status === 'cancelled' && "bg-red-50 text-red-600 ring-red-200",
                      order.status === 'completed' && "bg-success/20 text-success ring-success/30"
                    )}>
                      {order.status}
                    </div>
                  </div>
                </div>
              ))}
              {orders.filter(o => orderFilter === 'active' ? (o.status === 'pending' || o.status === 'ready') : (o.status === 'completed' || o.status === 'cancelled')).length === 0 && (
                <div className="card-base p-12 text-center flex flex-col items-center gap-4 border-dashed border-2 md:col-span-2 lg:col-span-3">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                    <ClipboardList size={32} />
                  </div>
                  <p className="text-text-muted font-black text-[10px] uppercase tracking-widest">No order match</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- PROFILE TAB --- */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
            <header className="flex justify-between items-end px-1 pt-2 shrink-0">
              <h1 className="text-xl font-black text-text-main uppercase tracking-tighter">Shop Configuration</h1>
            </header>
            
            {message && (
              <div className={cn("p-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3", message.isError ? "bg-red-50 text-red-600 border border-red-100" : "bg-success/10 text-success border border-success/20")}>
                {message.isError ? <X size={16} strokeWidth={3}/> : <CheckCircle2 size={16} strokeWidth={3}/>}
                {message.text}
              </div>
            )}

            {/* Shop Status & Pricing */}
            <div className="card-base p-5 flex flex-col gap-5">
              <div className="flex flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-black text-text-main text-sm uppercase tracking-tight">Accepting Orders?</h3>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1 opacity-70">Make shop visible to users</p>
                </div>
                <button 
                  onClick={toggleShopStatus}
                  disabled={isSubmitting || !activeShop}
                  className={cn(
                    "relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none shrink-0 disabled:opacity-50 ring-2 ring-transparent shadow-inner",
                    activeShop?.isOpen ? 'bg-success ring-success/20' : 'bg-slate-300'
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-md",
                      activeShop?.isOpen ? 'translate-x-9' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              <div className="border-t-2 border-slate-100 border-dashed" />

              <div className="space-y-3">
                <h3 className="font-black text-text-main text-xs uppercase tracking-tight">Paper Size Pricing</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-2">A4 Cost</label>
                     <input 
                       type="number" step="any" value={extPriceA4} onChange={e => setExtPriceA4(parseFloat(e.target.value))}
                       className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-3 py-3 text-xs font-bold text-text-main focus:border-primary focus:outline-none transition-all tabular-nums"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-2">Letter Cost</label>
                     <input 
                       type="number" step="any" value={extPriceLetter} onChange={e => setExtPriceLetter(parseFloat(e.target.value))}
                       className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-3 py-3 text-xs font-bold text-text-main focus:border-primary focus:outline-none transition-all tabular-nums"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-2">Legal Cost</label>
                     <input 
                       type="number" step="any" value={extPriceLegal} onChange={e => setExtPriceLegal(parseFloat(e.target.value))}
                       className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-3 py-3 text-xs font-bold text-text-main focus:border-primary focus:outline-none transition-all tabular-nums"
                     />
                  </div>
                </div>
              </div>
            </div>

            <div className="card-base overflow-hidden">
              <div className="p-5 space-y-6 md:space-y-0 md:grid md:grid-cols-2 md:gap-8">
                
                {/* Identity / User fields */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-60">Owner Identity</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-2">Email Address</label>
                       <input 
                         type="text" value={profile?.email || user.email || ''} readOnly disabled
                         className="w-full bg-slate-100 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-400 focus:outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-2">Public Username</label>
                       <input 
                         type="text" value={extUsername} onChange={e => setExtUsername(e.target.value)}
                         className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-text-main focus:border-primary focus:outline-none transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-2">Rest Password (Optional)</label>
                       <div className="flex bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus-within:border-primary transition-all">
                         <Lock size={16} className="text-slate-400 mr-2 mt-0.5" strokeWidth={3} />
                         <input 
                           type="password" value={extPassword} onChange={e => setExtPassword(e.target.value)} placeholder="••••••••"
                           className="w-full bg-transparent text-sm font-bold text-text-main placeholder:text-slate-300 focus:outline-none"
                         />
                       </div>
                    </div>
                  </div>
                </div>
                
                <hr className="border-t-2 border-dashed border-slate-100 md:hidden" />

                {/* Shop / Pricing fields */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-60">Map Details</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-2">Business Name</label>
                       <input 
                         type="text" value={extShopName} onChange={e => setExtShopName(e.target.value)}
                         className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-text-main focus:border-primary focus:outline-none transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-2">Location Address</label>
                       <input 
                         type="text" value={extAddress} onChange={e => setExtAddress(e.target.value)}
                         className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-text-main focus:border-primary focus:outline-none transition-all"
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-2">Latitude</label>
                         <input 
                           type="number" step="any" value={extLat} onChange={e => setExtLat(parseFloat(e.target.value))}
                           className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-text-main focus:border-primary focus:outline-none transition-all tabular-nums"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-2">Longitude</label>
                         <input 
                           type="number" step="any" value={extLng} onChange={e => setExtLng(parseFloat(e.target.value))}
                           className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-text-main focus:border-primary focus:outline-none transition-all tabular-nums"
                         />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-5 pt-2 bg-slate-50 border-t border-slate-100 rounded-b-[24px]">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSubmitting}
                  className="w-full bg-primary text-white py-4 rounded-xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                  {isSubmitting ? <Clock size={16} className="animate-spin" /> : <Settings size={16} />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- BOTTOM NAVIGATION BAR matching User Dashboard --- */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-5xl mx-auto bg-white border-t border-slate-100 flex justify-around py-4 px-2 z-50 md:rounded-t-[40px] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-safe">
        {[
          { id: 'home', icon: Home, label: 'Dash' },
          { id: 'orders', icon: ClipboardList, label: 'Orders' },
          { id: 'profile', icon: User, label: 'Settings' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex flex-col items-center gap-1.5 p-2 px-6 transition-all relative"
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all duration-300 relative z-10",
                isActive ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30" : "text-text-muted hover:bg-slate-50"
              )}>
                <Icon size={20} strokeWidth={isActive ? 3 : 2} />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest transition-colors",
                isActive ? "text-primary" : "text-text-muted"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* --- ORDER DETAILS BOTTOM SHEET / MODAL --- */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-end md:items-center justify-center p-0 md:p-6"
            onClick={() => setSelectedOrder(null)} 
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()} 
              className="bg-bg-page w-full max-w-2xl md:rounded-[32px] rounded-t-[32px] shadow-2xl flex flex-col max-h-[90vh] md:max-h-[85vh] pb-safe relative"
            >
              <header className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white md:rounded-t-[32px] rounded-t-[32px] z-10 shadow-sm">
                <div>
                  <h3 className="text-lg font-black text-text-main uppercase tracking-tighter">Order #{selectedOrder.id.slice(-6)}</h3>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">{new Date(selectedOrder.createdAt).toLocaleDateString()} at {new Date(selectedOrder.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="w-10 h-10 bg-slate-50 hover:bg-slate-100 text-text-muted rounded-full flex items-center justify-center transition-colors border border-slate-200"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                
                {/* Print Files Section */}
                <section>
                  <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-60 mb-3">Uploads Payload</h4>
                  <div className="card-base p-2 border border-slate-100 space-y-2">
                    {selectedOrder.config.documents.map((doc, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-[16px] shadow-sm border border-slate-50">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 bg-indigo-50 rounded-[12px] text-primary"><Printer size={16} strokeWidth={3} /></div>
                          <span className="text-sm font-black text-text-main tracking-tight truncate">{doc.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest shrink-0 bg-slate-50 px-2.5 py-1 rounded-full">{(doc.size / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                    ))}
                    
                    {/* Tool to auto-forward */}
                    {selectedOrder.status === 'pending' && (
                      <button 
                        onClick={() => handlePrintAndReady(selectedOrder)}
                        className="w-full py-4 mt-2 bg-primary text-white rounded-[16px] flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-md shadow-primary/20 font-black text-[10px] uppercase tracking-widest"
                      >
                        <Printer size={16} strokeWidth={3} />
                        Print File & Mark Ready
                      </button>
                    )}
                  </div>
                </section>

                <section className="grid grid-cols-3 gap-3">
                  <div className="card-base p-4 text-center">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Paper</p>
                    <p className="text-sm font-black text-text-main mt-1.5">{selectedOrder.config.paperSize}</p>
                  </div>
                  <div className="card-base p-4 text-center">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Color</p>
                    <p className="text-sm font-black text-text-main mt-1.5 uppercase truncate" title={selectedOrder.config.colorMode}>{selectedOrder.config.colorMode}</p>
                  </div>
                  <div className="card-base p-4 text-center">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">QTY</p>
                    <p className="text-sm font-black text-text-main mt-1.5">{selectedOrder.config.copies} ×</p>
                  </div>
                </section>

                <section className="card-base p-5 border border-slate-100 flex flex-col gap-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-text-muted uppercase tracking-widest text-[10px]">Payment Method</span>
                    <span className="font-black text-text-main uppercase tracking-tight text-xs">{selectedOrder.paymentMethod}</span>
                  </div>
                  <div className="border-t-2 border-slate-100 border-dashed" />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Grand Total</span>
                    <span className="text-2xl font-black text-primary tracking-tighter tabular-nums">{formatPrice(selectedOrder.totalAmount)}</span>
                  </div>
                  
                  {/* Matching Paid / Unpaid Status exactly like user side */}
                  <div className={cn(
                    "mt-2 px-3 py-2.5 rounded-xl text-center text-[10px] font-black uppercase tracking-widest",
                    (selectedOrder.paymentMethod !== 'Cash' || selectedOrder.status === 'completed') 
                      ? "bg-success/10 text-success border border-success/20" 
                      : "bg-red-50 text-red-600 border border-red-100"
                  )}>
                    {(selectedOrder.paymentMethod !== 'Cash' || selectedOrder.status === 'completed') ? 'Paid / Settled' : 'Unpaid - Reqt. Cash'}
                  </div>
                </section>
              </div>

              {/* Action Bar */}
              <div className="p-6 bg-white border-t border-slate-100 sticky bottom-0 z-10 md:rounded-b-[32px] pb-safe">
                <div className="flex flex-col gap-3">
                   {selectedOrder.status === 'pending' && (
                     <div className="text-center text-[10px] font-black text-text-muted uppercase tracking-widest opacity-60">
                       Press "Print File" above to execute.
                     </div>
                   )}
                   {selectedOrder.status === 'ready' && (
                     <button 
                       onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'completed')}
                       className="w-full py-4 bg-success text-white rounded-[20px] font-black flex items-center justify-center gap-3 shadow-xl shadow-success/20 hover:scale-[1.01] active:scale-98 transition-all text-xs uppercase tracking-widest"
                     >
                       <span>Mark as Completed</span>
                       <CheckCircle2 size={18} strokeWidth={3} />
                     </button>
                   )}
                   {selectedOrder.status === 'completed' && (
                     <div className="w-full py-4 bg-slate-50 text-slate-400 rounded-[20px] font-black text-xs uppercase tracking-widest text-center border-2 border-slate-100">
                       Order is Finalized
                     </div>
                   )}
                   {selectedOrder.status === 'cancelled' && (
                     <div className="w-full py-4 bg-red-50 text-red-400 rounded-[20px] font-black text-xs uppercase tracking-widest text-center border border-red-100">
                       Order Cancelled
                     </div>
                   )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function configSummary(config: PrintConfig) {
  const pages = config.totalPages || config.documents.length || 1;
  return `${config.copies}x ${config.paperSize} ${config.colorMode.charAt(0).toUpperCase()} (${pages}Pg)`;
}
