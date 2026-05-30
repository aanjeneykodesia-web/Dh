import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  useGetMe,
  useListOrderMessages,
  useSendOrderMessage,
  getListOrderMessagesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface OrderChatProps {
  orderId: string;
}

const ROLE_COLORS: Record<string, string> = {
  shopkeeper: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  manufacturer: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  transporter: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  admin: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function OrderChat({ orderId }: OrderChatProps) {
  const { data: auth } = useGetMe();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");

  const { data: messages, isLoading } = useListOrderMessages(orderId, {
    query: {
      refetchInterval: 8000,
      refetchOnWindowFocus: true,
    },
  });

  const sendMessage = useSendOrderMessage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const currentUserId = auth?.user?.id ?? null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    sendMessage.mutate(
      { orderId, data: { body } },
      {
        onSuccess: () => {
          setDraft("");
          queryClient.invalidateQueries({
            queryKey: getListOrderMessagesQueryKey(orderId),
          });
        },
        onError: () => toast.error("Failed to send message"),
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <MessageSquare className="h-4 w-4 mr-2" />
          Order Conversation
        </CardTitle>
        <CardDescription>
          Coordinate with everyone on this order — shopkeeper, manufacturer, and transporter.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          ref={scrollRef}
          className="h-80 overflow-y-auto rounded-md border bg-muted/20 p-4 space-y-3"
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
              <p>No messages yet.</p>
              <p className="text-xs">Start the conversation about this order.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((m) => {
                const isMine = m.senderId === currentUserId;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`flex gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    {!isMine && (
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback className="text-[10px] font-semibold">
                          {initials(m.senderName)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-background border rounded-tl-sm"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 mb-1 ${
                          isMine ? "justify-end" : ""
                        }`}
                      >
                        <span
                          className={`text-xs font-semibold ${
                            isMine ? "text-primary-foreground/90" : ""
                          }`}
                        >
                          {isMine ? "You" : m.senderName}
                        </span>
                        {!isMine && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0 h-4 capitalize ${ROLE_COLORS[m.senderRole] ?? ""}`}
                          >
                            {m.senderRole}
                          </Badge>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {m.body}
                      </p>
                      <div
                        className={`text-[10px] mt-1 ${
                          isMine
                            ? "text-primary-foreground/70 text-right"
                            : "text-muted-foreground"
                        }`}
                        title={format(new Date(m.createdAt), "MMM d, yyyy h:mm a")}
                      >
                        {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    {isMine && (
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback className="text-[10px] font-semibold bg-primary text-primary-foreground">
                          {initials(auth?.user?.name ?? "ME")}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        <form onSubmit={handleSend} className="space-y-2">
          <Textarea
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            maxLength={2000}
            disabled={!auth?.authenticated || sendMessage.isPending}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {draft.length}/2000
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={!draft.trim() || sendMessage.isPending}
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
