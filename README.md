# App de Vistoria de Segurança Eletrônica em Condomínios

Aplicativo web feito em **React + Vite** para realizar vistorias técnicas de segurança eletrônica em condomínios, com foco em uso em campo por técnicos, consultores e equipes de manutenção.

O app funciona localmente com frontend React/Vite e backend Express/SQLite. Os dados principais são salvos em `database.sqlite`; quando a API estiver indisponível, o frontend usa um fallback em `localStorage`. As vistorias também podem ser exportadas em **JSON**, **relatório TXT** e **fotos organizadas em pasta**.

> **Documentação:** consulte [docs/GUIA-TECNICO.md](docs/GUIA-TECNICO.md) para a arquitetura, o fluxo de dados, o backend SQLite, o fallback offline, o PWA e as limitações conhecidas. Para entender o sistema desde a criação até a execução, consulte também [docs/PASSO-A-PASSO-CODIGO.md](docs/PASSO-A-PASSO-CODIGO.md).

---

## 1. Principais recursos

- Login local de usuários.
- Cadastro de condomínios.
- Cadastro de usuários e perfis.
- Cadastro de dados da empresa e logo.
- Registro de vistoria por área e equipamento.
- Checklist técnico padrão.
- Status por item: **OK**, **Atenção** e **Crítico**.
- Prioridade por item: **Baixa**, **Média**, **Alta** e **Urgente**.
- Registro de problema encontrado.
- Registro de ação recomendada.
- Quantidade, valor unitário e orçamento estimado.
- Captura/anexo de fotos pelo celular.
- Painel com indicadores da vistoria.
- Salvamento automático no navegador.
- Exportação dos dados em `vistoria.json`.
- Exportação de relatório em `relatorio.txt`.
- Exportação das fotos em pasta local, quando o navegador permitir.
- Fallback com download separado de JSON, TXT e fotos.
- Exportação em PDF usando a função imprimir/salvar como PDF do navegador.
- Layout responsivo para computador e celular.

---

## 2. Backend e banco de dados local

O projeto inclui um backend Node.js com SQLite. O comando recomendado inicia o backend e o frontend juntos:

```bash
npm run dev
```

Esse comando executa:

- Express em `http://localhost:4000`.
- Vite em `http://localhost:5173`.
- API em `http://localhost:4000/api`.
- Banco SQLite em `database.sqlite`.
- Arquivos enviados em `uploads/`.

O frontend chama `/api` e o proxy do Vite encaminha as requisições para o Express. O backend salva clientes, equipamentos, mão de obra, vistorias e agendamentos em `database.sqlite`.

Para iniciar somente o backend ou somente o frontend:

```bash
npm run server
npm run dev:local
```

Se a API estiver indisponível, `src/services/api.js` executa as operações CRUD no `localStorage`. Esse fallback não sincroniza automaticamente os dados locais com o SQLite.

## 3. Estrutura do projeto

```text
vistoria-condominios/
├── index.html
├── package.json
├── vite.config.js
├── jsconfig.json
├── .gitignore
├── README.md
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── index.css
    ├── lib/
    │   └── utils.js
    └── components/
        └── ui/
            ├── button.jsx
            └── card.jsx
```

---

## 4. Pré-requisitos

Antes de rodar o projeto, instale:

- **Node.js** versão 20 ou superior.
- **npm**, que normalmente já vem junto com o Node.js.
- Um editor de código, como **Visual Studio Code**.
- Navegador moderno, preferencialmente **Google Chrome** ou **Microsoft Edge**.

Para verificar se o Node.js e o npm estão instalados:

```bash
node -v
npm -v
```

---

## 5. Instalação

Depois de baixar e extrair o arquivo ZIP do projeto, abra o terminal dentro da pasta:

```bash
cd vistoria-condominios
```

Instale as dependências:

```bash
npm install
```

---

## 6. Rodando no computador

Para iniciar o servidor local de desenvolvimento:

```bash
npm run dev
```

O terminal deve mostrar um endereço parecido com:

```text
http://localhost:5173
```

Abra esse endereço no navegador.

---

## 7. Login de teste

Use o usuário padrão:

```text
E-mail: deilson@app.com
Senha: 1234
```

Também existe um usuário técnico de teste:

```text
E-mail: tecnico@app.com
Senha: 1234
```

---

## 8. Rodando no celular

Para acessar o app pelo celular durante o desenvolvimento, rode no computador:

