## FASE 1 — OBRIGATÓRIO ANTES DE LIGAR O SISTEMA

> ⚠️ Se o sistema entrar no ar sem estas tarefas, teremos que migrar dados manualmente depois — processo caro, arriscado e demorado.

---

### 1.1 Desmembrar a mega coleção `operational-data`

**Onde está:** Utilizada em `FormPanel.jsx`, `DashboardPanel.jsx`, `RecordsPanel.jsx`, `BiUpdateCalendar.jsx` e `SystemManagementPanel.jsx`.

**O que acontece hoje:** Todos os registros de todas as atividades (Operação Ferrolho, Treinamento LLPP, Atualização de Documentos, Atualização de BIs, etc.) são salvos em uma **única coleção gigante** chamada `operational-data`, diferenciados apenas por um campo `activity`. Isso foge do padrão que adotamos em outros projetos, onde utilizamos uma lógica similar à relacional (cada assunto em sua própria "tabela").

**O que deve ser feito:** Criar coleções individuais por tipo de atividade. Exemplos:
- `registros-operacao-ferrolho`
- `registros-treinamento-llpp`
- `registros-atualizacao-documentos`
- `registros-atualizacao-de-bis`
- `registros-reunioes-treinamentos`
- (e uma para cada atividade existente)

**Por que não pode ficar para depois:** Se os usuários começarem a gravar dados na estrutura atual, cada registro irá para a "caixa única". Migrar milhares de registros depois para as coleções corretas exige script de migração, validação manual e risco de perda de dados.

---

### 1.2 Padronizar nomes das coleções no banco em português

**O que acontece hoje:** Os nomes das coleções e documentos no Firestore estão em inglês ou misturados:
- `operational-data`, `daily-activities`, `access-requests`, `form-configs`, `system-settings`, `users`, `projects`

Enquanto isso, os valores *dentro* dos documentos estão em português (`gerencia: 'planejamento'`, `activity: 'operacao-ferrolho'`).

**O que deve ser feito:** Ao criar as novas coleções separadas (item 1.1), já adotar a nomenclatura em português como padrão:
- `atividades-diarias` em vez de `daily-activities`
- `solicitacoes-acesso` em vez de `access-requests`
- `configuracoes-formulario` em vez de `form-configs`
- `configuracoes-sistema` em vez de `system-settings`
- `usuarios` em vez de `users`
- `projetos` em vez de `projects`
- `agregacoes` em vez de `aggregations`

**Por que não pode ficar para depois:** Mesmo motivo da tarefa anterior — se o banco começar a receber dados com os nomes atuais, renomear depois significa reescrever todos os documentos já salvos. É uma migração de banco inteira.

---

### 1.3 Padronizar nomes dos campos dos documentos em português

**O que acontece hoje:** Os campos dentro dos documentos misturam inglês e português no mesmo registro. Exemplo de um registro salvo:
- `gerencia` (português)
- `activity` (inglês)
- `timestamp` (inglês)
- `createdBy` (inglês)
- `data.caseSucesso` (português)
- `data.tipoDocumento` (português)
- `data.regional` (português)
- `targetRole` (inglês)

**O que deve ser feito:** Padronizar todos os campos em português:
- `activity` → `atividade`
- `timestamp` → `dataHora`
- `createdBy` → `criadoPor`
- `targetRole` → `perfilAlvo`
- `password` → `senha`
- `status` → pode manter (é universal)

**Por que não pode ficar para depois:** Se os dados começarem a ser gravados com os nomes de campo atuais, uma renomeação posterior exigirá reescrever cada documento individualmente no banco.

---

### 1.4 Fechar as regras do banco de dados (Firestore Rules)

**Onde está:** Arquivo `firestore.rules` na raiz do projeto.

**O que acontece hoje:** A regra atual é:
```
allow read, write: if true;
```
Isso significa que **qualquer pessoa na internet** que descubra o endereço do nosso banco pode ler, alterar ou apagar todos os dados, sem precisar de login.

**O que deve ser feito:** Reescrever as regras para:
- Permitir leitura e escrita **apenas** para usuários autenticados pelo Firebase Auth.
- Limitar o que cada perfil pode fazer (ex: apenas "Gestão da Qualidade" pode deletar registros em massa).

**Por que não pode ficar para depois:** Dados reais de produção com regra aberta é exposição direta. Antes de qualquer dado real entrar, o banco precisa estar protegido.

