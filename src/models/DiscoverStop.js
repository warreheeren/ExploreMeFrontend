import { resolveMediaUrl } from '@/utils/media'

export class DiscoverStop {
  constructor(data = {}) {
    this.stopId = data.stopId || ''
    this.tripId = data.tripId || ''
    this.tripTitle = data.tripTitle || ''
    this.ownerUserName = data.ownerUserName || ''
    this.ownerDisplayName = data.ownerDisplayName || ''
    this.ownerProfileImgUrl = resolveMediaUrl(data.ownerProfileImgUrl) || ''
    this.country = data.country || ''
    this.tripStartDate = data.tripStartDate || ''
    this.tripEndDate = data.tripEndDate || ''
    this.name = data.name || ''
    this.address = data.address || ''
    this.latitude = typeof data.latitude === 'number' ? data.latitude : 0
    this.longitude = typeof data.longitude === 'number' ? data.longitude : 0
    this.type = data.type || ''
  }

  static fromApi(data) {
    return new DiscoverStop(data)
  }

  static fromApiList(list) {
    return (list || []).map(d => DiscoverStop.fromApi(d))
  }
}
