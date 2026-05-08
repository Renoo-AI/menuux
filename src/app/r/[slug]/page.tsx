'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight, Coffee } from 'lucide-react';
import { restaurantService } from '@/services/restaurantService';
import { menuService } from '@/services/menuService';
import { useCartStore } from '@/stores/cartStore';
import { Watermark, WatermarkSpacer } from '@/components/Watermark';
import type { Restaurant, MenuItem, MenuCategory } from '@/types';

// Demo data for when Firebase is not connected
const DEMO_RESTAURANT: Restaurant = {
  id: 'demo-restaurant-id',
  slug: 'demo',
  name: 'ZCOFFEE',
  cuisineType: 'Café & Restaurant',
  address: 'Oued Ellil, Tunis',
  phone: '+216 XX XXX XXX',
  email: 'hello@zcoffee.tn',
  status: 'ACTIVE',
  currency: 'TND',
  plan: 'free',
  slugType: 'free-random',
  watermarkEnabled: false,
  maxMenuItems: 50,
  createdAt: new Date(),
  updatedAt: new Date(),
};

interface MenuDisplayItem {
  id: string;
  category: string;
  categoryAr: string;
  nameFr: string;
  nameAr: string;
  price: string;
  description?: string;
}

const DEMO_MENU_ITEMS: MenuDisplayItem[] = [
  // Cafés
  { id: '1', category: 'Cafés', categoryAr: 'القهوة', nameFr: 'Express / Demi / Allongé', nameAr: 'إكسبريسو / دمي / ألونجي', price: '2.5' },
  { id: '2', category: 'Cafés', categoryAr: 'القهوة', nameFr: 'Cappuccino / Americano', nameAr: 'كابوتشينو / أمريكانو', price: '2.8' },
  { id: '3', category: 'Cafés', categoryAr: 'القهوة', nameFr: 'Direct', nameAr: 'قهوة ديريكت', price: '3.2' },
  { id: '4', category: 'Cafés', categoryAr: 'القهوة', nameFr: 'Spécial', nameAr: 'قهوة خاصة (سبسيال)', price: '3.5' },
  // Boissons Fraîches
  { id: '5', category: 'Boissons Fraîches', categoryAr: 'مشروبات باردة', nameFr: 'Jus Frais', nameAr: 'عصير طازج', price: '4' },
  { id: '6', category: 'Boissons Fraîches', categoryAr: 'مشروبات باردة', nameFr: 'Citronnade', nameAr: 'ليموناضة', price: '3' },
  { id: '7', category: 'Boissons Fraîches', categoryAr: 'مشروبات باردة', nameFr: 'Citronnade Amande', nameAr: 'ليموناضة باللوز', price: '5' },
  { id: '8', category: 'Boissons Fraîches', categoryAr: 'مشروبات باردة', nameFr: 'Mojito', nameAr: 'موهيتو', price: '6' },
  // Viennoiseries
  { id: '9', category: 'Viennoiseries', categoryAr: 'مخبوزات', nameFr: 'Snoopy / Croissant', nameAr: 'سنوبي / كرواسون', price: '2.5' },
  { id: '10', category: 'Viennoiseries', categoryAr: 'مخبوزات', nameFr: 'Pâté', nameAr: 'باتي', price: '2' },
  // Thé
  { id: '11', category: 'Thé', categoryAr: 'الشاي', nameFr: 'Thé', nameAr: 'شاي', price: '2' },
  { id: '12', category: 'Thé', categoryAr: 'الشاي', nameFr: 'Thé Amande', nameAr: 'شاي باللوز', price: '4' },
  // Chicha & Girac
  { id: '13', category: 'Chicha & Girac', categoryAr: 'شيشة وجيراك', nameFr: 'Chicha Menthe', nameAr: 'شيشة نعناع', price: '4' },
  { id: '14', category: 'Chicha & Girac', categoryAr: 'شيشة وجيراك', nameFr: 'Chicha Cocktail', nameAr: 'شيشة كوكتيل', price: '4.5' },
  { id: '15', category: 'Chicha & Girac', categoryAr: 'شيشة وجيراك', nameFr: 'Chicha Vide', nameAr: 'شيشة فارغة', price: '3' },
  { id: '16', category: 'Chicha & Girac', categoryAr: 'شيشة وجيراك', nameFr: 'Girac (M)', nameAr: 'جيراك (M)', price: '3.5' },
  { id: '17', category: 'Chicha & Girac', categoryAr: 'شيشة وجيراك', nameFr: 'Girac (XL)', nameAr: 'جيراك (XL)', price: '4.5' },
  { id: '18', category: 'Chicha & Girac', categoryAr: 'شيشة وجيراك', nameFr: 'Girac (XXL)', nameAr: 'جيراك (XXL)', price: '5.5' },
  // Eaux & Soft
  { id: '19', category: 'Eaux & Soft', categoryAr: 'مياه ومشروبات غازية', nameFr: 'Eau 1.5 L', nameAr: 'ماء 1.5 ل', price: '2' },
  { id: '20', category: 'Eaux & Soft', categoryAr: 'مياه ومشروبات غازية', nameFr: 'Eau 0.5 L', nameAr: 'ماء 0.5 ل', price: '1' },
  { id: '21', category: 'Eaux & Soft', categoryAr: 'مياه ومشروبات غازية', nameFr: 'Canette', nameAr: 'كانات', price: '2.5' },
];

