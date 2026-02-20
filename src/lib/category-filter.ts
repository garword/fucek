// Category Mapping: Provider Category → App Category Type
// Used for filtering bulk import by category

export const CATEGORY_TYPE_MAPPING: Record<string, 'GAME' | 'PULSA'> = {
    // GAME Categories (Digiflazz & TokoVoucher)
    'Games': 'GAME',
    'Voucher Game': 'GAME',
    'Game': 'GAME',
    'Gaming': 'GAME',
    'Mobile Legends': 'GAME',
    'Free Fire': 'GAME',
    'PUBG': 'GAME',
    'Genshin Impact': 'GAME',
    'Honor of Kings': 'GAME',
    'Steam': 'GAME',
    'PlayStation': 'GAME',
    'Xbox': 'GAME',
    'Point Blank': 'GAME',
    'Garena': 'GAME',

    // PULSA Categories (Pulsa + Paket Data)
    'Pulsa': 'PULSA',
    'Paket Data': 'PULSA',
    'Data': 'PULSA',
    'Pulsa Reguler': 'PULSA',
    'Pulsa Transfer': 'PULSA',
    'Voucher Pulsa': 'PULSA',
    'Telkomsel': 'PULSA',
    'Indosat': 'PULSA',
    'XL': 'PULSA',
    'Tri': 'PULSA',
    'Axis': 'PULSA',
    'Smartfren': 'PULSA',
    'By.U': 'PULSA',
};

/**
 * Map provider category to app category type
 * @param providerCategory Category from provider (Digiflazz/TokoVoucher)
 * @returns 'GAME' | 'PULSA' | null (null = not matched, skip)
 */
export function mapCategoryType(providerCategory: string): 'GAME' | 'PULSA' | null {
    if (!providerCategory) return null;

    // Direct match
    const directMatch = CATEGORY_TYPE_MAPPING[providerCategory];
    if (directMatch) return directMatch;

    // Fuzzy match (case-insensitive, contains)
    const lowerCategory = providerCategory.toLowerCase();

    // Check for GAME keywords
    if (
        lowerCategory.includes('game') ||
        lowerCategory.includes('voucher') ||
        lowerCategory.includes('steam') ||
        lowerCategory.includes('playstation') ||
        lowerCategory.includes('xbox') ||
        lowerCategory.includes('garena')
    ) {
        return 'GAME';
    }

    // Check for PULSA keywords
    if (
        lowerCategory.includes('pulsa') ||
        lowerCategory.includes('data') ||
        lowerCategory.includes('paket') ||
        lowerCategory.includes('telkomsel') ||
        lowerCategory.includes('indosat') ||
        lowerCategory.includes('xl') ||
        lowerCategory.includes('tri') ||
        lowerCategory.includes('axis') ||
        lowerCategory.includes('smartfren')
    ) {
        return 'PULSA';
    }

    // Not matched
    return null;
}

/**
 * Filter brands by category type
 * @param brands Array of brand objects from API
 * @param filterType 'GAME' | 'PULSA' | 'ALL'
 * @returns Filtered brands
 */
export function filterBrandsByType(
    brands: Array<{ name: string; category: string; products: any[] }>,
    filterType: 'GAME' | 'PULSA' | 'ALL'
): Array<{ name: string; category: string; products: any[] }> {
    if (filterType === 'ALL') return brands;

    return brands.filter((brand) => {
        const mappedType = mapCategoryType(brand.category);
        return mappedType === filterType;
    });
}
