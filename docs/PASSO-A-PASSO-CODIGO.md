# Como criar a aplicação, passo a passo

Este documento ensina a construir a aplicação Vistoria de Condomínios desde o início. Os exemplos usam a estrutura real deste projeto e explicam a função de cada linha importante. Para manter o texto legível, trechos repetitivos de JSX e classes CSS são resumidos; o fluxo, os nomes dos arquivos e os contratos entre as camadas são os mesmos do código executado.

## 1. O que será construído

A aplicação terá:

- frontend React com Vite;
- backend Express;
- banco SQLite;
- cadastro de clientes, equipamentos e mão de obra;
- registro de vistorias com itens e fotos;
- agendamento de vistorias;
- dashboard com próximas vistorias agendadas;
- fallback local em `localStorage`;
- PWA e suporte de desenvolvimento em rede local;
- testes automatizados com Playwright.

A arquitetura final é:

```text
Navegador
  -> React/App.jsx
  -> services/api.js
  -> fetch('/api/...')
  -> proxy do Vite
  -> Express/server.js
  -> SQLite/database.sqlite
```

## 1.1. Como a aplicação roda

O fluxo completo durante o desenvolvimento é este:

1. `npm run dev` executa `scripts/dev.js`.
2. O launcher inicia dois processos Node: o Express em `http://localhost:4000` e o Vite em `http://localhost:5173`.
3. Ao iniciar, o Express cria a pasta `uploads/`, abre `database.sqlite` e executa `initDb()`. As tabelas são criadas apenas se ainda não existirem.
4. O navegador acessa `http://localhost:5173`. O Vite entrega `index.html`, que carrega `src/main.jsx`.
5. `src/main.jsx` localiza `<div id="root">` e monta o componente `<App />` dentro dele.
6. `App.jsx` executa o carregamento inicial e chama, em paralelo, as funções de `src/services/api.js` para buscar clientes, equipamentos, mão de obra, vistorias e agendamentos.
7. `api.js` faz `fetch('/api/...')`. O proxy do Vite encaminha essa chamada para `http://localhost:4000/api/...`.
8. O Express valida a requisição, executa SQL no SQLite e devolve JSON. O React coloca o resultado nos estados e redesenha a tela.

O fluxo de um novo agendamento é:

```text
Usuário preenche o modal
  -> estado appointmentDraft do React
  -> saveAppointment() valida e monta o payload
  -> api.saveAppointment()
  -> POST /api/appointments
  -> Express valida e grava no SQLite
  -> resposta JSON com o agendamento
  -> setAppointments() atualiza a tela sem recarregar a página
```

Quando o backend estiver indisponível, `request()` captura a falha e repete as operações de leitura, criação, edição e exclusão no `localStorage`. Esse fallback permite continuar trabalhando no navegador, mas os dados locais não são sincronizados automaticamente com o SQLite quando o servidor volta.

Em uma versão compilada, `npm run build` gera `dist/` com o frontend otimizado. O Service Worker é registrado somente fora do modo de desenvolvimento e pode servir a interface em uma navegação offline; o backend e o SQLite continuam sendo processos separados.

## 2. Pré-requisitos

Instale Node.js 20 ou superior. O npm vem com o Node.js.

```powershell
node -v
npm -v
```

Crie a pasta e inicialize o projeto:

```powershell
mkdir vistoria-condominios
cd vistoria-condominios
npm init -y
```

Instale as dependências:

```powershell
npm install react react-dom express cors sqlite sqlite3 multer framer-motion lucide-react tailwindcss @tailwindcss/vite
npm install -D vite @vitejs/plugin-react @playwright/test playwright form-data node-fetch
```

Função dos pacotes principais:

- `react`: componentes e estado da interface.
- `react-dom`: monta React no HTML.
- `vite`: servidor de desenvolvimento e build.
- `express`: servidor HTTP e rotas da API.
- `sqlite` e `sqlite3`: acesso ao banco SQLite.
- `multer`: recebimento de fotos multipart.
- `tailwindcss`: classes utilitárias de estilo.
- `lucide-react`: ícones.
- `playwright`: testes reais no navegador.

## 3. Configuração do `package.json`

A propriedade `type` permite usar `import` e `export` no Node:

