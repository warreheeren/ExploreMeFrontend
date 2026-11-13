# Native app (Android/iOS met Capacitor)

De native app is dezelfde Vite-build als de webapp, verpakt met [Capacitor 8](https://capacitorjs.com/). Native extra's:
pushmeldingen via FCM/APNs, het deelmenu van het systeem (uit- én inkomend), de camera en live locatie op de achtergrond
tijdens een reis.

| Onderdeel | Plugin | Code |
| --- | --- | --- |
| Push (FCM/APNs) | `@capacitor/push-notifications` | `src/services/push.js`, `src/services/nativeApp.js` (tik → `data.link`) |
| Uitgaand delen | `@capacitor/share` | `src/services/share.js` (fallback Web Share API, dan link kopiëren) |
| Inkomend delen | `@capgo/capacitor-share-target` | `src/services/nativeApp.js` → `stashShare` → `/share?id=…` (zelfde `ShareView` als de web share target) |
| Camera | `@capacitor/camera` | `src/services/nativeCamera.js`, `capture()`/`record()` in `useImageUpload`/`useVideoUpload` |
| Achtergrondlocatie | `@capacitor-community/background-geolocation` | `src/services/liveTracking.js`, opt-in in `StoryCreateDialog`, stoppen via `LiveTrackingBanner` |
| Terugknop (Android) | `@capacitor/app` | `src/services/nativeApp.js` |

Alle Capacitor-imports zijn dynamisch en draaien alleen als `isNative` (`src/services/native.js`) waar is; de webbuild
laadt er bij het opstarten niets van. De PWA-service-worker wordt in de app niet geregistreerd (Capacitor serveert de
bestanden lokaal, push loopt via FCM).

## Vereisten

- Node 20+ en de npm-pakketten (`npm ci` in `exploreme-frontend/`).
- **Android**: Android Studio (Ladybug of nieuwer) met Android SDK 35+, JDK 21.
- **iOS**: macOS met Xcode 16+ en CocoaPods of Swift Package Manager. De `ios/`-map wordt alleen op macOS
  aangemaakt (`npx cap add ios`); ze staat daarom nog niet in de repo.
- Een gehoste API (HTTPS) en, voor gedeelde links, de gehoste webapp.

## Build

1. Kopieer `.env.native.example` naar `.env.native` en vul `VITE_NATIVE_API_URL` (de API) en `VITE_PUBLIC_WEB_URL`
   (de webapp) in. Zonder absolute API-URL laadt de app niets (in de console verschijnt een foutmelding).
2. Bouw en synchroniseer:
   ```bash
   npm run cap:sync      # vite build --mode native + cap sync (kopieert dist/ naar android/ en ios/)
   npm run cap:android   # idem + opent Android Studio
   npm run cap:ios       # idem + opent Xcode (macOS)
   ```
3. Bouw/sign de app in Android Studio of Xcode (of `cd android && ./gradlew assembleRelease`).

### Lokaal draaien op de emulator (tegen je dev-API)

Getest op de emulator `Pixel_10_Pro_XL` met de lokale API op `http://localhost:5051`:

```powershell
# 1. Emulator starten (of via Android Studio > Device Manager)
& "$env:ANDROID_HOME\emulator\emulator.exe" -avd Pixel_10_Pro_XL
# 2. Poort van de dev-API doorzetten: localhost in de emulator = localhost op je pc
& "$env:ANDROID_HOME\platform-tools\adb.exe" reverse tcp:5051 tcp:5051
# 3. Webcode voor native bouwen tegen de lokale API en naar android/ kopiëren
$env:VITE_NATIVE_API_URL = "http://localhost:5051"; $env:VITE_PUBLIC_WEB_URL = "http://localhost:5173"
npm run cap:sync
# 4. Debug-APK bouwen (JDK 21; JDK 17 is te oud, de JDK 25 van Android Studio te nieuw voor Gradle 8.14) en installeren
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
cd android; .\gradlew.bat assembleDebug
& "$env:ANDROID_HOME\platform-tools\adb.exe" install -r app\build\outputs\apk\debug\app-debug.apk
```

- Alleen **debug**-builds mogen http gebruiken, en dan alleen naar `localhost`/`10.0.2.2`
  (`android/app/src/debug/res/xml/network_security_config_debug.xml`). Release-builds blijven https-only.
- Een http-API-URL komt automatisch in de Content-Security-Policy (`vite.config.js`, alleen die ene origin).
- De dev-API laat in Development elke origin toe, dus CORS hoeft lokaal niet ingesteld te worden.
- Na een wijziging in de webcode: stap 3 + 4 opnieuw (of in Android Studio op Run).

`capacitor.config.json` bevat `appId` `app.exploreme`, `webDir` `dist`, `androidScheme: https` en
`android.useLegacyBridge: true` (nodig zodat de achtergrondlocatie na 5 minuten niet stilvalt).
De `android/`-map staat in git, zoals Capacitor aanraadt; `android/app/src/main/assets/public` wordt bij elke sync
opnieuw gevuld en is genegeerd.

## API-configuratie

- **CORS**: de WebView stuurt `Origin: https://localhost` (Android) of `capacitor://localhost` (iOS). Zet beide in
  `Cors:AllowedOrigins`, bijvoorbeeld via env:
  ```
  Cors__AllowedOrigins__0=https://localhost
  Cors__AllowedOrigins__1=capacitor://localhost
  ```
- **Native push (FCM)**: maak in de Firebase-console een project, voeg de Android-app (`app.exploreme`) en de iOS-app
  toe en maak een serviceaccount-sleutel (Project settings → Service accounts → Generate new private key).
  Configureer de API met één van:
  - `Push:Fcm:ServiceAccountJson` (de JSON-inhoud, bv. env `Push__Fcm__ServiceAccountJson`), of
  - `Push:Fcm:ServiceAccountPath` (pad naar het bestand, bv. in `/data`).

  `Push:Fcm:ProjectId` is optioneel (anders `project_id` uit de JSON). Zonder (geldige) configuratie staat native
  push uit: `GET /api/integrations/status` geeft `nativePush: false` en de app meldt dat push op de server uit staat.
  Endpoints: `POST /api/push/native` (`{ platform, token }`) en `DELETE /api/push/native` (`{ token }`).
  Meldingen gaan via dezelfde voorkeuren en achtergrondtaak als Web Push; tokens die FCM als `UNREGISTERED`/404
  meldt, worden opgeruimd. De account-export toont de toestellen (platform + datums, nooit het token).
- **Live locatie**: `POST /api/trips/{tripId}/live` (`{ latitude, longitude }`) verschuift je recentste niet-verlopen
  story met locatie bij die reis. Zonder zo'n story geeft de API 404 en stopt de app met volgen.

## Firebase en APNs in de app

- **Android**: download `google-services.json` uit Firebase en zet het in `android/app/` (het Gradle-script past de
  google-services-plugin alleen toe als dat bestand bestaat). Niet committen als de repo publiek is.
- **iOS**: activeer *Push Notifications* en *Background Modes → Remote notifications* en *Location updates* in Xcode.
  Upload een APNs-authenticatiesleutel (.p8) in Firebase (Project settings → Cloud Messaging). Voeg Firebase Messaging
  toe en geef het FCM-token door in plaats van het APNs-token (zie de
  [Capacitor-handleiding](https://capacitorjs.com/docs/guides/push-notifications-firebase)); de backend verstuurt
  alleen via FCM.

## Permissieteksten

iOS (`ios/App/App/Info.plist`):

| Sleutel | Tekst (en / nl) |
| --- | --- |
| `NSCameraUsageDescription` | "ExploreMe uses the camera to take photos and videos for your posts and stories." / "ExploreMe gebruikt de camera voor foto's en video's in je posts en stories." |
| `NSPhotoLibraryUsageDescription` | "ExploreMe needs access to your photos to add them to posts, stories and trip albums." / "ExploreMe heeft toegang tot je foto's nodig om ze aan posts, stories en reisalbums toe te voegen." |
| `NSPhotoLibraryAddUsageDescription` | "ExploreMe saves trip images you create to your photos." / "ExploreMe bewaart reisbeelden die je maakt in je foto's." |
| `NSLocationWhenInUseUsageDescription` | "ExploreMe uses your location for stories with a location and nearby places." / "ExploreMe gebruikt je locatie voor stories met locatie en plekken in de buurt." |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | "When you turn on live location for a trip, ExploreMe keeps your travel companions' map up to date, also in the background. It stops when your story or the trip ends." / "Als je live locatie aanzet voor een reis, houdt ExploreMe de kaart van je reisgenoten bij, ook op de achtergrond. Het stopt als je story of de reis afloopt." |

Plus `UIBackgroundModes`: `location`, `remote-notification`.

Android (`android/app/src/main/AndroidManifest.xml`, al ingesteld): `INTERNET`, `CAMERA`, `ACCESS_COARSE_LOCATION`,
`ACCESS_FINE_LOCATION`, `POST_NOTIFICATIONS`; de achtergrondlocatie-plugin voegt `FOREGROUND_SERVICE` en
`FOREGROUND_SERVICE_LOCATION` toe (foreground service met vaste melding, dus geen `ACCESS_BACKGROUND_LOCATION` nodig).
Intent-filters voor `SEND`/`SEND_MULTIPLE` van tekst, afbeeldingen, video's en pdf's maken "Delen naar ExploreMe"
mogelijk. De kanaalnaam van de vaste melding staat in `res/values/strings.xml`.

Inkomend delen op iOS vraagt een *Share Extension* met een App Group (`group.app.exploreme`, zie
`plugins.CapacitorShareTarget.appGroupId` in `capacitor.config.json` en de README van `@capgo/capacitor-share-target`).

## Store-checklist

- [ ] App-iconen en splash (`npx @capacitor/assets generate` met een bronlogo van 1024×1024).
- [ ] Versie (`versionCode`/`versionName` in `android/app/build.gradle`, *Version/Build* in Xcode) verhogen per release.
- [ ] Release-signing: upload-keystore (Play App Signing) en distributiecertificaat + provisioning profile (Apple).
- [ ] `google-services.json` / `GoogleService-Info.plist` en de APNs-sleutel in Firebase.
- [ ] API: `Cors:AllowedOrigins` met `https://localhost` en `capacitor://localhost`, `Push:Fcm:*` ingesteld.
- [ ] Privacyverklaring-URL (de privacypagina van de webapp) en account-verwijdering in de app
      (Instellingen → Account) vermelden in de store-listings.
- [ ] Play Console: *Data safety* (locatie, foto's, e-mail, gebruikersinhoud) en de verklaring voor
      locatie op de achtergrond / foreground service type `location` (met demovideo).
- [ ] App Store: *App Privacy*-labels, de permissieteksten hierboven, demo-account voor de review
      (bv. een seed-account op een testserver).
- [ ] Testen op een echt toestel: push (voorgrond, achtergrond, tik), delen naar de app, camera, live locatie met
      scherm uit (> 5 minuten), terugknop.

## Beperkingen

- **Google/Apple-inloggen is in de app verborgen**: de web-SDK's werken niet in de WebView (origin `https://localhost`)
  en de stores verwachten native sign-in. Wie alleen via Google/Apple een account heeft, logt in de app in na een
  wachtwoord in te stellen (wachtwoord vergeten) of gebruikt de webapp; native plugins kunnen dit later oplossen.
  Ook de herbevestiging met Google/Apple (e-mail wijzigen, account verwijderen) is daardoor in de app niet beschikbaar.
- Het auth-token staat in `localStorage` van de WebView (zoals op het web).
- Offline modus per reis gebruikt de service worker en werkt dus niet in de app.
- Een recap-afbeelding delen gebruikt de Web Share API met bestanden; die bestaat niet in de Android-WebView, dus
  valt de app terug op downloaden.
- Live locatie verschuift de positie van de story; de tijd op de kaart blijft het tijdstip van de story.
- `@capacitor-community/background-geolocation` vermeldt officieel Capacitor 7 (peer `>=3`); met Capacitor 8 nog niet
  op een toestel getest.
- Een share die binnenkomt terwijl de app nog opstart, kan verloren gaan als het event vóór de listener komt.
- Native builds zijn in deze repo niet automatisch gebouwd of getest (geen Android SDK/Xcode in CI).
