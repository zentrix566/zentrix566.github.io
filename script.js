// 题目库 - 20道题，对应四个维度
const questions = [
    {
        text: "当你需要充电的时候，你更喜欢：",
        options: [
            { text: "和朋友们热闹地聚会", dimension: "E", value: 1 },
            { text: "独自安静地待在家里", dimension: "I", value: 1 }
        ]
    },
    {
        text: "在社交场合中，你通常：",
        options: [
            { text: "主动认识新朋友，享受交流", dimension: "E", value: 1 },
            { text: "比较被动，很少主动搭话", dimension: "I", value: 1 }
        ]
    },
    {
        text: "你更倾向于：",
        options: [
            { text: "边做边想，在实践中调整", dimension: "E", value: 1 },
            { text: "先想清楚再开始行动", dimension: "I", value: 1 }
        ]
    },
    {
        text: "周末朋友约你出去，你会：",
        options: [
            { text: "欣然答应，出去玩更开心", dimension: "E", value: 1 },
            { text: "更想宅家休息，偶尔才出去", dimension: "I", value: 1 }
        ]
    },
    {
        text: "做决定时，你更相信：",
        options: [
            { text: "具体的事实和经验", dimension: "S", value: 1 },
            { text: "灵感和第六感", dimension: "N", value: 1 }
        ]
    },
    {
        text: "你更喜欢谈论：",
        options: [
            { text: "实际发生的事情", dimension: "S", value: 1 },
            { text: "未来可能发生的概念和想法", dimension: "N", value: 1 }
        ]
    },
    {
        text: "当别人向你讲述一件事，你更关注：",
        options: [
            { text: "整体的概括和意义", dimension: "N", value: 1 },
            { text: "具体的细节和细节描述", dimension: "S", value: 1 }
        ]
    },
    {
        text: "学习新东西时，你更喜欢：",
        options: [
            { text: "通过观察和实践掌握", dimension: "S", value: 1 },
            { text: "先理解原理和背后逻辑", dimension: "N", value: 1 }
        ]
    },
    {
        text: "处理问题时，你更注重：",
        options: [
            { text: "以人为本，照顾情绪感受", dimension: "F", value: 1 },
            { text: "以事为本，追求公平正确", dimension: "T", value: 1 }
        ]
    },
    {
        text: "朋友找你倾诉烦恼，你更倾向于：",
        options: [
            { text: "共情对方，先安慰情绪", dimension: "F", value: 1 },
            { text: "分析问题，给出解决方案", dimension: "T", value: 1 }
        ]
    },
    {
        text: "你觉得哪种更重要：",
        options: [
            { text: "和谐的人际关系", dimension: "F", value: 1 },
            { text: "清晰的逻辑和真理", dimension: "T", value: 1 }
        ]
    },
    {
        text: "在争论中，你更看重：",
        options: [
            { text: "维持关系，避免伤害感情", dimension: "F", value: 1 },
            { text: "坚持立场，说出正确观点", dimension: "T", value: 1 }
        ]
    },
    {
        text: "你的生活方式更偏向：",
        options: [
            { text: "计划好，一切井然有序", dimension: "J", value: 1 },
            { text: "随性来，随遇而安更自在", dimension: "P", value: 1 }
        ]
    },
    {
        text: "完成任务时，你更喜欢：",
        options: [
            { text: "提前完成，早早落定", dimension: "J", value: 1 },
            { text: "拖到最后， deadline 才有灵感", dimension: "P", value: 1 }
        ]
    },
    {
        text: "出差旅行前，你会：",
        options: [
            { text: "提前做好详细攻略和计划", dimension: "J", value: 1 },
            { text: "大概准备，到了再说", dimension: "P", value: 1 }
        ]
    },
    {
        text: "你的桌面通常是：",
        options: [
            { text: "干净整洁，东西都放在固定位置", dimension: "J", value: 1 },
            { text: "有点乱，但我知道东西在哪", dimension: "P", value: 1 }
        ]
    },
    {
        text: "你更容易被什么吸引：",
        options: [
            { text: "有规划的日程表", dimension: "J", value: 1 },
            { text: "开放的选择空间", dimension: "P", value: 1 }
        ]
    },
    {
        text: "与人约会，你通常：",
        options: [
            { text: "提前到达，不喜欢迟到", dimension: "J", value: 1 },
            { text: "经常稍微晚一点到", dimension: "P", value: 1 }
        ]
    },
    {
        text: "如果你要去一个新地方，你会：",
        options: [
            { text: "提前查好路线，做好规划", dimension: "J", value: 1 },
            { text: "到了之后边走边看", dimension: "P", value: 1 }
        ]
    },
    {
        text: "你更喜欢工作：",
        options: [
            { text: "一件一件按顺序完成", dimension: "J", value: 1 },
            { text: "同时开好几件事，兴致来了再做", dimension: "P", value: 1 }
        ]
    }
];

