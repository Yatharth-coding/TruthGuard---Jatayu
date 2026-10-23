import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';
import {
  Send,
  Plus,
  MessageSquare,
  Search,
  Trash2,
  Clock,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Bot,
  User,
  ShieldAlert,
} from 'lucide-react';
import { getConversations, getConversation, createConversation, deleteConversation } from '../api/conversations';
import { askQuestion } from '../api/qa';
import EvidenceStatus from '../components/EvidenceStatus';
import CitationList from '../components/CitationList';
import ConflictPanel from '../components/ConflictPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatDate } from '../utils/format';

export default function ChatPage() {
  const { id: routeConvId } = useParams();
  const navigate = useNavigate();

  // Conversations sidebar state
  const [conversations, setConversations] = useState([]);
  const [conversationSearch, setConversationSearch] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Active chat state
  const [activeConvId, setActiveConvId] = useState(routeConvId || null);
  const [messages, setMessages] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [inputQuestion, setInputQuestion] = useState('');
  const [chatError, setChatError] = useState(null);

  // Delete conversation modal state
  const [convToDelete, setConvToDelete] = useState(null);
  const [isDeletingConv, setIsDeletingConv] = useState(false);

  // Auto-scroll ref
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAsking]);

  // Load conversations list
  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const res = await getConversations();
      const list = res.conversations || res.data || (Array.isArray(res) ? res : []);
      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Sync route param with active conversation
  useEffect(() => {
    if (routeConvId && routeConvId !== activeConvId) {
      setActiveConvId(routeConvId);
      loadConversationDetails(routeConvId);
    } else if (!routeConvId) {
      setActiveConvId(null);
      setMessages([]);
    }
  }, [routeConvId]);

  // Load specific conversation messages
  const loadConversationDetails = async (convId) => {
    try {
      setLoadingChat(true);
      setChatError(null);
      const res = await getConversation(convId);
      const conv = res.conversation || res.data || res;
      setMessages(conv.messages || []);
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setChatError(err.response?.data?.message || 'Failed to load conversation history.');
    } finally {
      setLoadingChat(false);
    }
  };

  // Start new conversation
  const handleNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setChatError(null);
    navigate('/chat');
  };

  // Send question handler
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const query = inputQuestion.trim();
    if (!query || isAsking) return;

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setInputQuestion('');
    setChatError(null);

    // Optimistically append user message
    const tempUserMessage = {
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);
    setIsAsking(true);

    try {
      const response = await askQuestion(query, activeConvId);

      // Structure assistant response
      const answerData = response.answer || response.data || response;
      const statusValue =
        response.verificationStatus ||
        response.evidenceStatus ||
        answerData.verificationStatus ||
        answerData.evidenceStatus ||
        answerData.status ||
        'supported';

      const assistantMessage = {
        role: 'assistant',
        content:
          answerData.content ||
          answerData.text ||
          answerData.answer ||
          (typeof response.answer === 'string' ? response.answer : '') ||
          (typeof answerData === 'string' ? answerData : ''),
        evidenceStatus: statusValue,
        verificationStatus: statusValue,
        verificationSummary: answerData.verificationSummary || response.verificationSummary,
        citations: answerData.citations || response.citations || [],
        conflicts: answerData.conflicts || response.conflicts || [],
        limitations: answerData.limitations || response.limitations || [],
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const returnedConvId = response.conversationId || response.conversation?._id || answerData.conversationId;
      if (returnedConvId && returnedConvId !== activeConvId) {
        setActiveConvId(returnedConvId);
        navigate(`/chat/${returnedConvId}`, { replace: true });
        loadConversations();
      }
    } catch (err) {
      console.error('QA analysis failed:', err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'TruthGuard verification engine encountered an error. Please try again.';
      setChatError(errMsg);
    } finally {
      setIsAsking(false);
    }
  };

  // Handle Enter key (Shift+Enter for new line)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-grow textarea
  const handleTextareaChange = (e) => {
    setInputQuestion(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  // Delete conversation
  const handleDeleteConversation = async () => {
    if (!convToDelete) return;
    setIsDeletingConv(true);
    try {
      await deleteConversation(convToDelete._id || convToDelete.id);
      setConvToDelete(null);
      await loadConversations();
      if (activeConvId === (convToDelete._id || convToDelete.id)) {
        handleNewConversation();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete conversation.');
    } finally {
      setIsDeletingConv(false);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) =>
    (c.title || 'Untitled Session').toLowerCase().includes(conversationSearch.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8.5rem)] rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
      {/* Left Sidebar: Conversations list */}
      <div className="w-64 md:w-72 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Top: New Research Button */}
        <div className="p-3 border-b border-gray-200">
          <button
            type="button"
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Investigation</span>
          </button>
        </div>

        {/* Search Conversations */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <Search className="w-4 h-4 absolute inset-y-0 left-2.5 my-auto text-gray-400" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-brand-500 outline-none"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConversations ? (
            <div className="py-8 text-center">
              <LoadingSpinner message="Loading sessions..." size="sm" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-8 px-4 text-center text-xs text-gray-400">
              {conversationSearch ? 'No matching investigations' : 'No prior investigations'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const convId = conv._id || conv.id;
              const isActive = convId === activeConvId;

              return (
                <div
                  key={convId}
                  onClick={() => {
                    navigate(`/chat/${convId}`);
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-900 font-semibold border border-brand-200 shadow-xs'
                      : 'text-gray-700 hover:bg-gray-100/80'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <MessageSquare
                      className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        isActive ? 'text-brand-600' : 'text-gray-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="truncate">{conv.title || 'Untitled Session'}</p>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(conv.updatedAt || conv.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConvToDelete(conv);
                    }}
                    title="Delete session"
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50/50 min-w-0">
        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loadingChat ? (
            <div className="h-full flex items-center justify-center">
              <LoadingSpinner message="Loading verification record..." size="lg" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mb-4 shadow-xs">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Adversarial Document Verification</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Query your documents with automated adversarial validation. TruthGuard cross-references citations, evaluates superseding clauses, and highlights ambiguities or contradictions.
              </p>

              {/* Sample prompts */}
              <div className="mt-6 w-full space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-left">
                  Sample Inquiries
                </p>
                {[
                  'What are the mandatory data retention requirements according to our policies?',
                  'Has any newer policy superseded our contractor background check rules?',
                  'Are there any conflicting requirements across our security guidelines?',
                ].map((sample, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      setInputQuestion(sample);
                      if (textareaRef.current) textareaRef.current.focus();
                    }}
                    className="w-full text-left text-xs bg-white border border-gray-200 hover:border-brand-300 p-2.5 rounded-lg text-gray-700 hover:text-brand-700 hover:bg-brand-50/30 transition-all truncate"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';

                return isUser ? (
                  /* User Message */
                  <div key={index} className="flex justify-end items-start gap-3">
                    <div className="bg-brand-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 max-w-xl shadow-xs">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <span className="text-[10px] text-brand-200 mt-1 block text-right">
                        {formatDate(msg.timestamp, true)}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-brand-700 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                ) : (
                  /* Assistant Message */
                  <div key={index} className="flex justify-start items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-navy-900 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Bot className="w-4 h-4 text-brand-400" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-xs p-5 max-w-3xl shadow-xs flex-1">
                      {/* Evidence Status Badge */}
                      <EvidenceStatus
                        status={msg.evidenceStatus || msg.verificationStatus}
                        message={msg.verificationSummary}
                      />

                      {/* Answer Body (React Markdown) */}
                      <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed space-y-2 select-text">
                        <Markdown>{msg.content}</Markdown>
                      </div>

                      {/* Detected Cross-Document Conflicts */}
                      {msg.conflicts && msg.conflicts.length > 0 && (
                        <ConflictPanel conflicts={msg.conflicts} />
                      )}

                      {/* Limitations / Caveats if any */}
                      {msg.limitations && msg.limitations.length > 0 && (
                        <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                          <div className="font-semibold flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-amber-600" />
                            <span>Verification Limitations & Boundaries</span>
                          </div>
                          <ul className="list-disc pl-5 space-y-0.5 text-amber-800">
                            {msg.limitations.map((limit, lIdx) => (
                              <li key={lIdx}>{limit}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Citation List */}
                      {msg.citations && msg.citations.length > 0 && (
                        <CitationList citations={msg.citations} />
                      )}

                      <div className="mt-3 pt-2 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100">
                        <span>TruthGuard Verified Response</span>
                        <span>{formatDate(msg.timestamp, true)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Active Thinking / Verification State */}
              {isAsking && (
                <div className="flex justify-start items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-navy-900 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <Bot className="w-4 h-4 text-brand-400" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-xs p-5 shadow-xs flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">
                        Analyzing documents & running adversarial verification...
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Checking citations, version precedence, and consistency.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Error Alert */}
              {chatError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{chatError}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          <form onSubmit={handleSend} className="relative flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputQuestion}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={isAsking}
              placeholder="Ask a question about your documents... (Press Enter to send, Shift+Enter for new line)"
              className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none min-h-[46px] max-h-40 leading-relaxed transition-all"
            />
            <button
              type="submit"
              disabled={!inputQuestion.trim() || isAsking}
              className="absolute right-2 bottom-2 p-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              title="Send inquiry"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 px-1">
            <span>Answers are backed by traceable document citations and temporal resolution</span>
            <span className="hidden sm:inline">Shift+Enter for newline</span>
          </div>
        </div>
      </div>

      {/* Delete Conversation Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(convToDelete)}
        title="Delete Investigation Session"
        message={`Are you sure you want to delete session "${convToDelete?.title || 'Untitled Session'}"? All verification queries and citations in this session will be removed.`}
        confirmLabel={isDeletingConv ? 'Deleting...' : 'Delete Session'}
        danger={true}
        onConfirm={handleDeleteConversation}
        onCancel={() => setConvToDelete(null)}
      />
    </div>
  );
}
