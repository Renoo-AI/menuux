'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  CreditCard,
  Calendar,
  Filter,
  Search,
  Eye,
  Download,
  ChevronDown,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  ArrowUpRight,
  X,
  Printer,
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardLayout } from '@/components/layout';
import { TopAppBar } from '@/components/layout';
import { useToast } from '@/hooks/use-toast';
import type { Order, OrderState } from '@/types';

// Demo historical orders data
const demoHistoricalOrders: Order[] = [
  {
    id: 'h1',
    restaurantId: 'demo',
    tableId: 't1',
    tableName: 'Table 01',
    items: [
      { itemId: '1', name: 'Signature Latte', quantity: 2, unitPrice: 5.50 },
      { itemId: '2', name: 'Almond Croissant', quantity: 1, unitPrice: 4.50 },
    ],
    totalAmount: 15.50,
    state: 'COMPLETED',
    createdAt: new Date(Date.now() - 2 * 3600000),
    updatedAt: new Date(Date.now() - 2 * 3600000),
  },
  {
    id: 'h2',
    restaurantId: 'demo',
    tableId: 't2',
    tableName: 'Table 03',
    items: [
      { itemId: '3', name: 'Cappuccino', quantity: 2, unitPrice: 4.50 },
      { itemId: '4', name: 'Avocado Toast', quantity: 1, unitPrice: 12.00 },
      { itemId: '5', name: 'Fresh Juice', quantity: 2, unitPrice: 6.00 },
    ],
    totalAmount: 33.00,
    state: 'COMPLETED',
    createdAt: new Date(Date.now() - 5 * 3600000),
    updatedAt: new Date(Date.now() - 5 * 3600000),
  },
  {
    id: 'h3',
    restaurantId: 'demo',
    tableId: 't3',
    tableName: 'Table 12',
    items: [
      { itemId: '6', name: 'Truffle Tagliatelle', quantity: 1, unitPrice: 28.00 },
      { itemId: '7', name: 'Burrata Salad', quantity: 1, unitPrice: 14.00 },
    ],
    totalAmount: 42.00,
    state: 'CANCELLED',
    createdAt: new Date(Date.now() - 18 * 3600000),
    updatedAt: new Date(Date.now() - 18 * 3600000),
  },
  {
    id: 'h4',
    restaurantId: 'demo',
    tableId: 't4',
    tableName: 'Table 08',
    items: [
      { itemId: '8', name: 'Wagyu Burger', quantity: 2, unitPrice: 32.00 },
      { itemId: '9', name: 'Wine Selection', quantity: 1, unitPrice: 48.00 },
    ],
    totalAmount: 112.00,
    state: 'COMPLETED',
    createdAt: new Date(Date.now() - 24 * 3600000),
    updatedAt: new Date(Date.now() - 24 * 3600000),
  },
  {
    id: 'h5',
    restaurantId: 'demo',
    tableId: 't5',
    tableName: 'Table 02',
    items: [
      { itemId: '1', name: 'Signature Latte', quantity: 3, unitPrice: 5.50 },
    ],
    totalAmount: 16.50,
    state: 'COMPLETED',
    createdAt: new Date(Date.now() - 28 * 3600000),
    updatedAt: new Date(Date.now() - 28 * 3600000),
  },
  {
    id: 'h6',
    restaurantId: 'demo',
    tableId: 't1',
    tableName: 'Table 01',
    items: [
      { itemId: '10', name: 'Breakfast Platter', quantity: 2, unitPrice: 18.00 },
      { itemId: '11', name: 'Fresh Orange Juice', quantity: 2, unitPrice: 5.50 },
    ],
    totalAmount: 47.00,
    state: 'COMPLETED',
    createdAt: new Date(Date.now() - 48 * 3600000),
    updatedAt: new Date(Date.now() - 48 * 3600000),
  },
  {
    id: 'h7',
    restaurantId: 'demo',
    tableId: 't6',
    tableName: 'Table 05',
    items: [
      { itemId: '12', name: 'Caesar Salad', quantity: 1, unitPrice: 14.00 },
      { itemId: '13', name: 'Grilled Salmon', quantity: 1, unitPrice: 28.00 },
    ],
    totalAmount: 42.00,
    state: 'COMPLETED',
    createdAt: new Date(Date.now() - 72 * 3600000),
    updatedAt: new Date(Date.now() - 72 * 3600000),
  },
  {
    id: 'h8',
    restaurantId: 'demo',
    tableId: 't7',
    tableName: 'B-01',
    items: [
      { itemId: '14', name: 'Espresso', quantity: 2, unitPrice: 3.50 },
    ],
    totalAmount: 7.00,
    state: 'CANCELLED',
    createdAt: new Date(Date.now() - 96 * 3600000),
    updatedAt: new Date(Date.now() - 96 * 3600000),
  },
];

