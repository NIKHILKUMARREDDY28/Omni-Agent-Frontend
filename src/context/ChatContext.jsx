import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { streamAnalysis, checkHealth, ingestFiles, listUploads, deleteUpload } from '../services/api';

const ChatContext = createContext(null);
const DEFAULT_NEW_CHAT_TITLE = 'New chat';
const LS_CONVERSATIONS_KEY = 'omni_conversations';
const LS_ACTIVE_CONV_KEY = 'omni_active_conversation_id';

function generateId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function truncateTitle(text, maxLen = 40) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim() + '…';
}

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage quota exceeded or unavailable — ignore
  }
}

const INITIAL_PIPELINE = [];
const LS_INGESTED_SCHEMAS_KEY = 'omni_ingested_schemas';

export function ChatProvider({ children }) {
  // Conversations — hydrated from localStorage
  const [conversations, setConversations] = useState(() =>
    loadFromStorage(LS_CONVERSATIONS_KEY, [])
  );
  const [activeConversationId, setActiveConversationId] = useState(() =>
    loadFromStorage(LS_ACTIVE_CONV_KEY, null)
  );
  const activeConversationIdRef = useRef(null);

  // Messages for the active conversation — restored from persisted conversation
  const [messages, setMessages] = useState(() => {
    const savedConvId = loadFromStorage(LS_ACTIVE_CONV_KEY, null);
    if (!savedConvId) return [];
    const convs = loadFromStorage(LS_CONVERSATIONS_KEY, []);
    const activeConv = convs.find((c) => c.id === savedConvId);
    return activeConv?.messages || [];
  });

  // Loading / pipeline
  const [isLoading, setIsLoading] = useState(false);
  const [pipelineNodes, setPipelineNodes] = useState(INITIAL_PIPELINE);
  const [pipelineLabels, setPipelineLabels] = useState({});
  const [completedNodes, setCompletedNodes] = useState([]);
  const [currentNode, setCurrentNode] = useState(null);

  // Error
  const [error, setError] = useState(null);

  // Backend health
  const [backendStatus, setBackendStatus] = useState({ ok: false, version: '', checked: false });

  // Uploaded datasets
  const [uploadedDatasets, setUploadedDatasets] = useState([]);

  // Ingested schemas from /api/v1/ingest — keyed by session/conversation id
  const [ingestedSchemas, setIngestedSchemas] = useState(() =>
    loadFromStorage(LS_INGESTED_SCHEMAS_KEY, {})
  );

  // Ref for messages to avoid stale closures
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  activeConversationIdRef.current = activeConversationId;

  const ensureConversation = useCallback((seedText = '', { preferMessageTitle = false } = {}) => {
    const title = preferMessageTitle && seedText ? truncateTitle(seedText) : DEFAULT_NEW_CHAT_TITLE;
    let convId = activeConversationIdRef.current;

    if (!convId) {
      convId = generateId();
      activeConversationIdRef.current = convId;
      setActiveConversationId(convId);
      setConversations((prev) => [
        { id: convId, title, timestamp: Date.now(), messages: [], isDraft: !preferMessageTitle },
        ...prev,
      ]);
      return convId;
    }

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== convId) return conv;
        if (preferMessageTitle && conv.isDraft) {
          return { ...conv, title, isDraft: false, timestamp: Date.now() };
        }
        return { ...conv, timestamp: Date.now() };
      })
    );

    return convId;
  }, []);

  // Persist conversations to localStorage whenever they change
  useEffect(() => {
    saveToStorage(LS_CONVERSATIONS_KEY, conversations);
  }, [conversations]);

  // Persist active conversation id to localStorage whenever it changes
  useEffect(() => {
    saveToStorage(LS_ACTIVE_CONV_KEY, activeConversationId);
  }, [activeConversationId]);

  // Sync active conversation's messages in conversations list whenever messages change
  useEffect(() => {
    if (!activeConversationId) return;
    setConversations((prev) => {
      const activeConv = prev.find((c) => c.id === activeConversationId);
      if (activeConv && activeConv.messages === messages) {
        return prev;
      }
      return prev.map((c) => {
        if (c.id === activeConversationId) {
          return { ...c, messages };
        }
        return c;
      });
    });
  }, [messages, activeConversationId]);

  // Persist ingested schemas to localStorage whenever they change
  useEffect(() => {
    saveToStorage(LS_INGESTED_SCHEMAS_KEY, ingestedSchemas);
  }, [ingestedSchemas]);

  // Check backend health on mount, then poll periodically
  const checkBackend = useCallback(async () => {
    const status = await checkHealth();
    setBackendStatus({ ...status, checked: true });
    return status;
  }, []);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const status = await checkHealth();
      if (mounted) setBackendStatus({ ...status, checked: true });
    };
    check();
    const interval = setInterval(check, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Fetch uploaded datasets on mount
  const refreshDatasets = useCallback(async (threadId) => {
    if (!threadId) {
      setUploadedDatasets([]);
      return;
    }

    try {
      const data = await listUploads(threadId);
      setUploadedDatasets(data.uploads || []);
    } catch {
      setUploadedDatasets([]);
    }
  }, []);

  useEffect(() => {
    refreshDatasets(activeConversationId);
  }, [activeConversationId, refreshDatasets]);

  // Upload a file (legacy - single file via old upload endpoint)
  const handleUpload = useCallback(async (file) => {
    const threadId = ensureConversation();
    const { uploadFile } = await import('../services/api');
    const result = await uploadFile(file, threadId);
    await refreshDatasets(threadId);
    return result;
  }, [ensureConversation, refreshDatasets]);

  // Ingest one or more files via the advanced /api/v1/ingest endpoint
  const handleIngest = useCallback(async (files) => {
    const threadId = ensureConversation();
    const schemaMap = await ingestFiles(files, threadId);
    // Merge the new schema into the existing session schema (accumulate sheets)
    setIngestedSchemas((prev) => {
      const existing = prev[threadId];
      if (!existing) {
        return { ...prev, [threadId]: schemaMap };
      }
      // Merge file_refs and files (avoid duplicates by source_name)
      const existingRefNames = new Set(existing.file_refs.map((r) => r.source_name));
      const newRefs = schemaMap.file_refs.filter((r) => !existingRefNames.has(r.source_name));
      const existingFileNames = new Set(existing.files.map((f) => f.filename));
      const newFiles = schemaMap.files.filter((f) => !existingFileNames.has(f.filename));
      return {
        ...prev,
        [threadId]: {
          ...schemaMap,
          file_refs: [...existing.file_refs, ...newRefs],
          files: [...existing.files, ...newFiles],
          total_files: existing.total_files + newFiles.length,
          total_sheets: existing.total_sheets + schemaMap.total_sheets,
          total_rows: existing.total_rows + schemaMap.total_rows,
        },
      };
    });
    return schemaMap;
  }, [ensureConversation]);

  // Delete an uploaded dataset
  const handleDeleteUpload = useCallback(async (uploadId) => {
    if (!activeConversationId) return;
    await deleteUpload(uploadId, activeConversationId);
    await refreshDatasets(activeConversationId);
  }, [activeConversationId, refreshDatasets]);

  // Start a new chat
  const newChat = useCallback(() => {
    activeConversationIdRef.current = null;
    setActiveConversationId(null);
    setMessages([]);
    messagesRef.current = [];
    setError(null);
    setPipelineNodes(INITIAL_PIPELINE);
    setCompletedNodes([]);
    setCurrentNode(null);
    setUploadedDatasets([]);
  }, []);

  // Switch to an existing conversation
  const switchConversation = useCallback((convId) => {
    const conv = conversations.find((c) => c.id === convId);
    if (conv) {
      activeConversationIdRef.current = convId;
      setActiveConversationId(convId);
      setMessages(conv.messages || []);
      messagesRef.current = conv.messages || [];
      setError(null);
      setPipelineNodes(INITIAL_PIPELINE);
      setCompletedNodes([]);
      setCurrentNode(null);
    }
  }, [conversations]);

  // Send a message
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return;

    setError(null);

    // Create / reuse conversation
    const convId = ensureConversation(text, { preferMessageTitle: true });

    const threadId = convId;

    // Add user message
    const userMsg = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => {
      const next = [...prev, userMsg];
      messagesRef.current = next;
      return next;
    });
    setIsLoading(true);
    setPipelineNodes(INITIAL_PIPELINE);
    setCompletedNodes([]);
    setCurrentNode(null);

    // Placeholder assistant message (will be replaced)
    const assistantMsgId = generateId();
    const placeholderMsg = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      analysisData: null,
      pipelineSteps: [],
    };
    setMessages((prev) => {
      const next = [...prev, placeholderMsg];
      messagesRef.current = next;
      return next;
    });

    let nodeTracker = [];

    // Filter out the placeholder message before sending history
    const history = messagesRef.current
      .filter((m) => m.id !== assistantMsgId)
      .map(({ role, content }) => ({ role, content }));

    try {
      await streamAnalysis(text, threadId, history, {
        onPipelineInfo: ({ nodes, labels }) => {
          setPipelineNodes(nodes);
          setPipelineLabels(labels);
          // Mark first node as current
          if (nodes.length > 0) {
            setCurrentNode(nodes[0]);
          }
        },

        onNodeComplete: ({ node, label, elapsed_seconds, status }) => {
          // Backend may emit a "running" heartbeat; do not treat it as a completed step.
          if (status === 'running') {
            return;
          }
          nodeTracker = [...nodeTracker, { node, label, elapsed: elapsed_seconds }];
          setCompletedNodes([...nodeTracker]);

          // Find the next pending node
          setPipelineNodes((prevNodes) => {
            const idx = prevNodes.indexOf(node);
            if (idx >= 0 && idx < prevNodes.length - 1) {
              setCurrentNode(prevNodes[idx + 1]);
            } else {
              setCurrentNode(null);
            }
            return prevNodes;
          });
        },

        onResult: (result) => {
          const base =
            result.answer ||
            (result.errors?.length ? '' : 'Analysis complete.');
          const errNote =
            result.errors?.length > 0
              ? `\n\n---\n*Warnings:* ${result.errors.join('; ')}`
              : '';
          const content = `${base}${errNote}`.trim() || 'Analysis complete.';

          setMessages((prev) => {
            const next = prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    content,
                    isStreaming: false,
                    analysisData: result,
                    pipelineSteps: nodeTracker,
                  }
                : msg
            );
            messagesRef.current = next;
            return next;
          });
        },

        onError: (errorMsg) => {
          setError(errorMsg);
          setMessages((prev) => {
            const next = prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: `Error: ${errorMsg}`, isStreaming: false }
                : msg
            );
            messagesRef.current = next;
            return next;
          });
        },

        onDone: ({ total_seconds }) => {
          setIsLoading(false);
          setCurrentNode(null);
        },
      });
    } catch (err) {
      setError(err.message || 'Failed to connect to backend');
      setMessages((prev) => {
        const next = prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: `Connection error: ${err.message}`, isStreaming: false }
            : msg
        );
        messagesRef.current = next;
        return next;
      });
      setIsLoading(false);
      setCurrentNode(null);
      // A fetch-level failure (e.g. TypeError: Failed to fetch) means the backend
      // is unreachable — re-check immediately instead of waiting for the next poll.
      if (err instanceof TypeError) {
        checkBackend();
      }
    }
  }, [ensureConversation, isLoading, checkBackend]);

  const value = {
    // State
    conversations,
    activeConversationId,
    messages,
    isLoading,
    error,
    backendStatus,
    retryBackendCheck: checkBackend,

    // Pipeline
    pipelineNodes,
    pipelineLabels,
    completedNodes,
    currentNode,

    // Actions
    sendMessage,
    newChat,
    switchConversation,
    setError,

    // Upload (legacy)
    uploadedDatasets,
    handleUpload,
    handleDeleteUpload,
    refreshDatasets,

    // Ingest (new default)
    ingestedSchemas,
    currentSessionSchema: ingestedSchemas[activeConversationId] || null,
    handleIngest,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
}
