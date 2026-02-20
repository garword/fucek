import Link from 'next/link';
import prisma from '@/lib/prisma';
import DynamicIcon from '@/components/ui/DynamicIcon';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

// Helper to convert class names (fa-brands fa-instagram) to IconProp
const getIconProp = (name: string): IconProp => {
    // Check if it's a legacy Lucide name (fallback map)
    const map: Record<string, string> = {
        Instagram: "fa-brands fa-instagram",
        Twitter: "fa-brands fa-twitter",
        Facebook: "fa-brands fa-facebook",
        Youtube: "fa-brands fa-youtube",
        Linkedin: "fa-brands fa-linkedin",
        Github: "fa-brands fa-github",
        Mail: "fa-regular fa-envelope",
        Phone: "fa-solid fa-phone",
        MapPin: "fa-solid fa-map-pin",
        Globe: "fa-solid fa-globe",
        Smartphone: "fa-solid fa-mobile-screen",
        MessageCircle: "fa-regular fa-message",
        ShieldCheck: "fa-solid fa-shield-halved"
    };

    const className = map[name] || name;

    // Parse "fa-brands fa-instagram" -> ['fab', 'instagram']
    const parts = className.split(' ');
    let prefix = 'fas'; // default solid
    let iconName = 'circle-question'; // default fallback

    parts.forEach(part => {
        if (part === 'fa-brands') prefix = 'fab';
        if (part === 'fa-solid') prefix = 'fas';
        if (part === 'fa-regular') prefix = 'far';
        if (part.startsWith('fa-') && !['fa-brands', 'fa-solid', 'fa-regular'].includes(part)) {
            iconName = part.replace('fa-', '');
        }
    });

    return [prefix as any, iconName] as IconProp;
};

import { unstable_noStore as noStore } from 'next/cache';

async function getFooterConfig() {
    noStore(); // Opt out of static generation
    try {
        const setting = await prisma.siteSetting.findUnique({
            where: { key: 'footer_config' },
        });
        if (setting) {
            const parsed = JSON.parse(setting.value);

            // Migration: Convert old object format to arrays if needed
            if (!Array.isArray(parsed.socials)) {
                const newSocials = [];
                if (parsed.socials?.instagram) newSocials.push({ platform: "Instagram", url: parsed.socials.instagram, icon: "Instagram" });
                if (parsed.socials?.twitter) newSocials.push({ platform: "Twitter", url: parsed.socials.twitter, icon: "Twitter" });
                if (parsed.socials?.facebook) newSocials.push({ platform: "Facebook", url: parsed.socials.facebook, icon: "Facebook" });
                parsed.socials = newSocials;
            }

            if (!Array.isArray(parsed.contact)) {
                const newContact = [];
                if (parsed.contact?.email) newContact.push({ type: "Email", value: parsed.contact.email, icon: "Mail" });
                if (parsed.contact?.phone) newContact.push({ type: "Phone", value: parsed.contact.phone, icon: "Phone" });
                if (parsed.contact?.address) newContact.push({ type: "Address", value: parsed.contact.address, icon: "MapPin" });
                parsed.contact = newContact;
            }

            // Ensure menus exist
            if (!parsed.menus) {
                parsed.menus = [
                    {
                        title: "Informasi",
                        links: [
                            { label: "Tentang Kami", url: "/info/about" },
                            { label: "Cara Beli", "url": "/info/how-to-buy" },
                            { label: "FAQ", "url": "/info/faq" },
                            { label: "Blog", "url": "/info/blog" }
                        ]
                    },
                    {
                        title: "Bantuan & Legal",
                        links: [
                            { label: "Syarat & Ketentuan", "url": "/info/terms" },
                            { label: "Kebijakan Privasi", "url": "/info/privacy" },
                            { label: "Kebijakan Refund", "url": "/info/refund" },
                            { label: "Hubungi Kami", "url": "/info/contact" }
                        ]
                    }
                ];
            }
            return parsed;
        }
    } catch (error) {
        console.error("Failed to load footer config:", error);
    }

    return {
        description: "Marketplace produk digital terpercaya. Solusi hemat untuk kebutuhan streaming, desain, dan produktivitas Anda.",
        contact: [
            { type: "Email", value: "support@store.com", icon: "Mail" },
            { type: "WhatsApp", value: "+62 812 3456 7890", icon: "Phone" },
            { type: "Alamat", value: "Jakarta, Indonesia", icon: "MapPin" }
        ],
        socials: [
            { platform: "Instagram", url: "#", icon: "Instagram" },
            { platform: "Twitter", url: "#", icon: "Twitter" },
            { platform: "Facebook", url: "#", icon: "Facebook" }
        ],
        menus: [
            {
                title: "Informasi",
                links: [
                    { label: "Tentang Kami", url: "/info/about" },
                    { label: "Cara Beli", "url": "/info/how-to-buy" },
                    { label: "FAQ", "url": "/info/faq" },
                    { label: "Blog", "url": "/info/blog" }
                ]
            },
            {
                title: "Bantuan & Legal",
                links: [
                    { label: "Syarat & Ketentuan", "url": "/info/terms" },
                    { label: "Kebijakan Privasi", "url": "/info/privacy" },
                    { label: "Kebijakan Refund", "url": "/info/refund" },
                    { label: "Hubungi Kami", "url": "/info/contact" }
                ]
            }
        ]
    };
}

