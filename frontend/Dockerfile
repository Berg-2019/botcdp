FROM node:20-alpine AS build-deps

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm install

ARG VITE_API_URL=http://localhost:9000
ENV VITE_API_URL=${VITE_API_URL}

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build-deps /usr/src/app/dist /usr/share/nginx/html
COPY .docker/nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
