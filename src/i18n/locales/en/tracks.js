// GPX import (phase 6): TrackImportButton, TrackList and tracks on the trip map.
export default {
  title: 'Tracks',
  hint: 'Hike or bike ride from Strava, Komoot, Garmin … (GPX, max. 10 MB)',
  import: 'Import GPX',
  importing: 'Importing…',
  createJournal: 'Create journal entry',
  imported: '{n} track imported | {n} tracks imported',
  importedWithJournal: '{n} track imported, with journal entry | {n} tracks imported, with journal entries',
  badType: 'Choose a GPX file.',
  tooBig: 'A GPX file can be at most 10 MB.',
  empty: 'No tracks yet. Import a GPX file of your hike or bike ride.',
  kind: {
    track: 'Track',
    route: 'Route',
  },
  stats: {
    elevation: '↗ {n} m',
  },
  uploadedBy: 'by {name}',
  showOnMap: 'Show {name} on the map',
  rename: 'Rename {name}',
  renameLabel: 'Track name',
  delete: 'Delete {name}',
  deleteTitle: 'Delete track?',
  deleteMessage: '{name} will disappear from the map. Journal entries stay, without a mini map.',
  deleted: 'Track deleted',
  mapAria: 'Map of the track {name}',
}