```bash
npm run dev
```

O script inicia o backend e o Vite ouvindo na rede local. Descubra o IPv4 do computador com:

```powershell
Get-NetIPAddress -AddressFamily IPv4
```

No celular, abra o endereço usando o IPv4 do computador e a porta `5173`, por exemplo:

```text
http://10.1.2.216:5173
```

No celular:

1. Conecte o celular à mesma rede Wi-Fi do computador.
2. Inicie o app com `npm run dev`.
3. Descubra o IPv4 do computador.
4. Abra `http://IP_DO_COMPUTADOR:5173` no navegador do celular.
5. Faça login e teste o cadastro e a câmera.

Se não abrir, permita o Node.js no Firewall do Windows e confirme que o celular não está usando uma rede de convidados. O computador e o celular precisam conseguir se comunicar entre si.

---

## 9. Como usar o app

### 8.1 Aba Vistoria

Nesta aba você preenche os dados principais:

- Condomínio.
- Responsável técnico.
- Endereço.
- Data.
- Síndico ou responsável.
- Telefone do síndico.
- Tipo de vistoria.
- Conclusão técnica.

Também é aqui que você adiciona novos registros de vistoria, informando:

- Área.
- Equipamento ou infraestrutura.
- Localização.
- Status.
- Prioridade.
- Quantidade.
- Valor unitário.
- Checklist técnico.
- Problema encontrado.
- Ação recomendada.
- Fotos.

### 8.2 Aba Registros

Mostra todos os itens vistoriados.

Permite:

- Consultar registros.
- Filtrar por status.
- Remover itens.
- Visualizar fotos.
- Ver orçamento por item.
- Conferir problema e ação recomendada.

### 8.3 Aba Painel

Mostra indicadores resumidos:

- Total de itens.
- Itens críticos.
- Itens em atenção.
- Itens OK.
- Total de fotos.
- Orçamento estimado.

### 8.4 Aba Admin

Permite gerenciar:

- Empresa e logo.
- Condomínios.
- Usuários.
- Assinaturas.
- Exportação e importação de arquivos locais.

---

## 10. Salvamento dos dados

O app salva automaticamente os dados no navegador usando armazenamento local.

Isso significa que:

- Os dados continuam disponíveis ao fechar e abrir o navegador.
- Os dados ficam salvos naquele aparelho/navegador.
- Se limpar o cache/dados do navegador, as informações podem ser perdidas.
- Por segurança, sempre exporte a vistoria ao finalizar o serviço.

---

## 11. Exportação da vistoria

Na aba **Admin**, use a seção **Arquivos locais**.

### 10.1 Salvar pasta da vistoria

Botão:

```text
Salvar pasta da vistoria
```

Quando o navegador permitir, o app solicitará uma pasta de destino e criará uma estrutura como esta:

```text
vistoria-2026-07-24-residencial-jardim-paulista/
├── vistoria.json
├── relatorio.txt
└── fotos/
    ├── item-001-foto-001.jpg
    ├── item-001-foto-002.jpg
    └── item-002-foto-001.jpg
```

### 10.2 Exportar JSON

Gera um arquivo como:

```text
vistoria-2026-07-24-residencial-jardim-paulista.json
```

Esse arquivo contém:

- Dados da empresa.
- Dados dos usuários.
- Dados dos condomínios.
- Dados da vistoria.
- Resumo da vistoria.
- Itens registrados.
- Caminhos das fotos exportadas.

### 10.3 Exportar fotos

Baixa as fotos individualmente com nomes padronizados:

```text
item-001-foto-001.jpg
item-001-foto-002.jpg
item-002-foto-001.jpg
```

### 10.4 Exportar PDF

O botão **Exportar PDF** usa a função de impressão do navegador.

Ao clicar:

1. A janela de impressão será aberta.
2. Selecione **Salvar como PDF**.
3. Escolha a pasta de destino.
4. Salve o laudo.

---

## 12. Importação de vistoria

Na aba **Admin**, clique em:

```text
Importar JSON
```

Selecione um arquivo `.json` exportado anteriormente.

Observação importante:

- O JSON restaura os dados da vistoria.
- As fotos só serão restauradas automaticamente se estiverem salvas dentro do próprio JSON em base64.
- No modelo atual, o JSON exportado aponta para os caminhos das fotos na pasta `fotos/`, portanto as imagens exportadas ficam preservadas como arquivos separados.

