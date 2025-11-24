# 快速开始指南

## 1. 安装依赖

```bash
pip install -r requirements.txt
```

## 2. 配置API密钥

有两种方式设置API密钥：

### 方式1：在应用中设置（推荐）
- 运行应用后，在首页输入API密钥
- 密钥仅保存在浏览器session中，不会上传到服务器

### 方式2：修改config.py（不推荐，仅用于测试）
```python
OPENAI_API_KEY = "your-api-key-here"
```

## 3. 修改模型（可选）

如果GPT-4.1可用，可以在`config.py`中修改：
```python
OPENAI_MODEL: str = "gpt-4.1"  # 或你使用的模型名称
```

## 4. 运行应用

```bash
streamlit run main.py
```

应用会在浏览器中自动打开，默认地址：http://localhost:8501

## 5. 使用流程

1. **首页** - 输入API密钥
2. **模块1** - 创建至少3个NPC
3. **模块2** - 创建至少1个地点
4. **模块3** - 选择NPC和地点，生成故事
5. **模块4** - 生成章节并进行优化

## 提示

- 每个模块都可以调整Prompt模板，点击"⚙️ 调整Prompt模板"展开设置
- 所有数据保存在session state中，刷新页面会丢失
- 建议在完成每个模块后及时保存数据
- API调用会产生费用，请注意使用量

