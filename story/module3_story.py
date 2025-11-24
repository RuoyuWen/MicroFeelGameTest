"""
模块3：故事生成页面
"""
import streamlit as st
from ai_modules import StoryModule
from state_manager import (
    get_npcs, get_locations, save_story, get_api_key, update_prompt, get_prompt
)
from models import Story
from config import DEFAULT_PROMPTS
from utils import format_npc_display, format_location_display, validate_story_selection


def render():
    """渲染故事生成页面"""
    st.title("📖 模块3：生成故事")
    st.markdown("---")
    
    api_key = get_api_key()
    if not api_key:
        st.error("请先在首页设置API密钥")
        return
    
    npcs = get_npcs()
    locations = get_locations()
    
    if len(npcs) < 3:
        st.error("至少需要3个NPC才能生成故事")
        return
    
    if len(locations) < 1:
        st.error("至少需要1个地点才能生成故事")
        return
    
    # 初始化AI模块
    story_module = StoryModule(api_key=api_key)
    
    # Prompt设置
    with st.expander("⚙️ 调整Prompt模板", expanded=False):
        st.markdown("### 故事生成Prompt设置")
        
        prompt_story = st.text_area(
            "生成故事的Prompt",
            value=get_prompt("story_generate") or DEFAULT_PROMPTS["story_generate"],
            height=200,
            key="story_prompt"
        )
        if st.button("保存Prompt"):
            update_prompt("story_generate", prompt_story)
            story_module.update_prompt("story_generate", prompt_story)
            st.success("Prompt已保存")
    
    st.markdown("---")
    
    # 选择NPC和地点
    st.subheader("选择NPC和地点")
    
    npc_options = [f"{i}: {format_npc_display(npc)}" for i, npc in enumerate(npcs)]
    selected_npcs = st.multiselect(
        "选择NPC（至少3个）*",
        options=npc_options,
        default=npc_options[:min(3, len(npc_options))],
        key="selected_npcs"
    )
    
    location_options = [f"{i}: {format_location_display(loc)}" for i, loc in enumerate(locations)]
    selected_locations = st.multiselect(
        "选择地点（至少1个）*",
        options=location_options,
        default=location_options[:1] if location_options else [],
        key="selected_locations"
    )
    
    # 提取选中的ID
    selected_npc_ids = [int(opt.split(":")[0]) for opt in selected_npcs]
    selected_location_ids = [int(opt.split(":")[0]) for opt in selected_locations]
    
    # 验证选择
    is_valid, error_msg = validate_story_selection(selected_npc_ids, selected_location_ids)
    if not is_valid:
        st.error(error_msg)
    
    st.markdown("---")
    
    # 故事输入
    use_ai_generate = st.checkbox("使用AI生成所有内容", value=False)
    
    if use_ai_generate:
        st.subheader("AI生成故事")
        style = st.text_input("故事风格", value="奇幻冒险", key="story_style_ai")
        
        if st.button("生成故事", type="primary"):
            if is_valid:
                with st.spinner("AI正在生成故事..."):
                    try:
                        selected_npc_objs = [npcs[i] for i in selected_npc_ids]
                        selected_location_objs = [locations[i] for i in selected_location_ids]
                        
                        story_content = story_module.generate_story(
                            npcs=[{"name": n.name, "gender": n.gender, "profession": n.profession, "background": n.background} 
                                  for n in selected_npc_objs],
                            locations=[{"name": l.name, "descriptions": l.descriptions} 
                                      for l in selected_location_objs],
                            style=style
                        )
                        
                        st.session_state.generated_story = story_content
                        st.session_state.story_style = style
                        st.success("故事生成成功！")
                    except Exception as e:
                        st.error(f"生成失败: {str(e)}")
            else:
                st.error("请先完成NPC和地点的选择")
    else:
        st.subheader("输入故事内容")
        story_content = st.text_area(
            "故事内容",
            height=300,
            key="story_content",
            placeholder="在这里输入你的故事..."
        )
        
        style = st.text_input("故事风格", value="奇幻冒险", key="story_style")
    
    # 显示生成的故事
    if "generated_story" in st.session_state:
        st.markdown("### 生成的故事")
        story_content = st.text_area(
            "故事内容 *",
            value=st.session_state.generated_story,
            height=400,
            key="story_content_final"
        )
        style = st.text_input("故事风格 *", value=st.session_state.story_style, key="story_style_final")
    
    # 保存故事
    if st.button("保存故事", type="primary"):
        if is_valid:
            if "story_content_final" in st.session_state:
                content = st.session_state.story_content_final
                style_val = st.session_state.story_style_final
            else:
                content = st.session_state.get("story_content", "")
                style_val = st.session_state.get("story_style", "奇幻冒险")
            
            if content:
                story = Story(
                    content=content,
                    style=style_val,
                    npc_ids=selected_npc_ids,
                    location_ids=selected_location_ids
                )
                save_story(story)
                if "generated_story" in st.session_state:
                    del st.session_state.generated_story
                st.success("故事已保存！")
                st.rerun()
            else:
                st.error("请输入故事内容")
        else:
            st.error("请先完成NPC和地点的选择")
    
    # 下一步按钮
    st.markdown("---")
    from state_manager import get_story
    story = get_story()
    if story:
        if st.button("下一步：生成章节", type="primary", use_container_width=True):
            st.session_state.current_module = 4
            st.rerun()
    else:
        st.info("⚠️ 请先保存故事才能进入下一步")

