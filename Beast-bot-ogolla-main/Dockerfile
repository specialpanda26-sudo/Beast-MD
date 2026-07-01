# Henry Tech Shark Bot V5.0 - Dockerfile
FROM node:20-slim

# Install system deps: Python, ffmpeg, curl
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only dependency manifests first so Docker can cache this layer
# and skip reinstalling deps when only app code changes.
COPY package.json package.json
COPY requirements.txt requirements.txt

# Install Node.js dependencies
RUN npm install --omit=dev

# Install Python dependencies straight from requirements.txt so the Docker
# image and local/Termux installs never drift out of sync.
RUN pip3 install --break-system-packages --no-cache-dir -r requirements.txt

# Refresh yt-dlp to the latest standalone binary AFTER the pip install above,
# so this (newer, self-updating) binary wins on PATH instead of pip's copy.
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp

# Now copy the rest of the project
COPY . .

# Expose backend port
EXPOSE 5000

# Use startup script so Python starts first, then Node
CMD ["/bin/bash", "start.sh"]
