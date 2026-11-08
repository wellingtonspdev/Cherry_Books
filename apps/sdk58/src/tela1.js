import React, { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, ScrollView, FlatList } from "react-native";
import { books, categories, getBook, searchBooks } from "./catalog";
import { useLibrary } from "./store";
import { MotionPress } from "./motion";
import { colors as c } from "./tokens";
import ImportBookModal from "./ImportBookModal";
import {
  Screen,
  Heading,
  Body,
  BrandLockup,
  BotanicalCorner,
  SearchBar,
  BookCard,
  BookCover,
  Button,
  CategoryChip,
  ProgressBar,
  EmptyState,
  styles,
  useGrid,
  IconButton,
  TextAction,
  SectionHeader,
  SearchResultCard,
} from "./components";
export default function Explorar({ navigation }) {
  const { state } = useLibrary(),
    [query, setQuery] = useState(""),
    [debounced, setDebounced] = useState(""),
    [category, setCategory] = useState("Todos"),
    [searching, setSearching] = useState(false),
    [modalVisible, setModalVisible] = useState(false);
  const input = useRef(),
    list = useRef(),
    { columns, cardWidth } = useGrid();
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(timer);
  }, [query]);
  const isFiltering = searching || query || category !== "Todos";
  useEffect(() => {
    if (searching) {
      const frame = requestAnimationFrame(() => input.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [searching]);
  const results = searchBooks(debounced, category),
    last = Object.values(state.progressByBook)
      .filter((p) => !p.completed)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0],
    current = getBook(last?.bookId);
  const open = (book) => navigation.navigate("Detalhes", { bookId: book.id });
  const filters = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
    >
      {categories.map((label) => (
        <CategoryChip
          key={label}
          label={label}
          selected={category === label}
          onPress={() => setCategory(label)}
        />
      ))}
    </ScrollView>
  );
  const header = (
    <View>
      {searching ? (
        <View style={[styles.row, { marginBottom: 20 }]}>
          <IconButton
            name="chevron-back"
            label="Voltar"
            onPress={() => {
              setSearching(false);
              setQuery("");
              input.current?.blur();
            }}
          />
          <Heading style={{ fontSize: 25, flex: 1 }}>Pesquisar livros</Heading>
        </View>
      ) : (
        <>
          <View style={{ marginBottom: 25 }}>
            <BrandLockup />
            <BotanicalCorner />
          </View>
          <Heading style={{ marginBottom: 20 }}>
            Explore, leia,{"\n"}aprenda e evolua.
          </Heading>
        </>
      )}
      <SearchBar
        inputRef={input}
        value={query}
        onChange={setQuery}
        onFocus={() => setSearching(true)}
      />
      {isFiltering ? (
        <>
          <Heading style={styles.section}>
            {debounced ? `Resultados para “${debounced}”` : "Explore por tema"}
          </Heading>
          <Body style={[styles.muted, { marginVertical: 12 }]}>
            {results.length}{" "}
            {results.length === 1 ? "livro encontrado" : "livros encontrados"}
          </Body>
        </>
      ) : (
        <>
          {current ? (
            <MotionPress
              accessibilityRole="button"
              accessibilityLabel="Continuar"
              onPress={() =>
                navigation.navigate("Leitor", { bookId: current.id })
              }
              style={[
                styles.row,
                {
                  backgroundColor: c.blush,
                  borderRadius: 16,
                  padding: 14,
                  marginTop: 16,
                  gap: 12,
                },
              ]}
            >
              <BookCover book={current} width={62} />
              <View style={{ flex: 1, gap: 4 }}>
                <Body style={styles.muted}>Continue sua leitura</Body>
                <Body
                  style={{ fontSize: 16, lineHeight: 23, fontWeight: "600" }}
                >
                  {current.title}
                </Body>
                <Body style={styles.muted}>
                  Capítulo{" "}
                  {current.chapters.findIndex(
                    (ch) => ch.id === last.chapterId,
                  ) + 1}{" "}
                  · {last.percent}%
                </Body>
                <ProgressBar value={last.percent} />
              </View>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: c.brand,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="play" size={20} color="#FFFFFF" />
              </View>
            </MotionPress>
          ) : (
            <View
              style={[
                styles.row,
                {
                  backgroundColor: c.blush,
                  borderRadius: 16,
                  padding: 14,
                  marginTop: 16,
                  gap: 12,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Heading style={{ fontSize: 20, lineHeight: 28 }}>
                  Sua próxima leitura começa aqui
                </Heading>
                <TextAction
                  title="Explorar catálogo"
                  onPress={() => {
                    setSearching(true);
                    input.current?.focus();
                  }}
                  style={{ paddingHorizontal: 0 }}
                />
              </View>
            </View>
          )}
          <SectionHeader
            title="Em destaque"
            action="Ver todos"
            onPress={() => setSearching(true)}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 16 }}
          >
            {[books[0], books[1], books[5], books[2]].map((book) => (
              <BookCard
                key={book.id}
                book={book}
                width={104}
                compact
                onPress={() => open(book)}
              />
            ))}
          </ScrollView>
          <Heading style={styles.section}>Por tema</Heading>
          {filters}
          <Heading style={styles.section}>Para descobrir</Heading>
        </>
      )}
    </View>
  );
  return (
    <Screen scroll={false}>
      <FlatList
        ref={list}
        data={isFiltering?results.map(book=>[book]):Array.from({length:Math.ceil(results.length/columns)},(_,index)=>results.slice(index*columns,(index+1)*columns))}
        keyExtractor={(row) => row[0].id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: 140 }]}
        ListHeaderComponent={header}
        ListFooterComponent={
          isFiltering ? (
            <View>
              <Heading style={styles.section}>Explore por tema</Heading>
              {filters}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="Nenhum livro encontrado"
            description="Tente outro título, autor ou tema."
            action="Limpar filtros"
            onPress={() => {
              setQuery("");
              setCategory("Todos");
            }}
          />
        }
        renderItem={({item})=>isFiltering?<SearchResultCard book={item[0]} onPress={()=>open(item[0])}/>:<View style={[styles.row,{alignItems:'flex-start',gap:16,marginBottom:20}]}>{item.map(book=><BookCard key={book.id} book={book} width={cardWidth} onPress={()=>open(book)}/>)}</View>}
      />
    </Screen>
  );
}