// UI Strings for language toggle
const uiStrings = {
  fr: { 
    tag: 'The Experience', 
    footer: 'Merci de votre visite',
    toggle: 'عربي',
    loading: 'Connexion en cours...',
    demo: 'Mode Démo'
  },
  ar: { 
    tag: 'التجربة الفريدة', 
    footer: 'شكراً لزيارتكم',
    toggle: 'Français',
    loading: 'جاري الاتصال...',
    demo: 'وضع العرض'
  }
};

// Shimmer Loading Component
function ShimmerCard() {
  return (
    <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-black/[0.03]">
      <div className="h-5 w-1/3 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 rounded-md mb-6 animate-pulse" />
      <div className="space-y-4">
        <div className="h-4 w-full bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 rounded-md animate-pulse" />
        <div className="h-4 w-5/6 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 rounded-md animate-pulse" />
        <div className="h-4 w-4/6 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 rounded-md animate-pulse" />
      </div>
    </div>
  );
}

export default function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [currentLang, setCurrentLang] = useState<'fr' | 'ar'>('fr');
  
  const { items, addItem, getTotalItems, getTotalPrice } = useCartStore();
  const cartItemCount = getTotalItems();
  const cartTotal = getTotalPrice();

  // Toggle language
  const toggleLang = () => {
    setCurrentLang(currentLang === 'fr' ? 'ar' : 'fr');
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Check if this is the demo restaurant
        if (resolvedParams.slug === 'demo') {
          setRestaurant(DEMO_RESTAURANT);
          setMenuItems(DEMO_MENU_ITEMS);
          setIsDemoMode(true);
          setLoading(false);
          return;
        }
        
        // Try to get restaurant from Firebase
        const restaurantData = await restaurantService.getBySlug(resolvedParams.slug);
        if (!restaurantData) {
          setError('Restaurant not found');
          return;
        }
        setRestaurant(restaurantData);
        
        // Load categories and menu items
        const [categoriesData, itemsData] = await Promise.all([
          menuService.getCategories(restaurantData.id),
          menuService.getMenuItems(restaurantData.id),
        ]);
        
        // Convert to display format
        const displayItems: MenuDisplayItem[] = [];
        itemsData.forEach((item, index) => {
          const category = categoriesData.find(c => c.id === item.categoryId);
          displayItems.push({
            id: item.id,
            category: category?.name || 'Autre',
            categoryAr: (category as any)?.nameAr || category?.name || 'آخر',
            nameFr: item.name,
            nameAr: (item as any).nameAr || item.name,
            price: item.price.toFixed(1),
            description: item.description,
          });
        });
        
        setMenuItems(displayItems.length > 0 ? displayItems : DEMO_MENU_ITEMS);
      } catch (err) {
        console.error('Error loading menu:', err);
        // Fallback to demo data
        setRestaurant(DEMO_RESTAURANT);
        setMenuItems(DEMO_MENU_ITEMS);
        setIsDemoMode(true);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [resolvedParams.slug]);

  // Group items by category
  const categories = [...new Set(menuItems.map(item => 
    currentLang === 'fr' ? item.category : (item.categoryAr || item.category)
  ))];

  const getCurrencySymbol = () => {
    if (restaurant?.currency === 'TND') return currentLang === 'fr' ? 'DT' : 'د.ت';
    if (restaurant?.currency === 'EUR') return '€';
    if (restaurant?.currency === 'USD') return '$';
    return currentLang === 'fr' ? 'DT' : 'د.ت';
  };

  if (error && !restaurant) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center gap-4 p-8">
        <h1 className="font-serif text-2xl font-bold text-[#2d2a26]">Restaurant non trouvé</h1>
        <p className="text-[#71717a]">{error}</p>
        <Link href="/" className="text-[#b48c68] font-semibold hover:underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  const showWatermark = restaurant?.plan === 'free' || restaurant?.watermarkEnabled === true;

  return (
    <WatermarkSpacer showWatermark={showWatermark}>
      <div 
        className="min-h-screen bg-[#faf9f6] pb-20"
        dir={currentLang === 'ar' ? 'rtl' : 'ltr'}
        lang={currentLang}
      >
        {/* Glass Navigation */}
        <nav className="sticky top-0 z-50 px-6 py-4 flex justify-center items-center relative bg-[#faf9f6]/90 backdrop-blur-xl border-b border-[#b48c68]/10">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 bg-[#2d2a26] rounded-xl flex items-center justify-center mb-1 shadow-lg">
              <Coffee className="w-5 h-5 text-[#b48c68]" />
            </div>
            <div className="text-center">
              <h1 className="font-serif text-xl font-bold tracking-tight text-[#2d2a26]">
                {restaurant?.name || 'ZCOFFEE'}
              </h1>
              <p className="text-[7px] uppercase tracking-[0.4em] text-[#b48c68] font-bold">
                {uiStrings[currentLang].tag}
              </p>
            </div>
          </div>
          <button 
            onClick={toggleLang}
            className="absolute right-6 bg-white text-[#b48c68] px-4 py-1.5 rounded-full font-bold text-[0.7rem] uppercase tracking-wider border border-[#b48c68]/20 shadow-sm hover:shadow-md transition-all"
          >
            {uiStrings[currentLang].toggle}
          </button>
        </nav>

        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="bg-[#b48c68]/10 text-[#b48c68] px-4 py-2 text-center text-xs font-semibold">
            {uiStrings[currentLang].demo}
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-xl mx-auto px-5 py-6">
          {/* Loading State */}
          {loading && (
            <div className="space-y-6">
              <ShimmerCard />
              <ShimmerCard />
              <ShimmerCard />
            </div>
          )}

          {/* Menu Categories */}
          {!loading && menuItems.length > 0 && (
            <div className="space-y-6">
              {categories.map((cat, catIdx) => {
                const categoryItems = menuItems.filter(item =>
                  (currentLang === 'fr' ? item.category : (item.categoryAr || item.category)) === cat
                );

                return (
                  <div 
                    key={cat}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-black/[0.03]"
                    style={{ animationDelay: `${catIdx * 100}ms` }}
                  >
                    {/* Category Header */}
                    <div className="flex items-center gap-4 mb-5">
                      <h2 className="font-serif italic text-[#b48c68] text-lg font-bold">
                        {cat}
                      </h2>
                      <div className="flex-1 h-px bg-gradient-to-r from-[#b48c68]/30 to-transparent" />
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-black/[0.03]">
                      {categoryItems.map((item, index) => {
                        const name = currentLang === 'fr' ? item.nameFr : item.nameAr;
                        const priceLabel = `${item.price} ${getCurrencySymbol()}`;

                        return (
                          <div 
                            key={item.id}
                            className="flex justify-between items-center py-3.5 group cursor-pointer hover:bg-[#faf9f6]/50 -mx-2 px-2 rounded-lg transition-colors"
                            style={{ 
                              animation: `fadeIn 0.4s ease forwards`,
                              animationDelay: `${(catIdx * 100) + (index * 50)}ms`,
                              opacity: 0
                            }}
                            onClick={() => {
                              addItem({
                                itemId: item.id,
                                name: name,
                                price: parseFloat(item.price),
                                quantity: 1,
                              });
                            }}
                          >
                            <span className="font-semibold text-[0.95rem] text-[#2d2a26]/90 group-hover:text-[#b48c68] transition-colors">
                              {name}
                            </span>
                            <span className="text-[#b48c68] font-extrabold text-[1.05rem] whitespace-nowrap ml-3">
                              {priceLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && menuItems.length === 0 && (
            <div className="text-center py-20">
              <p className="text-[#71717a] italic text-sm">
                {uiStrings[currentLang].loading}
              </p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-8 text-center px-6 opacity-40">
          <p className="font-serif italic text-sm mb-1 text-[#2d2a26]">
            {uiStrings[currentLang].footer}
          </p>
          <p className="text-[8px] uppercase tracking-[0.5em] text-[#71717a]">
            {restaurant?.address || 'Oued Ellil • Tunis'}
          </p>
        </footer>

        {/* Sticky Bottom Cart Bar */}
        {cartItemCount > 0 && (
          <Link
            href={`/r/${restaurant?.slug || 'demo'}/t/order`}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 flex justify-center"
          >
            <div className="bg-[#2d2a26] text-white w-full max-w-md h-16 rounded-2xl shadow-2xl flex items-center justify-between px-6 active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-[#b48c68] flex items-center justify-center font-bold text-sm">
                  {cartItemCount}
                </div>
                <span className="font-bold uppercase tracking-widest text-sm">
                  {currentLang === 'fr' ? 'Voir la commande' : 'عرض الطلب'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{cartTotal.toFixed(2)} {getCurrencySymbol()}</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </Link>
        )}

        {/* Animation Styles */}
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:wght@200..800&family=Noto+Sans+Arabic:wght@300..700&display=swap');
          
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            -webkit-tap-highlight-color: transparent;
          }
          
          html[lang="ar"] body,
          html[lang="ar"] {
            font-family: 'Noto Sans Arabic', sans-serif;
          }
          
          .font-serif {
            font-family: 'Playfair Display', serif;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}</style>
      </div>
      <Watermark show={showWatermark} />
    </WatermarkSpacer>
  );
}
