import React, { useState, useEffect, useMemo } from 'react';
import { Shop, Order, UserProfile } from '../types';
import { getShops, updateShop } from '../services/shopService';
import { subscribeToAllOrders } from '../services/orderService';
import { createShopWithOwner } from '../services/adminService';
import { subscribeToAllUsers } from '../services/userService';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Store, Plus, Factory, X, Users, BarChart3, Search, LogOut, MapPin, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function AdminScreen() {
  const [activeAdminTab, setActiveAdminTab] = useState<'shops'>('shops');
  const [shops, setShops] = useState<Shop[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddingShop, setIsAddingShop] = useState(false);
  const [isEditingShop, setIsEditingShop] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newShop, setNewShop] = useState({
    name: '', address: '', latitude: 14.5, longitude: 121.0, email: '', username: '', password: ''
  });

  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [editingOwner, setEditingOwner] = useState({ email: '', username: '', password: '' });

  useEffect(() => {
    getShops().then(setShops);
    const unsubOrders = subscribeToAllOrders(setOrders);
    const unsubUsers = subscribeToAllUsers(setAllUsers);
    return () => {
      unsubOrders();
      unsubUsers();
    };
  }, []);

  const stats = useMemo(() => {
    return {
      totalShops: shops.length
    };
  }, [shops]);

  const shopOrdersCount = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      counts[o.shopId] = (counts[o.shopId] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShop.name || !newShop.email || !newShop.username || !newShop.password) return;
    
    setIsSubmitting(true);
    try {
      const result = await createShopWithOwner(
        { 
          name: newShop.name, 
          address: newShop.address, 
          latitude: newShop.latitude, 
          longitude: newShop.longitude, 
          isOpen: true,
          pricePerPage: 2.0 // Default
        },
        {
          email: newShop.email,
          username: newShop.username,
          password: newShop.password
        }
      );

      if (result && result.wasLinked) {
        alert(`Registry Initialized via Identity Linking:\nThe email "${newShop.email}" is already registered. The new terminal has been successfully associated with this existing account.\n\nNOTE: The existing account password remains active. The "Default Password" you provided was ignored for security reasons.`);
      }

      setIsAddingShop(false);
      setNewShop({ name: '', address: '', latitude: 14.5, longitude: 121.0, email: '', username: '', password: '' });
      getShops().then(setShops);
    } catch (err: any) {
      console.error("Failed to create shop account:", err);
      let errorMsg = err.message || "Operation failed. Please try again.";
      if (err.message && err.message.includes('permission')) {
        errorMsg = "Security Block: You do not have sufficient administrative clearance for this operation.";
      }
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShop) return;

    setIsSubmitting(true);
    try {
      const { id, ...updates } = editingShop;
      // 1. Update shop document
      await updateShop(id, updates);
      
      // 2. Update owner profile if modified (Note: Actual Auth email/pass change requires user re-auth or Admin SDK)
      // Here we update the Firestore profile record for registry consistency
      const ownerDocRef = doc(db, 'users', editingShop.ownerId);
      await updateDoc(ownerDocRef, {
        email: editingOwner.email,
        displayName: editingOwner.username,
        updatedAt: Timestamp.now()
      });

      setIsEditingShop(false);
      setEditingShop(null);
      getShops().then(setShops);
    } catch (err) {
      console.error("Failed to update shop or owner record:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = () => {
    auth.signOut();
  };

  return (
    <div className="h-full flex flex-col pt-0 bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      {/* Admin Navbar */}
      <header className="px-4 py-6 md:px-6 md:py-8 shrink-0 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-[18px] md:rounded-[24px] bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 ring-1 ring-white/20 transform -rotate-3 hover:rotate-0 transition-transform duration-500 shrink-0">
              <Factory className="text-white w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-none uppercase">CONSOLE</h1>
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest">v2.4.RC1</span>
              </div>
              <div className="flex items-center flex-wrap gap-2 mt-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest leading-none">System Up</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
            <div className="flex flex-col items-start md:items-end px-4 md:border-r border-white/5">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Total Shops</span>
              <span className="text-xl md:text-2xl font-black text-white tracking-tight tabular-nums leading-none">{stats.totalShops}</span>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setIsAddingShop(true)}
                className="group relative flex items-center gap-2 bg-indigo-600 text-white px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.15em] hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/40 active:scale-95 whitespace-nowrap"
              >
                <Plus size={14} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                <span>Add New</span>
              </button>

              <button 
                onClick={handleSignOut}
                className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500 transition-all active:scale-95 shrink-0"
                title="Terminate Session"
              >
                <LogOut size={18} md:size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar pt-8 px-4 md:px-6 pb-32">
        <AnimatePresence mode="wait">
          {activeAdminTab === 'shops' && (
            <motion.div 
              key="shops" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <div className="mb-4">
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">All Shops</h2>
              </div>

              <div className="grid gap-3">
                {shops.map(shop => (
                  <div 
                    key={shop.id} 
                    onClick={() => {
                      setEditingShop(shop);
                      setIsEditingShop(true);
                      const owner = allUsers.find(u => u.uid === shop.ownerId);
                      if (owner) {
                        setEditingOwner({ email: owner.email, username: owner.displayName, password: '' });
                      }
                    }}
                    className="bg-white/5 border border-white/10 rounded-[20px] md:rounded-[24px] p-4 md:p-5 flex items-center justify-between group hover:bg-white/[0.08] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 border border-white/10 text-indigo-400 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                        <Store size={20} md:size={22} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-black text-sm text-white truncate">{shop.name}</span>
                        <span className="text-[8px] md:text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5 truncate">{shop.address || 'Location Unknown'}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className={cn(
                        "text-[7px] md:text-[8px] font-black uppercase tracking-widest mt-1 px-2 py-0.5 rounded-full",
                        shop.isOpen ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      )}>{shop.isOpen ? 'Open' : 'Closed'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isAddingShop && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-[40px] w-full max-w-md shadow-2xl relative overflow-hidden"
            >
              <div className="p-8 pb-4 flex justify-between items-center shrink-0">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight">Terminal & Owner Registration</h3>
                <button 
                  onClick={() => setIsAddingShop(false)}
                  className="w-10 h-10 shrink-0 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              <form onSubmit={handleAddShop} className="p-8 pt-4 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] border-b border-indigo-500/20 pb-2">Terminal Details</h4>
                   <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Station Identity</label>
                    <input 
                      required type="text" value={newShop.name} onChange={e => setNewShop({...newShop, name: e.target.value})}
                      placeholder="Terminal Name"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Geo-Physical Address</label>
                    <input 
                      required type="text" value={newShop.address} onChange={e => setNewShop({...newShop, address: e.target.value})}
                      placeholder="Street Address"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Coord X</label>
                      <input 
                        required type="number" step="any" value={newShop.latitude} onChange={e => setNewShop({...newShop, latitude: parseFloat(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Coord Y</label>
                      <input 
                        required type="number" step="any" value={newShop.longitude} onChange={e => setNewShop({...newShop, longitude: parseFloat(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] border-b border-emerald-500/20 pb-2">Account Provisioning</h4>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Owner Email</label>
                    <input 
                      required type="email" value={newShop.email} onChange={e => setNewShop({...newShop, email: e.target.value})}
                      placeholder="owner@printlink.com"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Owner Username</label>
                    <input 
                      required type="text" value={newShop.username} onChange={e => setNewShop({...newShop, username: e.target.value})}
                      placeholder="shop_owner_name"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Default Password</label>
                    <input 
                      required type="text" value={newShop.password} onChange={e => setNewShop({...newShop, password: e.target.value})}
                      placeholder="Access Key"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-700"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "w-full mt-6 text-white py-5 rounded-[24px] font-black shadow-2xl transition-all uppercase tracking-[0.2em] text-[10px] ring-1 ring-white/10 flex items-center justify-center gap-2",
                    isSubmitting ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-indigo-600 shadow-indigo-600/30 hover:bg-indigo-500"
                  )}
                >
                  {isSubmitting ? "Provisioning..." : "Initialize Registry"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {isEditingShop && editingShop && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-[40px] w-full max-w-md shadow-2xl relative overflow-hidden"
            >
              <div className="p-8 pb-4 flex justify-between items-center shrink-0">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight">Edit Terminal</h3>
                <button 
                  onClick={() => setIsEditingShop(false)}
                  className="w-10 h-10 shrink-0 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              <form onSubmit={handleUpdateShop} className="p-8 pt-4 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] border-b border-indigo-500/20 pb-2">Terminal Details</h4>
                   <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Station Identity</label>
                    <input 
                      required type="text" value={editingShop.name} onChange={e => setEditingShop({...editingShop, name: e.target.value})}
                      placeholder="Terminal Name"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Geo-Physical Address</label>
                    <input 
                      required type="text" value={editingShop.address} onChange={e => setEditingShop({...editingShop, address: e.target.value})}
                      placeholder="Street Address"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Coord X</label>
                      <input 
                        required type="number" step="any" value={editingShop.latitude} onChange={e => setEditingShop({...editingShop, latitude: parseFloat(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Coord Y</label>
                      <input 
                        required type="number" step="any" value={editingShop.longitude} onChange={e => setEditingShop({...editingShop, longitude: parseFloat(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 mt-6">
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] border-b border-emerald-500/20 pb-2">Owner Profile</h4>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Owner Email</label>
                      <input 
                        required type="email" value={editingOwner.email} onChange={e => setEditingOwner({...editingOwner, email: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Owner Username</label>
                      <input 
                        required type="text" value={editingOwner.username} onChange={e => setEditingOwner({...editingOwner, username: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-700"
                      />
                    </div>
                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                      <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest leading-relaxed">
                        Security Notice: Login credentials (passwords) are protected. Terminal owners must manage their own security keys via the profile dashboard.
                      </p>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "w-full mt-6 text-white py-5 rounded-[24px] font-black shadow-2xl transition-all uppercase tracking-[0.2em] text-[10px] ring-1 ring-white/10 flex items-center justify-center gap-2",
                    isSubmitting ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-indigo-600 shadow-indigo-600/30 hover:bg-indigo-500"
                  )}
                >
                  {isSubmitting ? "Saving..." : "Update Configuration"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
