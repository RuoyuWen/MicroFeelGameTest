# AI模块调用流程与接口文档

## 📋 系统概述

AI RPG 测试系统包含 **5 个核心 AI 模块** 和 **1 个辅助功能**，它们协同工作，创造连贯的 RPG 对话体验。

---

## 🎯 模块总览

| 模块名称 | 调用时机 | 是否必需 | JSON Mode | 说明 |
|---------|---------|---------|-----------|------|
| 对话模块 (Dialogue) | 玩家每次发言 | ✅ 必需 | 可选 | 生成NPC响应 |
| 总结模块 (Summary) | 场景结束时 | ✅ 必需 | 可选 | 总结当前场景 |
| 故事模块 (Story) | 总结之后 | ✅ 必需 | 可选 | 生成下一幕 |
| 记忆模块 (Memory) | 每次对话后 | ⚙️ 可选 | ✅ 强制 | 更新玩家记忆 |
| 信件模块 (Letter) | 故事之后 | ⚙️ 可选 | 可选 | 生成NPC信件 |
| 初始问候 | 场景开始时 | 🔧 自动 | 同对话 | 使用对话模块 |

---

## 📖 模块详细说明

### 1️⃣ 对话模块 (Dialogue Module)

#### 🔹 调用时机
- **玩家发送消息时**（点击"发送"按钮或按Enter）
- **场景开始时**（生成初始问候，如果没有预存的NPC对话）

#### 🔹 输入数据

**第一条消息（上下文）：**
```
故事背景：<state.scene.storySummary>

NPC列表：<state.scene.npcList>

NPC目标：<state.scene.npcGoals>

【玩家记忆档案】（如果记忆模块启用）
玩家信息：<player_info>
与NPC的关系：<relationships>
当前目标和承诺：<goals_and_promises>
已发现的线索：<secrets_discovered>

请根据上述信息和对话历史，决定让几个NPC回应（1个、2个或更多都可以，要符合实际情况）。
记住之前的对话内容，保持对话的连贯性和一致性。
NPC应该记得玩家的名字、背景，以及之前的互动和承诺。
```

**历史对话：**
- 最近 10 轮对话（最多 20 条消息）
- 格式：`玩家：<内容>` 或 NPC 响应内容

**当前输入：**
```
玩家：<用户输入>
```

#### 🔹 输出格式

**JSON Mode（如果启用）：**
```json
{
  "responses": [
    {
      "npc_name": "NPC名字",
      "content": "说话内容",
      "emotion": "情绪动画（高兴/难过/失望/振奋/绝望/疯狂/希望/平静）"
    },
    {
      "npc_name": "另一个NPC",
      "content": "说话内容",
      "emotion": "平静"
    }
  ]
}
```

**文本模式：**
```
[NPC名字] 说话内容 [情绪：高兴]
[另一个NPC] 说话内容 [情绪：平静]
```

#### 🔹 代码位置
- **调用位置**：`app.js` 第 701-795 行（发送按钮）、第 645-698 行（初始问候）
- **函数**：`callOpenAI()` + `parseNPCResponse()`

---

### 2️⃣ 总结模块 (Summary Module)

#### 🔹 调用时机
- **点击"结束对话"按钮时**

#### 🔹 输入数据

```
故事背景：<state.scene.storySummary>

NPC目标：<state.scene.npcGoals>

聊天记录：
<所有对话历史，格式化为"玩家：xxx" 或 "NPC：xxx">

请总结当前场景的故事发展。
```

#### 🔹 输出格式

**返回一段总结文本**（JSON或普通文本都可以）

示例：
```
在酒馆中，玩家与艾莉丝和格雷展开了对话。玩家表明了自己寻找失踪商人的意图，
艾莉丝提供了一些线索，而格雷则对此事持怀疑态度。双方达成了初步的信任，
艾莉丝愿意带领玩家前往商人最后出现的地点。
```

#### 🔹 代码位置
- **调用位置**：`app.js` 第 880-903 行
- **函数**：`callOpenAI()`

---

### 3️⃣ 故事模块 (Story Module)

#### 🔹 调用时机
- **总结模块完成后立即调用**

#### 🔹 输入数据

```
上一幕的故事总结：<summaryResponse>

NPC列表：<state.scene.npcList>

NPC的目标：<state.scene.npcGoals>

请根据上述信息：
1. 续写下一幕发生的事情
2. 生成一个主要NPC的初始对话（包括NPC名字、对话内容、情绪动画）
```

