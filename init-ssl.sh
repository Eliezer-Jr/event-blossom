#!/bin/bash
set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
  echo "Usage: ./init-ssl.sh yourdomain.com"
  exit 1
fi

echo "Starting HTTP-only server for certificate issuance..."
DOMAIN=$DOMAIN docker compose up -d app

echo "Requesting Let's Encrypt certificate for $DOMAIN..."
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@$DOMAIN \
  --agree-tos \
  --no-eff-email \
  -d $DOMAIN \
  -d www.$DOMAIN

echo "Switching to HTTPS config..."
docker compose exec app sh -c "envsubst '\$DOMAIN' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -s reload"

echo "SSL setup complete! Your site is now available at https://$DOMAIN"
