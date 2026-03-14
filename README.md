# Fitness Tracker — Docker Edition

Personal workout tracking app. Runs as a single Docker container with persistent JSON storage.

## Quick Start

```bash
docker compose up -d
```

App will be available at `http://localhost:4001`

---

## Deploy on Main Server (nginx reverse proxy)

### 1. Clone the repo

```bash
git clone git@github.com:<your-username>/fitness-tracker-docker.git
cd fitness-tracker-docker
```

### 2. Start the container

```bash
cp .env.example .env
docker compose up -d
```

### 3. Nginx config

Create `/etc/nginx/sites-available/fitness`:

```nginx
server {
    listen 80;
    server_name fitness.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
ln -s /etc/nginx/sites-available/fitness /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 4. SSL (recommended)

```bash
certbot --nginx -d fitness.yourdomain.com
```

---

## Data Persistence

Workout data is stored in a Docker named volume (`fitness_data`). It survives container restarts and updates.

To back up:
```bash
docker run --rm -v fitness_data:/data -v $(pwd):/backup alpine tar czf /backup/fitness-backup.tar.gz /data
```
