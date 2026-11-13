// GPX-import (fase 6): TrackImportButton, TrackList en tracks op de reiskaart.
export default {
  title: 'Tracks',
  hint: 'Wandel- of fietstocht uit Strava, Komoot, Garmin … (GPX, max. 10 MB)',
  import: 'GPX importeren',
  importing: 'Bezig met importeren…',
  createJournal: 'Maak dagboekentry',
  imported: '{n} track geïmporteerd | {n} tracks geïmporteerd',
  importedWithJournal: '{n} track geïmporteerd, met dagboekentry | {n} tracks geïmporteerd, met dagboekentries',
  badType: 'Kies een GPX-bestand.',
  tooBig: 'Een GPX-bestand mag maximaal 10 MB groot zijn.',
  empty: 'Nog geen tracks. Importeer een GPX-bestand van je wandel- of fietstocht.',
  kind: {
    track: 'Track',
    route: 'Route',
  },
  stats: {
    elevation: '↗ {n} m',
  },
  uploadedBy: 'door {name}',
  showOnMap: 'Toon {name} op de kaart',
  rename: '{name} hernoemen',
  renameLabel: 'Naam van de track',
  delete: '{name} verwijderen',
  deleteTitle: 'Track verwijderen?',
  deleteMessage: '{name} verdwijnt van de kaart. Dagboekupdates blijven staan, zonder minikaart.',
  deleted: 'Track verwijderd',
  mapAria: 'Kaart van de track {name}',
}
