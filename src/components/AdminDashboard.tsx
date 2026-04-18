import React, { useState, useEffect } from 'react';
import { Printer, CheckCircle2, XCircle, Clock, Trash2, Shield, RefreshCcw, LayoutDashboard, Store, Users, MapPin, ChevronRight, Search, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, OrderStatus, Shop } from '../types';
import { subscribeToAllOrders, updateOrderStatus, deleteOrder } from '../services/orderService';
import { getShops, updateShop } from '../services/shopService';
import { cn, formatPrice } from '../lib/utils';

export function AdminDashboard({ onBack }: { onBack: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [activeView, setActiveView] = useState<'orders' | 'shops'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAllOrders(setOrders);
    getShops().then(setShops);
    return () => unsubscribe();
  }, []);

  const handleStatusUpdate = async (orderId: string, status: OrderStatus) => {
    await updateOrderStatus(orderId, status);
  };

  const handleDelete = async (orderId: string) => {
    if (confirm("Are you sure you want to delete this order?")) {
      await deleteOrder(orderId);
    }
  };

  const toggleShopStatus = async (shopId: string, isOpen: boolean) => {
    const nextOpen = !isOpen;
    await updateShop(shopId, { isOpen: nextOpen });
    setShops(prev => prev.map(s => s.id === shopId ? { ...s, isOpen: nextOpen } : s));
  };

  const updateShopPrice = async (shopId: string) => {
    const newPrice = prompt("Enter new price per page (PHP):");
    if (newPrice && !isNaN(parseFloat(newPrice))) {
      const price = parseFloat(newPrice);
      await updateShop(shopId, { pricePerPage: price });
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, pricePerPage: price } : s));
    }
  };
  const handleMasterReset = async () => {
    const pendingOrders = orders.filter(o => o.status === 'pending');
    if (pendingOrders.length === 0) {
      alert("No pending orders to clear.");
      return;
    }
    if (confirm(`Clear all ${pendingOrders.length} pending orders? This cannot be undone.`)) {
      setIsRefreshing(true);
      for (const order of pendingOrders) {
        await deleteOrder(order.id);
      }
      setIsRefreshing(false);
      alert("All pending orders cleared.");
    }
  };

  const filteredOrders = orders.filter(o => {
    const term = searchTerm.toLowerCase();
    return o.id.toLowerCase().includes(term) || 
           o.shopName.toLowerCase().includes(term) ||
           o.config.documents.some(doc => doc.name.toLowerCase().includes(term));
  });

  return (
    <div className="flex flex-col gap-6 p-4 max-w-lg mx-auto min-h-screen bg-slate-50 relative pb-24">
      <header className="flex justify-between items-center py-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase leading-none">Admin</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Management Portal</p>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="p-3 bg-white rounded-xl shadow-sm text-slate-400 hover:text-slate-900 transition-colors border border-slate-100"
        >
          <XCircle size={24} />
        </button>
      </header>

      <div className="flex gap-2">
        <button 
          onClick={() => setActiveView('orders')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
            activeView === 'orders' ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "bg-white text-slate-400 border border-slate-100"
          )}
        >
          <LayoutDashboard size={18} />
          <span>Orders</span>
        </button>
        <button 
          onClick={() => setActiveView('shops')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
            activeView === 'shops' ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "bg-white text-slate-400 border border-slate-100"
          )}
        >
          <Store size={18} />
          <span>Shops</span>
        </button>
      </div>

      {activeView === 'orders' ? (
        <div className="flex flex-col gap-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                placeholder="Search orders, shops, files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none transition-all shadow-sm"
              />
            </div>
            <button 
              onClick={handleMasterReset}
              disabled={isRefreshing}
              className="px-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
            >
              <RefreshCcw size={16} className={cn(isRefreshing && "animate-spin")} />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {filteredOrders.length === 0 ? (
              <div className="bg-white p-12 rounded-[32px] text-center border-2 border-dashed border-slate-100">
                <p className="text-slate-300 font-black uppercase text-xs tracking-widest">No matching orders</p>
              </div>
            ) : (
              filteredOrders.map(order => (
                <div key={order.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                        order.status === 'ready' ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-400"
                      )}>
                        <Printer size={22} />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-sm tracking-tight">
                          {order.config.documents.length > 1 
                            ? `${order.config.documents[0].name} + ${order.config.documents.length - 1} more`
                            : order.config.documents[0]?.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight">{order.shopName} • {formatPrice(order.totalAmount)}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter",
                      order.status === 'pending' && "bg-amber-50 text-amber-600",
                      order.status === 'ready' && "bg-green-50 text-green-600",
                      order.status === 'completed' && "bg-blue-50 text-blue-600"
                    )}>
                      {order.status}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {order.status === 'pending' && (
                      <button 
                        onClick={() => handleStatusUpdate(order.id, 'ready')}
                        className="flex-1 bg-green-50 text-green-600 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={14} />
                        <span>Ready</span>
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button 
                        onClick={() => handleStatusUpdate(order.id, 'completed')}
                        className="flex-1 bg-blue-50 text-blue-600 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={14} />
                        <span>Finish</span>
                      </button>
                    )}
                    <button 
                      onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                      className="flex-1 bg-slate-50 text-slate-400 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle size={14} />
                      <span>Cancel</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(order.id)}
                      className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center"
                      title="Delete Permanently"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <button className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white transition-all">
            <Plus size={18} />
            <span>Register New Shop</span>
          </button>
          
          <div className="grid grid-cols-1 gap-3">
            {shops.map(shop => (
              <div key={shop.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-primary rounded-2xl flex items-center justify-center">
                      <MapPin size={22} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm tracking-tight">{shop.name}</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight">{shop.address}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleShopStatus(shop.id, shop.isOpen)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all",
                      shop.isOpen ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                    )}
                  >
                    {shop.isOpen ? "Open" : "Closed"}
                  </button>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Rate (Per Page)</span>
                    <span className="font-black text-slate-900">₱{shop.pricePerPage.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => updateShopPrice(shop.id)}
                    className="px-4 py-2 bg-slate-50 text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all border border-slate-100"
                  >
                    Edit Rate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
