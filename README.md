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

---

## 實測對話紀錄
![Function Calling](./HW2.PNG)
