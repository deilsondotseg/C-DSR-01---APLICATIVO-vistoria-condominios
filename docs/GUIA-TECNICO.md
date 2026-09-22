# Guia tecnico do aplicativo

Para aprender a construir a aplicação desde o início, consulte também o [Passo a passo do código](PASSO-A-PASSO-CODIGO.md), com a função dos principais trechos de HTML, React, API, SQLite, agendamento e testes.

## 1. Objetivo

O Vistoria Condominios e uma aplicacao web responsiva para registrar inspeções de sistemas de seguranca eletronica em condominios. O tecnico cadastra clientes, equipamentos e servicos de mao de obra, cria uma vistoria com seus itens, anexa fotos e consulta custos, tempos e relatorios.

O frontend funciona como uma SPA (Single Page Application) React. Durante o desenvolvimento, o Vite entrega a interface e encaminha `/api` e `/uploads` para o backend Express. O backend persiste os cadastros em SQLite e os arquivos enviados em `uploads/`.

## 2. Inicio da aplicacao

1. `index.html` fornece o elemento HTML `#root`.
2. `src/main.jsx` carrega o CSS, monta o React com `StrictMode` e registra o Service Worker depois que a pagina termina de carregar.
3. `src/App.jsx` controla autenticacao, estado dos cadastros, navegacao, modais, filtros, agendamentos e renderizacao das telas.
4. `scripts/dev.js`, usado por `npm run dev`, inicia `server.js` e o Vite ao mesmo tempo.
5. `vite.config.js` redireciona chamadas do frontend para `http://localhost:4000`.

Para iniciar o conjunto completo:

```bash
npm install
npm run dev
```

O comando `npm run dev:local` inicia somente o Vite. Nesse caso, a API precisa ser iniciada separadamente com `npm run server`.

### Execucao passo a passo

#### 1. O npm identifica o comando

Ao executar `npm run dev`, o npm consulta a secao `scripts` do `package.json` e encontra:

```json
"dev": "node scripts/dev.js"
```

O Node.js passa a executar `scripts/dev.js`.

#### 2. O script de desenvolvimento cria dois processos

O arquivo `scripts/dev.js` usa `child_process.spawn` para iniciar simultaneamente:

```text
node server.js
node node_modules/vite/bin/vite.js --host 0.0.0.0
```

O primeiro processo e o backend Express. O segundo e o servidor de desenvolvimento Vite. O script usa `stdio: "inherit"`, por isso os logs dos dois processos aparecem no mesmo terminal.

Se um dos processos terminar com erro, `stopChildren()` encerra o outro processo para evitar que o projeto fique parcialmente funcionando. `SIGINT` e `SIGTERM` tambem encerram os dois processos quando o usuario para o comando.

#### 3. O backend prepara o armazenamento

Ao iniciar, `server.js`:

1. resolve o caminho absoluto de `database.sqlite`;
2. cria a pasta `uploads/` caso ela nao exista;
3. configura CORS, leitura de JSON e arquivos estaticos;
4. configura o Multer para receber imagens;
5. abre ou cria o banco SQLite;
6. cria as tabelas `clients`, `equipments`, `laborRates` e `inspections`;
7. executa a migracao necessaria da tabela de vistorias;
8. escuta a porta `4000`.

O backend fica disponivel em `http://localhost:4000`. A interface normalmente nao chama essa porta diretamente: o Vite recebe `/api/...` e `/uploads/...` e os encaminha para o backend por meio do proxy configurado em `vite.config.js`.

#### 4. O Vite entrega a pagina

Quando o navegador acessa `http://localhost:5173`, o Vite entrega `index.html`. Esse arquivo possui o elemento:

```html
<div id="root"></div>
```

e carrega `src/main.jsx` como modulo JavaScript.

#### 5. O React monta a aplicacao

`src/main.jsx`:

1. importa `index.css`;
2. importa o componente principal `App`;
3. cria a raiz React em `#root`;
4. renderiza `<App />` dentro de `React.StrictMode`;
5. registra `public/sw.js` quando a pagina termina de carregar.

Depois disso, o React passa a controlar o conteudo de `#root`. A tela de login ou o painel sao escolhidos pelo estado `isAuthenticated`.

#### 6. O App restaura preferencias e sessao

No primeiro `useEffect` de `App.jsx`, a aplicacao:

- le `vistoria_dark_mode` e restaura o tema;
- aplica ou remove a classe `dark` em `html` e `body`;
- le `vistoria_user` para recuperar a sessao local;
- carrega os usuarios de `vistoria_users`;
- registra o evento que permite instalar o PWA.

Um segundo efeito mantem a preferencia de tema sincronizada com `localStorage` sempre que `darkMode` muda.

#### 7. O App carrega os dados

