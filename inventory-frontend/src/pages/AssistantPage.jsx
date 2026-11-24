import React, { useState, useEffect, useRef } from 'react';
import {
    Sparkles,
    Send,
    Bot,
    User,
    RotateCcw,
    Database,
    Shield,
    ArrowRight,
    Square,
    Loader2
} from 'lucide-react';
import assistantService from '../services/assistantService';

export const AssistantPage = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingStatus, setStreamingStatus] = useState('');
    const [suggestedPrompts, setSuggestedPrompts] = useState([]);
    const [error, setError] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        const fetchPrompts = async () => {
            try {
                const prompts = await assistantService.getSuggestedPrompts();
                setSuggestedPrompts(prompts || []);
            } catch (err) {
                console.error('Failed to load suggested prompts:', err);
            }
        };
        fetchPrompts();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading, isStreaming, streamingStatus]);

    const handleSend = async (textToSend) => {
        const prompt = (textToSend || input).trim();
        if (!prompt || loading || isStreaming) return;

        setError(null);
        setInput('');

        // 1. Add user message
        const userMsg = {
            id: Date.now(),
            role: 'user',
            content: prompt,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const assistantMsgId = Date.now() + 1;
        const assistantPlaceholder = {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            toolsUsed: [],
            isStreaming: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const newMessages = [...messages, userMsg];
        setMessages([...newMessages, assistantPlaceholder]);
        setLoading(true);
        setIsStreaming(true);
        setStreamingStatus('Analyzing inquiry...');

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            // Build history payload for multi-turn context (only role and content)
            const historyPayload = messages
                .filter(m => m.content && !m.isError)
                .map(m => ({
                    role: m.role,
                    content: m.content
                }));

            await assistantService.streamChatMessage(
                prompt,
                historyPayload,
                null,
                (evt) => {
                    if (evt.event === 'thinking') {
                        setStreamingStatus(evt.message || 'Analyzing inquiry...');
                    } else if (evt.event === 'tool_start') {
                        setStreamingStatus(evt.message || `Consulting ${evt.tool}...`);
                        setMessages((prev) =>
                            prev.map((m) => {
                                if (m.id !== assistantMsgId) return m;
                                const tools = m.toolsUsed || [];
                                return {
                                    ...m,
                                    toolsUsed: tools.includes(evt.tool) ? tools : [...tools, evt.tool]
                                };
                            })
                        );
                    } else if (evt.event === 'tool_complete') {
                        setStreamingStatus(`Analyzing results from ${evt.tool}...`);
                    } else if (evt.event === 'token') {
                        setStreamingStatus('');
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantMsgId
                                    ? { ...m, content: (m.content || '') + (evt.delta || '') }
                                    : m
                            )
                        );
                    } else if (evt.event === 'done') {
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantMsgId
                                    ? {
                                          ...m,
                                          isStreaming: false,
                                          toolsUsed: evt.toolsUsed || m.toolsUsed || []
                                      }
                                    : m
                            )
                        );
                        setIsStreaming(false);
                        setStreamingStatus('');
                    } else if (evt.event === 'error') {
                        const errMsg = evt.error || evt.message || 'Error occurred during generation.';
                        setError(errMsg);
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantMsgId
                                    ? {
                                          ...m,
                                          isStreaming: false,
                                          isError: true,
                                          content: m.content ? `${m.content}\n\n⚠️ ${errMsg}` : `⚠️ ${errMsg}`
                                      }
                                    : m
                            )
                        );
                        setIsStreaming(false);
                        setStreamingStatus('');
                    }
                },
                abortController.signal
            );
        } catch (err) {
            if (err.name === 'AbortError') {
                // User intentionally cancelled stream
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantMsgId
                            ? {
                                  ...m,
                                  isStreaming: false,
                                  content: m.content || '(Generation stopped by user)'
                              }
                            : m
                    )
                );
            } else {
                console.error('Assistant streaming error:', err);
                const errMsg = err.message || 'Unable to communicate with the AI model. Please verify your connection.';
                setError(errMsg);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantMsgId
                            ? {
                                  ...m,
                                  isStreaming: false,
                                  isError: true,
                                  content: m.content ? `${m.content}\n\n⚠️ ${errMsg}` : `⚠️ ${errMsg}`
                              }
                            : m
                    )
                );
            }
        } finally {
            setLoading(false);
            setIsStreaming(false);
            setStreamingStatus('');
            abortControllerRef.current = null;
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleStopGenerating = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsStreaming(false);
        setLoading(false);
        setStreamingStatus('');
    };

    const handleClearChat = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setMessages([]);
        setError(null);
        setLoading(false);
        setIsStreaming(false);
        setStreamingStatus('');
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    // ChatGPT-Grade Markdown & Table Formatter
    const renderInline = (text) => {
        if (!text) return '';
        const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
        return parts.map((part, idx) => {
            if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
                return (
                    <code
                        key={idx}
                        className="font-mono text-[11px] bg-slate-100 dark:bg-[#111827] text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#334155]"
                    >
                        {part.slice(1, -1)}
                    </code>
                );
            }
            if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                return (
                    <strong key={idx} className="font-bold text-slate-900 dark:text-white">
                        {part.slice(2, -2)}
                    </strong>
                );
            }
            return part;
        });
    };

    const renderTableBlock = (tableLines, key) => {
        if (tableLines.length === 0) return null;

        const headers = tableLines[0]
            .split('|')
            .map((s) => s.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

        if (headers.length === 0) return null;

        const hasSeparator = tableLines.length > 1 && tableLines[1].includes('-');
        const rowStartIndex = hasSeparator ? 2 : 1;

        const rows = tableLines
            .slice(rowStartIndex)
            .map((line) =>
                line
                    .split('|')
                    .map((s) => s.trim())
                    .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
            )
            .filter((row) => row.length > 0);

        return (
            <div
                key={key}
                className="my-3 w-full max-w-full overflow-x-auto min-w-0 rounded-xl border border-slate-200 dark:border-[#334155] shadow-2xs bg-white dark:bg-[#1E293B]"
            >
                <table className="w-full text-left text-xs min-w-full divide-y divide-slate-200 dark:divide-[#334155]">
                    <thead className="bg-slate-50 dark:bg-[#111827] text-[11px] font-bold text-slate-700 dark:text-[#CBD5E1] uppercase tracking-wider">
                        <tr>
                            {headers.map((h, idx) => (
                                <th key={idx} className="px-3.5 py-2.5 whitespace-nowrap font-semibold">
                                    {renderInline(h)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#334155]/60 bg-white dark:bg-[#1E293B]">
                        {rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50/60 dark:hover:bg-[#273449]/50 transition">
                                {row.map((cell, cIdx) => (
                                    <td
                                        key={cIdx}
                                        className="px-3.5 py-2 text-slate-700 dark:text-[#F1F5F9] whitespace-nowrap text-[11px]"
                                    >
                                        {renderInline(cell)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderMessageContent = (content, isCurrentStreaming) => {
        if (!content) {
            return isCurrentStreaming ? (
                <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse align-middle" />
            ) : null;
        }

        const lines = content.split('\n');
        const elements = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();

            // Tables: check if starts and ends with |
            if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
                const tableLines = [trimmed];
                i++;
                while (i < lines.length) {
                    const nextTrimmed = lines[i].trim();
                    if (nextTrimmed.startsWith('|') && nextTrimmed.endsWith('|')) {
                        tableLines.push(nextTrimmed);
                        i++;
                    } else {
                        break;
                    }
                }
                elements.push(renderTableBlock(tableLines, `tbl-${i}`));
                continue;
            }

            // Headings
            if (trimmed.startsWith('### ')) {
                elements.push(
                    <h3
                        key={`h3-${i}`}
                        className="text-xs font-bold text-slate-900 dark:text-white mt-3 mb-1 first:mt-0 tracking-wide uppercase"
                    >
                        {renderInline(trimmed.substring(4))}
                    </h3>
                );
                i++;
                continue;
            }
            if (trimmed.startsWith('## ')) {
                elements.push(
                    <h2
                        key={`h2-${i}`}
                        className="text-sm font-bold text-slate-900 dark:text-white mt-3.5 mb-1.5 first:mt-0"
                    >
                        {renderInline(trimmed.substring(3))}
                    </h2>
                );
                i++;
                continue;
            }
            if (trimmed.startsWith('# ')) {
                elements.push(
                    <h1
                        key={`h1-${i}`}
                        className="text-base font-extrabold text-slate-900 dark:text-white mt-4 mb-2 first:mt-0"
                    >
                        {renderInline(trimmed.substring(2))}
                    </h1>
                );
                i++;
                continue;
            }

            // Unordered list
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const listItems = [trimmed.substring(2)];
                i++;
                while (i < lines.length) {
                    const nextTrimmed = lines[i].trim();
                    if (nextTrimmed.startsWith('- ') || nextTrimmed.startsWith('* ')) {
                        listItems.push(nextTrimmed.substring(2));
                        i++;
                    } else {
                        break;
                    }
                }
                elements.push(
                    <ul
                        key={`ul-${i}`}
                        className="my-1.5 space-y-1 list-disc list-outside pl-4 text-slate-700 dark:text-[#E2E8F0]"
                    >
                        {listItems.map((item, idx) => (
                            <li key={idx} className="leading-relaxed">
                                {renderInline(item)}
                            </li>
                        ))}
                    </ul>
                );
                continue;
            }

            // Numbered list
            if (/^\d+\.\s+/.test(trimmed)) {
                const listItems = [trimmed.replace(/^\d+\.\s+/, '')];
                i++;
                while (i < lines.length) {
                    const nextTrimmed = lines[i].trim();
                    if (/^\d+\.\s+/.test(nextTrimmed)) {
                        listItems.push(nextTrimmed.replace(/^\d+\.\s+/, ''));
                        i++;
                    } else {
                        break;
                    }
                }
                elements.push(
                    <ol
                        key={`ol-${i}`}
                        className="my-1.5 space-y-1 list-decimal list-outside pl-4 text-slate-700 dark:text-[#E2E8F0]"
                    >
                        {listItems.map((item, idx) => (
                            <li key={idx} className="leading-relaxed">
                                {renderInline(item)}
                            </li>
                        ))}
                    </ol>
                );
                continue;
            }

            // Blockquote
            if (trimmed.startsWith('> ')) {
                elements.push(
                    <blockquote
                        key={`bq-${i}`}
                        className="border-l-3 border-indigo-500 pl-3 my-2 text-slate-600 dark:text-[#CBD5E1] italic"
                    >
                        {renderInline(trimmed.substring(2))}
                    </blockquote>
                );
                i++;
                continue;
            }

            // Regular paragraph
            if (trimmed.length > 0) {
                elements.push(
                    <p key={`p-${i}`} className="my-1 leading-relaxed text-slate-800 dark:text-[#F1F5F9] break-words">
                        {renderInline(trimmed)}
                    </p>
                );
            }

            i++;
        }

        return elements;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8.5rem)] max-h-[calc(100vh-8.5rem)] w-full max-w-5xl mx-auto min-w-0">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#334155] shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs shrink-0">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg font-extrabold text-slate-900 dark:text-[#F1F5F9]">
                                AI Inventory Assistant
                            </h1>
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                                <Database className="h-3 w-3" /> Live Data
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#111827] px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#334155]">
                                <Shield className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Read-Only
                            </span>
                            {isStreaming && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 animate-pulse">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Streaming
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                            Grounded intelligence powered by <code className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">nvidia/nemotron-3-ultra-550b-a55b:free</code>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                        onClick={handleClearChat}
                        disabled={messages.length === 0 && !isStreaming}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-[#273449] transition disabled:opacity-50 cursor-pointer shadow-2xs"
                        title="Reset conversation session"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>New Chat</span>
                    </button>
                </div>
            </div>

            {/* Chat Body Container */}
            <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-3 pr-1 min-w-0">
                {messages.length === 0 ? (
                    /* Empty State with Suggested Queries */
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-6">
                        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-50 dark:bg-[#1E293B] border border-indigo-100 dark:border-[#334155] text-indigo-600 dark:text-indigo-400 shadow-sm">
                            <Bot className="h-7 w-7" />
                        </div>
                        <div className="max-w-md space-y-1">
                            <h2 className="text-base font-bold text-slate-900 dark:text-[#F1F5F9]">
                                How can I assist with your warehouse today?
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                                Ask any question about real stock levels, low-stock reorder alerts, purchase & sales orders, or audit ledger movements.
                            </p>
                        </div>

                        {suggestedPrompts.length > 0 && (
                            <div className="w-full max-w-2xl space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] block text-center">
                                    Suggested Questions
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                                    {suggestedPrompts.map((prompt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSend(prompt)}
                                            className="p-3 rounded-2xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-[#273449] transition text-xs font-medium text-slate-800 dark:text-[#F1F5F9] flex items-center justify-between gap-2 shadow-2xs group cursor-pointer"
                                        >
                                            <span className="line-clamp-2">{prompt}</span>
                                            <ArrowRight className="h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0 transition" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Active Chat Stream */
                    messages.map((msg) => {
                        const isUser = msg.role === 'user';
                        const isCurrentlyStreaming = msg.isStreaming && isStreaming;

                        return (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150 min-w-0`}
                            >
                                {!isUser && (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5 shadow-xs">
                                        <Bot className="h-4 w-4" />
                                    </div>
                                )}

                                <div className={`flex flex-col max-w-[90%] sm:max-w-[82%] min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                                    <div
                                        className={`p-3.5 rounded-2xl text-xs min-w-0 max-w-full break-words shadow-2xs ${
                                            isUser
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : msg.isError
                                                ? 'border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 rounded-tl-none'
                                                : 'border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9] rounded-tl-none'
                                        }`}
                                    >
                                        {/* Tools Used Badge (Transparency of retrieved facts) */}
                                        {!isUser && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                                            <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-100 dark:border-[#334155] flex-wrap">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] flex items-center gap-1">
                                                    <Database className="h-2.5 w-2.5 text-indigo-500" /> Tools consulted:
                                                </span>
                                                {msg.toolsUsed.map((tool, tIdx) => (
                                                    <span
                                                        key={tIdx}
                                                        className="font-mono text-[10px] font-semibold bg-slate-100 dark:bg-[#111827] text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#334155]"
                                                    >
                                                        {tool}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Message Content */}
                                        <div className="space-y-1 min-w-0 max-w-full">
                                            {isUser ? (
                                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                            ) : (
                                                <>
                                                    {renderMessageContent(msg.content, isCurrentlyStreaming)}
                                                    {isCurrentlyStreaming && (
                                                        <span className="inline-block w-1.5 h-3.5 ml-1 bg-indigo-500 animate-pulse align-middle" />
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <span className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-1 px-1">
                                        {msg.timestamp}
                                    </span>
                                </div>

                                {isUser && (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200 dark:bg-[#273449] text-slate-700 dark:text-[#CBD5E1] shrink-0 mt-0.5">
                                        <User className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}

                {/* Thinking / Streaming Status Indicator */}
                {isStreaming && streamingStatus && (
                    <div className="flex gap-3 justify-start animate-in fade-in min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shrink-0 shadow-xs">
                            <Bot className="h-4 w-4" />
                        </div>
                        <div className="p-3 rounded-2xl rounded-tl-none border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-xs flex items-center gap-2.5">
                            <div className="flex gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-xs font-semibold text-slate-600 dark:text-[#CBD5E1]">
                                {streamingStatus}
                            </span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Bottom Controls & Input Area */}
            <div className="pt-2 border-t border-slate-200 dark:border-[#334155] shrink-0 space-y-2 min-w-0">
                {/* Stop Generating Button */}
                {isStreaming && (
                    <div className="flex justify-center -mt-1 mb-1 animate-in fade-in">
                        <button
                            type="button"
                            onClick={handleStopGenerating}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-[#475569] bg-white dark:bg-[#1E293B] px-3.5 py-1 text-xs font-semibold text-slate-700 dark:text-[#F1F5F9] shadow-sm hover:bg-slate-50 dark:hover:bg-[#273449] cursor-pointer transition"
                        >
                            <Square className="h-3 w-3 fill-rose-500 text-rose-500" />
                            <span>Stop Generating</span>
                        </button>
                    </div>
                )}

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="relative flex items-center"
                >
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Ask about inventory, low-stock reorder points, stock ledger, purchase or sales orders..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading || isStreaming}
                        className="w-full rounded-2xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1E293B] pl-4 pr-12 py-3 text-xs text-slate-900 dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 shadow-xs transition disabled:opacity-60"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading || isStreaming}
                        className="absolute right-2.5 h-8 w-8 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-40 disabled:hover:bg-indigo-600 cursor-pointer shadow-xs"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>

                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-[#94A3B8] px-1">
                    <span className="flex items-center gap-1 truncate">
                        <Shield className="h-3 w-3 text-emerald-500 shrink-0" /> Strictly read-only analysis. No operational writes.
                    </span>
                    <span className="hidden sm:inline font-mono shrink-0">
                        Press Enter to send
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AssistantPage;