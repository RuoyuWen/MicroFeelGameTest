// ================================================
// JSON Mode 自动提示功能 - 诊断脚本
// ================================================
// 
// 使用方法：
// 1. 打开 index.html 在浏览器中
// 2. 按 F12 打开开发者工具
// 3. 切换到 Console 标签
// 4. 复制整个文件内容，粘贴到控制台
// 5. 按 Enter 运行
//
// 脚本会自动检查并报告问题
// ================================================

console.log('🔍 开始诊断 JSON Mode 自动提示功能...\n');

let hasError = false;

// ================================================
// 1. 检查 HTML 元素
// ================================================
console.log('📋 步骤 1/5: 检查 HTML 元素');
console.log('━'.repeat(50));

const elements = [
    { id: 'module1-prompt', name: 'Module 1 Prompt Textarea' },
    { id: 'module1-json', name: 'Module 1 JSON Checkbox' },
    { id: 'module2-prompt', name: 'Module 2 Prompt Textarea' },
    { id: 'module2-json', name: 'Module 2 JSON Checkbox' },
    { id: 'module3-prompt', name: 'Module 3 Prompt Textarea' },
    { id: 'module3-json', name: 'Module 3 JSON Checkbox' }
];

elements.forEach(({ id, name }) => {
    const element = document.getElementById(id);
    if (element) {
        console.log(`✅ ${name} (id="${id}") - 存在`);
    } else {
        console.error(`❌ ${name} (id="${id}") - 不存在！`);
        hasError = true;
    }
});

console.log('');

// ================================================
// 2. 检查函数定义
// ================================================
console.log('📋 步骤 2/5: 检查函数定义');
console.log('━'.repeat(50));

if (typeof setupJsonModeAutoHint === 'function') {
    console.log('✅ setupJsonModeAutoHint 函数已定义');
} else {
    console.error('❌ setupJsonModeAutoHint 函数未定义！');
    hasError = true;
}

if (typeof JSON_MODE_HINT !== 'undefined') {
    console.log(`✅ JSON_MODE_HINT 常量已定义: "${JSON_MODE_HINT}"`);
} else {
    console.error('❌ JSON_MODE_HINT 常量未定义！');
    hasError = true;
}

console.log('');

// ================================================
// 3. 检查事件监听器
// ================================================
console.log('📋 步骤 3/5: 检查事件监听器');
console.log('━'.repeat(50));

['module1-json', 'module2-json', 'module3-json'].forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
        // 创建一个测试事件
        const testEvent = new Event('change');
        let eventFired = false;
        
        // 临时添加监听器来检测
        const testListener = () => { eventFired = true; };
        checkbox.addEventListener('change', testListener);
        
        // 触发事件
        checkbox.dispatchEvent(testEvent);
        
        // 移除测试监听器
        checkbox.removeEventListener('change', testListener);
        
        if (eventFired) {
            console.log(`✅ ${id} - 事件监听器工作正常`);
        } else {
            console.warn(`⚠️ ${id} - 事件监听器可能未绑定`);
        }
    }
});

console.log('');

// ================================================
// 4. 测试功能
// ================================================
console.log('📋 步骤 4/5: 测试添加/删除功能');
console.log('━'.repeat(50));

const testTextarea = document.getElementById('module1-prompt');
const testCheckbox = document.getElementById('module1-json');

if (testTextarea && testCheckbox) {
    // 保存原始值
    const originalValue = testTextarea.value;
    const originalChecked = testCheckbox.checked;
    
    console.log('🧪 测试 Module 1...');
    
    // 测试添加
    testTextarea.value = '这是一个测试 Prompt。';
    testCheckbox.checked = true;
    testCheckbox.dispatchEvent(new Event('change'));
    
    setTimeout(() => {
        const afterAdd = testTextarea.value;
        if (afterAdd.includes('重要：请使用JSON格式返回结果。')) {
            console.log('✅ 添加功能正常');
        } else {
            console.error('❌ 添加功能失败 - Prompt 未变化');
            console.log('   当前值:', afterAdd);
            hasError = true;
        }
        
        // 测试删除
        testCheckbox.checked = false;
        testCheckbox.dispatchEvent(new Event('change'));
        
        setTimeout(() => {
            const afterRemove = testTextarea.value;
            if (!afterRemove.includes('重要：请使用JSON格式返回结果。')) {
                console.log('✅ 删除功能正常');
            } else {
                console.error('❌ 删除功能失败 - 提示未删除');
                console.log('   当前值:', afterRemove);
                hasError = true;
            }
            
            // 恢复原始值
            testTextarea.value = originalValue;
            testCheckbox.checked = originalChecked;
            
            console.log('');
            
            // ================================================
            // 5. 总结
            // ================================================
            console.log('📋 步骤 5/5: 诊断总结');
            console.log('━'.repeat(50));
            
            if (hasError) {
                console.error('❌ 发现问题！请查看上面的错误信息。');
                console.log('\n可能的解决方案：');
                console.log('1. 刷新页面（Ctrl+Shift+R 强制刷新）');
                console.log('2. 检查 app.js 文件是否完整');
                console.log('3. 检查浏览器控制台是否有其他错误');
                console.log('4. 查看 "🔧 JSON_Mode功能测试指南.txt"');
            } else {
                console.log('✅ 所有检查通过！功能应该正常工作。');
                console.log('\n如何使用：');
                console.log('1. 在配置页面找到任一模块');
                console.log('2. 勾选 "☑ 启用 JSON Mode"');
                console.log('3. 查看 System Prompt 末尾是否添加了提示');
                console.log('4. 取消勾选应该会删除提示');
            }
            
            console.log('\n━'.repeat(50));
            console.log('🔍 诊断完成！');
            
        }, 100);
    }, 100);
} else {
    console.error('❌ 无法进行功能测试 - 缺少必要元素');
    hasError = true;
}

