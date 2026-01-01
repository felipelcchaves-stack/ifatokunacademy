import React, { useState, useRef } from 'react';
import { Upload, X, Image, FileAudio, FileVideo, File, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MediaUploaderProps {
  exerciseId?: string;
  lessonId?: string;
  moduleId?: string;
  onUploadComplete: (url: string, metadata: MediaMetadata) => void;
  acceptedTypes?: string;
  maxSizeMB?: number;
  label?: string;
  currentUrl?: string;
}

interface MediaMetadata {
  filename: string;
  type: string;
  size: number;
  url: string;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({
  exerciseId,
  lessonId,
  moduleId,
  onUploadComplete,
  acceptedTypes = 'image/*,audio/*,video/*,.pdf,.doc,.docx',
  maxSizeMB = 50,
  label = 'Fazer Upload',
  currentUrl,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [fileType, setFileType] = useState<string | null>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-8 h-8 text-primary" />;
    if (type.startsWith('audio/')) return <FileAudio className="w-8 h-8 text-primary" />;
    if (type.startsWith('video/')) return <FileVideo className="w-8 h-8 text-primary" />;
    return <File className="w-8 h-8 text-primary" />;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast({
        title: 'Arquivo muito grande',
        description: `O tamanho máximo é ${maxSizeMB}MB`,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setFileType(file.type);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${moduleId || 'general'}/${lessonId || 'general'}/${exerciseId || 'general'}/${timestamp}_${sanitizedName}`;

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('content-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('content-media')
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;

      // Save metadata to exercise_media table
      const { error: metaError } = await supabase
        .from('exercise_media')
        .insert({
          exercise_id: exerciseId || null,
          lesson_id: lessonId || null,
          module_id: moduleId || null,
          url: publicUrl,
          filename: file.name,
          type: file.type.split('/')[0], // 'image', 'audio', 'video', etc.
          metadata: {
            originalName: file.name,
            size: file.size,
            mimeType: file.type,
          },
        });

      if (metaError) {
        console.warn('Could not save media metadata:', metaError);
      }

      setUploadProgress(100);
      
      // Set preview for images
      if (file.type.startsWith('image/')) {
        setPreview(publicUrl);
      } else {
        setPreview(null);
      }

      onUploadComplete(publicUrl, {
        filename: file.name,
        type: file.type,
        size: file.size,
        url: publicUrl,
      });

      toast({
        title: 'Upload concluído!',
        description: `${file.name} foi enviado com sucesso.`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: error.message || 'Não foi possível enviar o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setFileType(null);
    onUploadComplete('', { filename: '', type: '', size: 0, url: '' });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file && fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
      handleFileSelect({ target: { files: dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview && preview.startsWith('http') ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="max-h-48 rounded-lg object-cover border border-border"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : currentUrl && !preview ? (
        <div className="relative flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
          {getFileIcon(fileType || 'file')}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Arquivo enviado</p>
            <p className="text-xs text-muted-foreground truncate">{currentUrl}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : null}

      {isUploading ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Enviando...</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Arraste e solte ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground">
            Máximo: {maxSizeMB}MB
          </p>
        </div>
      )}
    </div>
  );
};

export default MediaUploader;