```json
{
  "type": "module",
  "scripts": {
    "dev": "node scripts/dev.js",
    "dev:local": "vite",
    "server": "node server.js",
    "build": "vite build",
    "preview": "vite preview",
    "test:e2e": "playwright test --project=chromium"
  }
}
```

Linha por linha:

1. `"type": "module"` faz o Node interpretar arquivos `.js` como módulos ES.
2. `dev` inicia backend e frontend pelo launcher do projeto.
3. `dev:local` inicia somente o Vite.
4. `server` inicia somente o Express.
5. `build` gera a versão otimizada em `dist/`.
6. `preview` serve a versão compilada.
7. `test:e2e` executa o teste de navegador configurado no Playwright.

## 4. Criando a página HTML

Arquivo: `index.html`.

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vistoria de Seguranca Eletronica</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

Explicação:

- `<!doctype html>` ativa o modo HTML moderno.
- `lang="pt-BR"` informa o idioma da página.
- `charset="UTF-8"` permite acentos.
- `viewport` torna a página responsiva no celular.
- `<title>` define o título da aba.
- `<div id="root">` é o ponto onde React será montado.
- `<script type="module">` carrega o ponto de entrada JavaScript.

O HTML é pequeno de propósito: React monta o restante da interface dentro de `root`.

## 5. Configurando o Vite

Arquivo: `vite.config.js`.

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

Linha por linha:

1. `defineConfig` fornece tipagem e configuração do Vite.
2. `react()` habilita JSX e transformação React.
3. `tailwindcss()` integra o Tailwind ao Vite.
4. `fileURLToPath` e `URL` transformam o caminho do módulo em caminho de arquivo.
5. `export default` exporta a configuração.
6. `plugins` registra React e Tailwind.
7. O alias `@` aponta para `src`, permitindo `@/components/...`.
8. `server.proxy` encaminha chamadas feitas pelo frontend.
9. `/api` vai para o Express na porta `4000`.
10. `/uploads` também vai para o Express, para exibir fotos.
11. O navegador continua acessando apenas `localhost:5173`.

## 6. Montando o React

Arquivo: `src/main.jsx`.

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Explicação linha por linha:

1. Importa React, necessário para JSX e recursos React.
2. Importa a API moderna de montagem do React 18+.
3. Importa o CSS global.
4. Importa o componente principal.
5. Procura o elemento `root` criado no HTML.
6. `createRoot` cria a raiz da aplicação.
7. `render` define o que será desenhado.
8. `StrictMode` ajuda a encontrar efeitos colaterais durante o desenvolvimento.
9. `<App />` é a tela principal da SPA.

No código atual, o mesmo arquivo registra o Service Worker somente fora do modo de desenvolvimento. Durante o desenvolvimento, o código limpa registros antigos para não servir módulos React obsoletos pelo cache.

## 7. Estilo global

Arquivo: `src/index.css`.

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

* { box-sizing: border-box; }
html { scroll-behavior: smooth; color-scheme: light; }
body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background-color: #f8fafc;
  color: #0f172a;
}
```

Função de cada regra:

- `@import` carrega as classes do Tailwind.
- `@custom-variant` faz `dark:` depender da classe `.dark`, e não do tema automático do sistema.
- `box-sizing` evita que bordas aumentem o tamanho calculado dos elementos.
- `scroll-behavior` deixa rolagens suaves.
- `color-scheme` informa ao navegador qual paleta está ativa.
- `body` remove margem padrão e define tamanho mínimo e cores base.

As classes `.mobile-content` e `.mobile-bottom-nav` reservam espaço para a navegação mobile e evitam que ela cubra o conteúdo.

## 8. Criando o backend Express

Arquivo: `server.js`.

### 8.1 Importações e caminhos

```js
import express from "express";
import cors from "cors";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
```

Cada importação tem uma responsabilidade:

- `express`: cria a API HTTP.
- `cors`: permite chamadas entre origens durante o desenvolvimento.
- `open`: abre SQLite usando API baseada em Promises.
- `sqlite3`: driver que conversa com o arquivo SQLite.
- `path`: monta caminhos independentes do sistema operacional.
- `fileURLToPath`: converte URL de módulo para caminho Windows/Linux.
- `fs`: cria a pasta de uploads.
- `multer`: recebe arquivos enviados pelo navegador.

```js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "database.sqlite");
```

1. Obtém o caminho físico do arquivo atual.
2. Obtém a pasta onde `server.js` está.
3. Define o banco na raiz do projeto.

### 8.2 Inicialização do servidor

```js
const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
```

- `express()` cria a aplicação.
- `cors()` libera requisições do frontend durante o desenvolvimento.
- `express.json` lê corpos JSON e permite fotos em fallback base64 maiores.
- `express.urlencoded` lê formulários codificados.

```js
const uploadsDir = path.resolve(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));
```

- Define a pasta permanente de fotos.
- Cria a pasta caso ainda não exista.
- Publica essa pasta na URL `/uploads`.

### 8.3 Upload de fotos

```js
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, file.mimetype.startsWith("image/")),
});
```

- `diskStorage` grava arquivos no disco.
- `destination` escolhe `uploads/`.
- `filename` gera nome único para evitar colisões.
- `limits` limita o arquivo a 20 MB.
- `fileFilter` aceita somente MIME types de imagem.

A rota usa o middleware:

```js
app.post("/api/upload", upload.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no file uploaded" });
  res.json({
    id: req.file.filename,
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    size: req.file.size,
  });
});
```

1. Aceita `POST` em `/api/upload`.
2. `upload.single("photo")` lê o campo chamado `photo`.
3. Retorna `400` se nenhum arquivo chegar.
4. Retorna metadados que o frontend guarda na vistoria.

## 9. Criando o banco SQLite

```js
let db;

