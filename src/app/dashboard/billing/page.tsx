'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase/browser';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Loader2, CreditCard, Check, Crown, AlertCircle } from 'lucide-react';

export default function BillingPage() {
  const { staff, loading: authLoading } = useAuth();
  const [restaurantPlan, setRestaurantPlan] = useState<'FREE' | 'PRO' | 'MAX'>('FREE');
  const [loading, setLoading] = useState(true);
  const [menuItemsCount, setMenuItemsCount] = useState(0);

  const loadBillingDetails = useCallback(async () => {
    if (!staff?.restaurantId) return;
    try {
      // 1. Fetch restaurant plan
      const { data: rest, error: restError } = await supabase
        .from('restaurants')
        .select('plan')
        .eq('id', staff.restaurantId)
        .single();

      if (restError) throw restError;
      if (rest) {
        setRestaurantPlan(rest.plan || 'FREE');
      }

      // 2. Fetch current menu items count to show usage limits
      const { count, error: countError } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', staff.restaurantId);

      if (countError) throw countError;
      setMenuItemsCount(count || 0);
    } catch (err) {
      console.error('Error loading billing details:', err);
    }
  }, [staff?.restaurantId]);

  useEffect(() => {
    if (staff?.restaurantId) {
      setLoading(true);
      loadBillingDetails().then(() => setLoading(false));
    }
  }, [staff, loadBillingDetails]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FCFBF9] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C9A07E] animate-spin" />
      </div>
    );
  }

  const getPlanDetails = () => {
    switch (restaurantPlan) {
      case 'MAX':
        return {
          title: 'Menux MAX',
          price: '149 DT / mois',
          desc: 'Pour les grands restaurants à fort trafic.',
          limit: 'Articles de menu illimités'
        };
      case 'PRO':
        return {
          title: 'Menux PRO',
          price: '79 DT / mois',
          desc: 'Parfait pour les cafés et bistrots en pleine croissance.',
          limit: 'Jusqu\'à 150 articles'
        };
      default:
        return {
          title: 'Menux LITE (Gratuit)',
          price: '0 DT / mois',
          desc: 'Idéal pour tester ou pour les très petits stands.',
          limit: '8 articles maximum'
        };
    }
  };

  const plan = getPlanDetails();

  return (
    <DashboardLayout restaurantName={staff?.restaurantName} userRole={staff?.role}>
      <header className="flex justify-between items-center px-8 py-5 border-b border-[#EFE4D8] bg-white shadow-sm sticky top-0 z-10">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
            Billing & Plan
          </h2>
          <p className="text-xs text-[#7f756f] mt-1">Manage subscription tiers and platform capacity limits</p>
        </div>
      </header>

      <div className="p-8 max-w-5xl mx-auto space-y-8">
        {/* Current Plan Overview Card */}
        <section className="bg-white rounded-2xl border border-[#EFE4D8]/60 shadow-sm p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#C9A07E]/10 rounded-lg text-primary"><CreditCard className="w-4 h-4" /></span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#7f756f]">Current Subscription</span>
            </div>
            <h3 className="text-2xl font-bold text-primary">{plan.title}</h3>
            <p className="text-sm text-[#7f756f]">{plan.desc}</p>
          </div>
          
          <div className="bg-[#FCFBF9] p-5 rounded-2xl border border-[#EFE4D8]/40 w-full md:w-auto text-center md:text-left min-w-[200px]">
            <span className="text-xs text-[#7f756f]">Price</span>
            <p className="text-xl font-bold text-primary mt-1">{plan.price}</p>
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full w-fit mx-auto md:mx-0">
              <Check className="w-3.5 h-3.5" /> Plan Active
            </div>
          </div>
        </section>

        {/* Capacity limits */}
        <section className="bg-white rounded-2xl border border-[#EFE4D8]/60 shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-[#EFE4D8]/50">
            <Crown className="w-5 h-5 text-[#C9A07E]" />
            <h3 className="font-bold text-base text-primary">Capacity & Usage</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-[#3A322D]">Menu Items Usage</span>
                <span className="text-[#7f756f]">
                  {menuItemsCount} / {restaurantPlan === 'FREE' ? '8' : restaurantPlan === 'PRO' ? '150' : 'Illimité'}
                </span>
              </div>
              
              <div className="w-full bg-[#FCFBF9] rounded-full h-3 border border-[#EFE4D8]/60">
                <div 
                  className="bg-[#C9A07E] h-2.5 rounded-full" 
                  style={{ 
                    width: `${Math.min(100, (menuItemsCount / (restaurantPlan === 'FREE' ? 8 : restaurantPlan === 'PRO' ? 150 : 1000000)) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>

            {restaurantPlan === 'FREE' && (
              <div className="p-4 rounded-xl bg-amber-50 text-amber-800 border border-amber-100 flex items-start gap-3 text-xs">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold">Usage limit warning</p>
                  <p className="mt-0.5">You are currently running on the FREE tier, which restricts you to a maximum of 8 menu items. Upgrade to PRO to add more items, enable instant cashier notifications, remove the watermark, and use a custom domain slug.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Plans tiers comparison table */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* LITE */}
          <div className={`bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between ${restaurantPlan === 'FREE' ? 'border-[#C9A07E]' : 'border-[#EFE4D8]/60'}`}>
            <div>
              <h4 className="font-bold text-lg text-primary">Menux LITE</h4>
              <p className="text-2xl font-bold font-display text-[#C9A07E] mt-2" style={{ fontFamily: "'Playfair Display', serif" }}>0 DT <span className="text-xs text-[#7f756f] font-sans">/ mois</span></p>
              <ul className="mt-6 space-y-3 text-xs text-[#7f756f]">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Max 8 Menu Items</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> WhatsApp Checkout</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Random URL Slug</li>
                <li className="flex items-center gap-2 text-outline line-through">Cashier Dashboard</li>
                <li className="flex items-center gap-2 text-outline line-through">Watermark Removal</li>
              </ul>
            </div>
            {restaurantPlan === 'FREE' ? (
              <button disabled className="mt-8 w-full py-3 rounded-full bg-[#EFE4D8] text-primary text-xs font-bold uppercase tracking-wider cursor-not-allowed">Active Plan</button>
            ) : (
              <button disabled className="mt-8 w-full py-3 rounded-full border border-[#EFE4D8] text-[#7f756f] text-xs font-bold uppercase tracking-wider cursor-not-allowed">Downgrade Not Available</button>
            )}
          </div>

          {/* PRO */}
          <div className={`bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between ${restaurantPlan === 'PRO' ? 'border-[#C9A07E]' : 'border-[#EFE4D8]/60'}`}>
            <div>
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-lg text-primary">Menux PRO</h4>
                <span className="bg-primary text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">Popular</span>
              </div>
              <p className="text-2xl font-bold font-display text-[#C9A07E] mt-2" style={{ fontFamily: "'Playfair Display', serif" }}>79 DT <span className="text-xs text-[#7f756f] font-sans">/ mois</span></p>
              <ul className="mt-6 space-y-3 text-xs text-[#7f756f]">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Up to 150 Menu Items</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Real-time Cashier Terminal</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Custom URL Slug (/r/my-cafe)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Remove Menux Watermark</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Sound Notifications</li>
              </ul>
            </div>
            {restaurantPlan === 'PRO' ? (
              <button disabled className="mt-8 w-full py-3 rounded-full bg-[#EFE4D8] text-primary text-xs font-bold uppercase tracking-wider cursor-not-allowed">Active Plan</button>
            ) : (
              <button 
                onClick={() => alert("Pour mettre à niveau vers PRO, contactez l'assistance à support@menux.pro")}
                className="mt-8 w-full py-3 rounded-full bg-primary text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                Upgrade to PRO
              </button>
            )}
          </div>

          {/* MAX */}
          <div className={`bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between ${restaurantPlan === 'MAX' ? 'border-[#C9A07E]' : 'border-[#EFE4D8]/60'}`}>
            <div>
              <h4 className="font-bold text-lg text-primary">Menux MAX</h4>
              <p className="text-2xl font-bold font-display text-[#C9A07E] mt-2" style={{ fontFamily: "'Playfair Display', serif" }}>149 DT <span className="text-xs text-[#7f756f] font-sans">/ mois</span></p>
              <ul className="mt-6 space-y-3 text-xs text-[#7f756f]">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Unlimited Menu Items</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Premium Custom Domain</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Floor Plan Layout Builder</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Advanced Branding Options</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Priority Support</li>
              </ul>
            </div>
            {restaurantPlan === 'MAX' ? (
              <button disabled className="mt-8 w-full py-3 rounded-full bg-[#EFE4D8] text-primary text-xs font-bold uppercase tracking-wider cursor-not-allowed">Active Plan</button>
            ) : (
              <button 
                onClick={() => alert("Pour mettre à niveau vers MAX, contactez l'assistance à support@menux.pro")}
                className="mt-8 w-full py-3 rounded-full bg-primary text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                Upgrade to MAX
              </button>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
