import leaflet from "leaflet";

function promiseCurrentGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    } else {
      reject(new Error("Geolocation is not supported by this browser."));
    }
  });
}

export function getDeviceGeolocation(): leaflet.latLng | null {
  promiseCurrentGeolocation()
    .then((position) => {
      const { latitude, longitude } = position.coords;
      console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
      return leaflet.latLng(latitude, longitude);
    })
    .catch((error) => {
      console.error("Error getting location:", error);
      return null;
    });
}
