export function chooseMaterial({
  platform,
  iosVersion = 0,
  nativeGlass = false,
  blur = false,
  reduceTransparency = true,
  highContrast = false,
}) {
  if (reduceTransparency || highContrast) return "opaque";
  if (
    platform === "ios" &&
    Number.parseInt(iosVersion, 10) >= 26 &&
    nativeGlass
  )
    return "native-glass";
  if ((platform === "web" || platform === "ios") && blur) return "blur";
  return "opaque";
}
