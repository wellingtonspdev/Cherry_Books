import React from "react";
import { View, Image, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MotionPress } from "./motion";
import { colors as c } from "./tokens";
import { getBook } from "./catalog";
import { useLibrary } from "./store";
import {
  Screen,
  Heading,
  Body,
  BookCover,
  Button,
  IconButton,
  ProgressBar,
  EmptyState,
  styles,
} from "./components";
export default function Detalhes({ route, navigation }) {
  const { width, fontScale } = useWindowDimensions();
  const { state, toggleSaved } = useLibrary(),
    book = getBook(route.params?.bookId);
  if (!book)
    return (
      <Screen>
        <EmptyState
          title="Livro não encontrado"
          description="Volte ao catálogo e escolha outra leitura."
          onPress={() => navigation.navigate("Principal")}
        />
      </Screen>
    );
  const saved = state.savedBookIds.includes(book.id),
    progress = state.progressByBook[book.id];
  return (
    <Screen>
      <View
        style={[
          styles.row,
          { justifyContent: "space-between", marginBottom: 24 },
        ]}
      >
        <IconButton
          name="chevron-back"
          label="Voltar"
          onPress={() => navigation.goBack()}
        />
        <Body>Detalhes do livro</Body>
        <IconButton
          name={saved ? "heart" : "heart-outline"}
          label={saved ? "Remover dos favoritos" : "Favoritar livro"}
          selected={saved}
          onPress={() => toggleSaved(book.id)}
        />
      </View>
      <View
        style={[
          styles.row,
          {
            alignItems: "flex-start",
            flexDirection: width < 350 || fontScale > 1.5 ? "column" : "row",
            gap: 20,
            marginBottom: 24,
          },
        ]}
      >
        <BookCover book={book} width={width < 350 ? 116 : 140} />
        <View style={{ flex: 1, gap: 12 }}>
          <Heading style={{ fontSize: 24, lineHeight: 32 }}>
            {book.title}
          </Heading>
          <Body style={styles.muted}>{book.author}</Body>
          <Body
            style={{
              backgroundColor: "#F7E6EA",
              borderRadius: 20,
              padding: 10,
              color: "#8F3A50",
            }}
          >
            {book.category}
          </Body>
          <Body>{book.chapters.length} capítulos</Body>
          <Body style={styles.muted}>Leitura técnica</Body>
        </View>
      </View>
      <Button
        title={
          progress && !progress.completed ? "Continuar leitura" : "Ler agora"
        }
        icon="play"
        onPress={() => navigation.navigate("Leitor", { bookId: book.id })}
      />
      <Button
        style={{ marginTop: 12 }}
        secondary
        title={saved ? "Remover da biblioteca" : "Salvar na biblioteca"}
        icon={saved ? "bookmark" : "bookmark-outline"}
        onPress={() => toggleSaved(book.id)}
      />
      {progress && (
        <>
          <ProgressBar value={progress.percent} />
          <Body style={styles.muted}>{progress.percent}% lido</Body>
        </>
      )}
      <Heading style={styles.section}>Sinopse</Heading>
      <Body style={{ fontSize: 16, lineHeight: 26 }}>{book.synopsis}</Body>
      <Heading style={styles.section}>Sobre esta edição</Heading>
      <Body style={styles.muted}>
        Edição demonstrativa original Cherry Books. Textos educativos curtos,
        disponíveis offline. Não é uma reprodução de livro comercial.
      </Body>
      <Image
        source={require("../assets/brand/editorial-ornament.png")}
        resizeMode="contain"
        accessibilityElementsHidden
        style={{ width: 124, height: 24, alignSelf: "center", marginTop: 24 }}
      />
      <Heading style={styles.section}>Capítulos</Heading>
      {book.chapters.map((chapter, index) => (
        <MotionPress
          key={chapter.id}
          accessibilityRole="button"
          accessibilityLabel={`${String(index + 1).padStart(2, "0")}   ${chapter.title}`}
          onPress={() =>
            navigation.navigate("Leitor", {
              bookId: book.id,
              chapterId: chapter.id,
              blockId: chapter.blocks[0].id,
            })
          }
          style={[
            styles.row,
            {
              padding: 14,
              minHeight: 52,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 14,
              backgroundColor: c.surface,
              marginBottom: 8,
            },
          ]}
        >
          <Body style={styles.muted}>{String(index + 1).padStart(2, "0")}</Body>
          <Body style={{ flex: 1, fontSize: 15, lineHeight: 22 }}>
            {chapter.title}
          </Body>
          <Ionicons name="chevron-forward" size={22} color={c.brand} />
        </MotionPress>
      ))}
    </Screen>
  );
}
