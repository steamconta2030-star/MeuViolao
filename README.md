# Meu Violão

Aplicativo de prática pessoal de violão, reconstruído do zero em pequenas ondas.

## Tecnologia

- React 19 e TypeScript
- Vite
- Tailwind CSS
- Supabase para autenticação e persistência
- Lucide para ícones

## Rodar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

O projeto funciona sem Supabase durante a fundação. Quando o backend for conectado, use somente a URL e a chave publicável no cliente. Nunca coloque uma chave secreta ou `service_role` em variáveis `VITE_*`.

## Ondas iniciais

1. Fundação técnica
2. Autenticação
3. Painel de prática
4. XP e níveis
5. Meta e missões diárias
