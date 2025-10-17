# AI RPG系统 - Unreal Engine移植技术文档

## 📋 文档说明

本文档旨在指导程序员在Unreal Engine中重新实现当前的Web端AI RPG系统。文档详细描述了系统架构、数据流、各模块的输入输出，以及具体的实现建议。

**目标读者**：熟悉Unreal Engine和C++的程序员
**实现难度**：中等
**预估开发时间**：2-3周

---

## 📊 系统架构总览

### 系统组成

```
┌─────────────────────────────────────────────────────────┐
│                    AI RPG 系统架构                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐          │
│  │ UI Layer │   │ Game Logic│   │  AI Layer│          │
│  │  (UMG)   │◄─►│  (C++)   │◄─►│ (HTTP)   │          │
│  └──────────┘   └──────────┘   └──────────┘          │
│                       │                                 │
│                       ▼                                 │
│              ┌─────────────────┐                       │
│              │ Data Persistence│                       │
│              │ (SaveGame)      │                       │
│              └─────────────────┘                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 核心组件

1. **配置系统** - 管理API Key、模型选择、System Prompts
2. **场景管理系统** - 管理故事背景、NPC列表、场景目标
3. **对话系统** - 处理玩家输入和NPC响应
4. **AI模块系统** - 包含4个AI模块的管理和调用
5. **玩家记忆系统** - 持久化玩家信息和游戏进度
6. **UI系统** - 用户界面和交互

---

## 🗂️ 数据结构定义

### 1. 全局状态结构 (GameState)

```cpp
// FGameState.h
USTRUCT(BlueprintType)
struct FGameState
{
    GENERATED_BODY()

    // API配置
    UPROPERTY(BlueprintReadWrite, Category = "Config")
    FString APIKey;

    UPROPERTY(BlueprintReadWrite, Category = "Config")
    FString ModelName; // "gpt-4o", "gpt-4o-mini", etc.

    // AI模块配置
    UPROPERTY(BlueprintReadWrite, Category = "Modules")
    FAIModules Modules;

    // 场景信息
    UPROPERTY(BlueprintReadWrite, Category = "Scene")
    FSceneInfo Scene;

    // 玩家记忆
    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FPlayerMemory PlayerMemory;
};
```

### 2. AI模块配置结构

```cpp
// FAIModules.h
USTRUCT(BlueprintType)
struct FAIModule
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "AI")
    FString SystemPrompt;

    UPROPERTY(BlueprintReadWrite, Category = "AI")
    bool bUseJsonMode;
};

USTRUCT(BlueprintType)
struct FAIModules
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "AI")
    FAIModule DialogueModule; // Module 1: 对话模块

    UPROPERTY(BlueprintReadWrite, Category = "AI")
    FAIModule SummaryModule; // Module 2: 总结模块

    UPROPERTY(BlueprintReadWrite, Category = "AI")
    FAIModule StoryModule; // Module 3: 故事模块

    UPROPERTY(BlueprintReadWrite, Category = "AI")
    FAIModule MemoryModule; // Module 4: 记忆模块

    UPROPERTY(BlueprintReadWrite, Category = "AI")
    bool bMemoryEnabled; // 记忆系统是否启用
};
```

### 3. 场景信息结构

```cpp
// FSceneInfo.h
USTRUCT(BlueprintType)
struct FChatMessage
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Chat")
    FString Role; // "player" or "npc"

    UPROPERTY(BlueprintReadWrite, Category = "Chat")
    FString Content;
};

USTRUCT(BlueprintType)
struct FSceneInfo
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Scene")
    FString StorySummary; // 故事总结

    UPROPERTY(BlueprintReadWrite, Category = "Scene")
    FString NPCList; // NPC列表

    UPROPERTY(BlueprintReadWrite, Category = "Scene")
    FString NPCGoals; // NPC目标

    UPROPERTY(BlueprintReadWrite, Category = "Scene")
    TArray<FChatMessage> ChatHistory; // 对话历史（最多20条）

    UPROPERTY(BlueprintReadWrite, Category = "Scene")
    FString NextStorySummary; // 下一幕的故事总结

    UPROPERTY(BlueprintReadWrite, Category = "Scene")
    FNPCDialogue NextNPCDialogue; // 下一幕的NPC初始对话
};
```

### 4. NPC对话结构

```cpp
// FNPCDialogue.h
USTRUCT(BlueprintType)
struct FNPCDialogue
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Dialogue")
    FString NPCName;

    UPROPERTY(BlueprintReadWrite, Category = "Dialogue")
    FString Content;

    UPROPERTY(BlueprintReadWrite, Category = "Dialogue")
    FString Emotion; // 高兴、难过、失望、振奋、绝望、疯狂、希望、平静
};

USTRUCT(BlueprintType)
struct FNPCResponse
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Dialogue")
    TArray<FNPCDialogue> Responses; // 可能有多个NPC回应
};
```

### 5. 玩家记忆结构

```cpp
// FPlayerMemory.h
USTRUCT(BlueprintType)
struct FPlayerInfo
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FString Name;

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FString Description;

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FString Personality;

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FString Background;
};

USTRUCT(BlueprintType)
struct FKeyFact
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FString Fact;

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FString Scene;

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FString Timestamp;
};

USTRUCT(BlueprintType)
struct FNPCRelationship
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FString Relationship; // 友好、敌对、中立、盟友

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    int32 TrustLevel; // 1-10

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    TArray<FString> KeyInteractions;
};

USTRUCT(BlueprintType)
struct FGoalOrPromise
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FString Type; // "goal" or "promise"

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FString Content;

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FString RelatedNPC;

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FString Status; // "active", "completed", "failed"

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FString Scene;
};

USTRUCT(BlueprintType)
struct FImportantEvent
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FString Event;

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FString Scene;

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FString Impact;
};

