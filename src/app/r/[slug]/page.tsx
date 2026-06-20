'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Plus, Minus, ChevronRight } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';

const DEMO_RESTAURANT = {
  id: 'demo', slug: 'demo', name: 'ZCOFFEE', status: 'ACTIVE', currency: 'TND',
};

const DEMO_MENU_ITEMS = [
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
  { id: '19', category: 'Eaux & Soft', categoryAr: 'مياه ومشروبات', nameFr: 'Eau 1.5 L', nameAr: 'ماء 1.5 ل', price: '2' },
  { id: '20', category: 'Eaux & Soft', categoryAr: 'مياه ومشروبات', nameFr: 'Eau 0.5 L', nameAr: 'ماء 0.5 ل', price: '1' },
  { id: '21', category: 'Eaux & Soft', categoryAr: 'مياه ومشروبات', nameFr: 'Canette', nameAr: 'كانات', price: '2.5' },
];

const uiStrings: Record<string, { tag: string; footer: string; toggle: string; reviewOrder: string; items: string; table: string }> = {
  fr: { tag: 'The Experience', footer: 'Merci de votre visite', toggle: 'عربي', reviewOrder: 'Voir la commande', items: 'articles', table: 'Table' },
  ar: { tag: 'التجربة الفريدة', footer: 'شكراً لزيارتكم', toggle: 'Français', reviewOrder: 'عرض الطلب', items: 'منتجات', table: 'طاولة' },
};

interface MenuDisplayItem { id: string; category: string; categoryAr: string; nameFr: string; nameAr: string; price: string; }

export default function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [restaurant, setRestaurant] = useState(DEMO_RESTAURANT);
  const [menuItems, setMenuItems] = useState<MenuDisplayItem[]>(DEMO_MENU_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState<'fr' | 'ar'>('fr');
  const { items, addItem, removeItem, updateQuantity, setContext, getTotalItems, getTotalPrice, getItemByItemId } = useCartStore();

  useEffect(() => {
    fetch(`/api/public/restaurant/${resolvedParams.slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.restaurant) {
          setRestaurant({ id: data.restaurant.id, slug: data.restaurant.slug, name: data.restaurant.name, status: 'ACTIVE', currency: data.restaurant.currency || 'TND' });
          if (data.items?.length) setMenuItems(data.items.map((i: Record<string,unknown>) => ({ id: i.id as string, category: i.category as string || '', categoryAr: i.categoryAr as string || '', nameFr: i.nameFr as string || '', nameAr: i.nameAr as string || '', price: String(i.price || '') })));
        }
      })
      .catch(() => {});
  }, [resolvedParams.slug]);

  const categories = [...new Set(menuItems.map(i => i.category))];
  const filteredItems = selectedCategory ? menuItems.filter(i => i.category === selectedCategory) : menuItems;

  const handleQuantity = (item: MenuDisplayItem, delta: number) => {
    const cartItem = getItemByItemId(item.id);
    const name = currentLang === 'fr' ? item.nameFr : item.nameAr;
    if (cartItem) {
      const q = cartItem.quantity + delta;
      q <= 0 ? removeItem(item.id) : updateQuantity(item.id, q);
    } else if (delta > 0) {
      addItem({ itemId: item.id, name, price: parseFloat(item.price), quantity: 1 });
    }
  };

  const getCurrencySymbol = () => restaurant.currency === 'TND' ? (currentLang === 'fr' ? 'DT' : 'د.ت') : '€';
  const cartItemCount = getTotalItems();
  const cartTotal = getTotalPrice();

  return (
    <div className="min-h-screen bg-[#FDF8F3] pb-32" dir={currentLang === 'ar' ? 'rtl' : 'ltr'}>
      <header className="sticky top-0 z-50 px-6 py-4 bg-[#FDF8F3] border-b border-[#E8E2DA] shadow-[0px_10px_30px_rgba(58,50,45,0.05)]">
        <div className="flex justify-between items-center max-w-xl mx-auto">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7f756f] mb-1">{restaurant.name}</p>
            <h1 className="text-[32px] font-bold text-[#3D2C1E] leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Menu</h1>
          </div>
          <button onClick={() => setCurrentLang(currentLang === 'fr' ? 'ar' : 'fr')} className="bg-white text-[#D4A373] px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider border border-[#E8E2DA] shadow-sm">
            {uiStrings[currentLang].toggle}
          </button>
        </div>
      </header>

      <nav className="sticky top-[81px] z-40 bg-[#FDF8F3] overflow-x-auto flex items-center gap-2 px-5 py-3 border-b border-[#E8E2DA]">
        <button onClick={() => setSelectedCategory(null)} className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold tracking-wider uppercase transition-all ${selectedCategory === null ? 'bg-[#3D2C1E] text-white' : 'bg-[#f8f2f1] text-[#4d4540]'}`}>
          {currentLang === 'fr' ? 'Tout' : 'الكل'}
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold tracking-wider uppercase transition-all ${selectedCategory === cat ? 'bg-[#3D2C1E] text-white' : 'bg-[#f8f2f1] text-[#4d4540]'}`}>
            {currentLang === 'fr' ? cat : menuItems.find(i => i.category === cat)?.categoryAr || cat}
          </button>
        ))}
      </nav>

      <main className="max-w-xl mx-auto px-5 py-6">
        <div className="bg-white rounded-xl p-6 shadow-[0px_10px_30px_rgba(58,50,45,0.05)]">
          <div className="divide-y divide-[#f2edeb]">
            {filteredItems.map(item => {
              const name = currentLang === 'fr' ? item.nameFr : item.nameAr;
              const priceLabel = `${item.price} ${getCurrencySymbol()}`;
              const cartItem = getItemByItemId(item.id);
              const quantity = cartItem?.quantity || 0;
              return (
                <div key={item.id} className="flex justify-between items-center py-3">
                  <span className="font-semibold text-[15px] text-[#3D2C1E]">{name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[#D4A373] font-bold text-base">{priceLabel}</span>
                    {quantity > 0 ? (
                      <div className="flex items-center gap-1 bg-[#f2edeb] rounded-full px-1 py-1">
                        <button onClick={() => handleQuantity(item, -1)} className="w-6 h-6 rounded-full bg-white text-[#3D2C1E] flex items-center justify-center text-sm"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="font-bold text-sm w-5 text-center text-[#3D2C1E]">{quantity}</span>
                        <button onClick={() => handleQuantity(item, 1)} className="w-6 h-6 rounded-full bg-[#D4A373] text-white flex items-center justify-center text-sm"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <button onClick={() => handleQuantity(item, 1)} className="w-8 h-8 rounded-full bg-[#3D2C1E] text-white flex items-center justify-center shadow-sm active:scale-95"><Plus className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {cartItemCount > 0 && (
        <Link href={`/r/${restaurant.slug}/t/T-01/review`} className="fixed bottom-0 left-0 right-0 z-50 p-4 flex justify-center pointer-events-none">
          <div className="bg-[#3D2C1E] text-white w-full max-w-md h-16 rounded-full shadow-2xl flex items-center justify-between px-6 active:scale-[0.98] transition-transform pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">{cartItemCount}</div>
              <span className="font-bold uppercase tracking-widest text-xs">{uiStrings[currentLang].reviewOrder}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">{cartTotal.toFixed(2)} {getCurrencySymbol()}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </Link>
      )}

      <footer className="mt-8 text-center px-6 pb-24"><p className="text-xs text-[#7f756f] opacity-60">{uiStrings[currentLang].footer}</p></footer>
    </div>
  );
}
