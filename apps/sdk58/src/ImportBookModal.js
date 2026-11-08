import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { parseBookFile, detectFormat, sanitizeBook } from "./bookImporter";
import { useLibrary } from "./store";
import { colors as c, fonts } from "./tokens";
import { styles, Button, Heading, Body } from "./components";

export default function ImportBookModal({ visible, onClose, onBookImported }) {
  const { saveCustomBook } = useLibrary();
  const [step, setStep] = useState(1); // 1 = Escolher Arquivo, 2 = Revisão, 3 = Sucesso
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parsedBook, setParsedBook] = useState(null);
  const [isPublic, setIsPublic] = useState(true);
  const [acceptedRights, setAcceptedRights] = useState(true);

  // Campos editáveis na revisão
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("Programação");
  const [synopsis, setSynopsis] = useState("");

  const reset = () => {
    setStep(1);
    setLoading(false);
    setError("");
    setParsedBook(null);
    setIsPublic(true);
    setAcceptedRights(true);
    setTitle("");
    setAuthor("");
    setCategory("Programação");
    setSynopsis("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processFile = async (name, bufferOrString) => {
    setLoading(true);
    setError("");
    try {
      const book = parseBookFile({
        filename: name,
        data: bufferOrString,
      });

      setParsedBook(book);
      setTitle(book.title || name.replace(/\.[^.]+$/, ""));
      setAuthor(book.author || "Autor Desconhecido");
      setCategory(book.category || "Geral");
      setSynopsis(book.synopsis || "");
      setStep(2);
    } catch (err) {
      setError(err?.message || "Não foi possível processar o arquivo.");
    } finally {
      setLoading(false);
    }
  };

  const handlePickWebFile = () => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf,.docx,.epub,.mobi,.azw,.azw3,.md,.txt,.json";
      input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        const name = file.name;
        const ext = (name.split(".").pop() || "").toLowerCase();

        if (["txt", "md", "json"].includes(ext)) {
          const text = await file.text();
          processFile(name, text);
        } else {
          const arrayBuf = await file.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          processFile(name, buf);
        }
      };
      input.click();
    } else {
      // Fallback para mobile / demonstração rápida
      setStep(1.5);
    }
  };

  const handleSaveAndFinish = async () => {
    if (!parsedBook) return;
    if (isPublic && !acceptedRights) {
      setError("Confirme a declaração de domínio público ou autoria própria.");
      return;
    }

    setLoading(true);
    try {
      const finalBook = sanitizeBook({
        ...parsedBook,
        title,
        author,
        category,
        synopsis,
        isPublic,
      });

      await saveCustomBook(finalBook, isPublic);
      setStep(3);
      if (onBookImported) onBookImported(finalBook);
    } catch (err) {
      setError(err?.message || "Erro ao salvar livro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.65)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: c.canvas || "#FFFBF7",
            borderRadius: 24,
            padding: 24,
            width: "100%",
            maxWidth: 580,
            maxHeight: "90%",
            borderWidth: 1,
            borderColor: c.border || "#E5D9D7",
          }}
        >
          {/* Cabeçalho do Modal */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="cloud-upload-outline" size={24} color={c.brand} />
              <Heading style={{ fontSize: 20 }}>
                {step === 1 && "Adicionar Livro"}
                {step === 1.5 && "Colar Conteúdo"}
                {step === 2 && "Revisar Metadados"}
                {step === 3 && "Livro Publicado!"}
              </Heading>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              accessibilityLabel="Fechar"
            >
              <Ionicons name="close" size={24} color={c.ink} />
            </Pressable>
          </View>

          {error ? (
            <View
              style={{
                backgroundColor: "#FCEBEB",
                padding: 12,
                borderRadius: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#F0A9A9",
              }}
            >
              <Text style={{ fontFamily: fonts.ui, color: "#8A1A1A", fontSize: 14 }}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* Passo 1: Seleção de Arquivo */}
          {step === 1 && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Body style={{ marginBottom: 16 }}>
                Envie uma obra em formato aberto para ler no Cherry Books e
                disponibilizar no Acervo Público Comunitário:
              </Body>

              <View
                style={{
                  borderWidth: 2,
                  borderColor: c.border,
                  borderStyle: "dashed",
                  borderRadius: 16,
                  padding: 28,
                  alignItems: "center",
                  backgroundColor: c.surface || "#FFFFFF",
                  marginBottom: 20,
                }}
              >
                <Ionicons name="document-text-outline" size={48} color={c.brand} />
                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 17,
                    fontWeight: "600",
                    color: c.ink,
                    marginTop: 12,
                    marginBottom: 6,
                  }}
                >
                  Formatos Aceitos
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.ui,
                    fontSize: 13,
                    color: c.muted,
                    textAlign: "center",
                    lineHeight: 20,
                    marginBottom: 20,
                  }}
                >
                  PDF (.pdf) • Word (.docx) • Kindle (.mobi, .azw3, .epub) •
                  Markdown (.md) • Texto (.txt) • Cherry (.json)
                </Text>

                {loading ? (
                  <ActivityIndicator size="large" color={c.brand} />
                ) : (
                  <Button
                    title="Selecionar Arquivo no Dispositivo"
                    onPress={handlePickWebFile}
                  />
                )}
              </View>

              <Pressable
                onPress={() => setStep(1.5)}
                style={{
                  paddingVertical: 10,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.ui,
                    fontSize: 14,
                    color: c.brand,
                    fontWeight: "600",
                    textDecorationLine: "underline",
                  }}
                >
                  Ou colar texto / Markdown manualmente
                </Text>
              </Pressable>
            </ScrollView>
          )}

          {/* Passo 1.5: Entrada Manual de Texto */}
          {step === 1.5 && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Body style={{ marginBottom: 12 }}>
                Cole o texto ou Markdown da sua obra abaixo:
              </Body>
              <TextInput
                multiline
                numberOfLines={8}
                placeholder="Exemplo:\n# Meu Livro\nAutor: Seu Nome\n\n## Capítulo 1\nTexto da obra..."
                style={[
                  styles.input,
                  {
                    height: 180,
                    textAlignVertical: "top",
                    marginBottom: 16,
                    fontSize: 14,
                  },
                ]}
                onChangeText={(val) => setSynopsis(val)}
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Button
                  title="Voltar"
                  variant="secondary"
                  onPress={() => setStep(1)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Processar Texto"
                  onPress={() => processFile("Manual.md", synopsis)}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          )}

          {/* Passo 2: Revisão de Metadados e Escolha de Publicação */}
          {step === 2 && parsedBook && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View
                style={{
                  backgroundColor: "#F7ECEE",
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 16,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.ui,
                    fontSize: 13,
                    color: c.brand,
                    fontWeight: "600",
                  }}
                >
                  Formato: {(parsedBook.format || "livro").toUpperCase()} •{" "}
                  {parsedBook.chapters.length} capítulo(s) •{" "}
                  {parsedBook.chapters.reduce(
                    (acc, ch) => acc + ch.blocks.length,
                    0,
                  )}{" "}
                  blocos
                </Text>
                <Ionicons name="checkmark-circle" size={18} color={c.brand} />
              </View>

              <Text
                style={{
                  fontFamily: fonts.ui,
                  fontSize: 13,
                  fontWeight: "600",
                  color: c.ink,
                  marginBottom: 4,
                }}
              >
                Título da Obra
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                style={[styles.input, { marginBottom: 12 }]}
              />

              <Text
                style={{
                  fontFamily: fonts.ui,
                  fontSize: 13,
                  fontWeight: "600",
                  color: c.ink,
                  marginBottom: 4,
                }}
              >
                Autor(a)
              </Text>
              <TextInput
                value={author}
                onChangeText={setAuthor}
                style={[styles.input, { marginBottom: 12 }]}
              />

              <Text
                style={{
                  fontFamily: fonts.ui,
                  fontSize: 13,
                  fontWeight: "600",
                  color: c.ink,
                  marginBottom: 4,
                }}
              >
                Categoria Temática
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {[
                  "Programação",
                  "IA & Dados",
                  "Segurança",
                  "Mobile",
                  "Cloud",
                  "Arquitetura",
                  "Geral",
                ].map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: category === cat ? c.brand : c.border,
                      backgroundColor:
                        category === cat ? c.brand : c.surface || "#FFFFFF",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.ui,
                        fontSize: 13,
                        color: category === cat ? "#FFFFFF" : c.ink,
                        fontWeight: category === cat ? "600" : "400",
                      }}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text
                style={{
                  fontFamily: fonts.ui,
                  fontSize: 13,
                  fontWeight: "600",
                  color: c.ink,
                  marginBottom: 4,
                }}
              >
                Sinopse / Resumo
              </Text>
              <TextInput
                value={synopsis}
                onChangeText={setSynopsis}
                multiline
                numberOfLines={3}
                style={[styles.input, { height: 80, marginBottom: 16 }]}
              />

              {/* Opções de Visibilidade */}
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: c.border,
                  paddingTop: 16,
                  marginBottom: 16,
                }}
              >
                <Pressable
                  onPress={() => setIsPublic(!isPublic)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <Ionicons
                    name={isPublic ? "checkbox" : "square-outline"}
                    size={22}
                    color={c.brand}
                  />
                  <Text
                    style={{
                      fontFamily: fonts.ui,
                      fontSize: 14,
                      color: c.ink,
                      fontWeight: "600",
                    }}
                  >
                    Publicar no Acervo Público Comunitário
                  </Text>
                </Pressable>

                {isPublic && (
                  <Pressable
                    onPress={() => setAcceptedRights(!acceptedRights)}
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 10,
                      backgroundColor: "#FFF8F0",
                      padding: 10,
                      borderRadius: 8,
                    }}
                  >
                    <Ionicons
                      name={acceptedRights ? "checkbox" : "square-outline"}
                      size={20}
                      color={c.brand}
                    />
                    <Text
                      style={{
                        fontFamily: fonts.ui,
                        fontSize: 12,
                        color: "#7A4D1A",
                        flex: 1,
                        lineHeight: 18,
                      }}
                    >
                      Declaro que esta obra está em Domínio Público, sob licença
                      aberta ou é de minha autoria própria para disponibilização
                      acadêmica pública.
                    </Text>
                  </Pressable>
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <Button
                  title="Voltar"
                  variant="secondary"
                  onPress={() => setStep(1)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={
                    loading
                      ? "Salvando..."
                      : isPublic
                        ? "Publicar Livro"
                        : "Salvar no App"
                  }
                  onPress={handleSaveAndFinish}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          )}

          {/* Passo 3: Conclusão */}
          {step === 3 && (
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <Ionicons
                name="checkmark-circle-outline"
                size={64}
                color="#2E7D32"
              />
              <Heading style={{ fontSize: 22, marginTop: 16, marginBottom: 8 }}>
                Livro Adicionado com Sucesso!
              </Heading>
              <Body
                style={{
                  textAlign: "center",
                  color: c.muted,
                  marginBottom: 24,
                  maxWidth: 420,
                }}
              >
                A obra &quot;{title}&quot; agora está pronta para leitura acadêmica
                com grifos, notas e temas personalizados.
              </Body>
              <Button
                title="Fechar e Abrir Biblioteca"
                onPress={handleClose}
                style={{ minWidth: 220 }}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
