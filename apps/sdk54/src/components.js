import React, { memo, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  TextInput,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Animated,
  Easing,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MotionPress, MotionScreen } from "./motion";
import { useLibrary } from "./store";
import { AppGlassSurface } from "./glass";
export { AppGlassSurface } from "./glass";
import { colors as c, fonts } from "./tokens";
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.canvas },
  content: {
    padding: 20,
    paddingBottom: 48,
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
  },
  text: { fontFamily: fonts.ui, color: c.ink, fontSize: 15, lineHeight: 23 },
  title: {
    fontFamily: fonts.display,
    fontWeight: "600",
    color: c.ink,
    fontSize: 28,
    lineHeight: 37,
  },
  section: {
    fontFamily: fonts.display,
    fontWeight: "600",
    color: c.ink,
    fontSize: 21,
    marginTop: 24,
    marginBottom: 14,
  },
  muted: { fontFamily: fonts.ui, color: c.muted, fontSize: 13, lineHeight: 21 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: c.brand,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: c.brand,
  },
  buttonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  chip: {
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    justifyContent: "center",
  },
  glass: {
    backgroundColor: "#FFFEFC",
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 28,
  },
  line: { height: 1, backgroundColor: c.border, marginVertical: 24 },
  input: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: c.ink,
    minHeight: 48,
    padding: 14,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    backgroundColor: c.surface,
  },
  cover: { aspectRatio: 2 / 3, borderRadius: 6, backgroundColor: c.blush },
  empty: { paddingVertical: 50, alignItems: "center", gap: 20 },
  icon: {
    minHeight: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "90%",
    alignSelf: "center",
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#21171D55",
  },
  grid: { flex: 1, marginBottom: 20 },
  tabs: {
    flexDirection: "row",
    padding: 8,
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    padding: 9,
    alignItems: "center",
    gap: 4,
    borderRadius: 24,
    minHeight: 64,
  },
});
export function Body({ children, style, ...props }) {
  return (
    <Text {...props} style={[styles.text, style]}>
      {children}
    </Text>
  );
}
export function Heading({ children, style, ...props }) {
  return (
    <Text accessibilityRole="header" {...props} style={[styles.title, style]}>
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  icon,
  style,
  ...props
}) {
  return (
    <MotionPress
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      {...props}
      style={({ pressed }) => [
        styles.button,
        secondary && { backgroundColor: c.surface, borderColor: c.border },
        pressed && { opacity: 0.75 },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={20}
          color={secondary ? c.brand : "#FFFFFF"}
        />
      )}
      <Text style={[styles.buttonText, secondary && { color: c.brand }]}>
        {title}
      </Text>
    </MotionPress>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  color = c.ink,
  selected = false,
  ...props
}) {
  return (
    <MotionPress
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      {...props}
      style={({ pressed }) => [
        styles.icon,
        pressed && { backgroundColor: c.blush },
      ]}
    >
      <Ionicons name={name} size={23} color={color} />
    </MotionPress>
  );
}
export function CategoryChip({
  label,
  selected,
  onPress,
  style,
  dark = false,
  segmented = false,
}) {
  return (
    <MotionPress
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: dark ? "#44363F" : segmented ? c.surface : c.blush,
          borderColor: dark ? "#75616C" : c.border,
        },
        selected && { backgroundColor: c.brand, borderColor: c.brand },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      <Body
        style={{
          color: selected ? "#FFFFFF" : dark ? "#F8F1EB" : c.brand,
          textAlign: "center",
          fontSize: 13,
        }}
      >
        {label}
      </Body>
    </MotionPress>
  );
}
export function BrandLockup({ compact = false, inverted = false }) {
  const { width } = useWindowDimensions();
  const logoWidth = compact ? 180 : width < 360 ? 194 : 218;
  return (
    <Image
      accessibilityLabel="Cherry Books. Leitura que floresce."
      source={
        inverted
          ? require("../assets/brand/logo-inverted.png")
          : require("../assets/brand/logo-horizontal.png")
      }
      resizeMode="contain"
      style={{ width: logoWidth, height: (logoWidth * 166) / 582 }}
    />
  );
}
export function BotanicalCorner({ compact = false }) {
  const { width } = useWindowDimensions();
  const small = compact || width < 360;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: "absolute",
        right: -8,
        top: compact ? -28 : -12,
        opacity: 0.64,
      }}
    >
      <Image
        source={
          small
            ? require("../assets/brand/sakura-branch-compact.png")
            : require("../assets/brand/sakura-branch-right.png")
        }
        resizeMode="contain"
        style={{ width: small ? 72 : 106, height: small ? 48 : 91 }}
      />
    </View>
  );
}
export function BookCover({ book, width = 110, style }) {
  if (book?.cover) {
    return (
      <Image
        accessibilityLabel={`Capa de ${book.title}`}
        source={typeof book.cover === "string" ? { uri: book.cover } : book.cover}
        resizeMode="cover"
        style={[styles.cover, { width, height: width * 1.5 }, style]}
      />
    );
  }
  const formatBadge = (book?.format || "LIVRO").toUpperCase();
  return (
    <View
      accessibilityLabel={`Capa tipográfica de ${book?.title || "Livro"}`}
      style={[
        styles.cover,
        {
          width,
          height: width * 1.5,
          backgroundColor: "#402E31",
          padding: 8,
          justifyContent: "space-between",
          borderWidth: 1,
          borderColor: "#8F3A50",
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontFamily: fonts.ui, fontSize: Math.max(8, width * 0.08), color: "#D19CA8", fontWeight: "700" }}>
          CHERRY
        </Text>
        <Text style={{ fontFamily: fonts.ui, fontSize: Math.max(7, width * 0.07), color: "#FFFFFF", backgroundColor: "#8F3A50", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, fontWeight: "600" }}>
          {formatBadge}
        </Text>
      </View>
      <View style={{ flex: 1, justifyContent: "center", paddingVertical: 4 }}>
        <Text
          numberOfLines={3}
          style={{
            fontFamily: fonts.display,
            fontSize: Math.max(10, width * 0.11),
            lineHeight: Math.max(13, width * 0.14),
            color: "#FFFBF7",
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          {book?.title || "Sem título"}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fonts.ui,
          fontSize: Math.max(8, width * 0.08),
          color: "#E5C8D0",
          textAlign: "center",
        }}
      >
        {book?.author || "Autor Desconhecido"}
      </Text>
    </View>
  );
}
export function ProgressBar({ value, color = c.brand }) {
  const { reduceMotion = true } = useLibrary() || {};
  const progress = useRef(new Animated.Value(value)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: value,
      duration: reduceMotion ? 0 : 180,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [value, reduceMotion, progress]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: value,
        text: `${value}% lido`,
      }}
      style={{
        height: 5,
        borderRadius: 4,
        backgroundColor: c.border,
        marginVertical: 8,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={{
          height: 5,
          width: progress.interpolate({
            inputRange: [0, 100],
            outputRange: ["0%", "100%"],
          }),
          backgroundColor: color,
          borderRadius: 4,
        }}
      />
    </View>
  );
}
export const BookCard = memo(function BookCard({
  book,
  onPress,
  width,
  progress,
  compact = false,
}) {
  return (
    <MotionPress
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${book.title}${progress ? `, ${progress.percent}% lido` : ""}`}
      onPress={onPress}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.78 : 1, gap: 5 }]}
    >
      <BookCover book={book} width={width} />
      {!compact && (
        <>
          <Body style={{ fontSize: 15, marginTop: 4 }}>{book.title}</Body>
          <Body style={styles.muted}>{book.author}</Body>
        </>
      )}
      {progress && (
        <>
          <Body style={styles.muted}>{progress.percent}% lido</Body>
          <ProgressBar value={progress.percent} />
        </>
      )}
    </MotionPress>
  );
});
export function SearchBar({ value, onChange, onFocus, inputRef }) {
  return (
    <View
      style={[
        styles.row,
        {
          borderWidth: 1,
          borderColor: value ? c.brand : c.border,
          borderRadius: 15,
          backgroundColor: c.surface,
          paddingLeft: 14,
          gap: 8,
        },
      ]}
    >
      <Ionicons name="search-outline" size={22} color={c.muted} />
      <TextInput
        ref={inputRef}
        accessibilityLabel="Buscar livros, temas ou autores"
        placeholder="Buscar livros, temas ou autores"
        placeholderTextColor={c.muted}
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        returnKeyType="search"
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 48,
          fontFamily: fonts.ui,
          fontSize: 14,
          color: c.ink,
          paddingVertical: 12,
        }}
      />
      {!!value && (
        <IconButton
          name="close-outline"
          label="Limpar busca"
          onPress={() => onChange("")}
        />
      )}
    </View>
  );
}
export function ReaderToolbar({
  children,
  style,
  dark = false,
  variant = "toolbar",
}) {
  return (
    <AppGlassSurface
      dark={dark}
      variant={variant}
      style={[{ padding: 4 }, style]}
    >
      {children}
    </AppGlassSurface>
  );
}
export function TabBar({ state, navigation }) {
  const { width } = useWindowDimensions();
  const inset = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: Math.max(inset.bottom, 8),
      }}
    >
      <AppGlassSurface
        variant="navigation"
        testID="catalog-navigation"
        style={[
          styles.tabs,
          {
            width: Math.min(width - 24, 650),
            maxWidth: 650,
            alignSelf: "center",
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const selected = state.index === index;
          return (
            <MotionPress
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={route.name}
              accessibilityState={{ selected }}
              style={[styles.tab, selected && { backgroundColor: c.blush }]}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!selected && !event.defaultPrevented)
                  navigation.navigate(route.name);
              }}
            >
              <Ionicons
                name={index === 0 ? "home-outline" : "book-outline"}
                color={selected ? c.brand : c.muted}
                size={22}
              />
              <Body
                style={{
                  color: selected ? c.brand : c.muted,
                  fontSize: 13,
                  fontWeight: selected ? "600" : "400",
                }}
              >
                {route.name}
              </Body>
            </MotionPress>
          );
        })}
      </AppGlassSurface>
    </View>
  );
}
export function Screen({ children, scroll = true, style, contentStyle }) {
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.screen, style]}
    >
      <MotionScreen>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, contentStyle]}
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </MotionScreen>
    </SafeAreaView>
  );
}
export function Sheet({
  visible,
  title,
  onClose,
  children,
  dark = false,
  reduceMotion: motionOverride,
  compact = false,
}) {
  const inset = useSafeAreaInsets(),
    { height } = useWindowDimensions(),
    library = useLibrary();
  const reduceMotion = motionOverride ?? library?.reduceMotion ?? true;
  const [mounted, setMounted] = useState(visible),
    value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) setMounted(true);
    const animation = Animated.timing(value, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, reduceMotion, value]);
  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.sheetOverlay, { backgroundColor: "transparent" }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "#21171D66", opacity: value },
          ]}
        />
        <Pressable
          accessible={false}
          focusable={false}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              maxHeight: height * (compact ? 0.76 : 0.86),
              padding: 20,
              paddingBottom: Math.max(20, inset.bottom),
              backgroundColor: dark ? "#392D35" : c.surface,
              borderColor: dark ? "#75616C" : c.border,
              borderBottomLeftRadius: compact ? 24 : 0,
              borderBottomRightRadius: compact ? 24 : 0,
              marginBottom: compact ? Math.max(8, inset.bottom) : 0,
              width: compact ? "96%" : "100%",
              transform: [
                {
                  translateY: value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              alignSelf: "center",
              marginBottom: 10,
              backgroundColor: dark ? "#75616C" : c.border,
            }}
          />
          <View
            style={[
              styles.row,
              { justifyContent: "space-between", marginBottom: 12 },
            ]}
          >
            <Heading
              style={{
                fontFamily: compact ? fonts.ui : fonts.display,
                fontWeight: "600",
                fontSize: compact ? 19 : 23,
                lineHeight: compact ? 26 : 32,
                color: dark ? "#F8F1EB" : c.ink,
                flex: 1,
              }}
            >
              {title}
            </Heading>
            <IconButton
              name="close-outline"
              label="Fechar painel"
              onPress={onClose}
              color={dark ? "#F8F1EB" : c.ink}
            />
          </View>
          <ScrollView
            style={{ flexGrow: 0, flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 4 }}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function EmptyState({
  title = "Sua estante ainda está vazia",
  description = "Salve os livros que despertarem sua curiosidade. Eles aparecerão aqui.",
  action = "Explorar livros",
  onPress,
}) {
  return (
    <View style={styles.empty}>
      <Image
        source={require("../assets/brand/library-empty.png")}
        resizeMode="contain"
        accessibilityElementsHidden
        style={{ width: 220, height: 132 }}
      />
      <Heading
        style={{
          fontSize: 24,
          lineHeight: 32,
          textAlign: "center",
          marginTop: 8,
        }}
      >
        {title}
      </Heading>
      <Body style={{ color: c.muted, textAlign: "center", maxWidth: 400 }}>
        {description}
      </Body>
      <Button
        title={action}
        onPress={onPress}
        style={{ marginTop: 20, minWidth: 220 }}
      />
    </View>
  );
}
export function useGrid() {
  const { width, fontScale } = useWindowDimensions();
  const available = Math.min(width, 1120) - 40;
  const columns =
    width < 350 || fontScale > 1.4 ? 1 : width > 900 ? 4 : width > 650 ? 3 : 2;
  return { columns, cardWidth: (available - (columns - 1) * 16) / columns };
}

export function TextAction({
  title,
  onPress,
  style,
  textStyle,
  color = c.brand,
  ...props
}) {
  return (
    <MotionPress
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      {...props}
      style={[
        { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
        style,
      ]}
    >
      <Body style={[{ color, fontSize: 14, fontWeight: "500" }, textStyle]}>
        {title}
      </Body>
    </MotionPress>
  );
}
export function SectionHeader({ title, action, onPress }) {
  return (
    <View
      style={[
        styles.row,
        { justifyContent: "space-between", marginTop: 24, marginBottom: 14 },
      ]}
    >
      <Heading style={{ fontSize: 21, lineHeight: 29, flex: 1 }}>
        {title}
      </Heading>
      {action && <TextAction title={action} onPress={onPress} />}
    </View>
  );
}
export function ColorSwatch({ name, color, selected, onPress }) {
  return (
    <MotionPress
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minWidth: 44,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: color,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? c.brand : c.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected && <Ionicons name="checkmark" size={17} color={c.ink} />}
      </View>
    </MotionPress>
  );
}
export function ThemeSwatch({ name, theme, selected, onPress, dark }) {
  return (
    <MotionPress
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 66,
        alignItems: "center",
        gap: 5,
        paddingVertical: 4,
      }}
    >
      <View
        style={{
          width: "90%",
          height: 32,
          borderRadius: 10,
          backgroundColor: theme.background,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? c.brand : "#9C8992",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected && <Ionicons name="checkmark" size={18} color={theme.ink} />}
      </View>
      <Body style={{ fontSize: 12, color: dark ? "#F8F1EB" : c.ink }}>
        {name}
      </Body>
    </MotionPress>
  );
}
export function SearchResultCard({ book, onPress }) {
  const { width, fontScale } = useWindowDimensions();
  return (
    <MotionPress
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${book.title}`}
      onPress={onPress}
      style={[
        styles.row,
        {
          alignItems: "flex-start",
          gap: 20,
          paddingVertical: 18,
          borderBottomWidth: 1,
          borderColor: c.border,
        },
      ]}
    >
      <BookCover
        book={book}
        width={width < 350 || fontScale > 1.4 ? 84 : 104}
      />
      <View style={{ flex: 1, gap: 12 }}>
        <Heading style={{ fontSize: 22, lineHeight: 29 }}>{book.title}</Heading>
        <Body style={styles.muted}>
          {book.category} · {book.chapters.length} capítulos
        </Body>
        <Body style={styles.muted}>{book.author}</Body>
        <Body style={{ fontSize: 14, color: c.brand }}>Abrir detalhes ›</Body>
      </View>
    </MotionPress>
  );
}
