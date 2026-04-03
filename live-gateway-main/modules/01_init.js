// ── module: 01_init  |  original lines 1–165 of gateway.js ──
﻿const express = require('express');
const app = express();
const cors = require('cors');
const https = require('https');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const serverCfg = require('./config/server-mode.node.js');
const { getCurrentServerConfig, printConfig } = serverCfg;
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:8000';

const currentConfig = getCurrentServerConfig();
const port = currentConfig.port; // 直接使用配置中的端口（mock和非mock模式都已配置�?080�?

// ==================== WebSocket 支持 ====================
// 尝试加载 ws 模块（如果未安装需要运�? npm install ws�?
let WebSocketServer;
try {
	const ws = require('ws');
	WebSocketServer = ws.WebSocketServer;
} catch (error) {
	console.warn('⚠️  WebSocket 模块未安装，实时通信功能将不可用。请运行: npm install ws');
	WebSocketServer = null;
}

// WebSocket 客户端连接池
const wsClients = new Set();

// 创建 HTTP 服务器（用于支持 WebSocket�?
const server = http.createServer(app);
let wss = null;

if (WebSocketServer) {
	wss = new WebSocketServer({ server, path: '/ws' });
	
	wss.on('connection', (ws, req) => {
		console.log('�?WebSocket 客户端已连接:', req.socket.remoteAddress);
		wsClients.add(ws);
		
		// 发送欢迎消息和当前状�?
		ws.send(JSON.stringify({
			type: 'connected',
			message: '已连接到实时数据服务'
		}));
		
		// 发送当前状�?
		broadcastCurrentState(ws);
		
		ws.on('message', (message) => {
			try {
				const data = JSON.parse(message);
				handleWebSocketMessage(ws, data);
			} catch (error) {
				console.error('WebSocket 消息解析失败:', error);
			}
		});
		
		ws.on('close', () => {
			console.log('�?WebSocket 客户端已断开');
			wsClients.delete(ws);
		});
		
		ws.on('error', (error) => {
			console.error('WebSocket 错误:', error);
			wsClients.delete(ws);
		});
	});
}

// WebSocket 消息处理
function handleWebSocketMessage(ws, data) {
	switch (data.type) {
		case 'ping':
			ws.send(JSON.stringify({ type: 'pong' }));
			break;
		case 'control-live':
			// 后台管理系统控制直播状�?
			handleLiveControl(data);
			break;
		case 'update-debate':
			// 后台管理系统更新辩论设置
			handleDebateUpdate(data);
			break;
		default:
			console.log('未知�?WebSocket 消息类型:', data.type);
	}
}

// 广播消息给所有客户端
function broadcast(type, data) {
	if (!wss || wsClients.size === 0) return;
	
	const message = JSON.stringify({ type, data, timestamp: Date.now() });
	
	// 移除已关闭的连接
	wsClients.forEach(client => {
		if (client.readyState === 1) { // WebSocket.OPEN
			client.send(message);
		} else {
			wsClients.delete(client);
		}
	});
}

// 广播当前状态（用于新连接）
function broadcastCurrentState(ws) {
	if (!ws || ws.readyState !== 1) return;
	
	try {
		
		const dashboard = { isLive: false, totalVotes: 0 };
		const debate = { title: '', leftPosition: '', rightPosition: '' } /* use backend API */;
		
		ws.send(JSON.stringify({
			type: 'state',
			data: {
				votes: currentVotes,
				debate: debate,
				dashboard: dashboard,
				liveStatus: dashboard.isLive
			},
			timestamp: Date.now()
		}));
	} catch (error) {
		console.error('发送当前状态失�?', error);
	}
}

// 处理直播控制
function handleLiveControl(data) {
	try {
		
		const { action } = data; // 'start' �?'stop'
		
		if (action === 'start') {
			// 开启直�?
			const activeStream = null /* use backend API */;
			if (activeStream) {
				broadcast('live-status-changed', {
					status: 'started',
					streamUrl: activeStream.url,
					timestamp: Date.now()
				});
			}
		} else if (action === 'stop') {
			// 停止直播
			broadcast('live-status-changed', {
				status: 'stopped',
				timestamp: Date.now()
			});
		}
	} catch (error) {
		console.error('处理直播控制失败:', error);
	}
}

// 处理辩论设置更新
function handleDebateUpdate(data) {
	// 这个功能已经通过 REST API 实现了，这里可以添加额外的实时通知
	broadcast('debate-updated', {
		debate: data.debate,
		timestamp: Date.now()
	});
}

// CORS 配置 - 允许所有来源（开发环境）