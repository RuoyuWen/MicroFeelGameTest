# AI RPG系统 - Unreal实现细节补充文档

## 📋 文档说明

本文档是《Unreal引擎移植技术文档》的补充，提供更多实现细节、代码片段和最佳实践。

---

## 🎯 项目设置

### 1. 项目依赖模块

在 `YourProject.Build.cs` 中添加必要的模块：

```csharp
// YourProject.Build.cs
public class YourProject : ModuleRules
{
    public YourProject(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[] 
        { 
            "Core", 
            "CoreUObject", 
            "Engine", 
            "InputCore",
            "UMG",              // UI系统
            "Slate",            // Slate UI
            "SlateCore",        // Slate核心
            "HTTP",             // HTTP请求
            "Json",             // JSON处理
            "JsonUtilities"     // JSON工具
        });
    }
}
```

### 2. 项目结构建议

```
Source/YourProject/
├── Core/
│   ├── GameState/
│   │   ├── AIRPGGameState.h/cpp
│   │   └── AIRPGSaveGame.h/cpp
│   └── Subsystems/
│       └── AIRPGSubsystem.h/cpp
├── AI/
│   ├── OpenAIClient.h/cpp
│   ├── DialogueModule.h/cpp
│   ├── SummaryModule.h/cpp
│   ├── StoryModule.h/cpp
│   └── MemoryModule.h/cpp
├── Data/
│   ├── DataStructures.h
│   └── AIRPGTypes.h
└── UI/
    ├── Widgets/
    │   ├── ConfigWidget.h/cpp
    │   ├── SceneInitWidget.h/cpp
    │   ├── DialogueWidget.h/cpp
    │   ├── SummaryWidget.h/cpp
    │   └── MemoryModalWidget.h/cpp
    └── HUD/
        └── AIRPGHud.h/cpp
```

---

## 📦 完整的数据结构实现

### DataStructures.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DataStructures.generated.h"

// ============================================
// 基础消息结构
// ============================================

USTRUCT(BlueprintType)
struct FChatMessage
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Chat")
    FString Role; // "user", "assistant", "system"

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Chat")
    FString Content;

    FChatMessage()
        : Role(TEXT("user"))
        , Content(TEXT(""))
    {}

    FChatMessage(const FString& InRole, const FString& InContent)
        : Role(InRole)
        , Content(InContent)
    {}
};

// ============================================
// NPC对话结构
// ============================================

USTRUCT(BlueprintType)
struct FNPCDialogue
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Dialogue")
    FString NPCName;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Dialogue")
    FString Content;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Dialogue")
    FString Emotion; // 高兴、难过、失望、振奋、绝望、疯狂、希望、平静

    FNPCDialogue()
        : NPCName(TEXT(""))
        , Content(TEXT(""))
        , Emotion(TEXT("平静"))
    {}
};

USTRUCT(BlueprintType)
struct FNPCResponse
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Dialogue")
    TArray<FNPCDialogue> Responses;

    FNPCResponse()
    {
        Responses.Empty();
    }
};

// ============================================
// AI模块配置
// ============================================

USTRUCT(BlueprintType)
struct FAIModule
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "AI")
    FString SystemPrompt;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "AI")
    bool bUseJsonMode;

    FAIModule()
        : SystemPrompt(TEXT(""))
        , bUseJsonMode(false)
    {}
};

UENUM(BlueprintType)
enum class EAIModuleType : uint8
{
    Dialogue    UMETA(DisplayName = "Dialogue Module"),
    Summary     UMETA(DisplayName = "Summary Module"),
    Story       UMETA(DisplayName = "Story Module"),
    Memory      UMETA(DisplayName = "Memory Module")
};

USTRUCT(BlueprintType)
struct FAIModules
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "AI")
    FAIModule DialogueModule;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "AI")
    FAIModule SummaryModule;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "AI")
    FAIModule StoryModule;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "AI")
    FAIModule MemoryModule;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "AI")
    bool bMemoryEnabled;

    FAIModules()
        : bMemoryEnabled(true)
    {}
};