async function getIdentityConfig() {
    try {
        const setting = await prisma.siteSetting.findUnique({
            where: { key: "site_identity" }
        });
        if (setting) return JSON.parse(setting.value);
    } catch (e) {
        // ignore
    }
    return { mode: "text", text: "STORE", subText: ".", imageUrl: "", slogan: "Premium Digital Products" };
}

export default async function Footer() {
    const config = await getFooterConfig();
    const brand = await getIdentityConfig();

    return (
        <div className="relative mt-24 pb-0 overflow-hidden w-full">
            {/* Background Grid Pattern - Hidden on Mobile */}
            <div className="hidden md:block absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>

            {/* Premium 3D Glass Footer - Simplified for Mobile */}
            <footer className="mt-auto bg-white dark:bg-slate-900 md:bg-white/90 md:dark:bg-slate-900/90 md:backdrop-blur-xl pt-8 md:pt-16 pb-10 rounded-t-3xl md:rounded-t-[2.5rem] w-full shadow-none md:shadow-[0_-10px_40px_-5px_rgba(0,0,0,0.1)] md:dark:shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.5)] relative z-10 transition-all duration-300 font-sans group">

                {/* 3D Glass Edge Effect (Bevel) */}
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent md:via-white/80 md:shadow-[0_0_15px_rgba(255,255,255,0.7)] z-20"></div>

                <div className="absolute top-[1px] inset-x-0 h-[1px] bg-black/5 dark:bg-black/40 z-10"></div>

                {/* 3D Glow - Hidden on mobile */}
                <div className="hidden md:block absolute -top-[20px] left-1/2 -translate-x-1/2 w-3/4 h-[20px] bg-green-500/10 blur-2xl rounded-full pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-16">
                        {/* Brand Section */}
                        <div className="space-y-6">
                            <Link href="/" className="inline-block">
                                {/* Logo - Smart Auto-Fit for Footer */}
                                {brand.mode === 'image' && brand.imageUrl ? (
                                    <img
                                        src={brand.imageUrl}
                                        alt={brand.imageAlt || "Logo"}
                                        className="
                                            h-9 sm:h-10 md:h-11 lg:h-12
                                            w-auto
                                            max-h-14
                                            max-w-[160px] sm:max-w-[180px] md:max-w-[220px] lg:max-w-[260px]
                                            object-contain
                                        "
                                    />
                                ) : (
                                    <span className="font-bold text-2xl text-green-600 dark:text-green-500 tracking-tight">
                                        {brand.text || "STORE"}<span className="text-gray-900 dark:text-white">.</span>
                                    </span>
                                )}
                            </Link>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs">
                                {config.description || brand.slogan}
                            </p>
                            <div className="flex items-center gap-3">
                                {config.socials?.map((social: any, idx: number) => {
                                    const iconProp = getIconProp(social.icon);
                                    return (
                                        <a
                                            key={idx}
                                            href={social.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-white/5 text-gray-400 hover:bg-green-50 hover:text-green-600 active:bg-green-100 active:text-green-700 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-all duration-200 active:scale-95"
                                        >
                                            <DynamicIcon icon={iconProp} className="text-lg" />
                                        </a>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Dynamic Menus */}
                        {config.menus?.map((menu: any, index: number) => (
                            <div key={index}>
                                <h4 className="font-bold text-gray-900 dark:text-white mb-6 text-base">{menu.title}</h4>
                                <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
                                    {menu.links.map((link: any, linkIndex: number) => (
                                        <li key={linkIndex}>
                                            <Link href={link.url} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                                                {link.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}

                        {/* Contact - Only show if data exists */}
                        {config.contact && config.contact.length > 0 && (
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white mb-6 text-base">Kontak</h4>
                                <ul className="space-y-5 text-sm">
                                    {config.contact.map((item: any, idx: number) => {
                                        const iconProp = getIconProp(item.icon);
                                        return (
                                            <li key={idx} className="flex items-start gap-4">
                                                <div className="mt-1 text-gray-400 dark:text-gray-500 hover:text-green-600 active:text-green-600 dark:hover:text-green-400 transition-colors duration-200 shrink-0 cursor-pointer">
                                                    <DynamicIcon icon={iconProp} className="text-lg" />
                                                </div>
                                                <span className="text-gray-500 dark:text-gray-400 leading-relaxed">{item.value}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-100 dark:border-white/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-sm text-gray-400 dark:text-gray-500 text-center md:text-left">
                            © {new Date().getFullYear()} {brand.text || "Store"}. All rights reserved.
                        </p>

                        {/* Payment Icons */}
                        <div className="flex items-center gap-3">
                            <div className="h-8 px-3 flex items-center justify-center bg-white border border-gray-200 rounded font-bold text-gray-600 text-[10px] tracking-tighter shadow-sm">QRIS</div>
                            <div className="h-8 px-3 flex items-center justify-center bg-[#00529C] border-none rounded font-bold text-white text-[10px] shadow-sm">BCA</div>
                            <div className="h-8 px-3 flex items-center justify-center bg-[#118EEA] border-none rounded font-bold text-white text-[10px] shadow-sm">DANA</div>
                            <div className="h-8 px-3 flex items-center justify-center bg-[#4C3494] border-none rounded font-bold text-white text-[10px] shadow-sm">OVO</div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
