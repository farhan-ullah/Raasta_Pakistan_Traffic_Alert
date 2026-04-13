import { Platform } from "react-native";

/** Metro resolves .android / .ios; TypeScript needs this entry. */
const MapCanvas =
  Platform.OS === "android"
    ? require("./MapCanvas.android").default
    : require("./MapCanvas.ios").default;

export default MapCanvas;
