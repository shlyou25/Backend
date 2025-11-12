# 1. Use official Node.js image (lightweight Alpine version)
FROM node:18-alpine

# 2. Set the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy package.json and package-lock.json (for caching)
COPY package*.json ./

# 4. Install dependencies
RUN npm install --production

# 5. Copy the rest of your backend code
COPY . .

# 6. Expose your app port (adjust if your app uses another)
EXPOSE 8080

# 7. Set environment to production
ENV NODE_ENV=production

# 8. Command to start the server
CMD ["node", "server.js"]
