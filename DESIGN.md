# GraçaSync — sistema visual da comunidade

Referências aprovadas: home acolhedora e menu Mais limpo (29/10/2026). Implementação mobile first; desktop mantém navegação de comunidade, sem sidebar de dashboard.

- Cor principal: azul #1676E8; texto navy #071B46; detalhe dourado #E9A51B; fundo branco.
- Tipografia sans-serif, sem dependência de download para renderizar a interface. Texto de formulário 16px, corpo 15–16px, título mobile 28–30px.
- Margem lateral mobile 24px (20px em telas abaixo de 360px), desktop 48px. Seções separadas por 24–32px. Ícones de navegação 23px. Controles com área de toque mínima de 44px.
- Navegação fixa: Início, Igreja, Servir, Comunidade e Mais. Itens de gestão ficam em Mais, conforme permissões. Não existe seletor de igreja para participantes comuns. DEV conserva o seletor administrativo em Minha conta.
- Home: identidade da igreja, saudação, fotografia acolhedora, convite a conhecer a igreja, quatro atalhos e mural. O destaque usa o próximo evento real; sem eventos, apresenta a comunidade sem fabricar data ou culto. Fotografia ilustrativa gerada para a marca.
- Mais: perfil real com inicial (não foto fictícia), grupos leves, sem caixas ou divisórias por item. Dados de exemplo das referências não são gravados no banco.
- Telas de administração compartilham cores, espaçamento e controles; tabelas e totais são usados somente onde a tarefa exige, como financeiro.
- Pedidos de oração são privados, visíveis ao autor e aos pastores/administradores da igreja (e DEV). Sem publicação pública automática.
- Acessibilidade: letras maiores, foco visível, modal nativo, labels em campos, layout responsivo e safe area na navegação inferior. Dados privados continuam protegidos no banco.
