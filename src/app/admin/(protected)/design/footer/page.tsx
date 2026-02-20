"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Save, Loader2, LayoutTemplate,
    Plus, Trash2, Link as LinkIcon, ChevronDown, ChevronRight, X, ExternalLink,
    Twitter, Phone, MapPin, Globe // Keep for UI or default icons mapping if any
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

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
        Mail: "fa-solid fa-envelope",
        Phone: "fa-solid fa-phone",
        MapPin: "fa-solid fa-map-pin",
        Globe: "fa-solid fa-globe",
        Smartphone: "fa-solid fa-mobile-screen",
        MessageCircle: "fa-regular fa-message"
    };

    // Handle empty or undefined names
    if (!name || name.trim() === '') {
        return ['fas', 'circle-question'] as IconProp;
    }

    const className = map[name] || name;

    const parts = className.split(' ');
    let prefix = 'fas';
    let iconName = 'circle-question';

    parts.forEach(part => {
        if (part === 'fa-brands') prefix = 'fab';
        if (part === 'fa-solid') prefix = 'fas';
        if (part === 'fa-regular') prefix = 'far';
        if (part.startsWith('fa-') && !['fa-brands', 'fa-solid', 'fa-regular'].includes(part)) {
            iconName = part.replace('fa-', '');
        }
    });

    return [prefix, iconName] as IconProp;
};

// Safe Icon Wrapper with error handling
const SafeIcon = ({ icon, className }: { icon: string, className?: string }) => {
    try {
        const iconProp = getIconProp(icon);
        return <FontAwesomeIcon icon={iconProp} className={className} />;
    } catch (error) {
        // Fallback to question mark if icon fails to load
        return <FontAwesomeIcon icon={['fas', 'circle-question']} className={className} />;
    }
};

interface FooterLink {
    label: string;
    url: string;
}

interface FooterMenu {
    title: string;
    links: FooterLink[];
}

interface SocialLink {
    platform: string;
    url: string;
    icon: string;
}

interface ContactItem {
    type: string;
    value: string;
    icon: string;
}

interface FooterConfig {
    description: string;
    contact: ContactItem[];
    socials: SocialLink[];
    menus: FooterMenu[];
}

