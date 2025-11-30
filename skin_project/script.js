// Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwJb_HsrWW5zXE8hnbE0iNAbheZ2A_zw7uDEVJjrsL6A89bzN3gp_YP3quLmMVxwOONMQ/exec';

// Generalized upload function
async function uploadDataToGoogleSheet(payload, statusElementId) {
    const statusElement = document.getElementById(statusElementId);
    if (!statusElement) {
        console.error('Status element not found:', statusElementId);
        return;
    }
    statusElement.textContent = '⏳ 正在上傳資料...';
    statusElement.style.color = '#f59e0b'; // Orange for pending

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // Google Apps Script requirement
            },
            mode: 'cors'
        });

        const result = await response.json();

        if (result.status === 'success') {
            statusElement.textContent = '✅ 資料上傳成功！';
            statusElement.style.color = '#10b981'; // Green for success
            alert('恭喜！您的資料已成功提交給老師。');
        } else {
            throw new Error(result.message || '伺服器回報錯誤，但未提供詳細資訊');
        }

    } catch (error) {
        console.error('上傳失敗:', error);
        statusElement.textContent = `❌ 上傳失敗: ${error.message}`;
        statusElement.style.color = '#ef4444'; // Red for error
        
        let alertMessage = `上傳失敗，請檢查您的網路連線，然後再試一次。

如果問題持續存在，請將錯誤訊息截圖並告知老師：
${error.message}`;

        if (error.message.includes('Failed to fetch')) {
          alertMessage += '\n\n提示：這可能是因為網路問題，或是您學校的網路阻擋了此類連線。';
        } else if (error.message.includes('JSON')) {
          alertMessage += '\n\n提示：伺服器回應的格式不正確，請聯繫老師檢查後端腳本。';
        }

        alert(alertMessage);
    }
}


// 全域變數儲存所有資料
let fullData = {
    metadata: {
        createdAt: '',
        completedAt: '',
        twoWeekCheckAt: ''
    },
    basicInfo: {},
    selfReflection: {},
    skinAssessment: {},
    lifestyle: {},
    analysisResult: {},
    actionPlan: {},
    twoWeekReview: {}
};