// ============================================
// 场景信息
// ============================================

USTRUCT(BlueprintType)
struct FSceneInfo
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Scene")
    FString StorySummary;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Scene")
    FString NPCList;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Scene")
    FString NPCGoals;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Scene")
    TArray<FChatMessage> ChatHistory;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Scene")
    FString NextStorySummary;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Scene")
    FNPCDialogue NextNPCDialogue;

    FSceneInfo()
        : StorySummary(TEXT(""))
        , NPCList(TEXT(""))
        , NPCGoals(TEXT(""))
        , NextStorySummary(TEXT(""))
    {
        ChatHistory.Empty();
    }
};

// ============================================
// 玩家记忆结构
// ============================================

USTRUCT(BlueprintType)
struct FPlayerInfo
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FString Name;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FString Description;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FString Personality;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FString Background;

    FPlayerInfo()
        : Name(TEXT(""))
        , Description(TEXT(""))
        , Personality(TEXT(""))
        , Background(TEXT(""))
    {}
};

USTRUCT(BlueprintType)
struct FKeyFact
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FString Fact;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FString Scene;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FString Timestamp;

    FKeyFact()
        : Fact(TEXT(""))
        , Scene(TEXT(""))
        , Timestamp(TEXT(""))
    {}
};

USTRUCT(BlueprintType)
struct FNPCRelationship
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FString Relationship;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    int32 TrustLevel;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    TArray<FString> KeyInteractions;

    FNPCRelationship()
        : Relationship(TEXT("中立"))
        , TrustLevel(5)
    {
        KeyInteractions.Empty();
    }
};

USTRUCT(BlueprintType)
struct FGoalOrPromise
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FString Type; // "goal" or "promise"

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FString Content;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FString RelatedNPC;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FString Status; // "active", "completed", "failed"

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FString Scene;

    FGoalOrPromise()
        : Type(TEXT("goal"))
        , Content(TEXT(""))
        , RelatedNPC(TEXT(""))
        , Status(TEXT("active"))
        , Scene(TEXT(""))
    {}
};

USTRUCT(BlueprintType)
struct FImportantEvent
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FString Event;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FString Scene;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FString Impact;

    FImportantEvent()
        : Event(TEXT(""))
        , Scene(TEXT(""))
        , Impact(TEXT(""))
    {}
};

USTRUCT(BlueprintType)
struct FPlayerMemory
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FPlayerInfo PlayerInfo;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    TArray<FKeyFact> KeyFacts;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    TMap<FString, FNPCRelationship> Relationships;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    TArray<FGoalOrPromise> GoalsAndPromises;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    TArray<FImportantEvent> ImportantEvents;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    TArray<FString> InventoryMentions;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    TArray<FString> SkillsAndAbilities;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    TArray<FString> SecretsDiscovered;

    FPlayerMemory()
    {
        KeyFacts.Empty();
        Relationships.Empty();
        GoalsAndPromises.Empty();
        ImportantEvents.Empty();
        InventoryMentions.Empty();
        SkillsAndAbilities.Empty();
        SecretsDiscovered.Empty();
    }
};

// ============================================
// 游戏状态
// ============================================

USTRUCT(BlueprintType)
struct FGameStateData
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Config")
    FString APIKey;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Config")
    FString ModelName;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Modules")
    FAIModules Modules;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Scene")
    FSceneInfo Scene;

    UPROPERTY(BlueprintReadWrite, EditAnywhere, Category = "Memory")
    FPlayerMemory PlayerMemory;

    FGameStateData()
        : APIKey(TEXT(""))
        , ModelName(TEXT("gpt-4o-mini"))
    {}
};

// ============================================
// OpenAI API相关
// ============================================

