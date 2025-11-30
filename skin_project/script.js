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
    quizResult: { // 新增：儲存測驗結果
        attempts: 0,
        completed: false
    },
    actionPlan: {},
    twoWeekReview: {}
};

// 步驟切換功能
function nextStep(step) {
    // 驗證邏輯
    if (step === 2 && !validateStep1()) return;

    // 處理頁面切換
    document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));

    document.getElementById('step' + step).classList.add('active');
    const stepElement = document.querySelector(`.step[data-step="${step}"]`);
    if (stepElement) {
        stepElement.classList.add('active');
    }
    
    // 如果進入測驗步驟，則初始化測驗
    if (step === 4) {
        initializeQuiz();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevStep(step) {
    nextStep(step);
}

// 驗證步驟1 (維持不變)
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

// --- 新增：穴道測驗相關邏輯 ---

// 穴道資料
const ACUPRESSURE_POINTS_DATA = [
    { id: 'zanzhu', name: '攢竹穴', func: '幫助眼周放鬆，改善泡泡眼' },
    { id: 'yingxiang', name: '迎香穴', func: '改善鼻塞，預防法令紋加深' },
    { id: 'dicang', name: '地倉穴', func: '提拉嘴角，預防嘴角下垂' },
    { id: 'jiache', name: '頰車穴', func: '放鬆咀嚼肌，修飾臉部線條' }
];

let selectedName = null;
let selectedFunction = null;
let correctMatches = 0;
let quizAttempts = 0;

// 洗牌函式 (Fisher-Yates Shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 初始化測驗
function initializeQuiz() {
    const namesContainer = document.getElementById('quiz-names');
    const functionsContainer = document.getElementById('quiz-functions');
    const statusEl = document.getElementById('quiz-status');
    const nextBtn = document.getElementById('btn-step4-next');
    
    // 如果已經完成，就不重新初始化
    if (fullData.quizResult.completed) return;

    namesContainer.innerHTML = '';
    functionsContainer.innerHTML = '';
    statusEl.textContent = '請開始配對！';
    nextBtn.disabled = true;

    correctMatches = 0;
    quizAttempts = 0;
    fullData.quizResult.attempts = 0;

    const functions = ACUPRESSURE_POINTS_DATA.map(p => ({ ...p }));
    shuffleArray(functions);

    ACUPRESSURE_POINTS_DATA.forEach(point => {
        const nameEl = document.createElement('div');
        nameEl.className = 'quiz-item';
        nameEl.textContent = point.name;
        nameEl.dataset.id = point.id;
        nameEl.addEventListener('click', () => handleQuizItemClick(nameEl, 'name'));
        namesContainer.appendChild(nameEl);
    });

    functions.forEach(point => {
        const funcEl = document.createElement('div');
        funcEl.className = 'quiz-item';
        funcEl.textContent = point.func;
        funcEl.dataset.id = point.id;
        funcEl.addEventListener('click', () => handleQuizItemClick(funcEl, 'function'));
        functionsContainer.appendChild(funcEl);
    });
}

// 處理測驗項目點擊
function handleQuizItemClick(element, type) {
    if (element.classList.contains('correct')) return;

    const statusEl = document.getElementById('quiz-status');
    statusEl.textContent = '請繼續配對...';

    if (type === 'name') {
        if (selectedName) selectedName.classList.remove('selected');
        selectedName = element;
        selectedName.classList.add('selected');
    } else {
        if (selectedFunction) selectedFunction.classList.remove('selected');
        selectedFunction = element;
        selectedFunction.classList.add('selected');
    }

    if (selectedName && selectedFunction) {
        quizAttempts++;
        fullData.quizResult.attempts = quizAttempts;
        checkMatch();
    }
}

// 檢查配對
function checkMatch() {
    if (selectedName.dataset.id === selectedFunction.dataset.id) {
        // Correct match
        selectedName.classList.remove('selected');
        selectedFunction.classList.remove('selected');
        selectedName.classList.add('correct');
        selectedFunction.classList.add('correct');
        selectedName.style.pointerEvents = 'none';
        selectedFunction.style.pointerEvents = 'none';
        
        correctMatches++;
        document.getElementById('quiz-status').textContent = '配對成功！';

        if (correctMatches === ACUPRESSURE_POINTS_DATA.length) {
            document.getElementById('quiz-status').textContent = `🎉 恭喜！全部配對成功！您總共嘗試了 ${quizAttempts} 次。`;
            document.getElementById('btn-step4-next').disabled = false;
            fullData.quizResult.completed = true;
        }
    } else {
        // Incorrect match
        selectedName.classList.add('incorrect');
        selectedFunction.classList.add('incorrect');
        document.getElementById('quiz-status').textContent = '配對錯誤，請再試一次！';

        setTimeout(() => {
            selectedName.classList.remove('incorrect', 'selected');
            selectedFunction.classList.remove('incorrect', 'selected');
            selectedName = null;
            selectedFunction = null;
        }, 800);
    }

    // Reset selection after a short delay for correct matches too
    if (selectedName && selectedFunction && selectedName.dataset.id === selectedFunction.dataset.id) {
        setTimeout(() => {
            selectedName = null;
            selectedFunction = null;
        }, 200);
    }
}


// --- 既有函式 (維持不變) ---

// 膚質分析核心邏輯
function analyzeSkinType() {
    const tzone = document.querySelector('input[name="tzone"]:checked')?.value;
    const cheeks = document.querySelector('input[name="cheeks"]:checked')?.value;
    const forehead = document.querySelector('input[name="forehead"]:checked')?.value;
    const nose = document.querySelector('input[name="nose"]:checked')?.value;

    if (!tzone || !cheeks || !forehead || !nose) {
        return null;
    }

    let oilyScore = 0;
    let dryScore = 0;

    [tzone, cheeks, forehead, nose].forEach(value => {
        if (value === 'oily') oilyScore++;
        if (value === 'dry') dryScore++;
    });

    let skinType, skinTypeDesc, skinIcon;

    if (oilyScore >= 3) {
        skinType = '油性肌膚';
        skinTypeDesc = '您的肌膚整體偏油，容易出油、毛孔較明顯';
        skinIcon = '💧';
    } else if (dryScore >= 3) {
        skinType = '乾性肌膚';
        skinTypeDesc = '您的肌膚整體偏乾，容易緊繃、缺水';
        skinIcon = '🏜️';
    } else if (tzone === 'oily' && (cheeks === 'dry' || cheeks === 'normal')) {
        skinType = '混合性肌膚';
        skinTypeDesc = 'T字部位容易出油，兩頰偏乾或正常';
        skinIcon = '🎭';
    } else if (oilyScore === 0 && dryScore === 0) {
        skinType = '中性肌膚';
        skinTypeDesc = '您的肌膚狀態良好，油水平衡';
        skinIcon = '✨';
    } else {
        skinType = '混合性肌膚';
        skinTypeDesc = '您的肌膚在不同部位有不同特性';
        skinIcon = '🎭';
    }

    return { skinType, skinTypeDesc, skinIcon, oilyScore, dryScore };
}

function analyzeLifestyleImpact(lifestyle) {
    const issues = [];
    const suggestions = [];

    // 1. 飲食分析 (油炸與甜食)
    if (lifestyle.friedFood === 'daily' || lifestyle.friedFood === 'often') {
        issues.push('高頻率攝取油炸食物');
        suggestions.push('油炸食物容易引發身體發炎反應，可能加劇痘痘與粉刺問題。建議將頻率降低到每週1-2次。');
    }
    if (lifestyle.sugar === 'daily' || lifestyle.sugar === 'often') {
        issues.push('高頻率攝取甜食或含糖飲料');
        suggestions.push('糖分會導致皮膚的膠原蛋白被破壞(糖化反應)，使皮膚提早老化、長皺紋，也可能刺激皮脂分泌。建議減少含糖飲料，改喝水或無糖茶。');
    }

    // 2. 蔬果攝取分析
    if (lifestyle.vegetables === 'sometimes' || lifestyle.vegetables === 'rare') {
        issues.push('蔬菜水果攝取不足');
        suggestions.push('蔬果富含維生素C、E及多種抗氧化物，能幫助皮膚對抗自由基，維持健康與亮澤。請 চেষ্টা (try to) 增加每日的蔬果攝取量。');
    }

    // 3. 飲水習慣分析
    if (lifestyle.waterIntake === 'low') {
        issues.push('每日喝水量可能不足');
        suggestions.push('皮膚缺水時，會顯得乾燥、無光澤，甚至更容易出油來彌補。建議每日至少喝1500ml的水，分次慢慢喝。');
    }
    if (lifestyle.waterType === 'no') {
        issues.push('主要飲品來源為飲料而非白開水');
        suggestions.push('多數飲料含糖量高，對皮膚弊大於利。建立喝白開水的習慣是擁有好皮膚的基礎。');
    }

    // 4. 睡眠習慣分析
    if (lifestyle.sleepHours === 'low') {
        issues.push('睡眠時間不足');
        suggestions.push('睡眠是皮膚自我修復最重要的時間。長期睡眠不足會影響新陳代謝，導致黑眼圈、皮膚暗沉、老化加速。建議每日睡足7-8小時。');
    }
    if (lifestyle.sleepTime === 'late' || lifestyle.sleepTime === 'veryLate') {
        issues.push('就寢時間過晚');
        suggestions.push('人體器官有其休息排毒時間，晚上11點到凌晨3點是肝膽排毒、皮膚修復的黃金時段。建議盡量在11點前就寢。');
    }

    // 5. 運動習慣分析
    if (lifestyle.exercise === 'rare') {
        issues.push('缺乏規律運動');
        suggestions.push('適度運動能促進血液循環，增加皮膚細胞的氧氣與養分供給，並透過排汗幫助毛孔暢通。建議從每週1-2次健走或慢跑開始。');
    }

    return { issues, suggestions };
}
function analyzeAcne(acneLevel) {
    let description = '';
    let causes = [];
    let advice = [];

    switch (acneLevel) {
        case 'severe':
            description = '您似乎經常受到青春痘的困擾。';
            causes = [
                '皮脂腺分泌過度旺盛',
                '毛孔堵塞，清潔不當',
                '痤瘡桿菌增生',
                '飲食、作息、壓力等內分泌影響'
            ];
            advice = [
                '請務必使用溫和的潔面產品，避免過度清潔造成皮膚刺激。',
                '洗臉後應使用清爽、不致痘的保濕產品，維持油水平衡。',
                '避免用手觸摸或擠壓痘痘，以免發炎或留下疤痕。',
                '建議尋求專業皮膚科醫師的協助，找出根本原因並進行治療。'
            ];
            break;
        case 'occasional':
            description = '您偶爾會有青春痘的問題。';
            causes = [
                '可能與特定時期的壓力、作息改變有關',
                '生理期前後的荷爾蒙波動',
                '特定飲食（如高糖、高油）的影響',
                '使用了不適合的保養品或化妝品'
            ];
            advice = [
                '觀察痘痘通常在什麼情況下出現，嘗試找出並避免觸發因子。',
                '長痘期間可局部使用有鎮靜、抗發炎效果的保養品。',
                '確保枕頭套、毛巾等個人用品的清潔。',
                '如果狀況變嚴重，建議諮詢專業意見。'
            ];
            break;
        case 'rare':
            description = '您的皮膚狀況相對穩定，很少長痘。';
            causes = [];
            advice = [
                '恭喜！請繼續維持良好的清潔與保養習慣。',
                '即使不長痘，也要注意日常的保濕與防曬，預防皮膚老化。',
                '當生活習慣改變或壓力變大時，仍需留意皮膚狀況的變化。'
            ];
            break;
        default:
            description = '沒有關於青春痘狀況的資料。';
            advice = ['請完成問卷以獲得分析。'];
            break;
    }

    return { description, causes, advice };
}
function getCleansingAdvice(skinType) {
    let advice = {
        cleanser: '資料不足',
        frequency: '資料不足',
        water: '資料不足',
        method: '資料不足',
        aftercare: '資料不足'
    };

    switch (skinType) {
        case '油性肌膚':
            advice = {
                cleanser: '選擇有控油效果、質地清爽的潔面乳或凝膠，可含有溫和的酸類成分(如水楊酸)幫助代謝角質。',
                frequency: '早晚各洗一次臉即可。過度清潔會刺激皮脂腺分泌更多油脂。',
                water: '使用比體溫略低的溫水(約30-34°C)。過熱的水會洗掉過多皮脂，過冷則不易洗淨油脂。',
                method: '先將潔面乳在手中充分起泡，用指腹輕柔地在臉上畫圈按摩，特別是T字部位，最後用大量清水沖淨。',
                aftercare: '洗臉後立即使用清爽型的化妝水和無油乳液或凝露來保濕，維持油水平衡。'
            };
            break;
        case '乾性肌膚':
            advice = {
                cleanser: '選擇溫和、保濕、不起泡或微泡的潔面乳霜或乳液，避免使用清潔力過強的產品。',
                frequency: '晚上確實清潔即可，早上若無出油感，可用清水洗臉。',
                water: '使用微涼的溫水(約25-30°C)。避免使用熱水，以免洗去保護皮膚的必要油脂。',
                method: '輕柔地按摩臉部，避免過度摩擦。確認潔面產品完全沖洗乾淨，無殘留。',
                aftercare: '洗臉後是保養的黃金時間！立即使用保濕化妝水，並擦上含油份的乳霜或精華油來鎖住水分。'
            };
            break;
        case '混合性肌膚':
            advice = {
                cleanser: '選擇溫和的潔面產品。可以分區保養，T字部位可偶爾使用含控油成分的產品。',
                frequency: '早晚各洗一次臉。出油的T字部位可以加強清潔，乾燥的兩頰則輕柔帶過。',
                water: '使用微涼的溫水，對各種膚況都最為溫和。',
                method: '將泡沫主要集中在T字部位，兩頰輕輕帶過即可，避免過度搓揉乾燥的區域。',
                aftercare: '分區保養是關鍵！T字部位使用清爽型保濕，兩頰則使用較滋潤的乳液或乳霜。'
            };
            break;
        case '中性肌膚':
            advice = {
                cleanser: '恭喜擁有健康的膚質！選擇任何溫和型的潔面產品皆可。',
                frequency: '早晚各洗一次臉，維持良好習慣。',
                water: '溫水或微涼水皆可，主要以舒適為主。',
                method: '用指腹輕柔畫圈按摩全臉，並用清水徹底沖淨。',
                aftercare: '洗臉後使用基礎的保濕乳液，維持皮膚的穩定狀態。並根據季節變化微調保養品。'
            };
            break;
    }
    return advice;
}
function analyzeWaterTemperature(preference) {
    let result = {
        warning: '',
        impact: '',
        suggestion: ''
    };

    switch (preference) {
        case 'hot':
            result = {
                warning: '⚠️ 您偏好使用熱水洗臉',
                impact: `雖然熱水洗臉感覺很舒服，但過高的水溫會過度洗去保護皮膚的必要油脂，破壞皮脂膜的健康。
這會導致皮膚鎖水能力下降，變得更乾、更敏感，甚至刺激皮脂腺分泌更多油脂，造成「越洗越油」的惡性循環。`,
                suggestion: '為了皮膚健康，建議將水溫調整為與體溫相近或略低的「溫水」。'
            };
            break;
        case 'cold':
            result = {
                warning: '🧊 您偏好使用冷水洗臉',
                impact: `用冷水洗臉雖然能讓毛孔暫時收縮，感覺清爽，但對於清潔臉上已經分泌的油脂和髒污效果較差。
如果潔面產品沒有完全乳化或沖洗乾淨，殘留物反而可能堵塞毛孔，引發粉刺問題。`,
                suggestion: '溫水是幫助毛孔適度張開、有效清潔並帶走髒污的最好選擇。'
            };
            break;
        case 'warm':
            result = {
                warning: '',
                impact: '',
                suggestion: ''
            };
            break;
    }
    return result;
}
function getAcupressurePoints() {
    return `
        <div class="result-section">
            <h3>💆 臉部穴道按摩</h3>
            <p>每天花幾分鐘按摩臉部穴道，可以促進血液循環，改善氣色，幫助放鬆。可在洗臉或保養時進行。</p>
            <div class="advice-grid">
                <div class="advice-item">
                    <h4>攢竹穴</h4>
                    <p>位置：眉頭內側邊緣的凹陷處。<br>功效：幫助眼周放鬆，改善泡泡眼。</p>
                </div>
                <div class="advice-item">
                    <h4>迎香穴</h4>
                    <p>位置：鼻翼外緣中點，與法令紋的交會處。<br>功效：改善鼻塞，預防法令紋加深。</p>
                </div>
                <div class="advice-item">
                    <h4>地倉穴</h4>
                    <p>位置：嘴角外側，與瞳孔的垂直線交會處。<br>功效：提拉嘴角，預防嘴角下垂。</p>
                </div>
                 <div class="advice-item">
                    <h4>頰車穴</h4>
                    <p>位置：下顎角前上方約一橫指處，用力咬牙時，咀嚼肌隆起處。<br>功效：放鬆咀嚼肌，修飾臉部線條。</p>
                </div>
            </div>
        </div>
    `;
}

function getWashingSteps() {
    return `
        <div class="result-section">
            <h3>📖 正確洗臉七步驟</h3>
            <ol class="tips-list">
                <li><strong>濕潤臉部：</strong>先用溫水將臉部打濕。</li>
                <li><strong>起泡完全：</strong>取適量潔面產品於掌心，加水搓揉出豐富泡沫。</li>
                <li><strong>分區清潔：</strong>將泡沫先塗抹於T字部位(額頭、鼻子)，輕柔畫圈按摩。</li>
                <li><strong>帶到全臉：</strong>再將泡沫帶到臉頰、下巴等部位，同樣輕柔按摩。</li>
                <li><strong>徹底沖淨：</strong>用大量流動的溫水將泡沫完全沖洗乾淨，特別注意髮際線、下巴及鼻翼兩側。</li>
                <li><strong>溫和拭乾：</strong>使用乾淨的毛巾或面紙，用「按壓」的方式將臉上水分吸乾，避免來回摩擦。</li>
                <li><strong>立即保養：</strong>趁臉部還保有濕潤感時，立即進行後續的化妝水、乳液等保養程序。</li>
            </ol>
        </div>
    `;
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
    const dietContent = document.getElementById('dietContent').value.trim();
    const waterIntake = document.getElementById('waterIntake').value;
    const sleepHours = document.getElementById('sleepHours').value;
    const sleepTime = document.getElementById('sleepTime').value;

    if (!dietContent || !waterIntake || !sleepHours || !sleepTime) {
        alert('請完成所有生活習慣的必填項目');
        return;
    }

    fullData.skinAssessment = {
        tzone: document.querySelector('input[name="tzone"]:checked').value,
        cheeks: document.querySelector('input[name="cheeks"]:checked').value,
        forehead: document.querySelector('input[name="forehead"]:checked').value,
        nose: document.querySelector('input[name="nose"]:checked').value,
        acne: document.querySelector('input[name="acne"]:checked').value,
        water: document.querySelector('input[name="water"]:checked').value,
        afterWash: document.querySelector('input[name="afterWash"]:checked').value
    };
    fullData.lifestyle = {
        dietContent: dietContent, friedFood: document.getElementById('friedFood').value, sugar: document.getElementById('sugar').value,
        vegetables: document.getElementById('vegetables').value, waterIntake: waterIntake, waterType: document.getElementById('waterType').value,
        sleepHours: sleepHours, sleepTime: sleepTime, sleepQuality: document.getElementById('sleepQuality').value, exercise: document.getElementById('exercise').value
    };

    const skinAnalysisResult = analyzeSkinType();
    fullData.analysisResult = {
        skinAnalysis: skinAnalysisResult,
        lifestyleImpact: analyzeLifestyleImpact(fullData.lifestyle),
        acneAnalysis: analyzeAcne(fullData.skinAssessment.acne),
        cleansingAdvice: getCleansingAdvice(skinAnalysisResult.skinType),
        waterAdvice: analyzeWaterTemperature(fullData.skinAssessment.water)
    };
    document.getElementById('results').innerHTML = generateResultsHTMLContent();
    nextStep(3);
}

// Generates the HTML content for displaying results on Step 3
function generateResultsHTMLContent() {
    const { skinAnalysis, lifestyleImpact, acneAnalysis, cleansingAdvice, waterAdvice } = fullData.analysisResult;
    const studentName = fullData.basicInfo.studentName;

    return `
        <div class="result-header">
            <h2>✨ ${studentName}的個人肌膚分析報告</h2>
            <div class="skin-type-badge">
                <span class="badge-icon">${skinAnalysis.skinIcon}</span>
                <span class="badge-text">${skinAnalysis.skinType}</span>
            </div>
            <p class="skin-desc">${skinAnalysis.skinTypeDesc}</p>
        </div>

        <div class="result-section">
            <h3>🎯 您的膚質分析</h3>
            <div class="analysis-summary">
                <div class="summary-item">
                    <span class="label">油性傾向：</span>
                    <div class="progress-bar-small">
                        <div class="progress-fill" style="width: ${skinAnalysis.oilyScore * 25}%"></div>
                    </div>
                    <span>${skinAnalysis.oilyScore}/4</span>
                </div>
                <div class="summary-item">
                    <span class="label">乾性傾向：</span>
                    <div class="progress-bar-small">
                        <div class="progress-fill" style="width: ${skinAnalysis.dryScore * 25}%"></div>
                    </div>
                    <span>${skinAnalysis.dryScore}/4</span>
                </div>
            </div>
        </div>

        <div class="result-section">
            <h3>💊 青春痘狀況</h3>
            <p><strong>${acneAnalysis.description}</strong></p>
            ${acneAnalysis.causes.length > 0 ? `
                <h4>可能原因：</h4>
                <ul class="tips-list">
                    ${acneAnalysis.causes.map(cause => `<li>${cause}</li>`).join('')}
                </ul>
            ` : ''}
            <h4>建議：</h4>
            <ul class="tips-list">
                ${acneAnalysis.advice.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
        </div>

        ${lifestyleImpact.issues.length > 0 ? `
        <div class="result-section warning-section">
            <h3>⚠️ 生活習慣對膚質的影響</h3>
            <h4>發現的問題：</h4>
            <ul class="tips-list">
                ${lifestyleImpact.issues.map(issue => `<li>${issue}</li>`).join('')}
            </ul>
            <h4>改善建議：</h4>
            <ul class="tips-list">
                ${lifestyleImpact.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        ${waterAdvice.warning ? `
        <div class="result-section">
            <h3>${waterAdvice.warning}</h3>
            <p style="white-space: pre-line;">${waterAdvice.impact}</p>
            <p class="highlight-text">💡 ${waterAdvice.suggestion}</p>
        </div>
        ` : ''}

        <div class="result-section">
            <h3>🧴 適合您的清潔建議</h3>
            <div class="advice-grid">
                <div class="advice-item">
                    <h4>🧼 潔面產品選擇</h4>
                    <p>${cleansingAdvice.cleanser}</p>
                </div>
                <div class="advice-item">
                    <h4>⏰ 清潔頻率</h4>
                    <p>${cleansingAdvice.frequency}</p>
                </div>
                <div class="advice-item">
                    <h4>🌡️ 水溫建議</h4>
                    <p>${cleansingAdvice.water}</p>
                </div>
                <div class="advice-item">
                    <h4>✋ 清潔手法</h4>
                    <p>${cleansingAdvice.method}</p>
                </div>
                <div class="advice-item full-width">
                    <h4>💆 洗後保養</h4>
                    <p>${cleansingAdvice.aftercare}</p>
                </div>
            </div>
        </div>

        ${getWashingSteps()}

        ${getAcupressurePoints()}
    `;
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

function completeAndExport() {
    if (saveActionPlanData()) {
        nextStep(6); // Adjusted for new step
    }
}

function prepareInitialPayload() {
    const { basicInfo, selfReflection, skinAssessment, lifestyle, analysisResult, quizResult, actionPlan } = fullData;
    
    const actions = Array.isArray(actionPlan.actions) ? actionPlan.actions : [];

    return {
        submissionTimestamp: new Date().toISOString(),
        className: basicInfo.className || '',
        seatNumber: basicInfo.seatNumber || '',
        studentName: basicInfo.studentName || '',
        studentId: basicInfo.studentId || '',
        age: basicInfo.age || '',
        
        selfImage: selfReflection.selfImage || '',
        idealSkin: selfReflection.idealSkin || '',
        impression: selfReflection.impression || '',
        currentCare: selfReflection.currentCare || '',

        tzone: skinAssessment.tzone || '',
        cheeks: skinAssessment.cheeks || '',
        forehead: skinAssessment.forehead || '',
        nose: skinAssessment.nose || '',
        acne: skinAssessment.acne || '',
        water: skinAssessment.water || '',
        afterWash: skinAssessment.afterWash || '',

        dietContent: lifestyle.dietContent || '',
        friedFood: lifestyle.friedFood || '',
        sugar: lifestyle.sugar || '',
        vegetables: lifestyle.vegetables || '',
        waterIntake: lifestyle.waterIntake || '',
        waterType: lifestyle.waterType || '',
        sleepHours: lifestyle.sleepHours || '',
        sleepTime: lifestyle.sleepTime || '',
        sleepQuality: lifestyle.sleepQuality || '',
        exercise: lifestyle.exercise || '',

        skinType: analysisResult.skinAnalysis ? analysisResult.skinAnalysis.skinType : '',
        oilyScore: analysisResult.skinAnalysis ? analysisResult.skinAnalysis.oilyScore : 0,
        dryScore: analysisResult.skinAnalysis ? analysisResult.skinAnalysis.dryScore : 0,

        quizAttempts: quizResult.attempts || 0, // 新增測驗嘗試次數

        cognitionChange: actionPlan.cognitionChange || '',
        habitImpact: actionPlan.habitImpact || '',
        improvements: actionPlan.improvements || '',

        action1: actions[0] || '',
        action2: actions[1] || '',
        action3: actions[2] || '',
        action4: actions[3] || '',
        action5: actions[4] || '',
        
        expectation: actionPlan.expectation || '',
        difficulty: actionPlan.difficulty || '',
        
        isFinalSubmission: false,
        actionResults: '', skinChange: '', helpfulActions: '', difficulties: '', futureHabits: '', learning: ''
    };
}

function submitInitialReport() {
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
    const { basicInfo, selfReflection, analysisResult, actionPlan } = fullData;
    const { studentName, className, seatNumber, studentId } = basicInfo;
    const { skinAnalysis } = analysisResult;
    const { cognitionChange, habitImpact, improvements, actions, expectation, difficulty } = actionPlan;

    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${studentName}的膚質分析報告</title>
    <style>
        body { font-family: 'Microsoft JhengHei', sans-serif; line-height: 1.8; max-width: 900px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #6366f1; text-align: center; border-bottom: 3px solid #6366f1; padding-bottom: 20px; }
        h2 { color: #6366f1; margin-top: 30px; border-left: 5px solid #6366f1; padding-left: 15px; }
        h3 { color: #4f46e5; margin-top: 20px; }
        .section { margin: 20px 0; padding: 20px; background: #f9fafb; border-radius: 8px; }
        .info-item { margin: 10px 0; }
        .label { font-weight: bold; color: #374151; }
        .value { color: #6b7280; margin-left: 10px; }
        ul { padding-left: 30px; }
        ol { padding-left: 30px; }
        li { margin: 8px 0; }
        .badge { display: inline-block; padding: 5px 15px; background: linear-gradient(135deg, #6366f1, #ec4899); color: white; border-radius: 20px; font-weight: bold; }
        @media print { body { background: white; } .container { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌸 臉部膚質分析報告</h1>

        <div class="section">
            <h2>📝 基本資訊</h2>
            <div class="info-item"><span class="label">班級：</span><span class="value">${className}</span></div>
            <div class="info-item"><span class="label">座號：</span><span class="value">${seatNumber}</span></div>
            <div class="info-item"><span class="label">姓名：</span><span class="value">${studentName}</span></div>
            ${studentId ? `<div class="info-item"><span class="label">學號：</span><span class="value">${studentId}</span></div>` : ''}
            <div class="info-item"><span class="label">年齡範圍：</span><span class="value">${basicInfo.age === 'teen' ? '12-18歲' : basicInfo.age === 'young' ? '19-25歲' : basicInfo.age === 'adult' ? '26-35歲' : '36歲以上'}</span></div>
            <div class="info-item"><span class="label">報告日期：</span><span class="value">${new Date(fullData.metadata.createdAt).toLocaleDateString('zh-TW')}</span></div>
        </div>

        <div class="section">
            <h2>💭 自我認知與期待</h2>
            <h3>對目前膚質的看法：</h3>
            <p>${selfReflection.selfImage}</p>
            <h3>期待的膚質：</h3>
            <p>${selfReflection.idealSkin}</p>
            <h3>希望帶給別人的印象：</h3>
            <p>${selfReflection.impression}</p>
            <h3>目前的保養習慣：</h3>
            <p>${selfReflection.currentCare}</p>
        </div>

        <div class="section">
            <h2>🔍 膚質分析結果</h2>
            <div class="info-item">
                <span class="badge">${skinAnalysis.skinIcon} ${skinAnalysis.skinType}</span>
            </div>
            <p>${skinAnalysis.skinTypeDesc}</p>
        </div>
        
        <div class="section">
            <h2>🎯 後設認知反思</h2>
            <h3>1. 膚質認知的改變：</h3>
            <p>${cognitionChange}</p>
            <h3>2. 生活習慣的影響：</h3>
            <p>${habitImpact}</p>
            <h3>3. 需要改進的地方：</h3>
            <p>${improvements}</p>
        </div>

        <div class="section">
            <h2>📝 兩週行動計畫</h2>
            <ol>
                ${actions.map(action => `<li>${action}</li>`).join('')}
            </ol>
            ${expectation ? `<h3>預期改變：</h3><p>${expectation}</p>` : ''}
            ${difficulty ? `
                <h3>學生自評困難度：</h3>
                <p>${difficulty === 'easy' ? '✅ 容易，我有信心做到' : difficulty === 'medium' ? '⚠️ 普通，需要努力但應該可以' : '⚠️ 困難，但我會盡力嘗試'}</p>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
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
                nextStep(7); // Adjusted for new step
            } catch (error) {
                alert('檔案格式錯誤，請選擇正確的報告檔案。');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function displayPreviousReport() {
    const { basicInfo, actionPlan } = fullData; 
    document.getElementById('previousReport').innerHTML = `
        <div class="result-section">
            <h3>📋 兩週前的基本資料</h3>
            <p><strong>班級：</strong>${basicInfo.className}</p>
            <p><strong>座號：</strong>${basicInfo.seatNumber}</p>
            <p><strong>姓名：</strong>${basicInfo.studentName}</p>
            <p><strong>報告日期：</strong>${new Date(fullData.metadata.createdAt).toLocaleDateString('zh-TW')}</p>
        </div>

        <div class="result-section">
            <h3>📝 您設定的五項行動</h3>
            <ol class="tips-list">
                ${actionPlan.actions.map(action => `<li>${action}</li>`).join('')}
            </ol>
        </div>
    `;
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
    const initialPayload = prepareInitialPayload(); 
    const { twoWeekReview } = fullData;

    const finalPayload = {
        ...initialPayload, 
        ...twoWeekReview, 
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
    const { studentName, className, seatNumber, studentId } = basicInfo;
    const { actionResults, skinChange, helpfulActions, difficulties, futureHabits, learning } = twoWeekReview;
    const { cognitionChange, habitImpact, improvements, actions, expectation, difficulty } = actionPlan;


    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${studentName}的完整學習報告（供教師評分）</title>
    <style>
        body { font-family: 'Microsoft JhengHei', sans-serif; line-height: 1.8; max-width: 1000px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #6366f1; text-align: center; border-bottom: 3px solid #6366f1; padding-bottom: 20px; }
        h2 { color: #6366f1; margin-top: 30px; border-left: 5px solid #6366f1; padding-left: 15px; background: #f0f9ff; padding: 10px 15px; }
        h3 { color: #4f46e5; margin-top: 20px; }
        .section { margin: 20px 0; padding: 20px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; }
        .highlight-section { background: #fef3c7; border-left: 4px solid #f59e0b; }
        .info-item { margin: 10px 0; padding: 10px; background: white; border-radius: 5px; }
        .label { font-weight: bold; color: #374151; }
        .value { color: #6b7280; margin-left: 10px; }
        ul { padding-left: 30px; }
        ol { padding-left: 30px; }
        li { margin: 8px 0; }
        .badge { display: inline-block; padding: 5px 15px; background: linear-gradient(135deg, #6366f1, #ec4899); color: white; border-radius: 20px; font-weight: bold; }
        .timeline { display: flex; justify-content: space-around; margin: 30px 0; padding: 20px; background: #e0e7ff; border-radius: 10px; }
        .timeline-item { text-align: center; }
        .timeline-date { font-size: 0.9em; color: #6b7280; }
        .timeline-label { font-weight: bold; color: #4f46e5; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f3f4f6; font-weight: bold; color: #374151; }
        .grading-note { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        @media print { body { background: white; } .container { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 臉部膚質分析學習完整報告</h1>
        <p style="text-align: center; color: #6b7280;">（供教師評分使用）</p>

        <div class="timeline">
            <div class="timeline-item">
                <div class="timeline-label">初次評估</div>
                <div class="timeline-date">${fullData.metadata.createdAt ? new Date(fullData.metadata.createdAt).toLocaleDateString('zh-TW') : 'N/A'}</div>
            </div>
            <div class="timeline-item">
                <div class="timeline-label">➡️</div>
            </div>
            <div class="timeline-item">
                <div class="timeline-label">執行兩週</div>
                <div class="timeline-date">行動計畫期間</div>
            </div>
            <div class="timeline-item">
                <div class="timeline-label">➡️</div>
            </div>
            <div class="timeline-item">
                <div class="timeline-label">成果檢視</div>
                <div class="timeline-date">${fullData.metadata.twoWeekCheckAt ? new Date(fullData.metadata.twoWeekCheckAt).toLocaleDateString('zh-TW') : 'N/A'}</div>
            </div>
        </div>

        <div class="section">
            <h2>📝 學生基本資料</h2>
            <div class="info-item"><span class="label">班級：</span><span class="value">${className}</span></div>
            <div class="info-item"><span class="label">座號：</span><span class="value">${seatNumber}</span></div>
            <div class="info-item"><span class="label">姓名：</span><span class="value">${studentName}</span></div>
            ${studentId ? `<div class="info-item"><span class="label">學號：</span><span class="value">${studentId}</span></div>` : ''}
            <div class="info-item"><span class="label">年齡範圍：</span><span class="value">${basicInfo.age === 'teen' ? '12-18歲' : basicInfo.age === 'young' ? '19-25歲' : basicInfo.age === 'adult' ? '26-35歲' : '36歲以上'}</span></div>
        </div>

        <div class="section highlight-section">
            <h2>💭 【評分項目一】自我認知與期待（評估前）</h2>
            <div class="grading-note">
                <strong>評分重點：</strong>學生是否能清楚表達對自己的認知、期待是否合理、思考是否深入
            </div>
            <h3>1. 對目前膚質的看法：</h3>
            <p>${selfReflection.selfImage}</p>
            <h3>2. 期待的膚質：</h3>
            <p>${selfReflection.idealSkin}</p>
            <h3>3. 希望帶給別人的印象：</h3>
            <p>${selfReflection.impression}</p>
            <h3>4. 目前的保養習慣：</h3>
            <p>${selfReflection.currentCare}</p>
        </div>

        <div class="section">
            <h2>🔍 膚質與生活習慣評估</h2>
            <h3>膚質分析結果：</h3>
            <div class="info-item">
                <span class="badge">${fullData.analysisResult.skinAnalysis.skinIcon} ${fullData.analysisResult.skinAnalysis.skinType}</span>
                <p>${fullData.analysisResult.skinAnalysis.skinTypeDesc}</p>
            </div>

            <h3>生活習慣評估：</h3>
            <table>
                <tr><th>項目</th><th>學生回答</th></tr>
                <tr><td>飲食內容</td><td>${fullData.lifestyle.dietContent}</td></tr>
                <tr><td>每日喝水量</td><td>${fullData.lifestyle.waterIntake === 'low' ? '少於1000ml' : fullData.lifestyle.waterIntake === 'medium' ? '1000-1500ml' : fullData.lifestyle.waterIntake === 'good' ? '1500-2000ml' : '2000ml以上'}</td></tr>
                <tr><td>睡眠時間</td><td>${fullData.lifestyle.sleepHours === 'low' ? '少於6小時' : fullData.lifestyle.sleepHours === 'medium' ? '6-7小時' : fullData.lifestyle.sleepHours === 'good' ? '7-8小時' : '8小時以上'}</td></tr>
                <tr><td>就寢時間</td><td>${fullData.lifestyle.sleepTime === 'early' ? '晚上10點前' : fullData.lifestyle.sleepTime === 'normal' ? '晚上10-11點' : fullData.lifestyle.sleepTime === 'late' ? '晚上11點-12點' : '凌晨12點後'}</td></tr>
            </table>

            ${fullData.analysisResult.lifestyleImpact.issues.length > 0 ? `
                <h3>生活習慣影響分析：</h3>
                <h4>發現的問題：</h4>
                <ul>${fullData.analysisResult.lifestyleImpact.issues.map(issue => `<li>${issue}</li>`).join('')}</ul>
                <h4>系統建議：</h4>
                <ul>${fullData.analysisResult.lifestyleImpact.suggestions.map(s => `<li>${s}</li>`).join('')}</ul>
            ` : '<p>✅ 生活習慣良好！</p>'}
        </div>

        <div class="section highlight-section">
            <h2>🎯 【評分項目二】後設認知反思（評估後）</h2>
            <div class="grading-note">
                <strong>評分重點：</strong>學生是否能反思自己的認知改變、是否理解生活習慣的影響、是否能找出改進方向
            </div>
            <h3>1. 膚質認知的改變：</h3>
            <p>${cognitionChange}</p>
            <h3>2. 生活習慣的影響：</h3>
            <p>${habitImpact}</p>
            <h3>3. 需要改進的地方：</h3>
            <p>${improvements}</p>
        </div>

        <div class="section highlight-section">
            <h2>📝 【評分項目三】兩週行動計畫</h2>
            <div class="grading-note">
                <strong>評分重點：</strong>計畫是否具體可行、目標是否合理、是否針對自己的問題設定
            </div>
            <ol>
                ${actions.map(action => `<li>${action}</li>`).join('')}
            </ol>
            ${expectation ? `<h3>預期改變：</h3><p>${expectation}</p>` : ''}
            ${difficulty ? `
                <h3>學生自評困難度：</h3>
                <p>${difficulty === 'easy' ? '✅ 容易，我有信心做到' : difficulty === 'medium' ? '⚠️ 普通，需要努力但應該可以' : '⚠️ 困難，但我會盡力嘗試'}</p>
            ` : ''}
        </div>

        <div class="section highlight-section">
            <h2>📊 【評分項目四】兩週後成果檢視</h2>
            <div class="grading-note">
                <strong>評分重點：</strong>執行狀況、誠實度、反思深度、學習成效
            </div>

            <h3>1. 執行情況說明：</h3>
            <p>${actionResults || '未填寫'}</p>
            <h3>2. 膚質改變：</h3>
            <p>${skinChange || '未填寫'}</p>
            <h3>3. 最有幫助的行動：</h3>
            <p>${helpfulActions || '未填寫'}</p>
            <h3>4. 遇到的困難：</h3>
            <p>${difficulties || '未填寫'}</p>
            <h3>5. 未來會繼續的好習慣：</h3>
            <p>${futureHabits || '未填寫'}</p>
            <h3>6. 對自我照顧的新認識：</h3>
            <p>${learning || '未填寫'}</p>
        </div>

        <div class="section">
            <h2>📋 教師評分欄</h2>
            <table>
                <tr>
                    <th>評分項目</th>
                    <th>說明</th>
                    <th style="width: 100px;">得分</th>
                </tr>
                <tr>
                    <td>自我認知與期待</td>
                    <td>表達清晰度、思考深度</td>
                    <td></td>
                </tr>
                <tr>
                    <td>後設認知反思</td>
                    <td>反思能力、理解力</td>
                    <td></td>
                </tr>
                <tr>
                    <td>行動計畫品質</td>
                    <td>計畫的具體性、可行性</td>
                    <td></td>
                </tr>
                <tr>
                    <td>執行與成果</td>
                    <td>實際執行、誠實度、學習成效</td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>總分</strong></td>
                    <td></td>
                    <td></td>
                </tr>
            </table>

            <div style="margin-top: 20px;">
                <p><strong>教師評語：</strong></p>
                <div style="border: 1px solid #d1d5db; min-height: 100px; padding: 10px; background: white; border-radius: 5px;"></div>
            </div>
        </div>

        <div class="section">
            <p style="text-align: center; color: #6b7280; margin-top: 20px;">
                本報告由臉部膚質分析系統自動生成<br>
                報告生成時間：${new Date().toLocaleString('zh-TW')}<br>
                學習期間：${fullData.metadata.createdAt ? new Date(fullData.metadata.createdAt).toLocaleDateString('zh-TW') : 'N/A'} 至 ${fullData.metadata.twoWeekCheckAt ? new Date(fullData.metadata.twoWeekCheckAt).toLocaleDateString('zh-TW') : 'N/A'}
            </p>
        </div>
    </div>
</body>
</html>`;
}

function resetForm() {
    if (confirm('確定要重新開始嗎？所有資料將會清除。')) {
        location.reload();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('臉部膚質分析系統教學版已載入');

    // --- DOMContentLoaded a.k.a. document ready ---
    // Page navigation logic
    const btnStep1Next = document.getElementById('btn-step1-next');
    if (btnStep1Next) {
        btnStep1Next.addEventListener('click', () => nextStep(2));
    }

    const btnStep2Prev = document.getElementById('btn-step2-prev');
    if (btnStep2Prev) {
        btnStep2Prev.addEventListener('click', () => prevStep(1));
    }
    
    const btnAnalyze = document.getElementById('btn-analyze');
    if (btnAnalyze) {
        btnAnalyze.addEventListener('click', analyzeAndShowResults);
    }
    
    const btnStep3Next = document.getElementById('btn-step3-next');
    if (btnStep3Next) {
        btnStep3Next.addEventListener('click', () => nextStep(4));
    }
    
    // New Quiz Step Buttons
    const btnStep4Prev = document.getElementById('btn-step4-prev');
    if (btnStep4Prev) {
        btnStep4Prev.addEventListener('click', () => prevStep(3));
    }
    const btnStep4Next = document.getElementById('btn-step4-next');
    if (btnStep4Next) {
        btnStep4Next.addEventListener('click', () => nextStep(5));
    }
    
    // Renumbered Action Plan Step Buttons
    const btnStep5Prev = document.getElementById('btn-step5-prev');
    if (btnStep5Prev) {
        btnStep5Prev.addEventListener('click', () => prevStep(4));
    }

    const btnComplete = document.getElementById('btn-complete');
    if (btnComplete) {
        btnComplete.addEventListener('click', completeAndExport);
    }

    // Completion page (now Step 6) buttons
    const btnSubmitInitial = document.getElementById('btn-submit-initial');
    if (btnSubmitInitial) {
        btnSubmitInitial.addEventListener('click', submitInitialReport);
    }

    const btnDownloadJson = document.getElementById('btn-download-json');
    if (btnDownloadJson) {
        btnDownloadJson.addEventListener('click', downloadReport);
    }

    const btnDownloadInitialHtml = document.getElementById('btn-download-initial-html');
    if (btnDownloadInitialHtml) {
        btnDownloadInitialHtml.addEventListener('click', downloadInitialHTMLReport);
    }
    
    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
        btnReset.addEventListener('click', resetForm);
    }

    const btnLoadSaved = document.getElementById('btn-load-saved');
    if (btnLoadSaved) {
        btnLoadSaved.addEventListener('click', loadSavedReport);
    }

    // Final submission (now Step 7) buttons
    const btnSubmitFinal = document.getElementById('btn-submit-final');
    if (btnSubmitFinal) {
        btnSubmitFinal.addEventListener('click', submitFinalReport);
    }

    const btnDownloadFinalHtml = document.getElementById('btn-download-final-html');
    if (btnDownloadFinalHtml) {
        btnDownloadFinalHtml.addEventListener('click', downloadFinalHTMLReport);
    }
});