async function initDb() {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS clients (...);
    CREATE TABLE IF NOT EXISTS equipments (...);
    CREATE TABLE IF NOT EXISTS laborRates (...);
    CREATE TABLE IF NOT EXISTS inspections (...);
    CREATE TABLE IF NOT EXISTS appointments (...);
  `);
}
```

- `db` guarda a conexão compartilhada.
- `open` cria o arquivo se ele não existir.
- `filename` indica onde persistir.
- `driver` define o driver SQLite.
- `CREATE TABLE IF NOT EXISTS` torna a inicialização repetível.

As tabelas representam recursos do sistema:

```sql
clients       (id, name, document, address, manager, phone, email, notes, createdAt)
equipments    (id, name, type, brand, model, technicalDescription, quantity, location, createdAt)
laborRates    (id, serviceType, unitPrice, estimatedTime, description, createdAt)
inspections   (id, clientId, clientName, date, type, status, summary, notes,
              totalCost, totalTime, createdAt, items)
appointments  (id, clientId, clientName, date, time, type, technician,
              status, notes, createdAt)
```

`items` é texto JSON porque uma vistoria possui vários equipamentos e fotos. `appointments` possui uma linha por horário agendado.

O servidor inicia o banco e escuta a porta:

```js
app.listen(4000, async () => {
  await initDb();
  console.log("Backend SQLite iniciado em http://localhost:4000");
});
```

A callback só anuncia o servidor depois de preparar o banco.

## 10. Criando rotas CRUD

Uma rota de leitura segue este padrão:

```js
app.get("/api/appointments", async (_req, res) => {
  const appointments = await db.all("SELECT * FROM appointments ORDER BY date ASC, time ASC");
  res.json(appointments);
});
```

- `app.get` responde consultas.
- `_req` não é usado, por isso o sublinhado indica isso.
- `db.all` retorna várias linhas.
- `ORDER BY` entrega a agenda na ordem cronológica.
- `res.json` devolve array ao frontend.

Uma rota de criação:

```js
app.post("/api/appointments", async (req, res) => {
  const missing = requireFields(req.body, ["clientId", "date", "time", "type"]);
  if (missing.length) return validationError(res, "Campos obrigatórios ausentes");

  const appointment = {
    ...req.body,
    id: req.body.id || createId(),
    createdAt: req.body.createdAt || new Date().toISOString(),
  };

  await db.run(
    `INSERT OR REPLACE INTO appointments
     (id, clientId, clientName, date, time, type, technician, status, notes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    appointment.id,
    appointment.clientId,
    appointment.clientName,
    appointment.date,
    appointment.time,
    appointment.type,
    appointment.technician,
    appointment.status,
    appointment.notes,
    appointment.createdAt,
  );

  res.json(appointment);
});
```

Linha por linha:

1. Recebe `POST /api/appointments`.
2. Verifica cliente, data, hora e tipo.
3. Interrompe com HTTP 400 se faltar algum campo.
4. Copia os campos recebidos.
5. Gera ID somente para novo registro.
6. Registra a data de criação.
7. `db.run` executa o INSERT.
8. Os `?` evitam concatenar valores diretamente no SQL.
9. Os argumentos seguintes preenchem os placeholders na ordem.
10. `res.json` devolve o registro salvo.

As rotas `PUT` e `DELETE` usam o mesmo contrato. O `PUT` recebe `/api/appointments/:id` e atualiza pelo ID. O `DELETE` remove com `DELETE FROM appointments WHERE id = ?`.

## 11. Criando a camada de API do frontend

Arquivo: `src/services/api.js`.

```js
const BASE_API = import.meta.env.VITE_API_BASE || "/api";
const STORAGE_KEY = "vistoria_seguranca_eletronica_store";
```

- Usa uma base configurável por variável de ambiente.
- Por padrão, chama o proxy `/api`.
- Define a chave do fallback local.

A função central:

```js
async function request(path, options = {}) {
  const config = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };

  if (config.body && typeof config.body !== "string") {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(`${BASE_API}${path}`, config);
    if (!response.ok) throw new Error(`API error ${response.status}`);
    return await response.json();
  } catch (error) {
    return runLocalFallback(path, config, error);
  }
}
```

- Recebe caminho e opções HTTP.
- Define JSON como conteúdo padrão.
- Converte objeto JavaScript para JSON.
- Faz a requisição real.
- Converte status HTTP inválido em erro.
- Devolve JSON para o React.
- Se a rede falhar, executa a operação local.

As funções de agendamento são finas e previsíveis:

```js
export async function getAppointments() {
  return request("/appointments");
}

