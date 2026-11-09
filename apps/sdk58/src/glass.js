import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { chooseMaterial } from "./material-policy";

let nativeGlass;
function getNativeGlass() {
  if (Platform.OS !== "ios" || Number.parseInt(Platform.Version, 10) < 26)
    return null;
  if (nativeGlass !== undefined) return nativeGlass;
  try {
    const module = require("expo-glass-effect");
    nativeGlass =
      module.isLiquidGlassAvailable?.() && module.isGlassEffectAPIAvailable?.()
        ? module.GlassView
        : null;
  } catch {
    nativeGlass = null;
  }
  return nativeGlass;
}
function useMaterialAccessibility() {
  const [state, setState] = useState({
    reduceTransparency: true,
    highContrast: false,
  });
  useEffect(() => {
    let active = true;
    const update = (patch) =>
      active && setState((previous) => ({ ...previous, ...patch }));
    const subscriptions = [];
    if (Platform.OS === "ios") {
      AccessibilityInfo.isReduceTransparencyEnabled()
        .then((value) => update({ reduceTransparency: value }))
        .catch(() => {});
      AccessibilityInfo.isDarkerSystemColorsEnabled?.()
        .then((value) => update({ highContrast: value }))
        .catch(() => {});
      subscriptions.push(
        AccessibilityInfo.addEventListener(
          "reduceTransparencyChanged",
          (value) => update({ reduceTransparency: value }),
        ),
      );
    } else if (Platform.OS === "web") {
      const transparency = globalThis.matchMedia?.(
          "(prefers-reduced-transparency: reduce)",
        ),
        contrast = globalThis.matchMedia?.("(prefers-contrast: more)");
      const sync = () =>
        update({
          reduceTransparency: transparency?.matches === true,
          highContrast: contrast?.matches === true,
        });
      sync();
      transparency?.addEventListener?.("change", sync);
      contrast?.addEventListener?.("change", sync);
      subscriptions.push({
        remove: () => {
          transparency?.removeEventListener?.("change", sync);
          contrast?.removeEventListener?.("change", sync);
        },
      });
    } else {
      update({ reduceTransparency: false });
      AccessibilityInfo.isHighTextContrastEnabled?.()
        .then((value) => update({ highContrast: value }))
        .catch(() => {});
    }
    return () => {
      active = false;
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);
  return state;
}
const radii = {
  navigation: 28,
  toolbar: 24,
  floating: 24,
  "header-control": 22,
};
export function AppGlassSurface({
  children,
  style,
  variant = "toolbar",
  dark = false,
  forceOpaque = false,
  testID,
}) {
  const accessibility = useMaterialAccessibility(),
    GlassView = getNativeGlass();
  const webBlur =
    Platform.OS === "web" &&
    globalThis.CSS?.supports?.("backdrop-filter", "blur(12px)");
  const material = chooseMaterial({
    platform: Platform.OS,
    iosVersion: Platform.Version,
    nativeGlass: !!GlassView,
    blur: Platform.OS === "ios" || webBlur,
    ...accessibility,
    reduceTransparency: forceOpaque || accessibility.reduceTransparency,
  });
  const radius = radii[variant] || 24;
  return (
    <View
      testID={testID}
      {...(Platform.OS === "web" ? { dataSet: { material, variant } } : {})}
      style={[
        {
          borderRadius: radius,
          borderWidth: 1,
          borderColor: dark ? "#75616C" : "#E9DEE0",
          backgroundColor:
            material === "opaque"
              ? dark
                ? "#392D35"
                : "#FFFEFC"
              : "transparent",
          shadowColor: "#402E31",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: material === "opaque" ? 1 : 0,
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          StyleSheet.absoluteFill,
          { overflow: "hidden", borderRadius: radius },
        ]}
      >
        {material === "native-glass" ? (
          <GlassView
            style={StyleSheet.absoluteFill}
            glassEffectStyle="regular"
            tintColor={dark ? "#392D3540" : "#FFFEFC40"}
            isInteractive={false}
          />
        ) : material === "blur" ? (
          <BlurView
            style={StyleSheet.absoluteFill}
            intensity={20}
            tint={dark ? "dark" : "light"}
          />
        ) : null}
        {material === "blur" && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: dark
                  ? "rgba(43,35,41,.88)"
                  : "rgba(255,254,252,.86)",
              },
            ]}
          />
        )}
      </View>
      {children}
    </View>
  );
}
