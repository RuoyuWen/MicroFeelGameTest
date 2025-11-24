"""
模块4：章节生成和refine页面
"""
import streamlit as st
from ai_modules import ChapterModule
from state_manager import (
    get_story, get_chapters, save_chapters, get_api_key, update_prompt, get_prompt,
    get_npcs, get_locations
)
from models import Chapter
from config import DEFAULT_PROMPTS


def render():
    """渲染章节生成页面"""
    st.title("📚 模块4：生成章节")
    st.markdown("---")
    
    api_key = get_api_key()
    if not api_key:
        st.error("请先在首页设置API密钥")
        return
    
    story = get_story()
    if not story:
        st.error("请先完成故事生成")
        return
    
    # 获取选择的NPC和地点
    all_npcs = get_npcs()
    all_locations = get_locations()
    
    # 根据story中的ID获取选中的NPC和地点
    selected_npcs = [all_npcs[i] for i in story.npc_ids if i < len(all_npcs)]
    selected_locations = [all_locations[i] for i in story.location_ids if i < len(all_locations)]
    
    # 初始化AI模块
    chapter_module = ChapterModule(api_key=api_key)
    
    # Prompt设置
    with st.expander("⚙️ 调整Prompt模板", expanded=False):
        st.markdown("### 章节生成Prompt设置")
        
        prompt_chapters = st.text_area(
            "生成章节的Prompt",
            value=get_prompt("chapters_generate") or DEFAULT_PROMPTS["chapters_generate"],
            height=150,
            key="chapters_prompt"
        )
        if st.button("保存Prompt（生成章节）"):
            update_prompt("chapters_generate", prompt_chapters)
            chapter_module.update_prompt("chapters_generate", prompt_chapters)
            st.success("Prompt已保存")
        
        prompt_refine = st.text_area(
            "优化章节的Prompt",
            value=get_prompt("chapter_refine") or DEFAULT_PROMPTS["chapter_refine"],
            height=150,
            key="refine_prompt"
        )
        if st.button("保存Prompt（优化章节）"):
            update_prompt("chapter_refine", prompt_refine)
            chapter_module.update_prompt("chapter_refine", prompt_refine)
            st.success("Prompt已保存")
        
        prompt_insert = st.text_area(
            "完善插入章节的Prompt",
            value=get_prompt("insert_chapter_refine") or DEFAULT_PROMPTS["insert_chapter_refine"],
            height=150,
            key="insert_prompt"
        )
        if st.button("保存Prompt（完善插入章节）"):
            update_prompt("insert_chapter_refine", prompt_insert)
            chapter_module.update_prompt("insert_chapter_refine", prompt_insert)
            st.success("Prompt已保存")
    
    st.markdown("---")
    
    # 显示选择的NPC和地点信息
    if selected_npcs or selected_locations:
        st.subheader("📋 故事设定")
        
        if selected_npcs:
            st.markdown("**参与的NPC角色：**")
            for npc in selected_npcs:
                st.markdown(f"- **{npc.name}**（{npc.gender}，{npc.profession}）")
        
        if selected_locations:
            st.markdown("**故事发生的地点：**")
            for loc in selected_locations:
                st.markdown(f"- **{loc.name}**")
        
        st.markdown("---")
    
    chapters = get_chapters()
    
    # 检查是否需要调整章节内容（插入新章节后）
    if st.session_state.get("need_adjust_chapters", False) and chapters:
        st.info("💡 检测到新插入的章节，建议使用'整体优化'功能来调整所有章节内容，使其更加连贯。")
        if st.button("立即调整所有章节", key="auto_adjust_chapters"):
            with st.spinner("AI正在调整章节内容以适应新的顺序..."):
                try:
                    chapters_dict = [
                        {
                            "title": ch.title,
                            "content": ch.content,
                            "order": ch.order
                        }
                        for ch in chapters
                    ]
                    
                    refined_chapters = chapter_module.refine_all_chapters(chapters_dict)
                    
                    # 更新章节
                    for i, refined in enumerate(refined_chapters):
                        if i < len(chapters):
                            chapters[i].content = refined.get("content", chapters[i].content)
                            chapters[i].title = refined.get("title", chapters[i].title)
                    
                    save_chapters(chapters)
                    st.session_state.need_adjust_chapters = False
                    st.success("章节已调整！")
                    st.rerun()
                except Exception as e:
                    st.error(f"调整失败: {str(e)}")
    
    # 如果还没有章节，生成初始三章
    if not chapters:
        st.subheader("生成初始章节")
        col1, col2 = st.columns(2)
        with col1:
            if st.button("🤖 AI生成三章故事", type="primary", use_container_width=True):
                with st.spinner("AI正在生成章节..."):
                    try:
                        chapters_data = chapter_module.generate_chapters(
                            story.content,
                            selected_npcs=selected_npcs,
                            selected_locations=selected_locations
                        )
                        # 转换为Chapter对象，确保数据格式正确
                        chapters = []
                        for i, ch in enumerate(chapters_data):
                            # 确保title和content都是字符串
                            title = str(ch.get("title", ""))
                            content = str(ch.get("content", ""))
                            
                            # 如果content为空，使用默认内容
                            if not content or content.strip() == "":
                                content = f"章节内容待完善..."
                            
                            # 确保标题不是"第X章"格式，使用描述性标题
                            if not title or title.strip() == "" or (title.startswith("第") and "章" in title):
                                # 如果AI返回了编号格式或空标题，使用默认描述性标题
                                default_titles = ["开端", "发展", "结局"]
                                title = default_titles[i] if i < len(default_titles) else f"章节 {i+1}"
                            title = title.strip()
                            
                            chapters.append(Chapter(
                                title=title,
                                content=content,
                                order=i
                            ))
                        save_chapters(chapters)
                        st.success("章节生成成功！")
                        st.rerun()
                    except Exception as e:
                        st.error(f"生成失败: {str(e)}")
                        import traceback
                        st.code(traceback.format_exc())
        with col2:
            if st.button("➕ 手动创建章节", use_container_width=True):
                new_chapter = Chapter(
                    title="新章节",
                    content="",
                    order=0
                )
                save_chapters([new_chapter])
                st.success("已创建新章节！")
                st.rerun()
    else:
        # 显示和管理章节
        st.subheader("章节管理")
        
        # 排序章节，确保order连续
        chapters = sorted(chapters, key=lambda x: x.order)
        # 重新分配order，确保连续（0, 1, 2, ...）
        for i, ch in enumerate(chapters):
            ch.order = i
        
        # 显示每个章节
        for i, chapter in enumerate(chapters):
            with st.expander(f"📖 {chapter.title}", expanded=False):
                # 编辑章节标题
                edited_title = st.text_input(
                    "章节标题",
                    value=chapter.title,
                    key=f"chapter_title_{i}"
                )
                
                # 编辑章节内容
                chapter_content = chapter.content
                edited_content = st.text_area(
                    f"章节内容",
                    value=chapter_content,
                    height=200,
                    key=f"chapter_content_{i}"
                )
                
                col1, col2, col3, col4, col5 = st.columns(5)
                
                with col1:
                    if st.button(f"💾 保存", key=f"save_chapter_{i}"):
                        chapters[i].title = edited_title.strip() if edited_title.strip() else chapter.title
                        chapters[i].content = edited_content
                        save_chapters(chapters)
                        st.success("章节已保存")
                        st.rerun()
                
                with col2:
                    if st.button(f"✨ AI优化", key=f"refine_chapter_{i}"):
                        with st.spinner("AI正在优化章节..."):
                            try:
                                prev_content = chapters[i-1].content if i > 0 else ""
                                next_content = chapters[i+1].content if i < len(chapters) - 1 else ""
                                prev_title = chapters[i-1].title if i > 0 else ""
                                next_title = chapters[i+1].title if i < len(chapters) - 1 else ""
                                
                                # 判断是否是新插入的章节（内容较少）
                                # 如果内容少于100字，使用完善功能；否则使用优化功能
                                if len(edited_content.strip()) < 100:
                                    # 新章节，基于已有内容进行完善和扩展（传递章节顺序信息）
                                    refined = chapter_module.refine_inserted_chapter(
                                        prev_content,
                                        edited_content,
                                        next_content,
                                        chapter_index=i+1,
                                        total_chapters=len(chapters),
                                        previous_title=prev_title,
                                        current_title=edited_title,
                                        next_title=next_title
                                    )
                                    st.info("💡 检测到新章节，AI将基于您已写的内容进行完善和扩展")
                                else:
                                    # 已有完整内容，进行优化（传递章节顺序信息）
                                    refined = chapter_module.refine_chapter(
                                        prev_content,
                                        edited_content,
                                        next_content,
                                        chapter_index=i+1,
                                        total_chapters=len(chapters),
                                        previous_title=prev_title,
                                        current_title=edited_title,
                                        next_title=next_title
                                    )
                                
                                st.session_state[f"refined_chapter_{i}"] = refined
                                st.success("优化完成！")
                            except Exception as e:
                                st.error(f"优化失败: {str(e)}")
                
                with col3:
                    if st.button(f"➕ 在此后插入", key=f"insert_after_{i}"):
                        # 插入新章节
                        new_chapter = Chapter(
                            title="新章节",
                            content="",
                            order=i+1
                        )
                        # 更新后续章节的order（自动调整编号）
                        for j in range(i+1, len(chapters)):
                            chapters[j].order = chapters[j].order + 1
                        chapters.insert(i+1, new_chapter)
                        save_chapters(chapters)
                        # 标记需要调整其他章节内容
                        st.session_state.need_adjust_chapters = True
                        st.rerun()
                
                with col4:
                    if st.button(f"➕ 在此前插入", key=f"insert_before_{i}"):
                        # 在当前章节之前插入新章节
                        new_chapter = Chapter(
                            title="新章节",
                            content="",
                            order=i
                        )
                        # 更新当前及后续章节的order
                        for j in range(i, len(chapters)):
                            chapters[j].order = chapters[j].order + 1
                        chapters.insert(i, new_chapter)
                        save_chapters(chapters)
                        # 标记需要调整其他章节内容
                        st.session_state.need_adjust_chapters = True
                        st.rerun()
                
                with col5:
                    if st.button(f"🗑️ 删除", key=f"delete_chapter_{i}", type="secondary"):
                        # 确认删除
                        if len(chapters) > 1:
                            # 删除章节
                            deleted_chapter = chapters.pop(i)
                            # 重新分配order，确保连续
                            for j, ch in enumerate(chapters):
                                ch.order = j
                            save_chapters(chapters)
                            st.success(f"已删除章节：{deleted_chapter.title}")
                            st.rerun()
                        else:
                            st.warning("至少需要保留一个章节！")
                
                # 显示优化后的内容
                if f"refined_chapter_{i}" in st.session_state:
                    st.markdown("### 优化后的内容")
                    refined_content = st.text_area(
                        "优化后的章节",
                        value=st.session_state[f"refined_chapter_{i}"],
                        height=200,
                        key=f"refined_content_{i}"
                    )
                    if st.button(f"应用优化", key=f"apply_refine_{i}"):
                        chapters[i].content = refined_content
                        save_chapters(chapters)
                        del st.session_state[f"refined_chapter_{i}"]
                        st.success("已应用优化")
                        st.rerun()
        
        # 处理新插入的章节（内容为空或内容较少的章节）
        for i, chapter in enumerate(chapters):
            if not chapter.content or len(chapter.content) < 50:
                st.markdown("---")
                st.subheader(f"📝 完善新章节：{chapter.title}")
                
                partial_content = st.text_area(
                    "章节内容（可以只写一部分，然后使用AI完善）",
                    value=chapter.content,
                    height=200,
                    key=f"new_chapter_content_{i}"
                )
                
                col1, col2 = st.columns(2)
                
                with col1:
                    if st.button(f"AI完善章节", key=f"complete_chapter_{i}"):
                        if partial_content:
                            with st.spinner("AI正在完善章节..."):
                                try:
                                    prev_content = chapters[i-1].content if i > 0 else ""
                                    next_content = chapters[i+1].content if i < len(chapters) - 1 else ""
                                    
                                    completed = chapter_module.refine_inserted_chapter(
                                        prev_content,
                                        partial_content,
                                        next_content
                                    )
                                    chapters[i].content = completed
                                    save_chapters(chapters)
                                    st.success("章节完善成功！")
                                    st.rerun()
                                except Exception as e:
                                    st.error(f"完善失败: {str(e)}")
                        else:
                            st.error("请先输入一些内容")
                
                with col2:
                    if st.button(f"手动保存", key=f"manual_save_{i}"):
                        chapters[i].content = partial_content
                        save_chapters(chapters)
                        st.success("章节已保存")
                        st.rerun()
        
        # 整体优化
        st.markdown("---")
        st.subheader("整体优化")
        st.markdown("点击下方按钮，AI将优化所有章节，使它们之间的联系更加紧密。")
        
        if st.button("优化所有章节", type="primary"):
            with st.spinner("AI正在优化所有章节..."):
                try:
                    chapters_dict = [
                        {
                            "title": ch.title if hasattr(ch, 'title') else f"第{i+1}章",
                            "content": ch.content if hasattr(ch, 'content') else str(ch),
                            "order": ch.order if hasattr(ch, 'order') else i
                        }
                        for i, ch in enumerate(chapters)
                    ]
                    
                    refined_chapters = chapter_module.refine_all_chapters(chapters_dict)
                    
                    # 更新章节
                    for i, refined in enumerate(refined_chapters):
                        if i < len(chapters):
                            chapters[i].content = refined.get("content", chapters[i].content)
                            chapters[i].title = refined.get("title", chapters[i].title)
                    
                    save_chapters(chapters)
                    st.success("所有章节优化完成！")
                    st.rerun()
                except Exception as e:
                    st.error(f"优化失败: {str(e)}")
        
        # 导出结果
        st.markdown("---")
        st.subheader("完成")
        if st.button("查看最终故事", type="primary", use_container_width=True):
            st.session_state.show_final_story = True
        
        if st.session_state.get("show_final_story", False):
            st.markdown("### 📖 最终故事")
            for i, chapter in enumerate(chapters):
                st.markdown(f"## {chapter.title}")
                st.markdown(chapter.content)
                st.markdown("---")

