FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 8040
CMD ["./node_modules/.bin/tsx", "src/main.ts"]
