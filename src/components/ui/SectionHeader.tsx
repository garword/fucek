
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface SectionHeaderProps {
    title: string;
    href?: string;
    description?: string; // Optional subtitle
}

export default function SectionHeader({ title, href }: SectionHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-4 sm:mb-6 group">
            <div className="flex items-center gap-3 relative pl-1">
                {/* Visual Accent: The Vertical Green Pill */}
                <div className="w-1.5 h-6 sm:h-7 bg-green-500 rounded-full shadow-sm shadow-green-200" />

                {/* Typography: Bold, Uppercase, Dark */}
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 uppercase tracking-wide leading-none group-hover:text-green-900 transition-colors duration-300">
                    {title}
                </h2>
            </div>

            {/* Action Link */}
            {href && (
                <Link href={href} className="text-xs sm:text-sm font-medium text-green-600 hover:text-green-700 flex items-center gap-1 transition-all bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-full shadow-sm hover:shadow-green-100 border border-green-100 hover:border-green-200">
                    Lihat Semua
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            )}
        </div>
    )
}
