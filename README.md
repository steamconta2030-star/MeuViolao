# Meu Violão

Aplicativo web de prática pessoal de violão, construído em pequenas ondas para ensinar, acompanhar a evolução e transformar o estudo diário em uma jornada gamificada.

## Estado atual

O projeto já possui uma fundação funcional publicada e está na fase de exercícios práticos guiados com microfone.

### Conta e progresso

- Cadastro, confirmação de e-mail, login e logout.
- Dados separados por usuário.
- Registro de minutos de prática.
- Meta diária, sequência de dias, XP e níveis.
- Missões diárias.
- Progresso e melhor quantidade de estrelas por exercício.

### Jornada de aprendizagem

- Etapas desbloqueadas conforme os exercícios são concluídos.
- Exercícios com perguntas, vidas e estrelas.
- Rodadas práticas estruturadas por compassos e voltas completas.
- Progressão inicial: Em → G → C → D.
- Lição de mão direita com pulso firme, movimento contínuo e primeira alternância entre baixo e cima.
- Diagramas com cordas abertas, cordas abafadas e numeração dos dedos.

### Identidade visual

- Direção própria de “jornada musical noturna”.
- Interface lúdica inspirada em princípios de aprendizagem gamificada, sem copiar marcas ou elementos do Duolingo.
- Cartões arredondados, botões com profundidade e cores ciano, violeta, amarelo e verde.
- Trilha musical alternada com estados de etapa atual, concluída e bloqueada.

### Prática guiada

- Afinador cromático de seis cordas exibido ao entrar no aplicativo.
- Acesso permanente ao afinador pelo painel, sem interromper cada lição.
- Indicação visual de corda baixa, afinada ou alta, processada no navegador.
- Acompanhamento automático da tela e avanço para a próxima corda afinada.
- Metrônomo em 40, 60 e 80 BPM.
- Contagem regressiva 3–2–1.
- Uma batida para baixo em cada tempo para iniciantes.
- Destaque e acompanhamento automático do acorde ativo.
- Rolagem horizontal e vertical adaptada para celular.
- Botão de próxima rodada próximo ao indicador de conclusão.

### Microfone

- Captação executada localmente no navegador.
- Medidor de intensidade do som.
- Detecção de ataques das cordas.
- Filtro para reduzir falsos positivos causados pelo metrônomo.
- Confirmação das batidas percebidas.
- Reconhecimento experimental do acorde destacado entre Em, G, C e D.

> O áudio não é gravado nem enviado ao servidor. O reconhecimento ainda é assistivo: resultados incertos não retiram vidas nem impedem a conclusão.

## Tecnologias

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Supabase Auth e Postgres
- Web Audio API
- Lucide React
- Vercel

## Estrutura principal

```text
src/
├── components/          # autenticação, painel, jornada e exercícios
├── hooks/               # sessão e dados de prática
├── lib/supabase.ts      # cliente público do Supabase
├── App.tsx
└── main.tsx

supabase/
└── migrations/          # estrutura e políticas do banco
```

## Banco de dados

As tabelas atuais são:

- `profiles`: meta diária e XP do usuário.
- `practice_sessions`: sessões e minutos praticados.
- `exercise_progress`: conclusões e melhor quantidade de estrelas.

As tabelas públicas usam Row Level Security (RLS). Cada usuário autenticado pode acessar somente os próprios registros.

## Configuração local

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar `.env.local`

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
```

Use apenas a chave publicável no navegador. Nunca coloque `service_role`, secret key ou outra credencial privada em uma variável `VITE_*`.

### 3. Executar

```bash
npm run dev
```

## Validação

```bash
npm run lint
npm run build
```

Todo checkpoint deve passar no lint e no build antes de ser publicado.

## Publicação

A branch `main` está conectada à Vercel. Atualizações funcionais são agrupadas em checkpoints pequenos e reversíveis para reduzir deploys e facilitar rollback.

## Próximas ondas

- Validar e calibrar o afinador em diferentes celulares e ambientes.
- Calibrar o reconhecimento de Em, G, C e D em diferentes aparelhos.
- Transformar o reconhecimento em feedback de ritmo e acorde.
- Adicionar novos padrões de batida de forma progressiva.
- Expandir a jornada com novas etapas e exercícios.
- Melhorar recompensas, combos, tentativas e desbloqueios.
- Levar a nova linguagem visual para as telas internas dos exercícios.

## Regra de manutenção do README

O README deve ser revisado em cada checkpoint funcional. Ao concluir uma nova onda:

1. Atualizar **Estado atual** com a funcionalidade entregue.
2. Ajustar **Tecnologias** e **Banco de dados** quando houver mudanças.
3. Mover o item concluído para a seção correspondente.
4. Atualizar **Próximas ondas**.
5. Nunca adicionar senhas, tokens ou chaves privadas.
