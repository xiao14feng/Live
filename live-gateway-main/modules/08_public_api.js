// ── module: 08_public_api  |  original lines 2211–2604 of gateway.js ──
		});
	}
});


// 模拟数据
let currentVotes = {
    leftVotes: 0,   // 正方票数
    rightVotes: 0   // 反方票数
};

// 辩题信息
const debateTopic = {
    id: 'debate-default-001', // 辩题ID，用于标识该辩题
    title: "如果有一个能一键消除痛苦的按钮，你会按吗？",
    description: "这是一个关于痛苦、成长与人性选择的深度辩�?
};

// AI智能识别的辩论内�?
const aiDebateContent = [
    {
        id: uuidv4(),
        debate_id: debateTopic.id, // 标识该观点属于哪个辩�?
        text: "正方观点：痛苦是人生成长的必要经历，消除痛苦会让我们失去学习和成长的机会�?,
        side: "left",
        timestamp: new Date().getTime() - 300000, // 5分钟�?
        comments: [
            {
                id: uuidv4(),
                user: "心理学家",
                text: "痛苦确实能促进心理成长，但过度的痛苦也可能造成创伤",
                time: "3分钟�?,
                avatar: "🧠",
                likes: 15
            },
            {
                id: uuidv4(),
                user: "哲学�?,
                text: "尼采说过，那些杀不死我们的，会让我们更强�?,
                time: "4分钟�?,
                avatar: "🤔",
                likes: 23
            }
        ],
        likes: 45
    },
    {
        id: uuidv4(),
        debate_id: debateTopic.id, // 标识该观点属于哪个辩�?
        text: "反方观点：如果能够消除痛苦，为什么不呢？痛苦本身没有价值，消除痛苦可以让人更专注于积极的事情�?,
        side: "right",
        timestamp: new Date().getTime() - 240000, // 4分钟�?
        comments: [
            {
                id: uuidv4(),
                user: "医生",
                text: "作为医生，我见过太多不必要的痛苦，如果能消除，我支持",
                time: "2分钟�?,
                avatar: "👨‍⚕�?,
                likes: 18
            },
            {
                id: uuidv4(),
                user: "患者家�?,
                text: "看着亲人痛苦，我多么希望有这样的按钮",
                time: "3分钟�?,
                avatar: "💝",
                likes: 31
            }
        ],
        likes: 52
    },
    {
        id: uuidv4(),
        debate_id: debateTopic.id, // 标识该观点属于哪个辩�?
        text: "正方回应：痛苦让我们学会同理心，如果所有人都没有痛苦经历，我们如何理解他人的苦难？",
        side: "left",
        timestamp: new Date().getTime() - 180000, // 3分钟�?
        comments: [
            {
                id: uuidv4(),
                user: "社工",
                text: "同理心确实需要痛苦的经历来培�?,
                time: "1分钟�?,
                avatar: "🤝",
                likes: 12
            },
            {
                id: uuidv4(),
                user: "作家",
                text: "很多伟大的文学作品都源于作者的痛苦经历",
                time: "2分钟�?,
                avatar: "📚",
                likes: 19
            }
        ],
        likes: 38
    },
    {
        id: uuidv4(),
        debate_id: debateTopic.id, // 标识该观点属于哪个辩�?
        text: "反方回应：我们可以通过其他方式培养同理心，比如阅读、教育。消除痛苦不等于消除所有负面情绪�?,
        side: "right",
        timestamp: new Date().getTime() - 120000, // 2分钟�?
        comments: [
            {
                id: uuidv4(),
                user: "教育工作�?,
                text: "教育确实可以培养同理心，不一定需要亲身经历痛�?,
                time: "1分钟�?,
                avatar: "👩‍�?,
                likes: 16
            },
            {
                id: uuidv4(),
                user: "心理咨询�?,
                text: "区分痛苦和负面情绪很重要，这个按钮可能只针对真正的痛�?,
                time: "刚刚",
                avatar: "💭",
                likes: 8
            }
        ],
        likes: 41
    },
    {
        id: uuidv4(),
        debate_id: debateTopic.id, // 标识该观点属于哪个辩�?
        text: "正方总结：痛苦是人性的一部分，消除痛苦可能会让我们失去作为人的完整性�?,
        side: "left",
        timestamp: new Date().getTime() - 60000, // 1分钟�?
        comments: [
            {
                id: uuidv4(),
                user: "神学�?,
                text: "痛苦在宗教和哲学中都有其深层意义",
                time: "刚刚",
                avatar: "�?,
                likes: 14
            }
        ],
        likes: 29
    }
];

// 模拟实时票数变化
function simulateVoteChanges() {
    setInterval(() => {
        if (!globalLiveStatus.isLive) return; // 只有直播时才模拟
        // 随机增加票数，模拟观众投�?
        const leftIncrease = Math.floor(Math.random() * 5) + 1;
        const rightIncrease = Math.floor(Math.random() * 5) + 1;
        
        currentVotes.leftVotes += leftIncrease;
        currentVotes.rightVotes += rightIncrease;
        
        console.log(`票数更新: 正方 ${currentVotes.leftVotes}, 反方 ${currentVotes.rightVotes}`);
    }, 3000); // �?秒更新一�?
}