type FilterStatus = 'all' | 'COMPLETED' | 'CANCELLED';
type DateFilter = 'today' | 'week' | 'month' | 'all';

export default function OrderHistoryPage() {
  const [orders] = useState<Order[]>(demoHistoricalOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { toast } = useToast();

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Status filter
      if (statusFilter !== 'all' && order.state !== statusFilter) return false;
      
      // Date filter
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      
      if (dateFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (orderDate < today) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (orderDate < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (orderDate < monthAgo) return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTable = order.tableName.toLowerCase().includes(query);
        const matchesItems = order.items.some(item => 
          item.name.toLowerCase().includes(query)
        );
        if (!matchesTable && !matchesItems) return false;
      }
      
      return true;
    });
  }, [orders, statusFilter, dateFilter, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const completed = filteredOrders.filter(o => o.state === 'COMPLETED');
    const cancelled = filteredOrders.filter(o => o.state === 'CANCELLED');
    
    return {
      totalRevenue: completed.reduce((sum, o) => sum + o.totalAmount, 0),
      totalOrders: filteredOrders.length,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      avgOrderValue: completed.length > 0 
        ? completed.reduce((sum, o) => sum + o.totalAmount, 0) / completed.length 
        : 0,
    };
  }, [filteredOrders]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStateBadge = (state: OrderState) => {
    switch (state) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const handleExport = () => {
    toast({
      title: 'Export Started',
      description: 'Your order history is being prepared for download.',
    });
  };

  const handlePrint = (order: Order) => {
    toast({
      title: 'Printing Receipt',
      description: `Printing receipt for ${order.tableName}...`,
    });
  };

  return (
    <DashboardLayout>
      <TopAppBar
        title="Order History"
        subtitle={`${filteredOrders.length} orders`}
        showSearch={false}
        user={{ name: 'Manager', role: 'manager' }}
      />

      <div className="p-6 md:p-10 max-w-7xl w-full mx-auto space-y-8 animate-fade-in">
        
        {/* Stats Summary */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <DollarSign className="w-5 h-5" />
                <span className="font-label-caps text-label-caps uppercase tracking-wider">Revenue</span>
              </div>
              <p className="font-display text-3xl text-primary">${stats.totalRevenue.toFixed(2)}</p>
              <p className="text-on-surface-variant text-xs mt-1">From completed orders</p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center gap-2 text-secondary mb-2">
                <ShoppingBag className="w-5 h-5" />
                <span className="font-label-caps text-label-caps uppercase tracking-wider">Orders</span>
              </div>
              <p className="font-display text-3xl text-primary">{stats.totalOrders}</p>
              <p className="text-on-surface-variant text-xs mt-1">{stats.completedCount} completed</p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center gap-2 text-accent mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="font-label-caps text-label-caps uppercase tracking-wider">Avg Order</span>
              </div>
              <p className="font-display text-3xl text-primary">${stats.avgOrderValue.toFixed(2)}</p>
              <p className="text-on-surface-variant text-xs mt-1">Per transaction</p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-error/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center gap-2 text-error mb-2">
                <XCircle className="w-5 h-5" />
                <span className="font-label-caps text-label-caps uppercase tracking-wider">Cancelled</span>
              </div>
              <p className="font-display text-3xl text-primary">{stats.cancelledCount}</p>
              <p className="text-on-surface-variant text-xs mt-1">Cancelled orders</p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="bg-white rounded-2xl p-6 shadow-card">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                <Input
                  type="text"
                  placeholder="Search by table or item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-outline-variant bg-surface-container-low focus:border-secondary focus:ring-2 focus:ring-secondary-fixed/20 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Status Filter */}
              <div className="flex gap-2">
                {(['all', 'COMPLETED', 'CANCELLED'] as FilterStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-xl font-label-caps text-sm whitespace-nowrap transition-all duration-200 ${
                      statusFilter === status
                        ? 'bg-primary text-on-primary shadow-md'
                        : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                    }`}
                  >
                    {status === 'all' ? 'All' : status === 'COMPLETED' ? 'Completed' : 'Cancelled'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-4 items-center w-full lg:w-auto">
              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="px-4 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-medium focus:border-secondary focus:ring-2 focus:ring-secondary-fixed/20 transition-all"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              
              {/* Export Button */}
              <Button
                variant="outline"
                className="flex items-center gap-2 rounded-xl"
                onClick={handleExport}
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
        </section>

        {/* Orders Table */}
        <section className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="text-left px-6 py-4 font-label-caps text-xs uppercase tracking-wider text-on-surface-variant">Order ID</th>
                  <th className="text-left px-6 py-4 font-label-caps text-xs uppercase tracking-wider text-on-surface-variant">Table</th>
                  <th className="text-left px-6 py-4 font-label-caps text-xs uppercase tracking-wider text-on-surface-variant">Items</th>
                  <th className="text-left px-6 py-4 font-label-caps text-xs uppercase tracking-wider text-on-surface-variant">Amount</th>
                  <th className="text-left px-6 py-4 font-label-caps text-xs uppercase tracking-wider text-on-surface-variant">Status</th>
                  <th className="text-left px-6 py-4 font-label-caps text-xs uppercase tracking-wider text-on-surface-variant">Date</th>
                  <th className="text-right px-6 py-4 font-label-caps text-xs uppercase tracking-wider text-on-surface-variant">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-primary">#{order.id.slice(-6).toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-primary">{order.tableName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-on-surface-variant">{order.items.length} items</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-display font-bold text-primary">${order.totalAmount.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getStateBadge(order.state)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-on-surface-variant text-sm">{formatDate(order.createdAt)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrint(order);
                          }}
                          className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors"
                          title="Print Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          className="p-2 rounded-lg hover:bg-secondary-fixed text-on-surface-variant hover:text-on-secondary-fixed-variant transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Empty State */}
          {filteredOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mb-4">
                <Receipt className="w-8 h-8 text-on-surface-variant" />
              </div>
              <h3 className="font-display text-title-sm text-primary mb-2">No orders found</h3>
              <p className="text-on-surface-variant mb-4">Try adjusting your filters or search criteria</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setDateFilter('all');
                }}
                className="rounded-full"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </section>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setSelectedOrder(null)}
          >
            <div 
              className="bg-surface rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-outline-variant relative">
                <div className={`absolute top-0 left-0 w-full h-1 ${
                  selectedOrder.state === 'COMPLETED' ? 'bg-green-500' : 'bg-error'
                }`} />
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-sm text-on-surface-variant mb-1">
                      #{selectedOrder.id.slice(-6).toUpperCase()}
                    </p>
                    <h2 className="font-display text-title-md text-primary">{selectedOrder.tableName}</h2>
                    <p className="text-on-surface-variant text-sm mt-1">{formatFullDate(selectedOrder.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 rounded-full hover:bg-surface-container-low transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Items */}
              <div className="p-6 space-y-4">
                <h3 className="font-label-caps text-xs uppercase tracking-wider text-on-surface-variant">Order Items</h3>
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-start p-3 rounded-xl bg-surface-container-low/50">
                    <div className="flex gap-4">
                      <span className="font-bold text-primary bg-secondary-fixed/30 w-8 h-8 rounded-full flex items-center justify-center text-sm">
                        {item.quantity}x
                      </span>
                      <div>
                        <p className="font-medium text-primary">{item.name}</p>
                        {item.notes && (
                          <p className="text-on-surface-variant text-sm italic">&quot;{item.notes}&quot;</p>
                        )}
                      </div>
                    </div>
                    <p className="font-semibold text-primary">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
                
                {/* Summary */}
                <div className="mt-6 pt-6 border-t border-outline-variant space-y-2">
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Subtotal</span>
                    <span>${selectedOrder.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Tax</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-secondary-fixed/20 rounded-xl mt-4">
                    <span className="font-display text-title-sm text-primary">Total</span>
                    <span className="font-display text-2xl text-primary">${selectedOrder.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-6 border-t border-outline-variant flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 rounded-full bg-primary text-on-primary"
                  onClick={() => handlePrint(selectedOrder)}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Receipt
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
