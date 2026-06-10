# Cascade frontend (Next.js). Only needed if you self-host the frontend instead
# of deploying to Vercel. Build from the frontend/ directory:
#   docker build -t cascade-frontend frontend/
#
# At runtime, set the server-side proxy targets so the Next.js API routes can
# reach the backend, e.g.:
#   -e CASCADE_ENGINE_URL=http://cascade-engine:8090
#   -e LEARN_ENGINE_URL=http://learn-engine:8093  (etc.)

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
EXPOSE 3000
CMD ["npm", "run", "start"]
