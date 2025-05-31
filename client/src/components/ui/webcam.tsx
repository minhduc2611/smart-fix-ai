import { useRef, useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

interface WebcamCaptureProps {
  onCapture?: (imageSrc: string) => void;
  className?: string;
}

export function WebcamCapture({ onCapture, className = "" }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment" // Use back camera on mobile
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please check permissions.");
      setIsStreaming(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
  }, []);

  const captureImage = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas && video.videoWidth && video.videoHeight) {
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageSrc = canvas.toDataURL('image/jpeg', 0.8);
        if (onCapture) {
          onCapture(imageSrc);
        }
      }
    }
  }, [onCapture]);

  // Auto-capture for analysis every 10 seconds
  useEffect(() => {
    if (isStreaming && onCapture) {
      const interval = setInterval(() => {
        captureImage();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [isStreaming, captureImage, onCapture]);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    
    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 ${className}`}>
        <div className="text-center p-8">
          <CameraOff className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={startCamera} variant="outline">
            <Camera className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }} // Mirror the video for better UX
      />
      
      {/* Hidden canvas for image capture */}
      <canvas
        ref={canvasRef}
        className="hidden"
      />
      
      {/* Loading overlay */}
      {!isStreaming && !error && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--neon-blue))] mx-auto mb-4"></div>
            <p className="text-gray-400">Starting camera...</p>
          </div>
        </div>
      )}
      
      {/* Camera status indicator */}
      {isStreaming && (
        <div className="absolute top-4 left-4 flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">REC</span>
        </div>
      )}
    </div>
  );
}
