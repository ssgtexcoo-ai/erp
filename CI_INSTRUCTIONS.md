CI & Deploy Instructions (GitHub Actions + Vercel)

Рекомендованный бесплатный стек: GitHub Actions (CI) + Vercel (деплой). GitHub Actions будет запускать lint/typecheck/build; Vercel автоматически деплоит из репозитория.

1) Добавление секретов (GitHub):
- Перейдите в ваш репозиторий → Settings → Secrets and variables → Actions → New repository secret.
- Добавьте следующие переменные (если используете Supabase):
  - `NEXT_PUBLIC_SUPABASE_URL` — публичный URL Supabase
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key Supabase
- Если будете деплоить через Vercel API (опционально):
  - `VERCEL_TOKEN` — ваш Vercel token (создаётся в личном аккаунте Vercel)

  Дополнительно для автономной работы bymax:
  - Добавьте `DEPLOY_KEY` в Secrets — приватный ключ deploy key (если вы используете Deploy key вариант). Workflow использует его для пуша веток и прямого пуша при необходимости.
  - Если хотите, чтобы bymax автоматически мержил тривиальные PR'ы, добавляйте метку `bymax-automerge` к PR (workflow `.github/workflows/auto-merge.yml` выполнит merge при зелёных проверках).

2) Подключение Vercel (рекомендуется):
- Зайдите на https://vercel.com, создайте аккаунт (если нет).
- Нажмите "Import Project" → выберите ваш GitHub-репозиторий → следуйте шагам.
- В Vercel в настройках проекта добавьте те же environment variables (`NEXT_PUBLIC_SUPABASE_*`) в Production.
- По пушу в `main` Vercel будет автоматически деплоить прод-предпросмотр.

3) Как тестировать локально (если у вас нет Node на машине):
- Локально можно установить Node.js (рекомендуется v18) или запускать контейнер:

```bash
# установить Node.js через nvm (если нужно):
curl -fsSL https://get.pnpm.io/install.sh | sh -
# или используйте homebrew на macOS
brew install node
```

4) Что делает workflow `.github/workflows/ci.yml`:
- На `push` и `pull_request` запускает `npm ci`, `npm run lint`, `npx tsc --noEmit` и `npm run build`.
- Если у вас есть `npm test`, workflow попытается его запустить (необязательно).

5) Следующие шаги, которые я могу сделать для вас:
- Создать GitHub Actions workflow (готово).
- Добавить Vercel deployment workflow (требует `VERCEL_TOKEN`).
- Настроить автоматическое открытие pull requests при критических ошибках.

Если хотите, добавлю автоматический deploy step в workflow, но для этого нужен `VERCEL_TOKEN` в Secrets.
