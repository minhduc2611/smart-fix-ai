import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WebcamCapture } from "@/components/ui/webcam";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChatHistory } from "@/components/chat-history";
import {
  Video,
  Mic,
  MicOff,
  Phone,
  Play,
  Pause,
  Save,
  History,
  Camera,
  Maximize,
  Check,
  AlertTriangle,
  Brain,
  Wifi,
  OctagonMinus,
  HelpCircle,
  FileText,
  Loader2,
  X,
} from "lucide-react";

interface DetectedEquipment {
  id: string;
  name: string;
  model: string;
  issue: string;
  confidence: number;
  position: { x: number; y: number; width: number; height: number };
}

interface RepairStep {
  id: number;
  title: string;
  description: string;
  instructions: string;
  status: "pending" | "current" | "completed";
  subInstructions?: string[];
}

const BASE_URL =
  process.env.NODE_ENV === "development" ? "http://localhost:5000" : "";

export default function SmartFixDashboard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionActive, setSessionActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedEquipment, setDetectedEquipment] =
    useState<DetectedEquipment | null>(null);
  const [repairSteps, setRepairSteps] = useState<RepairStep[]>([]);
  const [aiMessage, setAiMessage] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const sessionStartTime = useRef(Date.now());
  const [showHistory, setShowHistory] = useState(false);

  const { speak, speaking, supported } = useSpeechSynthesis();
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    supported: speechRecognitionSupported,
  } = useSpeechRecognition();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Real-time conversation state
  const [conversationActive, setConversationActive] = useState(false);
  const [lastCapturedImage, setLastCapturedImage] = useState<string | null>(
    null
  );

  // Create a new repair session on component mount
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${BASE_URL}/api/repair-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianName: "Alex Rodriguez",
          status: "analyzing",
        }),
      });
      if (!response.ok) throw new Error("Failed to create session");
      return response.json();
    },
    onSuccess: (session) => {
      setSessionId(session.id);
    },
    onError: (error) => {
      toast({
        title: "Session Error",
        description: "Failed to create repair session",
        variant: "destructive",
      });
    },
  });

  // Analyze image with Gemini AI
  const analyzeImageMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const response = await fetch(`${BASE_URL}/api/analyze-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData,
          sessionId,
        }),
      });
      if (!response.ok) throw new Error("Failed to analyze image");
      return response.json();
    },
    onSuccess: (analysis) => {
      setDetectedEquipment({
        id: analysis.equipmentId,
        name: analysis.equipmentName,
        model: analysis.model,
        issue: analysis.issueDetected,
        confidence: analysis.confidence,
        position: analysis.position || { x: 33, y: 33, width: 48, height: 32 },
      });

      setRepairSteps(
        analysis.repairSteps.map((step: any) => ({
          id: step.stepNumber,
          title: step.title,
          description: step.description,
          instructions: step.instructions,
          status: step.stepNumber === 1 ? "current" : "pending",
        }))
      );

      setIsAnalyzing(false);
      setAiMessage(
        `${analysis.equipmentName} ${analysis.model} identified. ${analysis.issueDetected}`
      );
      setIsSpeaking(true);

      if (supported) {
        speak(
          `${analysis.equipmentName} ${analysis.model} identified. ${analysis.issueDetected}`
        );
      }

      setTimeout(() => setIsSpeaking(false), 5000);
    },
    onError: (error) => {
      setIsAnalyzing(false);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze equipment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Real-time conversational analysis with Gemini
  const conversationalAnalysisMutation = useMutation({
    mutationFn: async ({
      imageData,
      spokenInput,
    }: {
      imageData: string;
      spokenInput: string;
    }) => {
      const response = await fetch(`${BASE_URL}/api/conversational-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData,
          spokenInput,
          sessionId,
        }),
      });
      if (!response.ok) throw new Error("Failed to analyze with Gemini");
      return response.json();
    },
    onSuccess: (result) => {
      const { visualAnalysis, conversationalResponse, voiceGuidance } = result;

      // Update equipment detection
      if (visualAnalysis.equipmentId) {
        setDetectedEquipment({
          id: visualAnalysis.equipmentId,
          name: visualAnalysis.equipmentName,
          model: visualAnalysis.model,
          issue: visualAnalysis.issueDetected,
          confidence: visualAnalysis.confidence,
          position: visualAnalysis.position || {
            x: 33,
            y: 33,
            width: 48,
            height: 32,
          },
        });

        setRepairSteps(
          visualAnalysis.repairSteps.map((step: any) => ({
            id: step.stepNumber,
            title: step.title,
            description: step.description,
            instructions: step.instructions,
            status: step.stepNumber === 1 ? "current" : "pending",
          }))
        );
      }

      // Speak the conversational response
      const responseToSpeak = voiceGuidance || conversationalResponse;
      setAiMessage(responseToSpeak);
      setIsSpeaking(true);

      if (supported) {
        speak(responseToSpeak);
      }

      setTimeout(() => setIsSpeaking(false), 4000);
      setIsAnalyzing(false);
    },
    onError: (error) => {
      setIsAnalyzing(false);
      toast({
        title: "Analysis Error",
        description: "Failed to communicate with AI assistant",
        variant: "destructive",
      });
    },
  });

  // Generate voice guidance
  const voiceGuidanceMutation = useMutation({
    mutationFn: async (stepDescription: string) => {
      const response = await fetch(`${BASE_URL}/api/voice-guidance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepDescription,
          sessionId,
        }),
      });
      if (!response.ok) throw new Error("Failed to generate voice guidance");
      return response.json();
    },
    onSuccess: (result) => {
      const guidance = result.voiceGuidance;
      setAiMessage(guidance);
      setIsSpeaking(true);

      if (supported) {
        speak(guidance);
      }

      setTimeout(() => setIsSpeaking(false), 3000);
    },
  });

  // Initialize session on mount
  useEffect(() => {
    createSessionMutation.mutate();
  }, []);

  // Update session timer
  // useEffect(() => {
  //   if (sessionActive) {
  //     const interval = setInterval(() => {
  //       setSessionTime(Math.floor((Date.now() - sessionStartTime.current) / 1000));
  //     }, 1000);
  //     return () => clearInterval(interval);
  //   }
  // }, [sessionActive]);

  // Handle image capture and store for conversation
  const handleImageCapture = (imageSrc: string) => {
    console.log("handleImageCapture");
    setLastCapturedImage(imageSrc);

    if (conversationActive && transcript.trim()) {
      // If in conversation mode and we have speech, analyze immediately
      handleConversationalAnalysis(imageSrc, transcript.trim());
      resetTranscript();
    } else if (!conversationActive) {
      // Traditional analysis mode
      if (!sessionId) {
        toast({
          title: "Session Not Ready",
          description: "Please wait for session initialization",
          variant: "destructive",
        });
        return;
      }
      setIsAnalyzing(true);
      // analyzeImageMutation.mutate(imageSrc);
    }
  };

  // Handle real-time conversational analysis
  const handleConversationalAnalysis = (
    imageData: string,
    spokenText: string
  ) => {
    if (!sessionId) return;
    console.log("😄😄😄😄😄😄handleConversationalAnalysis", imageData, spokenText);
    setIsAnalyzing(true);
    conversationalAnalysisMutation.mutate({
      imageData,
      spokenInput: spokenText,
    });
    // if (demoMode) {
    //   // Immediate demo response for testing
    //   setTimeout(() => {
    //     const responses = [
    //       `I heard you say "${spokenText}". I can see equipment in the camera view. Let me analyze what needs attention.`,
    //       `Based on what you said "${spokenText}", I'm examining the equipment. I can identify potential maintenance points.`,
    //       `You mentioned "${spokenText}". I'm analyzing the visual data and can provide specific guidance for this equipment.`,
    //       `I understand "${spokenText}". Looking at the equipment, I can help you with troubleshooting steps.`,
    //     ];

    //     const randomResponse =
    //       responses[Math.floor(Math.random() * responses.length)];
    //     setAiMessage(randomResponse);
    //     setIsSpeaking(true);

    //     // Add mock equipment detection
    //     setDetectedEquipment({
    //       id: "DEMO_" + Date.now(),
    //       name: "Industrial Equipment",
    //       model: "Smart Device",
    //       issue: "Requires inspection based on your input",
    //       confidence: 0.85,
    //       position: { x: 30, y: 30, width: 40, height: 40 },
    //     });

    //     setRepairSteps([
    //       {
    //         id: 1,
    //         title: "Initial Assessment",
    //         description: "Examine the equipment based on your voice input",
    //         instructions: `Responding to: "${spokenText}" - Check the equipment for any visible issues`,
    //         status: "current",
    //       },
    //     ]);

    //     setTimeout(() => setIsSpeaking(false), 4000);
    //     setIsAnalyzing(false);
    //   }, 1500);
    // } else {
    //   // Real Gemini analysis

    // }
  };

  // Toggle conversation mode
  const toggleConversationMode = () => {
    if (conversationActive) {
      // Stop conversation
      setConversationActive(false);
      stopListening();
      setAiMessage(
        "Conversation mode disabled. Use camera button for manual analysis."
      );
    } else {
      // Start conversation
      if (!speechRecognitionSupported) {
        toast({
          title: "Speech Recognition Not Available",
          description: "Your browser doesn't support speech recognition",
          variant: "destructive",
        });
        return;
      }

      setConversationActive(true);
      startListening();
      setAiMessage(
        "Conversation mode active. I'm listening and watching. What can I help you with?"
      );

      if (supported) {
        speak(
          "Conversation mode active. I'm listening and watching. What can I help you with?"
        );
      }
    }
  };

  // Handle speech input when transcript changes
  useEffect(() => {
    if (conversationActive && transcript.trim() && lastCapturedImage) {
      // Debounce speech input to avoid too many requests
      const timer = setTimeout(() => {
        if (transcript.trim().length > 10) {
          // Only process meaningful speech
          console.log(
            "handleConversationalAnalysis",
            lastCapturedImage,
            transcript.trim()
          );
          handleConversationalAnalysis(lastCapturedImage, transcript.trim());
          resetTranscript();
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [transcript, conversationActive, lastCapturedImage]);

  const handleStepComplete = (stepId: number) => {
    setRepairSteps((prev) =>
      prev.map((step) => {
        if (step.id === stepId) {
          return { ...step, status: "completed" };
        } else if (step.id === stepId + 1) {
          return { ...step, status: "current" };
        }
        return step;
      })
    );

    setCurrentStep((prev) => prev + 1);

    // Speak next instruction
    const nextStep = repairSteps.find((step) => step.id === stepId + 1);
    if (nextStep && supported) {
      const message = `Step ${nextStep.id} complete. ${nextStep.description}`;
      setAiMessage(message);
      speak(message);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 3000);
    }
  };

  const handleVoiceCommand = (command: string) => {
    switch (command.toLowerCase()) {
      case "repeat":
        if (aiMessage && supported) {
          speak(aiMessage);
          setIsSpeaking(true);
          setTimeout(() => setIsSpeaking(false), 3000);
        }
        break;
      case "help":
        const currentStepData = repairSteps.find(
          (step) => step.status === "current"
        );
        if (currentStepData && supported) {
          speak(
            `Here are additional details for ${currentStepData.title}: ${currentStepData.instructions}`
          );
          setIsSpeaking(true);
          setTimeout(() => setIsSpeaking(false), 5000);
        }
        break;
    }
  };

  const handleEmergencyContact = () => {
    alert(
      "Connecting to emergency support...\nEstimated wait time: 30 seconds"
    );
  };

  const handleSaveSession = () => {
    const sessionData = {
      equipmentId: detectedEquipment?.id || "HX300-2847",
      technician: "Alex Rodriguez",
      startTime: new Date().toISOString(),
      currentStep: currentStep,
      duration: 100,
    };

    console.log("Session saved:", sessionData);
    localStorage.setItem("smartfix_session", JSON.stringify(sessionData));
  };

  const completedSteps = repairSteps.filter(
    (step) => step.status === "completed"
  ).length;
  const progress = (completedSteps / repairSteps.length) * 100;
  console.log("progress", progress);
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="backdrop-blur-md bg-slate-900/90 border-b border-blue-500/20 p-3 sm:p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-400/30">
              <Brain className="text-slate-900 text-sm sm:text-lg" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-blue-400 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                SmartFix AI
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">Real-time Field Support</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400 font-mono hidden sm:inline">
                  LIVE
                </span>
              </div>

              {/* Conversation Mode Toggle */}
              <Button
                size="sm"
                variant={conversationActive ? "default" : "outline"}
                className={`
                  text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9
                  ${
                    conversationActive
                      ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/30"
                      : "border-blue-400 text-blue-400 hover:bg-blue-500 hover:text-white"
                  }
                `}
                onClick={toggleConversationMode}
                disabled={!speechRecognitionSupported}
              >
                {conversationActive ? (
                  <>
                    <MicOff className="mr-1 h-3 w-3" />
                    <span className="hidden sm:inline">END</span>
                  </>
                ) : (
                  <>
                    <Mic className="mr-1 h-3 w-3" />
                    <span className="hidden sm:inline">CHAT</span>
                  </>
                )}
              </Button>
            </div>

            {/* Emergency Button */}
            <Button
              variant="outline"
              size="sm"
              className="bg-red-500/20 border-red-400 text-red-400 hover:bg-red-500 hover:text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9"
              onClick={handleEmergencyContact}
            >
              <Phone className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">EMERGENCY</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row landscape:flex-row overflow-x-auto">
        {/* Video Feed Section */}
        <div className="w-full lg:w-3/5 landscape:w-3/5 relative bg-black order-1 lg:order-1 landscape:order-1 border-b lg:border-b-0 lg:border-r landscape:border-b-0 landscape:border-r border-blue-500/20 h-[50vh] lg:h-full landscape:h-full flex-shrink-0">
          <div className="relative h-full w-full">
            <WebcamCapture
              onCapture={handleImageCapture}
              className="w-full h-full object-cover"
            />

            {/* Scanner Line Effect */}
            {isAnalyzing && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse"></div>
            )}

            {/* Equipment Detection Overlay */}
            {detectedEquipment && (
              <div className="absolute inset-0">
                <div className="absolute top-1/3 left-1/3 w-32 sm:w-48 h-24 sm:h-32 border-2 border-green-400 rounded-lg animate-pulse shadow-lg shadow-green-400/30">
                  <div className="absolute -top-8 left-0 bg-green-400 text-black px-2 py-1 rounded text-xs font-bold">
                    {detectedEquipment.name}
                  </div>
                </div>

                {/* Issue Indicator */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-6 h-6 bg-orange-400 rounded-full animate-ping"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-orange-400 rounded-full"></div>
                </div>

                {/* Measurement Overlay */}
                <div className="absolute bottom-4 left-4 backdrop-blur-md bg-slate-900/80 p-2 rounded-lg border border-blue-500/30">
                  <div className="text-xs text-blue-400 font-mono space-y-1">
                    <div>
                      PRESSURE:{" "}
                      <span className="text-orange-400">
                        142 PSI
                      </span>
                    </div>
                    <div>
                      TEMP:{" "}
                      <span className="text-green-400">
                        68°F
                      </span>
                    </div>
                    <div>
                      STATUS:{" "}
                      <span className="text-orange-400">
                        MISALIGNED
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Camera Controls */}
            <div className="absolute bottom-4 right-4 flex space-x-2">
              <Button
                size="icon"
                variant="outline"
                className="bg-slate-900/80 backdrop-blur-md border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white shadow-lg w-10 h-10"
                onClick={() => {
                  const video = document.querySelector("video");
                  const canvas = document.createElement("canvas");
                  if (video && video.videoWidth && video.videoHeight) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const context = canvas.getContext("2d");
                    if (context) {
                      context.drawImage(video, 0, 0);
                      const imageSrc = canvas.toDataURL("image/jpeg", 0.8);
                      handleImageCapture(imageSrc);
                    }
                  }
                }}
                disabled={isAnalyzing || analyzeImageMutation.isPending}
              >
                {isAnalyzing || analyzeImageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="bg-slate-900/80 backdrop-blur-md border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white shadow-lg w-10 h-10"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Instructions Panel */}
        <div className="w-full lg:w-2/5 landscape:w-2/5 flex flex-col bg-slate-800 order-2 lg:order-2 landscape:order-2 flex-shrink-0">
          {/* Analysis Results */}
          {detectedEquipment && (
            <Card className="backdrop-blur-md bg-slate-900/50 border-blue-500/20 shadow-lg m-3">
              <CardContent className="p-3">
                <div className="text-sm space-y-2">
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-green-400 font-semibold">
                      Equipment Identified
                    </span>
                  </div>
                  <p className="text-slate-300">
                    {detectedEquipment.name} {detectedEquipment.model}
                  </p>
                  <p className="text-orange-400 text-sm flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {detectedEquipment.issue}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Voice Assistant */}
          <div className="p-3 sm:p-4 border-b border-blue-500/20">
            <div className="flex items-center space-x-3 mb-3">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center shadow-lg
                  ${
                    conversationActive
                      ? "bg-gradient-to-r from-blue-400 to-cyan-400 animate-pulse shadow-blue-400/30"
                      : "bg-slate-600"
                  }
                `}
              >
                {conversationActive ? (
                  <Mic className="text-slate-900 text-sm" />
                ) : (
                  <MicOff className="text-white text-sm" />
                )}
              </div>
              <div>
                <span className="font-semibold text-slate-200 text-sm sm:text-base">Gemini AI Assistant</span>
                <p className="text-xs text-slate-400">
                  {conversationActive ? "Listening & Watching" : "Manual Mode"}
                </p>
              </div>
            </div>

            {/* Live Speech Recognition */}
            {conversationActive && (
              <div className="mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-400">
                    LISTENING
                  </span>
                </div>
                {transcript && (
                  <Card className="backdrop-blur-md bg-slate-900/50 border-blue-500/20 mb-2">
                    <CardContent className="p-2">
                      <p className="text-xs text-slate-400">You said:</p>
                      <p className="text-sm text-blue-400">
                        "{transcript}"
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Voice Visualizer */}
            {(isSpeaking || speaking) && (
              <div className="flex items-center space-x-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-blue-400 w-1 rounded animate-pulse"
                    style={{
                      height: `${16 + Math.random() * 16}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
                <span className="text-sm text-slate-400 ml-2">
                  AI Speaking...
                </span>
              </div>
            )}

            {/* AI Response */}
            {aiMessage && (
              <Card className="backdrop-blur-md bg-slate-900/50 border-blue-500/20 mb-3">
                <CardContent className="p-3">
                  <p className="text-xs text-slate-400 mb-1">Gemini AI:</p>
                  <p className="text-sm text-slate-300">"{aiMessage}"</p>
                </CardContent>
              </Card>
            )}

            {/* Voice Controls */}
            <div className="flex space-x-2">
              {conversationActive ? (
                <Button
                  size="sm"
                  className="flex-1 bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30"
                  onClick={toggleConversationMode}
                >
                  <MicOff className="mr-2 h-3 w-3" />
                  Stop Chat
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    className="flex-1 bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/30"
                    onClick={() => handleVoiceCommand("repeat")}
                  >
                    <Play className="mr-2 h-3 w-3" />
                    Replay
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-blue-400 text-blue-400 hover:bg-blue-500 hover:text-white"
                    onClick={toggleConversationMode}
                    disabled={!speechRecognitionSupported}
                  >
                    <Mic className="mr-2 h-3 w-3" />
                    <span className="hidden sm:inline">Start </span>Chat
                  </Button>
                </>
              )}
            </div>

            {/* Conversation Status */}
            {conversationActive && (
              <div className="mt-2 text-xs text-center text-slate-400">
                Say something while looking at equipment for real-time AI
                analysis
              </div>
            )}
          </div>

          {/* Step-by-Step Instructions */}
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4 text-blue-400 text-sm sm:text-base">
              Repair Instructions
            </h3>

            <div className="space-y-3">
              {repairSteps.map((step) => (
                <Card
                  key={step.id}
                  className={`
                    backdrop-blur-md bg-slate-900/50 border-l-4 transition-all duration-300 shadow-lg
                    ${
                      step.status === "completed"
                        ? "border-l-green-400 opacity-75"
                        : ""
                    }
                    ${
                      step.status === "current"
                        ? "border-l-blue-400 border border-blue-400/30 shadow-blue-400/20"
                        : ""
                    }
                    ${
                      step.status === "pending"
                        ? "border-l-slate-600 opacity-60"
                        : ""
                    }
                  `}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <div
                        className={`
                        w-6 h-6 rounded-full flex items-center justify-center shadow-lg
                        ${
                          step.status === "completed"
                            ? "bg-green-400 shadow-green-400/30"
                            : ""
                        }
                        ${
                          step.status === "current"
                            ? "bg-blue-400 animate-pulse shadow-blue-400/30"
                            : ""
                        }
                        ${step.status === "pending" ? "bg-slate-600" : ""}
                      `}
                      >
                        {step.status === "completed" ? (
                          <Check className="text-slate-900 text-xs" />
                        ) : (
                          <span
                            className={`font-bold text-xs ${
                              step.status === "current"
                                ? "text-slate-900"
                                : "text-white"
                            }`}
                          >
                            {step.id}
                          </span>
                        )}
                      </div>
                      <span
                        className={`
                        font-semibold text-sm
                        ${
                          step.status === "completed"
                            ? "text-green-400"
                            : ""
                        }
                        ${
                          step.status === "current"
                            ? "text-blue-400"
                            : ""
                        }
                        ${step.status === "pending" ? "text-slate-400" : ""}
                      `}
                      >
                        Step {step.id}
                      </span>
                      <Badge
                        variant="outline"
                        className={`
                        text-xs
                        ${
                          step.status === "completed"
                            ? "border-green-400 text-green-400"
                            : ""
                        }
                        ${
                          step.status === "current"
                            ? "border-blue-400 text-blue-400"
                            : ""
                        }
                        ${
                          step.status === "pending"
                            ? "border-slate-500 text-slate-500"
                            : ""
                        }
                      `}
                      >
                        {step.status.toUpperCase()}
                      </Badge>
                    </div>

                    <p
                      className={`
                      text-sm mb-3
                      ${
                        step.status === "current"
                          ? "text-white font-semibold"
                          : "text-slate-300"
                      }
                    `}
                    >
                      {step.description}
                    </p>

                    {step.status === "current" && step.subInstructions && (
                      <div className="text-xs text-slate-400 space-y-1 mb-3">
                        {step.subInstructions.map((instruction, index) => (
                          <div key={index}>• {instruction}</div>
                        ))}
                      </div>
                    )}

                    {step.status === "completed" && (
                      <div className="text-xs text-green-400">
                        ✓ Confirmed by technician
                      </div>
                    )}

                    {step.status === "current" && (
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <Button
                          size="sm"
                          className="bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/30"
                          onClick={() => handleStepComplete(step.id)}
                        >
                          Done
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300 hover:border-blue-400 hover:text-blue-400"
                          onClick={() => handleVoiceCommand("help")}
                        >
                          <HelpCircle className="mr-1 h-3 w-3" />
                          Help
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300 hover:border-blue-400 hover:text-blue-400"
                        >
                          <FileText className="mr-1 h-3 w-3" />
                          Diagram
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Session Info */}
          <div className="p-3 sm:p-4 border-t border-blue-500/20 bg-slate-800/50">
            <div className="flex items-center justify-between text-xs">
              <div className="space-y-1">
                <div className="text-slate-400">
                  <SessionTimer />
                </div>
                <div className="text-slate-400">
                  Technician: <span className="text-white">Alex Rodriguez</span>
                </div>
              </div>
              <div className="space-y-1 text-right">
                <div className="text-slate-400">
                  Equipment ID:{" "}
                  <span className="text-white font-mono">
                    {detectedEquipment?.id || "HX300-2847"}
                  </span>
                </div>
                <div className="text-slate-400">
                  Progress:{" "}
                  <span className="text-green-400">
                    {completedSteps}/{repairSteps.length} Steps
                  </span>
                </div>
              </div>
            </div>

            <Progress value={progress} className="mt-2 h-2" />
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="backdrop-blur-md bg-slate-900/90 p-3 sm:p-4 border-t border-blue-500/20">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
          {/* Left Controls */}
          <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
            <Button
              className="bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/30 flex-1 sm:flex-none"
              onClick={handleSaveSession}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Session
            </Button>

            <Button
              variant="outline"
              className="border-slate-600 text-slate-300 hover:border-blue-400 hover:text-blue-400 flex-1 sm:flex-none"
              onClick={() => setShowHistory(true)}
            >
              <History className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">View </span>History
            </Button>
          </div>

          {/* Center Status */}
          <div className="flex items-center space-x-4 sm:space-x-6 w-full sm:w-auto justify-center">
            <div className="flex items-center space-x-2">
              <Video
                className={`h-4 w-4 ${
                  cameraActive
                    ? "text-green-400"
                    : "text-slate-500"
                }`}
              />
              <span className="text-xs text-slate-400 hidden sm:inline">
                Video {cameraActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Mic
                className={`h-4 w-4 ${
                  micActive
                    ? "text-green-400"
                    : "text-slate-500"
                }`}
              />
              <span className="text-xs text-slate-400 hidden sm:inline">
                Audio {micActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Wifi className="h-4 w-4 text-green-400" />
              <span className="text-xs text-slate-400 hidden sm:inline">Connected</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
            <Button
              variant="outline"
              className="border-slate-600 text-slate-300 hover:border-orange-400 hover:text-orange-400 flex-1 sm:flex-none"
              onClick={() => setSessionActive(!sessionActive)}
            >
              {sessionActive ? (
                <Pause className="mr-2 h-4 w-4" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {sessionActive ? "Pause" : "Resume"}
            </Button>

            <Button
              variant="outline"
              className="bg-red-500/20 border-red-400 text-red-400 hover:bg-red-500 hover:text-white flex-1 sm:flex-none"
              onClick={() => setSessionActive(false)}
            >
              <OctagonMinus className="mr-2 h-4 w-4" />
              End
            </Button>
          </div>
        </div>
      </div>

      {/* Chat History Modal */}
      {showHistory && <ChatHistory onClose={() => setShowHistory(false)} />}
    </div>
  );
}

const SessionTimer = () => {
  const [sessionTime, setSessionTime] = useState(0);
  // Format session time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(sessionTime + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionTime]);

  return (
    <>
      Session Time:{" "}
      <span className="text-blue-400 font-mono">
        {formatTime(sessionTime)}
      </span>
    </>
  );
};
