# Build from repo root: docker build -f services/learn-engine/Dockerfile .
FROM python:3.12-slim
WORKDIR /app
COPY services/learn-engine/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Service code lands in /app; content/ is mounted at the path the code expects
# (parents[2] from /app/services/learn-engine -> /). Recreate that layout:
COPY services/learn-engine/ /app/services/learn-engine/
COPY content/ /app/content/
WORKDIR /app/services/learn-engine
CMD ["python", "app.py"]
