const subjects = [
  [
    "arquitetura",
    "Arquitetura de Software",
    "Arquitetura",
    "responsabilidades e limites",
    "Um sistema sustentável começa com limites claros. Cada módulo deve cuidar de uma responsabilidade e expor apenas o contrato necessário aos outros módulos.",
    "function criarServico(config) {\n  return new Servico(config);\n}",
  ],
  [
    "python",
    "Python para Automação",
    "Programação",
    "tarefas repetitivas",
    "Automatizar começa por entender uma rotina. Observe entradas, saídas e falhas antes de transformar uma sequência manual em um programa.",
    'from pathlib import Path\nfor arquivo in Path("dados").glob("*.csv"):\n    print(arquivo.name)',
  ],
  [
    "redes",
    "Redes Neurais Essenciais",
    "IA & Dados",
    "aprendizado com exemplos",
    "Uma rede neural ajusta parâmetros para aproximar uma função. Os exemplos de treino orientam esse ajuste, mas não garantem resultados corretos para dados desconhecidos.",
    "previsao = modelo(entrada)\nerro = perda(previsao, esperado)\nerro.backward()",
  ],
  [
    "seguranca",
    "Segurança em Aplicações",
    "Segurança",
    "fronteiras de confiança",
    "Toda entrada externa atravessa uma fronteira de confiança. Valide formato, tamanho e autorização antes de executar uma operação com os dados recebidos.",
    'if (!usuario.podeLer(documento)) {\n  throw new Error("Acesso negado");\n}',
  ],
  [
    "ia",
    "IA Aplicada",
    "IA & Dados",
    "avaliação de resultados",
    "Um recurso de inteligência artificial precisa de uma tarefa definida. Escolha exemplos representativos e critérios de avaliação antes de comparar modelos.",
    "const resultado = avaliar(resposta, rubrica);\nregistrar(resultado);",
  ],
  [
    "mobile",
    "React Native na Prática",
    "Mobile",
    "interfaces e estado",
    "Uma interface pode ser descrita como resultado do estado atual. Componentes pequenos tornam as responsabilidades visíveis e ajudam a testar mudanças de comportamento.",
    "const [salvo, setSalvo] = useState(false);\n<Button onPress={() => setSalvo(!salvo)} />",
  ],
  [
    "algoritmos",
    "Algoritmos Essenciais",
    "Programação",
    "custos de execução",
    "Um algoritmo descreve passos para resolver um problema. Compare custo de tempo e memória considerando o tamanho da entrada e a necessidade real do produto.",
    "function contem(itens, alvo) {\n  return itens.some(item => item === alvo);\n}",
  ],
  [
    "clean",
    "Clean Code na Prática",
    "Programação",
    "clareza de intenção",
    "Nomes devem revelar intenção. Uma função pequena pode expressar uma regra de negócio melhor que uma sequência longa de condições espalhadas pela aplicação.",
    "function podePublicar(artigo) {\n  return artigo.revisado && artigo.aprovado;\n}",
  ],
  [
    "sql",
    "Bancos de Dados SQL",
    "IA & Dados",
    "integridade e consultas",
    "Um modelo relacional representa entidades e relações. Chaves e restrições protegem invariantes mesmo quando diferentes aplicações escrevem no mesmo banco.",
    "SELECT titulo, autor\nFROM livros\nWHERE categoria = :categoria;",
  ],
  [
    "apis",
    "APIs com Node",
    "Programação",
    "contratos HTTP",
    "Uma API é um contrato entre sistemas. Descreva entradas, respostas e erros de forma consistente para que clientes possam lidar com falhas sem adivinhar.",
    'app.get("/livros", (req, res) => {\n  res.json(catalogo);\n});',
  ],
  [
    "cloud",
    "Cloud para Desenvolvedores",
    "Cloud",
    "operação confiável",
    "Executar na nuvem não elimina responsabilidade operacional. Defina limites de recursos, métricas e recuperação antes de aumentar a escala de um serviço.",
    'const saude = { status: "ok", versao: 1 };\nres.json(saude);',
  ],
  [
    "ux",
    "UX para Produtos Digitais",
    "Arquitetura",
    "tarefas e contexto",
    "Uma boa interface ajuda uma pessoa a concluir uma tarefa. Observe o contexto de uso e remova obstáculos antes de acrescentar novos controles.",
    'const tarefa = { objetivo: "encontrar livro" };\nmedirConclusao(tarefa);',
  ],
];
const covers = [
  require("../assets/covers/arquitetura.png"),
  require("../assets/covers/python.png"),
  require("../assets/covers/redes.png"),
  require("../assets/covers/seguranca.png"),
  require("../assets/covers/ia.png"),
  require("../assets/covers/mobile.png"),
  require("../assets/covers/algoritmos.png"),
  require("../assets/covers/clean.png"),
  require("../assets/covers/sql.png"),
  require("../assets/covers/apis.png"),
  require("../assets/covers/cloud.png"),
  require("../assets/covers/ux.png"),
];
export const books = subjects.map(
  ([id, title, category, concept, intro, code], i) => ({
    id,
    title,
    category,
    author: "Cherry Books Editorial",
    cover: covers[i],
    contentVersion: 1,
    synopsis: `Uma introdução prática a ${concept}, com exemplos comentados e exercícios para conectar conceitos à prática.`,
    chapters: [
      {
        id: "fundamentos",
        title: `Fundamentos de ${concept}`,
        blocks: [
          { id: "p1", type: "text", text: intro },
          {
            id: "p2",
            type: "text",
            text: `Antes de escolher uma ferramenta, defina o problema. Em ${title}, o primeiro passo é explicitar o resultado esperado, as restrições e quem usará a solução. Uma decisão útil considera o contexto e pode ser revista quando esse contexto muda.`,
          },
          {
            id: "p3",
            type: "text",
            text: "Comece com um exemplo pequeno e verificável. Registre a entrada, descreva o comportamento esperado e compare o resultado obtido. Essa prática transforma uma hipótese em algo que pode ser discutido e melhorado.",
          },
          { id: "code", type: "code", text: code },
          {
            id: "p4",
            type: "text",
            text: "Exercício: escolha uma tarefa do seu cotidiano e escreva três critérios para considerar a solução correta. Inclua um caso de falha e uma maneira de reconhecer esse caso sem perder dados.",
          },
        ],
      },
      {
        id: "decisoes",
        title: "Estruturas e decisões",
        blocks: [
          {
            id: "p1",
            type: "text",
            text: `A definição de ${concept} influencia diretamente a manutenção e a capacidade de evolução de uma solução. Não existe uma escolha universal: o custo de mudar precisa fazer parte da análise.`,
          },
          {
            id: "p2",
            type: "text",
            text: "Nesta etapa, analisamos os principais modelos e como tomar decisões com base no contexto do projeto. Compare alternativas usando exemplos concretos, em vez de depender apenas de preferências pessoais.",
          },
          {
            id: "p3",
            type: "text",
            text: "Além da estrutura, é essencial considerar fatores como o tamanho da equipe, o tempo de entrega e os requisitos não funcionais, como segurança, desempenho e custo. Torne esses compromissos explícitos para que a equipe possa avaliá-los.",
          },
          { id: "code", type: "code", text: code },
          {
            id: "p4",
            type: "text",
            text: "Exercício: escreva uma decisão técnica com contexto, alternativas, escolha e consequências. Defina um sinal observável que indicaria a necessidade de revisar essa decisão.",
          },
        ],
      },
      {
        id: "pratica",
        title: "Da prática à revisão",
        blocks: [
          {
            id: "p1",
            type: "text",
            text: `Aplicar ${concept} exige observar resultados. Construa uma pequena versão funcional, teste situações normais e de erro e registre o que ainda não foi validado.`,
          },
          {
            id: "p2",
            type: "text",
            text: "Revisar não significa recomeçar. Procure a menor mudança que corrige o problema confirmado, preserve o comportamento que já funciona e repita os testes afetados pela alteração.",
          },
          {
            id: "p3",
            type: "text",
            text: "Uma entrega confiável distingue evidência de suposição. Um programa que compila ainda precisa ser usado no ambiente de destino. Documente limitações de forma clara e mantenha um caminho de recuperação.",
          },
          { id: "code", type: "code", text: code },
          {
            id: "p4",
            type: "text",
            text: "Projeto final: produza um exemplo próprio, acrescente uma verificação automática e peça a outra pessoa para executar a tarefa principal. Use os resultados para melhorar a próxima versão.",
          },
        ],
      },
    ],
  }),
);
export const categories = [
  "Todos",
  "Programação",
  "IA & Dados",
  "Segurança",
  "Mobile",
  "Cloud",
  "Arquitetura",
];
const customBooksMap = new Map();

export const registerCustomBooks = (list) => {
  if (Array.isArray(list)) {
    for (const b of list) {
      if (b && typeof b.id === "string") customBooksMap.set(b.id, b);
    }
  } else if (list && typeof list.id === "string") {
    customBooksMap.set(list.id, list);
  }
};

export const unregisterCustomBook = (id) => {
  customBooksMap.delete(id);
};

export const getCustomBooks = () => Array.from(customBooksMap.values());

export const getAllBooks = () => [...books, ...customBooksMap.values()];

export const getBook = (id) =>
  books.find((book) => book.id === id) || customBooksMap.get(id);

export const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const searchBooks = (query = "", category = "Todos") =>
  getAllBooks().filter(
    (book) =>
      (category === "Todos" || book.category === category) &&
      normalize(`${book.title} ${book.author} ${book.category}`).includes(
        normalize(query.trim()),
      ),
  );