USTRUCT(BlueprintType)
struct FOpenAIRequest
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "OpenAI")
    FString SystemPrompt;

    UPROPERTY(BlueprintReadWrite, Category = "OpenAI")
    TArray<FChatMessage> Messages;

    UPROPERTY(BlueprintReadWrite, Category = "OpenAI")
    bool bUseJsonMode;

    UPROPERTY(BlueprintReadWrite, Category = "OpenAI")
    FString APIKey;

    UPROPERTY(BlueprintReadWrite, Category = "OpenAI")
    FString ModelName;

    FOpenAIRequest()
        : bUseJsonMode(false)
        , ModelName(TEXT("gpt-4o-mini"))
    {}
};

USTRUCT(BlueprintType)
struct FOpenAIResponse
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "OpenAI")
    bool bSuccess;

    UPROPERTY(BlueprintReadWrite, Category = "OpenAI")
    FString Content;

    UPROPERTY(BlueprintReadWrite, Category = "OpenAI")
    FString ErrorMessage;

    FOpenAIResponse()
        : bSuccess(false)
        , Content(TEXT(""))
        , ErrorMessage(TEXT(""))
    {}
};
```

---

## 🔧 工具函数库

### AIRPGUtilities.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "DataStructures.h"
#include "AIRPGUtilities.generated.h"

UCLASS()
class YOURPROJECT_API UAIRPGUtilities : public UBlueprintFunctionLibrary
{
    GENERATED_BODY()

public:
    // JSON序列化
    UFUNCTION(BlueprintCallable, Category = "AIRPG|Utilities")
    static FString MemoryToJSON(const FPlayerMemory& Memory);

    UFUNCTION(BlueprintCallable, Category = "AIRPG|Utilities")
    static FPlayerMemory JSONToMemory(const FString& JSONString);

    // JSON Mode提示
    UFUNCTION(BlueprintCallable, Category = "AIRPG|Utilities")
    static FString AddJSONModeHint(const FString& Prompt);

    UFUNCTION(BlueprintCallable, Category = "AIRPG|Utilities")
    static FString RemoveJSONModeHint(const FString& Prompt);

    // 对话历史管理
    UFUNCTION(BlueprintCallable, Category = "AIRPG|Utilities")
    static TArray<FChatMessage> GetRecentChatHistory(
        const TArray<FChatMessage>& History, 
        int32 MaxCount = 20
    );

    // 记忆摘要生成
    UFUNCTION(BlueprintCallable, Category = "AIRPG|Utilities")
    static FString GenerateMemoryContext(const FPlayerMemory& Memory);

    // 时间戳
    UFUNCTION(BlueprintCallable, Category = "AIRPG|Utilities")
    static FString GetCurrentTimestamp();

    // HTML转义（如果需要显示在UI）
    UFUNCTION(BlueprintCallable, Category = "AIRPG|Utilities")
    static FString EscapeHTML(const FString& Text);
};
```

### AIRPGUtilities.cpp

