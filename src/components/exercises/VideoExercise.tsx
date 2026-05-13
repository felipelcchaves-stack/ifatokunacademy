import React, { useState, useRef } from 'react';
import { Play, Pause, RotateCcw, Maximize, Volume2, VolumeX, CheckCircle, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface VideoExerciseProps {
  videoUrl: string;
  description?: string;
  onComplete?: () => void;
}

const VideoExercise: React.FC<VideoExerciseProps> = ({ videoUrl, description, onComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const getEmbedUrl = (url: string): string | null => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}?enablejsapi=1`;
    }
    
    // Vimeo
    const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    // Google Drive
    // Suporta: /file/d/<ID>/..., ?id=<ID>, /uc?id=<ID>
    const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveFileMatch) {
      return `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`;
    }
    const driveIdMatch = url.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/);
    if (driveIdMatch) {
      return `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`;
    }

    return null;
  };

  const embedUrl = getEmbedUrl(videoUrl);
  const isDirectVideo = !embedUrl && videoUrl;

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);
      
      // Mark as completed when video reaches 90%
      if (currentProgress >= 90 && !isCompleted) {
        setIsCompleted(true);
        onComplete?.();
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      const newTime = (value[0] / 100) * videoRef.current.duration;
      videoRef.current.currentTime = newTime;
      setProgress(value[0]);
    }
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setProgress(0);
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (!isCompleted) {
      setIsCompleted(true);
      onComplete?.();
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
      {/* Video Container */}
      <div className="relative aspect-video bg-black">
        {embedUrl ? (
          // Embedded video (YouTube/Vimeo)
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : isDirectVideo ? (
          // Direct video file
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onClick={togglePlay}
          />
        ) : (
          // No video - show friendly message with completion option
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-4 p-6">
            <Video className="w-12 h-12 text-muted-foreground/50" />
            <p className="text-center">Vídeo não disponível no momento</p>
            <p className="text-sm text-center text-muted-foreground/70">
              O conteúdo em vídeo será adicionado em breve.
            </p>
          </div>
        )}

        {/* Play overlay for direct videos */}
        {isDirectVideo && !isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
          >
            <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Play className="w-8 h-8 text-primary ml-1" />
            </div>
          </button>
        )}

        {/* Completed badge */}
        {isCompleted && (
          <div className="absolute top-4 right-4 px-3 py-1.5 bg-green-500 text-white rounded-full flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Concluído
          </div>
        )}
      </div>

      {/* Controls for direct video */}
      {isDirectVideo && (
        <div className="p-4 border-t border-border">
          {/* Progress bar */}
          <div className="mb-4">
            <Slider
              value={[progress]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatTime((progress / 100) * duration)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="h-10 w-10"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRestart}
                className="h-10 w-10"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="h-10 w-10"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleFullscreen}
              className="h-10 w-10"
            >
              <Maximize className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Description */}
      {description && (
        <div className="p-4 border-t border-border">
          <h3 className="font-serif font-semibold text-foreground mb-2">Sobre esta aula</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      )}

      {/* Mark complete button for embedded videos OR missing videos */}
      {(embedUrl || !videoUrl) && !isCompleted && (
        <div className="p-4 border-t border-border">
          <Button 
            className="w-full gradient-gold text-secondary shadow-gold"
            onClick={() => {
              setIsCompleted(true);
              onComplete?.();
            }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Marcar como Concluído
          </Button>
        </div>
      )}
    </div>
  );
};

export default VideoExercise;
