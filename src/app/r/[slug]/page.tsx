'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Plus, Coffee, ChevronRight, Minus } from 'lucide-react';
import { restaurantService } from '@/services/restaurantService';
import { menuService } from '@/services/menuService';
import { useCartStore } from '@/stores/cartStore';
import { Watermark, WatermarkSpacer } from '@/components/Watermark';
import type { Restaurant } from '@/types';

// Demo data
const DEMO_RESTAURANT: Restaurant = {
  id: 'demo', slug: 'demo', name: 'ZCOFFEE', status: 'ACTIVE', currency: 'TND',
  plan: 'free', slugType: 'free-random', watermarkEnabled: false, maxMenuItems: 50,
  createdAt: new Date(), updatedAt: new Date(),
};

interface MenuItem {
  id: string;
  category: string;
  categoryAr: string;
  nameFr: string;
  nameAr: string;
  price: string;
}

const MENU: MenuItem[] = [
  { id: '1', category: 'Cafés', categoryAr: 'القهوة', nameFr: 'Express / Demi / Allongé', nameAr: 'إكسبريسو / دمي / ألونجي', price: '2.5' },
  { id: '2', category: 'Cafés', categoryAr: 'القهوة', nameFr: 'Cappuccino / Americano', nameAr: 'كابوتشينو / أمريكانو', price: '2.8' },
  { id: '3', category: 'Cafés', categoryAr: 'القهوة', nameFr: 'Direct', nameAr: 'قهوة ديريكت', price: '3.2' },
  { id: '4', category: 'Cafés', categoryAr: 'القهوة', nameFr: 'Spécial', nameAr: 'قهوة خاصة', price: '3.5' },
  { id: '5', category: 'Boissons Fraîches', categoryAr: 'مشروبات باردة', nameFr: 'Jus Frais', nameAr: 'عصير طازج', price: '4' },
  { id: '6', category: 'Boissons Fraîches', categoryAr: 'مشروبات باردة', nameFr: 'Citronnade', nameAr: 'ليموناضة', price: '3' },
  { id: '7', category: 'Boissons Fraîches', categoryAr: 'مشروبات باردة', nameFr: 'Citronnade Amande', nameAr: 'ليموناضة باللوز', price: '5' },
  { id: '8', category: 'Boissons Fraîches', categoryAr: 'مشروبات باردة', nameFr: 'Mojito', nameAr: 'موهيتو', price: '6' },
  { id: '9', category: 'Viennoiseries', categoryAr: 'مخبوزات', nameFr: 'Snoopy / Croissant', nameAr: 'سنوبي / كرواسون', price: '2.5' },
  { id: '10', category: 'Viennoiseries', categoryAr: 'مخبوزات', nameFr: 'Pâté', nameAr: 'باتي', price: '2' },
  { id: '11', category: 'Thé', categoryAr: 'الشاي', nameFr: 'Thé', nameAr: 'شاي', price: '2' },
  { id: '12', category: 'Thé', categoryAr: 'الشاي', nameFr: 'Thé Amande', nameAr: 'شاي باللوز', price: '4' },
  { id: '13', category: 'Chicha & Girac', categoryAr: 'شيشة وجيراك', nameFr: 'Chicha Menthe', nameAr: 'شيشة نعناع', price: '4' },
  { id: '14', category: 'Chicha & Girac', categoryAr: 'شيشة وجيراك', nameFr: 'Chicha Cocktail', nameAr: 'شيشة كوكتيل', price: '4.5' },
  { id: '15', category: 'Chicha & Girac', categoryAr: 'شيشة وجيراك', nameFr: 'Chicha Vide', nameAr: 'شيشة فارغة', price: '3' },
  { id: '16', category: 'Chicha & Girac', categoryAr: 'شيشة وجيراك', nameFr: 'Girac (M)', nameAr: 'جيراك (M)', price: '3.5' },
  { id: '17', category: 'Chicha & Girac', categoryAr: 'شيشة وجيراك', nameFr: 'Girac (XL)', nameAr: 'جيراك (XL)', price: '4.5' },
  { id: '18', category: 'Chicha & Girac', categoryAr: 'شيشة وجيراك', nameFr: 'Girac (XXL)', nameAr: 'جيراك (XXL)', price: '5.5' },
  { id: '19', category: 'Eaux & Soft', categoryAr: 'مياه ومشروبات غازية', nameFr: 'Eau 1.5 L', nameAr: 'ماء 1.5 ل', price: '2' },
  { id: '20', category: 'Eaux & Soft', categoryAr: 'مياه ومشروبات غازية', nameFr: 'Eau 0.5 L', nameAr: 'ماء 0.5 ل', price: '1' },
  { id: '21', category: 'Eaux & Soft', categoryAr: 'مياه ومشروبات غازية', nameFr: 'Canette', nameAr: 'كانات', price: '2.5' },
];

const UI = {
  fr: { tag: 'The Experience', footer: 'Merci de votre visite', toggle: 'عربي', order: 'Commande' },
  ar: { tag: 'التجربة الفريدة', footer: 'شكراً لزيارتكم', toggle: 'Français', order: 'الطلب' }
};