```cpp
#include "AIRPGUtilities.h"
#include "Json.h"
#include "JsonUtilities.h"

FString UAIRPGUtilities::AddJSONModeHint(const FString& Prompt)
{
    const FString Hint = TEXT("\n\n重要：请使用JSON格式返回结果。");
    
    if (Prompt.Contains(TEXT("请使用JSON格式返回")))
    {
        return Prompt;
    }
    
    return Prompt + Hint;
}

FString UAIRPGUtilities::RemoveJSONModeHint(const FString& Prompt)
{
    const FString Hint = TEXT("\n\n重要：请使用JSON格式返回结果。");
    return Prompt.Replace(*Hint, TEXT(""));
}

TArray<FChatMessage> UAIRPGUtilities::GetRecentChatHistory(
    const TArray<FChatMessage>& History, 
    int32 MaxCount)
{
    TArray<FChatMessage> Result;
    
    int32 StartIndex = FMath::Max(0, History.Num() - MaxCount);
    for (int32 i = StartIndex; i < History.Num(); i++)
    {
        Result.Add(History[i]);
    }
    
    return Result;
}

FString UAIRPGUtilities::GenerateMemoryContext(const FPlayerMemory& Memory)
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

FString UAIRPGUtilities::GetCurrentTimestamp()
{
    FDateTime Now = FDateTime::Now();
    return Now.ToString(TEXT("%Y-%m-%d %H:%M:%S"));
}

FString UAIRPGUtilities::EscapeHTML(const FString& Text)
{
    FString Result = Text;
    Result.ReplaceInline(TEXT("&"), TEXT("&amp;"));
    Result.ReplaceInline(TEXT("<"), TEXT("&lt;"));
    Result.ReplaceInline(TEXT(">"), TEXT("&gt;"));
    Result.ReplaceInline(TEXT("\""), TEXT("&quot;"));
    Result.ReplaceInline(TEXT("'"), TEXT("&#39;"));
    return Result;
}

FString UAIRPGUtilities::MemoryToJSON(const FPlayerMemory& Memory)
{
    TSharedPtr<FJsonObject> RootObject = MakeShareable(new FJsonObject);

    // Player Info
    TSharedPtr<FJsonObject> PlayerInfoObj = MakeShareable(new FJsonObject);
    PlayerInfoObj->SetStringField(TEXT("name"), Memory.PlayerInfo.Name);
    PlayerInfoObj->SetStringField(TEXT("description"), Memory.PlayerInfo.Description);
    PlayerInfoObj->SetStringField(TEXT("personality"), Memory.PlayerInfo.Personality);
    PlayerInfoObj->SetStringField(TEXT("background"), Memory.PlayerInfo.Background);
    RootObject->SetObjectField(TEXT("player_info"), PlayerInfoObj);

    // Key Facts
    TArray<TSharedPtr<FJsonValue>> KeyFactsArray;
    for (const FKeyFact& Fact : Memory.KeyFacts)
    {
        TSharedPtr<FJsonObject> FactObj = MakeShareable(new FJsonObject);
        FactObj->SetStringField(TEXT("fact"), Fact.Fact);
        FactObj->SetStringField(TEXT("scene"), Fact.Scene);
        FactObj->SetStringField(TEXT("timestamp"), Fact.Timestamp);
        KeyFactsArray.Add(MakeShareable(new FJsonValueObject(FactObj)));
    }
    RootObject->SetArrayField(TEXT("key_facts"), KeyFactsArray);

    // Relationships
    TSharedPtr<FJsonObject> RelationshipsObj = MakeShareable(new FJsonObject);
    for (const auto& Pair : Memory.Relationships)
    {
        TSharedPtr<FJsonObject> RelObj = MakeShareable(new FJsonObject);
        RelObj->SetStringField(TEXT("relationship"), Pair.Value.Relationship);
        RelObj->SetNumberField(TEXT("trust_level"), Pair.Value.TrustLevel);
        
        TArray<TSharedPtr<FJsonValue>> InteractionsArray;
        for (const FString& Interaction : Pair.Value.KeyInteractions)
        {
            InteractionsArray.Add(MakeShareable(new FJsonValueString(Interaction)));
        }
        RelObj->SetArrayField(TEXT("key_interactions"), InteractionsArray);
        
        RelationshipsObj->SetObjectField(Pair.Key, RelObj);
    }
    RootObject->SetObjectField(TEXT("relationships"), RelationshipsObj);

    // ... 其他字段类似实现

    // 序列化
    FString OutputString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&OutputString);
    FJsonSerializer::Serialize(RootObject.ToSharedRef(), Writer);

    return OutputString;
}
```

---

## 🎮 游戏子系统实现

### AIRPGSubsystem.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "DataStructures.h"
#include "AIRPGSubsystem.generated.h"

// 前向声明
class UOpenAIClient;
class UDialogueModule;
class USummaryModule;
class UStoryModule;
class UMemoryModule;