USTRUCT(BlueprintType)
struct FPlayerMemory
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    FPlayerInfo PlayerInfo;

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    TArray<FKeyFact> KeyFacts;

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    TMap<FString, FNPCRelationship> Relationships;

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    TArray<FGoalOrPromise> GoalsAndPromises;

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    TArray<FImportantEvent> ImportantEvents;

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    TArray<FString> InventoryMentions;

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    TArray<FString> SkillsAndAbilities;

    UPROPERTY(BlueprintReadWrite, Category = "Memory")
    TArray<FString> SecretsDiscovered;
};
```

---

## 🔧 核心模块实现

### Module 1: 配置系统 (ConfigurationSystem)

#### 职责
- 管理API Key和模型选择
- 管理4个AI模块的System Prompts
- 验证配置有效性

#### 类定义

```cpp
// UConfigurationSystem.h
UCLASS()
class UConfigurationSystem : public UObject
{
    GENERATED_BODY()

public:
    // 设置API配置
    UFUNCTION(BlueprintCallable, Category = "Config")
    void SetAPIConfig(const FString& APIKey, const FString& ModelName);

    // 设置模块配置
    UFUNCTION(BlueprintCallable, Category = "Config")
    void SetModuleConfig(EAIModuleType ModuleType, const FAIModule& ModuleConfig);

    // 验证配置
    UFUNCTION(BlueprintCallable, Category = "Config")
    bool ValidateConfiguration(FString& OutErrorMessage);

    // 保存配置到磁盘
    UFUNCTION(BlueprintCallable, Category = "Config")
    void SaveConfiguration();

    // 从磁盘加载配置
    UFUNCTION(BlueprintCallable, Category = "Config")
    void LoadConfiguration();

    // JSON Mode自动提示
    UFUNCTION(BlueprintCallable, Category = "Config")
    FString AddJSONModeHint(const FString& OriginalPrompt);

    UFUNCTION(BlueprintCallable, Category = "Config")
    FString RemoveJSONModeHint(const FString& PromptWithHint);

private:
    UPROPERTY()
    FGameState GameState;
};
```

#### 关键函数实现

```cpp
// UConfigurationSystem.cpp

FString UConfigurationSystem::AddJSONModeHint(const FString& OriginalPrompt)
{
    const FString Hint = TEXT("\n\n重要：请使用JSON格式返回结果。");
    
    if (OriginalPrompt.Contains(TEXT("请使用JSON格式返回")))
    {
        // 已经包含，不重复添加
        return OriginalPrompt;
    }
    
    return OriginalPrompt + Hint;
}

FString UConfigurationSystem::RemoveJSONModeHint(const FString& PromptWithHint)
{
    const FString Hint = TEXT("\n\n重要：请使用JSON格式返回结果。");
    
    FString Result = PromptWithHint;
    Result.ReplaceInline(*Hint, TEXT(""));
    
    return Result;
}

bool UConfigurationSystem::ValidateConfiguration(FString& OutErrorMessage)
{
    // 检查API Key
    if (GameState.APIKey.IsEmpty())
    {
        OutErrorMessage = TEXT("请输入 OpenAI API Key");
        return false;
    }

    // 检查模块配置
    if (GameState.Modules.DialogueModule.SystemPrompt.IsEmpty())
    {
        OutErrorMessage = TEXT("请为对话模块配置 System Prompt");
        return false;
    }

    // ... 其他验证

    return true;
}
```

---

### Module 2: HTTP客户端 (OpenAIClient)

#### 职责
- 封装OpenAI API调用
- 处理HTTP请求和响应
- 支持JSON模式

#### 输入输出

**输入**：
```cpp
struct FOpenAIRequest
{
    FString SystemPrompt;      // System消息
    TArray<FChatMessage> Messages;  // 用户消息（可选历史记录）
    bool bUseJsonMode;         // 是否使用JSON模式
    FString APIKey;            // API密钥
    FString ModelName;         // 模型名称
};
```

**输出**：
```cpp
struct FOpenAIResponse
{
    bool bSuccess;             // 是否成功
    FString Content;           // AI返回的内容
    FString ErrorMessage;      // 错误信息（如果失败）
};
```

#### 类定义

```cpp
// UOpenAIClient.h
UCLASS()
class UOpenAIClient : public UObject
{
    GENERATED_BODY()

public:
    // 调用OpenAI API
    UFUNCTION(BlueprintCallable, Category = "OpenAI")
    void CallOpenAI(
        const FOpenAIRequest& Request,
        FOnOpenAIResponseDelegate OnComplete
    );

    // 简单调用（单条消息）
    UFUNCTION(BlueprintCallable, Category = "OpenAI")
    void CallOpenAISimple(
        const FString& SystemPrompt,
        const FString& UserPrompt,
        bool bUseJsonMode,
        const FString& APIKey,
        const FString& ModelName,
        FOnOpenAIResponseDelegate OnComplete
    );

    // 带历史记录的调用（多条消息）
    UFUNCTION(BlueprintCallable, Category = "OpenAI")
    void CallOpenAIWithHistory(
        const FString& SystemPrompt,
        const TArray<FChatMessage>& Messages,
        bool bUseJsonMode,
        const FString& APIKey,
        const FString& ModelName,
        FOnOpenAIResponseDelegate OnComplete
    );

private:
    void OnHttpRequestComplete(
        FHttpRequestPtr Request,
        FHttpResponsePtr Response,
        bool bWasSuccessful,
        FOnOpenAIResponseDelegate Callback
    );
};

DECLARE_DYNAMIC_DELEGATE_OneParam(FOnOpenAIResponseDelegate, const FOpenAIResponse&, Response);
```

#### 实现示例

```cpp
// UOpenAIClient.cpp