Outro efeito chama em paralelo:

```text
api.getClients()
api.getEquipments()
api.getLaborRates()
api.getInspections()
api.getAppointments()
```

Cada chamada passa por `request()` em `src/services/api.js`. O caminho normal e:

```text
React -> api.js -> fetch('/api/...') -> proxy do Vite -> Express -> SQLite
```

Quando o backend retorna os dados, `App.jsx` atualiza os estados `clients`, `equipments`, `laborRates`, `inspections` e `appointments`. Filtros, totais, próximas datas e indicadores do Dashboard sao derivados desses estados com `useMemo`.

#### 8. O usuario interage com a interface

O `App` mantem em estado a pagina ativa, filtros, formularios e modais. Ao clicar em um item da `Sidebar` ou da barra mobile, `activePage` muda e o JSX renderiza o modulo correspondente sem recarregar a pagina.

Os componentes `Button`, `Card`, `Modal` e `Toast` cuidam da apresentacao reutilizavel. Os componentes nao possuem banco proprio; recebem dados e eventos do `App` por propriedades.

#### 9. O usuario salva uma vistoria

O fluxo completo e:

1. `openInspectionModal()` cria um rascunho com `defaultInspection`.
2. `onClientChange()` associa o cliente e copia seu nome para o rascunho.
3. O usuario preenche os dados do item.
4. `addInspectionItem()` gera um ID e inclui o item no array `inspectionDraft.items`.
5. `inspectionTotals` recalcula custo e tempo a cada alteracao.
6. `saveInspection()` valida cliente e quantidade de itens.
7. As fotos sao reduzidas ou recebem URL do upload antes do envio.
8. O payload recebe `clientName`, `totalCost`, `totalTime` e `createdAt`.
9. `api.saveInspection()` usa `POST` para uma nova vistoria ou `PUT` para uma existente.
10. Express valida o payload e grava os campos da vistoria no SQLite; `items` e serializado como JSON.
11. A resposta retorna ao frontend, que normaliza `items`, atualiza a lista e mostra o Toast de sucesso.

#### 10. O que acontece se a API falhar

Se `fetch()` falhar ou retornar erro, `request()` procura o recurso equivalente em `vistoria_seguranca_eletronica_store`. Nesse caso, a operacao e feita no `localStorage`:

```text
API indisponivel -> request() captura o erro -> loadStore() -> altera o objeto local -> saveStore()
```

Esse fallback permite continuar usando o navegador, mas nao envia automaticamente os dados ao SQLite quando a conexao voltar. Por isso, dados locais e dados do banco podem ficar diferentes entre dispositivos.

#### 11. Como a aplicacao e encerrada

Ao pressionar `Ctrl+C`, o sistema envia `SIGINT` para `scripts/dev.js`. O script chama `stopChildren()`, encerra o Vite e o backend, e finaliza o processo principal. O arquivo `database.sqlite` continua salvo no projeto e sera reutilizado na proxima inicializacao.

#### 12. Fluxo de producao

Com `npm run build`, o Vite:

1. processa JSX, CSS e imports;
2. aplica os plugins React e Tailwind;
3. gera os arquivos otimizados na pasta `dist/`.

O `npm run preview` serve essa pasta para testar a versao compilada. Em producao, o backend Express ainda precisa ser executado separadamente para que as rotas `/api` e `/uploads` funcionem.

### Acesso pelo celular

O comando `npm run dev` inicia o Vite com host `0.0.0.0`, portanto o celular pode acessar o servidor pela rede local. Conecte os dois dispositivos ao mesmo Wi-Fi, descubra o IPv4 do computador e abra `http://IP_DO_COMPUTADOR:5173` no celular. No Windows, o IPv4 pode ser consultado com:

```powershell
Get-NetIPAddress -AddressFamily IPv4
```

Neste ambiente, o endereço atual do computador e `http://10.1.2.216:5173`. Se a pagina nao abrir, verifique o Firewall do Windows, a rede de convidados e se os dispositivos estao na mesma rede.

## 3. Autenticacao local

A tela inicial e controlada por `isAuthenticated` em `App.jsx`.

- Cadastro: valida os campos, verifica se o usuario ja existe e grava a lista em `localStorage` na chave `vistoria_users`.
- Login: compara usuario e senha com essa lista e grava o usuario ativo em `vistoria_user`.
- Sessao: ao recarregar a pagina, o efeito de inicializacao restaura `vistoria_user`.
- Logout: remove somente `vistoria_user` e limpa os estados dos formularios.

Esta e uma autenticacao de demonstracao/local. A senha e armazenada sem hash no navegador; ela nao deve ser usada como mecanismo de seguranca para um ambiente publico.

## 4. Camadas de dados

### Frontend

