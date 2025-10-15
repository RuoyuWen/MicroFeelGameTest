// 全局状态管理
const state = {
    apiKey: '',
    model: '',
    modules: {
        dialogue: { prompt: '', jsonMode: false },
        summary: { prompt: '', jsonMode: false },
        story: { prompt: '', jsonMode: false }
    },
    scene: {
        storySummary: '',
        npcList: '',
        npcGoals: '',
        chatHistory: []
    }
};

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

// 配置页面逻辑
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

    // 检查必填项
    if (!state.modules.dialogue.prompt || !state.modules.summary.prompt || !state.modules.story.prompt) {
        alert('请为所有模块配置 System Prompt');
        return;
    }

    // 调试：显示配置已保存（可选）
    console.log('配置已保存：');
    console.log('对话模块 System Prompt:', state.modules.dialogue.prompt.substring(0, 50) + '...');
    console.log('总结模块 System Prompt:', state.modules.summary.prompt.substring(0, 50) + '...');
    console.log('故事模块 System Prompt:', state.modules.story.prompt.substring(0, 50) + '...');

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
});

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
        
        // 第一条消息：场景信息和指令
        const contextMessage = `
故事背景：${state.scene.storySummary}

NPC列表：${state.scene.npcList}

NPC目标：${state.scene.npcGoals}

请根据上述信息和对话历史，决定让几个NPC回应（1个、2个或更多都可以，要符合实际情况）。
记住之前的对话内容，保持对话的连贯性和一致性。

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
2. 生成一个主要NPC的初始对话（包括NPC名字、对话内容、动作描述）

${state.modules.story.jsonMode ? 
`返回JSON格式：
{
  "scene_description": "下一幕的场景描述",
  "npc_dialogue": {
    "npc_name": "NPC名字",
    "content": "对话内容",
    "action": "动作描述"
  }
}` : 
`返回格式：
【场景描述】
下一幕的场景描述...

【NPC初始对话】
NPC名字：对话内容
动作：动作描述`}
`;

        const storyResponse = await callOpenAI(
            state.modules.story.prompt,
            storyPrompt,
            state.modules.story.jsonMode
        );

        // 显示下一幕
        displayNextScene(storyResponse, state.modules.story.jsonMode, updatedStorySummary);

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
                    <div class="action">动作：${escapeHtml(data.npc_dialogue.action || '')}</div>
                </div>
                ` : ''}
            `;
            
            // 保存下一幕的故事总结
            state.scene.nextStorySummary = data.scene_description || updatedStorySummary;
        } catch (error) {
            console.error('JSON 解析错误:', error);
            nextSceneDiv.textContent = response;
            state.scene.nextStorySummary = updatedStorySummary;
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
            html += `
                <div class="npc-dialogue">
                    ${escapeHtml(npcMatch[1].trim()).replace(/\n/g, '<br>')}
                </div>
            `;
        }

        nextSceneDiv.innerHTML = html || escapeHtml(response);
    }

    // 启用下一幕按钮
    document.getElementById('next-scene-btn').disabled = false;
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

// 初始化
console.log('AI RPG 测试系统已加载');

