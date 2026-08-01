<div align="center">
  <img src="./docs/public/release-header-v0.1.0.svg" alt="Agent Egress Lab v0.1.0" width="100%">
  <h1>Agent Egress Lab</h1>
  <p><strong>AIエージェントの外向き通信をデフォルト拒否し、ブラウザテストをオフライン化する再現可能なDockerラボ。</strong></p>

  <p>
    <a href="https://github.com/Sunwood-ai-labs/agent-egress-lab/releases/tag/v0.1.0"><img alt="Release v0.1.0" src="https://img.shields.io/badge/release-v0.1.0-c7ff3d?style=flat-square&labelColor=111815"></a>
    <a href="https://github.com/Sunwood-ai-labs/agent-egress-lab/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/Sunwood-ai-labs/agent-egress-lab/ci.yml?branch=main&style=flat-square&label=CI"></a>
    <a href="https://sunwood-ai-labs.github.io/agent-egress-lab/ja/"><img alt="Documentation" src="https://img.shields.io/badge/docs-GitHub%20Pages-1f6feb?style=flat-square"></a>
    <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square"></a>
  </p>

  <p><a href="./README.md">English</a> · <strong>日本語</strong></p>
</div>

Agent Egress Labは、次の2つの隔離パターンを実際に動かして確認するための小さな実験環境です。

- AIエージェントの直接インターネット接続をなくし、許可リスト付きCONNECTプロキシだけを外向き経路にする
- Playwright E2E Runnerから内部テストアプリには接続できる一方、公開インターネットには接続できない状態を作る

このリポジトリは教育・検証用のテストフィクスチャです。ネットワーク境界と残存リスクを可視化するものであり、本番向けセキュリティ製品ではありません。

## 🚀 クイックスタート

### 必要なもの

- Docker EngineまたはDocker Desktop（Docker Compose v2対応）
- PowerShell 7（`pwsh`）
- 初回イメージビルドと許可対象の検証に使用するインターネット接続

リポジトリをcloneして、2つの検証を実行します。

```powershell
git clone https://github.com/Sunwood-ai-labs/agent-egress-lab.git
cd agent-egress-lab
./verify.ps1
./verify-offline-e2e.ps1
```

期待される結果：

| 制御 | 期待結果 |
| --- | --- |
| Agent → インターネットへ直接接続 | ブロック |
| Agent → プロキシ経由で`api.github.com:443` | 許可 |
| Agent → プロキシ経由で`example.com:443` | HTTP 403で拒否 |
| Offline E2E Runner → 内部テストアプリ | 表示成功 |
| Offline E2E Runner → 公開ページ | ブラウザエラーの証拠付きで失敗 |

検証スクリプトは、一時的な証拠をgit管理外の`output/`と`artifacts/`へ保存します。`./verify.ps1`の後に`./serve-report.ps1`を実行すると、`http://127.0.0.1:4173`でローカルレポートを確認できます。

## 🧭 アーキテクチャ

![Offline E2E Runnerのセキュリティ境界](docs/architecture/offline-e2e-security-boundary.jpg)

編集可能な元データは[`docs/architecture/offline-e2e-security-boundary.drawio`](docs/architecture/offline-e2e-security-boundary.drawio)です。高解像度で再利用できるSVGも同梱しています。

```text
agent-runner -- 内部sandbox network --> egress-proxy --> internet
                                            |
                                            +-- api.github.com:443 を許可
                                            +-- その他を拒否

Playwright E2E Runner -- 内部専用network --> local test app
                     X internetへの経路なし
```

## 🛡️ セキュリティモデル

AgentとブラウザRunnerのネットワークから、標準の外向き経路を取り除きます。Agentが外部サービスへ接続する唯一の経路は、明示的な`host:port`だけを許可する二重接続のプロキシです。Offline E2Eネットワークには外部ブリッジ自体がありません。

到達先は限定できますが、ペイロードの内容までは検査せず、許可した接続先を安全にするものでもありません。プロンプトインジェクション、侵害された依存関係、生成コードなどは、許可済みAPIを通じてデータを送信できる可能性があります。本番環境では、スコープを絞った認証情報、リクエスト単位のポリシー、承認、監査ログ、レート制限、堅牢なプロキシが別途必要です。

詳しくは[セキュリティモデル](https://sunwood-ai-labs.github.io/agent-egress-lab/ja/guide/security-model)と[`SECURITY.md`](./SECURITY.md)を参照してください。

## 📚 ドキュメント

- [はじめに](https://sunwood-ai-labs.github.io/agent-egress-lab/ja/guide/getting-started)
- [セキュリティモデル](https://sunwood-ai-labs.github.io/agent-egress-lab/ja/guide/security-model)
- [Offline Playwright E2E](https://sunwood-ai-labs.github.io/agent-egress-lab/ja/guide/offline-e2e)
- [v0.1.0 リリースノート](https://sunwood-ai-labs.github.io/agent-egress-lab/ja/releases/v0.1.0)
- [v0.1.0 ウォークスルー](https://sunwood-ai-labs.github.io/agent-egress-lab/ja/guide/articles/v0.1.0-walkthrough)

## 🗂️ リポジトリ構成

```text
compose.yaml                 Agentのデフォルト拒否と許可リスト付きプロキシ
offline-e2e.compose.yaml     Playwrightの内部専用テスト環境
demo/                        操作可能なOffline Sprint Boardサンプルアプリ
proxy.py                     最小構成のCONNECT専用テストプロキシ
verify.ps1                   3つのegress制御を検証
verify-offline-e2e.ps1       内部成功・外部失敗のブラウザ検証
report/                      ローカル検証レポートUI
docs/                        日英VitePressドキュメントと構成図
```

## 🤝 コントリビュート

IssueとPull Requestを歓迎します。変更を提案する前に[`CONTRIBUTING.md`](./CONTRIBUTING.md)を確認し、セキュリティ上の問題は[`SECURITY.md`](./SECURITY.md)に記載した非公開の手順で報告してください。

## 📄 ライセンス

[MIT License](./LICENSE)で公開しています。
