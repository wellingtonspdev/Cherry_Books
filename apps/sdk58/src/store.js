import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AccessibilityInfo, AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initialState, hydrate, createWriteQueue } from "./model";
import {
  registerCustomBooks,
  unregisterCustomBook,
  getCustomBooks,
  registerCategory,
  registerCategories,
  getCustomCategories,
  getAllCategories,
} from "./catalog";
import {
  loadPublicLibraryBooks,
  publishToPublicLibrary,
} from "./publicLibrary";
const Context = createContext(null);
export const STORAGE_KEY = "cherry-books:v1";
export const CUSTOM_BOOKS_STORAGE_KEY = "cherry-books:custom-books:v1";
export const CUSTOM_CATEGORIES_STORAGE_KEY = "cherry-books:custom-categories:v1";
export function LibraryProvider({ children }) {
  const [state, setState] = useState(initialState),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [reduceMotion, setReduceMotion] = useState(true),
    [customBooksList, setCustomBooksList] = useState([]);
  const current = useRef(state),
    write = useRef(
      createWriteQueue((value) =>
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value)),
      ),
    );
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await loadPublicLibraryBooks();
        const rawCustom = await AsyncStorage.getItem(CUSTOM_BOOKS_STORAGE_KEY);
        if (rawCustom) {
          try {
            const parsed = JSON.parse(rawCustom);
            if (Array.isArray(parsed)) {
              registerCustomBooks(parsed);
              if (active) setCustomBooksList(parsed);
            }
          } catch {}
        }
        const rawCats = await AsyncStorage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY);
        if (rawCats) {
          try {
            const parsedCats = JSON.parse(rawCats);
            if (Array.isArray(parsedCats)) {
              registerCategories(parsedCats);
            }
          } catch {}
        }
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (active) {
          const data = hydrate(raw);
          current.current = data.state;
          setState(data.state);
          if (data.recovered)
            setNotice(
              "Alguns dados locais foram recuperados. Confira sua biblioteca.",
            );
          setReady(true);
        }
      } catch {
        if (active) {
          setError("Não foi possível abrir os dados locais. Tente novamente.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => active && setReduceMotion(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  function persist(next) {
    return write
      .current(next)
      .then(() => setError(""))
      .catch(() =>
        setError(
          "Não foi possível salvar neste dispositivo. Suas alterações estão na sessão. Tente salvar novamente.",
        ),
      );
  }
  function update(transform) {
    const next = transform(current.current);
    current.current = next;
    setState(next);
    persist(next);
  }
  useEffect(() => {
    const sub = AppState.addEventListener("change", (status) => {
      if (status !== "active" && ready) persist(current.current);
    });
    return () => sub.remove();
  }, [ready]);
  const value = {
    state,
    ready,
    error,
    notice,
    reduceMotion,
    update,
    retry: () =>
      ready
        ? persist(current.current)
        : AsyncStorage.getItem(STORAGE_KEY)
            .then((raw) => {
              const data = hydrate(raw);
              current.current = data.state;
              setState(data.state);
              setError("");
              setReady(true);
            })
            .catch(() =>
              setError("Dados locais indisponíveis. Tente novamente."),
            ),
    dismissNotice: () => setNotice(""),
    toggleSaved: (id) =>
      update((s) => ({
        ...s,
        savedBookIds: s.savedBookIds.includes(id)
          ? s.savedBookIds.filter((x) => x !== id)
          : [...s.savedBookIds, id],
      })),
    setPreferences: (patch) =>
      update((s) => ({
        ...s,
        readerPreferences: { ...s.readerPreferences, ...patch },
      })),
    setProgress: (progress) =>
      progress &&
      update((s) => ({
        ...s,
        progressByBook: { ...s.progressByBook, [progress.bookId]: progress },
      })),
    customBooks: customBooksList,
    saveCustomCategory: async (categoryName) => {
      const reg = registerCategory(categoryName);
      if (reg) {
        try {
          await AsyncStorage.setItem(
            CUSTOM_CATEGORIES_STORAGE_KEY,
            JSON.stringify(getCustomCategories()),
          );
        } catch {}
      }
      return reg;
    },
    saveCustomBook: async (book, andPublish = false) => {
      registerCustomBooks(book);
      if (book.category) {
        registerCategory(book.category);
        try {
          await AsyncStorage.setItem(
            CUSTOM_CATEGORIES_STORAGE_KEY,
            JSON.stringify(getCustomCategories()),
          );
        } catch {}
      }
      if (andPublish) {
        await publishToPublicLibrary(book);
      }
      const allCustom = getCustomBooks();
      setCustomBooksList(allCustom);
      try {
        await AsyncStorage.setItem(
          CUSTOM_BOOKS_STORAGE_KEY,
          JSON.stringify(allCustom),
        );
      } catch {}
      update((s) => ({
        ...s,
        savedBookIds: s.savedBookIds.includes(book.id)
          ? s.savedBookIds
          : [...s.savedBookIds, book.id],
      }));
      return book;
    },
    deleteCustomBook: async (id) => {
      unregisterCustomBook(id);
      const allCustom = getCustomBooks();
      setCustomBooksList(allCustom);
      try {
        await AsyncStorage.setItem(
          CUSTOM_BOOKS_STORAGE_KEY,
          JSON.stringify(allCustom),
        );
      } catch {}
      update((s) => ({
        ...s,
        savedBookIds: s.savedBookIds.filter((x) => x !== id),
      }));
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useLibrary = () => useContext(Context);
