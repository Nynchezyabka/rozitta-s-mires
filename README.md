# Коробки — опись коробок для переезда

## Перенос на свой Supabase + Layero

1. **Supabase.** Создайте проект на supabase.com → SQL Editor → вставьте весь файл `supabase-setup.sql` → Run.
2. В Supabase → Project Settings → API скопируйте **Project URL** и **publishable (anon) key**.
3. **GitHub.** Выгрузите проект в свой репозиторий.
4. **Layero.** Подключите репозиторий и укажите:
   - команда сборки: `STATIC_BUILD=1 bun run build` (или `npm run build` с переменной `STATIC_BUILD=1`)
   - переменные окружения: `VITE_SUPABASE_URL` = Project URL, `VITE_SUPABASE_PUBLISHABLE_KEY` = publishable key
5. Откройте сайт → ⚙️ → вставьте свой ключ ИИ (Gemini / Claude n Codex / OpenRouter). Без своего ключа на Layero распознавание не работает — встроенный ИИ есть только в Lovable.

Данные дома защищены секретной ссылкой-приглашением: кто её знает, тот видит и меняет всё. Не публикуйте её.
