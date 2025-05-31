"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { WebcamCapture } from "@/components/ui/webcam"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
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
  OctagonIcon as OctagonMinus,
  HelpCircle,
  FileText,
  Loader2,
  Download,
} from "lucide-react"

interface DetectedEquipment {
  id: string
  name: string
  model: string
  issue: string
  confidence: number
  position: { x: number; y: number; width: number; height: number }
}

interface RepairStep {
  id: number
  title: string
  description: string
  instructions: string
  status: "pending" | "current" | "completed"
  subInstructions?: string[]
}

// Define styles as a constant
const styles = `
  @keyframes scanner-line {
    0% { transform: translateY(0); box-shadow: 0 0 10px hsl(var(--neon-blue)); }
    100% { transform: translateY(100vh); box-shadow: 0 0 10px hsl(var(--neon-blue)); }
  }

  .scanner-line {
    background: linear-gradient(to bottom, transparent, hsl(var(--neon-blue)), transparent);
    animation: scanner-line 2s linear infinite;
  }

  .equipment-overlay {
    border: 1px solid hsl(var(--success-green));
    box-shadow: 0 0 10px hsl(var(--success-green));
  }

  .voice-wave {
    background: hsl(var(--neon-blue));
    animation: voiceWave 0.5s ease-in-out infinite alternate;
  }

  @keyframes voiceWave {
    from { height: 5px; }
    to { height: 20px; }
  }

  /* Enhanced mobile styles */
  @media (max-width: 640px) {
    .mobile-hidden {
      display: none;
    }
    
    .mobile-full-width {
      width: 100%;
    }
    
    .mobile-p-2 {
      padding: 0.5rem;
    }
    
    .mobile-text-sm {
      font-size: 0.875rem;
    }

    /* Ensure touch targets are at least 44px */
    button {
      min-height: 44px;
      min-width: 44px;
    }
  }

  /* Prevent pull-to-refresh on mobile */
  body {
    overscroll-behavior-y: none;
    -webkit-overflow-scrolling: touch;
  }

  /* Add safe area insets for modern mobile browsers */
  .safe-area-inset {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }

  /* Enhanced animations */
  .animate-glow {
    animation: glow 2s ease-in-out infinite alternate;
  }

  @keyframes glow {
    from { text-shadow: 0 0 5px hsl(var(--neon-blue)); }
    to { text-shadow: 0 0 20px hsl(var(--neon-blue)), 0 0 30px hsl(var(--neon-blue)); }
  }

  .animate-pulse-neon {
    animation: pulse-neon 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse-neon {
    0%, 100% { 
      opacity: 1;
      box-shadow: 0 0 5px hsl(var(--neon-blue));
    }
    50% { 
      opacity: 0.8;
      box-shadow: 0 0 20px hsl(var(--neon-blue)), 0 0 30px hsl(var(--neon-blue));
    }
  }

  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }

  @keyframes slide-up {
    from { 
      opacity: 0;
      transform: translateY(10px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Touch-friendly improvements */
  .touch-manipulation {
    touch-action: manipulation;
  }

  /* Better focus states for accessibility */
  button:focus-visible {
    outline: 2px solid hsl(var(--neon-blue));
    outline-offset: 2px;
  }
`

