FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache wget bash python3 py3-pip py3-numpy py3-pandas py3-scikit-learn

COPY package.json yarn.lock ./
RUN yarn install

COPY . .

ENV PORT=3000

EXPOSE 3000

CMD ["yarn", "start"]
