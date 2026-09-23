# workan

Aplicação de gestão de fluxos de trabalho em quadros Kanban. Cada quadro possui etapas, responsáveis, cards e campos personalizados por etapa.

## Tecnologias

As equipes usam a rota `/api/teams`, a coleção `teams` e o campo `sharedTeamIds` nos quadros. Na primeira inicialização após a atualização, a API migra os dados antigos mantendo os IDs e os compartilhamentos. A coleção anterior é mantida como cópia de segurança, e a migração concluída não é repetida.

- Web (`web/`): React + Vite
- API (`api/`): Express + Mongoose
- Banco de dados: MongoDB

## Organização da API

- `src/server.js`: inicialização do banco, exemplos e servidor HTTP.
- `src/app.js`: montagem do Express, sem conectar ao banco ao importar.
- `src/config/`: variáveis de ambiente, conexão e execução das migrações.
- `src/routes/`: endpoints separados por recurso.
- `src/middleware/`: autenticação, autorização e tratamento de erros.
- `src/services/`: operações e validações compartilhadas pelas rotas.
- `src/models/`: modelos separados por domínio; `src/models/index.js` reúne as exportações.
- `src/utils/`: preparação dos cards e utilitários de vínculos de equipes.
- `src/validations/`: validações de etapas, transições e permissões dos cards.
- `src/example/`: dados e inicialização dos exemplos, isolados do restante da API.

Execute os testes com `npm test --prefix api`. Os testes HTTP usam a aplicação sem iniciar o banco; o teste de integração com MongoDB exige `TEST_MONGODB_URI` apontando para um banco de teste vazio.

## Executar

1. Instale as dependências:
   `npm install && npm run install:all`
2. Copie `api/.env.example` para `api/.env` e ajuste a conexão MongoDB.
3. Rode `npm run dev`.
4. Acesse `http://localhost:5173`.

Na inicialização, a API cria apenas equipes e quadros de exemplo, sem usuários, membros ou cards de demonstração. Os dados existentes são preservados. Chaves antigas de exemplos são normalizadas sem recriar os quadros.

Quando não há usuários no banco, a inicialização cria um **superadmin** ativo, sem equipe, separado dos exemplos. O acesso padrão é `admin@workan.local` com senha `Workan@2026!`. Configure `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD` em `api/.env` para personalizá-lo. A senha é armazenada em hash bcrypt. Se já houver qualquer usuário, essa criação é ignorada e nenhuma conta ou senha existente é alterada. Defina um `JWT_SECRET` próprio.

## Executar com Docker

Os serviços são `web`, `api` e `database`, com os contextos de build em `web/` e `api/`.
A logo original fica em `web/public/workan-logo.svg`; a variante horizontal usada na interface mantém os desenhos e recorta apenas as margens.

Instalações anteriores: o projeto Compose agora se chama `workan`, e o banco padrão também. O novo volume `workan_database_data` não reutiliza os dados de `procmap_mongodb_data` automaticamente; migre os dados antes de substituir uma instalação existente.

É necessário ter Docker Engine com Docker Compose instalado.

```bash
docker compose up --build
```

A aplicação estará disponível em `http://localhost:8080`. A API e o MongoDB ficam acessíveis apenas pela rede interna do Compose. Os dados do banco são preservados no volume `database_data`.

Para acompanhar os serviços:

```bash
docker compose logs -f
```

Para encerrar sem apagar os dados:

```bash
docker compose down
```

Para também remover o volume do MongoDB e todos os dados persistidos:

```bash
docker compose down --volumes
```

Novos usuários e o botão **Resetar senha** usam `DEFAULT_USER_PASSWORD` (padrão: `Workan@2026!`). Administradores e superadmins não pertencem a equipes.

Ao iniciar a API, a migração converte os quadros existentes para `steps`, preservando cards e histórico, e remove os antigos códigos de equipe e campos de função.

Os exemplos ficam isolados em `api/src/example/` (seed e associações de equipes) e `web/src/example/` (dados estáticos de referência). Os componentes da interface usam os dados da API; não dependem desses exemplos.
