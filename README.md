# GraçaSync V1

PWA multi-tenant em português para comunidade, voluntariado e gestão de igrejas. React + TypeScript + Vite + Supabase. Sem integração com WorshipSync.

## Executar

```sh
npm ci
npm run dev
npm run build
```

O projeto está conectado ao Supabase `oywdpselqqzvfqmwnfxv`. A chave presente no cliente é **publishable**, não uma credencial administrativa. Autorização é aplicada pelo Postgres com RLS e funções validadas. Nunca incluir service_role no frontend.

## Primeiro acesso

1. Criar conta e confirmar o e-mail.
2. Escolher **Cadastrar minha igreja** ou entrar pelo código compartilhado pela igreja.
3. Quem cria a igreja recebe o cargo Administrador e configura nome, mensagem e endereço em Minha conta.
4. Administrador ou pastor atribui cargos em Pessoas. Uma conta pertence a uma única igreja e pode participar de um único ministério, após orientação pastoral. Quero servir abre uma conversa no WhatsApp configurado pela igreja, sem inscrever automaticamente. Pastores/administradores definem o vínculo em Pessoas; isso não concede cargo administrativo.

## DEV

`thaleskaleby24@gmail.com` tem acesso DEV global **somente depois da confirmação do e-mail**. A verificação ocorre no banco, contra `auth.users`; não confia em metadata enviada pelo usuário, nem em comparação no navegador. Não criamos conta, senha ou confirmação artificial para este e-mail. O seletor em Minha conta permite ao DEV atender qualquer igreja sem vincular a conta a várias igrejas. Outros cargos não conseguem conceder DEV.

## Permissões

| Perfil                 | Comunidade / agenda / células       | Ministério             | Tarefas                                 | Pessoas e cargos            | Financeiro           | Configurar igreja |
| ---------------------- | ----------------------------------- | ---------------------- | --------------------------------------- | --------------------------- | -------------------- | ----------------- |
| Participante           | Consultar, confirmar presença       | Conversar com pastores | Somente as atribuídas, concluir/reabrir | Próprio perfil              | Não                  | Consultar         |
| Líder                  | Gerenciar conteúdo                  | Gerenciar              | Gerenciar                               | Consultar pessoas           | Não                  | Consultar         |
| Financeiro             | Consultar                           | Conversar com pastores | Próprias                                | Próprio perfil              | Gerenciar e exportar | Consultar         |
| Pastor / Administrador | Gerenciar                           | Gerenciar              | Gerenciar                               | Consultar e atribuir cargos | Gerenciar e exportar | Editar            |
| DEV                    | Acesso a todas as igrejas e módulos | Completo               | Completo                                | Completo                    | Completo             | Completo          |

A última conta Administrador não pode ser rebaixada. O financeiro registra entradas e saídas; não realiza pagamentos ou transferências. Alterações nos principais registros são auditadas. O histórico financeiro possui leitura restrita.

## Banco

As migrações em `supabase/migrations` correspondem ao esquema aplicado no projeto remoto. Antes de reaplicar, conferir o histórico de migrações do Supabase para evitar duplicação. Todas as dez tabelas têm RLS. As relações compostas impedem referências entre igrejas. Escrita em perfis passa exclusivamente por RPCs que validam o usuário e suas permissões. A criação da igreja e o vínculo do fundador são atômicos; o bloqueio de perfil impede entrada simultânea em duas igrejas.

`tests/database.sql` testa isolamento, bloqueio de promoção, papel financeiro, limite de igreja/ministério, tarefas e DEV com e sem confirmação, dentro de uma transação revertida. Executar em projeto de testes; o teste cria temporariamente o e-mail reservado e exige que ele ainda não exista.

## Testes de interface

```sh
npx playwright install chromium
npm test
```

Os testes de interface iniciam o Vite automaticamente. O fluxo real usa duas contas temporárias provisionadas pelo responsável no Supabase e o arquivo `/tmp/graca-fixtures.json`; sem esse arquivo, é ignorado. Não colocar senhas ou sessões no repositório. O arquivo contém `a` e `b` (UUIDs) e `password`; e-mails dos testes: `graca-e2e-a@example.invalid` e `graca-e2e-b@example.invalid`.

## Publicação

Importar este repositório no Vercel como Vite. O `vercel.json` define build, SPA e cabeçalhos. Nenhuma variável secreta é necessária para o frontend.

Após definir a URL pública, em Supabase → Authentication → URL Configuration, configurar **Site URL** e **Redirect URLs** para essa URL. Manter confirmação de e-mail habilitada. Para cadastro público sem a limitação do serviço padrão do Supabase, configurar SMTP próprio no painel. Essas configurações de autenticação não são modificadas por migrações SQL.

## PWA e acessibilidade

Manifesto, ícones PNG, shell instalável, fontes com fallback local, alvos de toque de pelo menos 44px, rótulos, foco visível, modal nativo, atalho para conteúdo e opção de letras maiores. O shell pode abrir offline; consultas e gravações exigem internet. Dados pessoais e financeiros não são armazenados no cache do service worker. Não há fila de gravação offline.

## Limites da V1

- As seções gerais exibem até 1.000 registros recentes. O financeiro busca todos os lançamentos da igreja por páginas, para não truncar totais ou exportações. Para grande volume, migrar essa leitura para filtros mensais e agregação no servidor.
- Células funcionam como diretório de encontros; sem controle de presença ou inscrição em células.
- Voluntariado cobre atividades, responsável, prazo e conclusão; sem escala recorrente ou substituições.
- Sem cobrança de assinatura, conciliação bancária, notificações push, anexos ou integração WorshipSync.
- Cargo DEV dá acesso ao produto e aos dados pela aplicação; não concede credenciais de infraestrutura.

## Cuidado pastoral e encontros

Ministérios iniciais editáveis: Recepção, Obreiros, Mídia, Infantil, Intercessão e Louvor. Igrejas existentes mantêm seus dados e vínculos. A entrada automática foi desativada no servidor. Em Mais → Configurações da igreja, configurar WhatsApp (país + DDD + número) e liderança. O participante abre a conversa e envia a mensagem por sua própria decisão; o app não envia mensagens nem concede aprovação espiritual. A definição de ministério é feita por pastor, administrador ou DEV em Pessoas. Uma conta continua com até um ministério.

A igreja pode publicar foto e logo próprios (JPG/PNG/WebP, até 5MB) no bucket público church-branding, com escrita restrita a pastores/administradores/DEV no diretório da igreja. Não publicar imagens sem autorização. As imagens antigas são mantidas ao substituir a foto.

Atividades podem ser ligadas a eventos da mesma igreja. No detalhe do encontro, o participante confirma presença, consulta orientações e conclui suas próprias atividades. A home destaca a próxima atividade pendente. Transições e feedback respeitam movimento reduzido. Testes de interface com fixtures verificam WhatsApp e navegação; testes SQL verificam a autorização real.