#### 🔹 输出格式

**JSON Mode（如果启用）：**
```json
{
  "scene_description": "下一幕的场景描述",
  "npc_dialogue": {
    "npc_name": "NPC名字",
    "content": "对话内容",
    "emotion": "情绪动画（高兴/难过/失望/振奋/绝望/疯狂/希望/平静）"
  }
}
```

**文本模式：**
```
【场景描述】
下一幕的场景描述...

【NPC初始对话】
[NPC名字] 对话内容 [情绪：情绪动画]
```

#### 🔹 数据流向
- `scene_description` → 保存为下一幕的 `storySummary`
- `npc_dialogue` → 保存为 `state.scene.nextNPCDialogue`，在下一幕开始时显示

#### 🔹 代码位置
- **调用位置**：`app.js` 第 908-946 行
- **显示函数**：`displayNextScene()` 第 963-1034 行
- **使用位置**：`displayStoredNPCDialogue()` 第 612-642 行

---

### 4️⃣ 记忆模块 (Memory Module) ⭐

#### 🔹 调用时机
- **每次玩家和NPC对话后**（异步调用，不阻塞UI）

#### 🔹 输入数据

```
请分析以下对话，提取关键信息并更新玩家记忆。

当前场景：<state.scene.storySummary 前100字符>

对话内容：
玩家：<玩家输入>
<NPC名字>：<NPC响应>

当前记忆状态：
<JSON格式的完整记忆对象>

请返回JSON格式的更新指令。格式如下：
{
  "player_info": {
    "name": "玩家名字（如果提到）",
    "description": "更新的描述（如果提到）",
    "personality": "更新的性格（如果提到）",
    "background": "更新的背景（如果提到）"
  },
  "new_key_facts": [
    { "fact": "关键事实", "scene": "场景名" }
  ],
  "relationship_updates": {
    "NPC名字": {
      "relationship": "关系类型",
      "trust_level": 7,
      "new_interactions": ["新的互动记录"]
    }
  },
  "new_goals_and_promises": [
    {
      "type": "goal 或 promise",
      "content": "内容",
      "related_npc": "相关NPC",
      "status": "active",
      "scene": "场景名"
    }
  ],
  "new_important_events": [
    { "event": "重要事件", "scene": "场景名", "impact": "影响" }
  ],
  "new_inventory": ["新物品"],
  "new_skills": ["新技能"],
  "new_secrets": ["新发现的秘密"]
}

注意：
1. 只返回需要更新的字段，没有更新的字段可以省略或设为null
2. 不要杜撰信息，只记录明确提到的内容
3. 保持客观，不添加主观解释
```

#### 🔹 输出格式

**强制 JSON 格式**（见上方输入示例中的结构）

#### 🔹 记忆数据结构

```javascript
{
  player_info: {
    name: '',
    description: '',
    personality: '',
    background: ''
  },
  key_facts: [
    { fact: '...', scene: '...', timestamp: '...' }
  ],
  relationships: {
    'NPC名字': {
      relationship: '关系类型',
      trust_level: 5,  // 1-10
      key_interactions: ['互动1', '互动2', ...]
    }
  },
  goals_and_promises: [
    {
      type: 'goal' | 'promise',
      content: '...',
      related_npc: '...',
      status: 'active' | 'completed' | 'failed',
      scene: '...'
    }
  ],
  important_events: [
    { event: '...', scene: '...', impact: '...' }
  ],
  inventory_mentions: ['物品1', '物品2', ...],
  skills_and_abilities: ['技能1', '技能2', ...],
  secrets_discovered: ['秘密1', '秘密2', ...]
}
```

#### 🔹 持久化存储
- **存储方式**：`localStorage`（键名：`ai_rpg_player_memory`）
- **保存时机**：每次记忆更新后
- **加载时机**：页面初始化时

#### 🔹 代码位置
- **调用位置**：`app.js` 第 784-788 行（对话后异步调用）
- **更新函数**：`updatePlayerMemory()` 第 143-269 行
- **应用函数**：`applyMemoryUpdates()` 第 272-368 行
- **上下文生成**：`generateMemoryContext()` 第 98-140 行

---

### 5️⃣ 信件模块 (Letter Module) ✉️

#### 🔹 调用时机
- **故事模块完成后**（如果启用）

#### 🔹 输入数据

