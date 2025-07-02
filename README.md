# プロジェクト管理・WBSツール

システム開発プロジェクト向けの工程管理・WBSツールです。複数プロジェクトの並行管理、ガントチャート表示、リソース管理、チームコラボレーション機能を備えたWebアプリケーションです。

## 技術スタック

### バックエンド
- **Python 3.11+**
- **FastAPI** - 高性能なWeb API フレームワーク
- **SQLAlchemy** - ORM
- **Alembic** - データベースマイグレーション
- **PostgreSQL** - 本格運用データベース
- **SQLite** - 開発初期用データベース
- **Pydantic** - データバリデーション
- **JWT** - 認証

### フロントエンド（予定）
- **React 18+**
- **TypeScript**
- **Vite**
- **TanStack Query**
- **React Hook Form**
- **dhtmlx-gantt**
- **Ant Design**

### 開発・デプロイ
- **Docker & docker-compose**
- **オンプレミス展開対応**

## 主要機能

### 1. ユーザー管理・認証
- JWTベースの認証システム
- 役割ベースのアクセス制御（RBAC）
- システム管理者、プロジェクトオーナー、プロジェクトマネージャー、チームメンバー、閲覧者

### 2. プロジェクト管理
- プロジェクトの作成・編集・削除
- プロジェクトメンバーの管理
- プロジェクトステータス管理
- プロジェクト権限管理

### 3. WBS・タスク管理
- 3階層のタスク構造（フェーズ > タスク > 詳細タスク）
- タスク間依存関係（FS、SS、FF、SF）
- タスク属性管理（担当者、期間、工数、優先度、ステータス）
- 成果物リンク管理
- マイルストーン管理

### 4. ガントチャート（準備中）
- プロジェクトタスクの視覚的表示
- 依存関係の表示
- クリティカルパス表示
- ベースライン管理

### 5. リソース管理（準備中）
- 人的・物的リソース管理
- リソース割当
- リソース競合チェック

### 6. チームコラボレーション
- タスクコメント機能
- 工数記録・時間管理
- 変更履歴追跡

## セットアップ

### 前提条件
- Docker & Docker Compose
- Git

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd project-management-tool
```

### 2. SQLiteでの開発環境構築（簡単）
```bash
cd backend

# 仮想環境作成・有効化
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係インストール
pip install -r requirements.txt

# データベース初期化（SQLite）
python -c "from app.database import create_tables; create_tables()"

# 開発サーバー起動
uvicorn app.main:app --reload
```

### 3. Docker Composeでの本格環境構築
```bash
# バックエンドのみ起動（PostgreSQL含む）
docker-compose up -d backend

# 全サービス起動（フロントエンド含む）
docker-compose --profile frontend up -d
```

### 4. データベースマイグレーション & 初期データ投入
```bash
# backend ディレクトリで実行
cd backend

# 1) Alembic マイグレーションを適用
alembic upgrade head

# 2) 初期管理者ユーザー(seed) 作成
python seed.py

# ログに "Admin user created" と表示されれば完了です。
# 既にユーザーが存在する場合はスキップされます。
```

## API仕様

### 認証
```bash
# ログイン
curl -X POST "http://localhost:8000/api/v1/users/login/simple" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### API ドキュメント
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## プロジェクト構造

```
project-management-tool/
├── backend/                 # FastAPI バックエンド
│   ├── app/
│   │   ├── api/            # API エンドポイント
│   │   │   ├── core/           # 設定・セキュリティ
│   │   │   ├── crud/           # データベース操作
│   │   │   ├── models/         # SQLAlchemy モデル
│   │   │   ├── schemas/        # Pydantic スキーマ
│   │   │   ├── database.py     # データベース設定
│   │   │   └── main.py         # FastAPI アプリケーション
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   ├── frontend/               # React フロントエンド（予定）
│   ├── docker-compose.yml      # Docker Compose 設定
│   └── README.md
```

## 開発状況

### Phase 1: MVP（完了）
- ✅ プロジェクト構造作成
- ✅ 基本データモデル実装
- ✅ 認証・認可システム
- ✅ 基本的なCRUD操作
- ✅ API エンドポイント
- ✅ プロジェクト管理機能
- ✅ タスク管理機能
- ✅ 時間管理・コメント機能

### Phase 2: 高度機能（計画中）
- 🚧 フロントエンド実装
- 🚧 ガントチャート機能
- 🚧 リソース管理機能
- 🚧 テンプレート機能
- 🚧 依存関係管理の改善

### Phase 3: 連携・通知機能（計画中）
- 📋 外部システム連携
- 📋 通知機能
- 📋 インポート/エクスポート
- 📋 レポート機能

## API使用例

### プロジェクト作成
```bash
curl -X POST "http://localhost:8000/api/v1/projects/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Webアプリケーション開発",
    "description": "新規Webアプリケーションの開発プロジェクト",
    "status": "planning"
  }'
```

### タスク作成
```bash
curl -X POST "http://localhost:8000/api/v1/tasks/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "要件定義",
    "description": "システム要件の定義とドキュメント作成",
    "project_id": 1,
    "task_type": "phase",
    "estimated_hours": 40.0
  }'
```

### ガントチャートデータ取得
```bash
curl -X GET "http://localhost:8000/api/v1/tasks/project/1/gantt" \
  -H "Authorization: Bearer <token>"
```

## 設定

### 環境変数
```bash
# データベース設定
DATABASE_URL=postgresql://postgres:password@localhost:5432/project_management
USE_SQLITE=true  # 開発時のSQLite使用

# セキュリティ設定
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=480

# CORS設定
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

## テスト

```bash
# ユニットテスト実行
cd backend
pytest

# テストカバレッジ
pytest --cov=app
```

## トラブルシューティング

### よくある問題

1. **データベース接続エラー**
   - PostgreSQLが起動しているか確認
   - 認証情報が正しいか確認
   - SQLiteモードに切り替えて確認

2. **JWT認証エラー**
   - トークンの有効期限を確認
   - SECRET_KEYが正しく設定されているか確認

3. **権限エラー**
   - ユーザーの役割が適切に設定されているか確認
   - プロジェクトメンバーとして登録されているか確認

## ライセンス

このプロジェクトは開発・学習目的で作成されています。

## 貢献

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## サポート

質問や問題がある場合は、GitHubのIssuesをご利用ください。
