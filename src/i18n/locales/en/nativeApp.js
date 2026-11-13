// Native app (Capacitor): camera, live location in the background.
export default {
  camera: {
    takePhoto: 'Take photo',
    recordVideo: 'Record video',
    failed: 'The camera could not be opened.',
  },
  live: {
    keepUpdating: 'Keep updating in the background',
    keepUpdatingHint: 'While your story is visible and the trip is under way, the app updates your position (at most every 2 minutes), even in the background.',
    notificationTitle: 'ExploreMe is sharing your location',
    notificationText: 'Live location for {trip}. Open the app to stop.',
    banner: 'Your live location is being updated in the background.',
    stop: 'Stop',
    started: 'Live location is on.',
    stopped: 'Live location stopped.',
    failed: 'Live location could not start. Check the location permission.',
  },
}