`src/services/api.js` concentra as operacoes de dados. As funcoes publicas sao:

- `getClients`, `saveClient`, `deleteClient`
- `getEquipments`, `saveEquipment`, `deleteEquipment`
- `getLaborRates`, `saveLaborRate`, `deleteLaborRate`
- `getInspections`, `saveInspection`, `deleteInspection`
- `getAppointments`, `saveAppointment`, `deleteAppointment`
- `getReports`, para filtrar vistorias por cliente e periodo
- `uploadImage`, para enviar uma foto em `multipart/form-data`

Cada funcao de salvamento decide entre `POST` (novo registro) e `PUT` (registro com `id`). A funcao interna `request` tenta primeiro a API HTTP. Se a requisicao falhar e o recurso for conhecido, executa a mesma operacao em `localStorage`, usando a chave `vistoria_seguranca_eletronica_store`. Isso permite continuar trabalhando sem o backend, mas os dados ficam restritos ao navegador e ao dispositivo.

### Backend

`server.js` cria `database.sqlite` na raiz do projeto e inicializa quatro tabelas:

| Tabela | Conteudo |
| --- | --- |
| `clients` | Condomínios, documento, endereco e responsavel |
| `equipments` | Equipamentos, tipo, marca, modelo e local |
| `laborRates` | Servicos, valores e tempos estimados |
| `inspections` | Cabecalho da vistoria e itens serializados em JSON |
| `appointments` | Data, hora, cliente, técnico, status e observações da agenda |

As rotas CRUD seguem o padrao `/api/<recurso>` e `/api/<recurso>/:id`. Os itens de uma vistoria ficam na coluna `items` como texto JSON e sao convertidos para array na leitura e na resposta de gravacao.

## 5. Fluxo de uma vistoria

1. O usuario abre **Vistorias** e clica em **Nova vistoria**.
2. Seleciona um cliente, data, tipo e status.
3. Informa um equipamento, tipo, status, servico, quantidade e valor unitario.
4. `addInspectionItem` cria um identificador para o item e o adiciona ao rascunho.
5. O servico escolhido pode preencher automaticamente valor e tempo a partir de `laborRates`.
6. Fotos sao enviadas para `/api/upload`. Se o envio falhar, `FileReader` converte o arquivo para Data URL e o mantem no rascunho.
7. `inspectionTotals` calcula custo (`quantidade * valor unitario`) e tempo total.
8. `saveInspection` exige cliente e pelo menos um item, acrescenta `clientName`, `totalCost` e `totalTime`, e chama `persistInspection`.
9. O backend salva os itens serializados no SQLite. Se a API estiver indisponivel, o fallback grava no localStorage.
10. A lista de vistorias e atualizada sem recarregar a pagina e um `Toast` informa o resultado.

Antes de enviar a vistoria, os metadados das fotos sao preservados no payload. O campo `url` permanece disponivel para visualizar a imagem, mas a aplicacao evita transformar todas as fotos em base64 quando o upload do servidor funcionou.

## 6. Modulos da interface

- **Dashboard**: mostra contagens de clientes, equipamentos, mao de obra e vistorias, alem de total de itens e custo estimado.
- **Clientes**: CRUD de condominios com filtro por nome, documento e responsavel.
- **Equipamentos**: CRUD de equipamentos com filtro por nome, tipo, marca e modelo.
- **Mao de obra**: CRUD de servicos com valor e tempo estimados.
- **Vistorias**: CRUD de vistorias, filtro textual, itens, fotos e totais.
- **Agendamentos**: criação, edição, exclusão e ordenação de horários de vistoria.
- **Relatorios**: filtro por cliente e intervalo de datas; a impressao do navegador pode gerar PDF.

O Dashboard mostra as três próximas vistorias não canceladas e possui atalhos para criar um agendamento ou abrir a agenda completa.

`Sidebar.jsx` controla a navegacao em telas largas. Em telas menores, `App.jsx` exibe menu sobreposto e barra de navegacao inferior. `Modal.jsx`, `Button.jsx`, `Card.jsx` e `Toast.jsx` sao componentes visuais reutilizaveis.

## 7. Fotos e arquivos

O endpoint `POST /api/upload` usa Multer, aceita um campo chamado `photo`, limita cada arquivo a 20 MB e grava o arquivo em `uploads/`. O servidor retorna o identificador, nome, tamanho e URL publica `/uploads/<arquivo>`.

Quando a API nao esta disponivel, a foto e convertida para Data URL no navegador. Antes disso, o app redimensiona a maior dimensao para no maximo 1600 pixels e codifica a imagem em JPEG com qualidade 82%, reduzindo o consumo de localStorage e o tamanho do payload.