---

## 13. Estrutura do arquivo JSON

Exemplo simplificado:

```json
{
  "versao": "1.0",
  "exportadoEm": "2026-07-24T20:00:00.000Z",
  "pastaBase": "vistoria-2026-07-24-residencial-jardim-paulista",
  "empresa": {
    "nome": "Sua Empresa de Segurança",
    "telefone": "(11) 99999-9999",
    "email": "contato@suaempresa.com.br"
  },
  "vistoria": {
    "condominio": "Residencial Jardim Paulista",
    "endereco": "São Paulo - SP",
    "responsavel": "Deilson Rodrigues",
    "data": "2026-07-24",
    "tipo": "Preventiva"
  },
  "itens": [
    {
      "area": "Portaria",
      "equipamento": "Câmera CFTV",
      "localizacao": "Entrada principal",
      "status": "critico",
      "prioridade": "Alta",
      "problema": "Imagem com ruído e perda intermitente de sinal.",
      "acao": "Substituir conector e avaliar troca da câmera.",
      "fotos": [
        {
          "nomeArquivo": "item-001-foto-001.jpg",
          "caminho": "fotos/item-001-foto-001.jpg"
        }
      ]
    }
  ]
}
```

---

## 14. Gerar versão de produção

Para gerar os arquivos finais:

```bash
npm run build
```

Isso cria a pasta:

```text
dist/
```

Para testar a versão final:

```bash
npm run preview
```

---

## 15. Publicação

A interface compilada pode ser publicada em:

- Vercel, Netlify, Cloudflare Pages ou servidor próprio, quando o backend for hospedado separadamente.
- Um servidor próprio que também execute `server.js`, para manter API, SQLite e uploads no mesmo ambiente.

Para usar clientes, vistorias, agendamentos e uploads com persistência, o backend Express precisa estar disponível e a variável `VITE_API_BASE` pode apontar para a URL pública da API. Publicar apenas `dist/` mantém a interface acessível, mas não substitui o backend SQLite.

---

## 16. Limitações conhecidas

### 15.1 Salvamento direto em pasta

Nem todos os navegadores permitem salvar diretamente em uma pasta do aparelho.

Quando isso não for possível, o app faz o fallback:

- baixa o JSON;
- baixa o relatório TXT;
- baixa as fotos separadamente.

### 15.2 Fotos na importação

Como as fotos são exportadas como arquivos separados, o JSON importado não restaura automaticamente as imagens, a menos que as fotos estejam embutidas no JSON em base64.

### 15.3 Armazenamento local

O navegador pode limpar os dados locais se o usuário apagar cache, dados do site ou usar modo anônimo.

Por isso, recomenda-se exportar a vistoria ao final de cada atendimento.

---

## 17. Comandos úteis

Instalar dependências:

```bash
npm install
```

Rodar localmente:

```bash
npm run dev
```

Rodar para acesso pelo celular:

```bash
npm run dev
```

Gerar build:

```bash
npm run build
```

Testar build:

```bash
npm run preview
```

Executar testes de navegador:

```bash
npm run test:e2e
```

Os testes iniciam automaticamente o backend na porta `4000` e o Vite de teste na porta `5175`.

---

## 18. Próximas melhorias sugeridas

- Exportar tudo em arquivo `.zip` automaticamente.
- Restaurar fotos ao importar uma pasta completa.
- Adicionar assinatura desenhada na tela.
- Adicionar número do laudo.
- Adicionar campos de garantia e validade da proposta.
- Criar modelo visual de PDF mais profissional.
- Criar sincronização opcional com OneDrive, Google Drive ou servidor próprio.
- Adicionar autenticação real para produção.

---

## 19. Suporte operacional

Fluxo recomendado em campo:

1. Abrir o app no celular.
2. Fazer login.
3. Selecionar ou cadastrar o condomínio.
4. Registrar cada problema encontrado.
5. Tirar fotos pelo próprio app.
6. Revisar a aba **Registros**.
7. Preencher conclusão técnica.
8. Ir para **Admin**.
9. Clicar em **Salvar pasta da vistoria**.
10. Enviar ou arquivar a pasta gerada.

---

## 20. Licença

Projeto interno/personalizado para uso em vistorias técnicas.
#   C - D S R - 0 1 - - - A P L I C A T I V O - v i s t o r i a - c o n d o m i n i o s  
 