"""
主应用入口
"""
import streamlit as st
from state_manager import (
    init_session_state, set_api_key, get_api_key, get_current_module, set_current_module
)
import module1_npc
import module2_location
import module3_story
import module4_chapters


def render_home():
    """渲染首页（API Key设置）"""
    st.title("🎮 AI故事生成工作流系统")
    st.markdown("---")
    
    st.markdown("""
    ### 欢迎使用AI故事生成工作流系统！
    
    本系统将帮助你：
    1. **设计NPC角色** - 创建游戏中的角色
    2. **设计地点** - 创建游戏场景
    3. **生成故事** - 基于角色和地点生成故事
    4. **生成章节** - 将故事分成章节并优化
    
    ---
    """)
    
    # API Key设置
    st.subheader("🔑 API密钥设置")
    
    current_key = get_api_key()
    if current_key:
        st.success("✅ API密钥已设置")
        if st.button("重新设置API密钥"):
            set_api_key("")
            st.rerun()
    else:
        api_key = st.text_input(
            "请输入OpenAI API Key",
            type="password",
            help="你的API密钥将被保存在session中，不会上传到服务器"
        )
        
        if st.button("保存API密钥", type="primary"):
            if api_key:
                set_api_key(api_key)
                st.success("API密钥已保存！")
                st.rerun()
            else:
                st.error("请输入有效的API密钥")
    
    # 导航
    st.markdown("---")
    if current_key:
        st.subheader("🚀 开始工作流")
        if st.button("开始设计NPC", type="primary", use_container_width=True):
            set_current_module(1)
            st.rerun()


def render_module_selector():
    """渲染模块选择器"""
    current_module = get_current_module()
    
    # 侧边栏导航
    with st.sidebar:
        st.title("📋 导航")
        st.markdown("---")
        
        modules = [
            ("首页", 0),
            ("模块1: NPC设计", 1),
            ("模块2: 地点设计", 2),
            ("模块3: 生成故事", 3),
            ("模块4: 生成章节", 4),
        ]
        
        for name, module_num in modules:
            if module_num == current_module:
                st.button(f"✓ {name}", disabled=True, use_container_width=True)
            else:
                if st.button(name, use_container_width=True):
                    set_current_module(module_num)
                    st.rerun()
        
        st.markdown("---")
        if st.button("🔄 重置所有数据", use_container_width=True):
            for key in list(st.session_state.keys()):
                if key != "api_key":
                    del st.session_state[key]
            set_current_module(0)
            st.rerun()


def main():
    """主函数"""
    # 页面配置
    st.set_page_config(
        page_title="AI故事生成工作流",
        page_icon="📖",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    # 初始化session state
    init_session_state()
    
    # 渲染模块选择器
    render_module_selector()
    
    # 根据当前模块渲染对应页面
    current_module = get_current_module()
    
    if current_module == 0:
        render_home()
    elif current_module == 1:
        module1_npc.render()
    elif current_module == 2:
        module2_location.render()
    elif current_module == 3:
        module3_story.render()
    elif current_module == 4:
        module4_chapters.render()
    else:
        st.error("未知模块")
        set_current_module(0)
        st.rerun()


if __name__ == "__main__":
    main()

