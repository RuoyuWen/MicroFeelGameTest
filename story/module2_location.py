"""
模块2：地点设计页面
"""
import streamlit as st
from ai_modules import LocationModule
from state_manager import (
    get_locations, save_location, get_api_key, update_prompt, get_prompt
)
from models import Location
from config import DEFAULT_PROMPTS
from sample_data import SAMPLE_LOCATIONS


def render():
    """渲染地点设计页面"""
    st.title("📍 模块2：地点设计")
    st.markdown("---")
    
    api_key = get_api_key()
    if not api_key:
        st.error("请先在首页设置API密钥")
        return
    
    # 初始化AI模块
    location_module = LocationModule(api_key=api_key)
    
    # Prompt设置
    with st.expander("⚙️ 调整Prompt模板", expanded=False):
        st.markdown("### 地点生成Prompt设置")
        
        prompt_location = st.text_area(
            "生成地点描述的Prompt",
            value=get_prompt("location_generate") or DEFAULT_PROMPTS["location_generate"],
            height=150,
            key="location_prompt"
        )
        if st.button("保存Prompt"):
            update_prompt("location_generate", prompt_location)
            location_module.update_prompt("location_generate", prompt_location)
            st.success("Prompt已保存")
    
    st.markdown("---")
    
    # 快速填充示例数据
    col1, col2 = st.columns(2)
    with col1:
        if st.button("📦 快速填充示例地点（1个）", use_container_width=True):
            existing_locations = get_locations()
            if len(existing_locations) == 0:
                save_location(SAMPLE_LOCATIONS[0])
                st.success("已添加1个示例地点！")
                st.rerun()
            else:
                st.warning("已有地点数据，请先清空或手动添加")
    with col2:
        if st.button("📦 快速填充所有示例地点（5个）", use_container_width=True):
            existing_locations = get_locations()
            if len(existing_locations) == 0:
                for loc in SAMPLE_LOCATIONS:
                    save_location(loc)
                st.success("已添加5个示例地点！")
                st.rerun()
            else:
                st.warning("已有地点数据，请先清空或手动添加")
    
    st.markdown("---")
    
    # 显示已有地点
    locations = get_locations()
    if locations:
        st.subheader("已创建的地点")
        for i, loc in enumerate(locations):
            with st.expander(f"地点 {i+1}: {loc.name}", expanded=False):
                for j, desc in enumerate(loc.descriptions):
                    st.write(f"**描述 {j+1}**: {desc}")
    
    st.markdown("---")
    
    # 创建新地点
    st.subheader("创建新地点")
    
    use_ai = st.checkbox("使用AI生成地点描述", value=False)
    
    name = st.text_input("地点名称 *", key="location_name")
    
    if use_ai:
        if st.button("生成描述", type="primary"):
            if name:
                with st.spinner("AI正在生成地点描述..."):
                    try:
                        desc = location_module.generate_location(name)
                        st.session_state.generated_location_desc = desc
                        st.success("描述生成成功！")
                    except Exception as e:
                        st.error(f"生成失败: {str(e)}")
            else:
                st.error("请先输入地点名称")
        
        if "generated_location_desc" in st.session_state:
            descriptions_text = st.text_area(
                "地点描述 *（可以添加多个描述，每行一个）",
                value=st.session_state.generated_location_desc,
                height=150,
                key="location_descriptions"
            )
        else:
            descriptions_text = st.text_area(
                "地点描述 *（可以添加多个描述，每行一个）",
                height=150,
                key="location_descriptions"
            )
    else:
        descriptions_text = st.text_area(
            "地点描述 *（可以添加多个描述，每行一个）",
            height=150,
            key="location_descriptions"
        )
    
    if st.button("保存地点", type="primary"):
        if name and descriptions_text:
            descriptions = [d.strip() for d in descriptions_text.split("\n") if d.strip()]
            if descriptions:
                location = Location(
                    name=name,
                    descriptions=descriptions
                )
                save_location(location)
                if "generated_location_desc" in st.session_state:
                    del st.session_state.generated_location_desc
                st.success("地点已保存！")
                st.rerun()
            else:
                st.error("请至少输入一个描述")
        else:
            st.error("请填写所有必填字段（标有*）")
    
    # 下一步按钮
    st.markdown("---")
    locations = get_locations()
    if len(locations) >= 1:
        if st.button("下一步：生成故事", type="primary", use_container_width=True):
            st.session_state.current_module = 3
            st.rerun()
    else:
        st.info(f"⚠️ 至少需要创建1个地点才能进入下一步（当前：{len(locations)}个）")

