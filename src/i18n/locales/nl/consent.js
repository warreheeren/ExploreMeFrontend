// Cookie-/toestemmingsbanner, instellingenvenster en inline "laden"-knoppen voor externe inhoud.
export default {
  banner: {
    title: 'Jouw privacy, jouw keuze',
    text: 'ExploreMe bewaart in je browser alleen wat nodig is om te werken. Met jouw toestemming laden we ook externe inhoud (zoals inloggen met Google en foto\'s van Wikipedia) en, als dat aan staat, anonieme statistieken.',
    more: 'Meer over cookies',
    acceptAll: 'Alles accepteren',
    rejectAll: 'Alleen noodzakelijk',
    settings: 'Instellingen',
  },
  dialog: {
    title: 'Cookie-instellingen',
    intro: 'Kies wat ExploreMe mag gebruiken. Je kunt dit altijd wijzigen via Instellingen → Privacy of de link "Cookie-instellingen" onderaan.',
    alwaysOn: 'Altijd aan',
    save: 'Keuze bewaren',
    acceptAll: 'Alles accepteren',
    rejectAll: 'Alleen noodzakelijk',
    decidedOn: 'Je keuze van {date}.',
    cookies: 'Overzicht van cookies en lokale opslag',
    categories: {
      necessary: {
        title: 'Noodzakelijk',
        text: 'Inloggen, taal, thema, offline opgeslagen reizen, kaarttegels (OpenStreetMap) en deze keuze zelf. Zonder deze opslag werkt de app niet.',
      },
      functional: {
        title: 'Functioneel',
        text: 'Externe inhoud van derden: de knop "Inloggen met Google/Apple" (laadt hun script), foto\'s bij plekinfo (Wikipedia/Wikimedia) en afbeeldingen bij evenementen (Ticketmaster). Die diensten zien dan je IP-adres en kunnen eigen cookies zetten.',
      },
      analytics: {
        title: 'Statistieken',
        text: 'Anonieme bezoekersstatistieken zonder cookies of profielen, om te zien welke pagina\'s gebruikt worden.',
        provider: 'Via {provider}.',
        unavailable: 'Op deze installatie staan statistieken uit.',
      },
    },
    saved: 'Je keuze is bewaard.',
  },
  gate: {
    externalHint: 'Externe inhoud van {source}. Laden betekent toestemming voor functionele inhoud.',
    loadImage: 'Afbeelding laden',
    loadImages: 'Afbeeldingen laden',
    google: 'Doorgaan met Google',
    loginHint: 'Inloggen met Google of Apple laadt een script van die dienst. Door erop te klikken geef je toestemming voor functionele inhoud.',
  },
  settings: {
    title: 'Privacy & cookies',
    text: 'Beheer welke externe inhoud en statistieken ExploreMe mag gebruiken op dit toestel.',
    manage: 'Cookie-instellingen',
    status: 'Functioneel: {functional} · Statistieken: {analytics}',
    on: 'aan',
    off: 'uit',
    undecided: 'Nog geen keuze gemaakt: alleen noodzakelijke opslag.',
    cookies: 'Cookiebeleid',
    privacy: 'Privacybeleid',
    rights: 'Je privacyrechten',
  },
}
