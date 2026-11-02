import React, { forwardRef, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Platform } from "react-native";
import { useLibrary } from "./store";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export const MotionPress = forwardRef(function MotionPress(
  { style, onPressIn, onPressOut, ...props },
  ref,
) {
  const { reduceMotion = true } = useLibrary() || {};
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  useEffect(() => () => scale.stopAnimation(), [scale]);
  useEffect(() => {
    if (reduceMotion) {
      scale.stopAnimation();
      scale.setValue(1);
    }
  }, [reduceMotion, scale]);
  const animate = (target) => {
    scale.stopAnimation();
    if (reduceMotion) scale.setValue(1);
    else
      Animated.timing(scale, {
        toValue: target,
        duration: target === 1 ? 130 : 110,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== "web",
      }).start();
  };
  return (
    <AnimatedPressable
      ref={ref}
      {...props}
      style={[
        typeof style === "function" ? style({ pressed }) : style,
        { transform: [{ scale }] },
      ]}
      onPressIn={(event) => {
        setPressed(true);
        animate(0.98);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        animate(1);
        onPressOut?.(event);
      }}
    />
  );
});

export function MotionPresence({
  visible = true,
  children,
  style,
  duration = 180,
}) {
  const { reduceMotion = true } = useLibrary() || {};
  const [mounted, setMounted] = useState(visible);
  const value = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    if (visible) setMounted(true);
    const animation = Animated.timing(value, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, reduceMotion, duration, value]);
  // Translate the material; never animate native GlassView opacity.
  return mounted ? (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        style,
        {
          transform: [
            {
              translateY: value.interpolate({
                inputRange: [0, 1],
                outputRange: [6, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  ) : null;
}

export function MotionScreen({ children, style }) {
  const { reduceMotion = true } = useLibrary() || {};
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (Platform.OS !== "web" || reduceMotion) {
      value.setValue(1);
      return;
    }
    const animation = Animated.timing(value, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, value]);
  return (
    <Animated.View
      style={[
        { flex: 1 },
        style,
        {
          transform: [
            {
              translateY: value.interpolate({
                inputRange: [0, 1],
                outputRange: [6, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
