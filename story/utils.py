"""
工具函数
"""
from typing import List, Dict, Any, Tuple, Union
from models import NPC, Location


def format_npc_display(npc: Union[Dict[str, Any], NPC]) -> str:
    """格式化NPC显示"""
    if isinstance(npc, dict):
        return f"{npc['name']} ({npc['gender']}, {npc['profession']})"
    else:
        # Pydantic模型对象
        return f"{npc.name} ({npc.gender}, {npc.profession})"


def format_location_display(location: Union[Dict[str, Any], Location]) -> str:
    """格式化地点显示"""
    if isinstance(location, dict):
        return location['name']
    else:
        # Pydantic模型对象
        return location.name


def validate_npcs(npcs: List[Dict[str, Any]], min_count: int = 3) -> Tuple[bool, str]:
    """验证NPC数量"""
    if len(npcs) < min_count:
        return False, f"至少需要{min_count}个NPC"
    return True, ""


def validate_locations(locations: List[Dict[str, Any]], min_count: int = 1) -> Tuple[bool, str]:
    """验证地点数量"""
    if len(locations) < min_count:
        return False, f"至少需要{min_count}个地点"
    return True, ""


def validate_story_selection(npcs: List[int], locations: List[int], min_npcs: int = 3, min_locations: int = 1) -> Tuple[bool, str]:
    """验证故事选择"""
    if len(npcs) < min_npcs:
        return False, f"至少需要选择{min_npcs}个NPC"
    if len(locations) < min_locations:
        return False, f"至少需要选择{min_locations}个地点"
    return True, ""

