'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth, SUPERADMIN_UID } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  addDoc, 
  query, 
  orderBy, 
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Activity, 
  Store, 
  Search, 
  Eye, 
  Edit2, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  Plus, 
  Copy, 
  Link as LinkIcon, 
  DollarSign, 
  FileJson,
  AlertCircle,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Restaurant {
  id: string;
  name: string;
  slug: string;
  ownerUid?: string;
  plan: 'free' | 'pro' | 'business';
  status: 'active' | 'inactive' | 'offline';
  createdAt: number;
  paymentVerifiedAt?: number;
}

interface UserProfile {
  id: string;
  displayName?: string;
  email?: string;
  globalRole?: string;
  lastLoginAt?: number;
}

interface SystemLog {
  id: string;
  type: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

interface Stats {
  activeMenus: number;
  proMenus: number;
  usersCount: number;
  mrr: number;
}

// Sanitize text to prevent XSS
function sanitizeText(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .slice(0, 200);
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [bannedUsers, setBannedUsers] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<Stats>({ activeMenus: 0, proMenus: 0, usersCount: 0, mrr: 0 });
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bulkImportResId, setBulkImportResId] = useState<string | null>(null);
  const [bulkJsonData, setBulkJsonData] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState<string | null>(null);
  const [successAnimId, setSuccessAnimId] = useState<string | null>(null);
  