export default function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'fr' | 'ar'>('fr');
  
  const { addItem, removeItem, getTotalItems, getTotalPrice, getItemByItemId } = useCartStore();
  const count = getTotalItems();
  const total = getTotalPrice();

  useEffect(() => {
    (async () => {
      try {
        if (resolvedParams.slug === 'demo') {
          setRestaurant(DEMO_RESTAURANT);
        } else {
          const r = await restaurantService.getBySlug(resolvedParams.slug);
          setRestaurant(r || DEMO_RESTAURANT);
        }
      } catch {
        setRestaurant(DEMO_RESTAURANT);
      } finally {
        setLoading(false);
      }
    })();
  }, [resolvedParams.slug]);

  const categories = [...new Set(MENU.map(i => lang === 'fr' ? i.category : i.categoryAr))];
  const currency = lang === 'fr' ? 'DT' : 'د.ت';

  if (loading) {
    return (
      <div className="bg-[#faf9f6] min-h-screen">
        <nav className="sticky top-0 bg-[#faf9f6] px-6 py-5 flex justify-center">
          <div className="w-9 h-9 bg-[#2d2a26] rounded-xl animate-pulse" />
        </nav>
      </div>
    );
  }

  return (
    <WatermarkSpacer showWatermark={restaurant?.plan === 'free'}>
      <div className="bg-[#faf9f6] min-h-screen pb-20" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
        {/* NAV */}
        <nav className="sticky top-0 z-50 bg-[#faf9f6]/90 backdrop-blur-md border-b border-black/5 px-6 py-4 flex justify-center items-center">
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 bg-[#2d2a26] rounded-xl flex items-center justify-center mb-1">
              <Coffee className="w-5 h-5 text-[#b48c68]" />
            </div>
            <h1 className="font-serif text-lg font-bold text-[#2d2a26]">{restaurant?.name}</h1>
            <p className="text-[6px] uppercase tracking-[0.4em] text-[#b48c68] font-semibold">{UI[lang].tag}</p>
          </div>
          <button
            onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
            className="absolute right-6 bg-white text-[#b48c68] px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-black/5"
          >
            {UI[lang].toggle}
          </button>
        </nav>

        {/* MENU */}
        <main className="max-w-xl mx-auto px-5 py-6 space-y-6">
          {categories.map(cat => {
            const items = MENU.filter(i => (lang === 'fr' ? i.category : i.categoryAr) === cat);
            return (
              <section key={cat} className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgba(180,140,104,0.05)] border border-black/[0.03]">
                <header className="flex items-center gap-4 mb-5">
                  <h2 className="font-serif italic text-[#b48c68] font-bold">{cat}</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#b48c68]/30 to-transparent" />
                </header>
                <div className="divide-y divide-black/[0.03]">
                  {items.map((item, idx) => {
                    const name = lang === 'fr' ? item.nameFr : item.nameAr;
                    const cart = getItemByItemId(item.id);
                    const qty = cart?.quantity || 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-3.5 gap-3"
                        style={{ animation: `fadeIn 0.5s ease ${idx * 50}ms forwards`, opacity: 0 }}
                      >
                        <span className="font-semibold text-[#2d2a26]/90 text-[15px] flex-1">{name}</span>
                        <span className="text-[#b48c68] font-extrabold text-[15px]">{item.price} {currency}</span>
                        {qty > 0 ? (
                          <div className="flex items-center gap-1.5 bg-[#faf9f6] rounded-full p-1">
                            <button onClick={() => removeItem(item.id)} className="w-7 h-7 rounded-full bg-white text-[#2d2a26] flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 transition">−</button>
                            <span className="w-5 text-center font-bold text-sm text-[#2d2a26]">{qty}</span>
                            <button onClick={() => addItem({ itemId: item.id, name, price: parseFloat(item.price), quantity: 1 })} className="w-7 h-7 rounded-full bg-[#b48c68] text-white flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 transition">+</button>
                          </div>
                        ) : (
                          <button onClick={() => addItem({ itemId: item.id, name, price: parseFloat(item.price), quantity: 1 })} className="w-8 h-8 rounded-full bg-[#2d2a26] text-white flex items-center justify-center shadow-sm active:scale-95 transition">
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </main>

        {/* FOOTER */}
        <footer className="text-center py-6 opacity-40">
          <p className="font-serif italic text-sm text-[#2d2a26]">{UI[lang].footer}</p>
          <p className="text-[8px] uppercase tracking-[0.5em] text-[#71717a] mt-1">Oued Ellil • Tunis</p>
        </footer>

        {/* CART */}
        {count > 0 && (
          <Link href={`/r/${restaurant?.slug || 'demo'}/t/order`} className="fixed bottom-4 left-4 right-4 z-50 max-w-xl mx-auto">
            <div className="bg-[#2d2a26] text-white h-14 rounded-2xl shadow-lg flex items-center justify-between px-5 active:scale-[0.98] transition">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-[#b48c68] flex items-center justify-center font-bold text-sm">{count}</span>
                <span className="font-bold uppercase tracking-wider text-sm">{UI[lang].order}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{total.toFixed(2)} {currency}</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </Link>
        )}

        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:wght@200..800&family=Noto+Sans+Arabic:wght@300..700&display=swap');
          body { font-family: 'Plus Jakarta Sans', sans-serif; -webkit-tap-highlight-color: transparent; }
          html[lang="ar"] body { font-family: 'Noto Sans Arabic', sans-serif; }
          .font-serif { font-family: 'Playfair Display', serif; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
      <Watermark show={restaurant?.plan === 'free'} />
    </WatermarkSpacer>
  );
}
