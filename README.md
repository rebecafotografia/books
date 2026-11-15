# Rebeca Fotografia · Books

Galerias privadas de clientes com visual editorial, responsivas para celular e desktop.

## Rodar
Requer Node.js 20+. Sem dependências de npm.

```bash
ADMIN_PASSWORD='uma-senha-forte' SESSION_SECRET='chave-aleatoria-longa' node server.js
```

Acesse `http://localhost:3000/admin` para criar o álbum. O cliente abre `http://localhost:3000/a/slug-do-album`.

## Upload e atualização automática
- Pelo painel `/admin`: crie álbum, faça upload de fotos e vídeos, altere título, fontes e capa.
- Pelo servidor: crie `data/albums/slug-do-album/` e coloque imagens JPG, JPEG, PNG, WEBP, GIF, AVIF e vídeos MP4, WEBM, MOV. O servidor detecta os novos arquivos a cada requisição e o navegador do cliente atualiza automaticamente em até 15 segundos.
- Opcional: edite o arquivo `data/meta.json` para alterar título, texto, fonte (serif / sans / display), escala, capa, videoCover, private e password de cada álbum.
- Para capa: no painel faça upload de capa (imagem ou vídeo), ou use arquivos da mesma pasta e defina `cover` / `videoCover` com o nome do arquivo.

## Segurança e implantação
- Configure `ADMIN_PASSWORD` e `SESSION_SECRET` em variáveis de ambiente **antes de publicar**. O servidor bloqueia o painel sem elas.
- O repositório é público. **Não commite fotos privadas**: `data/` está ignorada. Faça backup periódico de `data/` em armazenamento privado.
- Álbuns podem exigir senha; links sozinhos não são garantia de sigilo. As fotos com senha só são servidas após validação.
- Hospede em uma VPS/serviço Node com disco persistente. GitHub Pages **não executa** o servidor de upload, controle de acesso ou descoberta de pastas.
- Use HTTPS com proxy reverso (Caddy/Nginx) em produção. Para uploads acima de 100 MB, configure limite no proxy. Limite por arquivo no aplicativo: 250 MB.
- Downloads múltiplos usam ZIP sem dependências; em grandes álbuns, prefira lotes menores.

## Recursos
Galeria mobile-first, topo fixo Rebeca Fotografia + Instagram, fotos/vídeos/favoritos, lightbox com swipe e teclado, seleção por toque prolongado, selecionar todas, downloads individuais e ZIP, favoritos salvos no navegador, capa em vídeo, transições suaves e suporte a movimento reduzido.
