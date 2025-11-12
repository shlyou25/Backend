# Use official Node.js LTS version as base image
FROM node:18

# Create app directory inside container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy app source code
COPY . .

# Expose the port your app runs on (change if needed)
EXPOSE 3000

# Command to run the app
CMD ["npm", "start"]
