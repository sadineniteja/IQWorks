import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  MessageCircle, 
  Settings, 
  Send, 
  Plus, 
  Bot,
  User, 
  Globe, 
  Cpu, 
  Trash2,
  Copy,
  Moon,
  Sun,
  Sparkles
} from 'lucide-react'
import './App.css'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatSession {
  session_id: string
  messages: ChatMessage[]
  created_at: string
  updated_at: string
  title?: string
}

interface ChatConfig {
  url: string
  port: string
  use_web: boolean
  role: string
  temperature: number
  max_tokens: number
}

function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [config, setConfig] = useState<ChatConfig>({
    url: 'app-hbmuchch.fly.dev',
    port: '443',
    use_web: false,
    role: 'teacher',
    temperature: 0.7,
    max_tokens: 400
  })
  const [darkMode, setDarkMode] = useState(false)
  const [error, setError] = useState<string>('')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [sessions, activeSessionId])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const createNewSession = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/chat/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      
      const newSession: ChatSession = {
        session_id: data.session_id,
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        title: `Chat ${sessions.length + 1}`
      }
      
      setSessions(prev => [...prev, newSession])
      setActiveSessionId(data.session_id)
      setError('')
    } catch (err) {
      setError('Failed to create new session')
      console.error('Error creating session:', err)
    }
  }

  const sendMessage = async () => {
    if (!message.trim() || isLoading || !activeSessionId) return

    const userMessage = message.trim()
    setMessage('')
    setIsLoading(true)
    setError('')

    try {
      const protocol = config.url === 'localhost' ? 'http' : 'https'
      const response = await fetch(`${protocol}://${config.url}:${config.port}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          web: config.use_web,
          role: config.role,
          temperature: config.temperature,
          max_tokens: config.max_tokens
        })
      })

      const data = await response.json()
      const aiResponse = data.response || data.content || JSON.stringify(data)
      
      const userMsg = {
        role: 'user' as const,
        content: userMessage,
        timestamp: new Date().toISOString()
      }
      
      const aiMsg = {
        role: 'assistant' as const,
        content: aiResponse,
        timestamp: new Date().toISOString()
      }
      
      setSessions(prev => prev.map(session => 
        session.session_id === activeSessionId 
          ? {
              ...session,
              messages: [
                ...session.messages,
                userMsg,
                aiMsg
              ],
              updated_at: new Date().toISOString()
            }
          : session
      ))
    } catch (err) {
      setError('Failed to send message')
      console.error('Error sending message:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteSession = async (sessionId: string) => {
    try {
      await fetch(`${API_BASE}/api/chat/session/${sessionId}`, {
        method: 'DELETE'
      })
      
      setSessions(prev => prev.filter(s => s.session_id !== sessionId))
      
      if (activeSessionId === sessionId) {
        const remainingSessions = sessions.filter(s => s.session_id !== sessionId)
        setActiveSessionId(remainingSessions.length > 0 ? remainingSessions[0].session_id : '')
      }
    } catch (err) {
      setError('Failed to delete session')
      console.error('Error deleting session:', err)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const activeSession = sessions.find(s => s.session_id === activeSessionId)

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* Sidebar */}
        <div className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI Chat Pro
                </h1>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDarkMode(!darkMode)}
                  className="w-8 h-8 p-0"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Configuration</SheetTitle>
                      <SheetDescription>
                        Configure your AI model settings and preferences
                      </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6 mt-6">
                      <div className="space-y-2">
                        <Label htmlFor="url">URL</Label>
                        <Input
                          id="url"
                          value={config.url}
                          onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
                          placeholder="Enter server URL (e.g., localhost, 192.168.1.100)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input
                          id="port"
                          value={config.port}
                          onChange={(e) => setConfig(prev => ({ ...prev, port: e.target.value }))}
                          placeholder="Enter port number (e.g., 8000)"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="use-web"
                          checked={config.use_web}
                          onCheckedChange={(checked) => setConfig(prev => ({ ...prev, use_web: checked }))}
                        />
                        <Label htmlFor="use-web" className="flex items-center space-x-2">
                          <Globe className="w-4 h-4" />
                          <span>Use Web Enhancement</span>
                        </Label>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Input
                          id="role"
                          value={config.role}
                          onChange={(e) => setConfig(prev => ({ ...prev, role: e.target.value }))}
                          placeholder="Enter role (e.g., teacher, assistant, expert)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max-tokens">Max Tokens</Label>
                        <Input
                          id="max-tokens"
                          type="number"
                          value={config.max_tokens}
                          onChange={(e) => setConfig(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 400 }))}
                          placeholder="Enter max tokens (e.g., 400)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="temperature">Temperature: {config.temperature}</Label>
                        <input
                          type="range"
                          id="temperature"
                          min="0"
                          max="2"
                          step="0.1"
                          value={config.temperature}
                          onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
            <Button onClick={createNewSession} className="w-full" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>

          {/* Chat Sessions */}
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.session_id}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    activeSessionId === session.session_id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setActiveSessionId(session.session_id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <MessageCircle className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium truncate">
                          {session.title || `Chat ${sessions.indexOf(session) + 1}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {session.messages.length > 0 
                          ? session.messages[session.messages.length - 1].content.substring(0, 50) + '...'
                          : 'No messages yet'
                        }
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatTime(session.updated_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 p-0 text-slate-400 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSession(session.session_id)
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Status */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <div className={`w-2 h-2 rounded-full ${config.use_web ? 'bg-green-500' : 'bg-blue-500'}`} />
              <span>{config.use_web ? 'Web Enhanced' : 'Direct API'}</span>
              <Separator orientation="vertical" className="h-3" />
              <Cpu className="w-3 h-3" />
              <span>{config.url}:{config.port}</span>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeSession ? (
            <>
              {/* Chat Header */}
              <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {activeSession.title || `Chat ${sessions.indexOf(activeSession) + 1}`}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {activeSession.messages.length} messages • Created {formatTime(activeSession.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={config.use_web ? "default" : "secondary"} className="text-xs">
                      {config.use_web ? (
                        <>
                          <Globe className="w-3 h-3 mr-1" />
                          Web Enhanced
                        </>
                      ) : (
                        <>
                          <Cpu className="w-3 h-3 mr-1" />
                          Direct API
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-4xl mx-auto">
                  {activeSession.messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Start a conversation
                      </h3>
                      <p className="text-slate-500">
                        Send a message to begin chatting with the AI assistant
                      </p>
                    </div>
                  ) : (
                    activeSession.messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex items-start space-x-3 ${
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div
                          className={`group relative max-w-3xl ${
                            msg.role === 'user'
                              ? 'bg-blue-500 text-white rounded-2xl rounded-br-md'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md'
                          } p-4 shadow-sm`}
                        >
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <p className="whitespace-pre-wrap break-words m-0">{msg.content}</p>
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                            <span className="text-xs opacity-70">
                              {formatTime(msg.timestamp)}
                            </span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 w-6 h-6 p-0"
                                    onClick={() => copyMessage(msg.content)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy message</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4">
                {error && (
                  <Alert className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-end space-x-3">
                    <div className="flex-1 relative">
                      <Textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                        className="min-h-12 max-h-32 resize-none pr-12 rounded-xl border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                        disabled={isLoading}
                      />
                    </div>
                    <Button
                      onClick={sendMessage}
                      disabled={!message.trim() || isLoading}
                      className="h-12 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  Welcome to AI Chat Pro
                </h2>
                <p className="text-slate-500 mb-6">
                  Create a new chat session to start conversing with AI
                </p>
                <Button onClick={createNewSession} size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                  <Plus className="w-5 h-5 mr-2" />
                  Start New Chat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
