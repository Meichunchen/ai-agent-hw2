// 作業驗收用的互動式 Function Calling 展示
// 執行: node function_call.js（或 npm test）
// 你輸入問題,AI 會呼叫 convert_unit 工具,程式會印出完整呼叫流程

import { input } from "@inquirer/prompts";
import { client, DEFAULT_MODEL } from "./lib/openai.js";
import { convertUnitTool, convertUnit } from "./tools/convertUnit.js";
import { spinner } from "./utils/spinner.js";

// ===== 工具註冊中心 =====
const AVAILABLE_TOOLS = {
  convert_unit: convertUnit,
};

const tools = [convertUnitTool];
// ========================

console.log("📐 單位換算 Function Calling 互動測試");
console.log("試試問：");
console.log("  • 25 度 C 是華氏幾度？");
console.log("  • 10 公里等於幾英里？");
console.log("  • 70 公斤是幾磅？");
console.log("（輸入 exit 結束）\n");

async function runOne(question) {
  console.log("\n" + "=".repeat(64));
  console.log("📝 你問:" + question);
  console.log("=".repeat(64));

  const messages = [{ role: "user", content: question }];

  while (true) {
    const spin = spinner("AI 思考中...").start();
    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      tools,
      tool_choice: "auto",
    });
    spin.stop();

    const message = response.choices[0].message;
    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      console.log("\n🤖 AI 回答:" + message.content);
      return;
    }

    for (const toolCall of message.tool_calls) {
      const fnName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`\n🔧 [tool 呼叫] ${fnName}(${JSON.stringify(args)})`);

      const fn = AVAILABLE_TOOLS[fnName];
      if (!fn) {
        const err = { error: `Unknown tool: ${fnName}` };
        console.log(`❌ [tool 回傳] ${JSON.stringify(err)}`);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(err),
        });
        continue;
      }

      const result = await fn(args);
      console.log(`✅ [tool 回傳] ${JSON.stringify(result)}`);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }
}

try {
  while (true) {
    const question = (await input({ message: "你：" })).trim();
    if (question === "") continue;
    if (question.toLowerCase() === "exit") {
      console.log("再會～");
      break;
    }
    await runOne(question);
  }
} catch (err) {
  if (err.name === "ExitPromptError") {
    console.log("\n再會～");
  } else {
    throw err;
  }
}
