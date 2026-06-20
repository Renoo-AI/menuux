'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Loader2, 
  Coffee, 
  Bell, 
  CreditCard, 
  ArrowLeft,
  RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderStatusTimeline } from '@/components/order/OrderStatusTimeline';
import { CallWaiterSheet } from '@/components/order/CallWaiterSheet';
import { RequestBillSheet } from '@/components/order/RequestBillSheet';
import { supabase } from '@/lib/supabase/browser';
import { Restaurant, Table, Order } from '@/types';

const UI_STRINGS = {
  fr: {
    title: 'Votre commande',
    subtitle: 'Suivez l\'état de votre commande',
    table: 'Table',
    items: 'articles',
    total: 'Total',
    backToMenu: 'Retour au menu',
    callWaiter: 'Appeler le serveur',
    requestBill: 'Demander l\'addition',
    refresh: 'Actualiser',
    estimatedTime: 'Temps estimé',
    mins: 'min',
    orderSummary: 'Récapitulatif',
    thankYou: 'Merci de votre visite!',
    toggleLang: 'عربي',
    orderNotFound: 'Commande non trouvée',
    orderConfirmed: 'Votre commande a été confirmée',
    awaitingPayment: 'En attente de paiement',
  },
  ar: {
    title: 'طلبك',
    subtitle: 'تابع حالة طلبك',
    table: 'طاولة',
    items: 'منتجات',
    total: 'المجموع',
    backToMenu: 'العودة للقائمة',
    callWaiter: 'استدعاء النادل',
    requestBill: 'طلب الفاتورة',
    refresh: 'تحديث',
    estimatedTime: 'الوقت المتوقع',
    mins: 'دقيقة',
    orderSummary: 'ملخص الطلب',
    toggleLang: 'Français',
    orderNotFound: 'الطلب غير موجود',
    orderConfirmed: 'تم تأكيد طلبك',
    awaitingPayment: 'في انتظار الدفع',
  }
};

const mapDbOrderToOrder = (o: any): Order => {
  return {
    id: o.id,
    restaurantId: o.restaurant_id,
    tableId: o.table_id,
    tableName: o.table_label,
    items: Array.isArray(o.items) ? o.items.map((item: any) => ({
      itemId: item.itemId || item.id || '',
      name: item.nameFr || item.name || '',
      quantity: parseInt(String(item.quantity || 1)),
      price: parseFloat(String(item.price || 0)),
      unitPrice: parseFloat(String(item.unitPrice || item.price || 0)),
      notes: item.note || '',
    })) : [],
    subtotal: parseFloat(String(o.subtotal || 0)),
    totalAmount: parseFloat(String(o.total || 0)),
    status: o.status,
    customerNote: o.customer_note || '',
    rejectReason: o.reject_reason || '',
    cancelReason: o.cancellation_reason || '',
    createdAt: new Date(o.created_at),
    updatedAt: new Date(o.updated_at),
    acceptedAt: o.accepted_at ? new Date(o.accepted_at) : undefined,
    paidAt: o.paid_at ? new Date(o.paid_at) : undefined,
    closedAt: o.closed_at ? new Date(o.closed_at) : undefined,
    cancelledAt: o.cancelled_at ? new Date(o.cancelled_at) : undefined,
  };
};

const mapDbTableToTable = (t: any): Table => {
  return {
    id: t.id,
    restaurantId: t.restaurant_id,
    name: t.label, // UI uses table.name for the table label!
    seats: t.seats || 2,
    status: t.status,
    qrCodeUrl: t.qr_token || '',
    createdAt: new Date(t.created_at),
    updatedAt: new Date(t.updated_at),
  };
};

const mapDbRestaurantToRestaurant = (r: any): Restaurant => {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    status: r.status,
    currency: r.currency || 'TND',
    phone: r.phone || '',
    email: r.email || '',
    plan: r.plan || 'FREE',
    slugType: r.slug_type || 'FREE_RANDOM',
    watermarkEnabled: r.watermark_enabled ?? true,
    maxMenuItems: r.max_menu_items || 50,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
};