void UOpenAIClient::CallOpenAI(
    const FOpenAIRequest& Request,
    FOnOpenAIResponseDelegate OnComplete)
{
    // 创建HTTP请求
    TSharedRef<IHttpRequest, ESPMode::ThreadSafe> HttpRequest = 
        FHttpModule::Get().CreateRequest();

    // 设置URL
    HttpRequest->SetURL(TEXT("https://api.openai.com/v1/chat/completions"));
    
    // 设置方法
    HttpRequest->SetVerb(TEXT("POST"));
    
    // 设置Headers
    HttpRequest->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
    HttpRequest->SetHeader(TEXT("Authorization"), 
        FString::Printf(TEXT("Bearer %s"), *Request.APIKey));

    // 构建请求体
    TSharedPtr<FJsonObject> RequestBody = MakeShareable(new FJsonObject);
    RequestBody->SetStringField(TEXT("model"), Request.ModelName);
    RequestBody->SetNumberField(TEXT("temperature"), 0.7);

    // 构建messages数组
    TArray<TSharedPtr<FJsonValue>> MessagesArray;
    
    // 添加system消息
    TSharedPtr<FJsonObject> SystemMsg = MakeShareable(new FJsonObject);
    SystemMsg->SetStringField(TEXT("role"), TEXT("system"));
    SystemMsg->SetStringField(TEXT("content"), Request.SystemPrompt);
    MessagesArray.Add(MakeShareable(new FJsonValueObject(SystemMsg)));

    // 添加用户消息
    for (const FChatMessage& Msg : Request.Messages)
    {
        TSharedPtr<FJsonObject> MsgObj = MakeShareable(new FJsonObject);
        MsgObj->SetStringField(TEXT("role"), Msg.Role);
        MsgObj->SetStringField(TEXT("content"), Msg.Content);
        MessagesArray.Add(MakeShareable(new FJsonValueObject(MsgObj)));
    }

    RequestBody->SetArrayField(TEXT("messages"), MessagesArray);

    // JSON模式
    if (Request.bUseJsonMode)
    {
        TSharedPtr<FJsonObject> ResponseFormat = MakeShareable(new FJsonObject);
        ResponseFormat->SetStringField(TEXT("type"), TEXT("json_object"));
        RequestBody->SetObjectField(TEXT("response_format"), ResponseFormat);
    }

    // 序列化JSON
    FString RequestBodyString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&RequestBodyString);
    FJsonSerializer::Serialize(RequestBody.ToSharedRef(), Writer);

    HttpRequest->SetContentAsString(RequestBodyString);

    // 绑定回调
    HttpRequest->OnProcessRequestComplete().BindUObject(
        this, 
        &UOpenAIClient::OnHttpRequestComplete,
        OnComplete
    );

    // 发送请求
    HttpRequest->ProcessRequest();
}

void UOpenAIClient::OnHttpRequestComplete(
    FHttpRequestPtr Request,
    FHttpResponsePtr Response,
    bool bWasSuccessful,
    FOnOpenAIResponseDelegate Callback)
{
    FOpenAIResponse Result;

    if (!bWasSuccessful || !Response.IsValid())
    {
        Result.bSuccess = false;
        Result.ErrorMessage = TEXT("HTTP请求失败");
        Callback.ExecuteIfBound(Result);
        return;
    }

    // 解析响应
    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = 
        TJsonReaderFactory<>::Create(Response->GetContentAsString());

    if (!FJsonSerializer::Deserialize(Reader, JsonObject))
    {
        Result.bSuccess = false;
        Result.ErrorMessage = TEXT("JSON解析失败");
        Callback.ExecuteIfBound(Result);
        return;
    }

    // 提取内容
    const TArray<TSharedPtr<FJsonValue>>* ChoicesArray;
    if (JsonObject->TryGetArrayField(TEXT("choices"), ChoicesArray) && 
        ChoicesArray->Num() > 0)
    {
        TSharedPtr<FJsonObject> FirstChoice = 
            (*ChoicesArray)[0]->AsObject();
        TSharedPtr<FJsonObject> Message = 
            FirstChoice->GetObjectField(TEXT("message"));
        
        Result.bSuccess = true;
        Result.Content = Message->GetStringField(TEXT("content"));
    }
    else
    {
        Result.bSuccess = false;
        Result.ErrorMessage = TEXT("响应格式错误");
    }

    Callback.ExecuteIfBound(Result);
}
```

---

### Module 3: 对话模块 (DialogueModule)

#### 职责
- 处理玩家输入
- 调用AI生成NPC回应
- 管理对话历史
- 触发记忆更新

#### 输入

```cpp
struct FDialogueInput
{
    FString UserInput;              // 玩家输入
    FString StorySummary;           // 故事背景
    FString NPCList;                // NPC列表
    FString NPCGoals;               // NPC目标
    TArray<FChatMessage> ChatHistory;  // 最近的对话历史（最多20条）
    FString MemoryContext;          // 玩家记忆摘要
};
```

#### 输出

```cpp
struct FDialogueOutput
{
    bool bSuccess;                  // 是否成功
    FNPCResponse NPCResponse;       // NPC回应
    FString RawResponse;            // 原始AI响应（用于记忆模块）
    FString ErrorMessage;           // 错误信息
};
```

#### 类定义

```cpp
// UDialogueModule.h
UCLASS()
class UDialogueModule : public UObject
{
    GENERATED_BODY()

public:
    // 处理玩家输入
    UFUNCTION(BlueprintCallable, Category = "Dialogue")
    void ProcessPlayerInput(
        const FDialogueInput& Input,
        const FAIModule& ModuleConfig,
        const FString& APIKey,
        const FString& ModelName,
        FOnDialogueCompleteDelegate OnComplete
    );