// 模拟AI识别新内�?
function simulateNewAIContent() {
    const newContents = [
        {
            text: "正方补充：痛苦让我们珍惜快乐，没有对比就没有真正的幸福�?,
            side: "left"
        },
        {
            text: "反方补充：现代医学已经在消除很多痛苦，这个按钮只是技术的延伸�?,
            side: "right"
        },
        {
            text: "正方质疑：如果所有人都按这个按钮，社会会变成什么样�?,
            side: "left"
        },
        {
            text: "反方回应：每个人都有自己的选择权，不应该强迫别人承受痛苦�?,
            side: "right"
        }
    ];
    
    setInterval(() => {
        if (!globalLiveStatus.isLive) return; // 只有直播时才模拟AI内容
        const randomContent = newContents[Math.floor(Math.random() * newContents.length)];
        const newContent = {
            id: uuidv4(), // 使用UUID
            debate_id: debateTopic.id, // 标识该观点属于哪个辩�?
            text: randomContent.text,
            side: randomContent.side,
            timestamp: new Date().getTime(),
            comments: [],
            likes: Math.floor(Math.random() * 20) + 10
        };
        
        aiDebateContent.push(newContent);
        console.log(`新增AI内容: ${newContent.text}`);
    }, 15000); // �?5秒添加新内容
}

// API路由

// 获取当前票数
app.get('/api/votes', (req, res) => {
    try {
        const totalVotes = currentVotes.leftVotes + currentVotes.rightVotes;
        res.json({
            success: true,
            data: {
                leftVotes: currentVotes.leftVotes,
                rightVotes: currentVotes.rightVotes,
                totalVotes: totalVotes,
                leftPercentage: totalVotes > 0
                    ? Math.round((currentVotes.leftVotes / totalVotes) * 100)
                    : 50,
                rightPercentage: totalVotes > 0
                    ? Math.round((currentVotes.rightVotes / totalVotes) * 100)
                    : 50
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "获取票数时出�? " + error.message
        });
    }
});

// 获取辩题信息
app.get('/api/debate-topic', (req, res) => {
    try {
        // 确保返回的辩题信息包�?id 字段
        res.json({
            success: true,
            data: {
                id: debateTopic.id,
                title: debateTopic.title,
                description: debateTopic.description
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "获取辩题时出�? " + error.message
        });
    }
});

// 获取AI识别内容
app.get('/api/ai-content', (req, res) => {
    try {
        res.json({
            success: true,
            data: aiDebateContent
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "获取AI内容时出�? " + error.message
        });
    }
});

// 添加评论
app.post('/api/comment', (req, res) => {
    const { contentId, user, text, avatar } = req.body;

    // 参数验证
    if (!contentId || !text) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数: contentId �?text"
        });
    }

    if (typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: "评论内容不能为空"
        });
    }

    const content = aiDebateContent.find(item => item.id === String(contentId));
    if (content) {
        // 使用UUID生成唯一的评论ID
        const newComment = {
            id: uuidv4(),
            user: user || "匿名用户",
            text: text.trim(),
            time: "刚刚",
            avatar: avatar || "👤",
            likes: 0
        };

        content.comments.push(newComment);

        res.json({
            success: true,
            data: newComment
        });
    } else {
        res.status(404).json({
            success: false,
            message: "内容不存�?
        });
    }
});

// 删除评论
app.delete('/api/comment/:commentId', (req, res) => {
    const { commentId } = req.params;
    const { contentId } = req.body;

    // 参数验证
    if (!commentId || !contentId) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数: commentId �?contentId"
        });
    }

    const content = aiDebateContent.find(item => item.id === String(contentId));
    if (!content) {
        return res.status(404).json({
            success: false,
            message: "内容不存�?
        });
    }

    const commentIndex = content.comments.findIndex(c => c.id === String(commentId));
    if (commentIndex === -1) {
        return res.status(404).json({
            success: false,
            message: "评论不存�?
        });
    }

    // 删除评论
    const deletedComment = content.comments.splice(commentIndex, 1)[0];

    res.json({
        success: true,
        data: {
            message: "评论删除成功",
            deletedComment: deletedComment
        }
    });
});

// 点赞
app.post('/api/like', (req, res) => {
    console.log('�?/api/like 路由被调�?);
    console.log('📥 请求参数:', { contentId: req.body.contentId, commentId: req.body.commentId });
    const { contentId, commentId } = req.body;

    // 参数验证
    if (!contentId) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数: contentId"
        });
    }

    const content = aiDebateContent.find(item => item.id === contentId);
    if (content) {
        if (commentId !== undefined && commentId !== null) {
            // 评论点赞
            const comment = content.comments.find(c => c.id === commentId);
            if (comment) {
                comment.likes += 1;
                res.json({
                    success: true,
                    data: { likes: comment.likes }
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: "评论不存�?
                });
            }
        } else {
            // 内容点赞
            content.likes += 1;
            res.json({
                success: true,
                data: { likes: content.likes }
            });
        }
    } else {
        res.status(404).json({
            success: false,
            message: "内容不存�?
        });
    }
});