UCLASS()
class YOURPROJECT_API UAIRPGSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    // 初始化
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    // 获取游戏状态
    UFUNCTION(BlueprintCallable, Category = "AIRPG")
    FGameStateData& GetGameState() { return GameState; }

    // 保存/加载
    UFUNCTION(BlueprintCallable, Category = "AIRPG|Save")
    void SaveGame();

    UFUNCTION(BlueprintCallable, Category = "AIRPG|Save")
    void LoadGame();

    // 获取各个模块
    UFUNCTION(BlueprintCallable, Category = "AIRPG|Modules")
    UOpenAIClient* GetOpenAIClient() { return OpenAIClient; }

    UFUNCTION(BlueprintCallable, Category = "AIRPG|Modules")
    UDialogueModule* GetDialogueModule() { return DialogueModule; }

    UFUNCTION(BlueprintCallable, Category = "AIRPG|Modules")
    USummaryModule* GetSummaryModule() { return SummaryModule; }

    UFUNCTION(BlueprintCallable, Category = "AIRPG|Modules")
    UStoryModule* GetStoryModule() { return StoryModule; }

    UFUNCTION(BlueprintCallable, Category = "AIRPG|Modules")
    UMemoryModule* GetMemoryModule() { return MemoryModule; }

private:
    UPROPERTY()
    FGameStateData GameState;

    UPROPERTY()
    UOpenAIClient* OpenAIClient;

    UPROPERTY()
    UDialogueModule* DialogueModule;

    UPROPERTY()
    USummaryModule* SummaryModule;

    UPROPERTY()
    UStoryModule* StoryModule;

    UPROPERTY()
    UMemoryModule* MemoryModule;
};
```

### AIRPGSubsystem.cpp

```cpp
#include "AIRPGSubsystem.h"
#include "OpenAIClient.h"
#include "DialogueModule.h"
#include "SummaryModule.h"
#include "StoryModule.h"
#include "MemoryModule.h"
#include "AIRPGSaveGame.h"
#include "Kismet/GameplayStatics.h"

void UAIRPGSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);

    UE_LOG(LogTemp, Log, TEXT("AIRPGSubsystem Initializing..."));

    // 创建模块实例
    OpenAIClient = NewObject<UOpenAIClient>(this);
    DialogueModule = NewObject<UDialogueModule>(this);
    SummaryModule = NewObject<USummaryModule>(this);
    StoryModule = NewObject<UStoryModule>(this);
    MemoryModule = NewObject<UMemoryModule>(this);

    // 设置模块依赖
    DialogueModule->SetOpenAIClient(OpenAIClient);
    SummaryModule->SetOpenAIClient(OpenAIClient);
    StoryModule->SetOpenAIClient(OpenAIClient);
    MemoryModule->SetOpenAIClient(OpenAIClient);

    // 加载游戏数据
    LoadGame();

    UE_LOG(LogTemp, Log, TEXT("AIRPGSubsystem Initialized"));
}

void UAIRPGSubsystem::Deinitialize()
{
    UE_LOG(LogTemp, Log, TEXT("AIRPGSubsystem Deinitializing..."));

    // 自动保存
    SaveGame();

    Super::Deinitialize();
}

void UAIRPGSubsystem::SaveGame()
{
    UAIRPGSaveGame* SaveGameInstance = Cast<UAIRPGSaveGame>(
        UGameplayStatics::CreateSaveGameObject(UAIRPGSaveGame::StaticClass())
    );

    if (SaveGameInstance)
    {
        SaveGameInstance->GameState = GameState;

        bool bSuccess = UGameplayStatics::SaveGameToSlot(
            SaveGameInstance,
            UAIRPGSaveGame::SaveSlotName,
            0
        );

        if (bSuccess)
        {
            UE_LOG(LogTemp, Log, TEXT("Game saved successfully"));
        }
        else
        {
            UE_LOG(LogTemp, Error, TEXT("Failed to save game"));
        }
    }
}

