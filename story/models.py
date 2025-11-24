"""
数据模型
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class NPC(BaseModel):
    """NPC模型"""
    name: str = Field(..., description="NPC姓名")
    gender: str = Field(..., description="性别")
    profession: str = Field(..., description="职业")
    background: str = Field(..., description="背景故事")


class Location(BaseModel):
    """地点模型"""
    name: str = Field(..., description="地点名称")
    descriptions: List[str] = Field(default_factory=list, description="地点描述列表")


class Story(BaseModel):
    """故事模型"""
    content: str = Field(..., description="故事内容")
    style: str = Field(..., description="故事风格")
    npc_ids: List[int] = Field(..., description="使用的NPC ID列表")
    location_ids: List[int] = Field(..., description="使用的地点ID列表")


class Chapter(BaseModel):
    """章节模型"""
    title: str = Field(..., description="章节标题")
    content: str = Field(..., description="章节内容")
    order: int = Field(..., description="章节顺序")


class StoryData(BaseModel):
    """完整故事数据"""
    npcs: List[NPC] = Field(default_factory=list)
    locations: List[Location] = Field(default_factory=list)
    story: Optional[Story] = None
    chapters: List[Chapter] = Field(default_factory=list)

