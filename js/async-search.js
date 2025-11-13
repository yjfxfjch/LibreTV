// 异步搜索功能 - 边加载边显示
// 这个文件包含了重构后的搜索函数，支持异步加载和实时显示结果

// 搜索功能 - 修改为异步加载，边加载边显示
async function search() {
    // 密码保护校验
    if (window.isPasswordProtected && window.isPasswordVerified) {
        if (window.isPasswordProtected() && !window.isPasswordVerified()) {
            showPasswordModal && showPasswordModal();
            return;
        }
    }
    const query = document.getElementById('searchInput').value.trim();

    if (!query) {
        showToast('请输入搜索内容', 'info');
        return;
    }

    if (selectedAPIs.length === 0) {
        showToast('请至少选择一个API源', 'warning');
        return;
    }

    // 初始化搜索UI
    initializeSearchUI(query);
    
    // 保存搜索历史
    saveSearchHistory(query);

    // 全局变量用于收集所有结果
    let allResults = [];
    let completedSources = 0;
    const totalSources = selectedAPIs.length;
    let hasResults = false;

    // 显示初始loading状态
    showSearchProgress(0, totalSources);    try {
        // 使用 forEach 来启动并发搜索（不等待结果）
        selectedAPIs.forEach(async (apiId) => {
            try {
                const results = await searchByAPIAndKeyWord(apiId, query);
                
                if (results && results.length > 0) {
                    hasResults = true;
                    
                    // 过滤黄色内容（如果启用了过滤）
                    const filteredResults = filterAdultContent(results);
                    
                    // 立即显示这批结果
                    appendSearchResults(filteredResults);
                    
                    // 添加到全局结果中
                    allResults = allResults.concat(filteredResults);
                    
                    // 更新搜索结果计数
                    updateSearchResultsCount(allResults.length);
                }
                
                completedSources++;
                
                // 更新进度显示
                showSearchProgress(completedSources, totalSources);
                
                // 如果所有源都完成了，隐藏加载状态
                if (completedSources === totalSources) {
                    hideSearchProgress();
                    
                    // 如果没有任何结果，显示无结果提示
                    if (!hasResults) {
                        showNoResultsMessage(query);
                    } else {
                        // 对所有结果进行最终排序
                        sortAndRenderFinalResults();
                    }
                }
                
            } catch (error) {
                console.warn(`API ${apiId} 搜索失败:`, error);
                completedSources++;
                showSearchProgress(completedSources, totalSources);
                
                if (completedSources === totalSources) {
                    hideSearchProgress();
                    if (!hasResults) {
                        showNoResultsMessage(query);
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('搜索错误:', error);
        hideSearchProgress();
        if (error.name === 'AbortError') {
            showToast('搜索请求超时，请检查网络连接', 'error');
        } else {
            showToast('搜索请求失败，请稍后重试', 'error');
        }
    }
}

// 异步搜索辅助函数
function initializeSearchUI(query) {
    // 显示结果区域，调整搜索区域
    document.getElementById('searchArea').classList.remove('flex-1');
    document.getElementById('searchArea').classList.add('mb-8');
    document.getElementById('resultsArea').classList.remove('hidden');

    // 隐藏豆瓣推荐区域（如果存在）
    const doubanArea = document.getElementById('doubanArea');
    if (doubanArea) {
        doubanArea.classList.add('hidden');
    }

    // 清空之前的搜索结果
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    // 更新URL
    try {
        const encodedQuery = encodeURIComponent(query);
        window.history.pushState(
            { search: query },
            `搜索: ${query} - JCHTV`,
            `/s=${encodedQuery}`
        );
        document.title = `搜索: ${query} - JCHTV`;
    } catch (e) {
        console.error('更新浏览器历史失败:', e);
    }

    // 初始化结果计数
    updateSearchResultsCount(0);
}

function showSearchProgress(completed, total) {
    const progressText = `正在搜索... (${completed}/${total})`;
    
    // 显示进度在结果区域
    const resultsDiv = document.getElementById('results');
    if (completed === 0) {
        resultsDiv.innerHTML = `
            <div class="col-span-full text-center py-8" id="search-progress">
                <div class="inline-flex items-center px-4 py-2 bg-blue-600 rounded-lg text-white">
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    <span>${progressText}</span>
                </div>
            </div>
        `;
    } else {
        const progressElement = document.getElementById('search-progress');
        if (progressElement) {
            progressElement.querySelector('span').textContent = progressText;
        }
    }
}

function hideSearchProgress() {
    const progressElement = document.getElementById('search-progress');
    if (progressElement) {
        progressElement.remove();
    }
}

function filterAdultContent(results) {
    const yellowFilterEnabled = localStorage.getItem('yellowFilterEnabled') === 'true';
    if (!yellowFilterEnabled) return results;

    const banned = ['伦理片', '福利', '里番动漫', '门事件', '萝莉少女', '制服诱惑', '国产传媒', 'cosplay', '黑丝诱惑', '无码', '日本无码', '有码', '日本有码', 'SWAG', '网红主播', '色情片', '同性片', '福利视频', '福利片'];
    
    return results.filter(item => {
        const typeName = item.type_name || '';
        return !banned.some(keyword => typeName.includes(keyword));
    });
}

function appendSearchResults(results) {
    if (!results || results.length === 0) return;

    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) return;
    
    // 移除进度指示器（如果存在）
    const progressElement = document.getElementById('search-progress');
    if (progressElement) {
        progressElement.remove();
    }

    // 生成结果HTML
    const safeResults = results.map(item => createSearchResultHTML(item)).join('');
    
    // 追加到现有结果
    resultsDiv.insertAdjacentHTML('beforeend', safeResults);
    
    // 触发动画效果
    requestAnimationFrame(() => {
        const newItems = resultsDiv.querySelectorAll('.search-result-item:not(.animated)');
        newItems.forEach(item => {
            item.classList.add('animated');
        });
    });
}

function createSearchResultHTML(item) {
    const safeId = item.vod_id ? item.vod_id.toString().replace(/[^\w-]/g, '') : '';
    const safeName = (item.vod_name || '').toString()
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const sourceInfo = item.source_name ?
        `<span class="bg-[#222] text-xs px-1.5 py-0.5 rounded-full">${item.source_name}</span>` : '';
    const sourceCode = item.source_code || '';

    const apiUrlAttr = item.api_url ?
        `data-api-url="${item.api_url.replace(/"/g, '&quot;')}"` : '';

    const hasCover = item.vod_pic && item.vod_pic.startsWith('http');

    return `
        <div class="card-hover bg-[#111] rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02] h-full shadow-sm hover:shadow-md search-result-item" 
             onclick="showDetails('${safeId}','${safeName}','${sourceCode}')" ${apiUrlAttr}>
            <div class="flex h-full">
                ${hasCover ? `
                <div class="relative flex-shrink-0 search-card-img-container">
                    <img src="${item.vod_pic}" alt="${safeName}" 
                         class="h-full w-full object-cover transition-transform hover:scale-110" 
                         onerror="this.onerror=null; this.src='https://via.placeholder.com/300x450?text=无封面'; this.classList.add('object-contain');" 
                         loading="lazy">
                    <div class="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent"></div>
                </div>` : ''}
                
                <div class="p-2 flex flex-col flex-grow">
                    <div class="flex-grow">
                        <h3 class="font-semibold mb-2 break-words line-clamp-2 ${hasCover ? '' : 'text-center'}" title="${safeName}">${safeName}</h3>
                        
                        <div class="flex flex-wrap ${hasCover ? '' : 'justify-center'} gap-1 mb-2">
                            ${(item.type_name || '').toString().replace(/</g, '&lt;') ?
                                `<span class="text-xs py-0.5 px-1.5 rounded bg-opacity-20 bg-blue-500 text-blue-300">
                                      ${(item.type_name || '').toString().replace(/</g, '&lt;')}
                                  </span>` : ''}
                            ${(item.vod_year || '') ?
                                `<span class="text-xs py-0.5 px-1.5 rounded bg-opacity-20 bg-purple-500 text-purple-300">
                                      ${item.vod_year}
                                  </span>` : ''}
                        </div>
                        <p class="text-gray-400 line-clamp-2 overflow-hidden ${hasCover ? '' : 'text-center'} mb-2">
                            ${(item.vod_remarks || '暂无介绍').toString().replace(/</g, '&lt;')}
                        </p>
                    </div>
                    
                    <div class="flex justify-between items-center mt-1 pt-1 border-t border-gray-800">
                        ${sourceInfo ? `<div>${sourceInfo}</div>` : '<div></div>'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateSearchResultsCount(count) {
    const searchResultsCount = document.getElementById('searchResultsCount');
    if (searchResultsCount) {
        searchResultsCount.textContent = count;
    }
}

function showNoResultsMessage(query) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <div class="col-span-full text-center py-16">
            <svg class="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="mt-2 text-lg font-medium text-gray-400">没有找到匹配的结果</h3>
            <p class="mt-1 text-sm text-gray-500">请尝试其他关键词或更换数据源</p>
        </div>
    `;
}

function sortAndRenderFinalResults() {
    const resultsDiv = document.getElementById('results');
    const resultItems = Array.from(resultsDiv.querySelectorAll('.search-result-item'));
      // 提取结果数据进行排序
    const resultsData = resultItems.map(item => {
        const title = item.querySelector('h3').textContent;
        const sourceElement = item.querySelector('span.bg-\\[\\#222\\]');
        const source = sourceElement ? sourceElement.textContent : '';
        return { element: item, title, source };
    });

    // 按标题排序，相同标题按来源排序
    resultsData.sort((a, b) => {
        const titleCompare = a.title.localeCompare(b.title);
        if (titleCompare !== 0) return titleCompare;
        return a.source.localeCompare(b.source);
    });

    // 清空并重新插入排序后的元素
    resultsDiv.innerHTML = '';
    resultsData.forEach(item => {
        resultsDiv.appendChild(item.element);
    });
}

// 直接替换原有的搜索函数
console.log('异步搜索模块已加载');
