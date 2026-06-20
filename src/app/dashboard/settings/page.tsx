'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase/browser';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Loader2, Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const { staff, loading: authLoading, refresh: refreshAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    phone: '',
    currency: 'TND',
    cuisine_type: '',
    address: '',
    status: 'ACTIVE',
  });

  const loadSettings = useCallback(async () => {
    if (!staff?.restaurantId) return;
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', staff.restaurantId)
        .single();

      if (error) throw error;

      if (data) {
        setForm({
          name: data.name || '',
          slug: data.slug || '',
          phone: data.phone || '',
          currency: data.currency || 'TND',
          cuisine_type: data.cuisine_type || '',
          address: data.address || '',
          status: data.status || 'ACTIVE',
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setMessage({ type: 'error', text: 'Impossible de charger la configuration.' });
    }
  }, [staff?.restaurantId]);

  useEffect(() => {
    if (staff?.restaurantId) {
      setLoading(true);
      loadSettings().then(() => setLoading(false));
    }
  }, [staff, loadSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff?.restaurantId) return;
    setSaving(true);
    setMessage(null);

    try {
      // Validate slug contains only lowercase letters, numbers, and dashes
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(form.slug)) {
        throw new Error('Le slug doit contenir uniquement des lettres minuscules, chiffres ou tirets.');
      }

      const { error } = await supabase
        .from('restaurants')
        .update({
          name: form.name,
          slug: form.slug,
          phone: form.phone,
          currency: form.currency,
          cuisine_type: form.cuisine_type,
          address: form.address,
          status: form.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', staff.restaurantId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Configuration enregistrée avec succès.' });
      await refreshAuth();
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setMessage({ type: 'error', text: err.message || 'Impossible d\'enregistrer les modifications.' });
    } finally {
      setSaving(false);
    }
  };

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
            Settings
          </h2>
          <p className="text-xs text-[#7f756f] mt-1">Configure restaurant properties and details</p>
        </div>
      </header>

      <div className="p-8 max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#EFE4D8]/60 shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-[#EFE4D8]/50 pb-4 mb-6">
            <Settings className="w-5 h-5 text-[#C9A07E]" />
            <h3 className="font-bold text-base text-primary">Restaurant Profile</h3>
          </div>

          {message && (
            <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#7f756f] mb-2">Restaurant Name</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-[#FCFBF9] border border-[#EFE4D8] rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#C9A07E] outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#7f756f] mb-2">Slug URL path (/r/slug)</label>
              <input 
                type="text" 
                value={form.slug} 
                onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().trim() })}
                className="w-full bg-[#FCFBF9] border border-[#EFE4D8] rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#C9A07E] outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#7f756f] mb-2">WhatsApp / Phone number</label>
              <input 
                type="text" 
                value={form.phone} 
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="216XXXXXXXX"
                className="w-full bg-[#FCFBF9] border border-[#EFE4D8] rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#C9A07E] outline-none transition-all"
              />
              <p className="text-[10px] text-outline mt-1">Pre-filled with country code. Used for WhatsApp Checkout.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#7f756f] mb-2">Currency</label>
              <select
                value={form.currency}
                onChange={e => setForm({ ...form, currency: e.target.value })}
                className="w-full bg-[#FCFBF9] border border-[#EFE4D8] rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#C9A07E] outline-none transition-all"
              >
                <option value="TND">TND (DT)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="QAR">QAR (ر.ق)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#7f756f] mb-2">Cuisine Type</label>
              <input 
                type="text" 
                value={form.cuisine_type} 
                onChange={e => setForm({ ...form, cuisine_type: e.target.value })}
                placeholder="Café / Grill"
                className="w-full bg-[#FCFBF9] border border-[#EFE4D8] rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#C9A07E] outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#7f756f] mb-2">Operational Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full bg-[#FCFBF9] border border-[#EFE4D8] rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#C9A07E] outline-none transition-all"
              >
                <option value="ACTIVE">Active (Open to Public)</option>
                <option value="INACTIVE">Inactive (Closed to Public)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#7f756f] mb-2">Address description details</label>
            <textarea 
              value={form.address} 
              onChange={e => setForm({ ...form, address: e.target.value })}
              rows={3}
              placeholder="Restaurant address..."
              className="w-full bg-[#FCFBF9] border border-[#EFE4D8] rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#C9A07E] outline-none transition-all resize-none"
            />
          </div>

          <div className="border-t border-[#EFE4D8]/50 pt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-4 rounded-full bg-[#3A322D] text-white text-xs font-bold uppercase tracking-widest hover:opacity-95 transition-opacity flex items-center gap-2 shadow-md shadow-[#3A322D]/10"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Enregistrer les modifications
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