    // 生成初始问候
    UFUNCTION(BlueprintCallable, Category = "Dialogue")
    void GenerateInitialGreeting(
        const FSceneInfo& Scene,
        const FAIModule& ModuleConfig,
        const FString& APIKey,
        const FString& ModelName,
        FOnDialogueCompleteDelegate OnComplete
    );

private:
    // 解析NPC响应（JSON格式）
    FNPCResponse ParseJSONResponse(const FString& JSONString);

    // 解析NPC响应（文本格式）
    FNPCResponse ParseTextResponse(const FString& TextString);

    UPROPERTY()
    UOpenAIClient* OpenAIClient;
};

DECLARE_DYNAMIC_DELEGATE_OneParam(FOnDialogueCompleteDelegate, const FDialogueOutput&, Output);
```

#### 关键实现

```cpp
// UDialogueModule.cpp

void UDialogueModule::ProcessPlayerInput(
    const FDialogueInput& Input,
    const FAIModule& ModuleConfig,
    const FString& APIKey,
    const FString& ModelName,
    FOnDialogueCompleteDelegate OnComplete)
{
    // 构建消息数组
    TArray<FChatMessage> Messages;

    // 第一条：场景信息和指令
    FChatMessage ContextMsg;
    ContextMsg.Role = TEXT("user");
    ContextMsg.Content = FString::Printf(TEXT(
        "故事背景：%s\n\n"
        "NPC列表：%s\n\n"
        "NPC目标：%s\n"
        "%s\n\n"
        "请根据上述信息和对话历史，决定让几个NPC回应。"
        "记住之前的对话内容，保持对话的连贯性。\n\n"
        "返回格式：..."), 
        *Input.StorySummary,
        *Input.NPCList,
        *Input.NPCGoals,
        *Input.MemoryContext
    );
    Messages.Add(ContextMsg);

    // 添加历史对话（最近10轮，20条消息）
    int32 MaxHistory = 20;
    int32 StartIndex = FMath::Max(0, Input.ChatHistory.Num() - MaxHistory);
    for (int32 i = StartIndex; i < Input.ChatHistory.Num(); i++)
    {
        const FChatMessage& HistMsg = Input.ChatHistory[i];
        
        FChatMessage FormattedMsg;
        if (HistMsg.Role == TEXT("player"))
        {
            FormattedMsg.Role = TEXT("user");
            FormattedMsg.Content = FString::Printf(TEXT("玩家：%s"), *HistMsg.Content);
        }
        else // npc
        {
            FormattedMsg.Role = TEXT("assistant");
            FormattedMsg.Content = HistMsg.Content;
        }
        Messages.Add(FormattedMsg);
    }

    // 当前玩家输入
    FChatMessage CurrentMsg;
    CurrentMsg.Role = TEXT("user");
    CurrentMsg.Content = FString::Printf(TEXT("玩家：%s"), *Input.UserInput);
    Messages.Add(CurrentMsg);

    // 调用OpenAI
    FOpenAIRequest Request;
    Request.SystemPrompt = ModuleConfig.SystemPrompt;
    Request.Messages = Messages;
    Request.bUseJsonMode = ModuleConfig.bUseJsonMode;
    Request.APIKey = APIKey;
    Request.ModelName = ModelName;

    OpenAIClient->CallOpenAI(Request, 
        FOnOpenAIResponseDelegate::CreateUObject(
            this, 
            &UDialogueModule::OnOpenAIResponse,
            OnComplete,
            ModuleConfig.bUseJsonMode
        )
    );
}

void UDialogueModule::OnOpenAIResponse(
    const FOpenAIResponse& Response,
    FOnDialogueCompleteDelegate OnComplete,
    bool bIsJsonMode)
{
    FDialogueOutput Output;

    if (!Response.bSuccess)
    {
        Output.bSuccess = false;
        Output.ErrorMessage = Response.ErrorMessage;
        OnComplete.ExecuteIfBound(Output);
        return;
    }

    // 解析响应
    if (bIsJsonMode)
    {
        Output.NPCResponse = ParseJSONResponse(Response.Content);
    }
    else
    {
        Output.NPCResponse = ParseTextResponse(Response.Content);
    }

    Output.bSuccess = true;
    Output.RawResponse = Response.Content;

    OnComplete.ExecuteIfBound(Output);
}

FNPCResponse UDialogueModule::ParseJSONResponse(const FString& JSONString)
{
    FNPCResponse Result;

    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = 
        TJsonReaderFactory<>::Create(JSONString);

    if (!FJsonSerializer::Deserialize(Reader, JsonObject))
    {
        UE_LOG(LogTemp, Error, TEXT("Failed to parse NPC response JSON"));
        return Result;
    }

    // 解析responses数组
    const TArray<TSharedPtr<FJsonValue>>* ResponsesArray;
    if (JsonObject->TryGetArrayField(TEXT("responses"), ResponsesArray))
    {
        for (const TSharedPtr<FJsonValue>& Value : *ResponsesArray)
        {
            TSharedPtr<FJsonObject> NPCObj = Value->AsObject();
            
            FNPCDialogue Dialogue;
            Dialogue.NPCName = NPCObj->GetStringField(TEXT("npc_name"));
            Dialogue.Content = NPCObj->GetStringField(TEXT("content"));
            Dialogue.Emotion = NPCObj->GetStringField(TEXT("emotion"));
            
            Result.Responses.Add(Dialogue);
        }
    }

    return Result;
}
```

---

### Module 4: 玩家记忆模块 (MemoryModule)

#### 职责
- 分析对话，提取关键信息
- 更新玩家记忆变量
- 生成记忆摘要供对话使用

#### 输入

```cpp
struct FMemoryUpdateInput
{
    FString CurrentScene;              // 当前场景
    TArray<FChatMessage> RecentConversation;  // 最近的对话
    FPlayerMemory CurrentMemory;       // 当前的记忆状态
};
```

#### 输出

```cpp
struct FMemoryUpdateOutput
{
    bool bSuccess;                     // 是否成功
    FPlayerMemory UpdatedMemory;       // 更新后的记忆
    FString ErrorMessage;              // 错误信息
};
```

#### 类定义

```cpp
// UMemoryModule.h
UCLASS()
class UMemoryModule : public UObject
{
    GENERATED_BODY()

public:
    // 更新玩家记忆
    UFUNCTION(BlueprintCallable, Category = "Memory")
    void UpdatePlayerMemory(
        const FMemoryUpdateInput& Input,
        const FAIModule& ModuleConfig,
        const FString& APIKey,
        const FString& ModelName,
        FOnMemoryUpdateCompleteDelegate OnComplete
    );

