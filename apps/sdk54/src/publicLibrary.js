// publicLibrary.js - Gerenciador do Acervo Público Colaborativo do Cherry Books
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sanitizeBook } from "./bookImporter";
import { registerCustomBooks, getAllBooks } from "./catalog";

export const PUBLIC_CACHE_KEY = "cherry-books:public-library-cache:v1";

// Livros de domínio público / acervo comunitário inicial para disponibilidade imediata
export const initialCommunityBooks = [
  {
    id: "public-arte-da-guerra",
    title: "A Arte da Guerra (Edição Acadêmica)",
    author: "Sun Tzu",
    category: "Arquitetura",
    format: "public",
    synopsis: "Tratado militar clássico adaptado para planejamento estratégico de sistemas e arquitetura de software.",
    contentVersion: 1,
    cover: null,
    isPublic: true,
    chapters: [
      {
        id: "c1",
        title: "I. Avaliações Estratégicas",
        blocks: [
          {
            id: "b1",
            type: "text",
            text: "A arte da guerra é de importância vital para o Estado. É uma questão de vida ou morte, uma estrada que conduz à sobrevivência ou à ruína.",
          },
          {
            id: "b2",
            type: "text",
            text: "Portanto, ela deve ser minuciosamente avaliada por meio de cinco fatores fundamentais: a Doutrina, o Tempo, o Terreno, o Comando e a Disciplina.",
          },
          {
            id: "b3",
            type: "code",
            text: "interface Estrategia {\n  doutrina: boolean;\n  terreno: 'favoravel' | 'adverso';\n  comando: 'claro' | 'confuso';\n}",
          },
        ],
      },
      {
        id: "c2",
        title: "II. A Condução das Operações",
        blocks: [
          {
            id: "b1",
            type: "text",
            text: "Nas operações bélicas ou na arquitetura de sistemas de grande porte, a rapidez na execução é essencial para evitar o esgotamento de recursos.",
          },
          {
            id: "b2",
            type: "text",
            text: "Nunca houve um país que tenha se beneficiado de uma guerra prolongada; a eficiência reside na simplificação e no foco operacional.",
          },
        ],
      },
    ],
  },
  {
    id: "public-pensamento-computacional",
    title: "Fundamentos do Pensamento Computacional",
    author: "Comunidade Cherry Books",
    category: "Programação",
    format: "public",
    synopsis: "Princípios essenciais de decomposição, reconhecimento de padrões e abstração algorítmica para estudantes e pesquisadores.",
    contentVersion: 1,
    cover: null,
    isPublic: true,
    chapters: [
      {
        id: "c1",
        title: "Capítulo 1: Decomposição e Abstração",
        blocks: [
          {
            id: "b1",
            type: "text",
            text: "O pensamento computacional é o processo mental envolvido na formulação de problemas e de suas soluções, de modo que possam ser executadas por agentes de processamento.",
          },
          {
            id: "b2",
            type: "text",
            text: "A decomposição divide problemas complexos em partes menores e tratáveis, permitindo focar em invariantes essenciais de projeto.",
          },
          {
            id: "b3",
            type: "code",
            text: "const decompor = (problema) => problema.subproblemas.map(resolver);",
          },
        ],
      },
    ],
  },
];

let cachedPublicBooks = [...initialCommunityBooks];

export async function loadPublicLibraryBooks() {
  try {
    const raw = await AsyncStorage.getItem(PUBLIC_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedPublicBooks = parsed;
      }
    }
  } catch {}
  registerCustomBooks(cachedPublicBooks);
  return cachedPublicBooks;
}

export async function publishToPublicLibrary(rawBook) {
  const sanitized = sanitizeBook({ ...rawBook, isPublic: true });
  
  // Tenta sincronizar via API remota se houver endpoint disponível
  try {
    const response = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sanitized),
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.book) {
        Object.assign(sanitized, data.book);
      }
    }
  } catch {
    // Modo offline / Snack: continua com persistência local garantida
  }

  // Atualiza cache público em memória e storage
  const existingIndex = cachedPublicBooks.findIndex((b) => b.id === sanitized.id);
  if (existingIndex >= 0) {
    cachedPublicBooks[existingIndex] = sanitized;
  } else {
    cachedPublicBooks.unshift(sanitized);
  }

  registerCustomBooks(sanitized);
  try {
    await AsyncStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(cachedPublicBooks));
  } catch {}

  return sanitized;
}

export function getCachedPublicBooks() {
  return cachedPublicBooks;
}