// 16种人格类型描述
const personalities = {
    "INTJ": {
        title: "建筑师",
        description: "富有想象力和战略性的思想家，一切都在计划之中。你聪明、独立、有洞察力，对知识有永不满足的渴望。",
        energy: "内向 I",
        cognitive: "直觉 N",
        judging: "思考 T",
        lifestyle: "判断 J",
        strengths: ["战略思维", "独立自主", "理性客观", "意志坚定", "求知欲强"]
    },
    "INTP": {
        title: "逻辑学家",
        description: "优雅的创新者和发明家，对知识有着无法满足的渴望。你聪明好奇，喜欢探索各种可能性。",
        energy: "内向 I",
        cognitive: "直觉 N",
        judging: "思考 T",
        lifestyle: "知觉 P",
        strengths: ["创新思维", "抽象分析", "客观公正", "思维开阔", "适应力强"]
    },
    "ENTJ": {
        title: "指挥官",
        description: "大胆、富有想象力且意志坚强的领导者，总能找到或开创出一条道路。你天生就是领导者，充满魅力和自信。",
        energy: "外向 E",
        cognitive: "直觉 N",
        judging: "思考 T",
        lifestyle: "判断 J",
        strengths: ["高效领导力", "战略眼光", "勇敢果断", "魅力自信", "客观理性"]
    },
    "ENTP": {
        title: "辩论家",
        description: "聪明好奇的思想家，无法抗拒一个智力上的挑战。你思维敏捷，享受和他人进行智力较量。",
        energy: "外向 E",
        cognitive: "直觉 N",
        judging: "思考 T",
        lifestyle: "知觉 P",
        strengths: ["知识渊博", "思维敏捷", "原创创新", "魅力十足", "思想开放"]
    },
    "INFJ": {
        title: "提倡者",
        description: "安静而神秘，同时又非常鼓舞人心，理想主义者。你有很强的洞察力，能够理解复杂的人性。",
        energy: "内向 I",
        cognitive: "直觉 N",
        judging: "情感 F",
        lifestyle: "判断 J",
        strengths: ["富有创造力", "洞察力强", "价值观清晰", " Inspiring 鼓舞人心", "充满热情"]
    },
    "INFP": {
        title: "调停者",
        description: "诗意善良的利他主义者，总是乐于助人。你理想主义，忠于自己的价值观，内心非常柔软。",
        energy: "内向 I",
        cognitive: "直觉 N",
        judging: "情感 F",
        lifestyle: "知觉 P",
        strengths: ["包容开放", "同理心强", "创造力丰富", "充满热情", "思想灵活"]
    },
    "ENFJ": {
        title: "教育家",
        description: "富有魅力和鼓舞人心的领导者，能够出色地吸引听众。你天生擅长与人沟通，善于激励他人。",
        energy: "外向 E",
        cognitive: "直觉 N",
        judging: "情感 F",
        lifestyle: "判断 J",
        strengths: ["善于沟通", "有同理心", "领导力强", "充满热情", "值得信赖"]
    },
    "ENFP": {
        title: "竞选者",
        description: "热情活泼充满创造力的自由灵魂，总能找到微笑的理由。你乐观积极，享受生活中的每一刻。",
        energy: "外向 E",
        cognitive: "直觉 N",
        judging: "情感 F",
        lifestyle: "知觉 P",
        strengths: ["热情洋溢", "创造力强", "乐观积极", "社交能力强", "思想独立"]
    },
    "ISTJ": {
        title: "检查员",
        description: "务实，注重事实，非常可靠。你负责任守规矩，是组织的坚实后盾。",
        energy: "内向 I",
        cognitive: "感觉 S",
        judging: "思考 T",
        lifestyle: "判断 J",
        strengths: ["诚实正直", "负责任", "务实理性", "沉着冷静", "做事有条理"]
    },
    "ISFJ": {
        title: "守卫者",
        description: "非常专注和热情地保护自己在乎的人，温暖无私守护者。你细心周到，值得信赖。",
        energy: "内向 I",
        cognitive: "感觉 S",
        judging: "情感 F",
        lifestyle: "判断 J",
        strengths: ["可靠耐心", "热情贴心", "观察力强", "尽职尽责", "忠诚可靠"]
    },
    "ESTJ": {
        title: "总经理",
        description: "出色的管理者，擅长管理人和事，注重传统和秩序。你务实能干，做事果断。",
        energy: "外向 E",
        cognitive: "感觉 S",
        judging: "思考 T",
        lifestyle: "判断 J",
        strengths: ["出色组织力", "务实", "意志坚强", "信守承诺", "领导力强"]
    },
    "ESFJ": {
        title: "执政官",
        description: "受人欢迎的照顾者，热心和谐地与他人相处。你擅长社交，乐于助人。",
        energy: "外向 E",
        cognitive: "感觉 S",
        judging: "情感 F",
        lifestyle: "判断 J",
        strengths:["善于交际", "乐于助人", "忠于他人", "体贴周到", "有责任感"]
    },
    "ISTP": {
        title: "鉴赏家",
        description: "大胆而实际的实验家，善于运用各种工具。你冷静灵活，喜欢探索动手实践。",
        energy: "内向 I",
        cognitive: "感觉 S",
        judging: "思考 T",
        lifestyle: "知觉 P",
        strengths: ["乐观充满活力", "灵活随性", "动手能力强", "理性务实", "好奇心强"]
    },
    "ISFP": {
        title: "探险家",
        description: "富有魅力又充满活力的艺术家，随时准备探索和体验。你温柔敏感热爱生活。",
        energy: "内向 I",
        cognitive: "感觉 S",
        judging: "情感 F",
        lifestyle: "知觉 P",
        strengths: ["温柔敏感", "艺术感强", "富有想象力", "亲和力强", "热爱生活"]
    },
    "ESTP": {
        title: "企业家",
        description: "聪明精力充沛，热爱冒险生活，非常懂得享受当下。你反应敏捷，喜欢挑战。",
        energy: "外向 E",
        cognitive: "感觉 S",
        judging: "思考 T",
        lifestyle: "知觉 P",
        strengths: ["大胆", "理性务实", "社交能力强", "灵活应变", "充满活力"]
    },
    "ESFP": {
        title: "表演者",
        description: "自发充满活力热爱生活的人，享受当下的快乐。你热情外向，让人忍不住被你吸引。",
        energy: "外向 E",
        cognitive: "感觉 S",
        judging: "情感 F",
        lifestyle: "知觉 P",
        strengths: ["热情洋溢", "原真坦率", "创造能力", "审美能力强", "社交达人"]
    }
};

