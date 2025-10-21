# PORTA'M - Sistema de validació per al transport públic
## Servidor d'enllaç entre els clients i la base de dades


Servidor web fet amb Express.js integrat amb base de dades de Supabase.
Crides amb punts d'accés d'API REST (GET, POST, PUT, DELETE).

## Inicialització

### 1. Instal·lació de dependències

```bash
npm install
```

### 2. Variables d'entorn

Cal un fitxer `.env` a l'arrel del projecte amb le credencials de Supabase:

```env
SUPABASE_URL=supabase_project_url
SUPABASE_ANON_KEY=supabase_anon_key
PORT=3000
```

## Posar en marxa el servidor

### Mode de desenvolupament (amb reinici automàtic)
```bash
npm run dev
```

### Mode de producció
```bash
npm start
```

## Guia de codis HTTP:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error