export default function FooterDesignPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [openMenus, setOpenMenus] = useState<number[]>([]);
    const [config, setConfig] = useState<FooterConfig>({
        description: "",
        contact: [],
        socials: [],
        menus: []
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch("/api/admin/design/footer");
            if (!res.ok) throw new Error("Failed to fetch config");
            const data = await res.json();

            // Client-side migration if needed (though API should handle default structure)
            if (!Array.isArray(data.socials)) {
                // ... logic handled by API now typically, but safe to have default ...
                data.socials = [];
            }
            if (!Array.isArray(data.contact)) {
                data.contact = [];
            }
            if (!data.menus) data.menus = [];

            setConfig(data);
            if (data.menus.length > 0) setOpenMenus([0]);
        } catch (error) {
            console.error(error);
            toast.error("Gagal memuat konfigurasi footer");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/admin/design/footer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            if (!res.ok) throw new Error("Failed to save");
            const savedData = await res.json();
            setConfig(savedData); // Update state with confirmed saved data (and potentially migrated structure)
            toast.success("Footer berhasil diperbarui!");
        } catch (error) {
            console.error(error);
            toast.error("Gagal menyimpan perubahan");
        } finally {
            setSaving(false);
        }
    };

    // Menu Helpers
    const toggleMenu = (index: number) => {
        setOpenMenus(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
    };

    const addMenu = () => {
        setConfig(prev => ({ ...prev, menus: [...prev.menus, { title: "Menu Baru", links: [] }] }));
        setOpenMenus(prev => [...prev, config.menus.length]);
    };

    const removeMenu = (index: number) => {
        setConfig(prev => ({ ...prev, menus: prev.menus.filter((_, i) => i !== index) }));
    };

    const updateMenuTitle = (index: number, title: string) => {
        const newMenus = [...config.menus];
        newMenus[index].title = title;
        setConfig({ ...config, menus: newMenus });
    };

    const addLink = (menuIndex: number) => {
        const newMenus = [...config.menus];
        newMenus[menuIndex].links.push({ label: "Link Baru", url: "#" });
        setConfig({ ...config, menus: newMenus });
    };

    const removeLink = (menuIndex: number, linkIndex: number) => {
        const newMenus = [...config.menus];
        newMenus[menuIndex].links = newMenus[menuIndex].links.filter((_, i) => i !== linkIndex);
        setConfig({ ...config, menus: newMenus });
    };

    const updateLink = (menuIndex: number, linkIndex: number, field: keyof FooterLink, value: string) => {
        const newMenus = [...config.menus];
        newMenus[menuIndex].links[linkIndex][field] = value;
        setConfig({ ...config, menus: newMenus });
    };


    // Social Helpers
    const addSocial = () => {
        setConfig(prev => ({
            ...prev,
            socials: [...prev.socials, { platform: "Instagram", url: "#", icon: "Instagram" }]
        }));
    };

    const removeSocial = (index: number) => {
        setConfig(prev => ({ ...prev, socials: prev.socials.filter((_, i) => i !== index) }));
    };

    const updateSocial = (index: number, field: keyof SocialLink, value: string) => {
        const newSocials = [...config.socials];
        newSocials[index][field] = value;
        setConfig({ ...config, socials: newSocials });
    };

    // Contact Helpers
    const addContact = () => {
        setConfig(prev => ({
            ...prev,
            contact: [...prev.contact, { type: "Info", value: "Details...", icon: "Mail" }]
        }));
    };

    const removeContact = (index: number) => {
        setConfig(prev => ({ ...prev, contact: prev.contact.filter((_, i) => i !== index) }));
    };

    const updateContact = (index: number, field: keyof ContactItem, value: string) => {
        const newContact = [...config.contact];
        newContact[index][field] = value;
        setConfig({ ...config, contact: newContact });
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-emerald-600" /></div>;

    return (
        <div className="space-y-8 pb-32">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Footer Design</h1>
                    <p className="text-gray-500 mt-1">Manage footer content and appearance</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 font-medium"
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between text-blue-700 text-sm">
                <p>
                    <span className="font-bold">Tips:</span> Gunakan nama class icon dari library
                    <a href="https://fontawesome.com/icons" target="_blank" className="font-bold underline ml-1 hover:text-blue-900">FontAwesome 6</a>
                    (contoh: <code>fa-brands fa-instagram</code>, <code>fa-solid fa-ghost</code>, dll).
                </p>
                <ExternalLink size={16} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Forms */}
                <div className="space-y-6">
                    {/* General Info */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                                <LayoutTemplate size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Informasi Umum</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Footer</label>
                                <textarea
                                    value={config.description}
                                    onChange={(e) => setConfig({ ...config, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
                                    placeholder="Deskripsi singkat website Anda..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Social Media */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                                    <Twitter size={20} />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Social Media Links</h2>
                            </div>
                            <button onClick={addSocial} className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
                                <Plus size={16} /> Tambah Social
                            </button>
                        </div>
                        <div className="space-y-4">
                            {config.socials.map((social, idx) => {
                                return (
                                    <div key={idx} className="flex gap-2">
                                        <div className="w-1/3 space-y-2">
                                            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-2 py-1 focus-within:ring-2 focus-within:ring-emerald-500">
                                                <SafeIcon icon={social.icon} className="text-gray-500 shrink-0 text-base" />
                                                <input
                                                    type="text"
                                                    value={social.icon}
                                                    onChange={(e) => updateSocial(idx, 'icon', e.target.value)}
                                                    className="w-full py-1 bg-transparent text-sm border-none focus:ring-0 placeholder:text-gray-300"
                                                    placeholder="Icon Name"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <input
                                                type="text"
                                                value={social.url}
                                                onChange={(e) => updateSocial(idx, 'url', e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <button onClick={() => removeSocial(idx)} className="text-gray-400 hover:text-red-500 p-2">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                );
                            })}
                            {config.socials.length === 0 && (
                                <p className="text-center text-sm text-gray-400 py-4 italic">Belum ada akun social media.</p>
                            )}
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                                    <Phone size={20} />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Kontak Kami</h2>
                            </div>
                            <button onClick={addContact} className="text-sm flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium">
                                <Plus size={16} /> Tambah Kontak
                            </button>
                        </div>
                        <div className="space-y-4">
                            {config.contact.map((item, idx) => {
                                return (
                                    <div key={idx} className="flex flex-col gap-2 p-3 border border-gray-100 rounded-xl bg-gray-50/50">
                                        <div className="flex gap-2">
                                            <div className="w-1/3 flex items-center gap-2 border border-gray-200 rounded-xl px-2 bg-white focus-within:ring-2 focus-within:ring-emerald-500">
                                                <SafeIcon icon={item.icon} className="text-gray-500 shrink-0 text-base" />
                                                <input
                                                    type="text"
                                                    value={item.icon}
                                                    onChange={(e) => updateContact(idx, 'icon', e.target.value)}
                                                    className="w-full py-1 bg-transparent text-sm border-none focus:ring-0 placeholder:text-gray-300"
                                                    placeholder="Icon Name"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={item.value}
                                                onChange={(e) => updateContact(idx, 'value', e.target.value)}
                                                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
                                                placeholder="Value (e.g. details)"
                                            />
                                            <button onClick={() => removeContact(idx)} className="text-gray-400 hover:text-red-500 p-2">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {config.contact.length === 0 && (
                                <p className="text-center text-sm text-gray-400 py-4 italic">Belum ada informasi kontak.</p>
                            )}
                        </div>
                    </div>

                    {/* Menu Management */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                    <LinkIcon size={20} />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Menu Footer</h2>
                            </div>
                            <button onClick={addMenu} className="text-sm flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium">
                                <Plus size={16} /> Tambah Menu
                            </button>
                        </div>

                        <div className="space-y-4">
                            {config.menus?.map((menu, menuIndex) => (
                                <div key={menuIndex} className="border border-gray-200 rounded-xl overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <button onClick={() => toggleMenu(menuIndex)} className="text-gray-500 hover:text-gray-700">
                                                {openMenus.includes(menuIndex) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                            </button>
                                            <input
                                                type="text"
                                                value={menu.title}
                                                onChange={(e) => updateMenuTitle(menuIndex, e.target.value)}
                                                className="bg-transparent border-none focus:ring-0 font-medium text-gray-900 w-full"
                                                placeholder="Judul Menu"
                                            />
                                        </div>
                                        <button onClick={() => removeMenu(menuIndex)} className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {openMenus.includes(menuIndex) && (
                                        <div className="p-4 bg-white space-y-3">
                                            {menu.links.map((link, linkIndex) => (
                                                <div key={linkIndex} className="flex items-start gap-2">
                                                    <div className="grid grid-cols-2 gap-2 flex-1">
                                                        <input
                                                            type="text"
                                                            value={link.label}
                                                            onChange={(e) => updateLink(menuIndex, linkIndex, 'label', e.target.value)}
                                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                            placeholder="Label Link"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={link.url}
                                                            onChange={(e) => updateLink(menuIndex, linkIndex, 'url', e.target.value)}
                                                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                            placeholder="/url/halaman"
                                                        />
                                                    </div>
                                                    <button onClick={() => removeLink(menuIndex, linkIndex)} className="text-gray-400 hover:text-red-500 p-1.5 mt-0.5">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button onClick={() => addLink(menuIndex)} className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors flex items-center justify-center gap-2">
                                                <Plus size={14} /> Tambah Link
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {config.menus?.length === 0 && (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    Belum ada menu footer. Klik "Tambah Menu" untuk membuat.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Live Preview */}
                <div className="md:sticky md:top-8 h-fit">
                    <div className="bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-800">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live Preview
                        </h3>

                        <div className="bg-white rounded-xl p-6 space-y-6">
                            {/* Visual Representation of Footer */}
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-emerald-600 font-bold text-xl mb-2">STORE</h4>
                                    <p className="text-sm text-gray-600 leading-relaxed">{config.description || "Deskripsi akan muncul disini..."}</p>
                                    <div className="flex gap-3 mt-3">
                                        {config.socials.map((social, idx) => {
                                            const iconProp = getIconProp(social.icon);
                                            return (
                                                <div key={idx} className={`p-2 rounded-full bg-gray-100 text-gray-600`}>
                                                    <FontAwesomeIcon icon={iconProp} className="text-base" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {config.menus.map((menu, idx) => (
                                    <div key={idx} className="py-4 border-b md:border-none border-gray-100">
                                        <h5 className="font-bold text-gray-900 mb-3">{menu.title}</h5>
                                        <ul className="space-y-2 text-sm text-gray-600">
                                            {menu.links.map((link, lIdx) => (
                                                <li key={lIdx} className="hover:text-emerald-600">{link.label}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>

                            {/* Right - Contact */}
                            <div>
                                <div className="py-4">
                                    <h5 className="font-bold text-gray-900 mb-3">Kontak</h5>
                                    <ul className="space-y-2 text-sm text-gray-600">
                                        {config.contact.map((item, idx) => (
                                            <li key={idx} className="flex items-center gap-2">
                                                <SafeIcon icon={item.icon} className="text-emerald-600 text-sm" />
                                                <span className="truncate">{item.value}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-4 text-center">Preview tampilan footer mungkin sedikit berbeda tergantung ukuran layar.</p>
                    </div>
                </div>
            </div>
        </div >
    );
}
