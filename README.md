# 3D CutLabs - Gaming Collectibles Store

Loja online especializada em action figures 3D e stencils de jogos, com foco em personagens de MMORPGs e jogos menos populares.

## 🚀 Características

- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **Backend**: Node.js, Express.js
- **Banco de Dados**: MongoDB
- **Autenticação**: Google OAuth 2.0
- **Pagamentos**: Mercado Pago
- **Hospedagem**: GitHub Pages (frontend) + Render (backend)
- **Domínio**: 3dcutlabs.com.br

## 🎯 Funcionalidades

### Para Clientes
- Navegação por categorias (Action Figures e Stencils)
- Sistema de carrinho de compras
- Login integrado com Google
- Cálculo automático de frete
- Checkout integrado com Mercado Pago
- Área do usuário com histórico de pedidos
- Gerenciamento de endereços

### Para Administradores
- Painel administrativo completo
- Gerenciamento de produtos
- Controle de estoque
- Acompanhamento de pedidos
- Gestão de usuários

## 🛠️ Tecnologias Utilizadas

### Frontend
- HTML5 semântico
- CSS3 com Grid e Flexbox
- JavaScript ES6+
- Google Sign-In API
- Mercado Pago SDK

### Backend
- Node.js
- Express.js
- MongoDB com Mongoose
- Multer para upload de arquivos
- CORS, Helmet para segurança

## 📦 Estrutura do Projeto
gaming-collectibles/
├── Frontend (GitHub Pages)
│   ├── HTML pages
│   ├── CSS styles
│   ├── JavaScript modules
│   └── Assets
└── Backend (Render)
├── API endpoints
├── Models
└── Uploads
## 🚀 Como Executar

### Frontend
1. Clone o repositório
2. Abra o index.html no navegador
3. Ou acesse: https://odddcreator.github.io/gaming-collectibles/

### Backend
1. Clone o repositório da API
2. Instale as dependências: `npm install`
3. Configure as variáveis de ambiente
4. Execute: `npm start`

## 🔧 Configuração

### Variáveis de Ambiente
Crie um arquivo `.env` na pasta `api/` com:

```env
MONGODB_URI=sua_string_de_conexao_mongodb
GOOGLE_CLIENT_ID=seu_client_id_google
MP_PUBLIC_KEY=sua_public_key_mercadopago
MP_ACCESS_TOKEN=seu_access_token_mercadopago
