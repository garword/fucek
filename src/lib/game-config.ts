
export type GameInputType = 'ID_ONLY' | 'ID_ZONE' | 'ID_SERVER';

export interface GameConfig {
    code: string; // The API code (e.g., 'ml', 'ff')
    name: string; // Display name
    keywords: string[]; // Keywords to match product name/slug
    inputType: GameInputType;
    zoneLabel?: string; // Label for second field (Zone ID / Server)
    zonePlaceholder?: string;
    serverList?: string[]; // If it has a fixed server list (optional)
}

export const GAME_CONFIGS: GameConfig[] = [
    // --- ID + ZONE/SERVER Games ---
    {
        code: 'ml',
        name: 'Mobile Legends',
        keywords: ['mobile legends', 'mlbb', 'mobile-legends'],
        inputType: 'ID_ZONE',
        zoneLabel: 'Zone ID',
        zonePlaceholder: '12345'
    },
    {
        code: 'la',
        name: 'LifeAfter',
        keywords: ['lifeafter', 'life after'],
        inputType: 'ID_SERVER', // Prompt says "server=SERVER_NAME"
        zoneLabel: 'Server',
        zonePlaceholder: 'milestone'
    },
    {
        code: 'mcgg',
        name: 'Magic Chess: Go Go',
        keywords: ['magic chess', 'mcgg'],
        inputType: 'ID_ZONE', // Prompt says "server=ZONE_ID"
        zoneLabel: 'Zone ID',
        zonePlaceholder: '1001'
    },
    {
        code: 'pgr',
        name: 'Punishing: Gray Raven',
        keywords: ['gray raven', 'pgr'],
        inputType: 'ID_SERVER', // Prompt says "server=SERVER_ID" (AP, EU, NA)
        zoneLabel: 'Server (AP/EU/NA)',
        zonePlaceholder: 'AP'
    },
    // --- ID ONLY Games ---
    {
        code: 'ff',
        name: 'Free Fire',
        keywords: ['free fire', 'ff'],
        inputType: 'ID_ONLY'
    },
    {
        code: 'gi',
        name: 'Genshin Impact',
        keywords: ['genshin impact', 'genshin'],
        inputType: 'ID_ONLY'
    },
    {
        code: 'hi',
        name: 'Honkai Impact 3rd',
        keywords: ['honkai impact', 'honkai 3rd'],
        inputType: 'ID_ONLY'
    },
    {
        code: 'hsr',
        name: 'Honkai: Star Rail',
        keywords: ['honkai star rail', 'star rail', 'hsr'],
        inputType: 'ID_ONLY'
    },
    {
        code: 'ld',
        name: 'Love and Deepspace',
        keywords: ['love and deepspace', 'deepspace'],
        inputType: 'ID_ONLY'
    },
    {
        code: 'pb',
        name: 'Point Blank',
        keywords: ['point blank', 'pb', 'zepetto'],
        inputType: 'ID_ONLY'
    },
    {
        code: 'sm',
        name: 'Sausage Man',
        keywords: ['sausage man'],
        inputType: 'ID_ONLY'
    },
    {
        code: 'sus',
        name: 'Super Sus',
        keywords: ['super sus'],
        inputType: 'ID_ONLY'
    },
    {
        code: 'valo',
        name: 'Valorant',
        keywords: ['valorant'],
        inputType: 'ID_ONLY'
    },
    {
        code: 'zzz',
        name: 'Zenless Zone Zero',
        keywords: ['zenless', 'zzz'],
        inputType: 'ID_ONLY'
    },
    {
        code: 'aov',
        name: 'Arena of Valor',
        keywords: ['arena of valor', 'aov'],
        inputType: 'ID_ONLY'
    },
    {
        code: 'cod',
        name: 'Call of Duty Mobile',
        keywords: ['call of duty', 'codm', 'cod mobile'],
        inputType: 'ID_ONLY'
    },
    // Add Higgs Domino? Usually needs ID only.
    {
        code: 'hdi',
        name: 'Higgs Domino',
        keywords: ['higgs', 'domino', 'hdi'],
        inputType: 'ID_ONLY'
    }
];

export function getGameConfig(productName: string | undefined, slug: string | undefined): GameConfig | undefined {
    if (!productName && !slug) return undefined;

    const searchText = ((productName || '') + ' ' + (slug || '')).toLowerCase();

    return GAME_CONFIGS.find(game =>
        game.keywords.some(keyword => searchText.includes(keyword))
    );
}
