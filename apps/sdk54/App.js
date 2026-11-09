import React, { useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import Explorar from "./src/tela1";
import Biblioteca from "./src/tela2";
import Reader from "./src/tela3";
import Detalhes from "./src/tela4";
import { LibraryProvider, useLibrary } from "./src/store";
import { TabBar, Button, Body, BrandLockup, styles } from "./src/components";
import { colors as c } from "./src/tokens";
const Stack = createNativeStackNavigator(),
  Tabs = createBottomTabNavigator();
function MainTabs() {
  return (
    <Tabs.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.canvas },
      }}
    >
      <Tabs.Screen name="Explorar" component={Explorar} />
      <Tabs.Screen name="Biblioteca" component={Biblioteca} />
    </Tabs.Navigator>
  );
}
function Application() {
  const [fontNoticeDismissed, setFontNoticeDismissed] = useState(false);
  const { ready, error, notice, retry, dismissNotice, reduceMotion } =
    useLibrary();
  const [loaded, fontError] = useFonts({
    Playfair: require("./assets/fonts/Playfair.ttf"),
    Lora: require("./assets/fonts/Lora.ttf"),
    Inter: require("./assets/fonts/Inter.ttf"),
    ionicons: require("./assets/fonts/Ionicons.ttf"),
    Ionicons: require("./assets/fonts/Ionicons.ttf"),
  });
  if (!ready || (!loaded && !fontError))
    return (
      <View
        style={[
          styles.screen,
          { alignItems: "center", justifyContent: "center", padding: 24 },
        ]}
      >
        {error ? (
          <>
            <Text>{error}</Text>
            <Button title="Tentar novamente" onPress={retry} />
          </>
        ) : (
          <>
            <BrandLockup />
            <ActivityIndicator
              style={{ marginTop: 24 }}
              color={c.brand}
              accessibilityLabel="Carregando biblioteca"
            />
            <Text style={{ marginTop: 16, color: c.ink }}>
              Preparando sua biblioteca…
            </Text>
          </>
        )}
      </View>
    );
  return (
    <View style={{ flex: 1 }}>
      {(!!error || !!notice || (!!fontError && !fontNoticeDismissed)) && (
        <View style={{ padding: 12, backgroundColor: c.blush }}>
          <Body accessibilityRole="alert">
            {error ||
              notice ||
              (fontError
                ? "Não foi possível carregar as fontes. Usando fonte do dispositivo."
                : "")}
          </Body>
          <Button
            secondary
            title={error ? "Tentar salvar novamente" : "Fechar aviso"}
            onPress={
              error
                ? retry
                : () => {
                    dismissNotice();
                    setFontNoticeDismissed(true);
                  }
            }
          />
        </View>
      )}
      <NavigationContainer
        theme={{
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            background: c.canvas,
            primary: c.brand,
            text: c.ink,
          },
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: reduceMotion ? "none" : "fade",
            animationDuration: 220,
            contentStyle: { backgroundColor: c.canvas },
          }}
        >
          <Stack.Screen name="Principal" component={MainTabs} />
          <Stack.Screen name="Detalhes" component={Detalhes} />
          <Stack.Screen name="Leitor" component={Reader} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <LibraryProvider>
        <Application />
      </LibraryProvider>
    </SafeAreaProvider>
  );
}
