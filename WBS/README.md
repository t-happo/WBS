# プロジェクト管理・WBSツール

システム開発プロジェクト向けの工程管理・WBSツールです。複数プロジェクトの並行管理、ガントチャート表示、タスク依存関係管理、レポート・分析機能を備えた本格的なWebアプリケーションです。

## ✨ 主要機能

### 📊 プロジェクト管理
- 複数プロジェクトの並行管理
- プロジェクト作成・編集・削除
- プロジェクトステータス管理（計画中・進行中・完了・保留）
- リアルタイム進捗トラッキング

### 📋 WBS・タスク管理
- 3階層のタスク構造（フェーズ・タスク・詳細タスク）
- タスクの作成・編集・削除
- 工数管理（予定工数・実績工数）
- 優先度・ステータス管理
- 期間設定（開始日・終了日）

### 🔗 タスク依存関係
- 4種類の依存関係タイプ
  - 完了→開始（Finish to Start）
  - 開始→開始（Start to Start）  
  - 完了→完了（Finish to Finish）
  - 開始→完了（Start to Finish）
- ラグ日数設定
- 依存関係の視覚的表示

### 📈 ガントチャート
- DHTMLX Ganttを使用した本格的なガントチャート
- タスク間の依存関係を線で表示
- 進捗状況の視覚化
- インタラクティブな操作

### 👥 ユーザー・権限管理
- 5段階の役割ベースアクセス制御
  - システム管理者
  - プロジェクトオーナー
  - プロジェクトマネージャー
  - チームメンバー
  - 閲覧者
- JWT認証システム

### 📊 レポート・分析
- リアルタイム統計ダッシュボード
- プロジェクト進捗一覧
- タスク統計とグラフ
- 効率指標（完了率・平均進捗）
- 期限超過タスクの検出
- データエクスポート機能

## 🛠 技術スタック

### バックエンド
- **Python 3.11+**
- **FastAPI** - 高性能なWeb API フレームワーク
- **SQLAlchemy** - ORM
- **SQLite** - データベース
- **Pydantic** - データバリデーション
- **JWT** - 認証

### フロントエンド
- **React 18+**
- **TypeScript**
- **Vite**
- **TanStack Query** - サーバー状態管理
- **Ant Design** - UIコンポーネント
- **DHTMLX Gantt** - ガントチャート
- **Day.js** - 日時処理

### 開発・デプロイ
- **Docker & docker-compose**
- **オンプレミス展開対応**

## 🚀 クイックスタート

### 1. フロントエンド起動
```bash
cd frontend
npm install
npm run dev
```
アプリケーション: http://localhost:3000

### 2. バックエンド起動
```bash
cd backend
source venv/bin/activate  # または venv\Scripts\activate (Windows)
python -m uvicorn app.main:app --reload
```
API: http://localhost:8000
API ドキュメント: http://localhost:8000/docs

### 3. ログイン
- ユーザー名: `admin`
- パスワード: `admin`

## 📱 アプリケーション画面

### メイン機能
1. **プロジェクト一覧** (`/projects`)
   - プロジェクトの作成・編集・削除
   - プロジェクトステータス管理
   
2. **プロジェクト詳細** (`/projects/:id`)
   - **タスク一覧タブ**: タスクの CRUD 操作
   - **依存関係タブ**: タスク間の依存関係管理
   - **ガントチャートタブ**: 視覚的なプロジェクト進捗

3. **ユーザー管理** (`/users`)
   - ユーザーの作成・編集・削除
   - 役割ベースの権限管理

4. **レポート** (`/reports`)
   - リアルタイム統計ダッシュボード
   - プロジェクト進捗分析
   - データエクスポート

## 🔧 開発環境セットアップ

### 前提条件
- **Node.js 18+**
- **Python 3.11+**
- **Git**

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd WBS
```

### 2. バックエンドセットアップ
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
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. フロントエンドセットアップ
```bash
cd frontend

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

### 4. アプリケーションアクセス
- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **API ドキュメント**: http://localhost:8000/docs

### 5. 初期ログイン
- **ユーザー名**: `admin`
- **パスワード**: `admin`