---

### 1.5 Criar a camada de Serviços (`/services`)

**Onde está o problema:** Em `FormPanel.jsx`, `DashboardPanel.jsx`, `RecordsPanel.jsx`, `BiUpdateCalendar.jsx` — todos esses arquivos fazem chamadas diretas ao Firestore (importam `collection`, `addDoc`, `onSnapshot` etc.).

**O que deve ser feito:** Criar uma pasta `src/services/` com arquivos dedicados à comunicação com o banco:
- `registrosService.js` → salvar, buscar, deletar e escutar registros.
- `usuariosService.js` → buscar dados de usuário, atualizar perfis.
- `dashboardService.js` → ler e atualizar estatísticas.

Todas as telas passam a chamar esses serviços em vez de acessar o Firebase diretamente.

**Por que não pode ficar para depois:** É a base para todas as tarefas acima funcionarem de forma organizada. Se as telas já estiverem chamando o Firestore diretamente quando o sistema entrar no ar, qualquer mudança futura no banco vai exigir alterar dezenas de arquivos em vez de um só. Quando formos migrar para outro banco de dados no futuro, vamos alterar **somente** os arquivos dentro de `/services` — nenhuma tela visual precisará ser tocada.

---

## FASE 2 — LOGO APÓS LIGAR O SISTEMA

> ⚠️ O sistema funciona sem estas correções, mas com brechas de segurança e lentidão. Deve ser atacado rapidamente.

---

### 2.1 Corrigir a brecha de login (bypass de autenticação)

**Onde está:** Arquivo `LoginPage.jsx`, dentro do bloco `catch` da função de login (por volta da linha 103).

**O que acontece hoje:** Se a autenticação do Firebase falhar (senha errada, conta inexistente), o sistema **ignora o erro** e libera o acesso assim mesmo, apenas verificando se o e-mail existe no banco. Na prática, qualquer pessoa que saiba um e-mail cadastrado consegue entrar sem saber a senha.

**O que deve ser feito:** Remover o trecho que faz o bypass. O login só deve ser liberado quando o Firebase Auth confirmar com sucesso que o e-mail e a senha estão corretos. Se falhar, deve mostrar mensagem de erro e bloquear a entrada.

**Por que:** A tela de login é uma porta decorativa se essa brecha permanecer — não impede ninguém de entrar.

---

### 2.2 Ocultar credenciais do código-fonte

**Onde está:** Arquivo `firebaseConfig.js`.

**O que acontece hoje:** As chaves do projeto Firebase (apiKey, projectId, appId, etc.) estão escritas diretamente no código. Qualquer pessoa com acesso ao repositório ou ao código do navegador consegue copiar essas chaves.

**O que deve ser feito:** Mover todas as chaves para um arquivo `.env` na raiz do projeto e referenciá-las via `import.meta.env.VITE_*` (padrão do Vite). Adicionar o `.env` ao `.gitignore` para que nunca seja subido ao repositório.

**Por que:** É uma prática padrão de segurança. As chaves ficam apenas na máquina do desenvolvedor e no servidor de deploy, nunca expostas no código.

---

### 2.3 Remover senha fixa do sistema no código

**Onde está:** Arquivo `ManagementSystem.jsx`, na função `handleSystemPasswordSubmit`.

**O que acontece hoje:** A senha de acesso à área de administração do sistema está escrita em texto puro no código. Qualquer pessoa que abra o código-fonte pelo navegador (ou tenha acesso ao repositório) pode ver essa senha.

**O que deve ser feito:** Mover essa validação para o lado do servidor (Firebase Auth ou uma regra de role no Firestore), de modo que a senha nunca apareça no código do navegador.

**Por que:** Uma senha no código-fonte não é uma proteção real — é apenas uma ilusão de segurança.

---

### 2.4 Criar documento de estatísticas para o Dashboard

**Onde está:** `DashboardPanel.jsx`, no `useEffect` que faz `onSnapshot(collection(db, 'operational-data'))`.

**O que acontece hoje:** Toda vez que o Dashboard é aberto, o sistema **baixa 100% dos registros de todas as atividades** para contar gráficos e estatísticas dentro do navegador. Com 500 registros, são 500 leituras. Com 5.000, são 5.000 leituras — a cada abertura de tela.

