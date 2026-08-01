# はじめに

2つのセキュリティ実験を実行し、それぞれが生成する証拠を確認します。

## 必要なもの

- Docker EngineまたはDocker Desktop（Docker Compose v2対応）
- PowerShell 7（`pwsh`）
- イメージビルドと許可対象GitHub APIの確認に使用するインターネット接続

## Agent egress検証を実行する

リポジトリのルートで実行します。

```powershell
./verify.ps1
```

スクリプトはプロキシをビルドし、異なる3経路を確認します。

1. プロキシを迂回した`api.github.com:443`への直接接続は失敗する
2. 設定済みプロキシを経由した`api.github.com:443`への接続は成功する
3. プロキシを経由した`example.com:443`への接続は失敗し、プロキシログにも拒否が残る

成功時の出力は`RESULT: 3/3 controls verified`で終わります。レポート用データは`report/results.json`、一時的なコンソール証拠はgit管理外の`output/verification.log`へ保存されます。

## オフラインブラウザ検証を実行する

```powershell
./verify-offline-e2e.ps1
```

Playwrightコンテナは、同じDocker内部ネットワーク上の`http://local-app/`を表示します。続いて`https://example.com/`へ遷移しますが、外部経路がないため失敗しなければなりません。一時的なスクリーンショットとJSON証拠はgit管理外の`artifacts/`へ保存されます。

## レポートを表示する

`./verify.ps1`を実行した後に、次を実行します。

```powershell
./serve-report.ps1
```

`http://127.0.0.1:4173`を開きます。レポートは最新の検証データを読みやすく表示するもので、監視サービスではありません。

## クリーンアップ

```powershell
docker compose down --remove-orphans
docker compose -f offline-e2e.compose.yaml down --remove-orphans
```

接続先を変更したり、構成を応用したりする前に[セキュリティモデル](./security-model)を確認してください。