```
故事总结：<sceneSummary>

对话记录：
<所有对话历史>

NPC列表：<state.scene.npcList>

请选择一个最合适的NPC，以TA的口吻给玩家写一封信，描述对话后发生的事情。

信件要求：
1. 选择对话中最活跃或与玩家互动最多的NPC
2. 使用第一人称（"我"）
3. 描述对话后的想法、感受或发生的事
4. 保持NPC的性格和说话风格
5. 字数控制在200-400字
```

#### 🔹 输出格式

**JSON Mode（如果启用）：**
```json
{
  "npc_name": "NPC名字",
  "letter_content": "信件内容"
}
```

**文本模式：**
```
【来信者】NPC名字

【信件内容】
信件正文...
```

#### 🔹 代码位置
- **调用位置**：`app.js` 第 948-952 行
- **生成函数**：`generateNPCLetter()` 第 1037-1089 行
- **显示函数**：`displayNPCLetter()` 第 1092-1123 行

---

### 6️⃣ 初始问候功能

#### 🔹 调用时机
- **开始新场景时，如果没有故事模块预存的NPC对话**

#### 🔹 工作原理
- 实际上**使用对话模块**生成
- 输入简化版的场景信息（无历史记录）
- 输出格式与对话模块相同

#### 🔹 代码位置
- **生成函数**：`generateInitialGreeting()` 第 645-698 行
- **调用位置**：`begin-dialogue-btn` 点击事件，第 604-608 行

---

## 🔄 完整调用流程图

### 流程 A：开始新场景（第一幕）

```
用户填写场景信息（故事背景、NPC列表、NPC目标）
    ↓
点击"开始对话"
    ↓
【初始问候】使用对话模块生成 NPC 问候
    ↓
玩家输入消息
    ↓
【对话模块】生成 NPC 响应
    ↓
【记忆模块】异步更新玩家记忆（后台）
    ↓
（循环：玩家发言 → 对话模块 → 记忆模块）
    ↓
点击"结束对话"
    ↓
【总结模块】生成场景总结
    ↓
【故事模块】生成下一幕场景 + NPC初始对话
    ↓
【信件模块】生成 NPC 信件（如果启用）
    ↓
显示总结页面
```

### 流程 B：进入下一幕（第二幕及以后）

```
点击"下一幕"按钮
    ↓
返回场景初始化页面（故事总结自动填入）
    ↓
点击"开始对话"
    ↓
显示故事模块生成的 NPC 初始对话（不调用对话模块）
    ↓
玩家输入消息
    ↓
（后续流程同流程 A）
```

---

## 💾 数据持久化

### LocalStorage 存储

| 键名 | 内容 | 何时保存 | 何时加载 |
|------|------|---------|---------|
| `ai_rpg_player_memory` | 玩家记忆对象（JSON） | 每次记忆更新后 | 页面初始化时 |

### Session 状态（`state` 对象）

```javascript
const state = {
    apiKey: '',              // OpenAI API Key
    model: '',               // 模型名称（如 gpt-4o-mini）
    modules: {
        dialogue: { prompt: '', jsonMode: false },
        summary: { prompt: '', jsonMode: false },
        story: { prompt: '', jsonMode: false },
        memory: { prompt: '', enabled: true },
        letter: { prompt: '', jsonMode: false, enabled: true }
    },
    scene: {
        storySummary: '',           // 当前场景故事背景
        npcList: '',                // NPC 列表
        npcGoals: '',               // NPC 目标
        chatHistory: [],            // 对话历史
        nextStorySummary: '',       // 下一幕故事背景
        nextNPCDialogue: null       // 下一幕 NPC 初始对话
    },
    playerMemory: null              // 玩家记忆（从 localStorage 加载）
};
```

---

## 🔧 API 调用统一接口

### `callOpenAI()` 函数

```javascript
/**
 * 调用 OpenAI API
 * @param {string} systemPrompt - System Prompt
 * @param {string|array} userPromptOrMessages - 用户消息或消息数组
 * @param {boolean} useJsonMode - 是否使用 JSON Mode
 * @returns {Promise<string>} API 响应内容
 */
async function callOpenAI(systemPrompt, userPromptOrMessages, useJsonMode = false)
```

#### 使用方式 1：简单调用
```javascript
const response = await callOpenAI(
    state.modules.summary.prompt,
    '请总结这段对话...',
    false
);
```

