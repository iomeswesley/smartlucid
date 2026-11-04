# Flowline no Google Sheets + Apps Script: segurança e compartilhamento

## Resumo

- **Cada pessoa só recebe do servidor os projetos em que é membro.** O navegador nunca lê a planilha.
- **A planilha não é compartilhada com ninguém.** Ela pertence à conta que publica o web app (uma conta de serviço da OpEx, de preferência). Os usuários falam apenas com as funções `api*` do `gas/Code.gs`.
- **A identidade vem do login Google** (`Session.getActiveUser()`), não do navegador. Ninguém consegue "dizer que é outra pessoa".
- **Todo pedido é conferido no servidor:** papel do usuário no projeto (dono / editor / leitor), domínio `@whirlpool.com`, versão do projeto.
- **O conteúdo fica cifrado na planilha:** projetos, nomes, e-mails e pedidos de acesso. Quem abrir a planilha (por engano, export ou backup) vê só texto cifrado e hashes.
- **Cada projeto tem um ID próprio** (`PRJ-` + 16 caracteres aleatórios, 80 bits). Membros, blocos de conteúdo, imagens e pedidos se ligam ao projeto por esse ID.

## Abas da planilha (o `setup()` cria tudo)

| Aba | Colunas | O que fica legível |
|---|---|---|
| `Users` | email_hash, email_enc, name_enc, title_enc, created_at | nada (hash + cifrado) |
| `Projects` | project_id, owner_hash, version, updated_at, updated_by_hash, parts | ID, versão e datas |
| `Members` | project_id, email_hash, email_enc, role, added_by_hash, added_at | ID e papel |
| `Blobs` | project_id, part, data | só o ID; o projeto inteiro (plano, mapas, charter) fica cifrado e dividido em partes de 45 mil caracteres |
| `Requests` | request_id, project_id, email_hash, email_enc, note_enc, ts, status | status do pedido |
| `Assets` | asset_id, project_id, drive_file_id, created_at | ID da imagem no Drive |
| `Audit` | ts, project_id, email_hash, action | trilha de quem fez o quê (em hash) |

As imagens (prints do Minitab, fotos do product map) ficam numa pasta do Drive do dono do script, sem compartilhamento. São servidas por `apiGetAsset`, que confere se quem pede é membro do projeto da imagem.

## Criptografia (`gas/Crypto.gs`)

O Apps Script não tem AES nativo. Usamos uma construção padrão baseada só em HMAC-SHA256, disponível no `Utilities`:

1. O conteúdo é comprimido (gzip).
2. **Cifra:** um keystream gerado por `HMAC(K_enc, nonce ‖ contador)`, ou seja, HMAC como função pseudoaleatória em modo contador, com nonce aleatório de 128 bits por gravação.
3. **Integridade:** `HMAC(K_mac, versão ‖ nonce ‖ cifrado)` (encrypt-then-MAC). Uma célula alterada à mão na planilha é rejeitada ao ler.
4. **Índices:** `HMAC(K_idx, e-mail)`. Isso permite achar "os projetos do usuário X" sem gravar o e-mail em texto.

As três chaves de 256 bits ficam nas **Script Properties**, nunca na planilha.

## O que protege e o que não protege

| Situação | Protegido? |
|---|---|
| Usuário tenta ver projeto de outro pelo app (ID na URL, chamadas manuais à API) | ✅ O servidor responde "não encontrado" e não revela se o projeto existe |
| Leitor tenta editar; editor tenta mudar papéis ou excluir | ✅ Recusado no servidor |
| Compartilhar com e-mail de fora da empresa | ✅ Só `@whirlpool.com` |
| Alguém recebe a planilha ou um export dela | ✅ Só vê texto cifrado |
| Alguém altera uma célula na planilha | ✅ A integridade falha e o registro é recusado |
| Quem é **editor do projeto Apps Script** | ⚠️ Pode ler as chaves e os dados. Mantenha só 1 ou 2 administradores da OpEx como editores do script |
| Dois editores salvando ao mesmo tempo | ✅ Bloqueio (`LockService`) + versão. O segundo recebe "CONFLICT" e recarrega |

## Onde está publicado

| Item | Valor |
|---|---|
| Web app | https://script.google.com/a/macros/whirlpool.com/s/AKfycbztBKNKkyKQDioN7CZcqWhobUdAWWuEVWlqWitQl8tyFEaaG-yES4wPkN9n1sAru0yB/exec |
| Projeto Apps Script | smartLucid (`163Zxtucs2qy5qQPN1pXzCjMmqRzZGSxRJlmRQzqHqerRGw_inxXcJzQk`) — arquivos `Code.gs` (Code + Crypto) e `index` (interface empacotada) |
| Banco | Planilha smartLucid (`1Dsjv0WHMq-V_nXyf0Xyfl3FCtse20PIK6UhYOrLpUzE`) |
| Acesso | Executa como wesley_iomes@whirlpool.com · somente contas Whirlpool |

**Para atualizar:**
1. Rode `python tools/build_gas.py`.
2. Cole `gas/index.html` no arquivo `index` do projeto e salve.
3. Vá em *Deploy → Manage deployments → editar → New version*. A URL continua a mesma.

> ⚠️ O HtmlService remove `/*` mesmo dentro de strings JavaScript, o que quebra o script. Nunca escreva `image/*` ou algo parecido no código do cliente.

## Publicar do zero

1. Crie um projeto Apps Script com a conta de serviço da OpEx.
2. Gere a interface empacotada:
   ```bash
   python tools/build_gas.py
   ```
3. Copie a pasta `gas/` para o projeto (`clasp push`, ou colando os arquivos).
4. No editor do Apps Script, rode **`setup()`** uma vez. Ele cria a planilha, a pasta de imagens, as chaves e protege as abas.
5. **Deploy → Web app:** *Execute as: Me*, *Who has access: Anyone within Whirlpool*.
6. Pronto. O cliente detecta `google.script.run` sozinho e passa a usar o servidor no lugar do banco local (`js/core/api.js`).

> Se vocês preferirem usar uma planilha já existente, basta colocar o ID dela em Script Properties como `FL_SHEET_ID` antes do `setup()`. As abas e colunas acima são criadas se não existirem. Quando você me mandar a planilha, eu adapto os nomes das colunas.

## Compartilhar no app

- O botão **Share** no topo do projeto (com os avatares de quem tem acesso) abre o diálogo de compartilhamento:
  - adicionar pessoas por e-mail, com autocompletar do diretório;
  - papel *Pode editar* / *Pode ver*;
  - trocar papel, remover pessoa, transferir a posse.
- **Pedidos de acesso:** quem abre um link sem ser membro vê "Você não tem acesso" e pode pedir acesso. Donos e editores aprovam ou recusam no mesmo diálogo.
- **Copiar link não dá acesso.** O link só funciona para quem está na lista.
- **No protótipo local**, o menu do usuário (canto superior direito) tem *Demo · ver como outro usuário*, para testar as regras. Ele não existe no Apps Script, onde o usuário é sempre o login Google.
