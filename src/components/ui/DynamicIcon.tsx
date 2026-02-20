
"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

interface DynamicIconProps {
    icon: IconProp;
    className?: string;
}

export default function DynamicIcon({ icon, className }: DynamicIconProps) {
    return <FontAwesomeIcon icon={icon} className={className} />;
}
