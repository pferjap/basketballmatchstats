FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM deps AS build
WORKDIR /app
COPY nest-cli.json tsconfig*.json ./
COPY prisma ./prisma
COPY src ./src
COPY test ./test
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev --ignore-scripts && npx prisma generate
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