**O que deve ser feito:** Criar um documento único no Firestore (ex: `agregacoes/estatisticas-dashboard`) que armazene os totais pré-calculados (total de registros, contagem por regional, taxa de sucesso do Ferrolho, etc.). Esse documento deve ser atualizado automaticamente toda vez que um registro for criado, editado ou excluído. O Dashboard passa a ler **1 documento** em vez de milhares.

**Por que:** É a maior fonte de lentidão e custo do sistema. A diferença é de N leituras para 1 leitura a cada abertura de tela.

---

### 2.5 Otimizar a tela de Registros com paginação

**Onde está:** `RecordsPanel.jsx`, no `useEffect` que também faz `onSnapshot(collection(db, 'operational-data'))`.

**O que acontece hoje:** Mesma situação do Dashboard — a tela de registros baixa 100% dos dados sem filtro e sem paginação.

**O que deve ser feito:**
- Após o desmembramento (item 1.1), consultar apenas a coleção da atividade selecionada pelo filtro do usuário.
- Implementar **paginação** (carregar 50 registros por vez, com botão "Carregar mais").

**Por que:** Evita travamentos no navegador quando o volume de dados crescer e reduz custos.

---

## FASE 3 — COM O SISTEMA JÁ RODANDO

> ✅ Não afeta dados gravados. Melhora a organização do código e a experiência de navegação.

---

### 3.1 Implementar React Router (Navegação Real)

**Onde está o problema:** Arquivo `ManagementSystem.jsx` — ele sozinho decide qual tela mostrar através de uma variável `activeView` e um bloco gigante de condicionais. Não existem URLs reais — tudo funciona como se fosse uma página só.

**O que deve ser feito:** Instalar o pacote `react-router-dom` e criar rotas reais. Exemplo:
- `/` → Tela de Login
- `/menu` → Menu Principal
- `/formulario/:gerencia/:atividade` → Formulário
- `/dashboard` → Painel de Gráficos
- `/registros` → Tela de Registros
- `/admin/usuarios` → Gestão de Usuários
- `/admin/sistema` → Configurações do Sistema

**Por que:**
- Permite usar o botão **"Voltar"** do navegador (hoje ele sai do sistema inteiro).
- Permite **compartilhar links** de telas específicas no Teams.
- Reduz o tamanho e a complexidade do `ManagementSystem.jsx`, que hoje tem mais de 400 linhas controlando tudo sozinho.

---

### 3.2 Separar Pages de Components

**Onde está o problema:** Pasta `src/components/` contém 27 arquivos misturados — desde telas inteiras como o Dashboard até peças pequenas como botões.

**O que deve ser feito:** Criar a pasta `src/pages/` e mover para lá os arquivos que representam telas completas (LoginPage, MenuPage, DashboardPanel, RecordsPanel, FormPanel, etc.). Na pasta `src/components/` ficam apenas peças reutilizáveis (RecordCard, FormField, NavigationPanel, e a subpasta `ui/`).

**Por que:** É o padrão de organização em projetos React. Facilita encontrar onde mexer quando surge uma demanda.

---

### 3.3 Padronizar nomes de arquivos e pastas do projeto

**O que acontece hoje:** Os nomes dos arquivos e pastas do projeto não seguem um padrão claro. Alguns nomes são genéricos ou pouco descritivos, dificultando a localização rápida do que cada arquivo faz.

**O que deve ser feito:**
- Renomear os arquivos utilizando **português** como idioma padrão, seguindo a mesma lógica aplicada ao banco de dados.
- Adotar nomes mais **intuitivos e autoexplicativos**, para que qualquer membro da equipe consiga entender a função do arquivo apenas pelo nome, sem precisar abri-lo.
- Organizar os arquivos nas **pastas corretas** conforme sua responsabilidade (`pages/`, `components/`, `services/`, `contexts/`, `utils/`, `config/`), evitando que tudo fique misturado em um único diretório.

**Por que:** Nomes claros em português combinados com uma estrutura de pastas organizada reduzem o tempo que o desenvolvedor gasta procurando onde fazer uma alteração. Quando alguém novo entra no projeto, consegue navegar e entender a estrutura sem depender de explicações externas.

---

### 3.4 Criar Contexto Global de Autenticação (`/contexts`)

**Onde está o problema:** O `ManagementSystem.jsx` busca os dados do usuário logado e repassa para cada tela via propriedades (`currentUser={currentUser}`), criando uma cadeia de dependências manual.

