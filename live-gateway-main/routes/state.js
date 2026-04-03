// Shared in-memory state used across all route modules

const { v4: uuidv4 } = require('uuid');

const currentVotes = {
    leftVotes: 0,
    rightVotes: 0
};

const debateTopic = {
    id: 'debate-default-001',
    title: "如果有一个能一键消除痛苦的按钮，你会按吗？",
    description: "这是一个关于痛苦、成长与人性选择的深度辩论"
};

let globalLiveStatus = {
    isLive: false,
    streamUrl: null,
    scheduledStartTime: null,
    scheduledEndTime: null,
    streamId: null,
    isScheduled: false,
    liveId: null,
    startTime: null
};

let streamLiveStatuses = {};

let globalAIStatus = {
    status: 'stopped',
    aiSessionId: null,
    startTime: null,
    settings: { mode: 'realtime', interval: 5000, sensitivity: 'high', minConfidence: 0.7 },
    statistics: { totalContents: 0, totalWords: 0, averageConfidence: 0 }
};

let liveSchedule = {
    streamId: null,
    scheduledStartTime: null,
    scheduledEndTime: null
};

let debateFlowConfigs = {};

const aiDebateContent = [];

module.exports = {
    currentVotes,
    debateTopic,
    get globalLiveStatus() { return globalLiveStatus; },
    set globalLiveStatus(v) { globalLiveStatus = v; },
    get streamLiveStatuses() { return streamLiveStatuses; },
    set streamLiveStatuses(v) { streamLiveStatuses = v; },
    get globalAIStatus() { return globalAIStatus; },
    set globalAIStatus(v) { globalAIStatus = v; },
    get liveSchedule() { return liveSchedule; },
    set liveSchedule(v) { liveSchedule = v; },
    get debateFlowConfigs() { return debateFlowConfigs; },
    set debateFlowConfigs(v) { debateFlowConfigs = v; },
    aiDebateContent
};