export async function saveAppointment(appointment) {
  if (appointment.id) {
    return request(`/appointments/${appointment.id}`, { method: "PUT", body: appointment });
  }
  return request("/appointments", { method: "POST", body: appointment });
}

export async function deleteAppointment(appointmentId) {
  return request(`/appointments/${appointmentId}`, { method: "DELETE" });
}
```

- `getAppointments` lista os registros.
- `saveAppointment` usa `PUT` quando existe ID.
- Sem ID, usa `POST` para criar.
- `deleteAppointment` remove por ID.

O fallback local mantém o mesmo formato dos recursos remotos. Assim a tela não precisa saber se os dados vieram do SQLite ou do navegador.

## 12. Criando o estado do React

Arquivo: `src/App.jsx`.

```jsx
const [clients, setClients] = useState([]);
const [inspections, setInspections] = useState([]);
const [appointments, setAppointments] = useState([]);
const [activePage, setActivePage] = useState("dashboard");
const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
```

Cada linha possui estado e função de atualização:

- `clients` guarda clientes.
- `inspections` guarda vistorias realizadas ou registradas.
- `appointments` guarda horários futuros.
- `activePage` controla qual módulo aparece.
- `appointmentModalOpen` controla o formulário.

O modelo inicial evita campos indefinidos:

```jsx
const defaultAppointment = {
  id: "",
  clientId: "",
  clientName: "",
  date: new Date().toISOString().slice(0, 10),
  time: "08:00",
  type: "Preventiva",
  technician: "",
  status: "Agendada",
  notes: "",
};
```

O formulário começa com data atual, horário padrão, tipo preventivo e status agendada.

## 13. Carregando todos os dados

```jsx
useEffect(() => {
  async function loadData() {
    const [clientsData, equipmentsData, laborData, inspectionsData, appointmentsData] = await Promise.all([
      api.getClients(),
      api.getEquipments(),
      api.getLaborRates(),
      api.getInspections(),
      api.getAppointments(),
    ]);

    setClients(clientsData);
    setEquipments(equipmentsData);
    setLaborRates(laborData);
    setInspections(inspectionsData.map(normalizeInspection));
    setAppointments(appointmentsData || []);
  }

  loadData();
}, []);
```

Explicação:

1. `useEffect` executa após a montagem do componente.
2. `loadData` agrupa a inicialização.
3. `Promise.all` faz as consultas em paralelo.
4. Cada função chama uma rota da API.
5. Os setters colocam as respostas no estado.
6. `normalizeInspection` garante que `items` seja array.
7. `appointmentsData || []` protege contra resposta vazia ou indefinida.
8. `[]` faz o efeito rodar uma vez por montagem.

## 14. Salvando um agendamento

```jsx
async function saveAppointment() {
  if (!appointmentDraft.clientId) {
    return showToastMessage(setToast, "Atenção", "Selecione o cliente.", "error");
  }

  if (!appointmentDraft.date || !appointmentDraft.time) {
    return showToastMessage(setToast, "Atenção", "Informe data e horário.", "error");
  }

  const client = clients.find((item) => item.id === appointmentDraft.clientId);
  const payload = {
    ...appointmentDraft,
    id: appointmentDraft.id || "",
    clientName: client?.name || appointmentDraft.clientName,
    createdAt: appointmentDraft.createdAt || new Date().toISOString(),
  };

  const saved = await api.saveAppointment(payload);
  setAppointments((previous) => {
    const exists = previous.some((item) => item.id === saved.id);
    return exists
      ? previous.map((item) => item.id === saved.id ? saved : item)
      : [...previous, saved];
  });

  setAppointmentModalOpen(false);
}
```

Linha por linha:

1. Declara função assíncrona porque haverá requisição HTTP.
2. Impede salvar sem cliente.
3. Mostra feedback visual de validação.
4. Impede data ou hora vazia.
5. Procura o objeto completo do cliente.
6. Cria o payload sem alterar diretamente o estado.
7. Mantém ID para edição ou vazio para criação.
8. Copia o nome para facilitar a exibição da agenda.
9. Adiciona data de criação.
10. Envia para `POST` ou `PUT` através de `api.js`.
11. Atualiza a lista sem recarregar a página.
12. Se o ID existe, substitui o registro antigo.
13. Se é novo, adiciona ao array.
14. Fecha o modal após sucesso.

## 15. Calculando as próximas vistorias

```jsx
const upcomingAppointments = useMemo(() => {
  return appointments
    .filter((item) => item.status !== "Cancelada")
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}, [appointments]);
```

- `useMemo` evita recalcular sem necessidade.
- `filter` esconde agendamentos cancelados.
- A combinação de data e hora vira uma chave ordenável.
- `sort` coloca o próximo atendimento primeiro.
- O cálculo é refeito quando `appointments` muda.

## 16. Criando o menu

Arquivo: `src/components/Sidebar.jsx`.

```jsx
const items = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "clients", label: "Clientes", icon: Users },
  { id: "inspections", label: "Vistorias", icon: ListChecks },
  { id: "appointments", label: "Agendamentos", icon: CalendarDays },
  { id: "reports", label: "Relatórios", icon: FileText },
];
```

Cada objeto define:

- `id`: valor usado pelo estado `activePage`.
- `label`: texto apresentado ao usuário.
- `icon`: componente visual do Lucide.

O componente percorre a lista:

```jsx
{items.map((item) => {
  const Icon = item.icon;
  return (
    <button key={item.id} onClick={() => onChange(item.id)}>
      <Icon className="h-5 w-5" />
      {item.label}
    </button>
  );
})}
```

- `map` cria um botão para cada módulo.
- `key` ajuda o React a identificar cada item.
- `onChange` informa ao `App` qual página abrir.
- O mesmo conceito é usado no menu mobile.

## 17. Exibindo a agenda no dashboard

O dashboard usa os dados derivados:

```jsx
{upcomingAppointments.length ? (
  upcomingAppointments.slice(0, 3).map((appointment) => (
    <div key={appointment.id}>
      <p>{appointment.clientName}</p>
      <p>{appointment.date} às {appointment.time}</p>
      <p>{appointment.type} • {appointment.status}</p>
    </div>
  ))
) : (
  <p>Nenhuma vistoria agendada.</p>
)}
```

- Se há registros, mostra no máximo três.
- `key` identifica cada card.
- Cliente, data, hora, tipo e status são exibidos.
- Sem registros, aparece uma mensagem neutra.
- O botão `Ver agenda` altera `activePage` para `appointments`.

## 18. Criando o formulário de agendamento

O modal usa os componentes reutilizáveis:

```jsx
<Modal
  open={appointmentModalOpen}
  title={editingAppointment ? "Editar agendamento" : "Agendar vistoria"}
  onClose={closeModal}
  actions={...}