**O que deve ser feito:** Criar `src/contexts/AuthContext.jsx` usando a Context API do React. Esse contexto armazena as informações do usuário logado uma vez só e qualquer tela do sistema pode acessar diretamente, sem precisar receber por propriedade.

**Por que:** Elimina a necessidade de passar `currentUser` manualmente para mais de 10 componentes diferentes. Qualquer tela nova que for criada no futuro já terá acesso automático ao usuário logado.

---

## FASE 4 — MELHORIAS CONTÍNUAS

> ✅ Pode ser feito em qualquer sprint futuro sem impacto nos dados ou no funcionamento.

---

### 4.1 Tornar feriados e dias úteis dinâmicos

**Onde está:** `BiUpdateCalendar.jsx`, linhas 10 a 80 (objeto `holidaysByYear`) e linha 118 (constante `TOTAL_YEARLY_WORK_DAYS_2026 = 260`).

**O que acontece hoje:** Os feriados nacionais estão escritos manualmente no código apenas para os anos de 2026 a 2030. A partir de 2031, o sistema não reconhecerá nenhum feriado e vai contar todos os dias como úteis.

**O que deve ser feito:**
- Mover a lista de feriados para uma coleção no Firestore (ex: `configuracoes-sistema/feriados`) com cadastro pela tela de administração, **ou** utilizar um pacote NPM de feriados brasileiros.
- Criar uma função que calcule dinamicamente o total de dias úteis do ano.

**Por que:** Sem isso, os relatórios de metas de BIs vão gerar números incorretos a cada virada de ano (e totalmente errados a partir de 2031).

---

### 4.2 Unificar FormPanel e FormPanelFixed

**Onde está:** `FormPanel.jsx` e `FormPanelFixed.jsx` — ambos com mais de 900 linhas e praticamente o mesmo conteúdo.

**O que deve ser feito:** Manter apenas um dos dois e ajustar todas as referências.

**Por que:** Manter dois arquivos iguais significa que toda correção precisa ser feita duas vezes. Na prática, um sempre fica desatualizado.

---

### 4.3 Centralizar funções e listas repetidas

**Onde está:**
- A função `parseDurationToMinutes` está copiada em 4 arquivos diferentes (`DailyActivitiesPanel`, `ProjectsPanel`, `ControlOverviewPanel`, `MyCalendar`).
- A lista `responsibleList` (14 nomes de colaboradores) está copiada nesses mesmos 4 arquivos.
- O mapa `roleIcons` está duplicado em `ManagementSystem.jsx` e `UserManagementPanel.jsx`.

**O que deve ser feito:** Mover tudo para `src/utils/` ou `src/config/` e importar de um lugar só.

**Por que:** Quando um colaborador entrar ou sair da equipe, a atualização será feita em **1 lugar** em vez de 4.

---

### 4.4 Remover arquivos não utilizados

**Onde está:** `CallToAction.jsx`, `HeroImage.jsx`, `WelcomeMessage.jsx`.

**O que deve ser feito:** Deletar esses 3 arquivos.

**Por que:** São templates que vieram com o projeto inicial, não são utilizados em nenhuma tela, e geram confusão no projeto.

---

## Resumo das Fases

```
┌─────────────────────────────────────────────────────────┐
│  FASE 1 — ANTES DE LIGAR O SISTEMA                      │
│  (Banco de Dados + Idioma + Segurança + Services)        │
│  ⚠️ Se não fizer agora, vai precisar migrar dados        │
│     depois — processo caro e arriscado.                  │
├─────────────────────────────────────────────────────────┤
│  FASE 2 — LOGO APÓS LIGAR                               │
│  (Correções de login, credenciais, performance)          │
│  ⚠️ Sistema funciona, mas com brechas e lentidão.       │
├─────────────────────────────────────────────────────────┤
│  FASE 3 — COM O SISTEMA JÁ RODANDO                      │
│  (Router, Pastas, Context, nomes de arquivos)            │
│  ✅ Não afeta dados. Melhora vida do desenvolvedor.      │
├─────────────────────────────────────────────────────────┤
│  FASE 4 — MELHORIA CONTÍNUA                             │
│  (Calendário, limpeza de duplicados)                     │
│  ✅ Pode ser feito em qualquer sprint futuro.            │
└─────────────────────────────────────────────────────────┘
```

---


