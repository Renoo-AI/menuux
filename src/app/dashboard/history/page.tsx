'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase/browser';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Loader2, Search, Calendar, ChevronRight, X, ArrowLeftRight, Download, Filter } from 'lucide-react';
import type { Order } from '@/types';

export default function HistoryPage() {
  const { staff, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!staff?.restaurantId) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', staff.restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Order[] = (data || []).map(o => ({
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
      }));

      setOrders(mapped);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  }, [staff?.restaurantId]);

  useEffect(() => {
    if (staff?.restaurantId) {
      setLoading(true);
      fetchHistory().then(() => setLoading(false));
    }
  }, [staff, fetchHistory]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CLOSED':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-200">Closed</span>;
      case 'PAID':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">Paid</span>;
      case 'CANCELLED':
      case 'REJECTED':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">Cancelled</span>;
      case 'CREATED':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">New</span>;
      case 'ACCEPTED':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Preparing</span>;
      default:
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-50 text-gray-700 border border-gray-200">{status}</span>;
    }
  };

  const exportCSV = () => {
    const headers = ['Order ID', 'Table', 'Status', 'Items count', 'Total (TND)', 'Created At'];
    const rows = filteredOrders.map(o => [
      o.id,
      o.tableName,
      o.status,
      o.items.length,
      o.totalAmount.toFixed(3),
      o.createdAt.toLocaleString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_history_${staff?.restaurantSlug || 'restaurant'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredOrders = orders.filter(order => {
    const term = search.toLowerCase();
    const matchesSearch = 
      order.tableName.toLowerCase().includes(term) ||
      order.id.toLowerCase().includes(term) ||
      order.totalAmount.toString().includes(term);

    const matchesStatus = 
      statusFilter === 'ALL' || 
      order.status === statusFilter;

    return matchesSearch && matchesStatus;
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
      <header className="flex flex-col md:flex-row md:items-center justify-between px-8 py-5 border-b border-[#EFE4D8] bg-white shadow-sm sticky top-0 z-10 gap-4">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
            Order History
          </h2>
          <p className="text-xs text-[#7f756f] mt-1">Closed and archive order records</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input 
              type="text" 
              placeholder="Search by table or ID..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-full border border-[#EFE4D8] bg-[#FCFBF9] text-sm w-64 focus:ring-1 focus:ring-[#C9A07E] outline-none transition-all"
            />
          </div>
          <button 
            onClick={exportCSV}
            className="px-4 py-2 rounded-full border border-[#EFE4D8] bg-white text-xs font-bold uppercase tracking-wider text-primary hover:bg-[#FCFBF9] transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-full hover:bg-surface-container-low transition-colors border border-[#EFE4D8] bg-white flex items-center justify-center text-primary disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Status Filters Bar */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-[#EFE4D8]/60">
          {['ALL', 'PAID', 'CLOSED', 'CANCELLED', 'CREATED', 'ACCEPTED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold uppercase tracking-wider transition-all border ${
                statusFilter === status
                  ? 'bg-[#3A322D] text-white border-[#3A322D]'
                  : 'bg-white text-[#7f756f] border-[#EFE4D8] hover:bg-[#FCFBF9]'
              }`}
            >
              {status === 'ALL' ? 'All Orders' : status}
            </button>
          ))}
        </div>

        {/* History Table */}
        <div className="bg-white rounded-2xl border border-[#EFE4D8]/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FCFBF9] border-b border-[#EFE4D8]/60 text-xs font-bold uppercase tracking-wider text-[#7f756f]">
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Table</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Items Count</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE4D8]/30">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#7f756f] italic">
                      No order logs matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr 
                      key={order.id} 
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-[#FCFBF9]/60 transition-colors cursor-pointer text-sm"
                    >
                      <td className="px-6 py-4 font-mono text-xs text-primary max-w-[150px] truncate" title={order.id}>
                        #{order.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 font-bold text-primary">{order.tableName}</td>
                      <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                      <td className="px-6 py-4 text-[#7f756f]">{order.items.reduce((acc, i) => acc + i.quantity, 0)} items</td>
                      <td className="px-6 py-4 font-bold text-[#C9A07E]">{order.totalAmount.toFixed(3)} DT</td>
                      <td className="px-6 py-4 text-xs text-[#7f756f]">
                        {order.createdAt.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="w-4 h-4 text-outline ml-auto" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Details Side Drawer Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex justify-end" onClick={() => setSelectedOrder(null)}>
          <div 
            className="w-full max-w-md h-full bg-[#FCFBF9] shadow-2xl p-6 md:p-8 flex flex-col justify-between overflow-y-auto animate-slide-left"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Order details</span>
                  <h3 className="font-display text-2xl font-bold text-primary mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Table {selectedOrder.tableName}
                  </h3>
                  <span className="text-[10px] font-mono text-[#b48c68]">ID: #{selectedOrder.id}</span>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-full border border-[#EFE4D8] hover:bg-white transition-colors"
                >
                  <X className="w-4 h-4 text-[#3A322D]" />
                </button>
              </div>

              <div className="mb-6">{getStatusBadge(selectedOrder.status)}</div>

              <div className="space-y-4 border-t border-[#EFE4D8] pt-6 mb-6">
                <h4 className="font-bold text-xs uppercase tracking-widest text-[#7f756f]">Ordered Items</h4>
                <div className="divide-y divide-[#EFE4D8]/30 max-h-[250px] overflow-y-auto pr-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2.5 text-sm">
                      <div className="flex-1 pr-4">
                        <p className="font-bold text-primary">{item.name}</p>
                        <p className="text-xs text-[#7f756f]">{item.quantity}x @ {item.price.toFixed(3)} DT</p>
                        {item.notes && <p className="text-[11px] text-amber-600 italic">Note: {item.notes}</p>}
                      </div>
                      <span className="font-bold text-[#3A322D]">
                        {(item.price * item.quantity).toFixed(3)} DT
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.customerNote && (
                <div className="mb-6 p-4 rounded-xl bg-white border border-[#EFE4D8] text-xs">
                  <p className="font-bold uppercase tracking-wider text-[#7f756f] mb-1">Customer Note</p>
                  <p className="text-[#3A322D] italic">&ldquo;{selectedOrder.customerNote}&rdquo;</p>
                </div>
              )}

              {selectedOrder.cancelReason && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-xs">
                  <p className="font-bold uppercase tracking-wider text-red-700 mb-1">Cancellation Reason</p>
                  <p className="text-red-800 italic">&ldquo;{selectedOrder.cancelReason}&rdquo;</p>
                </div>
              )}

              {selectedOrder.rejectReason && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-xs">
                  <p className="font-bold uppercase tracking-wider text-red-700 mb-1">Rejection Reason</p>
                  <p className="text-red-800 italic">&ldquo;{selectedOrder.rejectReason}&rdquo;</p>
                </div>
              )}
            </div>

            <div className="border-t border-[#EFE4D8] pt-6 bg-[#FCFBF9]">
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold uppercase tracking-widest text-[#7f756f] text-xs">Total Amount</span>
                <span className="text-2xl font-bold font-display text-[#C9A07E]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {selectedOrder.totalAmount.toFixed(3)} DT
                </span>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-full bg-[#3A322D] text-white py-4 rounded-full font-bold text-xs uppercase tracking-widest hover:opacity-95 transition-opacity"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
