// 互動式主程式：整合 function calling + 對話迴圈 + 記憶
// 執行: npm start

import { input } from "@inquirer/prompts";
import { client, DEFAULT_MODEL } from "./lib/openai.js";
import { convertUnitTool, convertUnit } from "./tools/convertUnit.js";
import { initMessage, addMessage, getMessages } from "./db/messages.js";
import { spinner } from "./utils/spinner.js";

// ===== 工具註冊中心 =====
const AVAILABLE_TOOLS = {
  convert_unit: convertUnit,
};

const tools = [convertUnitTool];
// ========================

const SYSTEM_PROMPT = `你是一位專精「單位換算」的小助理。
當使用者詢問任何單位換算相關問題時，請主動呼叫 convert_unit 工具來計算，不要自己心算或估算。
支援的換算包括：攝氏↔華氏、公里↔英里、公斤↔磅。
請全程用繁體中文回答，回答時把工具回傳的數值整理成自然口語句子，並四捨五入到合理位數（溫度2位、距離與重量保留2位即可）。`;

await initMessage(SYSTEM_PROMPT);

console.log("📐 單位換算小助理已上線！試試問我:");
console.log("   • 25 度 C 是華氏幾度？");
console.log("   • 100 英里等於多少公里？");
console.log("   • 我體重 65 公斤,換算成磅是多少？");
console.log("   (輸入 exit 結束)\n");

try {
  while (true) {
    const userQuestion = (await input({ message: "你：" })).trim();

    if (userQuestion === "") continue;
    if (userQuestion.toLowerCase() === "exit") {
      console.log("📐 再會～");
      break;
    }

    await addMessage(userQuestion);

    // 內層迴圈:處理 AI 可能多輪 tool call
    while (true) {
      const spin = spinner("思考中...").start();
      const response = await client.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: getMessages(),
        tools,
        tool_choice: "auto",
      });
      spin.stop();

      const message = response.choices[0].message;
      await addMessage(message);

      if (!message.tool_calls || message.tool_calls.length === 0) {
        console.log(`\n🤖 ${message.content}\n`);
        break;
      }

      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`\n🔧 [呼叫 ${fnName}] ${JSON.stringify(args)}`);

        const fn = AVAILABLE_TOOLS[fnName];
        const result = fn
          ? await fn(args)
          : { error: `Unknown tool: ${fnName}` };
        console.log(`✅ [結果] ${JSON.stringify(result)}\n`);

        await addMessage({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }
  }
} catch (err) {
  if (err.name === "ExitPromptError") {
    console.log("\n📐 再會～");
  } else {
    throw err;
  }
}