export default function OrderSentPage({ params }: { params: Promise<{ slug: string; tableId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [language, setLanguage] = useState<'fr' | 'ar'>('fr');
  const [showCallWaiter, setShowCallWaiter] = useState(false);
  const [showRequestBill, setShowRequestBill] = useState(false);
  const [lastWaiterCall, setLastWaiterCall] = useState<number | null>(null);
  
  const strings = UI_STRINGS[language];
  const isRTL = language === 'ar';

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // 1. Fetch table by UUID
        const { data: tableData, error: tableError } = await supabase
          .from('tables')
          .select('*')
          .eq('id', resolvedParams.tableId)
          .single();

        if (tableError || !tableData) {
          console.error('Table error:', tableError);
          setLoading(false);
          return;
        }
        setTable(mapDbTableToTable(tableData));

        // 2. Fetch restaurant
        const { data: restData } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', tableData.restaurant_id)
          .single();

        if (restData) {
          setRestaurant(mapDbRestaurantToRestaurant(restData));
        }

        // 3. Fetch order by orderId
        if (orderId) {
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

          if (!orderError && orderData) {
            setOrder(mapDbOrderToOrder(orderData));
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [resolvedParams.slug, resolvedParams.tableId, orderId]);

  // Subscribe to order updates
  useEffect(() => {
    if (!orderId) return;
    
    const channel = supabase
      .channel(`order-updates-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.new) {
            setOrder(mapDbOrderToOrder(payload.new));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Load last waiter call time from localStorage
  useEffect(() => {
    if (table) {
      const storageKey = `waiter_call_${table.id}`;
      const lastCall = localStorage.getItem(storageKey);
      if (lastCall) {
        setLastWaiterCall(parseInt(lastCall, 10));
      }
    }
  }, [table]);

  // Toggle language
  const toggleLanguage = useCallback(() => {
    setLanguage(prev => prev === 'fr' ? 'ar' : 'fr');
  }, []);

  // Refresh order
  const handleRefresh = useCallback(async () => {
    if (!orderId || refreshing) return;
    
    setRefreshing(true);
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderData) {
        setOrder(mapDbOrderToOrder(orderData));
      }
    } catch (err) {
      console.error('Error refreshing order:', err);
    } finally {
      setRefreshing(false);
    }
  }, [orderId, refreshing]);

  // Call waiter handler
  const handleCallWaiter = useCallback(async () => {
    if (!restaurant || !table) throw new Error('Missing context');
    
    // Store call time for anti-spam
    const now = Date.now();
    localStorage.setItem(`waiter_call_${table.id}`, now.toString());
    setLastWaiterCall(now);
    
    const { error } = await supabase
      .from('table_requests')
      .insert({
        restaurant_id: restaurant.id,
        table_id: table.id,
        table_label: table.name,
        type: 'CALL_WAITER',
        status: 'PENDING'
      });

    if (error) {
      console.error('Error calling waiter:', error);
    }
  }, [restaurant, table]);

  // Request bill handler
  const handleRequestBill = useCallback(async () => {
    if (!restaurant || !table || !order) throw new Error('Missing context');
    
    const { error } = await supabase
      .from('table_requests')
      .insert({
        restaurant_id: restaurant.id,
        table_id: table.id,
        table_label: table.name,
        type: 'REQUEST_BILL',
        status: 'PENDING'
      });

    if (error) {
      console.error('Error requesting bill:', error);
    }
  }, [restaurant, table, order]);

  // Can request bill only after order is accepted/served
  const canRequestBill = order && ['ACCEPTED', 'PREPARING', 'SERVED'].includes(order.status);

  // Get currency symbol
  const getCurrencySymbol = () => {
    if (restaurant?.currency === 'TND') return language === 'ar' ? 'د.ت' : 'DT';
    if (restaurant?.currency === 'EUR') return '€';
    return '$';
  };

  // Calculate estimated time based on status
  const getEstimatedTime = () => {
    if (!order) return null;
    
    switch (order.status) {
      case 'CREATED':
        return { time: 5, label: language === 'ar' ? 'انتظار التأكيد' : 'En attente de confirmation' };
      case 'ACCEPTED':
      case 'PREPARING':
        return { time: 12, label: language === 'ar' ? 'تحضير' : 'Préparation' };
      case 'SERVED':
        return { time: 0, label: language === 'ar' ? 'تم التقديم!' : 'Prêt!' };
      case 'PAID':
        return { time: 0, label: language === 'ar' ? 'تم الدفع' : 'Payé' };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#D4A373] animate-spin" />
          <p className="text-[#7f756f]">{language === 'ar' ? 'جاري التحميل...' : 'Chargement...'}</p>
        </div>
      </div>
    );
  }

  const estimatedTime = getEstimatedTime();

  return (
    <div 
        className="min-h-screen bg-[#FDF8F3] pb-32"
        dir={isRTL ? 'rtl' : 'ltr'}
        lang={language}
      >
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#FDF8F3] border-b border-[#E8E2DA] shadow-[0px_10px_30px_rgba(58,50,45,0.05)]">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-[#3D2C1E]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {strings.title}
              </h1>
              {table && (
                <span className="px-3 py-1 bg-[#f2edeb] text-[#7f756f] rounded-full text-xs font-bold uppercase tracking-wider">
                  {strings.table} {table.name}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-[#7f756f] hover:text-[#3D2C1E]"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <button
                onClick={toggleLanguage}
                className="px-4 py-1.5 rounded-full bg-white border border-[#E8E2DA] text-[#D4A373] font-bold text-xs uppercase tracking-wider hover:bg-[#f8f2f1] transition-colors"
              >
                {strings.toggleLang}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6">
          {/* Status Timeline */}
          {order && (
            <div className="mb-6 p-6 rounded-xl bg-white shadow-[0px_10px_30px_rgba(58,50,45,0.05)]">
              <OrderStatusTimeline 
                status={order.status}
                language={language}
                rejectReason={order.rejectReason}
                cancelReason={order.cancelReason}
              />
            </div>
          )}

          {/* Estimated Time Card */}
          {estimatedTime && order && !['REJECTED', 'CANCELLED'].includes(order.status) && (
            <div className="mb-6 p-4 rounded-xl bg-[#f8f2f1] border border-[#E8E2DA] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className={`w-5 h-5 text-[#D4A373] ${order.status === 'SERVED' || order.status === 'PAID' ? '' : 'animate-spin'}`} />
                <div>
                  <p className="text-sm text-[#7f756f]">{strings.estimatedTime}</p>
                  <p className="font-semibold text-[#3D2C1E]">{estimatedTime.label}</p>
                </div>
              </div>
              {estimatedTime.time > 0 && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#3D2C1E]" style={{ fontFamily: "'Playfair Display', serif" }}>~{estimatedTime.time}</p>
                  <p className="text-xs text-[#D4A373]">{strings.mins}</p>
                </div>
              )}
            </div>
          )}

          {/* Order Summary Card */}
          {order && (
            <div className="mb-6 rounded-xl bg-white shadow-[0px_10px_30px_rgba(58,50,45,0.05)] overflow-hidden">
              <div className="p-4 border-b border-[#f2edeb]">
                <h2 className="font-bold text-[#3D2C1E]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {strings.orderSummary}
                </h2>
              </div>
               
              <div className="p-4 space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-[#D4A373] font-bold">{item.quantity}x</span>
                      <span className="text-[#3D2C1E]">{item.name}</span>
                    </div>
                    <span className="text-[#7f756f]">
                      {(item.price * item.quantity).toFixed(3)} {getCurrencySymbol()}
                    </span>
                  </div>
                ))}
              </div>
               
              <div className="p-4 bg-[#f8f2f1] flex items-center justify-between">
                <span className="font-bold text-[#3D2C1E]">{strings.total}</span>
                <span className="text-xl font-bold text-[#3D2C1E]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {order.totalAmount.toFixed(3)} {getCurrencySymbol()}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {order && !['REJECTED', 'CANCELLED', 'PAID', 'CLOSED'].includes(order.status) && (
            <div className="space-y-3">
              <Button
                onClick={() => setShowCallWaiter(true)}
                variant="outline"
                className="w-full py-4 rounded-full border-[#E8E2DA] text-[#3D2C1E] hover:bg-[#f8f2f1]"
              >
                <Bell className="w-5 h-5 mr-2" />
                {strings.callWaiter}
              </Button>
               
              {canRequestBill && (
                <Button
                  onClick={() => setShowRequestBill(true)}
                  className="w-full py-4 rounded-full bg-[#3D2C1E] hover:opacity-90 text-white"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  {strings.requestBill}
                </Button>
              )}
            </div>
          )}

          {/* Back to Menu */}
          <Link
            href={`/r/${resolvedParams.slug}/t/${resolvedParams.tableId}`}
            className="flex items-center justify-center gap-2 mt-6 text-[#D4A373] hover:text-[#3D2C1E] transition-colors font-semibold"
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            <span>{strings.backToMenu}</span>
          </Link>

          {/* Thank you footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-[#7f756f] opacity-60">{strings.thankYou}</p>
          </div>
        </main>

        {/* Fonts */}
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:wght@200..800&family=Noto+Sans+Arabic:wght@300..700&display=swap');
          
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            -webkit-tap-highlight-color: transparent;
          }
          
          [lang="ar"] {
            font-family: 'Noto Sans Arabic', sans-serif;
          }
          
          .font-serif {
            font-family: 'Playfair Display', serif;
          }
        `}</style>

      {/* Sheets */}
      <CallWaiterSheet
        isOpen={showCallWaiter}
        onClose={() => setShowCallWaiter(false)}
        onCallWaiter={handleCallWaiter}
        tableName={table?.name}
        language={language}
        lastCallTime={lastWaiterCall}
      />
      
      <RequestBillSheet
        isOpen={showRequestBill}
        onClose={() => setShowRequestBill(false)}
        onRequestBill={handleRequestBill}
        order={order}
        tableName={table?.name}
        language={language}
        currency={restaurant?.currency}
      />
    </div>
  );
}
