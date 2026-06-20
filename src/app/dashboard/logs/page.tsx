'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase/browser';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Loader2, Search, Receipt, ShoppingCart, CreditCard, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import type { ActivityLog, Order } from '@/types';

export default function LogsPage() {
  const { staff, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({ totalOrders: 0, paidOrders: 0, cancelledOrders: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogsAndStats = useCallback(async () => {
    if (!staff?.restaurantId) return;
    try {
      // 1. Fetch activity logs
      const { data: logsData, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('restaurant_id', staff.restaurantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // 2. Fetch orders count/statuses for Daily Summary stats
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('restaurant_id', staff.restaurantId);

      if (ordersError) throw ordersError;

      const mappedLogs: ActivityLog[] = (logsData || []).map(l => ({
        id: l.id,
        restaurantId: l.restaurant_id,
        orderId: l.order_id,
        tableId: l.table_id,
        actorId: l.actor_id,
        actorRole: l.actor_role,
        actorName: l.actor_name,
        action: l.action as any,
        targetType: 'order',
        targetId: l.order_id || '',
        before: l.from_status,
        after: l.to_status,
        reason: l.reason,
        metadata: l.metadata,
        createdAt: new Date(l.created_at)
      }));

      setLogs(mappedLogs);

      const total = ordersData?.length || 0;
      const paid = ordersData?.filter(o => o.status === 'PAID' || o.status === 'CLOSED').length || 0;
      const cancelled = ordersData?.filter(o => o.status === 'CANCELLED' || o.status === 'REJECTED').length || 0;

      setStats({ totalOrders: total, paidOrders: paid, cancelledOrders: cancelled });
    } catch (err) {
      console.error('Error loading logs/stats:', err);
    }
  }, [staff?.restaurantId]);

  useEffect(() => {
    if (staff?.restaurantId) {
      setLoading(true);
      fetchLogsAndStats().then(() => setLoading(false));
    }
  }, [staff, fetchLogsAndStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogsAndStats();
    setRefreshing(false);
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'ORDER_CREATED': return 'Order Created';
      case 'ORDER_ACCEPTED': return 'Accepted';
      case 'ORDER_PAID': return 'Paid';
      case 'ORDER_CLOSED': return 'Closed';
      case 'ORDER_CANCELLED': return 'Cancelled';
      default: return action.replace('ORDER_', '');
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CANCELLED') || action.includes('REJECTED')) {
      return 'bg-red-50 text-red-600 border-red-100';
    }
    if (action.includes('PAID') || action.includes('CLOSED')) {
      return 'bg-green-50 text-green-600 border-green-100';
    }
    if (action.includes('ACCEPTED')) {
      return 'bg-blue-50 text-blue-600 border-blue-100';
    }
    return 'bg-gray-50 text-gray-600 border-gray-100';
  };

  const getTimelineNodeColor = (action: string) => {
    if (action.includes('CANCELLED') || action.includes('REJECTED')) return 'bg-red-500';
    if (action.includes('PAID') || action.includes('CLOSED')) return 'bg-green-500';
    if (action.includes('ACCEPTED')) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  // Filter logs by search term (search actor name, action, reason, or metadata details)
  const filteredLogs = logs.filter(log => {
    const term = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      (log.actorName && log.actorName.toLowerCase().includes(term)) ||
      (log.reason && log.reason.toLowerCase().includes(term)) ||
      (log.actorRole && log.actorRole.toLowerCase().includes(term))
    );
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FCFBF9] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C9A07E] animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout restaurantName={staff?.restaurantName} userRole={staff?.role}>
      <header className="flex justify-between items-center px-8 py-5 border-b border-[#EFE4D8] bg-white shadow-sm sticky top-0 z-10">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
            Activity Log
          </h2>
          <p className="text-xs text-[#7f756f] mt-1">Timeline of operations for {staff?.restaurantName}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-full border border-[#EFE4D8] bg-[#FCFBF9] text-sm w-64 focus:ring-1 focus:ring-[#C9A07E] outline-none transition-all"
            />
          </div>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-full hover:bg-surface-container-low transition-colors border border-[#EFE4D8] bg-white flex items-center justify-center text-primary disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="p-8 max-w-6xl mx-auto space-y-8">
        {/* Bento Summary Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#EFE4D8]/60">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2.5 bg-[#C9A07E]/10 rounded-xl text-primary"><ShoppingCart className="w-5 h-5" /></span>
              <span className="text-xs font-semibold text-[#C9A07E]">Lifetime Total</span>
            </div>
            <p className="text-xs uppercase tracking-widest text-[#7f756f] font-semibold">Total Orders</p>
            <h4 className="font-display text-4xl font-bold text-primary mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
              {stats.totalOrders}
            </h4>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#EFE4D8]/60">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2.5 bg-green-50 rounded-xl text-green-600"><CreditCard className="w-5 h-5" /></span>
              <span className="text-xs font-semibold text-[#7f756f]">{stats.paidOrders} / {stats.totalOrders} Closed</span>
            </div>
            <p className="text-xs uppercase tracking-widest text-[#7f756f] font-semibold">Paid Orders</p>
            <h4 className="font-display text-4xl font-bold text-primary mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
              {stats.paidOrders}
            </h4>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#EFE4D8]/60">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2.5 bg-red-50 rounded-xl text-red-600"><AlertTriangle className="w-5 h-5" /></span>
              <span className="text-xs font-semibold text-red-600">Critical Action</span>
            </div>
            <p className="text-xs uppercase tracking-widest text-[#7f756f] font-semibold">Cancelled Orders</p>
            <h4 className="font-display text-4xl font-bold text-primary mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
              {stats.cancelledOrders}
            </h4>
          </div>
        </section>

        {/* Timeline Table */}
        <section className="bg-white rounded-2xl shadow-sm border border-[#EFE4D8]/60 overflow-hidden">
          <div className="px-6 py-4 bg-[#FCFBF9] border-b border-[#EFE4D8]/60 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-[#3A322D]">Operational Timeline</h3>
            </div>
          </div>

          <div className="p-6">
            {filteredLogs.length === 0 ? (
              <p className="text-center py-12 text-sm text-[#7f756f] italic">No logs found matching search criteria.</p>
            ) : (
              <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-[#EFE4D8]"></div>
                
                <div className="space-y-6">
                  {filteredLogs.map((log) => {
                    const timeStr = log.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const dateStr = log.createdAt.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    
                    return (
                      <div key={log.id} className="relative flex gap-6 pb-6 last:pb-0">
                        {/* Timeline Bullet Node */}
                        <div className={`z-10 w-6 h-6 rounded-full border-4 border-white flex-shrink-0 mt-1 shadow-sm ${getTimelineNodeColor(log.action)}`}></div>
                        
                        <div className="flex-1 pb-4 border-b border-[#EFE4D8]/40 last:border-b-0">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                            <div>
                              <h5 className="font-bold text-sm text-primary">
                                {timeStr} — {getActionLabel(log.action)}
                              </h5>
                              <p className="text-[10px] text-[#b48c68] font-bold uppercase tracking-wider">{dateStr}</p>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${getActionBadgeColor(log.action)}`}>
                              {log.action}
                            </span>
                          </div>
                          
                          <p className="text-xs text-[#7f756f] leading-relaxed">
                            {log.actorName} ({log.actorRole}) changed state.
                            {log.reason && <span className="block mt-1 font-medium text-red-600 bg-red-50/50 p-2 rounded-lg border border-red-100">Reason: {log.reason}</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