  // Form state
  const [newRestaurant, setNewRestaurant] = useState({ name: '', slug: '', ownerUid: '', plan: 'free' });

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Check authorization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && user.uid === SUPERADMIN_UID) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!isAuthorized) return;
    
    try {
      const [usersSnap, restsSnap, bansSnap] = await Promise.all([
        getDocs(collection(db, 'users')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'restaurants')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'banned_users')).catch(() => ({ docs: [] })),
      ]);
      
      const parsedUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
      setUsers(parsedUsers);
      
      const parsedRests = restsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Restaurant));
      setRestaurants(parsedRests);
      
      const bans = new Set(bansSnap.docs.map(d => d.id));
      setBannedUsers(bans);

      // Try to fetch logs
      try {
        const logsSnap = await getDocs(query(collection(db, 'system_logs'), orderBy('timestamp', 'desc')));
        setSystemLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SystemLog)).slice(0, 50));
      } catch {
        setSystemLogs([]);
      }

      const proCount = parsedRests.filter(r => r.plan === 'pro').length;
      const businessCount = parsedRests.filter(r => r.plan === 'business').length;
      
      setStats({
        activeMenus: parsedRests.filter(r => r.status === 'active').length,
        proMenus: proCount + businessCount,
        usersCount: parsedUsers.length,
        mrr: (proCount * 29) + (businessCount * 59)
      });
    } catch (err) {
      console.error("Error loading dashboard", err);
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized, fetchData]);

  // Restaurant actions
  const handleUpdateRestaurant = async (id: string, updates: Partial<Restaurant>) => {
    try {
      await updateDoc(doc(db, 'restaurants', id), updates);
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      
      await addDoc(collection(db, 'system_logs'), {
        type: 'RESTAURANT_UPDATED',
        message: `Mise à jour du restaurant ${id}.`,
        details: { updates, adminUid: currentUser?.uid },
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('Failed to update restaurant', err);
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce restaurant définitivement ?")) return;
    try {
      await deleteDoc(doc(db, 'restaurants', id));
      setRestaurants(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete restaurant', err);
    }
  };

  const handleAddRestaurant = async () => {
    try {
      const payload = {
        name: sanitizeText(newRestaurant.name),
        slug: sanitizeText(newRestaurant.slug),
        ownerUid: newRestaurant.ownerUid || 'unassigned',
        plan: newRestaurant.plan,
        status: 'active',
        createdAt: Date.now()
      };
      await addDoc(collection(db, 'restaurants'), payload);
      setIsModalOpen(false);
      setNewRestaurant({ name: '', slug: '', ownerUid: '', plan: 'free' });
      fetchData();
    } catch (err) {
      console.error('Failed to create restaurant', err);
    }
  };

  const generateMagicLink = async (restaurantId: string, shopSlug: string) => {
    try {
      const token = crypto.randomUUID();
      await setDoc(doc(db, 'magic_links', token), {
        restaurantId,
        shopSlug,
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
        isUsed: false,
        createdBy: currentUser?.uid
      });
      
      const link = `${window.location.origin}/auth/magic?t=${token}`;
      await navigator.clipboard.writeText(link);
      alert(`Magic Link copié:\n${link}`);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la création du Magic Link");
    }
  };

  // User actions
  const handleToggleBan = async (userId: string) => {
    const isBanned = bannedUsers.has(userId);
    try {
      if (isBanned) {
        await deleteDoc(doc(db, 'banned_users', userId));
        setBannedUsers(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      } else {
        await setDoc(doc(db, 'banned_users', userId), {
          reason: 'Banni par SuperAdmin',
          bannedAt: Date.now(),
          bannedBy: currentUser?.uid
        });
        setBannedUsers(prev => new Set(prev).add(userId));
      }
    } catch (err) {
      console.error('Failed to toggle ban', err);
    }
  };

  // Payment verification
  const verifyPayment = async (restaurantId: string) => {
    setVerifyingPayment(restaurantId);
    setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'restaurants', restaurantId), { 
          plan: 'pro',
          paymentVerifiedAt: Date.now()
        });
        setRestaurants(prev => prev.map(r => r.id === restaurantId ? { ...r, plan: 'pro' } : r));
        setSuccessAnimId(restaurantId);
        setTimeout(() => setSuccessAnimId(null), 3000);
      } catch (err) {
        alert("Erreur lors de la vérification");
      } finally {
        setVerifyingPayment(null);
      }
    }, 1500);
  };

  // Bulk import
  const handleBulkImport = async () => {
    if (!bulkImportResId || !bulkJsonData.trim()) return;
    setBulkLoading(true);
    try {
      const rawItems = JSON.parse(bulkJsonData);
      if (!Array.isArray(rawItems)) {
        alert("Le JSON doit être un tableau d'articles.");
        return;
      }

      const validatedItems = rawItems.slice(0, 500).map(item => ({
        category: sanitizeText(item.category || ''),
        name: sanitizeText(item.name || item.nameFr || ''),
        nameFr: sanitizeText(item.nameFr || item.name || ''),
        nameAr: sanitizeText(item.nameAr || ''),
        price: Math.max(0, Math.min(10000, parseFloat(item.price) || 0)),
        available: item.available !== false,
        createdAt: Date.now()
      }));

      const batch = writeBatch(db);
      const itemsRef = collection(db, `restaurants/${bulkImportResId}/items`);

      for (const item of validatedItems) {
        const docRef = doc(itemsRef);
        batch.set(docRef, item);
      }
      
      await batch.commit();
      alert(`${validatedItems.length} articles importés avec succès !`);
      setBulkImportResId(null);
      setBulkJsonData('');
    } catch (error) {
      alert("Erreur lors de l'import. Vérifiez le format JSON.");
    } finally {
      setBulkLoading(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
      router.push('/staff/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 text-[#3A322D] mx-auto mb-4 animate-pulse" />
          <p className="text-[#3A322D]/60 font-medium">Vérification des autorisations...</p>
        </div>
      </div>
    );
  }

  // Unauthorized state
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-serif font-bold text-[#3A322D] mb-2">Accès Refusé</h2>
            <p className="text-[#3A322D]/60 mb-6">
              Vous n'avez pas les autorisations nécessaires pour accéder à MenuxSEC.
              Seul le SuperAdmin peut accéder à ce panneau.
            </p>
            <Button onClick={() => router.push('/staff/login')} className="bg-[#3A322D] hover:bg-[#5A4A3D]">
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Global Pulse' },
    { id: 'restaurants', icon: Store, label: 'Directory' },
    { id: 'users', icon: Users, label: 'Identities' },
    { id: 'ledger', icon: CreditCard, label: 'Financial Ledger' },
    { id: 'logs', icon: Activity, label: 'Activity Logs' },
    { id: 'deep_edit', icon: FileJson, label: 'Deep Edit' },
  ];

  const filteredUsers = users.filter(u => 
    (u.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const pendingPayments = restaurants.filter(r => r.plan === 'free' && r.status === 'active');

  const pageVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 }
  };

  return (
    <div className="flex min-h-screen bg-[#FAFAFA]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#3A322D] z-40 flex items-center justify-between px-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#C9A07E]" />
          <span className="text-sm font-bold tracking-widest uppercase text-white">
            Menux<span className="text-white/40">SEC</span>
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-[#3A322D] text-white/90 border-r border-white/10
        transform transition-transform duration-300 lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col
      `}>
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-10 h-10 bg-[#C9A07E]/20 rounded-xl flex items-center justify-center border border-[#C9A07E]/30">
            <ShieldAlert className="w-5 h-5 text-[#C9A07E]" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase">
              Menux<span className="text-[#C9A07E]">SEC</span>
            </h1>
            <p className="text-[9px] text-white/40 font-mono tracking-wider uppercase mt-0.5">
              Executive Command
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                ${activeTab === item.id 
                  ? 'bg-[#C9A07E]/20 text-[#C9A07E] border border-[#C9A07E]/30' 
                  : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                }
              `}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-[10px] uppercase tracking-widest font-mono text-white/40">Systems Nominal</div>
            </div>
            <div className="text-[10px] text-white/30 font-mono">
              UID: {currentUser?.uid?.slice(0, 8)}...
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 pt-16 lg:pt-0 pb-20 lg:pb-0 overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div key="overview" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <header className="mb-8">
                  <h2 className="text-2xl lg:text-3xl font-serif font-bold text-[#3A322D]">Global Pulse</h2>
                  <p className="text-xs uppercase tracking-widest text-[#3A322D]/40 font-bold mt-1">
                    Executive Summary
                  </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-0 shadow-lg bg-white">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[#3A322D]/40 font-bold text-xs uppercase tracking-widest">
                          Active Installs
                        </span>
                        <Store className="w-4 h-4 text-[#C9A07E]" />
                      </div>
                      <div className="text-4xl font-bold tracking-tight text-[#3A322D]">
                        {stats.activeMenus}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-0 shadow-lg bg-white">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[#3A322D]/40 font-bold text-xs uppercase tracking-widest">
                          Est. MRR
                        </span>
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="text-4xl font-bold tracking-tight text-[#3A322D]">
                        {stats.mrr}
                        <span className="text-base text-[#3A322D]/30 ml-1">TND</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-white">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[#3A322D]/40 font-bold text-xs uppercase tracking-widest">
                          Premium Hubs
                        </span>
                        <Badge className="bg-[#C9A07E]/20 text-[#C9A07E] border-[#C9A07E]/30">
                          {stats.proMenus} Active
                        </Badge>
                      </div>
                      <div className="text-4xl font-bold tracking-tight text-[#3A322D]">
                        {stats.activeMenus > 0 ? Math.round((stats.proMenus / stats.activeMenus) * 100) : 0}%
                      </div>
                      <div className="text-xs text-[#3A322D]/40 mt-1">conversion rate</div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-white">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[#3A322D]/40 font-bold text-xs uppercase tracking-widest">
                          Total Users
                        </span>
                        <Users className="w-4 h-4 text-[#C9A07E]" />
                      </div>
                      <div className="text-4xl font-bold tracking-tight text-[#3A322D]">
                        {stats.usersCount}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* Restaurants Tab */}
            {activeTab === 'restaurants' && (
              <motion.div key="restaurants" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-serif font-bold text-[#3A322D]">Directory</h2>
                    <p className="text-xs uppercase tracking-widest text-[#3A322D]/40 font-bold mt-1">
                      Active Deployments
                    </p>
                  </div>
                  <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-[#3A322D] hover:bg-[#5A4A3D] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Deploy Hub
                  </Button>
                </header>

                <Card className="border-0 shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                      <thead className="bg-[#FAFAFA] border-b border-[#3A322D]/10 text-[#3A322D]/40 text-xs uppercase tracking-widest font-bold">
                        <tr>
                          <th className="p-4">Hub Identity</th>
                          <th className="p-4">Slug</th>
                          <th className="p-4">Plan</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#3A322D]/5">
                        {restaurants.map(r => (
                          <tr key={r.id} className="hover:bg-[#FAFAFA]/50 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-[#3A322D]">{r.name}</div>
                              <div className="text-xs text-[#3A322D]/40 font-mono mt-1">{r.id}</div>
                            </td>
                            <td className="p-4 text-sm font-mono text-[#3A322D]/70">{r.slug}</td>
                            <td className="p-4">
                              <select 
                                className="bg-transparent border border-[#EFE4D8] rounded-lg px-2 py-1 text-xs font-bold outline-none"
                                value={r.plan}
                                onChange={(e) => handleUpdateRestaurant(r.id, { plan: e.target.value as Restaurant['plan'] })}
                              >
                                <option value="free">Starter</option>
                                <option value="pro">Pro</option>
                                <option value="business">Business</option>
                              </select>
                            </td>
                            <td className="p-4">
                              <button 
                                onClick={() => handleUpdateRestaurant(r.id, { status: r.status === 'active' ? 'inactive' : 'active' })}
                                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                  r.status === 'active' 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {r.status === 'active' ? 'Online' : 'Offline'}
                              </button>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => generateMagicLink(r.id, r.slug)} 
                                  className="p-2 rounded-lg hover:bg-[#EFE4D8] text-[#3A322D]/40 hover:text-[#C9A07E] transition-colors"
                                  title="Magic Link"
                                >
                                  <LinkIcon className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => openBulkImport(r.id)} 
                                  className="p-2 rounded-lg hover:bg-[#EFE4D8] text-[#3A322D]/40 hover:text-[#C9A07E] transition-colors"
                                  title="Bulk Import"
                                >
                                  <FileJson className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteRestaurant(r.id)} 
                                  className="p-2 rounded-lg hover:bg-red-100 text-[#3A322D]/40 hover:text-red-600 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {restaurants.length === 0 && (
                      <div className="p-12 text-center text-[#3A322D]/40 italic font-serif">
                        No hubs deployed in network.
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <motion.div key="users" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-serif font-bold text-[#3A322D]">Identities</h2>
                    <p className="text-xs uppercase tracking-widest text-[#3A322D]/40 font-bold mt-1">
                      Access Control & Directory
                    </p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3A322D]/40" />
                    <Input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search identity..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-16 bg-white border-[#EFE4D8] focus:border-[#C9A07E] w-full md:w-80"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#3A322D]/30 font-mono">
                      ⌘K
                    </div>
                  </div>
                </header>

                <Card className="border-0 shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead className="bg-[#FAFAFA] border-b border-[#3A322D]/10 text-[#3A322D]/40 text-xs uppercase tracking-widest font-bold">
                        <tr>
                          <th className="p-4">Principal</th>
                          <th className="p-4">Last Active</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#3A322D]/5">
                        {filteredUsers.map(u => {
                          const isBanned = bannedUsers.has(u.id);
                          return (
                            <tr key={u.id} className="hover:bg-[#FAFAFA]/50 transition-colors">
                              <td className="p-4">
                                <div className="font-bold text-[#3A322D] flex items-center gap-2">
                                  {u.displayName || 'Anonymous'}
                                  {u.globalRole === 'superadmin' && (
                                    <ShieldAlert className="w-3.5 h-3.5 text-[#C9A07E]" />
                                  )}
                                </div>
                                <div className="text-xs text-[#3A322D]/40 font-mono mt-1">{u.email}</div>
                              </td>
                              <td className="p-4 text-sm text-[#3A322D]/60 font-mono">
                                {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Unknown'}
                              </td>
                              <td className="p-4">
                                {isBanned ? (
                                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600">
                                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                                    Banned
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Clear
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleBan(u.id)}
                                  disabled={u.globalRole === 'superadmin'}
                                  className={isBanned 
                                    ? 'border-emerald-600 text-emerald-600 hover:bg-emerald-50' 
                                    : 'border-red-600 text-red-600 hover:bg-red-50'
                                  }
                                >
                                  {isBanned ? 'Unban' : 'Ban'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
                      <div className="p-12 text-center text-[#3A322D]/40 italic font-serif">
                        No identities found.
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Ledger Tab */}
            {activeTab === 'ledger' && (
              <motion.div key="ledger" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <header>
                  <h2 className="text-2xl lg:text-3xl font-serif font-bold text-[#3A322D]">Financial Ledger</h2>
                  <p className="text-xs uppercase tracking-widest text-[#3A322D]/40 font-bold mt-1">
                    Payment Verification
                  </p>
                </header>

                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-widest text-[#3A322D]/60 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Pending Payment Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pendingPayments.length === 0 ? (
                      <div className="py-8 text-center text-[#3A322D]/30 italic font-serif">
                        All ledgers balanced. No pending payments.
                      </div>
                    ) : (
                      pendingPayments.map(r => (
                        <div key={r.id} className="p-4 border border-[#EFE4D8] rounded-xl flex items-center justify-between">
                          <div>
                            <div className="font-bold text-[#3A322D]">{r.name}</div>
                            <div className="text-xs text-[#3A322D]/40 font-mono mt-1">upgrade_request</div>
                          </div>
                          <Button
                            onClick={() => verifyPayment(r.id)}
                            disabled={verifyingPayment === r.id || successAnimId === r.id}
                            className={`${
                              successAnimId === r.id 
                                ? 'bg-emerald-500 hover:bg-emerald-500' 
                                : 'bg-[#3A322D] hover:bg-[#5A4A3D]'
                            } text-white`}
                          >
                            {verifyingPayment === r.id ? (
                              'Verifying...'
                            ) : successAnimId === r.id ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                Verified
                              </span>
                            ) : (
                              'Mark Verified'
                            )}
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <motion.div key="logs" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <header>
                  <h2 className="text-2xl lg:text-3xl font-serif font-bold text-[#3A322D]">Activity Logs</h2>
                  <p className="text-xs uppercase tracking-widest text-[#3A322D]/40 font-bold mt-1">
                    System Audit Trail
                  </p>
                </header>

                <Card className="border-0 shadow-lg">
                  <CardContent className="divide-y divide-[#EFE4D8]">
                    {systemLogs.length === 0 ? (
                      <div className="py-12 text-center text-[#3A322D]/30 italic font-serif">
                        System log is empty.
                      </div>
                    ) : (
                      systemLogs.map((log, i) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-4 flex items-start gap-4"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                            log.type === 'MAGIC_LINK_CLAIMED' 
                              ? 'bg-emerald-100 border-emerald-200' 
                              : 'bg-[#FAFAFA] border-[#EFE4D8]'
                          }`}>
                            {log.type === 'MAGIC_LINK_CLAIMED' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Activity className="w-4 h-4 text-[#3A322D]/40" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                              <h4 className="font-bold text-sm text-[#3A322D]">{log.message}</h4>
                              <span className="text-xs text-[#3A322D]/40 font-mono">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <pre className="text-xs text-[#3A322D]/60 bg-[#FAFAFA] p-3 rounded-lg border border-[#EFE4D8] overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Deep Edit Tab */}
            {activeTab === 'deep_edit' && (
              <motion.div key="deep_edit" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <header>
                  <h2 className="text-2xl lg:text-3xl font-serif font-bold text-[#3A322D]">Deep Edit</h2>
                  <p className="text-xs uppercase tracking-widest text-[#3A322D]/40 font-bold mt-1">
                    SuperAdmin Data Override
                  </p>
                </header>

                <Card className="border-0 shadow-lg">
                  <CardContent className="p-8 text-center">
                    <FileJson className="w-12 h-12 text-[#C9A07E] mx-auto mb-4" />
                    <h3 className="font-bold text-[#3A322D] mb-2">Direct Data Access</h3>
                    <p className="text-sm text-[#3A322D]/60 mb-6">
                      Query and modify any document in Firestore directly.
                      This feature requires extreme caution.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                      <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EFE4D8]">
                        <h4 className="font-bold text-sm text-[#3A322D] mb-1">Collections</h4>
                        <p className="text-xs text-[#3A322D]/40 font-mono">restaurants, users, orders, tables...</p>
                      </div>
                      <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EFE4D8]">
                        <h4 className="font-bold text-sm text-[#3A322D] mb-1">Actions</h4>
                        <p className="text-xs text-[#3A322D]/40 font-mono">read, update, delete, create</p>
                      </div>
                      <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EFE4D8]">
                        <h4 className="font-bold text-sm text-[#3A322D] mb-1">Logs</h4>
                        <p className="text-xs text-[#3A322D]/40 font-mono">All actions are logged</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Add Restaurant Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Deploy New Hub</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Restaurant Name</Label>
              <Input
                value={newRestaurant.name}
                onChange={(e) => setNewRestaurant(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Café Élégance"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input
                value={newRestaurant.slug}
                onChange={(e) => setNewRestaurant(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                placeholder="cafe-elegance"
              />
            </div>
            <div className="space-y-2">
              <Label>Owner UID (optional)</Label>
              <Input
                value={newRestaurant.ownerUid}
                onChange={(e) => setNewRestaurant(prev => ({ ...prev, ownerUid: e.target.value }))}
                placeholder="auto-assign"
              />
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select 
                value={newRestaurant.plan} 
                onValueChange={(value) => setNewRestaurant(prev => ({ ...prev, plan: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Starter (Free)</SelectItem>
                  <SelectItem value="pro">Pro (29 TND/mo)</SelectItem>
                  <SelectItem value="business">Business (59 TND/mo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button 
              className="bg-[#3A322D] hover:bg-[#5A4A3D] text-white"
              onClick={handleAddRestaurant}
              disabled={!newRestaurant.name || !newRestaurant.slug}
            >
              Deploy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={!!bulkImportResId} onOpenChange={() => setBulkImportResId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Import JSON Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-[#C9A07E]/10 border border-[#C9A07E]/20 p-4 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-[#C9A07E] text-sm">LLM Prompt Template</h4>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-[#C9A07E] text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText('Convert menu to JSON array with: category, nameFr, nameAr, price fields');
                    alert('Prompt copied!');
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" /> Copy
                </Button>
              </div>
              <p className="text-xs text-[#C9A07E]/80 leading-relaxed">
                Use ChatGPT/Gemini to convert text menus to JSON. Request: "Convert this menu to a JSON array with fields: category, nameFr, nameAr, price"
              </p>
            </div>
            <div className="space-y-2">
              <Label>JSON Array</Label>
              <Textarea
                value={bulkJsonData}
                onChange={(e) => setBulkJsonData(e.target.value)}
                className="h-48 font-mono text-sm"
                placeholder='[{"category": "Coffee", "nameFr": "Espresso", "nameAr": "إسبريسو", "price": 3.5}]'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkImportResId(null)}>Cancel</Button>
            <Button 
              className="bg-[#3A322D] hover:bg-[#5A4A3D] text-white"
              onClick={handleBulkImport}
              disabled={bulkLoading || !bulkJsonData.trim()}
            >
              {bulkLoading ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#EFE4D8] z-40 flex items-center justify-around px-2">
        {navItems.slice(0, 5).map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
              activeTab === item.id ? 'text-[#C9A07E]' : 'text-[#3A322D]/40'
            }`}
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-[8px] font-bold uppercase tracking-wider">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
