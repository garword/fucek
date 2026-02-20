import HeroCarousel from './HeroCarousel';

export default function HeroSection({ banners, heroText }: { banners?: any[], heroText?: any }) {
    return (
        <HeroCarousel banners={banners} heroText={heroText} />
    );
}
