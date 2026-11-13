// Cookie/consent banner, settings dialog and inline "load" buttons for external content.
export default {
  banner: {
    title: 'Your privacy, your choice',
    text: 'ExploreMe only stores what it needs to work in your browser. With your consent we also load external content (such as Google sign-in and photos from Wikipedia) and, if enabled, anonymous statistics.',
    more: 'More about cookies',
    acceptAll: 'Accept all',
    rejectAll: 'Necessary only',
    settings: 'Settings',
  },
  dialog: {
    title: 'Cookie settings',
    intro: 'Choose what ExploreMe may use. You can change this at any time in Settings → Privacy or via the "Cookie settings" link at the bottom.',
    alwaysOn: 'Always on',
    save: 'Save choice',
    acceptAll: 'Accept all',
    rejectAll: 'Necessary only',
    decidedOn: 'Your choice of {date}.',
    cookies: 'Overview of cookies and local storage',
    categories: {
      necessary: {
        title: 'Necessary',
        text: 'Sign-in, language, theme, trips saved for offline use, map tiles (OpenStreetMap) and this choice itself. The app does not work without this storage.',
      },
      functional: {
        title: 'Functional',
        text: 'Third-party content: the "Sign in with Google/Apple" button (loads their script), photos in place info (Wikipedia/Wikimedia) and event images (Ticketmaster). Those services then see your IP address and may set their own cookies.',
      },
      analytics: {
        title: 'Statistics',
        text: 'Anonymous visitor statistics without cookies or profiles, to see which pages are used.',
        provider: 'Via {provider}.',
        unavailable: 'Statistics are switched off on this installation.',
      },
    },
    saved: 'Your choice has been saved.',
  },
  gate: {
    externalHint: 'External content from {source}. Loading it means consenting to functional content.',
    loadImage: 'Load image',
    loadImages: 'Load images',
    google: 'Continue with Google',
    loginHint: 'Signing in with Google or Apple loads a script from that service. By clicking you consent to functional content.',
  },
  settings: {
    title: 'Privacy & cookies',
    text: 'Manage which external content and statistics ExploreMe may use on this device.',
    manage: 'Cookie settings',
    status: 'Functional: {functional} · Statistics: {analytics}',
    on: 'on',
    off: 'off',
    undecided: 'No choice made yet: necessary storage only.',
    cookies: 'Cookie policy',
    privacy: 'Privacy policy',
    rights: 'Your privacy rights',
  },
}