    // 生成记忆摘要（用于对话模块）
    UFUNCTION(BlueprintCallable, Category = "Memory")
    FString GenerateMemoryContext(const FPlayerMemory& Memory);

    // 创建空白记忆
    UFUNCTION(BlueprintCallable, Category = "Memory")
    FPlayerMemory CreateEmptyMemory();

private:
    // 应用记忆更新
    void ApplyMemoryUpdates(
        FPlayerMemory& Memory,
        const TSharedPtr<FJsonObject>& Updates
    );

    UPROPERTY()
    UOpenAIClient* OpenAIClient;
};

DECLARE_DYNAMIC_DELEGATE_OneParam(FOnMemoryUpdateCompleteDelegate, 
    const FMemoryUpdateOutput&, Output);
```

#### 关键实现

```cpp
// UMemoryModule.cpp

FString UMemoryModule::GenerateMemoryContext(const FPlayerMemory& Memory)
{
    FString Context = TEXT("\n【玩家记忆档案】\n");

    // 玩家信息
    if (!Memory.PlayerInfo.Name.IsEmpty() || 
        !Memory.PlayerInfo.Description.IsEmpty())
    {
        Context += TEXT("玩家信息：");
        if (!Memory.PlayerInfo.Name.IsEmpty())
        {
            Context += Memory.PlayerInfo.Name + TEXT(" - ");
        }
        Context += Memory.PlayerInfo.Description + TEXT("\n");
        
        if (!Memory.PlayerInfo.Personality.IsEmpty())
        {
            Context += TEXT("性格：") + Memory.PlayerInfo.Personality + TEXT("\n");
        }
    }

    // NPC关系（最多5个）
    if (Memory.Relationships.Num() > 0)
    {
        Context += TEXT("\n与NPC的关系：\n");
        int32 Count = 0;
        for (const auto& Pair : Memory.Relationships)
        {
            if (Count >= 5) break;
            
            Context += FString::Printf(TEXT("- %s：%s（信任度%d/10）\n"),
                *Pair.Key,
                *Pair.Value.Relationship,
                Pair.Value.TrustLevel
            );
            Count++;
        }
    }

    // 当前目标和承诺（最多3个）
    TArray<FGoalOrPromise> ActiveGoals;
    for (const FGoalOrPromise& Goal : Memory.GoalsAndPromises)
    {
        if (Goal.Status == TEXT("active"))
        {
            ActiveGoals.Add(Goal);
        }
    }

    if (ActiveGoals.Num() > 0)
    {
        Context += TEXT("\n当前目标和承诺：\n");
        for (int32 i = 0; i < FMath::Min(3, ActiveGoals.Num()); i++)
        {
            const FGoalOrPromise& Goal = ActiveGoals[i];
            FString TypeText = (Goal.Type == TEXT("goal")) ? TEXT("目标") : TEXT("承诺");
            Context += FString::Printf(TEXT("- %s：%s\n"), *TypeText, *Goal.Content);
        }
    }

    // 已发现的线索（最多3个）
    if (Memory.SecretsDiscovered.Num() > 0)
    {
        Context += TEXT("\n已发现的线索：\n");
        int32 NumToShow = FMath::Min(3, Memory.SecretsDiscovered.Num());
        for (int32 i = 0; i < NumToShow; i++)
        {
            Context += Memory.SecretsDiscovered[i];
            if (i < NumToShow - 1)
            {
                Context += TEXT("、");
            }
        }
        Context += TEXT("\n");
    }

    return Context;
}

void UMemoryModule::UpdatePlayerMemory(
    const FMemoryUpdateInput& Input,
    const FAIModule& ModuleConfig,
    const FString& APIKey,
    const FString& ModelName,
    FOnMemoryUpdateCompleteDelegate OnComplete)
{
    if (!ModuleConfig.bUseJsonMode)
    {
        UE_LOG(LogTemp, Error, TEXT("Memory Module must use JSON mode"));
        FMemoryUpdateOutput Output;
        Output.bSuccess = false;
        Output.ErrorMessage = TEXT("记忆模块必须使用JSON模式");
        OnComplete.ExecuteIfBound(Output);
        return;
    }

    // 构建提示词
    FString ConversationText;
    for (const FChatMessage& Msg : Input.RecentConversation)
    {
        if (Msg.Role == TEXT("player"))
        {
            ConversationText += FString::Printf(TEXT("玩家：%s\n"), *Msg.Content);
        }
        else
        {
            ConversationText += FString::Printf(TEXT("NPC：%s\n"), *Msg.Content);
        }
    }

    // 将当前记忆转换为JSON字符串
    FString CurrentMemoryJSON = MemoryToJSON(Input.CurrentMemory);

    FString UserPrompt = FString::Printf(TEXT(
        "请分析以下对话，提取关键信息并更新玩家记忆。\n\n"
        "当前场景：%s\n\n"
        "对话内容：\n%s\n\n"
        "当前记忆状态：\n%s\n\n"
        "请返回JSON格式的更新指令。格式如下：\n"
        "{\n"
        "  \"player_info\": {...},\n"
        "  \"new_key_facts\": [...],\n"
        "  \"relationship_updates\": {...},\n"
        "  \"new_goals_and_promises\": [...],\n"
        "  ...\n"
        "}\n\n"
        "注意：只返回需要更新的字段。"
    ),
        *Input.CurrentScene,
        *ConversationText,
        *CurrentMemoryJSON
    );

    // 调用OpenAI
    TArray<FChatMessage> Messages;
    FChatMessage Msg;
    Msg.Role = TEXT("user");
    Msg.Content = UserPrompt;
    Messages.Add(Msg);

    FOpenAIRequest Request;
    Request.SystemPrompt = ModuleConfig.SystemPrompt;
    Request.Messages = Messages;
    Request.bUseJsonMode = true;
    Request.APIKey = APIKey;
    Request.ModelName = ModelName;

    OpenAIClient->CallOpenAI(Request,
        FOnOpenAIResponseDelegate::CreateUObject(
            this,
            &UMemoryModule::OnMemoryUpdateResponse,
            Input.CurrentMemory,
            OnComplete
        )
    );
}

