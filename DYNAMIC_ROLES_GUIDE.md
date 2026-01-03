# 動的役割決定ガイド

## 🎯 改善内容

### Before (固定役割)
```typescript
Agent A = 常にBuyer（支払う側）
Agent B = 常にSeller（譲る側）
```

### After (動的役割)
```typescript
Collision発生
  ↓
両エージェントがAIで状況分析
  ↓
急いでいる方 = Buyer
急いでいない方 = Seller
  ↓
役割が動的に決定！
```

---

## 🚀 使い方

### 従来版（固定役割）を使用:

```typescript
// Frontend
simulation.negotiate(
  buyerAddress,  // Agent A（固定）
  sellerAddress, // Agent B（固定）
  locationId
);

// → POST /api/simulation { action: "negotiate", ... }
```

### **新版（動的役割）を使用**:

```typescript
// Frontend
simulation.negotiateDynamic(
  1,  // Agent 1 ID（役割未定）
  2,  // Agent 2 ID（役割未定）
  locationId
);

// → POST /api/simulation/negotiate-dynamic { agent1Id, agent2Id, locationId }
```

---

## 📊 動作の違い

### シナリオ1: Agent A が急いでいる

```json
Agent A Context:
{
  "mission": { "type": "delivery", "deadline": "30分後", "priority": "high" },
  "strategy": { "maxWillingToPay": 500, "patienceLevel": 2 }
}

Agent B Context:
{
  "mission": { "type": "patrol", "deadline": null, "priority": "low" },
  "strategy": { "minAcceptableOffer": 400, "patienceLevel": 8 }
}
```

**結果**:
```
AI判定:
- Agent A → Buyer（急いでいるので払う）
- Agent B → Seller（急いでいないので待つ）

合意価格: 400 JPYC
決済: Agent A → Agent B
```

### シナリオ2: 状況が逆転

```json
Agent A Context:
{
  "mission": { "type": "leisure", "deadline": null, "priority": "low" },
  "strategy": { "minAcceptableOffer": 350, "patienceLevel": 9 }
}

Agent B Context:
{
  "mission": { "type": "emergency", "deadline": "5分後", "priority": "high" },
  "strategy": { "maxWillingToPay": 500, "patienceLevel": 1 }
}
```

**結果**:
```
AI判定:
- Agent A → Seller（急いでいないので待つ）
- Agent B → Buyer（緊急なので払う）

合意価格: 425 JPYC
決済: Agent B → Agent A （逆方向！）
```

---

## 🧪 テスト方法

### 1. デフォルト設定でテスト

```bash
# サーバー起動
pnpm dev

# 動的ネゴシエーションAPI呼び出し
curl -X POST http://localhost:3000/api/simulation/negotiate-dynamic \
  -H "Content-Type: application/json" \
  -d '{
    "agent1Id": 1,
    "agent2Id": 2,
    "locationId": "LOC_TEST"
  }'
```

**期待される結果**:
```json
{
  "success": true,
  "buyer": { "agentId": 1, "wallet": "0x..." },
  "seller": { "agentId": 2, "wallet": "0x..." },
  "agreedPrice": 400,
  "transcript": [
    "[System] Both agents evaluating...",
    "[Agent 1] I'm on urgent delivery, willing to pay 450 JPYC",
    "[Agent 2] I'm on patrol, will accept 350 JPYC",
    "[System] Match found: Agent 1 (Buyer) ↔ Agent 2 (Seller)",
    "[System] Agreed price: 400 JPYC",
    "[System] Payment confirmed: 0x..."
  ]
}
```

### 2. カスタムコンテキストでテスト

Agent Card JSONを編集:

```json
// public/agent-cards/agent-a.json
{
  "currentContext": {
    "mission": {
      "type": "leisure",  // ← "delivery" から変更
      "priority": "low"    // ← "high" から変更
    },
    "negotiationStrategy": {
      "patienceLevel": 9   // ← 2 から変更（とても我慢強い）
    }
  }
}
```

再度テスト → Agent A が Seller になるはず！

---

## 🎨 UI での表示

### ダッシュボードに追加すべき表示:

```typescript
// src/app/agent/page.tsx

{result && (
  <div className="p-4 bg-slate-900 border border-cyan-500/30 rounded-lg">
    <h3 className="text-cyan-400 font-bold mb-2">Negotiation Result</h3>
    <div className="space-y-1 text-sm">
      <p>Buyer: Agent {result.buyer?.agentId}</p>
      <p>Seller: Agent {result.seller?.agentId}</p>
      <p>Price: {result.agreedPrice} JPYC</p>
      <p className="text-green-400">
        ✅ Roles determined dynamically by AI
      </p>
    </div>
  </div>
)}
```

---

## 💡 実運用での活用例

### ユースケース1: 配送ドローン vs パトカー

```
配送ドローン:
- Mission: 医薬品配送（緊急）
- Deadline: 10分後
- Priority: High
  ↓
AI判定: Buyer（命に関わるので支払う）

パトカー:
- Mission: 通常パトロール
- Deadline: なし
- Priority: Low
  ↓
AI判定: Seller（緊急ではないので譲る）

結果: 配送ドローンが500 JPYC支払って通過
```

### ユースケース2: 観光客 vs 通勤者

```
観光客:
- Mission: 観光
- Deadline: なし
- Budget: 十分ある
  ↓
AI判定: 柔軟（状況次第）

通勤者:
- Mission: 出勤
- Deadline: 会議まで5分
- Budget: 限られている
  ↓
AI判定: Buyer（遅刻できないので支払う）

結果: 通勤者が300 JPYC支払って通過
```

### ユースケース3: 両方とも急いでいる

```
Agent A: 緊急配送、500 JPYC払える
Agent B: 救急車、600 JPYC払える
  ↓
競争入札: 高い方が勝つ
  ↓
結果: Agent B（救急車）が600 JPYC支払って通過
```

---

## 📝 まとめ

| 項目 | 固定役割版 | 動的役割版 |
|------|-----------|-----------|
| 役割決定 | 事前に固定 | AIが毎回判断 |
| 柔軟性 | 低い | 高い |
| 現実性 | デモ用 | 実運用可能 |
| 実装複雑度 | シンプル | やや複雑 |
| API | `/api/simulation` | `/api/simulation/negotiate-dynamic` |

**推奨**: 本番環境では動的役割版を使用してください。

---

完了！

