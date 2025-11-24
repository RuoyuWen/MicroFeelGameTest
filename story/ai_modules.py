"""
AI模块核心类
"""
import json
import re
from typing import Dict, Optional, Any, List
from openai import OpenAI
from config import OPENAI_API_KEY, OPENAI_MODEL, DEFAULT_PROMPTS


class AIModule:
    """AI模块基类"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = OPENAI_MODEL):
        """
        初始化AI模块
        
        Args:
            api_key: OpenAI API密钥
            model: 使用的模型名称
        """
        self.api_key = api_key or OPENAI_API_KEY
        self.model = model
        self.client = None
        if self.api_key:
            self.client = OpenAI(api_key=self.api_key)
        self.prompts = DEFAULT_PROMPTS.copy()
    
    def set_api_key(self, api_key: str):
        """设置API密钥"""
        self.api_key = api_key
        self.client = OpenAI(api_key=api_key)
    
    def update_prompt(self, prompt_key: str, prompt_template: str):
        """
        更新Prompt模板
        
        Args:
            prompt_key: Prompt的键名
            prompt_template: Prompt模板
        """
        self.prompts[prompt_key] = prompt_template
    
    def get_prompt(self, prompt_key: str) -> str:
        """获取Prompt模板"""
        return self.prompts.get(prompt_key, "")
    
    def _call_openai(self, prompt: str, temperature: float = 0.7) -> str:
        """
        调用OpenAI API
        
        Args:
            prompt: 提示词
            temperature: 温度参数
            
        Returns:
            API返回的文本
        """
        if not self.client:
            raise ValueError("API密钥未设置，请先设置API密钥")
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个专业的游戏故事创作助手。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"调用OpenAI API失败: {str(e)}")
    
    def _parse_json_response(self, response: str) -> Dict[str, Any]:
        """
        解析JSON响应
        
        Args:
            response: API返回的文本
            
        Returns:
            解析后的字典
        """
        # 尝试提取JSON部分
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        
        # 如果无法解析JSON，返回原始文本
        return {"content": response}


class NPCModule(AIModule):
    """NPC生成模块"""
    
    def generate_npc_all(self, gender: str = "不限", profession: str = "不限") -> Dict[str, Any]:
        """
        生成完整的NPC信息
        
        Args:
            gender: 性别
            profession: 职业
            
        Returns:
            NPC信息字典
        """
        prompt = self.prompts["npc_generate_all"].format(
            gender=gender,
            profession=profession
        )
        response = self._call_openai(prompt)
        result = self._parse_json_response(response)
        
        # 确保返回标准格式
        return {
            "name": result.get("name", ""),
            "gender": result.get("gender", gender),
            "profession": result.get("profession", profession),
            "background": result.get("background", response)
        }
    
    def generate_background(self, name: str, gender: str, profession: str) -> str:
        """
        生成NPC背景故事
        
        Args:
            name: NPC姓名
            gender: 性别
            profession: 职业
            
        Returns:
            背景故事文本
        """
        prompt = self.prompts["npc_generate_background"].format(
            name=name,
            gender=gender,
            profession=profession
        )
        return self._call_openai(prompt)


class LocationModule(AIModule):
    """地点生成模块"""
    
    def generate_location(self, name: str) -> str:
        """
        生成地点描述
        
        Args:
            name: 地点名称
            
        Returns:
            地点描述文本
        """
        prompt = self.prompts["location_generate"].format(name=name)
        return self._call_openai(prompt)


class StoryModule(AIModule):
    """故事生成模块"""
    
    def generate_story(self, npcs: list, locations: list, style: str = "奇幻冒险") -> str:
        """
        生成故事
        
        Args:
            npcs: NPC列表（可以是字典或Pydantic对象）
            locations: 地点列表（可以是字典或Pydantic对象）
            style: 故事风格
            
        Returns:
            故事文本
        """
        # 格式化NPC信息
        npc_list = []
        for npc in npcs:
            if isinstance(npc, dict):
                name = npc.get('name', '')
                gender = npc.get('gender', '')
                profession = npc.get('profession', '')
                background = npc.get('background', '')
            else:
                # Pydantic对象
                name = npc.name
                gender = npc.gender
                profession = npc.profession
                background = npc.background
            
            npc_list.append(f"- {name}（{gender}，{profession}）\n  背景：{background}")
        
        npc_text = "\n".join(npc_list)
        
        # 格式化地点信息
        location_list = []
        for loc in locations:
            if isinstance(loc, dict):
                name = loc.get('name', '')
                descriptions = loc.get('descriptions', [])
            else:
                # Pydantic对象
                name = loc.name
                descriptions = loc.descriptions
            
            desc_text = "\n  ".join(descriptions) if descriptions else "（无详细描述）"
            location_list.append(f"- {name}：\n  {desc_text}")
        
        location_text = "\n".join(location_list)
        
        prompt = self.prompts["story_generate"].format(
            npcs=npc_text,
            locations=location_text,
            style=style
        )
        return self._call_openai(prompt, temperature=0.8)


class ChapterModule(AIModule):
    """章节生成模块"""
    
    def generate_chapters(self, story: str, selected_npcs: list = None, selected_locations: list = None) -> List[Dict[str, str]]:
        """
        生成三个章节
        
        Args:
            story: 完整故事文本
            selected_npcs: 选择的NPC列表（可选）
            selected_locations: 选择的地点列表（可选）
            
        Returns:
            章节列表，每个元素包含title和content
        """
        # 格式化NPC信息
        npc_text = ""
        if selected_npcs:
            npc_list = []
            for npc in selected_npcs:
                if isinstance(npc, dict):
                    name = npc.get('name', '')
                    gender = npc.get('gender', '')
                    profession = npc.get('profession', '')
                    background = npc.get('background', '')
                else:
                    # Pydantic对象
                    name = npc.name
                    gender = npc.gender
                    profession = npc.profession
                    background = npc.background
                
                npc_list.append(f"- {name}（{gender}，{profession}）：{background}")
            npc_text = "\n".join(npc_list)
        
        # 格式化地点信息
        location_text = ""
        if selected_locations:
            location_list = []
            for loc in selected_locations:
                if isinstance(loc, dict):
                    name = loc.get('name', '')
                    descriptions = loc.get('descriptions', [])
                else:
                    # Pydantic对象
                    name = loc.name
                    descriptions = loc.descriptions
                
                desc_text = ", ".join(descriptions) if descriptions else "（无详细描述）"
                location_list.append(f"- {name}：{desc_text}")
            location_text = "\n".join(location_list)
        
        # 构建prompt
        prompt = self.prompts["chapters_generate"].format(
            story=story,
            npcs=npc_text if npc_text else "（无指定NPC）",
            locations=location_text if location_text else "（无指定地点）"
        )
        response = self._call_openai(prompt, temperature=0.7)
        result = self._parse_json_response(response)
        
        chapters = result.get("chapters", [])
        if not chapters or len(chapters) < 3:
            # 如果无法解析，手动分割故事
            return self._split_story_manually(story)
        
        # 清理和验证章节数据
        cleaned_chapters = []
        for i, ch in enumerate(chapters[:3]):
            if isinstance(ch, dict):
                # 处理content可能是字典的情况
                content = ch.get("content", "")
                if isinstance(content, dict):
                    # 如果content是字典，尝试提取文本
                    content = content.get("text", content.get("beginning", content.get("middle", content.get("end", str(content)))))
                elif not isinstance(content, str):
                    # 如果content不是字符串，转换为字符串
                    content = str(content)
                
                # 确保title存在，使用描述性标题而不是编号
                title = ch.get("title", ch.get("name", ""))
                if not isinstance(title, str) or not title.strip():
                    # 如果没有标题，使用默认的描述性标题
                    default_titles = ["开端", "发展", "结局"]
                    title = default_titles[i] if i < len(default_titles) else f"章节 {i+1}"
                title = str(title).strip()
                
                cleaned_chapters.append({
                    "title": title,
                    "content": content
                })
            else:
                # 如果不是字典，使用默认格式
                cleaned_chapters.append({
                    "title": f"第{i+1}章",
                    "content": str(ch)
                })
        
        # 如果清理后的章节不足3个，使用手动分割
        if len(cleaned_chapters) < 3:
            return self._split_story_manually(story)
        
        return cleaned_chapters
    
    def _split_story_manually(self, story: str) -> List[Dict[str, str]]:
        """手动分割故事为三章"""
        words = story.split()
        chunk_size = len(words) // 3
        
        default_titles = ["开端", "发展", "结局"]
        chapters = []
        for i in range(3):
            start = i * chunk_size
            end = (i + 1) * chunk_size if i < 2 else len(words)
            content = " ".join(words[start:end])
            chapters.append({
                "title": default_titles[i] if i < len(default_titles) else f"章节 {i+1}",
                "content": content
            })
        
        return chapters
    
    def refine_chapter(self, previous_chapter: str, current_chapter: str, next_chapter: str, 
                      chapter_index: int = 0, total_chapters: int = 1,
                      previous_title: str = "", current_title: str = "", next_title: str = "") -> str:
        """
        优化章节内容
        
        Args:
            previous_chapter: 前一章内容
            current_chapter: 当前章节内容
            next_chapter: 后一章内容
            chapter_index: 当前章节索引（从1开始）
            total_chapters: 总章节数
            previous_title: 前一章标题
            current_title: 当前章节标题
            next_title: 后一章标题
            
        Returns:
            优化后的章节内容
        """
        prompt = self.prompts["chapter_refine"].format(
            previous_chapter=previous_chapter or "（无前一章）",
            current_chapter=current_chapter,
            next_chapter=next_chapter or "（无后一章）",
            chapter_index=chapter_index,
            total_chapters=total_chapters,
            previous_title=previous_title or "（无前一章）",
            current_title=current_title or "当前章节",
            next_title=next_title or "（无后一章）"
        )
        return self._call_openai(prompt, temperature=0.7)
    
    def refine_inserted_chapter(self, previous_chapter: str, current_chapter: str, next_chapter: str,
                                chapter_index: int = 0, total_chapters: int = 1,
                                previous_title: str = "", current_title: str = "", next_title: str = "") -> str:
        """
        完善插入的章节
        
        Args:
            previous_chapter: 前一章内容
            current_chapter: 当前章节部分内容
            next_chapter: 后一章内容
            chapter_index: 当前章节索引（从1开始）
            total_chapters: 总章节数
            previous_title: 前一章标题
            current_title: 当前章节标题
            next_title: 后一章标题
            
        Returns:
            完善后的章节内容
        """
        prompt = self.prompts["insert_chapter_refine"].format(
            previous_chapter=previous_chapter or "（无前一章）",
            current_chapter=current_chapter,
            next_chapter=next_chapter or "（无后一章）",
            chapter_index=chapter_index,
            total_chapters=total_chapters,
            previous_title=previous_title or "（无前一章）",
            current_title=current_title or "新章节",
            next_title=next_title or "（无后一章）"
        )
        return self._call_openai(prompt, temperature=0.7)
    
    def refine_all_chapters(self, chapters: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """
        优化所有章节，使联系更紧密
        
        Args:
            chapters: 章节列表
            
        Returns:
            优化后的章节列表
        """
        refined_chapters = []
        total_chapters = len(chapters)
        
        for i, chapter in enumerate(chapters):
            prev = chapters[i-1]["content"] if i > 0 else ""
            curr = chapter["content"]
            next_ch = chapters[i+1]["content"] if i < len(chapters) - 1 else ""
            
            prev_title = chapters[i-1].get("title", "") if i > 0 else ""
            curr_title = chapter.get("title", "")
            next_title = chapters[i+1].get("title", "") if i < len(chapters) - 1 else ""
            
            refined_content = self.refine_chapter(
                prev, curr, next_ch,
                chapter_index=i+1,
                total_chapters=total_chapters,
                previous_title=prev_title,
                current_title=curr_title,
                next_title=next_title
            )
            refined_chapters.append({
                "title": chapter["title"],
                "content": refined_content,
                "order": chapter.get("order", i)
            })
        
        return refined_chapters

