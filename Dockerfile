FROM node:10

# Create app directory
RUN mkdir -p /opt/yeuai/spider
WORKDIR /opt/yeuai/spider

# Install dependencies
COPY package*.json ./

# Build source
RUN npm install
RUN npx tsc

# Bundle app source
COPY . .

EXPOSE 8080
CMD [ "npm", "start" ]