void UMemoryModule::OnMemoryUpdateResponse(
    const FOpenAIResponse& Response,
    FPlayerMemory CurrentMemory,
    FOnMemoryUpdateCompleteDelegate OnComplete)
{
    FMemoryUpdateOutput Output;

    if (!Response.bSuccess)
    {
        Output.bSuccess = false;
        Output.ErrorMessage = Response.ErrorMessage;
        OnComplete.ExecuteIfBound(Output);
        return;
    }

    // 解析更新指令
    TSharedPtr<FJsonObject> UpdatesObject;
    TSharedRef<TJsonReader<>> Reader = 
        TJsonReaderFactory<>::Create(Response.Content);

    if (!FJsonSerializer::Deserialize(Reader, UpdatesObject))
    {
        Output.bSuccess = false;
        Output.ErrorMessage = TEXT("无法解析记忆更新JSON");
        OnComplete.ExecuteIfBound(Output);
        return;
    }

    // 应用更新
    ApplyMemoryUpdates(CurrentMemory, UpdatesObject);

    Output.bSuccess = true;
    Output.UpdatedMemory = CurrentMemory;

    OnComplete.ExecuteIfBound(Output);
}
```

---

## 📦 持久化系统 (SaveGame)

### SaveGame类定义

```cpp
// UAIRPGSaveGame.h
UCLASS()
class UAIRPGSaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY()
    FGameState GameState;

    // 保存槽名称
    static const FString SaveSlotName;
};

// UAIRPGSaveGame.cpp
const FString UAIRPGSaveGame::SaveSlotName = TEXT("AIRPGSaveSlot");
```

### 保存和加载

```cpp
// 保存游戏状态
void SaveGameState(const FGameState& State)
{
    UAIRPGSaveGame* SaveGameInstance = Cast<UAIRPGSaveGame>(
        UGameplayStatics::CreateSaveGameObject(UAIRPGSaveGame::StaticClass())
    );

    if (SaveGameInstance)
    {
        SaveGameInstance->GameState = State;

        UGameplayStatics::SaveGameToSlot(
            SaveGameInstance,
            UAIRPGSaveGame::SaveSlotName,
            0
        );

        UE_LOG(LogTemp, Log, TEXT("Game state saved"));
    }
}

// 加载游戏状态
FGameState LoadGameState()
{
    FGameState DefaultState;

    if (UGameplayStatics::DoesSaveGameExist(
        UAIRPGSaveGame::SaveSlotName, 0))
    {
        UAIRPGSaveGame* LoadedGame = Cast<UAIRPGSaveGame>(
            UGameplayStatics::LoadGameFromSlot(
                UAIRPGSaveGame::SaveSlotName,
                0
            )
        );

        if (LoadedGame)
        {
            UE_LOG(LogTemp, Log, TEXT("Game state loaded"));
            return LoadedGame->GameState;
        }
    }

    UE_LOG(LogTemp, Warning, TEXT("No save game found, creating new state"));
    return DefaultState;
}
```

---

## 🎨 UI系统实现 (UMG)

### UI结构

```
RootWidget (UUserWidget)
├── ConfigWidget (配置页面)
│   ├── APIKeyInput (TextBox)
│   ├── ModelSelector (ComboBox)
│   ├── Module1Config (ModuleConfigWidget)
│   ├── Module2Config (ModuleConfigWidget)
│   ├── Module3Config (ModuleConfigWidget)
│   ├── Module4Config (ModuleConfigWidget)
│   └── StartButton (Button)
├── SceneInitWidget (场景初始化页面)
│   ├── StorySummaryInput (MultiLineTextBox)
│   ├── NPCListInput (MultiLineTextBox)
│   ├── NPCGoalsInput (MultiLineTextBox)
│   └── BeginDialogueButton (Button)
├── DialogueWidget (对话页面)
│   ├── SceneInfoPanel (Panel)
│   ├── MessageList (ScrollBox)
│   ├── UserInputBox (MultiLineTextBox)
│   ├── SendButton (Button)
│   ├── EndDialogueButton (Button)
│   └── ViewMemoryButton (Button)
├── SummaryWidget (总结页面)
│   ├── SceneSummary (TextBlock)
│   ├── NextSceneDescription (TextBlock)
│   ├── NextSceneButton (Button)
│   └── BackToConfigButton (Button)
└── MemoryModalWidget (记忆查看模态框)
    ├── MemoryDisplay (ScrollBox)
    ├── ExportButton (Button)
    ├── ClearButton (Button)
    └── CloseButton (Button)
