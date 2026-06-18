Создание bot-аккаунта и deploy key для bymax

Цель: дать bymax право пушить изменения и создавать ветки/PR, при этом выполнение задач будет происходить на GitHub Actions (компьютер можно выключать).

Вариант A — Deploy key (рекомендую для простоты)
1. На вашей машине (или в любом безопасном месте) сгенерируйте новый SSH-ключ:

```bash
ssh-keygen -t ed25519 -C "bymax@yourdomain" -f bymax_deploy_key -N ""
```

2. Скопируйте публичный ключ `bymax_deploy_key.pub`.
3. В GitHub репозитории: Settings → Deploy keys → Add deploy key.
   - Title: `bymax deploy key`
   - Key: вставьте содержимое `bymax_deploy_key.pub`
   - Поставьте галку `Allow write access`.
4. Секреты: приватный ключ (`bymax_deploy_key`) сохраните как GitHub Secret (Settings → Secrets and variables → Actions → New repository secret) с именем `DEPLOY_KEY`.
5. В workflow используйте `webfactory/ssh-agent` чтобы временно подключить ключ и выполнить `git push`.

Пример шага в workflow для пуша/создания ветки:

```yaml
- name: Setup SSH
  uses: webfactory/ssh-agent@v0.8.1
  with:
    ssh-private-key: ${{ secrets.DEPLOY_KEY }}

- name: Configure git
  run: |
    git config --global user.name "bymax-bot"
    git config --global user.email "bymax@yourdomain"

- name: Create branch and push
  run: |
    git checkout -b bymax/auto-fix-$(date +%s)
    # примените правки (например, через скрипт)
    git add -A
    git commit -m "bymax: auto-fix: lint/type errors" || echo "no changes"
    git push origin HEAD
```

Вариант B — Machine user (bot GitHub account)
- Создайте отдельный GitHub аккаунт `bymax-bot`.
- Сгенерируйте Personal Access Token (Settings → Developer settings → Personal access tokens) с правами `repo`.
- Добавьте токен в `Settings → Secrets` как `BOT_TOKEN`.
- В workflow можно использовать `actions/checkout` и затем `git push` с `https://x-access-token:${{ secrets.BOT_TOKEN }}@github.com/${{ github.repository }}.git`.

Безопасность и рекомендации
- Давайте минимально необходимые права (`deploy key` вместо PAT, если возможен). 
- Храните приватные ключи и токены только в GitHub Secrets.
- Настройте branch protection на `main`, чтобы автокоммиты создавали PR, а не пушились напрямую (рекомендуется).

Что я сделаю дальше
- Создам шаблон scheduled workflow, который будет запускать проверки и при тривиальных исправлениях открывать PR, используя `DEPLOY_KEY`.
- Если согласны с deploy key — я внесу соответствующие шаги в workflow и пример автофикс-PR.
