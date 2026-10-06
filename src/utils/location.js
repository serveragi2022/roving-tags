import * as Location from 'expo-location';

// Gets the phone location for the photo stamp.
// Returns null when there is no permission or no GPS signal (e.g. inside the mill).
export async function getCurrentLocation() {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return null;

    // Use the last known position first because it is instant
    const lastPosition = await Location.getLastKnownPositionAsync();
    if (lastPosition) return toGps(lastPosition);

    // Otherwise wait up to 5 seconds for a fresh position
    const waitFiveSeconds = new Promise((resolve) => setTimeout(() => resolve(null), 5000));
    const freshPosition = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      waitFiveSeconds,
    ]);
    return freshPosition ? toGps(freshPosition) : null;
  } catch (error) {
    return null;
  }
}

function toGps(position) {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}