## 📋 API エンドポイント

### 認証
```bash
# ログイン
POST /api/v1/users/login/simple
{
  "username": "admin",
  "password": "admin"
}
```

### プロジェクト管理
```bash
GET    /api/v1/projects/           # プロジェクト一覧
POST   /api/v1/projects/           # プロジェクト作成
PUT    /api/v1/projects/{id}       # プロジェクト更新
DELETE /api/v1/projects/{id}       # プロジェクト削除
GET    /api/v1/projects/statistics # 統計データ
```

### タスク管理
```bash
GET    /api/v1/tasks/project/{project_id}       # プロジェクトのタスク一覧
POST   /api/v1/tasks/                           # タスク作成
PUT    /api/v1/tasks/{id}                       # タスク更新
DELETE /api/v1/tasks/{id}                       # タスク削除
GET    /api/v1/tasks/project/{project_id}/gantt # ガントチャートデータ
```

### 依存関係管理
```bash
GET    /api/v1/tasks/project/{project_id}/dependencies # 依存関係一覧
POST   /api/v1/tasks/dependencies                       # 依存関係作成
DELETE /api/v1/tasks/dependencies/{id}                  # 依存関係削除
```

### API ドキュメント
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📁 プロジェクト構造

```
WBS/
├── backend/                    # FastAPI バックエンド
│   ├── app/
│   │   ├── api/v1/            # API エンドポイント
│   │   │   ├── projects.py        # プロジェクト管理API
│   │   │   ├── tasks.py           # タスク・依存関係API
│   │   │   └── users.py           # ユーザー管理API
│   │   ├── core/              # 設定・セキュリティ
│   │   ├── crud/              # データベース操作
│   │   ├── models/            # SQLAlchemy モデル
│   │   ├── schemas/           # Pydantic スキーマ
│   │   ├── database.py        # データベース設定
│   │   └── main.py            # FastAPI アプリケーション
│   ├── requirements.txt
│   ├── project_management.db   # SQLite データベース
│   └── venv/                  # Python 仮想環境
├── frontend/                  # React フロントエンド
│   ├── src/
│   │   ├── components/        # React コンポーネント
│   │   │   ├── ProjectList.tsx    # プロジェクト一覧
│   │   │   ├── TaskList.tsx       # タスク・依存関係管理
│   │   │   ├── GanttChart.tsx     # ガントチャート
│   │   │   ├── Reports.tsx        # レポート・分析
│   │   │   ├── UserManagement.tsx # ユーザー管理
│   │   │   └── Layout.tsx         # 共通レイアウト
│   │   ├── services/
│   │   │   └── api.ts             # API クライアント
│   │   ├── contexts/          # React Context
│   │   └── App.tsx            # メインアプリケーション
│   ├── package.json
│   └── node_modules/
└── README.md                  # このファイル
```

## 🎯 開発状況

### Phase 1: Core MVP（✅ 完了）
- ✅ プロジェクト構造作成
- ✅ 基本データモデル実装  
- ✅ 認証・認可システム
- ✅ 基本的なCRUD操作
- ✅ API エンドポイント

### Phase 2: フロントエンド・UI（✅ 完了）
- ✅ React + TypeScript フロントエンド
- ✅ プロジェクト管理画面
- ✅ タスク管理画面
- ✅ ユーザー管理画面
- ✅ 認証・ログイン機能

### Phase 3: 高度機能（✅ 完了）
- ✅ ガントチャート機能（DHTMLX Gantt）
- ✅ タスク依存関係管理
- ✅ リアルタイム統計・レポート機能
- ✅ データエクスポート機能
- ✅ 進捗トラッキング

### Phase 4: 今後の拡張（📋 計画中）
- 📋 プロジェクトテンプレート機能
- 📋 通知・アラート機能
- 📋 ファイル添付機能
- 📋 外部システム連携（Slack、Teams等）
- 📋 モバイル対応
- 📋 マルチテナント対応

## 💡 使用方法・操作手順