```

### ModuleConfigWidget 示例

```cpp
// UModuleConfigWidget.h
UCLASS()
class UModuleConfigWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UPROPERTY(meta = (BindWidget))
    UMultiLineEditableTextBox* SystemPromptInput;

    UPROPERTY(meta = (BindWidget))
    UCheckBox* JSONModeCheckbox;

    UFUNCTION()
    void OnJSONModeChanged(bool bIsChecked);

    UFUNCTION()
    FString GetSystemPrompt() const;

    UFUNCTION()
    void SetSystemPrompt(const FString& Prompt);

    UFUNCTION()
    bool IsJSONModeEnabled() const;

protected:
    virtual void NativeConstruct() override;

private:
    const FString JSONModeHint = TEXT("\n\n重要：请使用JSON格式返回结果。");
};
```

---

## 🔄 完整数据流程

### 1. 配置阶段

```
用户填写配置
    ↓
验证配置 (ConfigurationSystem::ValidateConfiguration)
    ↓
保存到GameState
    ↓
保存到磁盘 (SaveGame)
    ↓
切换到场景初始化页面
```

### 2. 场景初始化阶段

```
用户填写场景信息
    ↓
保存到GameState.Scene
    ↓
生成初始问候 (DialogueModule::GenerateInitialGreeting)
    ↓
    调用 OpenAI API
        输入: SystemPrompt + 场景信息
        输出: NPC初始对话
    ↓
显示NPC问候
    ↓
切换到对话页面
```

### 3. 对话阶段

```
玩家输入
    ↓
构建对话上下文
    ├─ 场景信息
    ├─ 对话历史
    └─ 玩家记忆摘要 (MemoryModule::GenerateMemoryContext)
    ↓
调用对话模块 (DialogueModule::ProcessPlayerInput)
    ↓
    调用 OpenAI API
        输入: SystemPrompt + 对话上下文 + 玩家输入
        输出: NPC回应(JSON/文本)
    ↓
解析NPC回应
    ↓
显示NPC回应
    ↓
更新对话历史
    ↓
异步更新玩家记忆 (MemoryModule::UpdatePlayerMemory)
    ↓
    调用 OpenAI API (JSON模式)
        输入: SystemPrompt + 对话内容 + 当前记忆
        输出: 记忆更新指令(JSON)
    ↓
应用记忆更新
    ↓
保存到磁盘 (SaveGame)
```

### 4. 场景结束阶段

```
用户点击"结束对话"
    ↓
调用总结模块
    ↓
    调用 OpenAI API
        输入: SystemPrompt + 场景信息 + 对话历史
        输出: 场景总结
    ↓
显示总结
    ↓
调用故事模块
    ↓
    调用 OpenAI API
        输入: SystemPrompt + 场景总结 + NPC信息
        输出: 下一幕场景 + NPC初始对话
    ↓
显示下一幕内容
    ↓
保存到GameState
    ↓
用户点击"下一幕" → 返回场景初始化页面
```

---

## 📊 模块输入输出总结表

| 模块 | 输入 | 输出 | API调用 |
|------|------|------|---------|
| **对话模块** | • 玩家输入<br>• 场景信息<br>• 对话历史<br>• 记忆摘要 | • NPC回应(多个)<br>• 原始响应文本 | ✅ 是<br>(带历史) |
| **总结模块** | • 场景信息<br>• 对话历史 | • 场景总结文本 | ✅ 是<br>(简单调用) |
| **故事模块** | • 场景总结<br>• NPC信息 | • 下一幕描述<br>• NPC初始对话 | ✅ 是<br>(简单调用) |
| **记忆模块** | • 对话内容<br>• 当前记忆<br>• 场景信息 | • 更新后的记忆 | ✅ 是<br>(JSON模式) |
| **记忆摘要** | • 完整记忆 | • 摘要文本 | ❌ 否<br>(纯函数) |

---

## 🛠️ 实现建议

### 1. 开发顺序

1. **第一阶段**（基础框架）
   - 创建数据结构（所有USTRUCT）
   - 实现SaveGame系统
   - 实现基本的UI框架

2. **第二阶段**（HTTP通信）
   - 实现OpenAIClient
   - 测试API调用
   - 处理错误情况

3. **第三阶段**（核心模块）
   - 实现对话模块
   - 实现总结模块
   - 实现故事模块

4. **第四阶段**（记忆系统）
   - 实现玩家记忆结构
   - 实现记忆模块
   - 实现记忆摘要生成

5. **第五阶段**（UI完善）
   - 实现所有UI页面
   - 实现页面切换
   - 实现记忆查看界面

6. **第六阶段**（优化和测试）
   - 性能优化
   - 错误处理
   - 用户体验优化

### 2. 技术要点

#### HTTP异步调用
```cpp
// 所有OpenAI调用都应该是异步的
// 使用委托(Delegate)回调结果
// 显示加载动画，不阻塞UI
```

#### JSON处理
```cpp
// 使用Unreal的FJsonObject和FJsonValue
// 注意错误处理和异常情况
// JSON Mode需要在请求中设置response_format
```

#### 内存管理
```cpp
// 使用UPROPERTY()标记所有UObject指针
// 注意TSharedPtr的使用
// 定期保存GameState，防止数据丢失
```

#### 错误处理
```cpp
// 网络错误：显示错误信息，允许重试
// API错误：记录日志，提示用户
// 解析错误：降级处理或使用默认值
```

### 3. 性能优化

- **对话历史限制**：只保留最近20条消息
- **记忆摘要**：生成摘要时只包含最相关的信息
- **异步加载**：UI显示不阻塞主线程
- **缓存机制**：可以缓存System Prompts避免重复配置

### 4. 用户体验

- **加载提示**：所有API调用时显示"AI正在思考..."
- **错误提示**：友好的错误信息和解决建议
- **自动保存**：关键操作后自动保存
- **历史记录**：可以查看之前的对话

---

## 📝 API调用示例

### 示例1：简单调用（总结模块）

```cpp
// 输入
FOpenAIRequest Request;
Request.SystemPrompt = "你是一个故事总结专家...";
Request.APIKey = "sk-...";
Request.ModelName = "gpt-4o-mini";
Request.bUseJsonMode = false;

