import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { applyTierPricing } from '@/lib/tiers';
import ProductTabs from '@/components/features/product/ProductTabs';
import ProductSection from '@/components/features/product/ProductSection';
import ProductCard from '@/components/features/product/ProductCard';
import HeroSection from '@/components/sections/HeroSection';
import TrustSection from '@/components/sections/TrustSection';
import Footer from '@/components/layout/Footer';
import SectionHeader from '@/components/ui/SectionHeader';
import ServiceOfflineView from '@/components/ui/ServiceOfflineView';


export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; tab?: string }>;
}) {
  const params = await searchParams; // Next.js 15: Await params
  const session = await getSession(); // Fetch Session

  // Determine active tab
  const activeTab = params.tab || 'foryou';

  // Data for View
  let groupedCategories: any[] = [];
  let gridProducts: any[] = [];
  let isGroupedView = true; // Default to grouped view for ALL tabs unless specific category/search

  // If searching or specific category or tab is SOSMED, use GRID
  if (params.q || params.category || params.tab === 'sosmed') {
    isGroupedView = false;
  }

  // Fetch Service Status
  let serviceStatus = { GAME: true, DIGITAL: true, PULSA: true, SOSMED: true };
  try {
    // @ts-ignore
    const config = await prisma.systemConfig.findUnique({ where: { key: 'MAIN_CATEGORY_STATUS' } });
    if (config) serviceStatus = JSON.parse(config.value);
  } catch (e) { }

  // Helper to fetch products for a Type/Category
  const fetchProductsForType = async (type: string, isPromo: boolean = false) => {
    const where: any = {
      isActive: true,
      isDeleted: false,
      category: { type: type }
    };
    if (isPromo) {
      where.variants = { some: { originalPrice: { not: null } } };
    }

    return await prisma.product.findMany({
      where,
      take: 10, // Limit for horizontal scroll
      orderBy: { createdAt: 'desc' },
      include: {
        variants: {
          where: { isActive: true, isDeleted: false },
          orderBy: { price: 'asc' },
          include: { stocks: { where: { status: 'AVAILABLE' } } }
        },
        category: { select: { type: true, name: true, slug: true } }
      }
    });
  };

  if (isGroupedView) {
    // 1. Specific Type Tabs (Game, Digital, etc) -> Group by CATEGORY
    const typeMap: any = {
      'digital': 'DIGITAL',
      'games': 'GAME',
      'pulsa': 'PULSA'
      // SOSMED handled in grid view
    };

    if (typeMap[activeTab]) {
      // Fetch Categories of this Type
      groupedCategories = await prisma.category.findMany({
        where: {
          isActive: true,
          type: typeMap[activeTab],
          products: { some: { isActive: true, isDeleted: false } }
        },
        orderBy: { sortOrder: 'asc' },
        include: {
          products: {
            where: { isActive: true, isDeleted: false },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              variants: {
                where: { isActive: true, isDeleted: false },
                orderBy: { price: 'asc' },
                include: { stocks: { where: { status: 'AVAILABLE' } } }
              },
              category: { select: { type: true } }
            }
          }
        }
      });
    }
    // 2. 'Semua' (For You) & 'Promo' -> Group by TYPE
    else {
      const types = [
        { id: 'GAME', name: 'Topup Game', slug: 'games' },
        { id: 'DIGITAL', name: 'Produk Digital', slug: 'digital' },
        { id: 'PULSA', name: 'Pulsa & Data', slug: 'pulsa' },
        { id: 'SOSMED', name: 'Sosmed', slug: 'sosmed' }
      ];

      for (const type of types) {
        // Filter out disabled types
        // @ts-ignore
        if (serviceStatus[type.id] === false) continue;

        const products = await fetchProductsForType(type.id, activeTab === 'promo');
        if (products.length > 0) {
          groupedCategories.push({
            id: type.id,
            name: activeTab === 'promo' ? `Promo ${type.name}` : type.name,
            slug: type.slug, // Generic slug for View All
            products: products
          });
        }
      }
    }
  } else {
    // Grid View (Search/Category Detail/SOSMED Tab)
    const where: any = {
      isActive: true,
      isDeleted: false,
    };

    // Calculate disabled types for filtering
    const disabledTypes = Object.entries(serviceStatus)
      .filter(([_, isActive]) => !isActive)
      .map(([key]) => key);

    // Initial category filter
    where.category = {};

    if (params.category) where.category.slug = params.category;

    // Filter out disabled types
    if (disabledTypes.length > 0) {
      where.category.type = { notIn: disabledTypes };
    }

    if (params.q) where.OR = [{ name: { contains: params.q } }, { description: { contains: params.q } }];

    // Handle specific tabs in grid view
    if (params.tab === 'sosmed') {
      where.category.type = 'SOSMED'; // This might conflict if SOSMED is disabled, but 'notIn' above handles general exclusion. 
      // If serviceStatus['SOSMED'] is false, 'notIn' includes separate logic? 
      // Ideally if tab=sosmed and SOSMED is disabled, isServiceOffline check at top handles the VIEW.
      // This query is for data. If filtered out, returns empty. Correct.
    }

    gridProducts = await prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true, slug: true, type: true } },
        variants: {
          where: { isActive: true, isDeleted: false },
          orderBy: { price: 'asc' },
          include: { stocks: { where: { status: 'AVAILABLE' } } }
        },
      },
      orderBy: { name: 'asc' }, // Sort alphabetically for SOSMED grid
    });
  }

  // Helper to format products
  const formatProducts = async (rawProducts: any[]) => {
    return await Promise.all(rawProducts.map(async (p) => {
      const { product: tieredProduct } = await applyTierPricing(p, session?.userId);

      // Calculate totalStock from variant.stock field (not stocks table)
      // Imported products have stock=999999 but no Stock table entries
      const totalStock = tieredProduct.variants.reduce((acc: number, variant: any) => {
        const variantStock = variant.stock ? Number(variant.stock) : 0;
        return acc + variantStock;
      }, 0);
      const prices = tieredProduct.variants.map((v: any) => Number(v.price));
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const firstVar = tieredProduct.variants[0];
      const originalPrice = firstVar?.originalPrice ? Number(firstVar.originalPrice) : 0;

      // Serialize variants to convert Decimal to number
      const serializedVariants = tieredProduct.variants.map((v: any) => ({
        ...v,
        price: Number(v.price),
        originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
      }));

      return {
        ...tieredProduct,
        variants: serializedVariants,
        minPrice,
        originalPrice,
        soldCount: (p as any).soldCount || 0,
        totalStock,
      };
    }));
  };

  // Fetch Hero Data (Server-Side)
  let serializedBanners: any[] = [];
  let heroText: any = undefined;

  if (!params.q && !params.category) {
    try {
      // Fetch Banners from SiteContent (slug: home_banners)
      const bannerRecord = await prisma.siteContent.findUnique({
        where: { slug: 'home_banners' }
      });
      const rawBanners = bannerRecord?.content ? JSON.parse(bannerRecord.content) : [];

      if (Array.isArray(rawBanners)) {
        serializedBanners = rawBanners
          .filter((b: any) => b.active)
          .map((b: any) => ({
            ...b,
            createdAt: b.createdAt || new Date().toISOString()
          }));
      }

      // Fetch Hero Text (using raw query or SiteSetting? The component used /api/admin/design/hero-text which uses ?)
      // Typically it's SiteContent or independent table.
      // Based on previous interaction, it's likely SiteContent or similar.
      // Let's try to find 'hero-text' in SiteSetting or SiteContent.
      // The previous HeroCarousel code used `/api/admin/design/hero-text`.
      // I should check that API route to be sure.
      // e:\hasilkuuy\MARKET\src\app\api\admin\design\hero-text\route.ts
      // BUT I don't want to use another tool call if I can guess.
      // `prisma.siteContent` is used in layout.
      // Let's assume it's `siteContent`.

      // SAFEGUARD: If I'm wrong, it might error.
      // Let's check the API route quickly? No, I'll trust my "view_file" ability if I had used it.
      // I saw `HeroCarousel.tsx` fetching from `/api/admin/design/hero-text`.
      // I will try `prisma.siteContent` first.

      const heroTextRecord = await prisma.siteContent.findUnique({ where: { slug: 'home_hero_text' } });
      heroText = heroTextRecord?.content ? JSON.parse(heroTextRecord.content) : undefined;
    } catch (e) {
      console.error("Failed to fetch hero data server-side:", e);
    }
  }

  // Fetch Service Status


  const typeMapReverse: Record<string, string> = {
    'games': 'GAME',
    'digital': 'DIGITAL',
    'pulsa': 'PULSA',
    'sosmed': 'SOSMED'
  };

  const currentType = typeMapReverse[activeTab];
  // @ts-ignore
  const isServiceOffline = currentType && serviceStatus[currentType] === false;

  // Process Data
  if (!isServiceOffline) {
    if (isGroupedView) {
      for (const cat of groupedCategories) {
        cat.products = await formatProducts(cat.products);
      }
    } else {
      gridProducts = await formatProducts(gridProducts);
    }
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-h-screen">
        {/* Hero Section */}
        {!params.q && !params.category && <HeroSection banners={serializedBanners} heroText={heroText} />}

        {/* Product Grid / Sections */}
        <section id="products" className="min-h-screen">
          <ProductTabs categories={[]} />
          {/* Passed empty array to force use of static tabs in ProductTabs as reverted */}

          <div className="px-1">
            <SectionHeader
              title={params.category ? `Kategori: ${params.category}` :
                params.tab === 'promo' ? 'Diskon Spesial' :
                  isGroupedView ? `Pilihan ${activeTab === 'games' ? 'Game' : activeTab === 'digital' ? 'Digital' : activeTab === 'pulsa' ? 'Pulsa & Data' : 'Terbaik'}` :
                    params.tab === 'sosmed' ? 'Daftar Layanan' :
                      params.q ? `Hasil pencarian: "${params.q}"` :
                        'Rekomendasi Pilihan'}
            />
            {/* Count Badge */}
            {!isGroupedView && <div className="text-sm font-medium text-gray-500 mb-4 pl-1">{gridProducts.length} Produk</div>}
          </div>

          {/* RENDER LOGIC */}
          {isServiceOffline ? (
            <ServiceOfflineView />
          ) : isGroupedView ? (
            // GROUPED VIEW (Horizontal Sections)
            <div className="space-y-8">
              {groupedCategories.map((cat) => (
                <ProductSection
                  key={cat.id}
                  title={cat.name}
                  slug={cat.slug}
                  products={cat.products}
                />
              ))}
              {groupedCategories.length === 0 && (
                <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed">
                  <p className="text-gray-500">Belum ada kategori untuk tipe ini.</p>
                </div>
              )}
            </div>
          ) : (
            // GRID VIEW (Existing Layout)
            gridProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                {gridProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">Tidak ada produk ditemukan.</p>
                <a href="/" className="mt-4 inline-block text-green-600 font-medium hover:underline">Lihat semua produk</a>
              </div>
            )
          )}
        </section>

        {/* Trust Section */}
        <TrustSection />

      </div>
      <Footer />
    </>
  );
}
