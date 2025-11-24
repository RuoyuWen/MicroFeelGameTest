"""
状态管理器
"""
import streamlit as st
from models import NPC, Location, Story, Chapter, StoryData


def init_session_state():
    """初始化session state"""
    if "story_data" not in st.session_state:
        st.session_state.story_data = StoryData()
    
    if "current_module" not in st.session_state:
        st.session_state.current_module = 0
    
    if "api_key" not in st.session_state:
        st.session_state.api_key = None
    
    if "prompts" not in st.session_state:
        st.session_state.prompts = {}


def get_story_data() -> StoryData:
    """获取故事数据"""
    return st.session_state.story_data


def save_npc(npc: NPC):
    """保存NPC"""
    st.session_state.story_data.npcs.append(npc)


def get_npcs() -> list:
    """获取所有NPC"""
    return st.session_state.story_data.npcs


def save_location(location: Location):
    """保存地点"""
    st.session_state.story_data.locations.append(location)


def get_locations() -> list:
    """获取所有地点"""
    return st.session_state.story_data.locations


def save_story(story: Story):
    """保存故事"""
    st.session_state.story_data.story = story


def get_story() -> Story:
    """获取故事"""
    return st.session_state.story_data.story


def save_chapters(chapters: list):
    """保存章节"""
    st.session_state.story_data.chapters = [
        Chapter(**ch) if isinstance(ch, dict) else ch
        for ch in chapters
    ]


def get_chapters() -> list:
    """获取所有章节"""
    return st.session_state.story_data.chapters


def set_api_key(api_key: str):
    """设置API密钥"""
    st.session_state.api_key = api_key


def get_api_key() -> str:
    """获取API密钥"""
    return st.session_state.api_key


def set_current_module(module_num: int):
    """设置当前模块"""
    st.session_state.current_module = module_num


def get_current_module() -> int:
    """获取当前模块"""
    return st.session_state.current_module


def update_prompt(prompt_key: str, prompt_value: str):
    """更新Prompt"""
    st.session_state.prompts[prompt_key] = prompt_value


def get_prompt(prompt_key: str) -> str:
    """获取Prompt"""
    return st.session_state.prompts.get(prompt_key, "")

