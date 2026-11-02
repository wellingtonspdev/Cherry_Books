import React from "react";
import { View } from "react-native";
import {
  Body,
  Button,
  CategoryChip,
  Sheet,
  ThemeSwatch,
  styles,
} from "./components";
import { themes, colors } from "./tokens";

export function ReaderTypographySheet({
  visible,
  onClose,
  preferences,
  onChange,
  reduceMotion,
}) {
  const dark = preferences.theme === "Noturno",
    ink = dark ? "#F8F1EB" : colors.ink;
  const label = {
    color: ink,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 12,
    marginBottom: 8,
  };
  return (
    <Sheet
      visible={visible}
      title="Aa Aparência de leitura"
      compact
      dark={dark}
      reduceMotion={reduceMotion}
      onClose={onClose}
    >
      <Body style={[label, { marginTop: 0 }]}>Fonte</Body>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {["Playfair", "Lora", "Inter"].map((font) => (
          <CategoryChip
            key={font}
            dark={dark}
            segmented
            label={font}
            selected={preferences.fontFamily === font}
            onPress={() => onChange({ fontFamily: font })}
            style={{ flex: 1, paddingHorizontal: 6 }}
          />
        ))}
      </View>
      <Body style={label}>Tamanho do texto · {preferences.fontSize}</Body>
      <View style={[styles.row, { gap: 12 }]}>
        <Button
          secondary
          title="A−"
          accessibilityLabel="Diminuir fonte"
          disabled={preferences.fontSize <= 16}
          onPress={() => onChange({ fontSize: preferences.fontSize - 1 })}
          style={{ minWidth: 48 }}
        />
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 16,
            max: 26,
            now: preferences.fontSize,
            text: `${preferences.fontSize} pontos`,
          }}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            backgroundColor: dark ? "#75616C" : colors.border,
          }}
        >
          <View
            style={{
              width: `${(preferences.fontSize - 16) * 10}%`,
              height: 4,
              borderRadius: 2,
              backgroundColor: dark ? "#F1BBCB" : colors.brand,
            }}
          />
        </View>
        <Button
          title="A+"
          accessibilityLabel="Aumentar fonte"
          disabled={preferences.fontSize >= 26}
          onPress={() => onChange({ fontSize: preferences.fontSize + 1 })}
          style={{ minWidth: 48 }}
        />
      </View>
      <Body style={label}>Entrelinha</Body>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[1.45, 1.6, 1.75].map((value) => (
          <CategoryChip
            key={value}
            dark={dark}
            segmented
            label={String(value).replace(".", ",")}
            selected={preferences.lineHeightRatio === value}
            onPress={() => onChange({ lineHeightRatio: value })}
            style={{ flex: 1, paddingHorizontal: 6 }}
          />
        ))}
      </View>
      <Body style={label}>Margens</Body>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[
          [16, "Compacta"],
          [20, "Padrão"],
          [32, "Ampla"],
        ].map(([value, label]) => (
          <CategoryChip
            key={value}
            dark={dark}
            segmented
            label={label}
            selected={preferences.margins === value}
            onPress={() => onChange({ margins: value })}
            style={{ flex: 1, paddingHorizontal: 6 }}
          />
        ))}
      </View>
      <Body style={label}>Tema</Body>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Object.entries(themes).map(([name, theme]) => (
          <ThemeSwatch
            key={name}
            name={name}
            theme={theme}
            dark={dark}
            selected={preferences.theme === name}
            onPress={() => onChange({ theme: name })}
          />
        ))}
      </View>
    </Sheet>
  );
}