void UAIRPGSubsystem::LoadGame()
{
    if (UGameplayStatics::DoesSaveGameExist(UAIRPGSaveGame::SaveSlotName, 0))
    {
        UAIRPGSaveGame* LoadedGame = Cast<UAIRPGSaveGame>(
            UGameplayStatics::LoadGameFromSlot(
                UAIRPGSaveGame::SaveSlotName,
                0
            )
        );

        if (LoadedGame)
        {
            GameState = LoadedGame->GameState;
            UE_LOG(LogTemp, Log, TEXT("Game loaded successfully"));
            return;
        }
    }

    // 没有存档，使用默认值
    UE_LOG(LogTemp, Warning, TEXT("No save game found, using default state"));
    GameState = FGameStateData();
}
```

---

## 💡 最佳实践和注意事项

### 1. 异步操作处理

```cpp
// 所有HTTP请求都应该异步处理
// 使用Lambda表达式简化回调

void UDialogueWidget::SendMessage()
{
    FString UserInput = UserInputBox->GetText().ToString();
    
    // 显示加载动画
    ShowLoadingIndicator(true);
    
    // 禁用输入
    UserInputBox->SetIsEnabled(false);
    SendButton->SetIsEnabled(false);
    
    // 异步调用
    DialogueModule->ProcessPlayerInput(
        Input,
        ModuleConfig,
        APIKey,
        ModelName,
        FOnDialogueCompleteDelegate::CreateLambda(
            [this](const FDialogueOutput& Output)
            {
                // 隐藏加载动画
                ShowLoadingIndicator(false);
                
                // 启用输入
                UserInputBox->SetIsEnabled(true);
                SendButton->SetIsEnabled(true);
                
                if (Output.bSuccess)
                {
                    // 处理成功
                    DisplayNPCResponse(Output.NPCResponse);
                }
                else
                {
                    // 处理错误
                    ShowErrorMessage(Output.ErrorMessage);
                }
            }
        )
    );
}
```

### 2. 错误处理

```cpp
// 网络错误处理示例
void HandleNetworkError(const FString& ErrorMessage)
{
    UE_LOG(LogTemp, Error, TEXT("Network Error: %s"), *ErrorMessage);
    
    // 显示用户友好的错误信息
    if (ErrorMessage.Contains(TEXT("401")))
    {
        ShowErrorDialog(TEXT("API密钥无效，请检查配置。"));
    }
    else if (ErrorMessage.Contains(TEXT("timeout")))
    {
        ShowErrorDialog(TEXT("请求超时，请检查网络连接。"));
    }
    else
    {
        ShowErrorDialog(FString::Printf(
            TEXT("API调用失败：%s"), *ErrorMessage
        ));
    }
    
    // 允许重试
    ShowRetryButton();
}
```

### 3. 性能优化

```cpp
// 限制对话历史长度
void AddToChatHistory(const FChatMessage& Message)
{
    ChatHistory.Add(Message);
    
    // 只保留最近40条（20轮对话）
    const int32 MaxHistoryCount = 40;
    if (ChatHistory.Num() > MaxHistoryCount)
    {
        int32 NumToRemove = ChatHistory.Num() - MaxHistoryCount;
        ChatHistory.RemoveAt(0, NumToRemove);
    }
}

// 记忆数据大小控制
void TrimMemoryData(FPlayerMemory& Memory)
{
    // 限制关键事实数量
    if (Memory.KeyFacts.Num() > 50)
    {
        Memory.KeyFacts.RemoveAt(0, Memory.KeyFacts.Num() - 50);
    }
    
    // 限制每个NPC的互动记录
    for (auto& Pair : Memory.Relationships)
    {
        if (Pair.Value.KeyInteractions.Num() > 10)
        {
            Pair.Value.KeyInteractions.RemoveAt(
                0, 
                Pair.Value.KeyInteractions.Num() - 10
            );
        }
    }
}
```

### 4. 线程安全

```cpp
// HTTP回调在非游戏线程
// 需要使用AsyncTask切换到游戏线程