### 1. プロジェクト作成
1. プロジェクト一覧画面で「新規プロジェクト」ボタンをクリック
2. プロジェクト名、説明、ステータスを入力
3. 「OK」で作成完了

### 2. タスク管理
1. プロジェクト一覧から対象プロジェクトの「詳細」をクリック
2. 「タスク一覧」タブで「新規タスク」ボタンをクリック
3. タスク情報を入力（名前、説明、タイプ、優先度、工数、期間など）

### 3. 依存関係設定
1. プロジェクト詳細の「依存関係」タブを選択
2. 「依存関係追加」ボタンをクリック
3. 先行タスク、後続タスク、依存タイプ、ラグ日数を設定

### 4. ガントチャート表示
1. プロジェクト詳細の「ガントチャート」タブを選択
2. タスクと依存関係が視覚的に表示される
3. 進捗状況も色分けで確認可能

### 5. レポート確認
1. サイドメニューから「レポート」を選択
2. プロジェクト統計、タスク統計、進捗状況を確認
3. 「エクスポート」ボタンでデータをダウンロード

## 🔧 カスタマイズ・設定

### 依存関係タイプ
- **完了→開始**: 先行タスクが完了してから後続タスクが開始（最も一般的）
- **開始→開始**: 先行タスクが開始すると後続タスクも開始可能
- **完了→完了**: 先行タスクが完了してから後続タスクも完了可能
- **開始→完了**: 先行タスクが開始してから後続タスクが完了可能

### タスクタイプ
- **フェーズ**: 大きな作業単位（例：設計フェーズ、開発フェーズ）
- **タスク**: 具体的な作業（例：画面設計、API開発）
- **詳細タスク**: より細かい作業（例：ログイン画面作成）

### ユーザー役割
- **システム管理者**: すべての機能にアクセス可能
- **プロジェクトオーナー**: プロジェクト全体の管理
- **プロジェクトマネージャー**: プロジェクト運営・進捗管理
- **チームメンバー**: タスクの実行・更新
- **閲覧者**: 読み取り専用アクセス

## 🐛 トラブルシューティング

### よくある問題と解決方法

1. **フロントエンドが起動しない**
   ```bash
   # Node.js バージョン確認
   node --version  # 18+ が必要
   
   # 依存関係の再インストール
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **バックエンドAPI接続エラー**
   ```bash
   # バックエンドが起動しているか確認
   curl http://localhost:8000/health
   
   # CORS設定確認（main.py）
   allow_origins=["http://localhost:3000"]
   ```

3. **データベースエラー**
   ```bash
   # データベースファイル確認
   ls -la backend/project_management.db
   
   # データベース再作成
   cd backend
   rm project_management.db
   python -c "from app.database import create_tables; create_tables()"
   ```

4. **ログインできない**
   - デフォルトユーザー: `admin` / `admin`
   - ブラウザのLocalStorageをクリア
   - コンソールでネットワークエラーを確認

### パフォーマンス最適化

- **大量データ対応**: ページネーション、仮想スクロール実装予定
- **リアルタイム更新**: WebSocket実装予定
- **キャッシュ**: Redis実装予定

## 📄 ライセンス

このプロジェクトは学習・開発目的で作成されています。
商用利用については別途ご相談ください。

## 🤝 貢献・コントリビューション

1. このリポジトリをFork
2. 機能ブランチを作成 (`git checkout -b feature/new-feature`)
3. 変更をコミット (`git commit -m 'Add: 新機能追加'`)
4. ブランチをプッシュ (`git push origin feature/new-feature`)
5. Pull Requestを作成

### 開発時の注意点
- TypeScriptの型定義を必ず記述
- APIエンドポイントには適切なエラーハンドリングを実装
- UIコンポーネントはAnt Designのガイドラインに従う
- データベース変更時はマイグレーション作成

## 📞 サポート・お問い合わせ

- **Bug報告**: GitHubのIssuesをご利用ください
- **機能要望**: GitHubのIssuesで `enhancement` ラベルを付けてください
- **質問**: GitHubのDiscussionsをご利用ください

---

**プロジェクト管理・WBSツール v1.0**  
© 2025 - 高機能プロジェクト管理システム
