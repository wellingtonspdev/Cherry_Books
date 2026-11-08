import React, { useState } from "react";
import { View, FlatList } from "react-native";
import { getAllBooks } from "./catalog";
import ImportBookModal from "./ImportBookModal";
import { useLibrary } from "./store";
import {
  Screen,
  Heading,
  BotanicalCorner,
  CategoryChip,
  BookCard,
  EmptyState,
  styles,
  useGrid,
  IconButton,
} from "./components";
export default function Biblioteca({ navigation }) {
  const { state } = useLibrary(),
    [filter, setFilter] = useState("Em leitura"),
    [modalVisible, setModalVisible] = useState(false),
    { columns, cardWidth } = useGrid();
  const data = getAllBooks()
    .filter((b) =>
      filter === "Salvos"
        ? state.savedBookIds.includes(b.id)
        : filter === "Concluídos"
          ? state.progressByBook[b.id]?.completed
          : state.progressByBook[b.id] && !state.progressByBook[b.id].completed,
    )
    .sort(
      (a, b) =>
        (state.progressByBook[b.id]?.updatedAt || 0) -
        (state.progressByBook[a.id]?.updatedAt || 0),
    );
  return (
    <Screen scroll={false}>
      <FlatList
        key={columns}
        data={data}
        numColumns={columns}
        keyExtractor={(b) => b.id}
        contentContainerStyle={[styles.content, { paddingBottom: 140 }]}
        columnWrapperStyle={columns > 1 ? { gap: 16 } : undefined}
        ListHeaderComponent={
          <View>
            <View style={{ paddingTop: 24, paddingBottom: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Heading style={{ fontSize: 28, lineHeight: 37 }}>
                  Minha Biblioteca
                </Heading>
                <BotanicalCorner compact />
              </View>
              <IconButton
                name="cloud-upload-outline"
                label="Importar Livro"
                onPress={() => setModalVisible(true)}
              />
            </View>
            <View style={[styles.wrap, { marginBottom: 24 }]}>
              {["Em leitura", "Salvos", "Concluídos"].map((label) => (
                <CategoryChip
                  key={label}
                  label={label}
                  segmented
                  style={{ flex: 1, paddingHorizontal: 8 }}
                  selected={label === filter}
                  onPress={() => setFilter(label)}
                />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            description={
              filter === "Em leitura"
                ? "Os livros que você começar a ler aparecerão aqui."
                : filter === "Concluídos"
                  ? "Conclua uma leitura para encontrá-la nesta estante."
                  : undefined
            }
            onPress={() => navigation.navigate("Explorar")}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.grid}>
            <BookCard
              book={item}
              width={cardWidth}
              progress={state.progressByBook[item.id]}
              onPress={() =>
                navigation.navigate("Detalhes", { bookId: item.id })
              }
            />
          </View>
        )}
      />
      <ImportBookModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onBookImported={(book) => navigation.navigate("Detalhes", { bookId: book.id })}
      />
    </Screen>
  );
}
