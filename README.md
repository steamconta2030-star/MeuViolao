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
- Lição de mão direita com subida sem som, batida para cima isolada e primeira alternância entre baixo e cima.
- Diagramas com cordas abertas, cordas abafadas e numeração dos dedos.

### Identidade visual

- Direção própria de “jornada musical noturna”.
- Interface lúdica inspirada em princípios de aprendizagem gamificada, sem copiar marcas ou elementos do Duolingo.
- Cartões arredondados, botões com profundidade e cores ciano, violeta, amarelo e verde.
- Trilha musical alternada com estados de etapa atual, concluída e bloqueada.

### Regra de navegação guiada

- Toda ação que abre um exercício deve levar a tela imediatamente ao conteúdo ativo.
- A interface deve acompanhar perguntas, início da prática, próximas rodadas e conclusão.
- No celular, a próxima ação importante não deve exigir que a pessoa procure manualmente pela tela.

### Prática guiada

- Afinador cromático de seis cordas exibido ao entrar no aplicativo.
- Acesso permanente ao afinador pelo painel, sem interromper cada lição.
- Indicação visual de corda baixa, afinada ou alta, processada no navegador.
- Acompanhamento automático da próxima ação, sem trocar de corda sem confirmação.
- Avanço manual pelo botão de próxima corda após a afinação ser confirmada.
- Detecção ajustada por faixa de cada corda, clareza do sinal e estabilidade de frequência.
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
- Calibração pessoal de Em, G, C e D com cinco amostras por acorde.
- Comparação do acorde tocado com o perfil acústico do próprio usuário durante os exercícios.
- Diagnóstico pessoal com três testes de Em, G, C e D, percentual de acerto e identificação de confusões.
- Diagnóstico protegido por contagem regressiva, limiar de ruído e validação do som sustentado em várias leituras.
- Ruídos e capturas instáveis são rejeitados sem contabilizar uma tentativa.
- A validação usa uma janela fixa de ataque e sustentação, com maioria consistente entre leituras válidas.
- Quando uma captura é rejeitada, a interface informa se faltou sustentação, consistência, compatibilidade ou separação entre acordes.

> O áudio não é gravado nem enviado ao servidor. O reconhecimento ainda é assistivo: resultados incertos não retiram vidas nem impedem a conclusão.

## Calibração pessoal de acordes

A primeira versão da calibração pessoal está implementada para adaptar o reconhecimento ao violão, celular e ambiente de cada usuário.

### Fluxo implementado

1. Abrir a calibração pelo painel.
2. Afinar o violão antes de começar.
3. Tocar cinco amostras claras de Em, G, C e D.
4. Rejeitar automaticamente silêncio, ruído e amostras instáveis.
5. Criar uma assinatura média das frequências para cada acorde.
6. Comparar o acorde pedido com os outros três perfis pessoais.
7. Salvar o perfil localmente e permitir refazer a calibração quando necessário.
8. Usar automaticamente o perfil nos exercícios seguintes.

### Dados e privacidade

- O áudio bruto não será gravado nem enviado ao servidor.
- Serão guardadas somente características numéricas das frequências captadas.
- A primeira versão salvará o perfil localmente no aparelho.
- Uma futura sincronização entre aparelhos só será adicionada com consentimento claro do usuário.

### Critérios iniciais de qualidade

- Cada acorde precisa ter várias amostras consistentes antes de ser aceito.
- O sistema deve continuar ignorando silêncio e ruído ambiente.
- A calibração deve diferenciar Em, G, C e D no aparelho usado no teste.
- Resultados incertos continuam sem retirar vidas ou bloquear a conclusão do exercício.
- Batidas para baixo e para cima devem ser testadas separadamente.

### Estado técnico

- Tela de captura guiada concluída.
- Perfil local com as quatro assinaturas concluído.
- Comparação pessoal integrada aos exercícios.
- Diagnóstico do perfil integrado ao painel, sem alterar XP ou progresso.
- Próximo passo: testar e ajustar os limites em diferentes celulares, violões e ambientes.

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

- Testar e refinar a calibração pessoal de Em, G, C e D com som real.
- Validar e calibrar o afinador em diferentes celulares e ambientes.
- Refinar os limites de reconhecimento com os resultados do diagnóstico pessoal.
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
