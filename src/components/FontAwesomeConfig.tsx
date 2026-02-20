"use client";

import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
    faInstagram, faTwitter, faFacebook, faYoutube, faLinkedin, faGithub,
    faWhatsapp, faTelegram
} from '@fortawesome/free-brands-svg-icons';
import {
    faCircleQuestion, faShieldHalved, faGlobe, faMobileScreen,
    faPhone, faMapPin, faLock, faKey, faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { faMessage, faEnvelope, faEye, faEyeSlash } from '@fortawesome/free-regular-svg-icons';

config.autoAddCss = false;



library.add(
    faInstagram, faTwitter, faFacebook, faYoutube, faLinkedin, faGithub,
    faWhatsapp, faTelegram,
    faCircleQuestion, faShieldHalved, faGlobe, faMobileScreen,
    faPhone, faMapPin, faLock, faKey, faArrowLeft,
    faMessage,
    faEnvelope, faEye, faEyeSlash
);

export default function FontAwesomeConfig() {
    return null;
}
