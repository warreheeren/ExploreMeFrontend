// Vervoerswijzen waarmee je bij een stop aankomt (zie TravelMode in TripStop.cs).
// Teksten komen uit i18n: travelModes.<Mode>.
import { t } from '@/i18n'

export const TRAVEL_MODES = {
  Car: { icon: 'car' },
  Train: { icon: 'train' },
  Bus: { icon: 'bus' },
  Plane: { icon: 'plane' },
  Ferry: { icon: 'ship' },
  Bike: { icon: 'bike' },
  Walk: { icon: 'walk' },
}

for (const mode of Object.keys(TRAVEL_MODES)) {
  Object.defineProperty(TRAVEL_MODES[mode], 'label', { get: () => t(`travelModes.${mode}`), enumerable: true })
}

export const TRAVEL_MODE_ORDER = Object.keys(TRAVEL_MODES)

export function travelModeMeta(mode) {
  return TRAVEL_MODES[mode] || TRAVEL_MODES.Car
}
