
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
    faInstagram, faYoutube, faFacebook, faTwitter, faTiktok,
    faShopify, faWhatsapp, faTelegram, faChrome
} from '@fortawesome/free-brands-svg-icons';
import { faStore, faGlobe } from '@fortawesome/free-solid-svg-icons';

export interface SmmGuideItem {
    platform: string;
    icon: IconProp;
    color: string;
    items: {
        type: string;
        desc: string;
        example: string;
    }[];
}

export const SMM_GUIDE_DATA: SmmGuideItem[] = [
    {
        platform: "Instagram",
        icon: faInstagram,
        color: "text-[#E4405F]",
        items: [
            {
                type: "Followers, Story, Live Video, Profile Visits",
                desc: "Username akun Instagram tanpa tanda @",
                example: "mustakinnur"
            },
            {
                type: "Likes, Views, Comments, Impressions, Saves",
                desc: "Link postingan akun Instagram",
                example: "https://www.instagram.com/p/BxilTdssedewBn_p/"
            },
            {
                type: "Instagram TV",
                desc: "Link postingan Instagram TV",
                example: "https://www.instagram.com/tv/CUOfgerkDLoBsqP/"
            },
            {
                type: "Instagram Reels",
                desc: "Link postingan Instagram Reels",
                example: "https://www.instagram.com/reel/CUrqMtmfdfdloDI/"
            }
        ]
    },
    {
        platform: "Youtube",
        icon: faYoutube,
        color: "text-[#FF0000]",
        items: [
            {
                type: "Likes, Views, Shares, Komentar",
                desc: "Link video youtube",
                example: "https://www.youtube.com/watch?v=NdgFndfdnFQqII"
            },
            {
                type: "Youtube Live Stream",
                desc: "Link video live youtube",
                example: "https://www.youtube.com/watch?v=0AFdfdM8thZU_g"
            },
            {
                type: "Subscribers",
                desc: "Link channel youtube",
                example: "https://www.youtube.com/channel/UCjPr9Tbddfdf2zs9TCEDn-eALw"
            }
        ]
    },
    {
        platform: "Facebook",
        icon: faFacebook,
        color: "text-[#1877F2]",
        items: [
            {
                type: "Page Likes, Page Followers",
                desc: "Link halaman atau fanspage facebook",
                example: "https://www.facebook.com/telkomsel/"
            },
            {
                type: "Post Likes, Post Video",
                desc: "Link postingan facebook",
                example: "https://www.facebook.com/admintakin/posts/2161457404010124"
            },
            {
                type: "Followers, Friends",
                desc: "Link profile facebook",
                example: "https://www.facebook.com/admintakin"
            },
            {
                type: "Group Members",
                desc: "Link group facebook",
                example: "https://www.facebook.com/groups/1675298779413438239/"
            }
        ]
    },
    {
        platform: "Twitter",
        icon: faTwitter,
        color: "text-[#1DA1F2]",
        items: [
            {
                type: "Followers",
                desc: "Username akun twitter tanpa tanda @",
                example: "TelkomCare"
            },
            {
                type: "Retweet, Favorite",
                desc: "Link tweet atau postingan twitter",
                example: "https://twitter.com/TelkomCare/status/1238691324498513920"
            }
        ]
    },
    {
        platform: "TikTok",
        icon: faTiktok,
        color: "text-black dark:text-white",
        items: [
            {
                type: "Followers",
                desc: "Link profile tiktok atau username tanpa tanda @",
                example: "https://tiktok.com/@username/ atau username"
            },
            {
                type: "Likes / Views",
                desc: "Link video tiktok",
                example: "https://vt.tiktok.com/xxxxx/"
            }
        ]
    },
    {
        platform: "Shopee",
        icon: faShopify, // FontAwesome free might not have Shopee specific, use Shopify or Store as fallback if needed. Shopee isn't in standard Brands? Checking... faShopify is Shopify.
        // Shopee icon usually not in FA Free. Using faStore as generic fallback or custom.
        // Actually, let's use faStore for now and label it Shopee. 
        color: "text-[#EE4D2D]",
        items: [
            {
                type: "Followers",
                desc: "Username akun shopee",
                example: "mustakin001"
            },
            {
                type: "Product Likes",
                desc: "Link produk shopee",
                example: "https://shopee.co.id/Stiker-Keyboard-Arab-Stiker-Keyboard-Arabic-i.8232793.668063715"
            }
        ]
    },
    {
        platform: "Tokopedia",
        icon: faStore, // Generic store icon
        color: "text-[#42B549]",
        items: [
            {
                type: "Followers",
                desc: "Username akun tokopedia atau link profile",
                example: "https://www.tokopedia.com/cleanandcleanshop"
            },
            {
                type: "Wishlist atau Favorite",
                desc: "Link produk tokopedia",
                example: "https://www.tokopedia.com/dbeofficial/dbe-dj80-foldable-dj-headphone..."
            }
        ]
    },
    {
        platform: "Website Traffic",
        icon: faGlobe,
        color: "text-blue-500",
        items: [
            {
                type: "Website Traffic",
                desc: "Link website",
                example: "https://medanpedia.co.id"
            }
        ]
    },
    {
        platform: "Telegram",
        icon: faTelegram,
        color: "text-[#0088cc]",
        items: [
            {
                type: "Channel Members/Group",
                desc: "Link Channnel/Group",
                example: "https://t.me/medanpediaSMM"
            },
            {
                type: "Post Last Views / Views / Reactions",
                desc: "Link Post",
                example: "https://t.me/medanpediaSMM/1195"
            },
            {
                type: "Story",
                desc: "Link Story",
                example: "https://t.me/medanpediaSMM/s/2"
            }
        ]
    },
    {
        platform: "Whatsapp",
        icon: faWhatsapp,
        color: "text-[#25D366]",
        items: [
            {
                type: "Channel Members/Group",
                desc: "Link Channnel/Group",
                example: "https://whatsapp.com/channel/XXXXXXXXXXXXXXXXX"
            }
        ]
    }
];
