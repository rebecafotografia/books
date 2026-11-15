# Rebeca Fotografia — Books · GitHub Pages

**Site estático: sem Node.js, sem VPS e sem banco de dados.** O repositório guarda as fotos e o GitHub Pages entrega a galeria.

## Ativar pela primeira vez

No GitHub, abra **Settings → Pages** deste repositório. Em **Build and deployment**, escolha **Deploy from a branch**, branch **main**, pasta **/(root)** e salve.

Endereço esperado (depois que o GitHub Pages estiver habilitado): **https://rebecafotografia.github.io/books/**

A versão atual está em `index.html`. O servidor Node.js anterior (`server.js`, `Dockerfile`) não é necessário para o modo Pages.

## Criar álbuns somente pelo GitHub

Crie uma pasta `albums/nome-do-album/` e adicione suas fotos (JPG, PNG, WEBP etc.). Quando o GitHub Pages terminar de publicar o commit, o catálogo `catalog.json` é gerado automaticamente pelo Jekyll e o álbum passa a ter link:

`https://rebecafotografia.github.io/books/?album=nome-do-album`

Para personalizar título e capa, coloque em `albums/nome-do-album/album.json`:

```json
{
  "title": "Mariana & Lucas",
  "subtitle": "O nosso grande dia",
  "font": "serif",
  "scale": 1,
  "cover": "capa.jpg",
  "videoCover": ""
}
```

Fontes: `serif`, `sans` ou `display`. Para capa em vídeo, informe nome do arquivo na chave `videoCover`.

## Painel de upload pelo celular

Abra `https://rebecafotografia.github.io/books/?admin=1`.

Para gravar no próprio GitHub, gere um **fine-grained personal access token** em GitHub → Settings → Developer settings → Personal access tokens. Restrinja a **rebecafotografia/books**, com permissão **Contents: Read and write**. Cole no painel administrativo.

O token é mantido somente na aba atual (sessionStorage), não fica nos arquivos públicos do site. Feche a aba quando terminar e revogue o token caso seja exposto.

Depois, crie um álbum, envie fotos e vídeos e personalize as capas. A publicação via Pages pode levar alguns minutos após cada commit. O site verifica atualizações periodicamente; o catálogo só muda após o deploy.

**Atenção às limitações:** o upload pelo painel aceita arquivos individuais de até **65 MB**. Fotos maiores podem ser reduzidas antes do envio. Vídeos muito grandes devem ser hospedados em um serviço apropriado; arquivos GitHub têm limites e a ferramenta não é um armazenamento de mídia ilimitado.

## Privacidade

**Não coloque fotos particulares de clientes neste repositório público.** GitHub Pages público não implementa controle de acesso, mesmo se uma página de senha for adicionada no JavaScript. Quem conhece a URL do arquivo ou navega no repositório pode acessá-lo. Para galerias realmente privadas, é necessário outro armazenamento/autenticação, como Supabase Storage com regras de acesso, ou um servidor.

## Como usar

- Fotos, vídeos e favoritos organizados em abas
- Favoritos armazenados no navegador do cliente
- Swipe/teclado, lightbox, seleção múltipla e downloads individuais
- Capa em vídeo e fonte/escala editáveis
- Barra fixa com Rebeca Fotografia e Instagram
- Responsivo e com suporte a movimento reduzido
