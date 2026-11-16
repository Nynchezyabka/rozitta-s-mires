export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <title>Эта страница не загрузилась · Топи Розитты</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #140a22; color: #f0e6ff; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #c9b6e4; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #b6ff3b; color: #140a22; }
      .secondary { background: transparent; color: #f0e6ff; border-color: #a77bdb; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>🐸 Эта страница не загрузилась</h1>
      <p>Розитта уронила свиток в болото. Попробуйте ещё раз или вернитесь на главную.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Попробовать снова</button>
        <a class="secondary" href="/">На главную</a>
      </div>
    </div>
  </body>
</html>`;
}
