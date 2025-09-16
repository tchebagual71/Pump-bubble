# Pump Bubble

A production-ready web application with Docker Compose, Caddy reverse proxy, automatic HTTPS, and CI/CD deployment.

## Features

- 🐳 **Docker Compose** setup with multi-service architecture
- 🔒 **Automatic HTTPS** with Let's Encrypt via Caddy
- ⚡ **HTTP/2** support for improved performance
- 🗜️ **Gzip compression** for faster loading
- 🛡️ **Rate limiting** and security headers
- 💚 **Health checks** for all services
- 🚀 **CI/CD** with GitHub Actions
- 📦 **Container registry** integration (GHCR)
- 🔄 **Zero-downtime deployments**
- 🔍 **Security scanning** with Trivy

## Quick Start

### Development

```bash
# Clone the repository
git clone https://github.com/tchebagual71/Pump-bubble.git
cd Pump-bubble

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Deployment

1. **Server Setup**

```bash
# Install Docker and Docker Compose on your server
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone the repository to your server
git clone https://github.com/tchebagual71/Pump-bubble.git /opt/pump-bubble
cd /opt/pump-bubble
```

2. **Environment Configuration**

```bash
# Copy and configure environment variables
cp .env.example .env
nano .env
```

Configure these variables in `.env`:
- `DOMAIN`: Your domain name
- `TLS_EMAIL`: Your email for Let's Encrypt certificates

3. **Deploy**

```bash
# Run the deployment script
./deploy.sh

# Or manually with Docker Compose
docker-compose up -d
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DOMAIN` | Your domain name | `localhost` |
| `TLS_EMAIL` | Email for Let's Encrypt | `internal` |
| `NODE_ENV` | Node.js environment | `production` |

### Caddy Features

- **Automatic HTTPS**: Let's Encrypt certificates
- **HTTP/2**: Enabled by default
- **Gzip Compression**: Automatic compression
- **Rate Limiting**: 100 requests per minute per IP
- **Security Headers**: HSTS, XSS protection, etc.
- **Health Checks**: Application health monitoring

## CI/CD Pipeline

The GitHub Actions workflow automatically:

1. **Build**: Creates Docker images for multiple architectures
2. **Test**: Runs security scans with Trivy
3. **Deploy**: SSH deployment to production server
4. **Verify**: Health checks after deployment

### Required Secrets

Configure these in your GitHub repository settings:

- `SERVER_HOST`: Your server IP or hostname
- `SERVER_USER`: SSH username
- `SERVER_SSH_KEY`: SSH private key for deployment
- `SERVER_PORT`: SSH port (optional, defaults to 22)

## Architecture

```
Internet → Caddy (Port 80/443) → Node.js App (Port 3000)
```

### Services

- **app**: Node.js application container
- **caddy**: Reverse proxy with automatic HTTPS
- **watchtower**: Automatic container updates

## Health Checks

- **Application**: `GET /health`
- **Caddy**: `GET /health/caddy`
- **API Status**: `GET /api/status`

## Security

- Non-root container user
- Security headers via Caddy
- Rate limiting
- Automatic security scanning
- Container image vulnerability checks

## Monitoring

Access logs are stored in `/var/log/caddy/` with automatic rotation.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build Docker image locally
docker build -t pump-bubble .

# Test with Docker Compose
docker-compose up --build
```

## Support

For issues and questions, please use the GitHub Issues page.