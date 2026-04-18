import React, { useState } from 'react';
import { FileUp, Printer, MapPin, CheckCircle2, MoreHorizontal, ChevronRight, X, Plus, Minus, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatPrice, calculateDistance } from '../lib/utils';
import { PrintConfig, Shop, PaymentMethod } from '../types';
import { PDFDocument } from 'pdf-lib';

// --- Home Screen ---
export function HomeScreen({ 
  onStart, 
  onViewAll,
  onReorder,
  onOrderClick,
  recentOrders 
}: { 
  onStart: () => void, 
  onViewAll: () => void,
  onReorder: (order: any) => void,
  onOrderClick: (orderId: string) => void,
  recentOrders: any[] 
}) {
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-2xl mx-auto bg-bg-page w-full pb-4 sm:pb-6">
        <header className="flex justify-between items-center pt-2 shrink-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 group cursor-pointer">
              {/* Stylized Logo Mark */}
              <div className="relative w-11 h-11 transition-transform duration-300 group-hover:scale-105">
                {/* Offset pastel layer */}
                <div className="absolute inset-0 bg-primary/15 rounded-[14px] rotate-6 transition-all duration-300 group-hover:rotate-12 group-hover:bg-primary/25"></div>
                {/* Front card layer */}
                <div className="absolute inset-0 bg-white border border-primary/20 shadow-sm rounded-[14px] flex items-center justify-center -rotate-3 transition-transform duration-300 group-hover:rotate-0">
                  <Printer size={20} className="text-primary" strokeWidth={2.5} />
                </div>
              </div>
              {/* Dual-tone typography */}
              <h1 className="text-2xl font-black tracking-tighter uppercase">
                <span className="text-text-main">Print</span><span className="text-primary">Link</span>
              </h1>
            </div>
          </div>
        </header>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="w-full h-48 -mt-2 rounded-[36px] bg-primary text-white flex flex-col items-center justify-center gap-4 shadow-[0_20px_40px_rgba(79,70,229,0.25)] relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-[1.35] duration-700" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-10 -mb-10 transition-transform group-hover:scale-[1.35] duration-700" />
          
          <div className="p-4 bg-white/20 rounded-[20px] backdrop-blur-md shadow-inner relative z-10">
            <FileUp size={36} strokeWidth={3} />
          </div>
          <div className="text-center z-10 px-6 relative">
            <span className="text-lg font-black tracking-tight uppercase">Upload Document</span>
          </div>
        </motion.button>

        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-60">Recent Orders</h2>
            <button 
              onClick={onViewAll} 
              className="text-[10px] font-black text-primary uppercase transition-all hover:translate-x-1"
            >
              View All
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            {recentOrders.length === 0 ? (
              <div className="card-base p-12 text-center flex flex-col items-center gap-4 border-dashed border-2">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                  <Printer size={32} />
                </div>
                <p className="text-text-muted font-black text-[10px] uppercase tracking-widest">No print history found</p>
              </div>
            ) : (
              recentOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="card-base p-4 flex flex-col gap-4 group transition-all hover:border-primary/30 cursor-pointer"
                  onClick={() => onOrderClick(order.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="p-2.5 bg-indigo-50 rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors">
                        <Printer size={20} className="text-primary group-hover:text-white" />
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-black text-text-main truncate max-w-[140px] sm:max-w-xs tracking-tight">
                          {order.config.documents.length > 1 
                            ? `${order.config.documents[0].name} + ${order.config.documents.length - 1} more`
                            : order.config.documents[0]?.name}
                        </h3>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-tighter truncate">{order.shopName}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ring-1 shrink-0",
                      order.status === 'pending' && "bg-amber-100 text-amber-700 ring-amber-200",
                      order.status === 'ready' && "bg-success/20 text-success ring-success/30",
                      order.status === 'completed' && "bg-indigo-100 text-primary ring-indigo-200"
                    )}>
                      {order.status}
                    </div>
                  </div>
                  {order.status === 'completed' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onReorder(order);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-bg-page rounded-xl text-[10px] font-black text-primary uppercase tracking-[0.15em] border border-indigo-100 hover:bg-primary hover:text-white transition-all shadow-sm"
                    >
                      <span>Reorder</span>
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// --- Setup Screen ---
export function SetupScreen({ 
  onNext, 
  onBack, 
  config, 
  setConfig 
}: { 
  onNext: () => void, 
  onBack: () => void,
  config: PrintConfig,
  setConfig: (c: PrintConfig) => void
}) {
  const [isCounting, setIsCounting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsCounting(true);
      const filesArray = Array.from(e.target.files);
      try {
        const newDocs = await Promise.all(filesArray.map(async (f: File) => {
          let pages = 1;
          if (f.name.toLowerCase().endsWith('.pdf')) {
            try {
              const arrayBuffer = await f.arrayBuffer();
              const pdfDoc = await PDFDocument.load(arrayBuffer);
              pages = pdfDoc.getPageCount();
            } catch (err) {
              console.error("Failed to count PDF pages for", f.name, err);
            }
          }
          return { name: f.name, size: f.size, pages };
        }));

        setConfig(prevConfig => {
          const updatedDocs = [...prevConfig.documents, ...newDocs];
          const calculatedTotal = updatedDocs.reduce((sum, doc) => sum + (doc.pages || 1), 0);
          return { ...prevConfig, documents: updatedDocs, totalPages: calculatedTotal };
        });
      } catch (err) {
        console.error("Error reading uploaded files", err);
      } finally {
        setIsCounting(false);
      }
    }
  };

  const removeDocument = (index: number) => {
    const newDocs = config.documents.filter((_, i) => i !== index);
    const calculatedTotal = newDocs.reduce((sum, doc) => sum + (doc.pages || 1), 0);
    setConfig({ ...config, documents: newDocs, totalPages: calculatedTotal === 0 ? 1 : calculatedTotal });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] p-4 md:p-6 max-w-2xl mx-auto bg-bg-page w-full overflow-hidden">
      <header className="flex items-center gap-4 pt-4 pb-1 md:pt-6 md:pb-2 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-white/50 rounded-full text-text-main">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <h1 className="text-xl font-black text-text-main uppercase tracking-tighter">Configure Print</h1>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar py-2">
        <div className="flex flex-col gap-4 md:gap-6">
          {/* Upload Area */}
          <div className="flex flex-col gap-4">
            <div className={cn(
              "relative border-[4px] border-dashed rounded-[40px] p-8 flex flex-col items-center justify-center gap-4 transition-all duration-500",
              config.documents.length > 0 ? "border-success bg-success/5" : "border-slate-200 hover:border-primary bg-white shadow-xl shadow-slate-100"
            )}>
              <div className="p-4 bg-indigo-50 text-primary rounded-[20px] group-hover:scale-110 transition-transform">
                <Plus size={32} strokeWidth={3} />
              </div>
              <div className="text-center flex flex-col gap-1">
                <p className="font-black text-text-main text-lg tracking-tight uppercase">Add Documents</p>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest opacity-60">PDF, JPG, or DOCX</p>
              </div>
              <input 
                type="file" 
                multiple
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleFileChange}
              />
            </div>

            {config.documents.length > 0 && (
              <div className="flex flex-col gap-2">
                {config.documents.map((doc, idx) => (
                  <div key={`${doc.name}-${idx}`} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group overflow-hidden">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-success/10 text-success rounded-xl flex items-center justify-center shrink-0">
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <p className="font-black text-text-main text-xs truncate tracking-tight">{doc.name}</p>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">{(doc.size / 1024 / 1024).toFixed(2)} MB • {doc.pages || 1} Pages</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeDocument(idx)}
                      className="p-2 text-text-muted hover:text-red-500 transition-colors shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex flex-col gap-6 mt-2">
            <section>
              <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] mb-2 ml-2">Paper Specification</h2>
              <div className="flex gap-2">
                {['A4', 'Letter', 'Legal'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setConfig({ ...config, paperSize: s as any })}
                    className={cn(
                      "flex-1 py-3 rounded-2xl font-black transition-all uppercase text-[11px] border-[3px] tracking-widest",
                      config.paperSize === s ? "border-primary bg-primary text-white shadow-xl shadow-primary/20" : "border-white bg-white text-text-muted shadow-sm hover:border-slate-100"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] mb-2 ml-2">Color Mode</h2>
              <div className="flex gap-2">
                {['Color', 'Grayscale'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setConfig({ ...config, colorMode: m.toLowerCase() as any })}
                    className={cn(
                      "flex-1 py-3 rounded-2xl font-black transition-all text-[11px] uppercase border-[3px] tracking-widest",
                      config.colorMode === m.toLowerCase() ? "border-primary bg-primary text-white shadow-xl shadow-primary/20" : "border-white bg-white text-text-muted shadow-sm hover:border-slate-100"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </section>



            <section>
              <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] mb-2 ml-2">Number of Copies</h2>
              <div className="flex items-center justify-between px-2">
                <button 
                  onClick={() => setConfig({ ...config, copies: Math.max(1, config.copies - 1) })}
                  className="w-10 h-10 bg-white rounded-full shadow-sm border-[3px] border-white flex items-center justify-center font-black text-text-muted hover:border-slate-100 hover:text-primary transition-all active:scale-95 disabled:opacity-30"
                  disabled={config.copies <= 1}
                  title="Decrease"
                >
                  <Minus size={18} strokeWidth={3} />
                </button>
                <div className="flex-1 flex justify-center">
                  <span className="font-black text-3xl text-text-main tracking-tighter tabular-nums">{config.copies}</span>
                </div>
                <button 
                  onClick={() => setConfig({ ...config, copies: config.copies + 1 })}
                  className="w-10 h-10 bg-primary text-white rounded-full shadow-md shadow-primary/20 flex items-center justify-center font-black hover:scale-105 active:scale-95 transition-all"
                  title="Increase"
                >
                  <Plus size={18} strokeWidth={3} />
                </button>
              </div>
            </section>
          </div>
          
          <div className="pt-2 pb-2">
            <button
              disabled={config.documents.length === 0 || isCounting}
              onClick={onNext}
              className="w-full bg-primary text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50 disabled:shadow-none transition-all hover:scale-[1.01] active:scale-98 uppercase tracking-widest text-xs"
            >
              <span>{isCounting ? 'Counting pages...' : 'Pick a Printing Shop'}</span>
              <ChevronRight size={18} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Shop Selection Screen ---
export function ShopSelection({ 
  onNext, 
  onBack, 
  shops, 
  selectedShop, 
  setSelectedShop,
  userLocation
}: { 
  onNext: () => void, 
  onBack: () => void,
  shops: Shop[],
  selectedShop: Shop | null,
  setSelectedShop: (s: Shop) => void,
  userLocation?: { lat: number, lng: number }
}) {
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] p-4 md:p-6 max-w-2xl mx-auto bg-bg-page w-full overflow-hidden">
      <header className="flex items-center gap-4 pt-4 pb-1 md:pt-6 md:pb-2 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-white/50 rounded-full text-text-main">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <h1 className="text-xl font-black text-text-main uppercase tracking-tighter">Nearby Shops</h1>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar py-2 px-1">
        <div className="flex flex-col gap-3">
          {shops.map((shop) => {
            const distance = userLocation 
              ? calculateDistance(userLocation.lat, userLocation.lng, shop.latitude, shop.longitude)
              : null;
              
            return (
              <motion.div
                key={shop.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => shop.isOpen && setSelectedShop(shop)}
                className={cn(
                  "card-base p-4 transition-all cursor-pointer flex justify-between items-center border-[3px] gap-4",
                  selectedShop?.id === shop.id ? "border-primary bg-indigo-50/50 shadow-xl shadow-primary/10" : "border-white bg-white shadow-sm hover:border-slate-50",
                  !shop.isOpen && "opacity-50 cursor-not-allowed grayscale"
                )}
              >
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  <div className={cn(
                    "w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 transition-colors shadow-inner",
                    selectedShop?.id === shop.id ? "bg-primary text-white" : "bg-indigo-50 text-primary"
                  )}>
                    <MapPin size={24} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-black text-text-main text-base tracking-tight leading-none mb-1 truncate">{shop.name}</span>
                    <span className="text-[9px] text-text-muted font-bold uppercase tracking-wide truncate mb-1">{shop.address}</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          shop.isOpen ? "bg-success animate-pulse" : "bg-red-500"
                        )} />
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest",
                          shop.isOpen ? "text-success" : "text-red-500"
                        )}>
                          {shop.isOpen ? "Open" : "Closed"}
                        </span>
                      </div>
                      {distance !== null && (
                        <div className="flex items-center gap-1 text-primary">
                          <Navigation size={8} fill="currentColor" />
                          <span className="text-[8px] font-black uppercase tracking-widest">
                            {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`} away
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-base font-black text-primary tracking-tighter tabular-nums text-right">₱{shop.pricePerPage.toFixed(2)}</span>
                </div>
              </motion.div>
            );
          })}
          
          <div className="pt-2 pb-2">
            <button
              disabled={!selectedShop}
              onClick={onNext}
              className="w-full bg-primary text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50 disabled:shadow-none transition-all hover:scale-[1.01] active:scale-98 uppercase tracking-widest text-xs"
            >
              <span>Summary & Payment</span>
              <ChevronRight size={18} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Payment Screen ---
export function PaymentScreen({ 
  onConfirm, 
  onBack, 
  config, 
  shop,
  paymentMethod,
  setPaymentMethod,
  availableMethods 
}: { 
  onConfirm: () => void, 
  onBack: () => void,
  config: PrintConfig,
  shop: Shop,
  paymentMethod: PaymentMethod | null,
  setPaymentMethod: (p: PaymentMethod) => void,
  availableMethods: PaymentMethod[]
}) {
  const [error, setError] = useState<string | null>(null);
  const pageCount = config.totalPages || config.documents.length || 1;
  const paperPrice = shop.prices?.[config.paperSize] || shop.pricePerPage || 0;
  const printingFee = pageCount * config.copies * paperPrice;
  const serviceFee = 5.00;
  const totalAmount = printingFee + serviceFee;

  const handleConfirm = () => {
    if (!paymentMethod) {
      setError("Please select a payment option to continue.");
      return;
    }
    setError(null);
    onConfirm();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] p-4 md:p-6 max-w-2xl mx-auto bg-bg-page w-full overflow-hidden">
      <header className="flex items-center gap-4 pt-4 pb-1 md:pt-6 md:pb-2 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-white/50 rounded-full text-text-main">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <h1 className="text-xl font-black text-text-main uppercase tracking-tighter">Review & Pay</h1>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar py-2 px-1">
        <div className="flex flex-col gap-5 md:gap-6">
          <section className="bg-white p-5 sm:p-7 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 opacity-10 md:opacity-20 -mr-16 -mt-16 rounded-full" />
            
            <div className="relative z-10 flex flex-col gap-5">
              <h2 className="text-xs font-black text-text-muted uppercase tracking-[0.25em] mb-1">Order Summary</h2>
              
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-slate-100">
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter mb-0.5">Uploaded Documents</span>
                    <p className="font-black text-text-main text-sm sm:text-base tracking-tight truncate leading-tight">
                      {config.documents.length > 1 
                        ? `${config.documents[0].name} + ${config.documents.length - 1} more`
                        : config.documents[0]?.name}
                    </p>
                  </div>
                  <div className="flex flex-col overflow-hidden sm:text-right">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter mb-0.5">Print Partner Shop</span>
                    <p className="font-black text-primary tracking-tight truncate leading-tight text-sm sm:text-base">{shop.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-5 border-b border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Specs</span>
                    <p className="font-black text-text-main text-xs uppercase tracking-tight">{config.copies} × {config.paperSize} ({pageCount} {pageCount === 1 ? 'Page' : 'Pages'})</p>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Output</span>
                    <p className="font-black text-text-main text-xs uppercase tracking-tight">{config.colorMode}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-text-muted font-bold">Base Cost</span>
                    <span className="font-black text-text-main tracking-tight uppercase">{formatPrice(printingFee)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-text-muted font-bold">Convenience Fee</span>
                    <span className="font-black text-text-main tracking-tight uppercase">{formatPrice(serviceFee)}</span>
                  </div>
                  <div className="pt-5 mt-4 flex justify-between items-center border-t-2 border-slate-100 border-dotted">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Grand Total</span>
                    <span className="text-3xl sm:text-4xl font-black text-primary tracking-tighter tabular-nums">{formatPrice(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex justify-between items-end px-2">
              <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em]">Payment Selection</h2>
              {error && <p className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1 animate-pulse"><X size={10} strokeWidth={3} /> {error}</p>}
            </div>
            
            <div className="flex flex-col gap-2">
              {[
                { id: 'GCash', label: 'GCash Wallet' },
                { id: 'Maya', label: 'Maya Pay' },
                { id: 'Cash', label: 'Cash on Pickup' }
              ].map((m) => {
                const isAvailable = m.id === 'Cash' || availableMethods.includes(m.id as any);
                return (
                  <button
                    key={m.id}
                    disabled={!isAvailable}
                    onClick={() => { setPaymentMethod(m.id as any); setError(null); }}
                    className={cn(
                      "flex items-center justify-between py-4 px-5 sm:px-6 rounded-[22px] border-[3px] transition-all group",
                      paymentMethod === m.id ? "border-primary bg-indigo-50/30 ring-4 ring-primary/5" : "border-white bg-white hover:border-slate-50 shadow-sm",
                      !isAvailable && "opacity-40 grayscale cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-[3px] flex items-center justify-center transition-all",
                        paymentMethod === m.id ? "border-primary bg-primary shadow-[0_0_10px_rgba(79,70,229,0.3)]" : "border-slate-200"
                      )}>
                        {paymentMethod === m.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <div>
                        <span className={cn(
                          "font-black text-xs sm:text-sm uppercase tracking-widest transition-colors",
                          paymentMethod === m.id ? "text-primary" : "text-text-muted group-hover:text-text-main"
                        )}>{m.label}</span>
                        {!isAvailable && (
                          <p className="text-[8px] font-black uppercase text-red-400">Link account in Profile</p>
                        )}
                      </div>
                    </div>
                    {m.id === 'Cash' && <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full uppercase">Instant</span>}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="pt-2 pb-2">
            <button
              onClick={handleConfirm}
              className="w-full bg-accent text-white py-4 rounded-[20px] font-black flex items-center justify-center gap-3 shadow-xl shadow-accent/20 hover:scale-[1.01] active:scale-98 transition-all text-xs uppercase tracking-widest"
            >
              <span>Confirm & Pay • {formatPrice(totalAmount)}</span>
              <CheckCircle2 size={20} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
