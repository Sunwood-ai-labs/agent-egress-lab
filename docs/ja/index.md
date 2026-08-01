---
layout: home

hero:
  name: Agent Egress Lab
  text: 構成でデフォルト拒否する
  tagline: AIエージェントの許可リスト付きegressと、Playwrightのオフライン境界をDockerで再現します。
  image:
    src: /icon.svg
    alt: Agent Egress Lab shield
  actions:
    - theme: brand
      text: はじめる
      link: /ja/guide/getting-started
    - theme: alt
      text: セキュリティモデル
      link: /ja/guide/security-model
    - theme: alt
      text: GitHub
      link: https://github.com/Sunwood-ai-labs/agent-egress-lab

features:
  - title: Agentネットワークをデフォルト拒否
    details: 直接インターネット経路をなくし、ポリシーで制御されたCONNECTプロキシだけを外向き経路にします。
  - title: オフラインのブラウザRunner
    details: Playwrightから内部テストアプリは表示できる一方、公開ページへの遷移は実ブラウザの証拠付きで失敗します。
  - title: 残存リスクを明記
    details: 許可済み接続先を経由した情報流出など、ネットワーク許可リストだけでは止められない範囲を説明します。
---

## このラボで証明すること

Agent Egress Labは、セキュリティ上の仮定を繰り返し実行できる検証に変えます。Agent側では、直接通信・プロキシで許可された通信・プロキシで拒否された通信を確認します。ブラウザ側では、内部ページが表示でき、公開ページが表示できないことを別の環境で確認します。

これは教育・検証用フィクスチャであり、本番向けセキュリティ境界ではありません。[はじめに](/ja/guide/getting-started)を実行した後、構成を応用する前に[セキュリティモデル](/ja/guide/security-model)を確認してください。
