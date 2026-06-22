# Stage 1: Сборка React-клиента
FROM node:20-slim AS client-builder
WORKDIR /app
COPY client/package*.json ./client/
RUN npm install --prefix client
COPY client/ ./client/
RUN npm run build --prefix client

# Stage 2: Финальный образ для запуска бэкенда и раздачи фронтенда
FROM node:20-slim
WORKDIR /app

# Устанавливаем системные зависимости для компиляции native-модулей (bcrypt, better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Копируем конфигурационные файлы и устанавливаем зависимости корня
COPY package*.json ./
RUN npm install

# Копируем настройки бэкенда и устанавливаем зависимости
COPY server/package*.json ./server/
RUN npm install --prefix server

# Копируем исходный код бэкенда
COPY server/ ./server/

# Копируем собранный фронтенд из первого этапа (stage)
COPY --from=client-builder /app/client/dist ./client/dist

# Railway автоматически предоставляет порт через переменную PORT, по умолчанию открываем 3001
EXPOSE 3001

# Команда при запуске: проверяет наличие БД по пути DATABASE_PATH (или дефолтному),
# если файла нет — автоматически накатывает сиды (seed.ts), затем запускает Express сервер.
CMD sh -c "if [ ! -f \${DATABASE_PATH:-/app/server/database.db} ]; then echo 'Database not found. Initializing seed data...'; npx tsx server/src/db/seed.ts; fi && npx tsx server/src/server.ts"
