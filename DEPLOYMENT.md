# デプロイメントガイド

## 概要

このドキュメントでは、プロジェクト管理ツールのデプロイメント手順を説明します。

## 前提条件

- Docker 20.10以上
- Docker Compose 2.0以上
- 8GB以上のRAM
- 20GB以上の空きディスク容量

## デプロイメント方法

### 1. Docker Composeを使用したデプロイメント

#### 開発環境

```bash
# リポジトリのクローン
git clone <repository-url>
cd project-management-tool

# 環境変数の設定
cp .env.example .env
# .envファイルを編集して必要な設定を行う

# サービスの起動
docker-compose up -d

# データベースの初期化
docker-compose exec backend python seed.py
```

#### 本番環境

```bash
# 本番用の設定ファイルを作成
cp docker-compose.yml docker-compose.prod.yml

# 環境変数の設定
cat > .env.prod << EOF
DATABASE_URL=postgresql://postgres:secure_password@db:5432/project_management
SECRET_KEY=$(openssl rand -hex 32)
USE_SQLITE=false
BACKEND_CORS_ORIGINS=["https://your-domain.com"]
EOF

# サービスの起動
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### 2. GitHub Container Registryからのイメージ使用

```bash
# イメージのプル
docker pull ghcr.io/your-org/project-management-tool-backend:latest
docker pull ghcr.io/your-org/project-management-tool-frontend:latest

# docker-compose.ymlを編集してイメージを指定
# build: ./backend → image: ghcr.io/your-org/project-management-tool-backend:latest
# build: ./frontend → image: ghcr.io/your-org/project-management-tool-frontend:latest

# サービスの起動
docker-compose up -d
```

### 3. Kubernetesへのデプロイメント

Kubernetesマニフェストは`k8s/`ディレクトリに格納されています（今後追加予定）。

```bash
# 名前空間の作成
kubectl create namespace project-management

# シークレットの作成
kubectl create secret generic app-secrets \
  --from-literal=database-url='postgresql://...' \
  --from-literal=secret-key='...' \
  -n project-management

# デプロイメント
kubectl apply -f k8s/ -n project-management
```

## SSL/TLS設定

### Nginx + Let's Encryptを使用

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## バックアップとリストア

### データベースのバックアップ

```bash
# バックアップの作成
docker-compose exec db pg_dump -U postgres project_management > backup_$(date +%Y%m%d_%H%M%S).sql

# 定期バックアップ（crontab）
0 2 * * * docker-compose exec -T db pg_dump -U postgres project_management > /backup/db_$(date +\%Y\%m\%d).sql
```

### データベースのリストア

```bash
# リストア
docker-compose exec -T db psql -U postgres project_management < backup_20240101_120000.sql
```

## モニタリング

### ヘルスチェック

```bash
# バックエンドのヘルスチェック
curl http://localhost:8000/health

# フロントエンドのヘルスチェック
curl http://localhost:3000/
```

### ログの確認

```bash
# すべてのサービスのログ
docker-compose logs -f

# 特定のサービスのログ
docker-compose logs -f backend
docker-compose logs -f frontend
```

## トラブルシューティング

### よくある問題

1. **データベース接続エラー**
   ```bash
   # データベースの状態確認
   docker-compose exec db pg_isready
   
   # データベースの再起動
   docker-compose restart db
   ```

2. **ポートの競合**
   ```bash
   # 使用中のポートを確認
   sudo lsof -i :8000
   sudo lsof -i :3000
   ```

3. **ディスク容量不足**
   ```bash
   # Dockerの使用容量確認
   docker system df
   
   # 不要なリソースの削除
   docker system prune -a
   ```

## セキュリティ推奨事項

1. **環境変数の管理**
   - 本番環境では必ず強力なSECRET_KEYを使用
   - データベースパスワードは定期的に変更
   - 環境変数は.envファイルではなく、環境変数管理システムを使用

2. **ネットワークセキュリティ**
   - 必要なポートのみを公開
   - ファイアウォールルールを適切に設定
   - HTTPS/TLSを必ず使用

3. **定期的なアップデート**
   - Dockerイメージの定期的な更新
   - 依存関係の脆弱性スキャン
   - セキュリティパッチの適用

## パフォーマンスチューニング

### PostgreSQLの最適化

```sql
-- 接続数の調整
ALTER SYSTEM SET max_connections = 200;

-- 共有バッファの調整
ALTER SYSTEM SET shared_buffers = '256MB';

-- 設定の反映
SELECT pg_reload_conf();
```

### Dockerリソース制限

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## サポート

問題が発生した場合は、以下の手順でサポートを受けてください：

1. [GitHub Issues](https://github.com/your-org/project-management-tool/issues)で既知の問題を確認
2. 新しいIssueを作成（ログとエラーメッセージを含める）
3. コミュニティフォーラムで質問