O botao **Exportar PDF** chama `window.print()` e o navegador oferece a opcao **Salvar como PDF**. Em **Relatorios**:

- **Exportar JSON** baixa clientes, equipamentos, mao de obra e vistorias que correspondem aos filtros atuais.
- **Exportar TXT** gera um relatorio textual com cada vistoria, itens, status, observacoes, custos e tempos.
- **Importar JSON** restaura um backup produzido pelo aplicativo. Registros com o mesmo `id` sao atualizados; novos registros sao adicionados. O arquivo e validado antes da gravacao e os registros passam pela API ou pelo fallback local.

## 8. PWA e funcionamento offline

`public/manifest.webmanifest` define o nome, icone, cores e modo standalone instalavel. `public/sw.js`:

- armazena recursos estaticos em cache durante a instalacao;
- usa cache-first para recursos comuns;
- usa network-first para `/api` e `/uploads`;
- devolve `index.html` para navegacao quando a rede falha.

O Service Worker melhora o carregamento da interface, mas nao transforma o SQLite em banco offline. O suporte offline de dados vem do fallback de `api.js`, que usa localStorage.

## 9. Melhorias aplicadas

- O Dashboard agora mostra itens em manutencao/avaliacao, itens marcados para substituicao e total de fotos anexadas.
- Relatorios podem ser exportados em JSON respeitando cliente e intervalo de datas selecionados.
- Relatorios tambem podem ser exportados em TXT e backups JSON podem ser importados.
- A lista de vistorias possui filtro combinado por texto e status.
- Fotos usadas no fallback offline sao redimensionadas e comprimidas no navegador.
- O backend valida campos obrigatorios, quantidades, valores, existencia de itens na vistoria e aceita apenas arquivos de imagem no upload.
- O build e o teste E2E continuam sendo usados como verificacao minima apos alteracoes.

## 10. Estrutura de dados principal

```text
Client       { id, name, document, address, manager, phone, email, notes }
Equipment    { id, name, type, brand, model, technicalDescription, quantity, location }
LaborRate    { id, serviceType, unitPrice, estimatedTime, description }
Inspection   { id, clientId, clientName, date, type, status, summary, notes,
               totalCost, totalTime, createdAt, items[] }
Appointment  { id, clientId, clientName, date, time, type, technician,
               status, notes, createdAt }
Item         { id, equipmentName, type, status, observations, serviceType,
               quantity, unitPrice, estimatedTime, serviceSuggestion, photos[] }
Photo        { id, name, url, date }
```

## 11. Decisoes e limites conhecidos

- O estado de tela fica em `useState`; filtros e totais derivados usam `useMemo`.
- IDs sao gerados por `crypto.randomUUID()` quando o navegador oferece essa API, com fallback baseado em data e aleatoriedade.
- Validacoes de cliente, equipamento, mao de obra e vistoria sao feitas antes da persistencia.
- O backend nao implementa autorizacao por usuario: qualquer cliente que alcance a API pode chamar as rotas.
- Nao ha migracao de dados do localStorage para SQLite; a troca de modo de armazenamento deve ser feita manualmente.
- A tabela de vistorias guarda itens como JSON, o que simplifica o modelo, mas dificulta consultas SQL por equipamento ou status.
- A importacao JSON restaura os registros, mas nao substitui uma estrategia de sincronizacao entre dispositivos.
- O upload rejeita arquivos que nao tenham MIME type de imagem e limita cada arquivo a 20 MB.
- Agendamentos cancelados permanecem armazenados para histórico, mas nao aparecem entre as próximas datas do Dashboard.

## 12. Testes e build

```bash
npm run build
npm run test:e2e
npm run preview
```

O teste em `tests/save-inspection.spec.js` cria uma conta, abre o modal de vistoria, adiciona um item e confirma o salvamento pela mensagem de sucesso. O teste depende do servidor de desenvolvimento configurado em `playwright.config.js`.

## 13. Proximas melhorias recomendadas

1. Substituir a autenticacao local por autenticacao no backend com senha protegida por hash, sessao e permissoes.
2. Migrar o fallback de `localStorage` para IndexedDB e criar fila de sincronizacao quando a conexao voltar.
3. Implementar pacote ZIP com fotos e relatorio.
4. Separar os itens de vistoria em tabela propria para permitir filtros e historico detalhados.
5. Adicionar auditoria de criacao, edicao e exclusao por usuario.
6. Criar testes de upload, exportacao, validacao backend e modo offline.

## 14. Como comentar o codigo

Os comentarios adicionados ao codigo destacam limites de modulo, fallback de persistencia, ciclo de inicializacao, calculo de totais e comportamento offline. A regra e comentar o motivo e o fluxo quando ele nao for obvio; nomes de variaveis e JSX simples permanecem sem comentarios para evitar ruido.