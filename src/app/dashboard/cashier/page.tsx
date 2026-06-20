'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle, XCircle, CreditCard, CheckCheck, Utensils, Loader2, Bell, Volume2, VolumeX, AlertCircle, AlertTriangle, Armchair, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/browser';
import { useSoundNotification } from '@/hooks/use-sound-notification';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Order, OrderStatus } from '@/types';

export default function CashierPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [session, setSession] = useState<{ restaurantId?: string; restaurantName?: string } | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showNewOrderAlert, setShowNewOrderAlert] = useState(false);
  const prevNewCount = useRef(0);
  const { playSound, isMuted, toggleMute } = useSoundNotification({ enabled: true, volume: 0.4 });
  const { toast } = useToast();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s?.user) {
        setUser({ email: s.user.email });
        const { data: staff } = await supabase.from('staff').select('*, restaurants(name)').eq('user_id', s.user.id).eq('is_active', true).maybeSingle();
        if (staff) setSession({ restaurantId: staff.restaurant_id, restaurantName: (staff.restaurants as Record<string,string>)?.name });
      }
      setSessionLoading(false);
    });
  }, []);

  useEffect(() => {
    const restaurantId = session?.restaurantId;
    if (!restaurantId) { setIsLoading(false); return; }
    setIsLoading(true);
    fetchOrders(restaurantId);
    const interval = setInterval(() => fetchOrders(restaurantId), 5000);
    return () => clearInterval(interval);
  }, [session?.restaurantId]);

  useEffect(() => {
    const currentNew = orders.filter(o => o.status === 'CREATED').length;
    if (currentNew > prevNewCount.current && prevNewCount.current >= 0) {
      playSound('urgent');
      setShowNewOrderAlert(true);
      setTimeout(() => setShowNewOrderAlert(false), 3000);
    }
    prevNewCount.current = currentNew;
  }, [orders, playSound]);

  async function fetchOrders(restaurantId: string) {
    const res = await fetch(`/api/public/restaurant?restaurantId=${restaurantId}`);
    setIsLoading(false);
  }

  async function apiAction(orderId: string, status: string, reason?: string) {
    setActionLoading(orderId);
    const res = await fetch('/api/public/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, status, reason }),
    });
    return res.ok;
  }

  const handleAccept = useCallback(async (orderId: string) => {
    if (await apiAction(orderId, 'ACCEPTED')) {
      toast({ title: 'Accepted' });
      setOrders(o => o.map(o => o.id === orderId ? { ...o, status: 'ACCEPTED' as OrderStatus } : o));
    } else toast({ variant: 'destructive', title: 'Error' });
    setActionLoading(null);
  }, [toast]);

  const handleMarkPaid = useCallback(async (orderId: string) => {
    if (await apiAction(orderId, 'PAID')) {
      toast({ title: 'Marked Paid' });
      setOrders(o => o.map(o => o.id === orderId ? { ...o, status: 'PAID' as OrderStatus } : o));
    } else toast({ variant: 'destructive', title: 'Error' });
    setActionLoading(null);
  }, [toast]);

  const handleClose = useCallback(async (orderId: string) => {
    if (await apiAction(orderId, 'CLOSED')) {
      setSelectedOrder(null);
      setOrders(o => o.filter(o => o.id !== orderId));
      toast({ title: 'Closed' });
    } else toast({ variant: 'destructive', title: 'Error' });
    setActionLoading(null);
  }, [toast]);

  const handleCancel = useCallback(async () => {
    if (!orderToCancel) return;
    setShowCancelDialog(false);
    const reason = cancelReason.trim() || 'Cancelled by staff';
    if (await apiAction(orderToCancel.id, 'CANCELLED', reason)) {
      setSelectedOrder(null);
      setOrders(o => o.filter(o => o.id !== orderToCancel.id));
      toast({ title: 'Cancelled' });
    } else toast({ variant: 'destructive', title: 'Error' });
    setActionLoading(null);
    setOrderToCancel(null);
  }, [orderToCancel, cancelReason, toast]);

  const formatTimeAgo = (date: Date) => { const diff = Math.floor((Date.now() - date.getTime()) / 60000); if (diff < 1) return 'Just now'; if (diff < 60) return `${diff}m ago`; return `${Math.floor(diff / 60)}h ago`; };

  if (sessionLoading || isLoading) return <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-[#D4A373]" /></div>;
  if (!session?.restaurantId) return <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center"><div className="text-center"><AlertCircle className="w-12 h-12 text-[#4d4540] mx-auto mb-4" /><Button onClick={() => router.push('/login')}>Go to Login</Button></div></div>;

  const newOrders = orders.filter(o => o.status === 'CREATED');
  const acceptedOrders = orders.filter(o => o.status === 'ACCEPTED');
  const paidOrders = orders.filter(o => o.status === 'PAID');

  return (
    <div className="min-h-screen bg-[#FDF8F3] flex flex-col">
      <header className="bg-[#FDF8F3] border-b border-[#E8E2DA] px-6 py-4 sticky top-0 z-50 shadow-[0px_10px_30px_rgba(58,50,45,0.05)]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-[32px] text-[#3D2C1E] font-[Playfair_Display]">Active Tables</h1>
            <span className="px-3 py-1 bg-[#FFF1E0] text-[#D4A373] rounded-full text-xs font-bold uppercase tracking-wider">{orders.length} BUSY</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleMute} className="p-2.5 hover:bg-white rounded-full">{isMuted ? <VolumeX className="w-5 h-5 text-[#7f756f]" /> : <Volume2 className="w-5 h-5 text-[#D4A373]" />}</button>
            <div className="w-9 h-9 bg-[#3D2C1E] text-white rounded-full flex items-center justify-center text-sm font-bold">{user?.email?.[0]?.toUpperCase() || 'S'}</div>
          </div>
        </div>
      </header>

      {showNewOrderAlert && <div className="fixed top-20 right-4 z-50"><div className="bg-[#D4A373] text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3"><Bell className="w-5 h-5 animate-pulse" /><span className="font-bold text-sm">New Order!</span></div></div>}

      <div className="flex-1 flex overflow-hidden">
        <section className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.length === 0 && <div className="col-span-full bg-white rounded-[20px] p-12 shadow-[0px_10px_30px_rgba(58,50,45,0.05)] text-center"><Utensils className="w-16 h-16 text-[#d1c4bd] mx-auto mb-4" /><h3 className="text-xl font-bold text-[#3D2C1E]">No Active Orders</h3></div>}

            {newOrders.map(order => (
              <div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-white rounded-[20px] p-6 shadow-[0px_10px_30px_rgba(58,50,45,0.05)] cursor-pointer active:scale-[0.98] border-2 border-amber-300 group">
                <div className="flex justify-between items-start mb-4"><div><h3 className="text-[32px] font-bold text-[#3D2C1E] font-[Playfair_Display]">{order.tableLabel}</h3><p className="text-[#7f756f] text-xs font-bold uppercase">{order.items.length} ITEMS</p></div><span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">NEW</span></div>
                <div className="flex items-center gap-2 mb-4"><Clock className="w-4 h-4 text-[#D4A373]" /><span className="text-[#7f756f] text-sm">{formatTimeAgo(order.createdAt)}</span></div>
                <div className="border-t border-[#f2edeb] pt-4"><p className="text-[#3D2C1E] font-bold text-lg">{order.total.toFixed(3)} TND</p></div>
              </div>
            ))}
            {acceptedOrders.map(order => (
              <div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-white rounded-[20px] p-6 shadow-[0px_10px_30px_rgba(58,50,45,0.05)] cursor-pointer active:scale-[0.98] ring-2 ring-[#3D2C1E] group">
                <div className="flex justify-between items-start mb-4"><div><h3 className="text-[32px] font-bold text-[#3D2C1E] font-[Playfair_Display]">{order.tableLabel}</h3><p className="text-[#7f756f] text-xs font-bold uppercase">{order.items.length} ITEMS</p></div><span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">ACCEPTED</span></div>
                <div className="flex items-center gap-2 mb-4"><Utensils className="w-4 h-4 text-[#7f756f]" /><span className="text-[#7f756f] text-sm">{formatTimeAgo(order.createdAt)}</span></div>
                <div className="border-t border-[#f2edeb] pt-4"><p className="text-[#3D2C1E] font-bold text-lg">{order.total.toFixed(3)} TND</p></div>
              </div>
            ))}
            {paidOrders.map(order => (
              <div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-white rounded-[20px] p-6 shadow-[0px_10px_30px_rgba(58,50,45,0.05)] cursor-pointer active:scale-[0.98] ring-2 ring-blue-400 group">
                <div className="flex justify-between items-start mb-4"><div><h3 className="text-[32px] font-bold text-[#3D2C1E] font-[Playfair_Display]">{order.tableLabel}</h3><p className="text-[#7f756f] text-xs font-bold uppercase">{order.items.length} ITEMS</p></div><span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">PAID</span></div>
                <div className="flex items-center gap-2 mb-4"><CheckCircle className="w-4 h-4 text-blue-500" /><span className="text-[#7f756f] text-sm">Ready to Clear</span></div>
                <div className="border-t border-[#f2edeb] pt-4"><p className="text-[#3D2C1E] font-bold text-lg">{order.total.toFixed(3)} TND</p></div>
              </div>
            ))}
          </div>
        </section>

        {selectedOrder && (
          <aside className="w-[400px] bg-white border-l border-[#E8E2DA] flex flex-col h-full shadow-2xl z-40">
            <div className="p-6 border-b border-[#f2edeb]">
              <div className="flex justify-between items-center mb-1"><h2 className="text-xl font-bold text-[#3D2C1E] font-[Playfair_Display]">{selectedOrder.tableLabel}</h2><button onClick={() => setSelectedOrder(null)} className="text-[#7f756f] hover:bg-[#f8f2f1] rounded-full p-1"><XCircle className="w-6 h-6" /></button></div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
              {selectedOrder.items.map((item, i) => (
                <div key={i} className="flex justify-between items-start p-3 rounded-xl bg-[#f8f2f1]/50">
                  <div className="flex gap-4"><span className="font-bold text-[#3D2C1E] bg-[#FFF1E0] w-8 h-8 rounded-full flex items-center justify-center text-sm">{item.quantity}x</span><div><p className="text-[#3D2C1E] font-semibold">{item.name}</p>{item.note && <p className="text-[#7f756f] text-sm italic">&quot;{item.note}&quot;</p>}</div></div>
                  <p className="text-[#3D2C1E] font-semibold">{(item.price * item.quantity).toFixed(3)} TND</p>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-[#f2edeb]"><div className="flex justify-between items-center p-4 bg-[#FFF1E0] rounded-xl"><p className="text-lg font-bold text-[#3D2C1E]">Total</p><p className="text-2xl font-bold text-[#3D2C1E]">{selectedOrder.total.toFixed(3)} TND</p></div></div>
            </div>
            <div className="p-6 bg-[#f8f2f1] grid grid-cols-2 gap-3 border-t border-[#E8E2DA]">
              {selectedOrder.status === 'CREATED' && <>
                <button onClick={() => handleAccept(selectedOrder.id)} disabled={!!actionLoading} className="col-span-2 py-3.5 bg-[#D4A373] text-white rounded-full font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98]">{actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCheck className="w-5 h-5" /> Accept Order</>}</button>
                <button onClick={() => { setOrderToCancel(selectedOrder); setShowCancelDialog(true); }} className="col-span-2 py-3.5 border-2 border-red-400 text-red-500 rounded-full font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-50"><XCircle className="w-5 h-5" /> Cancel</button>
              </>}
              {selectedOrder.status === 'ACCEPTED' && <>
                <button onClick={() => handleMarkPaid(selectedOrder.id)} className="py-3.5 bg-[#3D2C1E] text-white rounded-full font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90"><CreditCard className="w-5 h-5" /> Mark Paid</button>
                <button onClick={() => handleClose(selectedOrder.id)} className="py-3.5 bg-[#f2edeb] text-[#3D2C1E] rounded-full font-semibold text-sm flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" /> Close</button>
                <button onClick={() => { setOrderToCancel(selectedOrder); setShowCancelDialog(true); }} className="col-span-2 py-3.5 border-2 border-red-400 text-red-500 rounded-full font-semibold text-sm"><XCircle className="w-5 h-5" /> Cancel</button>
              </>}
              {selectedOrder.status === 'PAID' && (
                <button onClick={() => handleClose(selectedOrder.id)} className="col-span-2 py-3.5 bg-emerald-600 text-white rounded-full font-bold text-sm flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" /> Close Order</button>
              )}
            </div>
          </aside>
        )}
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-white rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-[#3D2C1E]">Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#7f756f]">
              <input className="mt-3 w-full p-3 border border-[#d1c4bd] rounded-full text-sm bg-[#fdf8f3] focus:border-[#D4A373] outline-none" placeholder="Reason..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Keep Order</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-red-500 text-white rounded-full hover:bg-red-600">Cancel Order</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
