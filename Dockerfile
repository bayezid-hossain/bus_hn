FROM node:12.2
WORKDIR /usr/app
COPY package*.json ./
RUN npm install && mkdir -p /usr/app/TempImages
COPY . . 
EXPOSE 8004
CMD npm start