>
  <select value={appointmentDraft.clientId} onChange={...}>
    <option value="">Selecione um cliente</option>
    {clients.map((client) => (
      <option key={client.id} value={client.id}>{client.name}</option>
    ))}
  </select>

  <input type="date" value={appointmentDraft.date} onChange={...} />
  <input type="time" value={appointmentDraft.time} onChange={...} />
  <select value={appointmentDraft.type} onChange={...} />
  <select value={appointmentDraft.status} onChange={...} />
  <input value={appointmentDraft.technician} onChange={...} />
  <textarea value={appointmentDraft.notes} onChange={...} />
</Modal>
```

Cada controle é controlado pelo React: o valor vem do estado e `onChange` atualiza o estado. Isso garante que o objeto enviado à API seja exatamente o que foi digitado.

## 19. Inicializando o desenvolvimento

Arquivo: `scripts/dev.js`.

```js
const commands = [
  [process.execPath, ["server.js"]],
  [process.execPath, ["node_modules/vite/bin/vite.js", "--host", "0.0.0.0"]],
];

const children = commands.map(([command, args]) =>
  spawn(command, args, { stdio: "inherit", windowsHide: false })
);
```

- `process.execPath` usa o mesmo Node instalado.
- Primeiro processo executa o backend.
- Segundo processo executa o Vite.
- `spawn` mantém os dois ativos.
- `stdio: inherit` mostra logs no terminal.
- `0.0.0.0` permite acesso por outros dispositivos da rede.

Execute:

```powershell
npm run dev
```

URLs esperadas:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:4000
API:      http://localhost:4000/api/appointments
```

