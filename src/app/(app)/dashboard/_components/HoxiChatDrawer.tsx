"use client"

import { useState } from "react"
import { useAtom, useSetAtom } from "jotai"
import Image from "next/image"
import { X, Sparkles, Send, Maximize2, Paperclip, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { chatDrawerAtom, closeChatDrawerAtom, addChatMessageAtom, filterChipsAtom } from "../_state/useDashboardState"

const SUGGESTED_PROMPTS = [
  "Explain the top anomaly",
  "Estimate today's bot bandwidth cost",
  "Which bots grew fastest vs last week?",
  "Generate robots.txt to block high-cost bots",
  "What's causing the cost spike?",
  "Show me security threats",
]

export function HoxiChatDrawer() {
  const [{ open, contextChips, messages }] = useAtom(chatDrawerAtom)
  const closeChat = useSetAtom(closeChatDrawerAtom)
  const addMessage = useSetAtom(addChatMessageAtom)
  const [filterChips] = useAtom(filterChipsAtom)
  const [input, setInput] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)

  if (!open) return null

  const handleSend = () => {
    if (!input.trim()) return

    addMessage({
      role: 'user',
      content: input,
    })

    // Simulate assistant response
    setTimeout(() => {
      addMessage({
        role: 'assistant',
        content: `I've analyzed your question about "${input.substring(0, 50)}...". Here's what I found:\n\n• The primary cost driver is GPTBot with $324 in bandwidth\n• Traffic patterns show a 47% increase in bot activity\n• I recommend implementing rate limiting for the top 3 bot user agents\n\nWould you like me to generate a robots.txt file or WAF rules?`,
        actions: [
          { type: 'copy', label: 'Copy' },
          { type: 'insert', label: 'Insert into Report' },
        ],
      })
    }, 1000)

    setInput("")
  }

  const handlePromptClick = (prompt: string) => {
    setInput(prompt)
  }

  const allContextChips = [...contextChips, ...filterChips]

  return (
    <div
      className={`fixed ${
        isExpanded ? 'inset-4' : 'right-6 bottom-24 w-full sm:w-[420px] h-[600px]'
      } rounded-2xl border border-[#262626] bg-black z-50 flex flex-col shadow-2xl animate-slide-in-bottom transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#262626] p-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Image src="/hoxi-logo.png" alt="Hoxi" width={32} height={32} className="h-8 w-8" />
          <div>
            <div className="font-semibold text-[#fafafa]">Hoxi AI</div>
            <div className="text-xs text-[#a3a3a3]">Ask about your traffic</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="hover:bg-[#171717]"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={closeChat} className="hover:bg-[#171717]">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Context Chips */}
      {allContextChips.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#262626] flex-wrap flex-shrink-0">
          <span className="text-xs text-[#a3a3a3]">Context:</span>
          {allContextChips.map((chip) => (
            <Badge
              key={chip.id}
              variant="outline"
              className="text-xs bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20"
            >
              <span className="uppercase text-[10px] opacity-60 mr-1">{chip.type}</span>
              {chip.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <>
            {/* Welcome Message */}
            <div className="flex gap-2">
              <Image src="/hoxi-logo.png" alt="Hoxi" width={32} height={32} className="h-8 w-8 flex-shrink-0" />
              <div className="max-w-[85%] rounded-2xl bg-[#0a0a0a] border border-[#262626] p-3 text-sm text-[#fafafa]">
                Hi! I'm Hoxi, your traffic intelligence assistant. Ask me anything about your bot traffic, costs, or
                anomalies.
              </div>
            </div>

            {/* Suggested Prompts */}
            <div className="space-y-2">
              <div className="text-xs text-[#a3a3a3]">Suggested questions:</div>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptClick(prompt)}
                    className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-left text-sm hover:bg-[#171717] hover:border-[#404040] transition-colors text-[#fafafa]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <Image src="/hoxi-logo.png" alt="Hoxi" width={32} height={32} className="h-8 w-8 flex-shrink-0" />
              )}
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                  message.role === 'user'
                    ? 'bg-[#3b82f6] text-white'
                    : 'bg-[#0a0a0a] border border-[#262626] text-[#fafafa]'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.actions && message.actions.length > 0 && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-[#262626]">
                    {message.actions.map((action, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-[#262626] bg-transparent hover:bg-[#171717]"
                      >
                        {action.type === 'copy' && <Copy className="mr-1 h-3 w-3" />}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <div className="h-8 w-8 flex-shrink-0 rounded-full bg-[#3b82f6] flex items-center justify-center text-white text-xs font-semibold">
                  U
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[#262626] p-4 flex-shrink-0">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-[#171717] flex-shrink-0"
            title="Attach context"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Hoxi anything..."
            className="flex-1 rounded-lg border border-[#262626] bg-[#0a0a0a] px-4 py-2 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/20 text-[#fafafa] placeholder:text-[#525252]"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-gradient-to-r from-[#10b981] to-[#059669] text-black hover:from-[#059669] hover:to-[#047857] flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function HoxiChatFAB() {
  const [{ open }] = useAtom(chatDrawerAtom)
  const setOpen = useSetAtom(chatDrawerAtom)

  const toggleChat = () => {
    setOpen(prev => ({ ...prev, open: !prev.open }))
  }

  return (
    <button
      onClick={toggleChat}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[#10b981] to-[#059669] text-black shadow-xl hover:shadow-2xl hover:shadow-green-500/20 transition-all hover:scale-110"
      aria-label="Toggle Hoxi Chat"
    >
      {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
    </button>
  )
}
