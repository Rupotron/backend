# ==========================================
# Stage 1: Build
# ==========================================
FROM node:24-alpine AS builder

WORKDIR /app

# CRITICAL FIX: Install OpenSSL so Prisma can generate the client on Alpine
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./

# CRITICAL FIX: Install ALL dependencies here (including TypeScript). 
# Do not use --omit=dev in the builder stage.
RUN npm install

# Copy source code and Prisma schema
COPY . .

# Generate Prisma client BEFORE building, so TypeScript can see the generated types
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# ==========================================
# Stage 2: Runtime
# ==========================================
FROM node:24-alpine

WORKDIR /app

# Install tini, curl (for healthcheck), and openssl (required by Prisma engines on Alpine)
RUN apk add --no-cache tini curl openssl

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies to keep the final image tiny and secure
RUN npm install --omit=dev

# Copy the compiled code from the builder stage
COPY --from=builder /app/dist ./dist

# Safely copy the generated Prisma client and schema from the builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY prisma ./prisma

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Switch to the non-root user
USER nodejs

# Expose the API port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Use tini to handle system signals properly (prevents memory leaks)
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/index.js"]
