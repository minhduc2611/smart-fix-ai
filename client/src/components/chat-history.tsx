import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

// Mock chat history data
const mockChatHistory = [
  {
    id: 1,
    date: "2024-03-15",
    equipment: "Industrial Pump HX300",
    issue: "Pressure fluctuation",
    duration: "45m",
    status: "completed",
    href: "https://smartfix.ai/sessions/1",
  },
  {
    id: 2,
    date: "2024-03-14",
    equipment: "Cooling System CS200",
    issue: "Temperature regulation",
    duration: "30m",
    status: "completed",
    href: "https://smartfix.ai/sessions/2",
  },
  {
    id: 3,
    date: "2024-03-13",
    equipment: "Generator G500",
    issue: "Power output",
    duration: "60m",
    status: "completed",
    href: "https://smartfix.ai/sessions/3",
  },
  {
    id: 4,
    date: "2024-03-12",
    equipment: "Conveyor Belt CB100",
    issue: "Motor alignment",
    duration: "25m",
    status: "completed",
    href: "https://smartfix.ai/sessions/4",
  },
  {
    id: 5,
    date: "2024-03-11",
    equipment: "Control Panel CP300",
    issue: "Display malfunction",
    duration: "40m",
    status: "completed",
    href: "https://smartfix.ai/sessions/5",
  },
];

interface ChatHistoryProps {
  onClose: () => void;
}

export const ChatHistory = ({ onClose }: ChatHistoryProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-800 w-full max-w-2xl mx-4 rounded-lg shadow-xl border border-blue-500/20">
        <div className="p-4 border-b border-blue-500/20 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-blue-400">Chat History</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-3">
            {mockChatHistory.map((chat) => (
              <div
                key={chat.id}
                onClick={() => window.open(chat.href, '_blank')}
                className="cursor-pointer"
              >
                <Card
                  className="bg-slate-900/50 border-blue-500/20 hover:border-blue-500/40 transition-all duration-200 hover:bg-slate-900/70 hover:shadow-lg hover:shadow-blue-500/10"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="outline"
                          className="border-green-400 text-green-400"
                        >
                          {chat.status}
                        </Badge>
                        <span className="text-sm text-slate-400">{chat.date}</span>
                      </div>
                      <span className="text-sm text-blue-400">{chat.duration}</span>
                    </div>
                    <h3 className="font-semibold text-white mb-1">
                      {chat.equipment}
                    </h3>
                    <p className="text-sm text-slate-400">{chat.issue}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 