const SmartFixDashboard = () => {
  const [sessionTime, setSessionTime] = useState(0)
  const [currentStep, setCurrentStep] = useState(1)
  const [sessionActive, setSessionActive] = useState(true)
  const [micActive, setMicActive] = useState(true)
  const [cameraActive, setCameraActive] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [detectedEquipment, setDetectedEquipment] = useState<DetectedEquipment | null>(null)
  const [repairSteps, setRepairSteps] = useState<RepairStep[]>([])
  const [aiMessage, setAiMessage] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const sessionStartTime = useRef(Date.now())

  const { speak, speaking, supported } = useSpeechSynthesis()
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    supported: speechRecognitionSupported,
  } = useSpeechRecognition()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Real-time conversation state
  const [conversationActive, setConversationActive] = useState(false)
  const [lastCapturedImage, setLastCapturedImage] = useState<string | null>(null)
  const [demoMode, setDemoMode] = useState(true) // Enable demo mode for immediate testing

  // Add PWA installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  // Create a new repair session on component mount
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/repair-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianName: "Alex Rodriguez",
          status: "analyzing",
        }),
      })
      if (!response.ok) throw new Error("Failed to create session")
      return response.json()
    },
    onSuccess: (session) => {
      setSessionId(session.id)
    },
    onError: (error) => {
      toast({
        title: "Session Error",
        description: "Failed to create repair session",
        variant: "destructive",
      })
    },
  })

  // Analyze image with Gemini AI
  const analyzeImageMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData,
          sessionId,
        }),
      })
      if (!response.ok) throw new Error("Failed to analyze image")
      return response.json()
    },
    onSuccess: (analysis) => {
      setDetectedEquipment({
        id: analysis.equipmentId,
        name: analysis.equipmentName,
        model: analysis.model,
        issue: analysis.issueDetected,
        confidence: analysis.confidence,
        position: analysis.position || { x: 33, y: 33, width: 48, height: 32 },
      })

      setRepairSteps(
        analysis.repairSteps.map((step: any) => ({
          id: step.stepNumber,
          title: step.title,
          description: step.description,
          instructions: step.instructions,
          status: step.stepNumber === 1 ? "current" : "pending",
        })),
      )

      setIsAnalyzing(false)
      setAiMessage(`${analysis.equipmentName} ${analysis.model} identified. ${analysis.issueDetected}`)
      setIsSpeaking(true)

      if (supported) {
        speak(`${analysis.equipmentName} ${analysis.model} identified. ${analysis.issueDetected}`)
      }

      setTimeout(() => setIsSpeaking(false), 5000)
    },
    onError: (error) => {
      setIsAnalyzing(false)
      toast({
        title: "Analysis Error",
        description: "Failed to analyze equipment. Please try again.",
        variant: "destructive",
      })
    },
  })

  // Real-time conversational analysis with Gemini
  const conversationalAnalysisMutation = useMutation({
    mutationFn: async ({ imageData, spokenInput }: { imageData: string; spokenInput: string }) => {
      const response = await fetch("/api/conversational-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData,
          spokenInput,
          sessionId,
        }),
      })
      if (!response.ok) throw new Error("Failed to analyze with Gemini")
      return response.json()
    },
    onSuccess: (result) => {
      const { visualAnalysis, conversationalResponse, voiceGuidance } = result

      // Update equipment detection
      if (visualAnalysis.equipmentId) {
        setDetectedEquipment({
          id: visualAnalysis.equipmentId,
          name: visualAnalysis.equipmentName,
          model: visualAnalysis.model,
          issue: visualAnalysis.issueDetected,
          confidence: visualAnalysis.confidence,
          position: visualAnalysis.position || { x: 33, y: 33, width: 48, height: 32 },
        })

        setRepairSteps(
          visualAnalysis.repairSteps.map((step: any) => ({
            id: step.stepNumber,
            title: step.title,
            description: step.description,
            instructions: step.instructions,
            status: step.stepNumber === 1 ? "current" : "pending",
          })),
        )
      }

      // Speak the conversational response
      const responseToSpeak = voiceGuidance || conversationalResponse
      setAiMessage(responseToSpeak)
      setIsSpeaking(true)

      if (supported) {
        speak(responseToSpeak)
      }

      setTimeout(() => setIsSpeaking(false), 4000)
      setIsAnalyzing(false)
    },
    onError: (error) => {
      setIsAnalyzing(false)
      toast({
        title: "Analysis Error",
        description: "Failed to communicate with AI assistant",
        variant: "destructive",
      })
    },
  })

  // Generate voice guidance
  const voiceGuidanceMutation = useMutation({
    mutationFn: async (stepDescription: string) => {
      const response = await fetch("/api/voice-guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepDescription,
          sessionId,
        }),
      })
      if (!response.ok) throw new Error("Failed to generate voice guidance")
      return response.json()
    },
    onSuccess: (result) => {
      const guidance = result.voiceGuidance
      setAiMessage(guidance)
      setIsSpeaking(true)

      if (supported) {
        speak(guidance)
      }

      setTimeout(() => setIsSpeaking(false), 3000)
    },
  })

  // Initialize session on mount
  useEffect(() => {
    createSessionMutation.mutate()
    
    // Add initial demo repair steps
    console.log("Setting initial repair steps...")
    setRepairSteps([
      {
        id: 1,
        title: "Initial Assessment",
        description: "Examine equipment for visible issues",
        instructions: "Check for loose connections, unusual sounds, or visible damage",
        status: "current",
        subInstructions: [
          "Look for oil leaks or fluid drips",
          "Listen for unusual noises",
          "Check temperature readings"
        ]
      },
      {
        id: 2,
        title: "Safety Check",
        description: "Ensure safe working conditions",
        instructions: "Verify power is off and equipment is locked out",
        status: "pending"
      },
      {
        id: 3,
        title: "Component Inspection",
        description: "Detailed inspection of critical components",
        instructions: "Check belts, filters, and connection points",
        status: "pending"
      }
    ])
  }, [])

  // Add debug logging for repair steps
  useEffect(() => {
    console.log("Current repair steps:", repairSteps)
  }, [repairSteps])

  // Format session time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Update session timer
  useEffect(() => {
    if (sessionActive) {
      const interval = setInterval(() => {
        setSessionTime(Math.floor((Date.now() - sessionStartTime.current) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [sessionActive])

  // Handle image capture and store for conversation
  const handleImageCapture = (imageSrc: string) => {
    setLastCapturedImage(imageSrc)

    if (conversationActive && transcript.trim()) {
      // If in conversation mode and we have speech, analyze immediately
      handleConversationalAnalysis(imageSrc, transcript.trim())
      resetTranscript()
    } else if (!conversationActive) {
      // Traditional analysis mode
      if (!sessionId) {
        toast({
          title: "Session Not Ready",
          description: "Please wait for session initialization",
          variant: "destructive",
        })
        return
      }
      setIsAnalyzing(true)
      analyzeImageMutation.mutate(imageSrc)
    }
  }

  // Handle real-time conversational analysis
  const handleConversationalAnalysis = (imageData: string, spokenText: string) => {
    if (!sessionId) return

    setIsAnalyzing(true)

    if (demoMode) {
      // Immediate demo response for testing
      setTimeout(() => {
        const responses = [
          `I heard you say "${spokenText}". I can see equipment in the camera view. Let me analyze what needs attention.`,
          `Based on what you said "${spokenText}", I'm examining the equipment. I can identify potential maintenance points.`,
          `You mentioned "${spokenText}". I'm analyzing the visual data and can provide specific guidance for this equipment.`,
          `I understand "${spokenText}". Looking at the equipment, I can help you with troubleshooting steps.`,
        ]

        const randomResponse = responses[Math.floor(Math.random() * responses.length)]
        setAiMessage(randomResponse)
        setIsSpeaking(true)

        if (supported) {
          speak(randomResponse)
        }

        // Add mock equipment detection
        setDetectedEquipment({
          id: "DEMO_" + Date.now(),
          name: "Industrial Equipment",
          model: "Smart Device",
          issue: "Requires inspection based on your input",
          confidence: 0.85,
          position: { x: 30, y: 30, width: 40, height: 40 },
        })

        setRepairSteps([
          {
            id: 1,
            title: "Initial Assessment",
            description: "Examine the equipment based on your voice input",
            instructions: `Responding to: "${spokenText}" - Check the equipment for any visible issues`,
            status: "current",
          },
        ])

        setTimeout(() => setIsSpeaking(false), 4000)
        setIsAnalyzing(false)
      }, 1500)
    } else {
      // Real Gemini analysis
      conversationalAnalysisMutation.mutate({
        imageData,
        spokenInput: spokenText,
      })
    }
  }

  // Toggle conversation mode
  const toggleConversationMode = () => {
    if (conversationActive) {
      // Stop conversation
      setConversationActive(false)
      stopListening()
      setAiMessage("Conversation mode disabled. Use camera button for manual analysis.")
    } else {
      // Start conversation
      if (!speechRecognitionSupported) {
        toast({
          title: "Speech Recognition Not Available",
          description: "Your browser doesn't support speech recognition",
          variant: "destructive",
        })
        return
      }

      setConversationActive(true)
      startListening()
      setAiMessage("Conversation mode active. I'm listening and watching. What can I help you with?")

      if (supported) {
        speak("Conversation mode active. I'm listening and watching. What can I help you with?")
      }
    }
  }

  // Handle speech input when transcript changes
  useEffect(() => {
    if (conversationActive && transcript.trim() && lastCapturedImage) {
      // Debounce speech input to avoid too many requests
      const timer = setTimeout(() => {
        if (transcript.trim().length > 10) {
          // Only process meaningful speech
          handleConversationalAnalysis(lastCapturedImage, transcript.trim())
          resetTranscript()
        }
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [transcript, conversationActive, lastCapturedImage])

  const handleStepComplete = (stepId: number) => {
    setRepairSteps((prev) =>
      prev.map((step) => {
        if (step.id === stepId) {
          return { ...step, status: "completed" }
        } else if (step.id === stepId + 1) {
          return { ...step, status: "current" }
        }
        return step
      }),
    )

    setCurrentStep((prev) => prev + 1)

    // Speak next instruction
    const nextStep = repairSteps.find((step) => step.id === stepId + 1)
    if (nextStep && supported) {
      const message = `Step ${nextStep.id} complete. ${nextStep.description}`
      setAiMessage(message)
      speak(message)
      setIsSpeaking(true)
      setTimeout(() => setIsSpeaking(false), 3000)
    }
  }

  const handleVoiceCommand = (command: string) => {
    switch (command.toLowerCase()) {
      case "repeat":
        if (aiMessage && supported) {
          speak(aiMessage)
          setIsSpeaking(true)
          setTimeout(() => setIsSpeaking(false), 3000)
        }
        break
      case "help":
        const currentStepData = repairSteps.find((step) => step.status === "current")
        if (currentStepData && supported) {
          speak(`Here are additional details for ${currentStepData.title}: ${currentStepData.instructions}`)
          setIsSpeaking(true)
          setTimeout(() => setIsSpeaking(false), 5000)
        }
        break
    }
  }

  const handleEmergencyContact = () => {
    alert("Connecting to emergency support...\nEstimated wait time: 30 seconds")
  }

  const handleSaveSession = () => {
    const sessionData = {
      equipmentId: detectedEquipment?.id || "HX300-2847",
      technician: "Alex Rodriguez",
      startTime: new Date().toISOString(),
      currentStep: currentStep,
      duration: formatTime(sessionTime),
    }

    console.log("Session saved:", sessionData)
    localStorage.setItem("smartfix_session", JSON.stringify(sessionData))
  }

  const completedSteps = repairSteps.filter((step) => step.status === "completed").length
  const progress = (completedSteps / repairSteps.length) * 100

  // Handle PWA installation
  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    })
  }, [])

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setIsInstallable(false)
      }
      setDeferredPrompt(null)
    }
  }

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("SW registered:", registration)
          })
          .catch((error) => {
            console.log("SW registration failed:", error)
          })
      })
    }
  }, [])

  // Add styles to document head on component mount
  useEffect(() => {
    const styleElement = document.createElement("style")
    styleElement.textContent = styles
    document.head.appendChild(styleElement)

    // Cleanup on unmount
    return () => {
      document.head.removeChild(styleElement)
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-[hsl(var(--primary-dark))] to-[hsl(var(--secondary-dark))] safe-area-inset">
      {/* Header */}
      <header className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[hsl(var(--neon-blue))]/20 bg-black/30 backdrop-blur-sm gap-3 sm:gap-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[hsl(var(--neon-blue))] rounded-lg flex items-center justify-center">
            <Brain className="text-black text-sm sm:text-lg" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[hsl(var(--neon-blue))] animate-glow">SmartFix AI</h1>
            <p className="text-xs text-gray-400">Real-time Field Support</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* PWA Install Button */}
          {isInstallable && (
            <Button
              size="sm"
              className="bg-[hsl(var(--neon-blue))] text-black hover:bg-[hsl(var(--electric-blue))] text-xs sm:text-sm transition-all duration-200 touch-manipulation min-h-[44px] px-3 sm:px-4"
              onClick={handleInstallPWA}
            >
              <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Install App</span>
              <span className="xs:hidden">Install</span>
            </Button>
          )}

          {/* Connection Status */}
          <div className="flex items-center gap-2 px-2 py-1 bg-black/20 rounded-lg">
            <div className="w-2 h-2 bg-[hsl(var(--success-green))] rounded-full animate-pulse-neon"></div>
            <span className="text-xs text-[hsl(var(--success-green))] font-mono">LIVE</span>
          </div>

          {/* Conversation Mode Toggle */}
          <Button
            size="sm"
            variant={conversationActive ? "default" : "outline"}
            className={`
        text-xs sm:text-sm transition-all duration-200 touch-manipulation min-h-[44px] px-3 sm:px-4
        ${
          conversationActive
            ? "bg-[hsl(var(--neon-blue))] text-black hover:bg-[hsl(var(--electric-blue))] shadow-lg"
            : "border-[hsl(var(--neon-blue))] text-[hsl(var(--neon-blue))] hover:bg-[hsl(var(--neon-blue))] hover:text-black"
        }
      `}
            onClick={toggleConversationMode}
            disabled={!speechRecognitionSupported}
          >
            {conversationActive ? (
              <>
                <MicOff className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">END CHAT</span>
                <span className="sm:hidden">END</span>
              </>
            ) : (
              <>
                <Mic className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">START CHAT</span>
                <span className="sm:hidden">CHAT</span>
              </>
            )}
          </Button>

          {/* Emergency Button */}
          <Button
            variant="outline"
            size="sm"
            className="bg-[hsl(var(--warning-orange))]/20 border-[hsl(var(--warning-orange))] text-[hsl(var(--warning-orange))] hover:bg-[hsl(var(--warning-orange))] hover:text-white text-xs sm:text-sm transition-all duration-200 touch-manipulation min-h-[44px] px-3 sm:px-4 shadow-lg"
            onClick={handleEmergencyContact}
          >
            <Phone className="mr-1 sm:mr-2 h-3 sm:h-4 w-3 sm:w-4" />
            <span className="hidden sm:inline">EMERGENCY</span>
            <span className="sm:hidden">SOS</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video Feed Section */}
        <div className="w-full lg:w-3/5 h-[40vh] lg:h-auto relative bg-black border-b lg:border-b-0 lg:border-r border-[hsl(var(--neon-blue))]/20">
          <div className="relative h-full">
            <WebcamCapture onCapture={handleImageCapture} className="w-full h-full object-cover" />

            {/* Scanner Line Effect */}
            {isAnalyzing && <div className="absolute top-0 left-0 w-full h-1 scanner-line"></div>}

            {/* Equipment Detection Overlay */}
            {detectedEquipment && (
              <div className="absolute inset-0">
                <div className="absolute top-1/3 left-1/3 w-32 sm:w-48 h-24 sm:h-32 equipment-overlay rounded-lg animate-pulse">
                  <div className="absolute -top-8 left-0 bg-[hsl(var(--success-green))] text-black px-2 py-1 rounded text-xs font-bold">
                    {detectedEquipment.name}
                  </div>
                </div>

                {/* Issue Indicator */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-4 sm:w-6 h-4 sm:h-6 bg-[hsl(var(--warning-orange))] rounded-full animate-ping"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 sm:w-3 h-2 sm:h-3 bg-[hsl(var(--warning-orange))] rounded-full"></div>
                </div>

                {/* Measurement Overlay */}
                <div className="absolute bottom-4 left-4 bg-black/30 backdrop-blur-sm p-2 rounded-lg">
                  <div className="text-xs text-[hsl(var(--neon-blue))] font-mono space-y-1">
                    <div>
                      PRESSURE: <span className="text-[hsl(var(--warning-orange))]">142 PSI</span>
                    </div>
                    <div>
                      TEMP: <span className="text-[hsl(var(--success-green))]">68°F</span>
                    </div>
                    <div>
                      STATUS: <span className="text-[hsl(var(--warning-orange))]">MISALIGNED</span>
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
                className="bg-[hsl(var(--secondary-dark))]/80 border-[hsl(var(--neon-blue))]/50 text-[hsl(var(--neon-blue))] hover:bg-[hsl(var(--neon-blue))] hover:text-black"
                onClick={() => {
                  const video = document.querySelector("video")
                  const canvas = document.createElement("canvas")
                  if (video && video.videoWidth && video.videoHeight) {
                    canvas.width = video.videoWidth
                    canvas.height = video.videoHeight
                    const context = canvas.getContext("2d")
                    if (context) {
                      context.drawImage(video, 0, 0)
                      const imageSrc = canvas.toDataURL("image/jpeg", 0.8)
                      handleImageCapture(imageSrc)
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
                className="bg-[hsl(var(--secondary-dark))]/80 border-[hsl(var(--neon-blue))]/50 text-[hsl(var(--neon-blue))] hover:bg-[hsl(var(--neon-blue))] hover:text-black"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Instructions Panel */}
        <div className="w-full lg:w-2/5 flex flex-col bg-[hsl(var(--secondary-dark))] overflow-hidden">
          {/* AI Analysis Header */}
          <div className="p-3 sm:p-4 border-b border-[hsl(var(--neon-blue))]/20">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-6 sm:w-8 h-6 sm:h-8 bg-[hsl(var(--neon-blue))] rounded-full flex items-center justify-center animate-pulse-neon">
                <Brain className="text-black text-xs sm:text-sm" />
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-[hsl(var(--neon-blue))]">AI Analysis</h3>
                <p className="text-xs text-gray-400">Gemini Live Processing</p>
              </div>
            </div>

            {/* Analysis Results */}
            {detectedEquipment && (
              <Card className="bg-black/30 backdrop-blur-sm border-[hsl(var(--neon-blue))]/20 animate-slide-up">
                <CardContent className="p-2 sm:p-3">
                  <div className="text-xs sm:text-sm space-y-2">
                    <div className="flex items-center space-x-2">
                      <Check className="h-3 sm:h-4 w-3 sm:w-4 text-[hsl(var(--success-green))]" />
                      <span className="text-[hsl(var(--success-green))] font-semibold">Equipment Identified</span>
                    </div>
                    <p className="text-gray-300">
                      {detectedEquipment.name} {detectedEquipment.model}
                    </p>
                    <p className="text-[hsl(var(--warning-orange))] text-xs sm:text-sm flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {detectedEquipment.issue}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Voice Assistant */}
          <div className="p-3 sm:p-4 border-b border-[hsl(var(--neon-blue))]/20">
            <div className="flex items-center space-x-3 mb-3">
              <div
                className={`w-6 sm:w-8 h-6 sm:h-8 rounded-full flex items-center justify-center ${
                  conversationActive
                    ? "bg-[hsl(var(--neon-blue))] animate-pulse-neon"
                    : "bg-[hsl(var(--electric-blue))]"
                }`}
              >
                {conversationActive ? (
                  <Mic className="text-black text-xs sm:text-sm" />
                ) : (
                  <MicOff className="text-white text-xs sm:text-sm" />
                )}
              </div>
              <div>
                <span className="font-semibold text-sm sm:text-base">Gemini AI Assistant</span>
                <p className="text-xs text-gray-400">{conversationActive ? "Listening & Watching" : "Manual Mode"}</p>
              </div>
            </div>

            {/* Live Speech Recognition */}
            {conversationActive && (
              <div className="mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-[hsl(var(--neon-blue))] rounded-full animate-pulse"></div>
                  <span className="text-xs text-[hsl(var(--neon-blue))]">LISTENING</span>
                </div>
                {transcript && (
                  <Card className="bg-black/30 backdrop-blur-sm border-[hsl(var(--neon-blue))]/20 mb-2">
                    <CardContent className="p-2">
                      <p className="text-xs text-gray-400">You said:</p>
                      <p className="text-xs sm:text-sm text-[hsl(var(--neon-blue))]">"{transcript}"</p>
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
                    className="voice-wave w-1 rounded bg-[hsl(var(--neon-blue))]"
                    style={{
                      height: `${16 + Math.random() * 16}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
                <span className="text-xs sm:text-sm text-gray-400 ml-2">AI Speaking...</span>
              </div>
            )}

            {/* AI Response */}
            {aiMessage && (
              <Card className="bg-black/30 backdrop-blur-sm border-[hsl(var(--neon-blue))]/20 mb-3">
                <CardContent className="p-2 sm:p-3">
                  <p className="text-xs text-gray-400 mb-1">Gemini AI:</p>
                  <p className="text-xs sm:text-sm text-gray-300">"{aiMessage}"</p>
                </CardContent>
              </Card>
            )}

            {/* Voice Controls */}
            <div className="flex space-x-2">
              {conversationActive ? (
                <Button
                  size="sm"
                  className="flex-1 bg-[hsl(var(--warning-orange))] text-white hover:bg-[hsl(var(--warning-orange))]/80 text-xs sm:text-sm"
                  onClick={toggleConversationMode}
                >
                  <MicOff className="mr-1 sm:mr-2 h-3 w-3" />
                  Stop Chat
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    className="flex-1 bg-[hsl(var(--neon-blue))] text-black hover:bg-[hsl(var(--electric-blue))] text-xs sm:text-sm"
                    onClick={() => handleVoiceCommand("repeat")}
                  >
                    <Play className="mr-1 sm:mr-2 h-3 w-3" />
                    Replay
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-[hsl(var(--neon-blue))] text-[hsl(var(--neon-blue))] hover:bg-[hsl(var(--neon-blue))] hover:text-black text-xs sm:text-sm"
                    onClick={toggleConversationMode}
                    disabled={!speechRecognitionSupported}
                  >
                    <Mic className="mr-1 sm:mr-2 h-3 w-3" />
                    Start Chat
                  </Button>
                </>
              )}
            </div>

            {/* Conversation Status */}
            {conversationActive && (
              <div className="mt-2 text-xs text-center text-gray-400">
                Say something while looking at equipment for real-time AI analysis
              </div>
            )}
          </div>

          {/* Step-by-Step Instructions */}
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base text-[hsl(var(--neon-blue))]">
              Repair Instructions
            </h3>

            <div className="space-y-3">
              {repairSteps.length === 0 ? (
                <Card className="bg-black/30 backdrop-blur-sm border-[hsl(var(--neon-blue))]/20">
                  <CardContent className="p-3">
                    <p className="text-gray-400">No repair steps available. Please analyze equipment or start a conversation.</p>
                  </CardContent>
                </Card>
              ) : (
                repairSteps.map((step) => (
                  <Card
                    key={step.id}
                    className={`
                      bg-black/30 backdrop-blur-sm border-l-4 transition-all duration-300
                      ${step.status === "completed" ? "border-l-[hsl(var(--success-green))] opacity-75" : ""}
                      ${step.status === "current" ? "border-l-[hsl(var(--neon-blue))] animate-pulse-neon" : ""}
                      ${step.status === "pending" ? "border-l-gray-600 opacity-60" : ""}
                    `}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                        <div
                          className={`
                          w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center
                          ${step.status === "completed" ? "bg-[hsl(var(--success-green))]" : ""}
                          ${step.status === "current" ? "bg-[hsl(var(--neon-blue))] animate-pulse" : ""}
                          ${step.status === "pending" ? "bg-gray-600" : ""}
                        `}
                        >
                          {step.status === "completed" ? (
                            <Check className="text-black text-xs" />
                          ) : (
                            <span
                              className={`font-bold text-xs ${step.status === "current" ? "text-black" : "text-white"}`}
                            >
                              {step.id}
                            </span>
                          )}
                        </div>
                        <span
                          className={`
                          font-semibold text-xs sm:text-sm
                          ${step.status === "completed" ? "text-[hsl(var(--success-green))]" : ""}
                          ${step.status === "current" ? "text-[hsl(var(--neon-blue))]" : ""}
                          ${step.status === "pending" ? "text-gray-400" : ""}
                        `}
                        >
                          Step {step.id}
                        </span>
                        <Badge
                          variant="outline"
                          className={`
                          text-xs
                          ${step.status === "completed" ? "border-[hsl(var(--success-green))] text-[hsl(var(--success-green))]" : ""}
                          ${step.status === "current" ? "border-[hsl(var(--neon-blue))] text-[hsl(var(--neon-blue))]" : ""}
                          ${step.status === "pending" ? "border-gray-500 text-gray-500" : ""}
                        `}
                        >
                          {step.status.toUpperCase()}
                        </Badge>
                      </div>

                      <p
                        className={`
                        text-xs sm:text-sm mb-2 sm:mb-3
                        ${step.status === "current" ? "text-white font-semibold" : "text-gray-300"}
                      `}
                      >
                        {step.description}
                      </p>

                      {step.status === "current" && step.subInstructions && (
                        <div className="text-xs text-gray-400 space-y-1 mb-2 sm:mb-3">
                          {step.subInstructions.map((instruction, index) => (
                            <div key={index}>• {instruction}</div>
                          ))}
                        </div>
                      )}

                      {step.status === "completed" && (
                        <div className="text-xs text-[hsl(var(--success-green))]">✓ Confirmed by technician</div>
                      )}

                      {step.status === "current" && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="bg-[hsl(var(--success-green))] text-black hover:bg-green-400 text-xs"
                            onClick={() => handleStepComplete(step.id)}
                          >
                            Done
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:border-[hsl(var(--neon-blue))] hover:text-[hsl(var(--neon-blue))] text-xs"
                            onClick={() => handleVoiceCommand("help")}
                          >
                            <HelpCircle className="mr-1 h-3 w-3" />
                            Help
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:border-[hsl(var(--neon-blue))] hover:text-[hsl(var(--neon-blue))] text-xs"
                          >
                            <FileText className="mr-1 h-3 w-3" />
                            Diagram
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Session Info */}
          <div className="p-3 sm:p-4 border-t border-[hsl(var(--neon-blue))]/20 bg-[hsl(var(--secondary-dark))]/50">
            <div className="flex flex-wrap justify-between text-xs gap-2">
              <div className="space-y-1">
                <div className="text-gray-400">
                  Session Time:{" "}
                  <span className="text-[hsl(var(--neon-blue))] font-mono">{formatTime(sessionTime)}</span>
                </div>
                <div className="text-gray-400">
                  Technician: <span className="text-white">Alex Rodriguez</span>
                </div>
              </div>
              <div className="space-y-1 text-right">
                <div className="text-gray-400">
                  Equipment ID: <span className="text-white font-mono">{detectedEquipment?.id || "HX300-2847"}</span>
                </div>
                <div className="text-gray-400">
                  Progress:{" "}
                  <span className="text-[hsl(var(--success-green))]">
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
      <div className="bg-black/30 backdrop-blur-sm p-3 sm:p-4 border-t border-[hsl(var(--neon-blue))]/20 safe-area-inset">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Left Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              className="bg-[hsl(var(--neon-blue))] text-black hover:bg-[hsl(var(--electric-blue))] text-xs sm:text-sm transition-all duration-200 touch-manipulation min-h-[44px] px-4 flex-1 sm:flex-none"
              onClick={handleSaveSession}
            >
              <Save className="mr-1 sm:mr-2 h-3 sm:h-4 w-3 sm:w-4" />
              <span className="hidden xs:inline">Save Session</span>
              <span className="xs:hidden">Save</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:border-[hsl(var(--neon-blue))] hover:text-[hsl(var(--neon-blue))] text-xs sm:text-sm transition-all duration-200 touch-manipulation min-h-[44px] px-4 flex-1 sm:flex-none"
            >
              <History className="mr-1 sm:mr-2 h-3 sm:h-4 w-3 sm:w-4" />
              <span className="hidden xs:inline">View History</span>
              <span className="xs:hidden">History</span>
            </Button>
          </div>

          {/* Center Status - Hidden on Mobile */}
          <div className="hidden lg:flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Video className={`h-4 w-4 ${cameraActive ? "text-[hsl(var(--success-green))]" : "text-gray-500"}`} />
              <span className="text-xs text-gray-400">Video {cameraActive ? "Active" : "Inactive"}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mic className={`h-4 w-4 ${micActive ? "text-[hsl(var(--success-green))]" : "text-gray-500"}`} />
              <span className="text-xs text-gray-400">Audio {micActive ? "Active" : "Inactive"}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Wifi className="h-4 w-4 text-[hsl(var(--success-green))]" />
              <span className="text-xs text-gray-400">Connected</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:border-[hsl(var(--warning-orange))] hover:text-[hsl(var(--warning-orange))] text-xs sm:text-sm transition-all duration-200 touch-manipulation min-h-[44px] px-4 flex-1 sm:flex-none"
              onClick={() => setSessionActive(!sessionActive)}
            >
              {sessionActive ? (
                <Pause className="mr-1 sm:mr-2 h-3 sm:h-4 w-3 sm:w-4" />
              ) : (
                <Play className="mr-1 sm:mr-2 h-3 sm:h-4 w-3 sm:w-4" />
              )}
              <span className="hidden xs:inline">{sessionActive ? "Pause" : "Resume"} Session</span>
              <span className="xs:hidden">{sessionActive ? "Pause" : "Resume"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="bg-[hsl(var(--warning-orange))]/20 border-[hsl(var(--warning-orange))] text-[hsl(var(--warning-orange))] hover:bg-[hsl(var(--warning-orange))] hover:text-white text-xs sm:text-sm transition-all duration-200 touch-manipulation min-h-[44px] px-4 flex-1 sm:flex-none"
              onClick={() => setSessionActive(false)}
            >
              <OctagonMinus className="mr-1 sm:mr-2 h-3 sm:h-4 w-3 sm:w-4" />
              <span className="hidden xs:inline">End Session</span>
              <span className="xs:hidden">End</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SmartFixDashboard