#### 使用方式 2：带历史记录
```javascript
const messages = [
    { role: 'user', content: '场景信息...' },
    { role: 'user', content: '玩家：你好' },
    { role: 'assistant', content: 'NPC响应' },
    { role: 'user', content: '玩家：再见' }
];

const response = await callOpenAI(
    state.modules.dialogue.prompt,
    messages,
    true  // JSON Mode
);
```

---

## 📝 JSON Mode 自动提示

### 功能说明
- 当勾选"启用 JSON Mode"时，自动在 Prompt 末尾添加：
  ```
  重要：请使用JSON格式返回结果。
  ```
- 取消勾选时，自动删除此提示

### 适用模块
- 对话模块（可选）
- 总结模块（可选）
- 故事模块（可选）
- 记忆模块（强制 JSON，不需要提示）
- 信件模块（可选）

### 代码位置
- **设置函数**：`setupJsonModeAutoHint()` 第 466-508 行
- **初始化**：第 1399-1402 行

---

## ⚙️ 模块配置要求

### 必填配置
1. **对话模块 System Prompt** - 必需
2. **总结模块 System Prompt** - 必需
3. **故事模块 System Prompt** - 必需

### 可选配置
4. **记忆模块**
   - 可以禁用（取消勾选"启用记忆系统"）
   - 如果启用，必须提供 System Prompt
   
5. **信件模块**
   - 可以禁用（取消勾选"启用信件生成"）
   - 如果启用，必须提供 System Prompt

---

## 🚀 启动检查清单

在点击"开始"按钮时，系统会检查：

- ✅ OpenAI API Key 是否填写
- ✅ 对话模块 Prompt 是否填写
- ✅ 总结模块 Prompt 是否填写
- ✅ 故事模块 Prompt 是否填写
- ✅ 如果启用记忆模块，Prompt 是否填写
- ✅ 如果启用信件模块，Prompt 是否填写

如果检查失败，会弹出提示并阻止继续。

---

## 🎨 情绪动画选项

所有模块在涉及 NPC 对话时，支持以下情绪动画：

- 高兴
- 难过
- 失望
- 振奋
- 绝望
- 疯狂
- 希望
- 平静（默认）

---

## 📚 相关文档

- **玩家记忆系统设计**：`玩家记忆系统设计.md`
- **信件生成功能**：`信件生成功能说明.md`
- **NPC 初始对话功能**：`NPC初始对话功能说明.md`
- **JSON Mode 自动提示**：`JSON_Mode自动提示功能说明.md`
- **快速开始指南**：`快速开始.md`

---

## 🔍 常见问题

### Q1：记忆模块什么时候更新？
**A**：每次玩家和 NPC 对话后，记忆模块会**异步**更新（不阻塞UI）。即使更新失败，也不会影响对话继续。

### Q2：为什么记忆模块强制使用 JSON Mode？
**A**：因为记忆更新需要结构化数据，必须使用 JSON 格式才能准确解析和应用更新。

### Q3：初始问候是如何生成的？
**A**：
- **第一幕**：使用对话模块生成初始问候
- **第二幕及以后**：使用故事模块预生成的 NPC 初始对话

### Q4：对话历史会一直累积吗？
**A**：不会。为了控制 Token 消耗，系统只保留**最近 10 轮对话**（20 条消息）传递给对话模块。完整历史仍保存在 `state.scene.chatHistory` 中。

### Q5：玩家记忆会丢失吗？
**A**：只要不清理浏览器缓存或主动点击"清空记忆"按钮，记忆会持久保存在 `localStorage` 中。

---

## 📊 Token 消耗估算

以 `gpt-4o-mini` 为例，假设一次对话：

| 模块 | 调用次数 | 单次 Token（约） | 总计 |
|------|---------|----------------|------|
| 对话模块 | 10 次 | 500-1000 | 5,000-10,000 |
| 记忆模块 | 10 次 | 800-1500 | 8,000-15,000 |
| 总结模块 | 1 次 | 1000-2000 | 1,000-2,000 |
| 故事模块 | 1 次 | 800-1200 | 800-1,200 |
| 信件模块 | 1 次 | 600-1000 | 600-1,000 |
| **合计** | - | - | **15,400-29,200** |

*注：实际消耗取决于 Prompt 长度、对话内容和模型*

---

## 📞 技术支持

如有问题，请查看：
- `故障排除指南.md`
- `README.md`

---

**文档版本**：v1.0  
**最后更新**：2025-01-18  
**适用系统版本**：AI RPG 测试系统 v2.1+