// 当前状态
let currentQuestion = 0;
let scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
let answers = [];

// DOM 元素
const pages = {
    welcome: document.getElementById('welcome'),
    quiz: document.getElementById('quiz'),
    loading: document.getElementById('loading'),
    result: document.getElementById('result')
};

const elements = {
    startBtn: document.getElementById('start-btn'),
    nextBtn: document.getElementById('next-btn'),
    prevBtn: document.getElementById('prev-btn'),
    retestBtn: document.getElementById('retest-btn'),
    shareBtn: document.getElementById('share-btn'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options'),
    progressFill: document.getElementById('progress-fill'),
    questionCount: document.getElementById('question-count'),
    personalityType: document.getElementById('personality-type'),
    personalityTitle: document.getElementById('personality-title'),
    personalityDesc: document.getElementById('personality-desc'),
    energyTrait: document.getElementById('energy-trait'),
    cognitiveTrait: document.getElementById('cognitive-trait'),
    judgingTrait: document.getElementById('judging-trait'),
    lifestyleTrait: document.getElementById('lifestyle-trait'),
    strengthsList: document.getElementById('strengths-list')
};

// 切换页面
function showPage(pageName) {
    Object.keys(pages).forEach(key => {
        pages[key].classList.remove('active');
    });
    pages[pageName].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 更新进度
function updateProgress() {
    const progress = (currentQuestion / questions.length) * 100;
    elements.progressFill.style.width = progress + '%';
    elements.questionCount.textContent = `${currentQuestion + 1} / ${questions.length}`;
}

// 显示当前题目
function showQuestion() {
    updateProgress();
    const question = questions[currentQuestion];
    elements.questionText.textContent = question.text;
    elements.optionsContainer.innerHTML = '';

    question.options.forEach((option, index) => {
        const div = document.createElement('div');
        div.className = 'option';
        div.textContent = option.text;

        // 如果已经选过，恢复选中状态
        if (answers[currentQuestion] === index) {
            div.classList.add('selected');
        }

        div.addEventListener('click', () => selectOption(index, div));
        elements.optionsContainer.appendChild(div);
    });

    // 更新按钮状态
    elements.prevBtn.disabled = currentQuestion === 0;
    elements.nextBtn.disabled = answers[currentQuestion] === undefined;
}

// 选择选项
function selectOption(optionIndex, element) {
    // 移除之前的选中状态
    const options = elements.optionsContainer.querySelectorAll('.option');
    options.forEach(opt => opt.classList.remove('selected'));

    // 添加当前选中
    element.classList.add('selected');
    answers[currentQuestion] = optionIndex;
    elements.nextBtn.disabled = false;

    // 更新分数
    // 先清空当前题之前的分数
    if (answers[currentQuestion - 1] !== undefined && currentQuestion > 0) {
        const prevQuestion = questions[currentQuestion];
        const prevAnswer = prevQuestion.options[answers[currentQuestion]];
        // 这里其实不用，因为每次跳转只会加一次，回头修改会重新计算
    }
}

// 计算结果
function calculateResult() {
    // 重置分数
    scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

    // 累加分数
    answers.forEach((answerIndex, questionIndex) => {
        const question = questions[questionIndex];
        const option = question.options[answerIndex];
        scores[option.dimension] += option.value;
    });

    // 确定四个维度
    let result = '';
    result += scores.E >= scores.I ? 'E' : 'I';
    result += scores.S >= scores.N ? 'S' : 'N';
    result += scores.T >= scores.F ? 'T' : 'F';
    result += scores.J >= scores.P ? 'J' : 'P';

    return result;
}

// 显示结果
function displayResult(typeCode) {
    const personality = personalities[typeCode];
    elements.personalityType.textContent = typeCode;
    elements.personalityTitle.textContent = personality.title;
    elements.personalityDesc.textContent = personality.description;
    elements.energyTrait.textContent = personality.energy;
    elements.cognitiveTrait.textContent = personality.cognitive;
    elements.judgingTrait.textContent = personality.judging;
    elements.lifestyleTrait.textContent = personality.lifestyle;

    // 渲染优势标签
    elements.strengthsList.innerHTML = '';
    personality.strengths.forEach(strength => {
        const tag = document.createElement('span');
        tag.className = 'strength-tag';
        tag.textContent = strength;
        elements.strengthsList.appendChild(tag);
    });
}

// 开始测试
elements.startBtn.addEventListener('click', () => {
    currentQuestion = 0;
    answers = [];
    showPage('quiz');
    showQuestion();
});

// 下一题
elements.nextBtn.addEventListener('click', () => {
    if (currentQuestion < questions.length - 1) {
        currentQuestion++;
        showQuestion();
    } else {
        // 完成测试，计算结果
        showPage('loading');
        setTimeout(() => {
            const result = calculateResult();
            displayResult(result);
            showPage('result');
        }, 1500);
    }
});

// 上一题
elements.prevBtn.addEventListener('click', () => {
    if (currentQuestion > 0) {
        currentQuestion--;
        showQuestion();
    }
});

// 重新测试
elements.retestBtn.addEventListener('click', () => {
    currentQuestion = 0;
    answers = [];
    showPage('quiz');
    showQuestion();
});

// 分享结果
elements.shareBtn.addEventListener('click', async () => {
    const typeCode = elements.personalityType.textContent;
    const title = elements.personalityTitle.textContent;
    const text = `我的性格测试结果是：${typeCode} ${title}\n\n快来测试一下你的性格吧！`;
    const url = window.location.href;

    // 尝试使用 Web Share API
    if (navigator.share) {
        try {
            await navigator.share({
                title: '性格测试结果',
                text: text,
                url: url
            });
        } catch (e) {
            // 用户取消分享，不用处理
        }
    } else {
        // 不支持分享API，就复制链接到剪贴板
        navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
            alert('链接已复制到剪贴板，可以分享给朋友啦！');
        }).catch(() => {
            alert('无法复制，请手动复制链接分享');
        });
    }
});

// 键盘支持
document.addEventListener('keydown', (e) => {
    if (pages.quiz.classList.contains('active')) {
        if (e.key === 'Enter' && !elements.nextBtn.disabled) {
            elements.nextBtn.click();
        } else if (e.key === 'ArrowLeft' && !elements.prevBtn.disabled) {
            elements.prevBtn.click();
        } else if (e.key === 'ArrowRight' && !elements.nextBtn.disabled) {
            elements.nextBtn.click();
        }
    }
});
