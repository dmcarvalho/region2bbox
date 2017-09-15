FROM synapsetec/nodejs:node7
MAINTAINER Diego "diego@khartes.com.br"
WORKDIR /opt/workapp
RUN mkdir node_modules
COPY app.js /opt/workapp
COPY package.json /opt/workapp
COPY node_modules /opt/workapp/node_modules
COPY pm2_startup.yaml /opt/workapp
EXPOSE 3000
CMD ["pm2-docker", "start", "pm2_startup.yaml"]