void UOpenAIClient::OnHttpRequestComplete(...)
{
    // 解析响应（可以在HTTP线程）
    FOpenAIResponse Response = ParseResponse(HttpResponse);
    
    // 切换到游戏线程执行回调
    AsyncTask(ENamedThreads::GameThread, [this, Response, Callback]()
    {
        Callback.ExecuteIfBound(Response);
    });
}
```

---

## 🎨 UI提示和技巧

### 加载指示器

```cpp
// 创建一个可复用的LoadingWidget
void ShowLoadingIndicator(bool bShow)
{
    if (LoadingWidget)
    {
        if (bShow)
        {
            LoadingWidget->SetVisibility(ESlateVisibility::Visible);
            PlayAnimation(LoadingAnimation, 0.0f, 0, 
                EUMGSequencePlayMode::Forward, 1.0f, true);
        }
        else
        {
            LoadingWidget->SetVisibility(ESlateVisibility::Collapsed);
            StopAnimation(LoadingAnimation);
        }
    }
}
```

### 打字机效果

```cpp
// 让NPC对话逐字显示，增加沉浸感
void DisplayTextWithTypewriterEffect(const FString& Text, float CharPerSecond = 30.0f)
{
    CurrentDisplayText = TEXT("");
    TargetText = Text;
    CharDisplayIndex = 0;
    
    GetWorld()->GetTimerManager().SetTimer(
        TypewriterTimerHandle,
        this,
        &ThisClass::TypewriterTick,
        1.0f / CharPerSecond,
        true
    );
}

void TypewriterTick()
{
    if (CharDisplayIndex < TargetText.Len())
    {
        CurrentDisplayText += TargetText[CharDisplayIndex];
        TextBlock->SetText(FText::FromString(CurrentDisplayText));
        CharDisplayIndex++;
    }
    else
    {
        GetWorld()->GetTimerManager().ClearTimer(TypewriterTimerHandle);
    }
}
```

---

## 📚 调试技巧

### 日志宏定义

```cpp
// AIRPGTypes.h
DECLARE_LOG_CATEGORY_EXTERN(LogAIRPG, Log, All);

// .cpp
DEFINE_LOG_CATEGORY(LogAIRPG);

// 使用
UE_LOG(LogAIRPG, Log, TEXT("Sending message: %s"), *UserInput);
UE_LOG(LogAIRPG, Warning, TEXT("API call failed: %s"), *ErrorMsg);
UE_LOG(LogAIRPG, Error, TEXT("Critical error occurred!"));
```

### 开发者控制台命令

```cpp
// AIRPGSubsystem.h
UCLASS()
class UAIRPGSubsystem : public UGameInstanceSubsystem
{
    // ...
    
    UFUNCTION(Exec, Category = "AIRPG|Debug")
    void DebugPrintMemory();
    
    UFUNCTION(Exec, Category = "AIRPG|Debug")
    void DebugClearMemory();
    
    UFUNCTION(Exec, Category = "AIRPG|Debug")
    void DebugSetAPIKey(const FString& NewKey);
};

// 使用方法：
// 在游戏中按 ~ 打开控制台，输入：
// DebugPrintMemory
// DebugClearMemory
// DebugSetAPIKey sk-xxxxx
```

---

## 🎉 总结

本补充文档提供了：

1. ✅ 完整的数据结构定义代码
2. ✅ 工具函数库实现
3. ✅ 游戏子系统架构
4. ✅ 最佳实践和性能优化
5. ✅ UI实现技巧
6. ✅ 调试工具

配合主文档，你现在拥有了在Unreal Engine中实现AI RPG系统的所有必要信息！

**祝开发顺利！** 🚀✨


