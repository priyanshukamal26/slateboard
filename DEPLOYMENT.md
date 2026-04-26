# Deployment Guide

This guide covers the steps required to deploy Slateboard to a production environment.

## Recommended Stack
- **Hosting**: [Render](https://render.com/) or Heroku.
- **Primary Database**: [MongoDB Atlas](https://www.mongodb.com/atlas/database).
- **Relational/Logging Database**: [Neon](https://neon.tech/) (Serverless PostgreSQL).

## Step-by-Step Deployment (Render)

### 1. Database Setup
1.  **MongoDB Atlas**:
    - Create a cluster and a database named `slateboard`.
    - Whitelist `0.0.0.0/0` (or the specific IP of your hosting provider).
    - Copy the connection string.
2.  **Neon PostgreSQL**:
    - Create a new project.
    - Copy the `DATABASE_URL` connection string.

### 2. Environment Variables
Configure the following in your hosting provider's dashboard:
- `MONGODB_URI`: Your MongoDB Atlas string.
- `DATABASE_URL`: Your Neon PostgreSQL string.
- `GROQ_API_KEY`: Your Groq API key.
- `SESSION_SECRET`: A long, random string for session security.
- `NODE_ENV`: Set to `production`.

### 3. Deploy to Render
1.  Connect your GitHub repository to Render.
2.  Create a **Web Service**.
3.  **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
4.  **Start Command**: `npm start`

## Production Best Practices

### Security
- **HTTPS**: Render provides auto-SSL. Ensure all traffic is redirected to HTTPS.
- **Rate Limiting**: The server has built-in rate limiting, but consider a Cloudflare proxy for enhanced DDoS protection.

### Databases
- **Prisma**: Always use `npx prisma migrate deploy` in production pipelines, not `dev`.
- **Backups**: Ensure automated backups are enabled on MongoDB Atlas and Neon.

### Scaling
- **WebSockets**: If scaling beyond a single instance, you will need a Redis adapter for Socket.io to synchronize events across multiple server instances.
- **Monitoring**: Use a service like Logtail or Render's built-in logs to monitor for `access.log` entries.
