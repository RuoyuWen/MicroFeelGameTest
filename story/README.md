# AI故事生成工作流系统

一个基于GPT-4的多模块AI工作流系统，用于生成游戏故事。

## 功能模块

### 模块1：NPC设计
- 手动创建NPC或使用AI生成完整NPC信息
- 支持AI辅助生成背景故事
- 至少需要创建3个NPC才能进入下一步
- 可调整Prompt模板以控制AI生成风格

### 模块2：地点设计
- 创建游戏地点，支持多个描述
- 支持AI生成地点描述
- 至少需要创建1个地点才能进入下一步
- 可调整Prompt模板

### 模块3：故事生成
- 从已创建的NPC和地点中选择
- 手动输入故事或使用AI生成完整故事
- 设置故事风格
- 可调整Prompt模板

### 模块4：章节生成与优化
- AI自动将故事分成三章
- 查看和编辑每个章节
- 在任意章节之间插入新章节
- AI优化单个章节或整体优化所有章节
- 可调整多个Prompt模板

## 安装

```bash
pip install -r requirements.txt
```

## 运行

```bash
streamlit run main.py
```

## 使用说明

1. **设置API密钥**
   - 启动应用后，首先在首页输入OpenAI API Key
   - API密钥保存在session中，不会上传到服务器

2. **调整Prompt模板（可选）**
   - 每个模块都提供了Prompt调整功能
   - 点击"⚙️ 调整Prompt模板"展开设置
   - 修改Prompt后点击保存按钮

3. **完成各个模块**
   - 按照流程依次完成：NPC设计 → 地点设计 → 故事生成 → 章节生成
   - 每个模块都有最低要求，完成后才能进入下一步

4. **生成和优化章节**
   - 在模块4中，AI会自动生成三章故事
   - 可以编辑每个章节的内容
   - 可以在章节之间插入新章节
   - 使用AI优化功能使章节之间联系更紧密

## 项目结构

```
story/
├── main.py                 # 主应用入口
├── config.py              # 配置文件（包含默认Prompt）
├── models.py              # 数据模型（NPC、Location、Story、Chapter）
├── ai_modules.py          # AI模块核心类
├── state_manager.py       # 状态管理器
├── utils.py               # 工具函数
├── module1_npc.py         # NPC设计模块
├── module2_location.py    # 地点设计模块
├── module3_story.py       # 故事生成模块
├── module4_chapters.py    # 章节生成模块
├── requirements.txt       # 依赖包
└── README.md             # 说明文档
```

## 技术栈

- **Python 3.8+**
- **Streamlit** - Web界面框架
- **OpenAI API** - GPT-4模型调用
- **Pydantic** - 数据验证和模型

## 注意事项

- 需要有效的OpenAI API密钥
- API调用会产生费用，请注意使用量
- 所有数据保存在Streamlit的session state中，刷新页面会丢失数据
- 建议在完成每个模块后及时保存数据

