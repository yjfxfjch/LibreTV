// 视频下载功能模块
class VideoDownloader {
    constructor() {
        this.isDownloading = false;
        this.downloadQueue = [];
        this.supportedFormats = ['m3u8', 'mp4', 'webm', 'mkv'];
    }

    // 获取当前视频信息
    getCurrentVideoInfo() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            title: currentVideoTitle || urlParams.get('title') || '未知视频',
            url: currentVideoUrl || urlParams.get('url') || '',
            index: currentEpisodeIndex || parseInt(urlParams.get('index') || '0'),
            source: urlParams.get('source') || 'unknown',
            episodes: currentEpisodes || []
        };
    }

    // 检查视频格式
    getVideoFormat(url) {
        if (!url) return null;
        
        if (url.includes('.m3u8') || url.includes('m3u8')) {
            return 'm3u8';
        }
        
        const formats = ['mp4', 'webm', 'mkv', 'avi', 'mov'];
        for (const format of formats) {
            if (url.includes(`.${format}`)) {
                return format;
            }
        }
        
        return 'unknown';
    }

    // 生成安全的文件名
    sanitizeFileName(fileName) {
        return fileName
            .replace(/[\\/:*?"<>|]/g, '_')  // 替换非法字符
            .replace(/\s+/g, '_')          // 替换空格
            .substring(0, 200);             // 限制长度
    }

    // 显示下载选项对话框
    showDownloadDialog() {
        const videoInfo = this.getCurrentVideoInfo();
        
        if (!videoInfo.url) {
            showToast('无法获取视频链接', 'error');
            return;
        }

        const format = this.getVideoFormat(videoInfo.url);
        const modal = document.getElementById('downloadModal');
        
        if (!modal) {
            this.createDownloadModal();
        }

        this.updateDownloadDialog(videoInfo, format);
        document.getElementById('downloadModal').classList.remove('hidden');
    }

    // 创建下载模态框
    createDownloadModal() {
        const modalHTML = `
            <div id="downloadModal" class="fixed inset-0 bg-black/90 hidden items-center justify-center z-50">
                <div class="bg-[#111] p-6 rounded-lg border border-[#333] w-11/12 max-w-md">
                    <h2 class="text-xl font-bold text-white mb-4">下载视频</h2>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">视频标题</label>
                            <div id="downloadTitle" class="text-white bg-[#222] p-2 rounded border border-[#333] text-sm break-all"></div>
                        </div>
                        
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">视频格式</label>
                            <div id="downloadFormat" class="text-yellow-400 bg-[#222] p-2 rounded border border-[#333] text-sm"></div>
                        </div>
                        
                        <div id="downloadOptions" class="space-y-2">
                            <!-- 下载选项将动态填充 -->
                        </div>
                        
                        <div id="downloadProgress" class="hidden">
                            <div class="w-full bg-[#333] rounded-full h-2">
                                <div id="downloadProgressBar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                            </div>
                            <div id="downloadStatus" class="text-sm text-gray-400 mt-2">准备下载...</div>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 mt-6">
                        <button id="cancelDownload" onclick="videoDownloader.closeDownloadDialog()" 
                                class="px-4 py-2 bg-[#444] hover:bg-[#555] text-white rounded-lg transition-colors">
                            取消
                        </button>
                        <button id="startDownload" onclick="videoDownloader.startDownload()" 
                                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            开始下载
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // 更新下载对话框内容
    updateDownloadDialog(videoInfo, format) {
        const titleElement = document.getElementById('downloadTitle');
        const formatElement = document.getElementById('downloadFormat');
        const optionsElement = document.getElementById('downloadOptions');
        
        const episodeText = videoInfo.episodes.length > 1 ? 
            ` - 第${videoInfo.index + 1}集` : '';
        
        titleElement.textContent = videoInfo.title + episodeText;
        
        let formatText = format.toUpperCase();
        let optionsHTML = '';
        
        if (format === 'm3u8') {
            formatText += ' (流媒体格式)';
            optionsHTML = `
                <div class="text-sm text-gray-300 mb-2">M3U8格式选项：</div>
                <label class="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="downloadType" value="m3u8" checked class="text-blue-500">
                    <span>下载M3U8播放列表文件</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="downloadType" value="segments" class="text-blue-500">
                    <span>下载视频片段 (需要合并)</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="downloadType" value="copy" class="text-blue-500">
                    <span>复制播放链接</span>
                </label>
                <div class="text-xs text-amber-400 mt-2">
                    ⚠️ M3U8需要专门的工具下载，建议使用FFmpeg或专用下载器
                </div>
            `;
        } else if (format === 'mp4' || format === 'webm' || format === 'mkv') {
            formatText += ' (直接视频文件)';
            optionsHTML = `
                <label class="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="downloadType" value="direct" checked class="text-blue-500">
                    <span>直接下载视频文件</span>
                </label>
            `;
        } else {
            formatText += ' (未知格式)';
            optionsHTML = `
                <label class="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="downloadType" value="copy" checked class="text-blue-500">
                    <span>复制播放链接</span>
                </label>
                <div class="text-xs text-red-400 mt-2">
                    ⚠️ 无法识别的视频格式，建议复制链接使用外部工具下载
                </div>
            `;
        }
        
        formatElement.textContent = formatText;
        optionsElement.innerHTML = optionsHTML;
    }

    // 开始下载
    async startDownload() {
        if (this.isDownloading) {
            showToast('正在下载中，请稍候', 'warning');
            return;
        }

        const videoInfo = this.getCurrentVideoInfo();
        const selectedType = document.querySelector('input[name="downloadType"]:checked')?.value;
        
        if (!selectedType) {
            showToast('请选择下载类型', 'warning');
            return;
        }

        this.isDownloading = true;
        const progressElement = document.getElementById('downloadProgress');
        const startButton = document.getElementById('startDownload');
        const cancelButton = document.getElementById('cancelDownload');
        
        progressElement.classList.remove('hidden');
        startButton.disabled = true;
        startButton.textContent = '下载中...';
        cancelButton.textContent = '取消下载';

        try {
            switch (selectedType) {
                case 'direct':
                    await this.downloadDirectVideo(videoInfo);
                    break;
                case 'm3u8':
                    await this.downloadM3U8Playlist(videoInfo);
                    break;
                case 'segments':
                    await this.showSegmentDownloadInfo(videoInfo);
                    break;
                case 'copy':
                    await this.copyVideoLink(videoInfo);
                    break;
            }
        } catch (error) {
            console.error('下载失败:', error);
            showToast('下载失败: ' + error.message, 'error');
        } finally {
            this.isDownloading = false;
            startButton.disabled = false;
            startButton.textContent = '开始下载';
            cancelButton.textContent = '关闭';
            setTimeout(() => {
                this.closeDownloadDialog();
            }, 2000);
        }
    }

    // 下载直接视频文件
    async downloadDirectVideo(videoInfo) {
        this.updateDownloadStatus('正在准备下载...');
        
        const fileName = this.sanitizeFileName(
            `${videoInfo.title}_第${videoInfo.index + 1}集.${this.getVideoFormat(videoInfo.url)}`
        );
        
        try {
            // 创建下载链接
            const a = document.createElement('a');
            a.href = videoInfo.url;
            a.download = fileName;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            this.updateDownloadStatus('下载已开始...');
            showToast('下载已开始，请检查浏览器下载文件夹', 'success');
            
        } catch (error) {
            throw new Error('无法启动下载: ' + error.message);
        }
    }

    // 下载M3U8播放列表
    async downloadM3U8Playlist(videoInfo) {
        this.updateDownloadStatus('正在下载M3U8播放列表...');
        
        try {
            const response = await fetch(videoInfo.url);
            if (!response.ok) {
                throw new Error('无法获取M3U8文件');
            }
            
            const m3u8Content = await response.text();
            const fileName = this.sanitizeFileName(
                `${videoInfo.title}_第${videoInfo.index + 1}集.m3u8`
            );
            
            // 创建并下载文件
            const blob = new Blob([m3u8Content], { type: 'application/vnd.apple.mpegurl' });
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            window.URL.revokeObjectURL(url);
            
            this.updateDownloadStatus('M3U8文件下载完成');
            showToast('M3U8文件已下载，可使用FFmpeg等工具转换', 'success');
            
        } catch (error) {
            throw new Error('M3U8下载失败: ' + error.message);
        }
    }

    // 显示分段下载信息
    async showSegmentDownloadInfo(videoInfo) {
        this.updateDownloadStatus('正在分析视频片段...');
        
        try {
            const response = await fetch(videoInfo.url);
            if (!response.ok) {
                throw new Error('无法获取M3U8文件');
            }
            
            const m3u8Content = await response.text();
            const segments = this.parseM3U8Segments(m3u8Content, videoInfo.url);
            
            if (segments.length === 0) {
                throw new Error('未找到视频片段');
            }
            
            // 创建包含所有片段URL的文本文件
            const segmentList = segments.map((segment, index) => 
                `${index + 1}. ${segment}`
            ).join('\n');
            
            const fileName = this.sanitizeFileName(
                `${videoInfo.title}_第${videoInfo.index + 1}集_片段列表.txt`
            );
            
            const blob = new Blob([
                `视频标题: ${videoInfo.title}\n`,
                `集数: 第${videoInfo.index + 1}集\n`,
                `片段总数: ${segments.length}\n`,
                `M3U8地址: ${videoInfo.url}\n\n`,
                `片段列表:\n`,
                segmentList
            ], { type: 'text/plain;charset=utf-8' });
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            window.URL.revokeObjectURL(url);
            
            this.updateDownloadStatus(`已生成${segments.length}个片段的下载列表`);
            showToast(`片段列表已下载 (${segments.length}个文件)，请使用下载工具批量下载`, 'success');
            
        } catch (error) {
            throw new Error('分析片段失败: ' + error.message);
        }
    }

    // 解析M3U8文件中的视频片段
    parseM3U8Segments(m3u8Content, baseUrl) {
        const lines = m3u8Content.split('\n');
        const segments = [];
        const baseUrlObj = new URL(baseUrl);
        const basePath = baseUrlObj.origin + baseUrlObj.pathname.substring(0, baseUrlObj.pathname.lastIndexOf('/') + 1);
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // 跳过注释行和空行
            if (trimmedLine.startsWith('#') || !trimmedLine) {
                continue;
            }
            
            // 处理相对和绝对URL
            let segmentUrl;
            if (trimmedLine.startsWith('http://') || trimmedLine.startsWith('https://')) {
                segmentUrl = trimmedLine;
            } else {
                segmentUrl = basePath + trimmedLine;
            }
            
            segments.push(segmentUrl);
        }
        
        return segments;
    }

    // 复制视频链接
    async copyVideoLink(videoInfo) {
        this.updateDownloadStatus('正在复制链接...');
        
        try {
            await navigator.clipboard.writeText(videoInfo.url);
            this.updateDownloadStatus('链接已复制到剪贴板');
            showToast('视频链接已复制到剪贴板', 'success');
        } catch (error) {
            throw new Error('复制失败，请手动复制: ' + error.message);
        }
    }

    // 更新下载进度状态
    updateDownloadStatus(status) {
        const statusElement = document.getElementById('downloadStatus');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    // 关闭下载对话框
    closeDownloadDialog() {
        const modal = document.getElementById('downloadModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        // 重置状态
        this.isDownloading = false;
        const progressElement = document.getElementById('downloadProgress');
        if (progressElement) {
            progressElement.classList.add('hidden');
        }
        
        const startButton = document.getElementById('startDownload');
        if (startButton) {
            startButton.disabled = false;
            startButton.textContent = '开始下载';
        }
        
        const cancelButton = document.getElementById('cancelDownload');
        if (cancelButton) {
            cancelButton.textContent = '取消';
        }
    }

    // 下载当前集
    downloadCurrentEpisode() {
        this.showDownloadDialog();
    }

    // 下载所有集数
    downloadAllEpisodes() {
        const videoInfo = this.getCurrentVideoInfo();
        
        if (!videoInfo.episodes || videoInfo.episodes.length <= 1) {
            showToast('当前只有一集，请使用单集下载', 'warning');
            return;
        }

        if (confirm(`确定要下载所有${videoInfo.episodes.length}集视频吗？这可能需要较长时间。`)) {
            this.showBatchDownloadDialog(videoInfo);
        }
    }

    // 显示批量下载对话框
    showBatchDownloadDialog(videoInfo) {
        const modal = document.getElementById('batchDownloadModal');
        
        if (!modal) {
            this.createBatchDownloadModal();
        }
        
        this.updateBatchDownloadDialog(videoInfo);
        document.getElementById('batchDownloadModal').classList.remove('hidden');
    }

    // 创建批量下载模态框
    createBatchDownloadModal() {
        const modalHTML = `
            <div id="batchDownloadModal" class="fixed inset-0 bg-black/90 hidden items-center justify-center z-50">
                <div class="bg-[#111] p-6 rounded-lg border border-[#333] w-11/12 max-w-lg max-h-[80vh] overflow-y-auto">
                    <h2 class="text-xl font-bold text-white mb-4">批量下载</h2>
                    
                    <div class="space-y-4">
                        <div>
                            <div id="batchDownloadInfo" class="text-gray-300"></div>
                        </div>
                        
                        <div class="bg-amber-900/30 border border-amber-500/50 rounded-lg p-3">
                            <div class="text-amber-300 text-sm">
                                <strong>⚠️ 注意事项：</strong><br>
                                • 批量下载将生成所有集数的下载链接<br>
                                • 建议使用专业下载工具（如IDM、Free Download Manager等）<br>
                                • 请遵守视频版权，仅供个人学习使用<br>
                                • 下载过程可能较慢，请耐心等待
                            </div>
                        </div>
                        
                        <div id="batchDownloadOptions">
                            <label class="block text-sm text-gray-400 mb-2">下载格式</label>
                            <label class="flex items-center space-x-2 cursor-pointer mb-2">
                                <input type="radio" name="batchDownloadType" value="links" checked class="text-blue-500">
                                <span>生成下载链接列表</span>
                            </label>
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="batchDownloadType" value="m3u8" class="text-blue-500">
                                <span>下载所有M3U8文件</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 mt-6">
                        <button onclick="videoDownloader.closeBatchDownloadDialog()" 
                                class="px-4 py-2 bg-[#444] hover:bg-[#555] text-white rounded-lg transition-colors">
                            取消
                        </button>
                        <button onclick="videoDownloader.startBatchDownload()" 
                                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            开始批量下载
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // 更新批量下载对话框
    updateBatchDownloadDialog(videoInfo) {
        const infoElement = document.getElementById('batchDownloadInfo');
        infoElement.innerHTML = `
            <div class="text-lg font-medium mb-2">${videoInfo.title}</div>
            <div class="text-gray-400">共 ${videoInfo.episodes.length} 集</div>
            <div class="text-sm text-gray-500 mt-1">当前第 ${videoInfo.index + 1} 集</div>
        `;
    }

    // 开始批量下载
    async startBatchDownload() {
        const videoInfo = this.getCurrentVideoInfo();
        const downloadType = document.querySelector('input[name="batchDownloadType"]:checked')?.value;
        
        if (!downloadType) {
            showToast('请选择下载类型', 'warning');
            return;
        }

        try {
            if (downloadType === 'links') {
                await this.generateDownloadLinks(videoInfo);
            } else if (downloadType === 'm3u8') {
                await this.downloadAllM3U8Files(videoInfo);
            }
        } catch (error) {
            console.error('批量下载失败:', error);
            showToast('批量下载失败: ' + error.message, 'error');
        }
    }

    // 生成所有集数的下载链接
    async generateDownloadLinks(videoInfo) {
        const links = videoInfo.episodes.map((url, index) => 
            `第${index + 1}集: ${url}`
        ).join('\n');
        
        const content = [
            `视频标题: ${videoInfo.title}`,
            `总集数: ${videoInfo.episodes.length}`,
            `生成时间: ${new Date().toLocaleString()}`,
            `来源: ${videoInfo.source}`,
            '',
            '下载链接列表:',
            links
        ].join('\n');
        
        const fileName = this.sanitizeFileName(`${videoInfo.title}_全集下载链接.txt`);
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        window.URL.revokeObjectURL(url);
        
        showToast(`已生成${videoInfo.episodes.length}集的下载链接列表`, 'success');
        this.closeBatchDownloadDialog();
    }

    // 下载所有M3U8文件
    async downloadAllM3U8Files(videoInfo) {
        // 这个功能对于大量集数可能会被浏览器限制
        // 建议限制在20集以内
        if (videoInfo.episodes.length > 20) {
            if (!confirm('集数较多，建议使用"生成下载链接列表"。确定继续下载所有M3U8文件吗？')) {
                return;
            }
        }

        const zip = new JSZip();
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < videoInfo.episodes.length; i++) {
            try {
                const response = await fetch(videoInfo.episodes[i]);
                if (response.ok) {
                    const content = await response.text();
                    const fileName = `第${i + 1}集.m3u8`;
                    zip.file(fileName, content);
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (error) {
                console.error(`下载第${i + 1}集失败:`, error);
                failCount++;
            }
            
            // 显示进度
            const progress = Math.round(((i + 1) / videoInfo.episodes.length) * 100);
            showToast(`下载进度: ${i + 1}/${videoInfo.episodes.length} (${progress}%)`, 'info');
        }

        if (successCount > 0) {
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const fileName = this.sanitizeFileName(`${videoInfo.title}_全集M3U8.zip`);
            
            const url = window.URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            window.URL.revokeObjectURL(url);
        }

        showToast(`下载完成: 成功${successCount}集，失败${failCount}集`, 'success');
        this.closeBatchDownloadDialog();
    }

    // 关闭批量下载对话框
    closeBatchDownloadDialog() {
        const modal = document.getElementById('batchDownloadModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
}

// 创建全局实例
const videoDownloader = new VideoDownloader();

// 快捷键支持
document.addEventListener('keydown', function(e) {
    // Ctrl+D 或 Cmd+D 触发下载
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (typeof videoDownloader !== 'undefined') {
            videoDownloader.downloadCurrentEpisode();
        }
    }
    
    // Ctrl+Shift+D 批量下载
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        if (typeof videoDownloader !== 'undefined') {
            videoDownloader.downloadAllEpisodes();
        }
    }
});

// Toast 通知函数（如果不存在的话）
if (typeof showToast === 'undefined') {
    window.showToast = function(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // 创建简单的toast通知
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 px-4 py-2 rounded-lg text-white z-50 ${
            type === 'success' ? 'bg-green-600' :
            type === 'error' ? 'bg-red-600' :
            type === 'warning' ? 'bg-yellow-600' :
            'bg-blue-600'
        }`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    };
}
