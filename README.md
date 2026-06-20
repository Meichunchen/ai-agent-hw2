# 作業 2：Function Calling — 單位換算工具

## 檔案結構

```
ai-agent-hw2/
├── tools/
│   └── convertUnit.js   # ⭐ 工具核心：JSON Schema + 實作 + 別名表 + 公式表
├── lib/openai.js        # OpenAI client 封裝（client + DEFAULT_MODEL）
├── utils/spinner.js     # CLI 載入動畫（ora）
├── db/messages.js       # 對話歷史儲存（lowdb，給 main.js 用）
├── function_call.js     # ⭐ 主測試程式：互動式 Function Calling 展示
├── main.js              # 互動式版本：對話迴圈 + tool calling + 記憶
├── config.js            # 讀 .env
├── package.json
├── .env.example
├── .gitignore
└── .history/            # main.js 每次跑會在這裡留對話紀錄
```

## 工具註冊

```js
import { convertUnitTool, convertUnit } from "./tools/convertUnit.js";

const AVAILABLE_TOOLS = {
  convert_unit: convertUnit,
};

const tools = [convertUnitTool];
```

## JSON Schema 定義

```js
{
  type: "function",
  function: {
    name: "convert_unit",
    description: "進行單位換算。支援三組單位的雙向換算：攝氏(°C) ↔ 華氏(°F)、公里(km) ↔ 英里(mile)、公斤(kg) ↔ 磅(lb)。",
    parameters: {
      type: "object",
      properties: {
        value:     { type: "number", description: "要換算的數值，例如 25" },
        from_unit: { type: "string", description: "原始單位..." },
        to_unit:   { type: "string", description: "目標單位..." }
      },
      required: ["value", "from_unit", "to_unit"]
    }
  }
}
```

## 錯誤處理

工具回傳的 error 物件範例（仿 weather 工具格式）：

```json
// value 不是數字
{ "error": "value 必須是數字，收到的是: \"攝氏\"" }

// 跨類別換算
{
  "error": "不支援的單位組合：公斤 → 英里（只能在同類別內換算，例如溫度↔溫度、長度↔長度、重量↔重量）",
  "supported_conversions": ["c->f","f->c","km->mi","mi->km","kg->lb","lb->kg"]
}

// 不認識的單位
{
  "error": "不支援的原始單位「光年」",
  "supported_units": ["°C（攝氏）","°F（華氏）","公里","英里","公斤","磅"]
}
```

---

## 實測對話紀錄

### 測試 1：

**你問：** 200磅是幾公斤

```
🔧 [tool 呼叫] convert_unit({"value":200,"from_unit":"lb","to_unit":"kg"})
✅ [tool 回傳] {"value":200,"from_unit":"磅","to_unit":"公斤","result":90.7186}
```

**🤖 AI 回答：** 200磅約等於90.72公斤（四捨五入到小數點後兩位）。

---

### 測試 2：

**你問：** 10公里是多少英里

```
🔧 [tool 呼叫] convert_unit({"value":10,"from_unit":"km","to_unit":"mile"})
✅ [tool 回傳] {"value":10,"from_unit":"公里","to_unit":"英里","result":6.2137}
```

**🤖 AI 回答：** 10 公里約等於 6.2137 英里。

---

### 測試 3：

**你問：** 15度是攝氏幾度

```
🔧 [tool 呼叫] convert_unit({"value":15,"from_unit":"f","to_unit":"c"})
✅ [tool 回傳] {"value":15,"from_unit":"°F（華氏）","to_unit":"°C（攝氏）","result":-9.4444}
```

**🤖 AI 回答：**
> 如果你是指 15°F（華氏），換算成攝氏約 −9.44°C。
> （公式：C = (F − 32) ÷ 1.8）
> 如果你指的是 15°C（攝氏），那就是 59°F（華氏）。需要我幫你做其他單位的換算嗎？


---

### 測試 4：

**你問：** 一光年是幾公里

**🤖 AI 回答（直接回，沒呼叫 tool）：**
> 一光年約等於 9.46073 × 10^12 公里。
>
> 計算方式（常用定義）：
> - 光速 c = 299,792.458 公里/秒
> - 一儒略年 = 365.25 天 = 31,557,600 秒
> - 一光年 = c × 31,557,600 ≈ 2.99792458×10^5 × 3.15576×10^7 ≈ 9.4607304725808×10^12 公里
>
> 約寫為：9,460,730,472,581 公里（四捨五入）。