Se aparecer erro de porta ocupada no Windows:

```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 4000,5173 }
Stop-Process -Id ID_DO_PROCESSO -Force
npm run dev
```

## 20. Testando o projeto

Compile primeiro:

```powershell
npm run build
```

Depois execute o teste de navegador:

```powershell
npm run test:e2e
```

O teste existente cria uma conta, abre uma nova vistoria, adiciona item e confirma o salvamento. Um teste adicional de agenda deve seguir este roteiro:

1. Abrir `/`.
2. Criar ou autenticar usuário.
3. Clicar em `Agendar vistoria`.
4. Selecionar cliente.
5. Preencher data e horário.
6. Salvar.
7. Confirmar a mensagem `Agendamento salvo`.
8. Confirmar o cliente no bloco `Próximas vistorias agendadas`.
9. Abrir `Ver agenda`.
10. Confirmar edição e exclusão.

## 21. PWA e cache

Arquivo: `public/sw.js`.

O Service Worker cacheia arquivos para permitir carregamento offline. No desenvolvimento, `src/main.jsx` remove registros antigos e caches antes de carregar a aplicação, porque um cache de JavaScript antigo pode misturar versões do React e produzir `Invalid hook call`.

No desenvolvimento, quando a tela parecer antiga:

1. Pare servidores duplicados.
2. Execute `npm run dev` uma única vez.
3. Recarregue com `Ctrl + F5`.
4. Se necessário, limpe os dados do site no navegador.

## 22. Ordem recomendada para desenvolver do zero

1. Criar `package.json` e instalar dependências.
2. Criar `index.html` com `root`.
3. Criar `src/main.jsx`.
4. Configurar Vite e Tailwind.
5. Criar `server.js` e confirmar `GET /api/health` ou uma rota simples.
6. Criar banco e tabelas.
7. Criar `src/services/api.js`.
8. Criar componentes visuais pequenos: Button, Card, Modal e Toast.
9. Criar `App.jsx` com login e dashboard.
10. Adicionar CRUD de clientes.
11. Adicionar equipamentos e mão de obra.
12. Adicionar vistorias e upload.
13. Adicionar agendamentos.
14. Mostrar agendamentos no dashboard.
15. Adicionar exportação, PWA e fallback offline.
16. Executar build e testes após cada módulo.

## 23. Limites importantes

- O login atual é local e guarda senha no navegador; não serve para produção pública.
- O SQLite é local ao computador onde o backend roda.
- O fallback de `localStorage` não sincroniza automaticamente com SQLite.
- Fotos em base64 podem ocupar bastante espaço no navegador.
- O backend ainda não possui autorização por usuário.
- Para produção, adicione autenticação real, HTTPS, validação completa, controle de acesso e backup do banco.
