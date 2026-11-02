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
const Context = createContext(null);
export const STORAGE_KEY = "cherry-books:v1";
export function LibraryProvider({ children }) {
  const [state, setState] = useState(initialState),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [reduceMotion, setReduceMotion] = useState(true);
  const current = useRef(state),
    write = useRef(
      createWriteQueue((value) =>
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value)),
      ),
    );
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
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
      })
      .catch(() => {
        if (active) {
          setError("Não foi possível abrir os dados locais. Tente novamente.");
        }
      });
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
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useLibrary = () => useContext(Context);
