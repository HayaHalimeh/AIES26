FROM node:20-alpine
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install

COPY . .

ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

ENV PORT=5173

EXPOSE 5173

CMD ["yarn", "dev", "--", "--host"]
