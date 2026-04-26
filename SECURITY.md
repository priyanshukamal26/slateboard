# Security Policy

## Supported Versions

The following versions of Slateboard are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| v0.2.x  | :white_check_mark: |
| < v0.2  | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within Slateboard, please follow these steps to report it responsibly:

1.  **Do not disclose it publicly** until it has been addressed.
2.  Email your findings to [INSERT EMAIL/CONTACT].
3.  Include a detailed description of the vulnerability, steps to reproduce it, and any potential impact.

### Our Response
- We will acknowledge receipt of your report within **48 hours**.
- We aim to provide a resolution or a public update within **7-14 days**.
- You will be credited for the discovery in our security advisories (if desired).

## Responsible Disclosure Policy
We believe in responsible disclosure. We ask that you give us a reasonable amount of time to fix the issue before making it public. In return, we will not take legal action against you as long as you comply with this policy and do not intentionally harm the service or our users.

## Security Overview

### WebSockets
All real-time communication occurs over authenticated WebSocket namespaces. We implement rate-limiting and payload validation to prevent flood attacks and malformed data injection.

### Authentication
User sessions are secured using `cookie-session` with cryptographically signed tokens. Passwords (where applicable) are hashed using industry-standard algorithms (bcrypt).

### Database Handling
- **MongoDB**: Access is restricted via Mongoose schemas to prevent unauthorized data access or injection.
- **PostgreSQL**: Structured logs are managed through Prisma ORM, ensuring type safety and sanitized queries.

## Best Practices
- Always use a strong `SESSION_SECRET` in production.
- Ensure your databases (MongoDB Atlas, PostgreSQL) have IP whitelisting enabled.
- Regularly update dependencies using `npm audit`.