FChatMessage UserMsg;
UserMsg.Role = "user";
UserMsg.Content = "故事背景：...\n聊天记录：...\n请总结当前场景。";
Request.Messages.Add(UserMsg);

// 调用
OpenAIClient->CallOpenAI(Request, Callback);

// 输出
// Response.Content = "在这一幕中，玩家与老板展开对话..."
```

### 示例2：带历史记录的调用（对话模块）

```cpp
// 输入
TArray<FChatMessage> Messages;

// 场景信息
FChatMessage Context;
Context.Role = "user";
Context.Content = "故事背景：...\nNPC列表：...\n记忆：玩家叫艾伦...";
Messages.Add(Context);

// 历史对话
FChatMessage Hist1;
Hist1.Role = "user";
Hist1.Content = "玩家：你好";
Messages.Add(Hist1);

FChatMessage Hist2;
Hist2.Role = "assistant";
Hist2.Content = "[老板] 欢迎光临！ [情绪：高兴]";
Messages.Add(Hist2);

// 当前输入
FChatMessage Current;
Current.Role = "user";
Current.Content = "玩家：给我来杯酒";
Messages.Add(Current);

// 调用
FOpenAIRequest Request;
Request.SystemPrompt = "你是一个游戏DM...";
Request.Messages = Messages;
Request.bUseJsonMode = true;

OpenAIClient->CallOpenAI(Request, Callback);

// 输出（JSON格式）
/*
{
  "responses": [
    {
      "npc_name": "老板汤姆",
      "content": "好的，3个铜币。",
      "emotion": "高兴"
    }
  ]
}
*/
```

### 示例3：JSON模式调用（记忆模块）

```cpp
// 输入
FOpenAIRequest Request;
Request.SystemPrompt = "你是一个记忆管理助手...";
Request.bUseJsonMode = true;  // 必须使用JSON模式

FChatMessage UserMsg;
UserMsg.Role = "user";
UserMsg.Content = R"(
请分析对话并更新记忆。

对话内容：
玩家：我叫艾伦
NPC：欢迎，艾伦！

当前记忆：
{ "player_info": { "name": "" } }

返回更新指令。
)";
Request.Messages.Add(UserMsg);

OpenAIClient->CallOpenAI(Request, Callback);

// 输出（JSON格式）
/*
{
  "player_info": {
    "name": "艾伦"
  },
  "new_key_facts": [
    {
      "fact": "玩家介绍了自己的名字",
      "scene": "酒馆"
    }
  ]
}
*/
```

---

## 🔒 安全性考虑

### API Key保护

```cpp
// 不要硬编码API Key
// 使用加密存储
// SaveGame可以考虑加密

// 示例：简单的XOR加密
FString EncryptAPIKey(const FString& APIKey, const FString& Key)
{
    // 实现简单的加密
    // 实际项目应使用更强的加密算法
}
```

### 输入验证

```cpp
// 验证用户输入长度
bool ValidateUserInput(const FString& Input)
{
    if (Input.IsEmpty())
    {
        return false;
    }
    
    if (Input.Len() > 2000) // 限制长度
    {
        return false;
    }
    
    return true;
}
```

---

## 🎯 测试建议

### 单元测试

```cpp
// 测试JSON解析
UTEST("MemoryModule_ParseJSON")
{
    FString JSON = R"({"player_info": {"name": "测试"}})";
    FPlayerMemory Memory = ParseMemoryJSON(JSON);
    CHECK_EQUAL(Memory.PlayerInfo.Name, "测试");
}

// 测试记忆摘要生成
UTEST("MemoryModule_GenerateContext")
{
    FPlayerMemory Memory;
    Memory.PlayerInfo.Name = "艾伦";
    FString Context = GenerateMemoryContext(Memory);
    CHECK(Context.Contains("艾伦"));
}
```

### 集成测试

```cpp
// 测试完整对话流程
// 1. 配置系统
// 2. 初始化场景
// 3. 发送玩家输入
// 4. 接收NPC回应
// 5. 验证记忆更新
```

---

## 📚 参考资料

### Unreal Engine文档
- HTTP模块：https://docs.unrealengine.com/en-US/API/Runtime/HTTP/
- JSON处理：https://docs.unrealengine.com/en-US/API/Runtime/Json/
- SaveGame系统：https://docs.unrealengine.com/en-US/InteractiveExperiences/SaveGame/
- UMG UI：https://docs.unrealengine.com/en-US/InteractiveExperiences/UMG/

### OpenAI API文档
- Chat Completions：https://platform.openai.com/docs/api-reference/chat
- JSON Mode：https://platform.openai.com/docs/guides/text-generation/json-mode

---

## ✅ 检查清单

移植完成前，请确认：

- [ ] 所有数据结构已定义
- [ ] HTTP客户端工作正常
- [ ] 4个AI模块都已实现
- [ ] SaveGame系统能正常保存/加载
- [ ] UI所有页面都已实现
- [ ] 页面切换流畅无Bug
- [ ] 错误处理完善
- [ ] 记忆系统正常工作
- [ ] JSON解析正确
- [ ] 性能测试通过

---

## 🎊 总结

本文档提供了完整的技术指导，帮助你在Unreal Engine中实现AI RPG系统。关键点包括：

1. **明确的数据结构**：所有USTRUCT定义
2. **清晰的模块划分**：4个AI模块 + 支持系统
3. **详细的输入输出**：每个模块的接口定义
4. **完整的数据流**：从配置到对话的全流程
5. **实用的代码示例**：关键功能的实现参考

按照本文档的指导，配合Unreal Engine的强大功能，你可以实现一个功能完整、性能优秀的AI RPG游戏系统！

**祝开发顺利！** 🚀✨