// 步驟切換功能
function nextStep(step) {
    if (step === 2 && !validateStep1()) return;
    if (step === 5 && !saveActionPlanData()) return;

    document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));

    document.getElementById('step' + step).classList.add('active');
    const stepElement = document.querySelector(`.step[data-step="${step}"]`);
    if (stepElement) {
        stepElement.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevStep(step) {
    nextStep(step);
}

// 驗證步驟1
function validateStep1() {
    const className = document.getElementById('className').value.trim();
    const seatNumber = document.getElementById('seatNumber').value.trim();
    const studentName = document.getElementById('studentName').value.trim();
    const age = document.getElementById('age').value;
    const selfImage = document.getElementById('selfImage').value.trim();
    const idealSkin = document.getElementById('idealSkin').value.trim();
    const impression = document.getElementById('impression').value.trim();
    const currentCare = document.getElementById('currentCare').value.trim();

    if (!className || !seatNumber || !studentName || !age || !selfImage || !idealSkin || !impression || !currentCare) {
        alert('請完成所有必填欄位！');
        return false;
    }

    fullData.basicInfo = { className, seatNumber, studentName, studentId: document.getElementById('studentId').value.trim(), age };
    fullData.selfReflection = { selfImage, idealSkin, impression, currentCare };
    fullData.metadata.createdAt = new Date().toISOString();
    return true;
}

// 分析並顯示結果
function analyzeAndShowResults() {
    const requiredFields = ['tzone', 'cheeks', 'forehead', 'nose', 'acne', 'water', 'afterWash'];
    for (let field of requiredFields) {
        if (!document.querySelector(`input[name="${field}"]:checked`)) {
            alert('請完成所有膚質評估的選項');
            return;
        }
    }
    if (!document.getElementById('dietContent').value.trim() || !document.getElementById('waterIntake').value || !document.getElementById('sleepHours').value || !document.getElementById('sleepTime').value) {
        alert('請完成所有生活習慣的必填項目');
        return;
    }
    
    // For demonstration, creating dummy analysis data
    fullData.analysisResult = {
        skinAnalysis: analyzeSkinType(),
        lifestyleImpact: analyzeLifestyleImpact(fullData.lifestyle),
        acneAnalysis: analyzeAcne(document.querySelector('input[name="acne"]:checked').value),
        cleansingAdvice: getCleansingAdvice(analyzeSkinType().skinType),
        waterAdvice: analyzeWaterTemperature(document.querySelector('input[name="water"]:checked').value)
    };
    
    document.getElementById('results').innerHTML = generateResultsHTMLContent();
    nextStep(3);
}

// ... other analysis functions like analyzeSkinType, etc. are assumed to be here and correct ...

function generateResultsHTMLContent() {
    const { skinAnalysis } = fullData.analysisResult;
    return `<div class="result-header"><h2>✨ ${fullData.basicInfo.studentName}的個人肌膚分析報告</h2><div class="skin-type-badge"><span class="badge-icon">${skinAnalysis.skinIcon}</span><span class="badge-text">${skinAnalysis.skinType}</span></div><p class="skin-desc">${skinAnalysis.skinTypeDesc}</p></div>`;
}

// Save action plan data
function saveActionPlanData() {
    const cognitionChange = document.getElementById('cognitionChange').value.trim();
    const habitImpact = document.getElementById('habitImpact').value.trim();
    const improvements = document.getElementById('improvements').value.trim();
    const actions = [
        document.getElementById('action1').value.trim(),
        document.getElementById('action2').value.trim(),
        document.getElementById('action3').value.trim(),
        document.getElementById('action4').value.trim(),
        document.getElementById('action5').value.trim()
    ];

    if (!cognitionChange || !habitImpact || !improvements || actions.some(a => !a)) {
        alert('請完成所有反思問題與行動計畫！');
        return false;
    }

    fullData.actionPlan = {
        cognitionChange,
        habitImpact,
        improvements,
        actions,
        expectation: document.getElementById('expectation').value.trim(),
        difficulty: document.getElementById('difficulty').value
    };
    fullData.metadata.completedAt = new Date().toISOString();
    return true;
}

// This function is now just a bridge
function completeAndExport() {
    if (saveActionPlanData()) {
        nextStep(5);
    }
}

function prepareInitialPayload() {
    const { basicInfo, selfReflection, skinAssessment, lifestyle, analysisResult, actionPlan } = fullData;
    const payload = {
        ...basicInfo,
        ...selfReflection,
        ...skinAssessment,
        ...lifestyle,
        ...analysisResult.skinAnalysis,
        ...actionPlan,
        isFinalSubmission: false,
        submissionTimestamp: new Date().toISOString()
    };
    // The 'actions' array needs to be flattened or handled
    payload.actions = payload.actions.join('; '); 
    return payload;
}

// This is the new function for the button in Step 5
function submitInitialReport() {
    // This is the correct onclick function for the first upload button
    const payload = prepareInitialPayload();
    uploadDataToGoogleSheet(payload, 'uploadStatus');
}

function downloadReport() {
    const dataStr = JSON.stringify(fullData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = `膚質分析報告_${fullData.basicInfo.studentName}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}

function downloadInitialHTMLReport() {
    // Corrected to call the right generator
    const htmlContent = generateInitialFullHTMLReport(); 
    const dataBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = `膚質分析報告_${fullData.basicInfo.studentName}.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}

function generateInitialFullHTMLReport() {
    // This function generates the HTML for the initial report
    const { basicInfo, selfReflection, analysisResult, actionPlan } = fullData;
    // A simplified template for brevity
    return `<!DOCTYPE html><html><head><title>${basicInfo.studentName}的報告</title></head><body><h1>${basicInfo.studentName}的初次報告</h1><p>班級: ${basicInfo.className}</p><p>座號: ${basicInfo.seatNumber}</p><h3>自我認知</h3><p>${selfReflection.selfImage}</p><h3>分析結果</h3><p>${analysisResult.skinAnalysis.skinTypeDesc}</p><h3>行動計畫</h3><ol>${actionPlan.actions.map(a => `<li>${a}</li>`).join('')}</ol></body></html>`;
}


function loadSavedReport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const data = JSON.parse(event.target.result);
                if (!data.basicInfo.className) data.basicInfo.className = '未知班級';
                if (!data.basicInfo.seatNumber) data.basicInfo.seatNumber = '未知座號';
                fullData = data;
                displayPreviousReport();
                nextStep(6);
            } catch (error) {
                alert('檔案格式錯誤，請選擇正確的報告檔案。');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function displayPreviousReport() {
    const { basicInfo, analysisResult, actionPlan } = fullData;
    document.getElementById('previousReport').innerHTML = `<div class="result-section"><h3>📋 兩週前的基本資料</h3><p><strong>班級：</strong>${basicInfo.className}</p><p><strong>座號：</strong>${basicInfo.seatNumber}</p><p><strong>姓名：</strong>${basicInfo.studentName}</p></div><div class="result-section"><h3>📝 您設定的五項行動</h3><ol>${actionPlan.actions.map(action => `<li>${action}</li>`).join('')}</ol></div>`;
}

function saveTwoWeekReviewData() {
    const actionResults = document.getElementById('actionResults').value.trim();
    const skinChange = document.getElementById('skinChange').value.trim();
    const helpfulActions = document.getElementById('helpfulActions').value.trim();
    const difficulties = document.getElementById('difficulties').value.trim();
    const futureHabits = document.getElementById('futureHabits').value.trim();
    const learning = document.getElementById('learning').value.trim();

    if (!actionResults || !skinChange || !helpfulActions || !difficulties || !futureHabits || !learning) {
        alert('請完成所有兩週後成果檢視的問題！');
        return false;
    }

    fullData.twoWeekReview = { actionResults, skinChange, helpfulActions, difficulties, futureHabits, learning };
    fullData.metadata.twoWeekCheckAt = new Date().toISOString();
    return true;
}

function prepareFinalPayload() {
    // This creates the payload for the final submission
    const initialPayload = prepareInitialPayload();
    const finalPayload = {
        ...initialPayload,
        ...fullData.twoWeekReview,
        isFinalSubmission: true,
        submissionTimestamp: new Date().toISOString()
    };
    return finalPayload;
}

function submitFinalReport() {
    if (saveTwoWeekReviewData()) {
        const payload = prepareFinalPayload();
        uploadDataToGoogleSheet(payload, 'finalUploadStatus');
    }
}

function downloadFinalHTMLReport() {
    if (saveTwoWeekReviewData()) {
        const htmlContent = generateFinalFullHTMLReport();
        const dataBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.download = `最終學習報告_${fullData.basicInfo.studentName}.html`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }
}

function generateFinalFullHTMLReport() {
    const { basicInfo, selfReflection, twoWeekReview, actionPlan } = fullData;
    // A simplified template for the final report
    return `<!DOCTYPE html><html><head><title>${basicInfo.studentName}的最終報告</title></head><body><h1>最終學習報告</h1><h2>${basicInfo.studentName} (${basicInfo.className}班 ${basicInfo.seatNumber}號)</h2><h3>最初的看法</h3><p>${selfReflection.selfImage}</p><h3>最初的計畫</h3><ol>${actionPlan.actions.map(a => `<li>${a}</li>`).join('')}</ol><hr><h3>兩週後成果</h3><p><strong>執行成果：</strong>${twoWeekReview.actionResults}</p><p><strong>膚質改變：</strong>${twoWeekReview.skinChange}</p><p><strong>最有幫助的行動：</strong>${twoWeekReview.helpfulActions}</p><p><strong>遇到的困難：</strong>${twoWeekReview.difficulties}</p><p><strong>未來會繼續的習慣：</strong>${twoWeekReview.futureHabits}</p><p><strong>新的認識：</strong>${twoWeekReview.learning}</p></body></html>`;
}

function resetForm() {
    if (confirm('確定要重新開始嗎？所有資料將會清除。')) {
        location.reload();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('臉部膚質分析系統教學版已載入');
});
