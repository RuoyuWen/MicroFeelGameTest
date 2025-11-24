"""
模块1：NPC设计页面
"""
import streamlit as st
from ai_modules import NPCModule
from state_manager import (
    get_npcs, save_npc, get_api_key, update_prompt, get_prompt
)
from models import NPC
from config import DEFAULT_PROMPTS


def render():
    """渲染NPC设计页面"""
    st.title("📝 模块1：NPC设计")
    st.markdown("---")
    
    api_key = get_api_key()
    if not api_key:
        st.error("请先在首页设置API密钥")
        return
    
    # 初始化AI模块
    npc_module = NPCModule(api_key=api_key)
    
    # Prompt设置
    with st.expander("⚙️ 调整Prompt模板", expanded=False):
        st.markdown("### NPC生成Prompt设置")
        
        prompt_all = st.text_area(
            "生成完整NPC的Prompt",
            value=get_prompt("npc_generate_all") or DEFAULT_PROMPTS["npc_generate_all"],
            height=150,
            key="npc_prompt_all"
        )
        if st.button("保存Prompt（完整NPC）"):
            update_prompt("npc_generate_all", prompt_all)
            npc_module.update_prompt("npc_generate_all", prompt_all)
            st.success("Prompt已保存")
        
        prompt_bg = st.text_area(
            "生成背景故事的Prompt",
            value=get_prompt("npc_generate_background") or DEFAULT_PROMPTS["npc_generate_background"],
            height=150,
            key="npc_prompt_bg"
        )
        if st.button("保存Prompt（背景故事）"):
            update_prompt("npc_generate_background", prompt_bg)
            npc_module.update_prompt("npc_generate_background", prompt_bg)
            st.success("Prompt已保存")
    
    st.markdown("---")
    
    # 显示已有NPC
    npcs = get_npcs()
    if npcs:
        st.subheader("已创建的NPC")
        for i, npc in enumerate(npcs):
            with st.expander(f"NPC {i+1}: {npc.name}", expanded=False):
                st.write(f"**性别**: {npc.gender}")
                st.write(f"**职业**: {npc.profession}")
                st.write(f"**背景故事**: {npc.background}")
    
    st.markdown("---")
    
    # 创建新NPC
    st.subheader("创建新NPC")
    
    col1, col2 = st.columns(2)
    
    with col1:
        use_ai_all = st.checkbox("使用AI生成完整NPC", value=False)
    
    with col2:
        use_ai_bg = st.checkbox("仅使用AI生成背景故事", value=False)
    
    if use_ai_all:
        # AI生成完整NPC
        st.markdown("### AI生成完整NPC")
        col1, col2 = st.columns(2)
        
        with col1:
            gender = st.selectbox("性别", ["不限", "男", "女", "其他"], key="ai_npc_gender")
        
        with col2:
            profession = st.selectbox("职业", [
                "不限", "战士", "法师", "盗贼", "牧师", "游侠", 
                "商人", "学者", "工匠", "农民", "贵族", "其他"
            ], key="ai_npc_profession")
        
        if st.button("生成NPC", type="primary"):
            with st.spinner("AI正在生成NPC..."):
                try:
                    result = npc_module.generate_npc_all(gender, profession)
                    st.session_state.generated_npc = result
                    st.success("NPC生成成功！")
                except Exception as e:
                    st.error(f"生成失败: {str(e)}")
        
        if "generated_npc" in st.session_state:
            npc_data = st.session_state.generated_npc
            st.markdown("### 生成的NPC")
            name = st.text_input("姓名", value=npc_data.get("name", ""), key="ai_npc_name")
            gender = st.text_input("性别", value=npc_data.get("gender", ""), key="ai_npc_gender_final")
            profession = st.text_input("职业", value=npc_data.get("profession", ""), key="ai_npc_profession_final")
            background = st.text_area("背景故事", value=npc_data.get("background", ""), height=150, key="ai_npc_bg")
            
            if st.button("保存NPC", type="primary"):
                if name and gender and profession and background:
                    npc = NPC(
                        name=name,
                        gender=gender,
                        profession=profession,
                        background=background
                    )
                    save_npc(npc)
                    del st.session_state.generated_npc
                    st.success("NPC已保存！")
                    st.rerun()
                else:
                    st.error("请填写所有字段")
    
    else:
        # 手动输入
        st.markdown("### 手动创建NPC")
        name = st.text_input("姓名 *", key="npc_name")
        
        col1, col2 = st.columns(2)
        with col1:
            gender = st.selectbox("性别 *", ["男", "女", "其他"], key="npc_gender")
        with col2:
            profession = st.text_input("职业 *", key="npc_profession")
        
        if use_ai_bg:
            # 使用AI生成背景故事
            if st.button("生成背景故事", type="primary"):
                if name and gender and profession:
                    with st.spinner("AI正在生成背景故事..."):
                        try:
                            bg = npc_module.generate_background(name, gender, profession)
                            st.session_state.generated_bg = bg
                        except Exception as e:
                            st.error(f"生成失败: {str(e)}")
            
            if "generated_bg" in st.session_state:
                background = st.text_area(
                    "背景故事 *",
                    value=st.session_state.generated_bg,
                    height=150,
                    key="npc_bg"
                )
            else:
                background = st.text_area("背景故事 *", height=150, key="npc_bg")
        else:
            background = st.text_area("背景故事 *", height=150, key="npc_bg")
        
        if st.button("保存NPC", type="primary"):
            if name and gender and profession and background:
                npc = NPC(
                    name=name,
                    gender=gender,
                    profession=profession,
                    background=background
                )
                save_npc(npc)
                if "generated_bg" in st.session_state:
                    del st.session_state.generated_bg
                st.success("NPC已保存！")
                st.rerun()
            else:
                st.error("请填写所有必填字段（标有*）")
    
    # 下一步按钮
    st.markdown("---")
    npcs = get_npcs()
    if len(npcs) >= 3:
        if st.button("下一步：地点设计", type="primary", use_container_width=True):
            st.session_state.current_module = 2
            st.rerun()
    else:
        st.info(f"⚠️ 至少需要创建3个NPC才能进入下一步（当前：{len(npcs)}个）")

