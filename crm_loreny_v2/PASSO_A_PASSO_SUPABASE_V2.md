# Passo a passo — CRM Loreny Imóveis v2 com Supabase seguro

## 1. Suba os novos arquivos no GitHub
Substitua no repositório:

- `index.html`
- `style.css`
- `app.js`

Adicione também:

- `manifest.json`
- `sw.js`

Depois faça commit e aguarde o deploy automático da Vercel.

---

## 2. Faça backup antes da migração
No CRM atual, clique em **Exportar CSV** e salve uma cópia dos leads.

Isso é importante porque a próxima etapa mexe nas políticas de segurança do Supabase.

---

## 3. Configure o Auth no Supabase
No Supabase:

1. Vá em **Authentication**
2. Vá em **Providers**
3. Ative **Email**
4. Para testar com mais facilidade, você pode desativar temporariamente a confirmação de e-mail.

Depois abra o CRM novo e crie o login da Loreny pelo botão **Login / Criar acesso**.

---

## 4. Pegue o UID da usuária
No Supabase:

1. Vá em **Authentication > Users**
2. Clique no usuário criado para a Loreny
3. Copie o **User UID**

Ele será parecido com:

```txt
9b7d2e99-0000-4000-9000-xxxxxxxxxxxx
```

---

## 5. Rode o SQL de migração
Abra o arquivo:

`supabase_migration_segura.sql`

Substitua:

```sql
COLE_AQUI_O_UID_DO_USUARIO_LORENY
```

pelo UID real da Loreny.

Depois rode tudo no **SQL Editor** do Supabase.

---

## 6. Conecte o CRM novamente
Abra o CRM pela Vercel.

1. Clique em **☁️ Nuvem**
2. Cole a Supabase URL
3. Cole a Anon Key
4. Clique em **Conectar**
5. Faça login com o e-mail e senha da Loreny

Agora os leads ficam protegidos por usuário.

---

## 7. Teste rápido
Faça estes testes:

1. Cadastre um lead novo
2. Atualize a página
3. Veja se ele permanece
4. Abra no celular
5. Teste botão WhatsApp
6. Teste Kanban
7. Teste alerta de retorno hoje

---

## O que mudou na versão v2

- Mobile muito mais amigável
- Barra inferior fixa no celular
- Modal estilo app no celular
- Login com Supabase Auth
- RLS seguro por usuário
- Dados vinculados ao `user_id`
- Realtime preparado para atualização entre dispositivos
- PWA básico para instalar no celular
