# Production web image. NEXT_PUBLIC_API_BASE_URL is inlined at build time.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN test -n "$NEXT_PUBLIC_API_BASE_URL" || (echo "NEXT_PUBLIC_API_BASE_URL is required at build time" && exit 1)
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
RUN chown -R node:node /app
EXPOSE 3000
USER node
CMD ["node", "server.js"]
