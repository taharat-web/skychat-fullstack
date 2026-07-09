FROM node:20-alpine

# sharp needs these for image processing on Alpine (musl)
RUN apk add --no-cache libc6-compat vips-dev

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 5000

# Apply any pending migrations, then start the server. Safe to run on every
# boot: `migrate deploy` is a no-op if the schema is already up to date.
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
