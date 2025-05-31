"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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

// Inline TypeScript declarations
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

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

export default function SmartFixDashboard() {
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

  // Real-time conversation state
  const [conversationActive, setConversationActive] = useState(false)
  const [lastCapturedImage, setLastCapturedImage] = useState<string | null>(null)
  const [demoMode, setDemoMode] = useState(true)

  // PWA installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  // Speech synthesis state
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(false)

  // Speech recognition state
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Camera stream state
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Orientation state for mobile landscape
  const [isLandscape, setIsLandscape] = useState(false)

  // Detect orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      const isLandscapeMode = window.innerHeight < window.innerWidth && window.innerWidth < 1024
      setIsLandscape(isLandscapeMode)
    }

    handleOrientationChange()
    window.addEventListener("resize", handleOrientationChange)
    window.addEventListener("orientationchange", handleOrientationChange)

    return () => {
      window.removeEventListener("resize", handleOrientationChange)
      window.removeEventListener("orientationchange", handleOrientationChange)
    }
  }, [])

  const { toast } = useToast()

  // Inline Speech Synthesis Hook Logic
  useEffect(() => {
    setSupported("speechSynthesis" in window)
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!supported) return

      // Stop any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1

      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)

      window.speechSynthesis.speak(utterance)
    },
    [supported],
  )

  // Inline Speech Recognition Hook Logic
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setSpeechRecognitionSupported(!!SpeechRecognition)

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "en-US"

      recognition.onresult = (event: any) => {
        let finalTranscript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript)
        }
      }

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  const startListening = useCallback(() => {
    if (recognitionRef.current && speechRecognitionSupported) {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (error) {
        console.error("Error starting speech recognition:", error)
      }
    }
  }, [speechRecognitionSupported])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript("")
  }, [])

  // Inline WebcamCapture Logic
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "environment",
          },
          audio: false,
        })

        setStream(mediaStream)
        setCameraActive(true)

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch (err) {
        console.error("Error accessing webcam:", err)
        setError("Camera access denied or not available")
        setCameraActive(false)
      }
    }

    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const handleImageCapture = (imageSrc: string) => {
    setLastCapturedImage(imageSrc)

    if (conversationActive && transcript.trim()) {
      handleConversationalAnalysis(imageSrc, transcript.trim())
      resetTranscript()
    } else if (!conversationActive) {
      setIsAnalyzing(true)

      // Demo analysis
      setTimeout(() => {
        setDetectedEquipment({
          id: "HX300-" + Date.now(),
          name: "Hydraulic Pump",
          model: "Series 3000",
          issue: "Pressure irregularity detected",
          confidence: 0.89,
          position: { x: 33, y: 33, width: 48, height: 32 },
        })

        setAiMessage("Hydraulic pump Series 3000 identified. Pressure irregularity detected in main chamber.")
        setIsSpeaking(true)

        if (supported) {
          speak("Hydraulic pump Series 3000 identified. Pressure irregularity detected in main chamber.")
        }

        setTimeout(() => setIsSpeaking(false), 4000)
        setIsAnalyzing(false)
      }, 2000)
    }
  }

  // Initialize session and demo data
  useEffect(() => {
    setSessionId(Date.now())

    // Demo repair steps
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
          "Check temperature readings",
        ],
      },
      {
        id: 2,
        title: "Safety Check",
        description: "Ensure safe working conditions",
        instructions: "Verify power is off and equipment is locked out",
        status: "pending",
      },
      {
        id: 3,
        title: "Component Inspection",
        description: "Detailed inspection of critical components",
        instructions: "Check belts, filters, and connection points",
        status: "pending",
      },
    ])
  }, [])

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

  // Handle conversational analysis
  const handleConversationalAnalysis = (imageData: string, spokenText: string) => {
    setIsAnalyzing(true)

    setTimeout(() => {
      const responses = [
        `I heard you say "${spokenText}". I can see equipment that needs attention. Let me guide you through the inspection.`,
        `Based on "${spokenText}", I'm analyzing the equipment. I can identify potential maintenance points for you.`,
        `You mentioned "${spokenText}". Looking at the visual data, I can provide specific troubleshooting guidance.`,
        `I understand "${spokenText}". The equipment shows signs that require careful examination. Let me help.`,
      ]

      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      setAiMessage(randomResponse)
      setIsSpeaking(true)

      if (supported) {
        speak(randomResponse)
      }

      setDetectedEquipment({
        id: "CONV_" + Date.now(),
        name: "Industrial Equipment",
        model: "Smart Device",
        issue: "Requires inspection based on your input",
        confidence: 0.85,
        position: { x: 30, y: 30, width: 40, height: 40 },
      })

      setTimeout(() => setIsSpeaking(false), 4000)
      setIsAnalyzing(false)
    }, 1500)
  }

  // Toggle conversation mode
  const toggleConversationMode = () => {
    if (conversationActive) {
      setConversationActive(false)
      stopListening()
      setAiMessage("Conversation mode disabled. Use camera button for manual analysis.")
    } else {
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
      const timer = setTimeout(() => {
        if (transcript.trim().length > 10) {
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
    toast({
      title: "Emergency Support",
      description: "Connecting to emergency support... Estimated wait time: 30 seconds",
    })
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

    toast({
      title: "Session Saved",
      description: "Repair session has been saved successfully",
    })
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
        toast({
          title: "App Installed",
          description: "SmartFix AI has been installed to your device",
        })
      }
      setDeferredPrompt(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/20 border-b border-cyan-500/20 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Brain className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                SmartFix AI
              </h1>
              <p className="text-xs text-gray-400">Real-time Field Support</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* PWA Install Button */}
            {isInstallable && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg"
                onClick={handleInstallPWA}
              >
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Install App</span>
                <span className="sm:hidden">Install</span>
              </Button>
            )}

            {/* Connection Status */}
            <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400 font-medium">LIVE</span>
            </div>

            {/* Landscape Mode Indicator */}
            {isLandscape && (
              <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                <span className="text-xs text-cyan-400 font-medium">LANDSCAPE</span>
              </div>
            )}

            {/* Conversation Mode Toggle */}
            <Button
              size="sm"
              variant={conversationActive ? "default" : "outline"}
              className={`
                ${
                  conversationActive
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg"
                    : "border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
                }
              `}
              onClick={toggleConversationMode}
              disabled={!speechRecognitionSupported}
            >
              {conversationActive ? (
                <>
                  <MicOff className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">End Chat</span>
                  <span className="sm:hidden">End</span>
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Start Chat</span>
                  <span className="sm:hidden">Chat</span>
                </>
              )}
            </Button>

            {/* Emergency Button */}
            <Button
              variant="outline"
              size="sm"
              className="border-red-500 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={handleEmergencyContact}
            >
              <Phone className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Emergency</span>
              <span className="sm:hidden">SOS</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div
        className={`flex h-[calc(100vh-80px)] ${
          isLandscape
            ? "flex-row" // Force horizontal layout in mobile landscape
            : "flex-col lg:flex-row" // Original responsive behavior
        }`}
      >
        {/* Video Feed Section */}
        <div
          className={`relative bg-black border-cyan-500/20 ${
            isLandscape
              ? "w-3/5 h-full border-r" // Mobile landscape: left side, full height
              : "w-full lg:w-3/5 h-[45vh] lg:h-full border-b lg:border-b-0 lg:border-r" // Original responsive
          }`}
        >
          <div className="relative h-full">
            {/* Inline WebcamCapture */}
            <div className="w-full h-full relative">
              {error ? (
                <div className="flex items-center justify-center h-full bg-gray-900 text-white">
                  <div className="text-center">
                    <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-sm text-gray-400">{error}</p>
                    <Button onClick={() => window.location.reload()} className="mt-4 bg-cyan-500 hover:bg-cyan-600">
                      Retry Camera Access
                    </Button>
                  </div>
                </div>
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              )}
            </div>

            {/* Scanner Line Effect */}
            {isAnalyzing && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
            )}

            {/* Equipment Detection Overlay */}
            {detectedEquipment && (
              <div className="absolute inset-0">
                <div className="absolute top-1/3 left-1/3 w-32 sm:w-48 h-24 sm:h-32 border-2 border-green-400 rounded-lg animate-pulse shadow-lg shadow-green-400/25">
                  <div className="absolute -top-8 left-0 bg-green-400 text-black px-3 py-1 rounded-md text-xs font-bold">
                    {detectedEquipment.name}
                  </div>
                </div>

                {/* Issue Indicator */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-6 h-6 bg-orange-400 rounded-full animate-ping"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-orange-400 rounded-full"></div>
                </div>

                {/* Measurement Overlay */}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm p-3 rounded-xl border border-cyan-500/20">
                  <div className="text-xs text-cyan-400 font-mono space-y-1">
                    <div>
                      PRESSURE: <span className="text-orange-400">142 PSI</span>
                    </div>
                    <div>
                      TEMP: <span className="text-green-400">68°F</span>
                    </div>
                    <div>
                      STATUS: <span className="text-orange-400">MISALIGNED</span>
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
                className="bg-black/60 backdrop-blur-sm border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                onClick={() => {
                  const video = videoRef.current
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
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="bg-black/60 backdrop-blur-sm border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Instructions Panel */}
        <div
          className={`flex flex-col bg-slate-900/95 backdrop-blur-sm overflow-hidden ${
            isLandscape
              ? "w-2/5" // Mobile landscape: right side
              : "w-full lg:w-2/5" // Original responsive
          }`}
        >
          {/* AI Analysis Header */}
          <div className="border-b border-cyan-500/20">
            {/* Analysis Results */}
            {detectedEquipment && (
              <Card className="bg-black/40 backdrop-blur-sm border border-cyan-500/20 shadow-xl">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-400" />
                      <span className="text-green-400 font-semibold text-sm">Equipment Identified</span>
                    </div>
                    <p className="text-gray-300 text-sm">
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
          </div>

          {/* Voice Assistant */}
          <div className="p-4 border-b border-cyan-500/20">
            <div className="flex items-center space-x-3 mb-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  conversationActive ? "bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse" : "bg-gray-600"
                }`}
              >
                {conversationActive ? (
                  <Mic className="text-white text-sm" />
                ) : (
                  <MicOff className="text-white text-sm" />
                )}
              </div>
              <div>
                <span className="font-semibold text-cyan-400">Gemini AI Assistant</span>
                <p className="text-xs text-gray-400">{conversationActive ? "Listening & Watching" : "Manual Mode"}</p>
              </div>
            </div>

            {/* Live Speech Recognition */}
            {conversationActive && (
              <div className="mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-cyan-400">LISTENING</span>
                </div>
                {transcript && (
                  <Card className="bg-black/40 backdrop-blur-sm border border-cyan-500/20 mb-2">
                    <CardContent className="p-2">
                      <p className="text-xs text-gray-400">You said:</p>
                      <p className="text-sm text-cyan-400">"{transcript}"</p>
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
                    className="w-1 bg-cyan-400 rounded animate-pulse"
                    style={{
                      height: `${16 + Math.random() * 16}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
                <span className="text-sm text-gray-400 ml-2">AI Speaking...</span>
              </div>
            )}

            {/* AI Response */}
            {aiMessage && (
              <Card className="bg-black/40 backdrop-blur-sm border border-cyan-500/20 mb-3">
                <CardContent className="p-3">
                  <p className="text-xs text-gray-400 mb-1">Gemini AI:</p>
                  <p className="text-sm text-gray-300">"{aiMessage}"</p>
                </CardContent>
              </Card>
            )}

            {/* Voice Controls */}
            <div className="flex gap-2">
              {conversationActive ? (
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                  onClick={toggleConversationMode}
                >
                  <MicOff className="mr-2 h-4 w-4" />
                  Stop Chat
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                    onClick={() => handleVoiceCommand("repeat")}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Replay
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
                    onClick={toggleConversationMode}
                    disabled={!speechRecognitionSupported}
                  >
                    <Mic className="mr-2 h-4 w-4" />
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
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4 text-cyan-400">Repair Instructions</h3>

            <div className="space-y-3">
              {repairSteps.map((step) => (
                <Card
                  key={step.id}
                  className={`
                    bg-black/40 backdrop-blur-sm border-l-4 transition-all duration-300
                    ${step.status === "completed" ? "border-l-green-400 opacity-75" : ""}
                    ${step.status === "current" ? "border-l-cyan-400 shadow-lg shadow-cyan-400/25" : ""}
                    ${step.status === "pending" ? "border-l-gray-600 opacity-60" : ""}
                  `}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <div
                        className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${step.status === "completed" ? "bg-green-400 text-black" : ""}
                        ${step.status === "current" ? "bg-cyan-400 text-black animate-pulse" : ""}
                        ${step.status === "pending" ? "bg-gray-600 text-white" : ""}
                      `}
                      >
                        {step.status === "completed" ? <Check className="text-black text-xs" /> : step.id}
                      </div>
                      <span
                        className={`
                        font-semibold text-sm
                        ${step.status === "completed" ? "text-green-400" : ""}
                        ${step.status === "current" ? "text-cyan-400" : ""}
                        ${step.status === "pending" ? "text-gray-400" : ""}
                      `}
                      >
                        Step {step.id}
                      </span>
                      <Badge
                        variant="outline"
                        className={`
                        text-xs
                        ${step.status === "completed" ? "border-green-400 text-green-400" : ""}
                        ${step.status === "current" ? "border-cyan-400 text-cyan-400" : ""}
                        ${step.status === "pending" ? "border-gray-500 text-gray-500" : ""}
                      `}
                      >
                        {step.status.toUpperCase()}
                      </Badge>
                    </div>

                    <p
                      className={`
                      text-sm mb-3
                      ${step.status === "current" ? "text-white font-medium" : "text-gray-300"}
                    `}
                    >
                      {step.description}
                    </p>

                    {step.status === "current" && step.subInstructions && (
                      <div className="text-xs text-gray-400 space-y-1 mb-3">
                        {step.subInstructions.map((instruction, index) => (
                          <div key={index}>• {instruction}</div>
                        ))}
                      </div>
                    )}

                    {step.status === "completed" && (
                      <div className="text-xs text-green-400">✓ Confirmed by technician</div>
                    )}

                    {step.status === "current" && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                          onClick={() => handleStepComplete(step.id)}
                        >
                          <Check className="mr-2 h-3 w-3" />
                          Done
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:border-cyan-400 hover:text-cyan-400"
                          onClick={() => handleVoiceCommand("help")}
                        >
                          <HelpCircle className="mr-2 h-3 w-3" />
                          Help
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:border-cyan-400 hover:text-cyan-400"
                        >
                          <FileText className="mr-2 h-3 w-3" />
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
          <div className="p-4 border-t border-cyan-500/20 bg-slate-900/50">
            <div className="flex justify-between text-xs gap-4">
              <div className="space-y-1">
                <div className="text-gray-400">
                  Session Time: <span className="text-cyan-400 font-mono">{formatTime(sessionTime)}</span>
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
                  <span className="text-green-400">
                    {completedSteps}/{repairSteps.length} Steps
                  </span>
                </div>
              </div>
            </div>

            <Progress value={progress} className="mt-3 h-2" />
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="sticky bottom-0 bg-black/80 backdrop-blur-xl border-t border-cyan-500/20 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg"
              onClick={handleSaveSession}
            >
              <Save className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Save Session</span>
              <span className="sm:hidden">Save</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:border-cyan-400 hover:text-cyan-400"
            >
              <History className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">History</span>
              <span className="sm:hidden">History</span>
            </Button>
          </div>

          {/* Center Status - Hidden on Mobile */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Video className={`h-4 w-4 ${cameraActive ? "text-green-400" : "text-gray-500"}`} />
              <span className="text-xs text-gray-400">Video {cameraActive ? "Active" : "Inactive"}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mic className={`h-4 w-4 ${micActive ? "text-green-400" : "text-gray-500"}`} />
              <span className="text-xs text-gray-400">Audio {micActive ? "Active" : "Inactive"}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Wifi className="h-4 w-4 text-green-400" />
              <span className="text-xs text-gray-400">Connected</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:border-orange-400 hover:text-orange-400"
              onClick={() => setSessionActive(!sessionActive)}
            >
              {sessionActive ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              <span className="hidden sm:inline">{sessionActive ? "Pause" : "Resume"}</span>
              <span className="sm:hidden">{sessionActive ? "Pause" : "Resume"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="border-red-500 text-red-400 hover:bg-red-500/10"
              onClick={() => setSessionActive(false)}
            >
              <OctagonMinus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">End Session</span>
              <span className="sm:hidden">End</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
