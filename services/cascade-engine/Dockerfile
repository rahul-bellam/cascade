# Build from repo root: docker build -f services/cascade-engine/Dockerfile .
FROM python:3.12-slim
WORKDIR /app
COPY services/cascade-engine/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Service code lands in /app; content/ is mounted at the path the code expects
# (parents[2] from /app/services/cascade-engine -> /). Recreate that layout:
COPY services/cascade-engine/ /app/services/cascade-engine/
COPY content/ /app/content/
WORKDIR /app/services/cascade-engine
CMD ["python", "app.py"]
