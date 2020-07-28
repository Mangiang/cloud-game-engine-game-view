# pull official base image
FROM node:current-alpine AS initiator

# set working directory
WORKDIR /app

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# install app dependencies
COPY package.json ./
COPY yarn.lock ./
RUN yarn --silent

# pull  base image
FROM node:current-alpine as builder
COPY --from=initiator /app/node_modules /app/node_modules
# set working directory
WORKDIR /app
COPY . ./
RUN yarn build


# pull official base image
FROM nginx:stable-alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]