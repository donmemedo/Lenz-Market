FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 APP_ENV=production
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
 && useradd --system --uid 10001 --home /srv qaab \
 && mkdir -p /srv/data /srv/media && chown qaab:qaab /srv/data /srv/media
COPY app ./app
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=60s \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/api/health')"
# Starts as root only to fix volume ownership, then runs as uid 10001 (see entrypoint.sh).
# uvicorn trusts X-Forwarded-For only from FORWARDED_ALLOW_IPS (set it to your reverse proxy).
ENTRYPOINT ["entrypoint.sh"]
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000"]
