// 全局状态管理
const state = {
    apiKey: '',
    model: '',
    modules: {
        dialogue: { prompt: '', jsonMode: false },
        summary: { prompt: '', jsonMode: false },
        story: { prompt: '', jsonMode: false },
        memory: { prompt: '', enabled: true },
        letter: { prompt: '', jsonMode: false, enabled: true }
    },
    scene: {
        storySummary: '',
        npcList: '',
        npcGoals: '',
        chatHistory: []
    },
    playerMemory: null  // 将在初始化时加载
};

// ============================================
// 玩家记忆系统
// ============================================

// 创建空白记忆
function createEmptyMemory() {
    return {
        player_info: {
            name: '',
            description: '',
            personality: '',
            background: ''
        },
        key_facts: [],
        relationships: {},
        goals_and_promises: [],
        important_events: [],
        inventory_mentions: [],
        skills_and_abilities: [],
        secrets_discovered: []
    };
}

// 从 localStorage 加载玩家记忆
function loadPlayerMemory() {
    try {
        const saved = localStorage.getItem('ai_rpg_player_memory');
        if (saved) {
            console.log('✅ 从 localStorage 加载玩家记忆');
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('加载玩家记忆失败:', error);
    }
    console.log('📝 创建新的玩家记忆');
    return createEmptyMemory();
}

// 保存玩家记忆到 localStorage
function savePlayerMemory(memory) {
    try {
        localStorage.setItem('ai_rpg_player_memory', JSON.stringify(memory));
        console.log('💾 玩家记忆已保存');
        return true;
    } catch (error) {
        console.error('保存玩家记忆失败:', error);
        alert('保存记忆失败，可能是因为存储空间不足');
        return false;
    }
}

// 清空玩家记忆
function clearPlayerMemory() {
    if (confirm('确定要清空所有玩家记忆吗？此操作不可撤销！')) {
        localStorage.removeItem('ai_rpg_player_memory');
        state.playerMemory = createEmptyMemory();
        console.log('🗑️ 玩家记忆已清空');
        alert('玩家记忆已清空');
        return true;
    }
    return false;
}

// 导出玩家记忆为JSON文件
function exportPlayerMemory() {
    const dataStr = JSON.stringify(state.playerMemory, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `player_memory_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    console.log('📥 玩家记忆已导出');
}

// 生成记忆上下文（用于对话模块）
function generateMemoryContext(memory) {
    if (!memory || !state.modules.memory.enabled) {
        return '';
    }

    let context = '\n【玩家记忆档案】\n';

    // 玩家信息
    if (memory.player_info.name || memory.player_info.description) {
        context += '玩家信息：';
        if (memory.player_info.name) context += `${memory.player_info.name} - `;
        context += `${memory.player_info.description || '无'}\n`;
        if (memory.player_info.personality) {
            context += `性格：${memory.player_info.personality}\n`;
        }
    }

    // NPC关系
    const relationships = Object.entries(memory.relationships);
    if (relationships.length > 0) {
        context += '\n与NPC的关系：\n';
        relationships.slice(0, 5).forEach(([npc, rel]) => {
            context += `- ${npc}：${rel.relationship || '未知'}（信任度${rel.trust_level || 5}/10）\n`;
        });
    }

    // 当前目标和承诺
    const activeGoals = memory.goals_and_promises.filter(g => g.status === 'active');
    if (activeGoals.length > 0) {
        context += '\n当前目标和承诺：\n';
        activeGoals.slice(0, 3).forEach(g => {
            context += `- ${g.type === 'goal' ? '目标' : '承诺'}：${g.content}\n`;
        });
    }

    // 已发现的线索
    if (memory.secrets_discovered.length > 0) {
        context += '\n已发现的线索：\n';
        context += memory.secrets_discovered.slice(0, 3).join('、') + '\n';
    }

    return context;
}

// 更新玩家记忆（调用Memory Module）
async function updatePlayerMemory(recentDialogue) {
    if (!state.modules.memory.enabled) {
        console.log('⚠️ 记忆系统未启用');
        return;
    }

    console.log('🧠 开始更新玩家记忆...');

    try {
        // 构建输入数据
        const input = {
            current_scene: state.scene.storySummary.substring(0, 100),
            recent_conversation: recentDialogue.map(msg => {
                if (msg.role === 'player') {
                    return { role: 'player', content: msg.content };
                } else {
                    // 尝试解析NPC响应
                    try {
                        const parsed = JSON.parse(msg.content);
                        if (parsed.responses) {
                            // 多个NPC响应
                            return parsed.responses.map(r => ({
                                role: 'npc',
                                npc_name: r.npc_name,
                                content: r.content
                            }));
                        } else {
                            // 单个NPC响应
                            return {
                                role: 'npc',
                                npc_name: parsed.npc_name || 'NPC',
                                content: parsed.content
                            };
                        }
                    } catch {
                        // 文本格式
                        return { role: 'npc', content: msg.content };
                    }
                }
            }).flat(),
            current_memory: state.playerMemory
        };

        // 构建提示词
        const userPrompt = `
请分析以下对话，提取关键信息并更新玩家记忆。

当前场景：${input.current_scene}

对话内容：
${input.recent_conversation.map(msg => {
    if (msg.role === 'player') {
        return `玩家：${msg.content}`;
    } else {
        return `${msg.npc_name || 'NPC'}：${msg.content}`;
    }
}).join('\n')}

当前记忆状态：
${JSON.stringify(input.current_memory, null, 2)}

请返回JSON格式的更新指令。格式如下：
{
  "player_info": {
    "name": "玩家名字（如果提到）",
    "description": "更新的描述（如果提到）",
    "personality": "更新的性格（如果提到）",
    "background": "更新的背景（如果提到）"
  },
  "new_key_facts": [
    { "fact": "关键事实", "scene": "${input.current_scene}" }
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
      "scene": "${input.current_scene}"
    }
  ],
  "new_important_events": [
    { "event": "重要事件", "scene": "${input.current_scene}", "impact": "影响" }
  ],
  "new_inventory": ["新物品"],
  "new_skills": ["新技能"],
  "new_secrets": ["新发现的秘密"]
}

注意：
1. 只返回需要更新的字段，没有更新的字段可以省略或设为null
2. 不要杜撰信息，只记录明确提到的内容
3. 保持客观，不添加主观解释
`;

        // 调用AI
        const response = await callOpenAI(
            state.modules.memory.prompt,
            userPrompt,
            true  // 使用JSON模式
        );

        console.log('🤖 Memory Module响应:', response);

        // 解析更新指令
        const updates = JSON.parse(response);

        // 应用更新
        applyMemoryUpdates(state.playerMemory, updates);

        // 保存到localStorage
        savePlayerMemory(state.playerMemory);

        console.log('✅ 玩家记忆更新完成');

    } catch (error) {
        console.error('❌ 更新玩家记忆失败:', error);
        // 不影响对话继续，只是记录错误
    }
}

// 应用记忆更新
function applyMemoryUpdates(memory, updates) {
    // 更新玩家信息
    if (updates.player_info) {
        for (const [key, value] of Object.entries(updates.player_info)) {
            if (value && value !== 'null' && value !== '无') {
                memory.player_info[key] = value;
            }
        }
    }

    // 添加新的关键事实
    if (updates.new_key_facts && Array.isArray(updates.new_key_facts)) {
        updates.new_key_facts.forEach(fact => {
            if (fact.fact) {
                fact.timestamp = new Date().toISOString();
                memory.key_facts.push(fact);
            }
        });
    }

    // 更新NPC关系
    if (updates.relationship_updates) {
        for (const [npcName, relUpdate] of Object.entries(updates.relationship_updates)) {
            if (!memory.relationships[npcName]) {
                memory.relationships[npcName] = {
                    relationship: relUpdate.relationship || '中立',
                    trust_level: relUpdate.trust_level || 5,
                    key_interactions: []
                };
            } else {
                if (relUpdate.relationship) {
                    memory.relationships[npcName].relationship = relUpdate.relationship;
                }
                if (relUpdate.trust_level !== undefined) {
                    memory.relationships[npcName].trust_level = relUpdate.trust_level;
                }
            }
            
            // 添加新的互动记录
            if (relUpdate.new_interactions && Array.isArray(relUpdate.new_interactions)) {
                memory.relationships[npcName].key_interactions.push(...relUpdate.new_interactions);
                // 限制互动记录数量
                if (memory.relationships[npcName].key_interactions.length > 10) {
                    memory.relationships[npcName].key_interactions = 
                        memory.relationships[npcName].key_interactions.slice(-10);
                }
            }
        }
    }

    // 添加新的目标和承诺
    if (updates.new_goals_and_promises && Array.isArray(updates.new_goals_and_promises)) {
        updates.new_goals_and_promises.forEach(goal => {
            if (goal.content) {
                memory.goals_and_promises.push(goal);
            }
        });
    }

    // 添加重要事件
    if (updates.new_important_events && Array.isArray(updates.new_important_events)) {
        updates.new_important_events.forEach(event => {
            if (event.event) {
                memory.important_events.push(event);
            }
        });
    }

    // 添加物品
    if (updates.new_inventory && Array.isArray(updates.new_inventory)) {
        updates.new_inventory.forEach(item => {
            if (item && !memory.inventory_mentions.includes(item)) {
                memory.inventory_mentions.push(item);
            }
        });
    }

    // 添加技能
    if (updates.new_skills && Array.isArray(updates.new_skills)) {
        updates.new_skills.forEach(skill => {
            if (skill && !memory.skills_and_abilities.includes(skill)) {
                memory.skills_and_abilities.push(skill);
            }
        });
    }

    // 添加秘密
    if (updates.new_secrets && Array.isArray(updates.new_secrets)) {
        updates.new_secrets.forEach(secret => {
            if (secret && !memory.secrets_discovered.includes(secret)) {
                memory.secrets_discovered.push(secret);
            }
        });
    }

    console.log('📝 记忆更新已应用:', updates);
}

// 页面元素
const pages = {
    config: document.getElementById('config-page'),
    sceneInit: document.getElementById('scene-init-page'),
    dialogue: document.getElementById('dialogue-page'),
    summary: document.getElementById('summary-page')
};

const loadingOverlay = document.getElementById('loading-overlay');

// 工具函数：显示页面
function showPage(pageName) {
    Object.values(pages).forEach(page => page.classList.remove('active'));
    pages[pageName].classList.add('active');
}

// 工具函数：显示/隐藏加载动画
function showLoading(show = true) {
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

// 工具函数：调用 OpenAI API（通过代理服务器）
// 支持两种调用方式：
// 1. callOpenAI(systemPrompt, userPrompt, useJsonMode) - 简单调用
// 2. callOpenAI(systemPrompt, messagesArray, useJsonMode) - 带历史记录
async function callOpenAI(systemPrompt, userPromptOrMessages, useJsonMode = false) {
    let messages;
    
    // 调试：显示使用的 System Prompt
    console.log('🤖 调用 OpenAI API');
    console.log('📝 System Prompt:', systemPrompt.substring(0, 100) + '...');
    
    // 判断第二个参数是字符串还是数组
    if (typeof userPromptOrMessages === 'string') {
        // 简单调用：只有一个用户消息
        messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPromptOrMessages }
        ];
    } else if (Array.isArray(userPromptOrMessages)) {
        // 带历史记录：传入完整的消息数组
        messages = [
            { role: 'system', content: systemPrompt },
            ...userPromptOrMessages
        ];
        console.log('💬 包含历史记录，共', userPromptOrMessages.length, '条消息');
    } else {
        throw new Error('第二个参数必须是字符串或消息数组');
    }

    const requestBody = {
        model: state.model,
        messages: messages,
        temperature: 0.7,
        api_key: state.apiKey  // 将 API Key 放在请求体中，由代理服务器处理
    };

    if (useJsonMode) {
        requestBody.response_format = { type: 'json_object' };
    }

    try {
        // 使用本地代理服务器，避免 CORS 问题
        const response = await fetch('/api/openai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI API Error:', error);
        alert(`API 调用失败: ${error.message}\n\n提示：请确保使用 proxy_server.py 启动服务器`);
        throw error;
    }
}

// ============================================
// JSON Mode自动提示功能
// ============================================

const JSON_MODE_HINT = '\n\n重要：请使用JSON格式返回结果。';

// 为每个模块的JSON复选框添加自动提示功能
function setupJsonModeAutoHint(promptId, checkboxId) {
    const promptTextarea = document.getElementById(promptId);
    const checkbox = document.getElementById(checkboxId);
    
    // 检查元素是否存在
    if (!promptTextarea) {
        console.error(`❌ 未找到元素: ${promptId}`);
        return;
    }
    if (!checkbox) {
        console.error(`❌ 未找到元素: ${checkboxId}`);
        return;
    }
    
    console.log(`✅ 已绑定 JSON Mode 自动提示: ${promptId} ↔ ${checkboxId}`);
    
    checkbox.addEventListener('change', () => {
        let currentPrompt = promptTextarea.value;
        
        console.log(`📝 ${checkboxId} 状态变更: ${checkbox.checked ? '勾选' : '取消勾选'}`);
        console.log(`📄 当前 Prompt 长度: ${currentPrompt.length} 字符`);
        
        if (checkbox.checked) {
            // 勾选时，添加JSON提示（如果还没有）
            if (!currentPrompt.includes('请使用JSON格式返回')) {
                promptTextarea.value = currentPrompt + JSON_MODE_HINT;
                console.log(`✅ 已添加 JSON Mode 提示到 ${promptId}`);
                console.log(`📄 更新后 Prompt 长度: ${promptTextarea.value.length} 字符`);
            } else {
                console.log(`ℹ️ Prompt 中已包含 JSON 格式说明，跳过添加`);
            }
        } else {
            // 取消勾选时，删除JSON提示
            if (currentPrompt.includes(JSON_MODE_HINT)) {
                promptTextarea.value = currentPrompt.replace(JSON_MODE_HINT, '');
                console.log(`❌ 已删除 JSON Mode 提示从 ${promptId}`);
                console.log(`📄 更新后 Prompt 长度: ${promptTextarea.value.length} 字符`);
            } else {
                console.log(`ℹ️ Prompt 中未找到自动添加的提示，无需删除`);
            }
        }
    });
}

// ============================================
// 配置页面逻辑
// ============================================

document.getElementById('start-btn').addEventListener('click', () => {
    // 获取 API Key 和模型
    const apiKey = document.getElementById('api-key').value.trim();
    const model = document.getElementById('model-select').value;

    if (!apiKey) {
        alert('请输入 OpenAI API Key');
        return;
    }

    // 保存配置
    state.apiKey = apiKey;
    state.model = model;

    // 获取模块配置
    state.modules.dialogue.prompt = document.getElementById('module1-prompt').value.trim();
    state.modules.dialogue.jsonMode = document.getElementById('module1-json').checked;

    state.modules.summary.prompt = document.getElementById('module2-prompt').value.trim();
    state.modules.summary.jsonMode = document.getElementById('module2-json').checked;

    state.modules.story.prompt = document.getElementById('module3-prompt').value.trim();
    state.modules.story.jsonMode = document.getElementById('module3-json').checked;

    state.modules.memory.prompt = document.getElementById('module4-prompt').value.trim();
    state.modules.memory.enabled = document.getElementById('module4-enabled').checked;

    state.modules.letter.prompt = document.getElementById('module5-prompt').value.trim();
    state.modules.letter.enabled = document.getElementById('module5-enabled').checked;
    state.modules.letter.jsonMode = document.getElementById('module5-json').checked;

    // 检查必填项
    if (!state.modules.dialogue.prompt || !state.modules.summary.prompt || !state.modules.story.prompt) {
        alert('请为所有模块配置 System Prompt');
        return;
    }

    if (state.modules.memory.enabled && !state.modules.memory.prompt) {
        alert('请为记忆模块配置 System Prompt，或取消启用');
        return;
    }

    if (state.modules.letter.enabled && !state.modules.letter.prompt) {
        alert('请为信件模块配置 System Prompt，或取消启用');
        return;
    }

    // 调试：显示配置已保存（可选）
    console.log('配置已保存：');
    console.log('对话模块 System Prompt:', state.modules.dialogue.prompt.substring(0, 50) + '...');
    console.log('总结模块 System Prompt:', state.modules.summary.prompt.substring(0, 50) + '...');
    console.log('故事模块 System Prompt:', state.modules.story.prompt.substring(0, 50) + '...');
    console.log('记忆模块:', state.modules.memory.enabled ? '已启用' : '已禁用');
    console.log('信件模块:', state.modules.letter.enabled ? '已启用' : '已禁用');

    // 跳转到场景初始化页面
    showPage('sceneInit');
});

// 场景初始化页面逻辑
document.getElementById('begin-dialogue-btn').addEventListener('click', () => {
    const storySummary = document.getElementById('story-summary').value.trim();
    const npcList = document.getElementById('npc-list').value.trim();
    const npcGoals = document.getElementById('npc-goals').value.trim();

    if (!storySummary || !npcList || !npcGoals) {
        alert('请填写所有场景信息');
        return;
    }

    // 保存场景信息
    state.scene.storySummary = storySummary;
    state.scene.npcList = npcList;
    state.scene.npcGoals = npcGoals;
    state.scene.chatHistory = [];

    // 显示场景信息
    document.getElementById('display-story-summary').textContent = storySummary;
    document.getElementById('display-npc-list').textContent = npcList;
    document.getElementById('display-npc-goals').textContent = npcGoals;

    // 清空聊天记录
    document.getElementById('messages').innerHTML = '';
    document.getElementById('user-input').value = '';

    // 跳转到对话页面
    showPage('dialogue');
    
    // 如果有故事模块生成的初始对话（第二幕及以后），显示它
    // 否则生成新的初始问候（第一幕）
    if (state.scene.nextNPCDialogue) {
        displayStoredNPCDialogue();
    } else {
        generateInitialGreeting();
    }
});

// 显示存储的NPC初始对话（来自故事模块）
function displayStoredNPCDialogue() {
    const dialogue = state.scene.nextNPCDialogue;
    
    if (!dialogue) {
        // 如果没有存储的对话，生成新的
        generateInitialGreeting();
        return;
    }
    
    // 如果是JSON格式
    if (dialogue.npc_name && dialogue.content) {
        addMessage('npc', dialogue.content, dialogue.npc_name, dialogue.emotion || '平静');
        // 保存到历史记录（JSON格式）
        state.scene.chatHistory.push({ 
            role: 'npc', 
            content: JSON.stringify({
                npc_name: dialogue.npc_name,
                content: dialogue.content,
                emotion: dialogue.emotion || '平静'
            })
        });
    } 
    // 如果是文本格式
    else if (dialogue.raw) {
        parseNPCResponse(dialogue.raw, false);
        state.scene.chatHistory.push({ role: 'npc', content: dialogue.raw });
    }
    
    // 清除已使用的初始对话
    state.scene.nextNPCDialogue = null;
}

// 生成初始问候函数
async function generateInitialGreeting() {
    showLoading(true);
    
    try {
        // 构建提示词
        const greetingPrompt = `
故事背景：${state.scene.storySummary}

NPC列表：${state.scene.npcList}

NPC目标：${state.scene.npcGoals}

请选择一个最合适的NPC来主动问候玩家，问候内容要与故事背景相关。

返回格式：
${state.modules.dialogue.jsonMode ? 
`JSON格式：
{
  "npc_name": "NPC名字",
  "content": "问候内容",
  "emotion": "情绪动画（高兴/难过/失望/振奋/绝望/疯狂/希望/平静）"
}` : 
`格式：[NPC名字] 问候内容 [情绪：情绪动画]
情绪动画从以下选择：高兴、难过、失望、振奋、绝望、疯狂、希望、平静`}
`;

        const response = await callOpenAI(
            state.modules.dialogue.prompt,
            greetingPrompt,
            state.modules.dialogue.jsonMode
        );

        // 解析并显示问候
        if (state.modules.dialogue.jsonMode) {
            try {
                const data = JSON.parse(response);
                addMessage('npc', data.content, data.npc_name, data.emotion);
                state.scene.chatHistory.push({ role: 'npc', content: response });
            } catch (error) {
                console.error('JSON 解析错误:', error);
                parseNPCResponse(response, false);
                state.scene.chatHistory.push({ role: 'npc', content: response });
            }
        } else {
            parseNPCResponse(response, false);
            state.scene.chatHistory.push({ role: 'npc', content: response });
        }
        
    } catch (error) {
        console.error('生成初始问候错误:', error);
    } finally {
        showLoading(false);
    }
}

// 对话页面逻辑
document.getElementById('send-btn').addEventListener('click', async () => {
    const userInput = document.getElementById('user-input').value.trim();
    
    if (!userInput) {
        alert('请输入对话内容');
        return;
    }

    // 添加用户消息到界面
    addMessage('user', userInput);

    // 清空输入框
    document.getElementById('user-input').value = '';

    // 调用对话模块
    showLoading(true);
    try {
        // 构建包含历史记录的消息数组
        const messages = [];
        
        // 第一条消息：场景信息、记忆上下文和指令
        const memoryContext = generateMemoryContext(state.playerMemory);
        
        const contextMessage = `
故事背景：${state.scene.storySummary}

NPC列表：${state.scene.npcList}

NPC目标：${state.scene.npcGoals}
${memoryContext}

请根据上述信息和对话历史，决定让几个NPC回应（1个、2个或更多都可以，要符合实际情况）。
记住之前的对话内容，保持对话的连贯性和一致性。
NPC应该记得玩家的名字、背景，以及之前的互动和承诺。

返回格式：
${state.modules.dialogue.jsonMode ? 
`JSON格式：
{
  "responses": [
    {
      "npc_name": "NPC名字",
      "content": "说话内容",
      "emotion": "情绪动画（高兴/难过/失望/振奋/绝望/疯狂/希望/平静）"
    }
  ]
}
注意：responses数组中只包含需要回应的NPC，数量可以是1个或多个。` : 
`每个回应的NPC一行，格式：[NPC名字] 说话内容 [情绪：情绪动画]
情绪动画从以下选择：高兴、难过、失望、振奋、绝望、疯狂、希望、平静
注意：不是所有NPC都要回应，只返回需要说话的NPC。`}
`;
        
        messages.push({ role: 'user', content: contextMessage });
        
        // 添加历史对话（限制最近10轮对话，避免token过多）
        const maxHistory = 20; // 10轮对话 = 20条消息（玩家+NPC）
        const recentHistory = state.scene.chatHistory.slice(-maxHistory);
        
        for (const msg of recentHistory) {
            if (msg.role === 'player') {
                messages.push({ role: 'user', content: `玩家：${msg.content}` });
            } else if (msg.role === 'npc') {
                messages.push({ role: 'assistant', content: msg.content });
            }
        }
        
        // 当前玩家输入
        messages.push({ role: 'user', content: `玩家：${userInput}` });

        const response = await callOpenAI(
            state.modules.dialogue.prompt,
            messages,
            state.modules.dialogue.jsonMode
        );

        // 解析响应
        parseNPCResponse(response, state.modules.dialogue.jsonMode);

        // 添加到聊天历史（先添加玩家输入，再添加NPC响应）
        state.scene.chatHistory.push({ role: 'player', content: userInput });
        state.scene.chatHistory.push({ role: 'npc', content: response });

        // 更新玩家记忆（异步，不阻塞UI）
        updatePlayerMemory([
            { role: 'player', content: userInput },
            { role: 'npc', content: response }
        ]).catch(err => console.error('记忆更新失败:', err));

    } catch (error) {
        console.error('对话模块错误:', error);
    } finally {
        showLoading(false);
    }
});

// 解析 NPC 响应
function parseNPCResponse(response, isJson) {
    if (isJson) {
        try {
            const data = JSON.parse(response);
            if (data.responses && Array.isArray(data.responses)) {
                data.responses.forEach(npc => {
                    addMessage('npc', npc.content, npc.npc_name, npc.emotion);
                });
            }
        } catch (error) {
            console.error('JSON 解析错误:', error);
            addMessage('npc', response, 'NPC', '平静');
        }
    } else {
        // 解析文本格式
        const lines = response.split('\n').filter(line => line.trim());
        lines.forEach(line => {
            const match = line.match(/\[(.+?)\]\s*(.+?)\s*\[情绪[:：](.+?)\]/);
            if (match) {
                const [, npcName, content, emotion] = match;
                addMessage('npc', content.trim(), npcName.trim(), emotion.trim());
            } else {
                // 如果格式不匹配，直接显示
                addMessage('npc', line, 'NPC', '平静');
            }
        });
    }
}

// 添加消息到聊天界面
function addMessage(type, content, npcName = null, emotion = null) {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    if (type === 'user') {
        messageDiv.innerHTML = `<div class="content">${escapeHtml(content)}</div>`;
    } else {
        messageDiv.innerHTML = `
            ${npcName ? `<div class="npc-name">${escapeHtml(npcName)}</div>` : ''}
            <div class="content">${escapeHtml(content)}</div>
            ${emotion ? `<div class="npc-emotion">情绪：${escapeHtml(emotion)}</div>` : ''}
        `;
    }

    messagesContainer.appendChild(messageDiv);
    
    // 滚动到底部
    const chatContainer = document.getElementById('chat-container');
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 结束对话按钮
document.getElementById('end-dialogue-btn').addEventListener('click', async () => {
    if (state.scene.chatHistory.length === 0) {
        alert('还没有进行对话');
        return;
    }

    // 跳转到总结页面
    showPage('summary');

    // 重置总结页面
    document.getElementById('scene-summary').innerHTML = '<p>正在生成总结...</p>';
    document.getElementById('scene-summary').classList.add('loading');
    document.getElementById('npc-letter').innerHTML = '<p style="color: #7f8c8d; font-style: italic;">信件将在场景总结后生成...</p>';
    document.getElementById('npc-letter').classList.remove('loading');
    document.getElementById('next-scene').innerHTML = '<p>正在生成下一幕...</p>';
    document.getElementById('next-scene').classList.add('loading');
    document.getElementById('next-scene-btn').disabled = true;

    showLoading(true);

    try {
        // 调用总结模块
        const chatHistoryText = state.scene.chatHistory
            .map(msg => `${msg.role === 'player' ? '玩家' : 'NPC'}：${msg.content}`)
            .join('\n\n');

        const summaryPrompt = `
故事背景：${state.scene.storySummary}

NPC目标：${state.scene.npcGoals}

聊天记录：
${chatHistoryText}

请总结当前场景的故事发展。
`;

        const summaryResponse = await callOpenAI(
            state.modules.summary.prompt,
            summaryPrompt,
            state.modules.summary.jsonMode
        );

        // 显示总结
        document.getElementById('scene-summary').textContent = summaryResponse;
        document.getElementById('scene-summary').classList.remove('loading');

        // 更新故事总结
        const updatedStorySummary = summaryResponse;

        // 调用故事模块
        const storyPrompt = `
上一幕的故事总结：${updatedStorySummary}

NPC列表：${state.scene.npcList}

NPC的目标：${state.scene.npcGoals}

请根据上述信息：
1. 续写下一幕发生的事情
2. 生成一个主要NPC的初始对话（包括NPC名字、对话内容、情绪动画）

${state.modules.story.jsonMode ? 
`返回JSON格式：
{
  "scene_description": "下一幕的场景描述",
  "npc_dialogue": {
    "npc_name": "NPC名字",
    "content": "对话内容",
    "emotion": "情绪动画（高兴/难过/失望/振奋/绝望/疯狂/希望/平静）"
  }
}` : 
`返回格式：
【场景描述】
下一幕的场景描述...

【NPC初始对话】
[NPC名字] 对话内容 [情绪：情绪动画]
情绪动画从以下选择：高兴、难过、失望、振奋、绝望、疯狂、希望、平静`}
`;

        const storyResponse = await callOpenAI(
            state.modules.story.prompt,
            storyPrompt,
            state.modules.story.jsonMode
        );

        // 显示下一幕
        displayNextScene(storyResponse, state.modules.story.jsonMode, updatedStorySummary);

        // 生成信件（如果启用）
        if (state.modules.letter.enabled) {
            console.log('🔧 开始生成NPC信件...');
            generateNPCLetter(chatHistoryText, updatedStorySummary);
        }

    } catch (error) {
        console.error('生成总结/故事错误:', error);
        document.getElementById('scene-summary').textContent = '生成失败，请重试';
        document.getElementById('next-scene').textContent = '生成失败，请重试';
    } finally {
        showLoading(false);
    }
});

// 显示下一幕
function displayNextScene(response, isJson, updatedStorySummary) {
    const nextSceneDiv = document.getElementById('next-scene');
    nextSceneDiv.classList.remove('loading');

    if (isJson) {
        try {
            const data = JSON.parse(response);
            nextSceneDiv.innerHTML = `
                <div class="scene-description">
                    <strong>场景描述：</strong><br>
                    ${escapeHtml(data.scene_description || '')}
                </div>
                ${data.npc_dialogue ? `
                <div class="npc-dialogue">
                    <div class="npc-name">${escapeHtml(data.npc_dialogue.npc_name || '')}</div>
                    <div class="dialogue-content">${escapeHtml(data.npc_dialogue.content || '')}</div>
                    <div class="npc-emotion">情绪：${escapeHtml(data.npc_dialogue.emotion || '平静')}</div>
                </div>
                ` : ''}
            `;
            
            // 保存下一幕的故事总结和NPC初始对话
            state.scene.nextStorySummary = data.scene_description || updatedStorySummary;
            state.scene.nextNPCDialogue = data.npc_dialogue || null;
        } catch (error) {
            console.error('JSON 解析错误:', error);
            nextSceneDiv.textContent = response;
            state.scene.nextStorySummary = updatedStorySummary;
            state.scene.nextNPCDialogue = null;
        }
    } else {
        // 解析文本格式
        const sceneMatch = response.match(/【场景描述】\s*([\s\S]*?)\s*【NPC初始对话】/);
        const npcMatch = response.match(/【NPC初始对话】\s*([\s\S]*)/);

        let html = '';
        
        if (sceneMatch) {
            html += `
                <div class="scene-description">
                    <strong>场景描述：</strong><br>
                    ${escapeHtml(sceneMatch[1].trim())}
                </div>
            `;
            state.scene.nextStorySummary = sceneMatch[1].trim();
        } else {
            state.scene.nextStorySummary = updatedStorySummary;
        }

        if (npcMatch) {
            const npcText = npcMatch[1].trim();
            html += `
                <div class="npc-dialogue">
                    ${escapeHtml(npcText).replace(/\n/g, '<br>')}
                </div>
            `;
            
            // 保存NPC对话用于下一幕
            state.scene.nextNPCDialogue = {
                raw: npcText
            };
        } else {
            state.scene.nextNPCDialogue = null;
        }

        nextSceneDiv.innerHTML = html || escapeHtml(response);
    }

    // 启用下一幕按钮
    document.getElementById('next-scene-btn').disabled = false;
}

// 生成NPC信件
async function generateNPCLetter(chatHistory, sceneSummary) {
    const letterContainer = document.getElementById('npc-letter');
    
    // 显示加载状态
    letterContainer.classList.add('loading');
    letterContainer.innerHTML = '<p>📝 正在撰写信件...</p>';
    
    try {
        const letterPrompt = `
故事总结：${sceneSummary}

对话记录：
${chatHistory}

NPC列表：${state.scene.npcList}

请选择一个最合适的NPC，以TA的口吻给玩家写一封信，描述对话后发生的事情。

信件要求：
1. 选择对话中最活跃或与玩家互动最多的NPC
2. 使用第一人称（"我"）
3. 描述对话后的想法、感受或发生的事
4. 保持NPC的性格和说话风格
5. 字数控制在200-400字

${state.modules.letter.jsonMode ? 
`返回JSON格式：
{
  "npc_name": "NPC名字",
  "letter_content": "信件内容"
}` : 
`返回格式：
【来信者】NPC名字

【信件内容】
信件正文...`}
`;

        const letterResponse = await callOpenAI(
            state.modules.letter.prompt,
            letterPrompt,
            state.modules.letter.jsonMode
        );

        // 显示信件
        displayNPCLetter(letterResponse, state.modules.letter.jsonMode);

    } catch (error) {
        console.error('生成信件错误:', error);
        letterContainer.classList.remove('loading');
        letterContainer.innerHTML = '<p style="color: #e74c3c;">信件生成失败</p>';
    }
}

// 显示NPC信件
function displayNPCLetter(response, isJson) {
    const letterContainer = document.getElementById('npc-letter');
    letterContainer.classList.remove('loading');

    let html = '<div class="letter-content">';

    if (isJson) {
        try {
            const data = JSON.parse(response);
            html += `
                <div class="letter-header">
                    <span class="letter-icon">✉️</span>
                    <h3>来自 ${escapeHtml(data.npc_name)} 的信</h3>
                </div>
                <div class="letter-body">
                    ${escapeHtml(data.letter_content).replace(/\n/g, '<br>')}
                </div>
                <div class="letter-footer">
                    —— ${escapeHtml(data.npc_name)}
                </div>
            `;
        } catch (error) {
            console.error('JSON解析错误:', error);
            html += formatTextLetter(response);
        }
    } else {
        html += formatTextLetter(response);
    }

    html += '</div>';
    letterContainer.innerHTML = html;
}

// 格式化文本格式的信件
function formatTextLetter(text) {
    const nameMatch = text.match(/【来信者】(.+?)[\n\r]/);
    const contentMatch = text.match(/【信件内容】\s*([\s\S]*)/);

    let html = '';

    if (nameMatch) {
        const npcName = nameMatch[1].trim();
        html += `
            <div class="letter-header">
                <span class="letter-icon">✉️</span>
                <h3>来自 ${escapeHtml(npcName)} 的信</h3>
            </div>
        `;
    } else {
        html += `
            <div class="letter-header">
                <span class="letter-icon">✉️</span>
                <h3>NPC来信</h3>
            </div>
        `;
    }

    if (contentMatch) {
        const content = contentMatch[1].trim();
        html += `
            <div class="letter-body">
                ${escapeHtml(content).replace(/\n/g, '<br>')}
            </div>
        `;

        if (nameMatch) {
            html += `
                <div class="letter-footer">
                    —— ${escapeHtml(nameMatch[1].trim())}
                </div>
            `;
        }
    } else {
        // 如果格式不匹配，直接显示原文
        html += `
            <div class="letter-body">
                ${escapeHtml(text).replace(/\n/g, '<br>')}
            </div>
        `;
    }

    return html;
}

// 下一幕按钮
document.getElementById('next-scene-btn').addEventListener('click', () => {
    // 更新故事总结
    if (state.scene.nextStorySummary) {
        document.getElementById('story-summary').value = state.scene.nextStorySummary;
        state.scene.storySummary = state.scene.nextStorySummary;
    }

    // 跳转回场景初始化页面
    showPage('sceneInit');
});

// 返回配置按钮
document.getElementById('back-to-config-btn').addEventListener('click', () => {
    showPage('config');
});

// Enter 键发送消息
document.getElementById('user-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('send-btn').click();
    }
});

// ============================================
// 记忆查看界面
// ============================================

// 显示记忆模态框
function showMemoryModal() {
    const modal = document.getElementById('memory-modal');
    const display = document.getElementById('memory-display');
    
    // 生成记忆HTML
    display.innerHTML = generateMemoryHTML(state.playerMemory);
    
    // 显示模态框
    modal.classList.add('active');
}

// 关闭记忆模态框
function closeMemoryModal() {
    const modal = document.getElementById('memory-modal');
    modal.classList.remove('active');
}

// 生成记忆HTML
function generateMemoryHTML(memory) {
    if (!memory) return '<p class="empty">暂无记忆数据</p>';
    
    let html = '';
    
    // 玩家信息
    html += '<div class="memory-section">';
    html += '<h3>📋 玩家信息</h3>';
    if (memory.player_info.name || memory.player_info.description || 
        memory.player_info.personality || memory.player_info.background) {
        if (memory.player_info.name) {
            html += `<div class="memory-item"><div class="label">名字：</div><div class="value">${escapeHtml(memory.player_info.name)}</div></div>`;
        }
        if (memory.player_info.description) {
            html += `<div class="memory-item"><div class="label">描述：</div><div class="value">${escapeHtml(memory.player_info.description)}</div></div>`;
        }
        if (memory.player_info.personality) {
            html += `<div class="memory-item"><div class="label">性格：</div><div class="value">${escapeHtml(memory.player_info.personality)}</div></div>`;
        }
        if (memory.player_info.background) {
            html += `<div class="memory-item"><div class="label">背景：</div><div class="value">${escapeHtml(memory.player_info.background)}</div></div>`;
        }
    } else {
        html += '<p class="empty">暂无玩家信息</p>';
    }
    html += '</div>';
    
    // NPC关系
    html += '<div class="memory-section">';
    html += '<h3>🤝 NPC关系</h3>';
    const relationships = Object.entries(memory.relationships);
    if (relationships.length > 0) {
        relationships.forEach(([npcName, rel]) => {
            const relType = (rel.relationship || '').toLowerCase();
            let cssClass = 'neutral';
            if (relType.includes('友好') || relType.includes('友善')) cssClass = 'friendly';
            else if (relType.includes('敌对') || relType.includes('敌意')) cssClass = 'hostile';
            else if (relType.includes('盟友') || relType.includes('同伴')) cssClass = 'ally';
            
            html += '<div class="relationship-item">';
            html += `<div class="npc-name">${escapeHtml(npcName)}</div>`;
            html += `<span class="relationship-type ${cssClass}">${escapeHtml(rel.relationship || '中立')}</span>`;
            html += `<span class="trust-level">信任度: ${rel.trust_level || 5}/10</span>`;
            if (rel.key_interactions && rel.key_interactions.length > 0) {
                html += '<ul class="interactions">';
                rel.key_interactions.slice(-5).forEach(interaction => {
                    html += `<li>${escapeHtml(interaction)}</li>`;
                });
                html += '</ul>';
            }
            html += '</div>';
        });
    } else {
        html += '<p class="empty">暂无NPC关系记录</p>';
    }
    html += '</div>';
    
    // 目标和承诺
    html += '<div class="memory-section">';
    html += '<h3>🎯 目标与承诺</h3>';
    if (memory.goals_and_promises.length > 0) {
        memory.goals_and_promises.forEach(goal => {
            const statusIcon = goal.status === 'completed' ? '✅' : 
                             goal.status === 'failed' ? '❌' : '◆';
            html += `<div class="goal-item ${goal.status}">`;
            html += `<div class="status-icon">${statusIcon}</div>`;
            html += '<div class="goal-content">';
            html += `<div class="goal-type ${goal.type}">${goal.type === 'goal' ? '目标' : '承诺'}</div>`;
            html += `<div class="description">${escapeHtml(goal.content)}</div>`;
            html += `<div class="meta">`;
            if (goal.related_npc) html += `相关NPC: ${escapeHtml(goal.related_npc)} · `;
            html += `${goal.scene || '未知场景'}`;
            html += `</div>`;
            html += '</div>';
            html += '</div>';
        });
    } else {
        html += '<p class="empty">暂无目标或承诺</p>';
    }
    html += '</div>';
    
    // 关键事实
    if (memory.key_facts.length > 0) {
        html += '<div class="memory-section">';
        html += '<h3>💡 关键事实</h3>';
        memory.key_facts.slice(-10).forEach(fact => {
            html += '<div class="memory-item">';
            html += `<div class="value">${escapeHtml(fact.fact)}</div>`;
            html += `<div class="meta">${fact.scene || '未知场景'}</div>`;
            html += '</div>';
        });
        html += '</div>';
    }
    
    // 重要事件
    if (memory.important_events.length > 0) {
        html += '<div class="memory-section">';
        html += '<h3>⭐ 重要事件</h3>';
        memory.important_events.slice(-10).forEach(event => {
            html += '<div class="memory-item">';
            html += `<div class="value">${escapeHtml(event.event)}</div>`;
            html += `<div class="meta">${event.scene || '未知场景'}`;
            if (event.impact) html += ` · 影响: ${escapeHtml(event.impact)}`;
            html += `</div>`;
            html += '</div>';
        });
        html += '</div>';
    }
    
    // 物品
    if (memory.inventory_mentions.length > 0) {
        html += '<div class="memory-section">';
        html += '<h3>🎒 物品</h3>';
        html += '<div class="memory-item">';
        html += `<div class="value">${memory.inventory_mentions.map(escapeHtml).join('、')}</div>`;
        html += '</div>';
        html += '</div>';
    }
    
    // 技能
    if (memory.skills_and_abilities.length > 0) {
        html += '<div class="memory-section">';
        html += '<h3>⚔️ 技能与能力</h3>';
        html += '<div class="memory-item">';
        html += `<div class="value">${memory.skills_and_abilities.map(escapeHtml).join('、')}</div>`;
        html += '</div>';
        html += '</div>';
    }
    
    // 已发现的秘密
    if (memory.secrets_discovered.length > 0) {
        html += '<div class="memory-section">';
        html += '<h3>🔍 已发现的秘密</h3>';
        memory.secrets_discovered.forEach(secret => {
            html += '<div class="memory-item">';
            html += `<div class="value">${escapeHtml(secret)}</div>`;
            html += '</div>';
        });
        html += '</div>';
    }
    
    return html;
}

// 绑定记忆相关按钮事件
document.getElementById('view-memory-btn').addEventListener('click', showMemoryModal);
document.getElementById('close-memory-modal').addEventListener('click', closeMemoryModal);
document.getElementById('close-memory-btn').addEventListener('click', closeMemoryModal);

document.getElementById('export-memory-btn').addEventListener('click', () => {
    exportPlayerMemory();
});

document.getElementById('clear-memory-btn').addEventListener('click', () => {
    if (clearPlayerMemory()) {
        closeMemoryModal();
    }
});

// 点击模态框外部关闭
document.getElementById('memory-modal').addEventListener('click', (e) => {
    if (e.target.id === 'memory-modal') {
        closeMemoryModal();
    }
});

// ============================================
// 初始化
// ============================================

// 初始化玩家记忆
state.playerMemory = loadPlayerMemory();

// 初始化各模块的JSON Mode自动提示
console.log('🔧 正在初始化 JSON Mode 自动提示...');
setupJsonModeAutoHint('module1-prompt', 'module1-json');
setupJsonModeAutoHint('module2-prompt', 'module2-json');
setupJsonModeAutoHint('module3-prompt', 'module3-json');
setupJsonModeAutoHint('module5-prompt', 'module5-json');
console.log('✅ JSON Mode 自动提示已启用');

console.log('AI RPG 测试系统已加载');
console.log('🧠 玩家记忆系统已启用');

