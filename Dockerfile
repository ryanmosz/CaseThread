# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Install git and bash (Alpine uses ash by default)
RUN apk add --no-cache git bash

# Create app directory
WORKDIR /app

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to nodejs user
USER nodejs

# Set entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

# Default command (can be overridden by docker-compose)
CMD ["bash"] 