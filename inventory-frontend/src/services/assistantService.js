import api from './api';

export const assistantService = {
    async sendMessage(message, history = [], activeWarehouseId = null) {
        const response = await api.post('/assistant/chat', {
            message,
            history,
            activeWarehouseId
        });
        return response.data;
    },

    async streamChatMessage(message, history = [], activeWarehouseId = null, onEvent, signal) {
        const token = localStorage.getItem('jwt_token');
        const baseUrl = api.defaults.baseURL || 'http://localhost:5068/api';

        const response = await fetch(`${baseUrl}/assistant/chat-stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ message, history, activeWarehouseId }),
            signal
        });

        if (!response.ok) {
            let errorText = '';
            try {
                const errJson = await response.json();
                errorText = errJson.message || errJson.reply || response.statusText;
            } catch {
                errorText = await response.text();
            }
            throw new Error(errorText || `Request failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep trailing incomplete line

                let currentEvent = 'token';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) {
                        currentEvent = 'token';
                        continue;
                    }

                    if (trimmed.startsWith('event:')) {
                        currentEvent = trimmed.substring(6).trim();
                    } else if (trimmed.startsWith('data:')) {
                        const dataPayload = trimmed.substring(5).trim();
                        if (dataPayload === '[DONE]') {
                            onEvent?.({ event: 'done' });
                        } else {
                            try {
                                const parsed = JSON.parse(dataPayload);
                                onEvent?.({ ...parsed, event: parsed.event || currentEvent });
                            } catch (err) {
                                console.warn('Failed to parse SSE JSON chunk:', dataPayload, err);
                            }
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    },

    async getSuggestedPrompts() {
        const response = await api.get('/assistant/suggested-prompts');
        return response.data;
    }
};

export default assistantService;
