import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { MotionPresence } from "./motion";
import { ReaderTypographySheet } from "./reader-panels";
import { SafeAreaView } from "react-native-safe-area-context";
import { getBook } from "./catalog";
import {
  linesToAnchors,
  tokenAtLine,
  lineAtToken,
  webTextLines,
} from "./anchors";
import { useLibrary } from "./store";
import { tokenize, quoteHash, makeProgress } from "./model";
import { themes, highlightColors, colors as c } from "./tokens";
import {
  Heading,
  Body,
  Button,
  IconButton,
  CategoryChip,
  ProgressBar,
  Sheet,
  EmptyState,
  Screen,
  ReaderToolbar,
  ColorSwatch,
  TextAction,
  styles,
} from "./components";

export default function Reader({ route, navigation }) {
  const book = getBook(route.params?.bookId);
  if (
    !book ||
    (route.params?.chapterId &&
      !book.chapters.some((ch) => ch.id === route.params.chapterId)) ||
    (route.params?.blockId &&
      !book.chapters.some(
        (ch) =>
          ch.id === (route.params.chapterId || book.chapters[0].id) &&
          ch.blocks.some((b) => b.id === route.params.blockId),
      ))
  )
    return (
      <Screen>
        <EmptyState
          title="Leitura indisponível"
          description="Escolha um livro válido no catálogo."
          onPress={() => navigation.navigate("Principal")}
        />
      </Screen>
    );
  return (
    <ReaderContent
      key={book.id}
      book={book}
      route={route}
      navigation={navigation}
    />
  );
}
function ReaderContent({ book, route, navigation }) {
  const { state, setPreferences, setProgress, update, reduceMotion } =
      useLibrary(),
    preferences = state.readerPreferences,
    theme = themes[preferences.theme],
    dark = preferences.theme === "Noturno";
  const saved = state.progressByBook[book.id],
    requested = route.params?.chapterId;
  const initial =
    book.chapters.find((ch) => ch.id === (requested || saved?.chapterId)) ||
    book.chapters[0];
  const [chapterId, setChapterId] = useState(initial.id),
    [controls, setControls] = useState(true),
    [panel, setPanel] = useState(null),
    [selecting, setSelecting] = useState(false),
    [selection, setSelection] = useState(null),
    [color, setColor] = useState("Rosa"),
    [note, setNote] = useState(""),
    [editingId, setEditingId] = useState(null),
    [message, setMessage] = useState(""),
    [deletedHighlight, setDeletedHighlight] = useState(null),
    [refineSelection, setRefineSelection] = useState(false);
  const { width: windowWidth } = useWindowDimensions(),
    touchStart = useRef(null);
  const chapter = book.chapters.find((ch) => ch.id === chapterId),
    chapterIndex = book.chapters.indexOf(chapter),
    scroll = useRef(),
    positions = useRef({}),
    textRefs = useRef({}),
    lineMaps = useRef({}),
    scrollY = useRef(0),
    restoring = useRef(true),
    restoreTimer = useRef(),
    lastPersisted = useRef("");
  const anchor = useRef({
    bookId: book.id,
    chapterId: initial.id,
    blockId:
      route.params?.blockId ||
      (!requested && saved?.blockId) ||
      initial.blocks[0].id,
    tokenOffset: (!requested && saved?.tokenOffset) || 0,
  });
  const progress = state.progressByBook[book.id],
    marks = state.bookmarks.filter((m) => m.bookId === book.id),
    highlights = state.highlights.filter((h) => h.bookId === book.id);
  const activeBookmark = marks.some(
    (m) => m.chapterId === chapterId && m.blockId === anchor.current.blockId,
  );
  function persist(
    position = anchor.current,
    completed = state.progressByBook[book.id]?.completed === true,
  ) {
    const next = makeProgress(
      book.id,
      position.chapterId,
      position.blockId,
      position.tokenOffset,
      completed,
    );
    if (next) {
      lastPersisted.current = `${position.chapterId}:${position.blockId}:${position.tokenOffset}`;
      setProgress(next);
    }
  }
  function restore() {
    const blockY = positions.current[anchor.current.blockId];
    if (blockY === undefined) return;
    const y =
      anchor.current.blockId === chapter.blocks[0].id &&
      anchor.current.tokenOffset === 0
        ? 0
        : blockY +
          lineAtToken(
            lineMaps.current[anchor.current.blockId] || [],
            anchor.current.tokenOffset,
          );
    scroll.current?.scrollTo({ y: Math.max(0, y - 16), animated: false });
    clearTimeout(restoreTimer.current);
    restoreTimer.current = setTimeout(() => {
      restoring.current = false;
    }, 150);
  }
  useEffect(() => {
    persist();
    return () => clearTimeout(restoreTimer.current);
  }, []);
  useEffect(() => {
    restoring.current = true;
    restoreTimer.current = setTimeout(restore, 60);
    return () => clearTimeout(restoreTimer.current);
  }, [
    chapterId,
    preferences.fontSize,
    preferences.fontFamily,
    preferences.lineHeightRatio,
    preferences.margins,
  ]);
  useLayoutEffect(() => {
    restoring.current = true;
    const timer = setTimeout(restore, reduceMotion ? 0 : 190);
    return () => clearTimeout(timer);
  }, [controls, reduceMotion]);
  function goTo(chapterTarget, blockId, tokenOffset = 0) {
    persist();
    const next = book.chapters.find((ch) => ch.id === chapterTarget);
    if (!next) return;
    anchor.current = {
      bookId: book.id,
      chapterId: next.id,
      blockId: blockId || next.blocks[0].id,
      tokenOffset,
    };
    if (next.id !== chapterId) {
      positions.current = {};
      lineMaps.current = {};
    }
    restoring.current = true;
    setChapterId(next.id);
    setSelection(null);
    setSelecting(false);
    setPanel(null);
    persist(anchor.current);
    setTimeout(restore, 80);
  }
  function onScroll(event) {
    scrollY.current = event.nativeEvent.contentOffset.y;
    if (restoring.current) return;
    const found =
      chapter.blocks
        .filter(
          (block) =>
            (positions.current[block.id] ?? Infinity) <= scrollY.current + 40,
        )
        .pop() || chapter.blocks[0];
    const tokenOffset = tokenAtLine(
      lineMaps.current[found.id] || [],
      Math.max(0, scrollY.current + 16 - (positions.current[found.id] || 0)),
    );
    if (
      found.id !== anchor.current.blockId ||
      tokenOffset !== anchor.current.tokenOffset
    ) {
      anchor.current = {
        bookId: book.id,
        chapterId,
        blockId: found.id,
        tokenOffset,
      };
      persist();
    }
  }
  function textLayout(item, event) {
    lineMaps.current[item.id] = linesToAnchors(
      item.text,
      event.nativeEvent.lines,
    );
    if (restoring.current) restore();
  }
  function measureBlock(item) {
    if (Platform.OS === "web") {
      lineMaps.current[item.id] = webTextLines(
        textRefs.current[item.id],
        item.text,
      );
      if (restoring.current) restore();
    }
  }
  function beginSelection(block) {
    setSelecting(true);
    setRefineSelection(false);
    setSelection({
      blockId: block.id,
      startToken: 0,
      endToken: 0,
      awaitingStart: true,
    });
    setEditingId(null);
    setNote("");
    setControls(true);
  }
  function selectToken(blockId, index) {
    if (
      !selection ||
      selection.blockId !== blockId ||
      selection.awaitingStart
    ) {
      setSelection({ blockId, startToken: index, endToken: index });
    } else {
      setSelection({ ...selection, endToken: index });
    }
    anchor.current = {
      bookId: book.id,
      chapterId,
      blockId,
      tokenOffset: index,
    };
    persist();
  }
  const block = chapter.blocks.find((b) => b.id === selection?.blockId),
    start = selection ? Math.min(selection.startToken, selection.endToken) : 0,
    end = selection ? Math.max(selection.startToken, selection.endToken) : 0,
    quote = block
      ? tokenize(block.text)
          .slice(start, end + 1)
          .join("")
          .trimEnd()
      : "";
  function saveHighlight() {
    if (!selection || !block) return;
    const raw = tokenize(block.text)
      .slice(start, end + 1)
      .join("");
    const highlight = {
      id:
        editingId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      bookId: book.id,
      chapterId,
      blockId: block.id,
      startToken: start,
      endToken: end,
      color,
      note: note.trim().slice(0, 2000),
      quoteHash: quoteHash(raw),
      contentVersion: book.contentVersion,
    };
    update((s) => ({
      ...s,
      highlights: [
        ...s.highlights.filter((h) => h.id !== highlight.id),
        highlight,
      ],
    }));
    setSelection(null);
    setSelecting(false);
    setPanel(null);
    setEditingId(null);
    setMessage("Grifo salvo.");
  }
  function editHighlight(h) {
    goTo(h.chapterId, h.blockId, h.startToken);
    setSelection({
      blockId: h.blockId,
      startToken: h.startToken,
      endToken: h.endToken,
    });
    setSelecting(true);
    setEditingId(h.id);
    setColor(h.color);
    setNote(h.note);
    setPanel("note");
  }
  function removeHighlight(id) {
    setDeletedHighlight(state.highlights.find((h) => h.id === id) || null);
    update((s) => ({
      ...s,
      highlights: s.highlights.filter((h) => h.id !== id),
    }));
    setSelection(null);
    setSelecting(false);
    setPanel(null);
    setMessage("Grifo removido.");
  }
  function bookmark() {
    const position = { ...anchor.current };
    update((s) => ({
      ...s,
      bookmarks: activeBookmark
        ? s.bookmarks.filter(
            (m) =>
              !(
                m.bookId === book.id &&
                m.chapterId === position.chapterId &&
                m.blockId === position.blockId
              ),
          )
        : [...s.bookmarks, position],
    }));
    setMessage(activeBookmark ? "Marcador removido." : "Posição marcada.");
  }
  function appearance(patch) {
    const changed = Object.entries(patch).some(
      ([key, value]) => key !== "theme" && preferences[key] !== value,
    );
    if (changed) restoring.current = true;
    setPreferences(patch);
  }
  const readerText = {
    fontFamily: preferences.fontFamily,
    fontSize: preferences.fontSize,
    lineHeight: preferences.fontSize * preferences.lineHeightRatio,
    color: theme.ink,
  };
  const labelStyle = { color: theme.ink, marginTop: 18, marginBottom: 10 };
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top", "bottom", "left", "right"]}
      onTouchStart={(event) => {
        touchStart.current = {
          x: event.nativeEvent.pageX,
          y: event.nativeEvent.pageY,
          time: Date.now(),
        };
      }}
      onTouchEnd={(event) => {
        const touch = touchStart.current;
        if (!touch || selecting || panel) return;
        const x = event.nativeEvent.pageX,
          y = event.nativeEvent.pageY,
          left =
            (windowWidth - Math.min(windowWidth, 680)) / 2 +
            preferences.margins -
            4;
        const isMargin = x < left || x > windowWidth - left;
        if (
          isMargin &&
          Math.abs(x - touch.x) < 8 &&
          Math.abs(y - touch.y) < 8 &&
          Date.now() - touch.time < 300
        )
          setControls((previous) => !previous);
      }}
    >
      <MotionPresence visible={controls && !selecting} duration={160}>
        <ReaderToolbar
          dark={dark}
          style={{
            borderColor: dark ? "#68575D" : c.border,
            margin: 8,
            padding: 4,
          }}
        >
          <View
            style={[styles.row, { justifyContent: "space-between", gap: 0 }]}
          >
            <IconButton
              name="chevron-back"
              label="Voltar à biblioteca"
              color={theme.ink}
              onPress={() => {
                persist();
                navigation.goBack();
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir capítulos"
              onPress={() => setPanel("chapters")}
              style={{ minHeight: 48, justifyContent: "center", flex: 1 }}
            >
              <Body style={{ color: theme.ink, textAlign: "center" }}>
                Capítulo {chapterIndex + 1}{" "}
                <Ionicons name="chevron-down" size={14} color={theme.ink} />
              </Body>
            </Pressable>
            <TextAction
              title="Aa"
              textStyle={{ fontSize: 20, fontWeight: "600" }}
              color={theme.ink}
              onPress={() => setPanel("appearance")}
              style={{ minWidth: 44, alignItems: "center" }}
            />
            <IconButton
              name={activeBookmark ? "bookmark" : "bookmark-outline"}
              label={activeBookmark ? "Remover marcador" : "Marcar posição"}
              color={theme.ink}
              selected={activeBookmark}
              onPress={bookmark}
            />
          </View>
        </ReaderToolbar>
      </MotionPresence>
      <ScrollView
        ref={scroll}
        onScroll={onScroll}
        scrollEventThrottle={120}
        onScrollEndDrag={() => {
          if (!selecting && !panel && scrollY.current > 80) setControls(false);
        }}
        onContentSizeChange={() => {
          if (restoring.current) restore();
        }}
        contentContainerStyle={{
          paddingHorizontal: preferences.margins,
          paddingTop: 30,
          paddingBottom: 40,
          width: "100%",
          maxWidth: 680,
          alignSelf: "center",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            controls
              ? "Alternar controles pela margem"
              : "Mostrar controles de leitura"
          }
          onPress={() => {
            if (!selecting) setControls((previous) => !previous);
          }}
          style={{ minHeight: 44 }}
        />
        <Heading
          style={{
            color: theme.ink,
            fontSize: 30,
            lineHeight: 40,
            marginBottom: 30,
          }}
        >
          Capítulo {chapterIndex + 1} —{"\n"}
          {chapter.title}
        </Heading>
        {chapter.blocks.map((item) => (
          <View
            key={`${chapterId}-${item.id}`}
            onLayout={(event) => {
              positions.current[item.id] = event.nativeEvent.layout.y;
              measureBlock(item);
              if (restoring.current && item.id === anchor.current.blockId)
                restore();
            }}
            style={{ marginBottom: 20 }}
          >
            {item.type === "code" ? (
              <ScrollView
                horizontal
                style={{
                  backgroundColor: dark ? "#392D35" : "#F0E6E4",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <Text
                  selectable
                  style={{
                    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                    fontSize: Math.max(14, preferences.fontSize - 3),
                    lineHeight: 25,
                    color: theme.ink,
                    paddingBottom: 12,
                  }}
                >
                  {item.text}
                </Text>
              </ScrollView>
            ) : (
              <View>
                {selecting && selection?.blockId !== item.id ? (
                  <>
                    <Text
                      ref={(ref) => {
                        textRefs.current[item.id] = ref;
                      }}
                      onTextLayout={
                        Platform.OS === "web"
                          ? undefined
                          : (event) => textLayout(item, event)
                      }
                      onLayout={() => measureBlock(item)}
                      style={readerText}
                    >
                      {item.text}
                    </Text>
                    <Button
                      title="Selecionar neste parágrafo"
                      secondary
                      onPress={() => beginSelection(item)}
                    />
                  </>
                ) : selecting ||
                  highlights.some(
                    (h) => h.chapterId === chapterId && h.blockId === item.id,
                  ) ? (
                  <Text
                    ref={(ref) => {
                      textRefs.current[item.id] = ref;
                    }}
                    onTextLayout={
                      Platform.OS === "web"
                        ? undefined
                        : (event) => textLayout(item, event)
                    }
                    onLayout={() => measureBlock(item)}
                    style={readerText}
                  >
                    {tokenize(item.text).map((token, index) => {
                      const selected =
                        selection?.blockId === item.id &&
                        index >= start &&
                        index <= end;
                      const h = highlights.find(
                        (h) =>
                          h.chapterId === chapterId &&
                          h.blockId === item.id &&
                          index >= h.startToken &&
                          index <= h.endToken,
                      );
                      return (
                        <Text
                          key={index}
                          accessibilityRole={selecting ? "button" : undefined}
                          accessibilityLabel={
                            selecting
                              ? `Palavra ${index + 1}: ${token.trim()}`
                              : undefined
                          }
                          onPress={
                            selecting
                              ? () => selectToken(item.id, index)
                              : h
                                ? () => editHighlight(h)
                                : undefined
                          }
                          style={
                            selected
                              ? {
                                  backgroundColor: highlightColors[color],
                                  color: c.ink,
                                }
                              : h
                                ? {
                                    backgroundColor: highlightColors[h.color],
                                    color: c.ink,
                                  }
                                : undefined
                          }
                        >
                          {token}
                        </Text>
                      );
                    })}
                  </Text>
                ) : (
                  <Text
                    ref={(ref) => {
                      textRefs.current[item.id] = ref;
                    }}
                    onTextLayout={
                      Platform.OS === "web"
                        ? undefined
                        : (event) => textLayout(item, event)
                    }
                    onLayout={() => measureBlock(item)}
                    selectable
                    style={readerText}
                  >
                    {item.text}
                  </Text>
                )}
              </View>
            )}
          </View>
        ))}
        {controls && !selecting && (
          <Button
            secondary
            title={
              chapterIndex < book.chapters.length - 1
                ? "Próximo capítulo"
                : "Concluir livro"
            }
            onPress={() => {
              if (chapterIndex < book.chapters.length - 1)
                goTo(book.chapters[chapterIndex + 1].id);
              else {
                persist(
                  {
                    ...anchor.current,
                    blockId: chapter.blocks.at(-1).id,
                    tokenOffset: 0,
                  },
                  true,
                );
                setPanel("completed");
              }
            }}
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Alternar controles de leitura"
          onPress={() => {
            if (!selecting) setControls((previous) => !previous);
          }}
          style={{ minHeight: 44 }}
        />
      </ScrollView>
      <MotionPresence visible={controls && !selecting} duration={160}>
        <ReaderToolbar
          dark={dark}
          style={{
            marginHorizontal: 12,
            marginBottom: 4,
            paddingHorizontal: 12,
          }}
        >
          <ProgressBar value={progress?.percent || 0} />
          <Body style={{ color: theme.ink, fontSize: 12 }}>
            {progress?.percent || 0}% · Capítulo {chapterIndex + 1} de{" "}
            {book.chapters.length}
          </Body>
          <View
            style={[styles.row, { justifyContent: "space-between", gap: 0 }]}
          >
            <IconButton
              name="chevron-back"
              label="Anterior"
              disabled={chapterIndex === 0}
              color={
                chapterIndex === 0 ? (dark ? "#A3939B" : c.muted) : theme.ink
              }
              onPress={() =>
                chapterIndex > 0 && goTo(book.chapters[chapterIndex - 1].id)
              }
            />
            <IconButton
              name="pencil-outline"
              label="Grifar"
              color={theme.ink}
              onPress={() =>
                beginSelection(chapter.blocks.find((b) => b.type === "text"))
              }
            />
            <IconButton
              name="document-text-outline"
              label="Anotações"
              color={theme.ink}
              onPress={() => setPanel("notes")}
            />
            <IconButton
              name="bookmarks-outline"
              label="Marcadores"
              color={theme.ink}
              onPress={() => setPanel("bookmarks")}
            />
            <IconButton
              name="expand-outline"
              label="Ocultar controles, modo foco"
              color={theme.ink}
              onPress={() => setControls(false)}
            />
            <IconButton
              name="chevron-forward"
              label="Próximo capítulo"
              color={theme.ink}
              disabled={chapterIndex === book.chapters.length - 1}
              onPress={() =>
                chapterIndex < book.chapters.length - 1 &&
                goTo(book.chapters[chapterIndex + 1].id)
              }
            />
          </View>
        </ReaderToolbar>
      </MotionPresence>
      {deletedHighlight && controls && !selecting && (
        <Button
          secondary
          title="Desfazer remoção do grifo"
          onPress={() => {
            update((s) => ({
              ...s,
              highlights: [...s.highlights, deletedHighlight],
            }));
            setDeletedHighlight(null);
            setMessage("Grifo restaurado.");
          }}
        />
      )}
      {!!message && controls && !selecting && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${message} Fechar aviso`}
          onPress={() => setMessage("")}
          style={{ padding: 10, backgroundColor: theme.surface }}
        >
          <Body accessibilityLiveRegion="polite" style={{ color: theme.ink }}>
            {message} ×
          </Body>
        </Pressable>
      )}
      {selecting && selection && (
        <ScrollView
          style={{
            maxHeight: "45%",
            flexShrink: 1,
            flexGrow: 0,
            backgroundColor: theme.surface,
            borderTopWidth: 1,
            borderColor: dark ? "#75616C" : c.border,
          }}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          keyboardShouldPersistTaps="handled"
        >
          <Body
            style={{ color: theme.ink, fontSize: 12, lineHeight: 19 }}
            numberOfLines={2}
            accessibilityLabel={`Trecho selecionado: ${quote}`}
          >
            Toque na primeira e na última palavra. Trecho: {quote}
          </Body>
          <ReaderToolbar
            dark={dark}
            variant="floating"
            style={{ paddingHorizontal: 6 }}
          >
            <View
              style={[styles.wrap, { justifyContent: "space-between", gap: 0 }]}
            >
              {Object.entries(highlightColors).map(([name, value]) => (
                <ColorSwatch
                  key={name}
                  name={name}
                  color={value}
                  selected={color === name}
                  onPress={() => setColor(name)}
                />
              ))}
              <IconButton
                name="document-text-outline"
                label="Adicionar nota"
                color={theme.ink}
                onPress={() => setPanel("note")}
              />
              <IconButton
                name="checkmark"
                label="Salvar grifo"
                color={theme.ink}
                onPress={saveHighlight}
              />
              <IconButton
                name="close-outline"
                label="Cancelar"
                color={theme.ink}
                onPress={() => {
                  setSelecting(false);
                  setSelection(null);
                }}
              />
            </View>
          </ReaderToolbar>
          <TextAction
            title={refineSelection ? "Recolher seleção" : "Refinar seleção"}
            color={theme.ink}
            onPress={() => setRefineSelection(!refineSelection)}
          />
          {refineSelection && (
            <View style={styles.wrap}>
              <Button
                secondary
                title="Avançar início"
                onPress={() =>
                  setSelection({
                    ...selection,
                    startToken: Math.min(end, start + 1),
                    endToken: end,
                    awaitingStart: false,
                  })
                }
              />
              <Button
                secondary
                title="Recuar início"
                onPress={() =>
                  setSelection({
                    ...selection,
                    startToken: Math.max(0, start - 1),
                    endToken: end,
                    awaitingStart: false,
                  })
                }
              />
              <Button
                secondary
                title="Ampliar seleção"
                onPress={() =>
                  setSelection({
                    ...selection,
                    endToken: Math.min(
                      tokenize(block.text).length - 1,
                      end + 1,
                    ),
                    awaitingStart: false,
                  })
                }
              />
              <Button
                secondary
                title="Reduzir seleção"
                onPress={() =>
                  setSelection({
                    ...selection,
                    startToken: start,
                    endToken: Math.max(start, end - 1),
                    awaitingStart: false,
                  })
                }
              />
            </View>
          )}
        </ScrollView>
      )}
      <ReaderTypographySheet
        visible={panel === "appearance"}
        onClose={() => setPanel(null)}
        preferences={preferences}
        onChange={appearance}
        reduceMotion={reduceMotion}
      />
      <Sheet
        visible={panel === "chapters"}
        title="Capítulos"
        reduceMotion={reduceMotion}
        onClose={() => setPanel(null)}
      >
        {book.chapters.map((ch, i) => (
          <Button
            secondary={ch.id !== chapterId}
            key={ch.id}
            title={`${i + 1}. ${ch.title}`}
            style={{ marginBottom: 10 }}
            onPress={() => goTo(ch.id)}
          />
        ))}
      </Sheet>
      <Sheet
        visible={panel === "note"}
        title={editingId ? "Editar anotação" : "Adicionar anotação"}
        reduceMotion={reduceMotion}
        onClose={() => setPanel(null)}
      >
        <Body
          style={{
            backgroundColor: c.blush,
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          “{quote}”
        </Body>
        <TextInput
          accessibilityLabel="Sua anotação"
          placeholder="Escreva sua anotação…"
          multiline
          maxLength={2000}
          value={note}
          onChangeText={setNote}
          style={[
            styles.input,
            { minHeight: 100, textAlignVertical: "top", marginBottom: 16 },
          ]}
        />
        <Button title="Salvar nota" onPress={saveHighlight} />
        {editingId && (
          <Button
            secondary
            title="Remover grifo e nota"
            style={{ marginTop: 12 }}
            onPress={() => removeHighlight(editingId)}
          />
        )}
      </Sheet>
      <Sheet
        visible={panel === "notes"}
        title="Grifos e anotações"
        reduceMotion={reduceMotion}
        onClose={() => setPanel(null)}
      >
        {!highlights.length ? (
          <Body>Nenhum grifo ainda. Use Grifar para selecionar palavras.</Body>
        ) : (
          highlights.map((h) => {
            const ch = book.chapters.find((ch) => ch.id === h.chapterId),
              p = ch.blocks.find((b) => b.id === h.blockId);
            return (
              <View
                key={h.id}
                style={{
                  marginBottom: 20,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: highlightColors[h.color],
                }}
              >
                <Body>
                  {tokenize(p.text)
                    .slice(h.startToken, h.endToken + 1)
                    .join("")}
                </Body>
                {!!h.note && (
                  <Body style={{ marginVertical: 10 }}>{h.note}</Body>
                )}
                <View style={styles.wrap}>
                  <Button
                    secondary
                    title="Localizar trecho"
                    onPress={() => goTo(h.chapterId, h.blockId, h.startToken)}
                  />
                  <Button
                    secondary
                    title="Editar"
                    onPress={() => editHighlight(h)}
                  />
                  <Button
                    secondary
                    title="Remover"
                    onPress={() => removeHighlight(h.id)}
                  />
                </View>
              </View>
            );
          })
        )}
      </Sheet>
      <Sheet
        visible={panel === "bookmarks"}
        title="Marcadores"
        reduceMotion={reduceMotion}
        onClose={() => setPanel(null)}
      >
        {!marks.length ? (
          <Body>Nenhuma posição marcada.</Body>
        ) : (
          marks.map((m, i) => (
            <View
              key={`${m.chapterId}-${m.blockId}-${i}`}
              style={{ marginBottom: 12 }}
            >
              <Button
                secondary
                title={`${book.chapters.find((ch) => ch.id === m.chapterId).title} · ${m.blockId}`}
                onPress={() => goTo(m.chapterId, m.blockId, m.tokenOffset)}
              />
              <Button
                secondary
                title="Remover marcador"
                onPress={() =>
                  update((s) => ({
                    ...s,
                    bookmarks: s.bookmarks.filter((mark) => mark !== m),
                  }))
                }
              />
            </View>
          ))
        )}
      </Sheet>
      <Sheet
        visible={panel === "completed"}
        title="Leitura concluída"
        reduceMotion={reduceMotion}
        onClose={() => setPanel(null)}
      >
        <Body style={{ marginBottom: 20 }}>
          Você chegou ao fim de {book.title}. Sua leitura está na estante
          Concluídos.
        </Body>
        <Button
          title="Voltar à Biblioteca"
          onPress={() => {
            setPanel(null);
            navigation.popTo("Principal", { screen: "Biblioteca" });
          }}
        />
      </Sheet>
    </SafeAreaView>
  );
}
