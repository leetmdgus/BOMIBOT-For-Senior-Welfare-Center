#!/bin/sh
# 프로덕션용 랜덤 시크릿 생성
set -e
SECRET=$(openssl rand -hex 32)
PG=$(openssl rand -hex 16)
echo "SECRET_KEY=$SECRET"
echo "POSTGRES_PASSWORD=$PG"
echo ""
echo "Paste into backend/.env then deploy."
